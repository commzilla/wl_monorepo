from django.core.cache import cache
from rest_framework import serializers
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from wefund.models import EmailOTP, ClientProfile, ChallengeProduct, ChallengeEnrollment, ClientKYC, Order, Challenge, ChallengePhase, Offer, Coupon, AffiliateWallet, BreachHistory, SoftBreach, EnrollmentAccount, TraderPayoutAIAnalysis, EATradingBotRequest, EnrollmentEvent, EnrollmentTransitionLog, ComplianceResponsibleTrade, InternalNote, MigrationLog, MT5DailySnapshot, RewardSubmission, RedeemItem, WeCoinWallet, WeCoinTransaction, Redemption, ScheduledNotification, EventLog, BetaFeature, AIRiskRule, AIRiskAnalysis, AIRiskReviewFeedback, EconomicEvent, EconomicCalendarSyncSchedule, TradingReport, TradingReportConfig, Release, BlogCategory, BlogTag, BlogPost, MeetingProfile, MeetingAvailability, MeetingDateOverride, MeetingBooking, AutoRewardRule, ResetToken, ResetTokenConfig
from django.db import transaction, IntegrityError
from django_countries import countries
import uuid
import random
import logging
from django.conf import settings
from django.utils import timezone
from woocommerce import API as WooAPI
import decimal
from decimal import Decimal, InvalidOperation
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from wefund.models import ClientProfile, NotificationSettings, MT5Trade, Certificate, ClientPaymentMethod, TraderPayout, PayoutConfiguration, Notification, AffiliateProfile, AffiliateReferral, AffiliatePayout, AffiliateWalletTransaction, AffiliateCommissionTier, ChallengePhaseGroupMapping, TraderPayoutComplianceAnalysis, PayoutPolicy, PayoutSplitTier, CertificateTemplate, ActivityLog, MT5MigrationLog, RewardTask, AffiliateCustomCommission, BetaFeatureAccess, StopLossChange, PayoutAIAnalysis, Competition, CompetitionPrize, CompetitionRule, CompetitionRegistration, CompetitionRankingSnapshot
from .utils.bunnycdn import upload_to_bunnycdn
import logging
from rest_framework.response import Response
import json
from wefund.mt5_controller.utils import fetch_user_balance, fetch_user_equity
from .services.mt5_client import MT5Client
from .utils.security import generate_mt5_compliant_password
from django.utils.dateparse import parse_date
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django_celery_beat.models import PeriodicTask
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.crypto import get_random_string
from .services.email_service import EmailService
from api.utils.certificates import list_available_certificate_images
from api.utils.certificate_generator import generate_and_upload_certificate
from api.utils.payout_certificate_generator import generate_and_upload_payout_certificate
from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import authenticate
from wefund.tasks.schedule_notification import deliver_scheduled_notification
from backend.celery import app
from wefund.event_logger import log_event
from copy import deepcopy
from datetime import date, datetime

User = get_user_model()
 
class TraderCreateSerializer(serializers.ModelSerializer):
    country = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'first_name', 'last_name', 'country']
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        country = validated_data.pop('country', None)
        email = validated_data['email']
        username = email

        password = validated_data.get('password')
        first_name = validated_data.get('first_name', '').strip()
        last_name = validated_data.get('last_name', '').strip()

        try:
            with transaction.atomic():
                # Create User
                user = User(
                    username=username,
                    email=email,
                    role='client',
                    first_name=first_name,
                    last_name=last_name
                )
                user.set_password(password)
                user.save()

                # Create/Update ClientProfile
                profile, created = ClientProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'kyc_status': 'pending',
                        'kyc_documents': [],
                        'referred_by': None,
                        'country': country,  # assuming you added country field
                        'address_info': {
                            "first_name": first_name,
                            "last_name": last_name,
                            "country": country or "",
                            "email": email,
                            "phone": user.phone or "",
                        }
                    }
                )

                if not created:
                    # Update existing profile safely
                    address_info = profile.address_info or {}
                    address_info.update({
                        "first_name": first_name,
                        "last_name": last_name,
                        "country": country or address_info.get("country", ""),
                        "email": email,
                        "phone": user.phone or address_info.get("phone", ""),
                    })
                    profile.address_info = address_info
                    profile.save()

        except IntegrityError:
            raise serializers.ValidationError("Could not create trader. Please try again.")

        user._plain_password = password
        return user
    
class RegistrationRequestSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    date_of_birth = serializers.DateField()
    password = serializers.CharField(write_only=True)
    referral_code = serializers.CharField(required=False, allow_blank=True)
    address_info = serializers.JSONField()

    def validate_email(self, email):
        User = get_user_model()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Email already registered.")
        return email

    def create(self, validated_data):
        email = validated_data["email"]

        # Generate and store OTP
        otp_code = EmailOTP.generate_otp()
        EmailOTP.objects.create(email=email, otp=otp_code)

        # Cache registration payload (10 minutes TTL)
        cache_key = f"registration:{email}"
        cache.delete(cache_key)  # cleanup any old registration

        def json_safe(obj):
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            raise TypeError(f"Type {type(obj)} not serializable")

        cache.set(cache_key, json.dumps(validated_data, default=json_safe), timeout=600)

        # Send HTML OTP email
        EmailService.send_otp_email(
            to_email=email,
            otp_code=otp_code,
            first_name=validated_data.get("first_name", "")
        )

        # Log event
        log_event(
            request=self.context.get("request"),
            user=None,
            category="account",
            event_type="registration_otp_sent",
            metadata={
                "email": email,
                "otp_last_4": otp_code[-4:],
                "expires_in_minutes": 10,
            },
            description=f"OTP sent to {email} for registration verification.",
        )

        return {"email": email}

class OTPVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

    def validate(self, attrs):
        email = attrs.get("email")
        otp = attrs.get("otp")

        try:
            record = EmailOTP.objects.filter(email=email, otp=otp).latest("created_at")
        except EmailOTP.DoesNotExist:
            raise serializers.ValidationError("Invalid OTP or email.")

        if record.is_verified:
            raise serializers.ValidationError("OTP already verified.")
        if record.is_expired():
            raise serializers.ValidationError("OTP expired. Please request a new one.")

        record.is_verified = True
        record.save(update_fields=["is_verified"])

        log_event(
            request=self.context.get("request"),
            user=None,
            category="account",
            event_type="otp_verified",
            metadata={
                "email": email,
                "otp_last_4": otp[-4:],
                "verified_at": timezone.now().isoformat(),
            },
            description=f"OTP verified successfully for {email}.",
        )

        attrs["record"] = record
        return attrs
    
class CompleteRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def create(self, validated_data):
        User = get_user_model()
        email = validated_data["email"]

        # Ensure OTP verified
        otp_obj = (
            EmailOTP.objects.filter(email=email, is_verified=True)
            .order_by("-created_at")
            .first()
        )
        if not otp_obj:
            raise serializers.ValidationError("Email not verified yet.")

        # Retrieve cached registration data
        cache_key = f"registration:{email}"
        cached_data = cache.get(cache_key)
        if not cached_data:
            raise serializers.ValidationError("Registration session expired. Please register again.")

        data = json.loads(cached_data)

        # Prevent duplicate creation (if same email already exists)
        existing_user = User.objects.filter(email=email).first()
        if existing_user:
            raise serializers.ValidationError("An account already exists for this email address.")

        try:
            # Create user
            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=data.get("first_name"),
                last_name=data.get("last_name"),
                phone=data.get("phone"),
                date_of_birth=data.get("date_of_birth"),
                role="client",
                password=data.get("password"),
            )

            # Create or retrieve Client Profile safely
            ClientProfile.objects.get_or_create(
                user=user,
                defaults={
                    "address_info": data.get("address_info"),
                    "referred_by": self._get_referred_user(data.get("referral_code")),
                },
            )

            # Create WeCoinWallet so the client appears in the CRM ledger immediately
            WeCoinWallet.objects.get_or_create(user=user)

            # Log event
            log_event(
                request=self.context.get("request"),
                user=user,
                category="account",
                event_type="registration_completed",
                metadata={
                    "email": user.email,
                    "referral_code": data.get("referral_code"),
                    "created_at": timezone.now().isoformat(),
                },
                description=f"New client account registered successfully for {user.email}.",
            )

            # Klaviyo Welcome Flow
            try:
                from api.services.klaviyo_service import KlaviyoService
                KlaviyoService.identify_profile(user.email, {
                    "$first_name": data.get("first_name", ""),
                    "$last_name": data.get("last_name", ""),
                })
                KlaviyoService.track_event("Account Created", user.email, {
                    "signup_source": "dashboard",
                })
            except Exception as e:
                logger.warning("Klaviyo welcome flow event failed for %s: %s", user.email, e)

        finally:
            # Always clear cache even if something fails
            cache.delete(cache_key)

        return user

    def _get_referred_user(self, code):
        if not code:
            return None
        affiliate = AffiliateProfile.objects.filter(referral_code=code).first()
        return affiliate.user if affiliate else None    

class ChallengeEnrollmentSerializer(serializers.ModelSerializer):
    challenge_name = serializers.CharField(source="challenge.name", read_only=True)

    class Meta:
        model = ChallengeEnrollment
        fields = [
            "id",
            "challenge_name",
            "account_size",
            "currency",
            "status",
            "start_date",
            "completed_date",
            "live_start_date",
            "is_active",
            "broker_type",
            "mt5_account_id",
            "mt5_password",
            "mt5_investor_password",
            "created_at",
            "updated_at",
        ]

class TraderListSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='user.id')
    first_name = serializers.CharField(source='user.first_name')
    last_name = serializers.CharField(source='user.last_name')
    email = serializers.EmailField(source='user.email')
    phone = serializers.CharField(source='user.phone', allow_null=True)

    full_address = serializers.SerializerMethodField()
    has_live_account = serializers.BooleanField()
    challenges = ChallengeEnrollmentSerializer(source="challenge_enrollments", many=True, read_only=True)
    active_accounts = serializers.SerializerMethodField()

    class Meta:
        model = ClientProfile
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone',
            'kyc_status', 'full_address', 'has_live_account',
            'challenges', 'active_accounts'
        ]

    def get_active_accounts(self, obj):
        LIVE_STATUSES = ['live_in_progress', 'completed']
        return obj.challenge_enrollments.filter(status__in=LIVE_STATUSES).count()

    def get_full_address(self, obj):
        address = obj.address_info
        if isinstance(address, str):
            try:
                address = json.loads(address)
            except json.JSONDecodeError:
                address = {}
        elif not isinstance(address, dict):
            address = {}

        components = [
            address.get("address_line_1"),
            address.get("address_line_2"),
            address.get("city"),
            address.get("state"),
            address.get("postcode"),
            address.get("country"),
        ]
        return ", ".join(filter(None, components))



class ChallengeEnrollment2Serializer(serializers.ModelSerializer):
    challenge_name = serializers.CharField(source="challenge.name", read_only=True)
    client_name = serializers.CharField(source="client.user.get_full_name", read_only=True)

    class Meta:
        model = ChallengeEnrollment
        fields = [
            "id",
            "client_name",
            "challenge_name",
            "account_size",
            "currency",
            "status",
            "start_date",
            "completed_date",
            "live_start_date",
            "is_active",
            "broker_type",
            "mt5_account_id",
            "mt5_password",
            "mt5_investor_password",
            "created_at",
            "updated_at",
        ]
        
class ChallengeEnrollmentWithPhaseSerializer(serializers.ModelSerializer):
    enrollment = serializers.SerializerMethodField()
    phase_details = serializers.SerializerMethodField()

    class Meta:
        model = ChallengeEnrollment
        fields = ['enrollment', 'phase_details']

    def get_enrollment(self, obj):
        return ChallengeEnrollment2Serializer(obj).data

    def get_phase_details(self, obj):
        try:
            phase_type = obj.get_current_phase_type()
        except ValueError:
            return None

        try:
            phase = ChallengePhase.objects.get(
                challenge=obj.challenge,
                phase_type=phase_type
            )
            return {
                "phase_type": phase.phase_type,
                "trading_period": phase.trading_period,
                "min_trading_days": phase.min_trading_days,
                "max_daily_loss": float(phase.max_daily_loss),
                "max_loss": float(phase.max_loss),
                "profit_target": float(phase.profit_target) if phase.profit_target is not None else None
            }
        except ChallengePhase.DoesNotExist:
            return None        
    
class TraderDetailSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='user.id', read_only=True)
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    email = serializers.EmailField(source='user.email', required=False)
    phone = serializers.CharField(source='user.phone', allow_null=True, required=False)
    full_address = serializers.SerializerMethodField()
    challenges = ChallengeEnrollmentSerializer(source="challenge_enrollments", many=True, read_only=True)
    active_accounts = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone',
            'kyc_status', 'has_live_account', 'full_address',
            'referred_by', 'challenges', 'active_accounts'
        ]
        extra_kwargs = {
            'has_live_account': {'required': False},
            'address_info': {'required': False},
            'referred_by': {'required': False},
            'kyc_status': {'required': False},
        }

    def get_active_accounts(self, obj):
        LIVE_STATUSES = ['live_in_progress', 'completed']
        return obj.challenge_enrollments.filter(status__in=LIVE_STATUSES).count()
    
    def get_full_address(self, obj):
        user = obj.user

        # Highest reliability: match WooCommerce customer email
        order = Order.objects.filter(customer_email=user.email).order_by('-date_created').first()

        # Fallback if order was linked to user
        if not order:
            order = Order.objects.filter(user=user).order_by('-date_created').first()

        if order and order.billing_address:
            # Convert dict → string address
            b = order.billing_address
            parts = [
                b.get('address_line_1', ''),
                b.get('address_line_2', ''),
                b.get('city', ''),
                b.get('state', ''),
                b.get('postcode', ''),
                b.get('country', ''),
            ]
            return ", ".join([p for p in parts if p]).strip()

        return ""

    def create(self, validated_data):
        first_name = validated_data.pop('first_name', '')
        last_name = validated_data.pop('last_name', '')
        email = validated_data.pop('email')
        phone = validated_data.pop('phone', None)

        user = User.objects.create(
            username=email,
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role='client'
        )
        user.set_unusable_password()
        user.save()

        return ClientProfile.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user_data = validated_data.pop('user', {})
        user = instance.user

        # Capture BEFORE snapshot
        before = {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "kyc_status": instance.kyc_status,
            "has_live_account": instance.has_live_account,
            "address_info": deepcopy(instance.address_info),
            "referred_by": str(instance.referred_by_id) if instance.referred_by_id else None,
        }

        for field in ['first_name', 'last_name', 'email', 'phone']:
            if field in user_data:
                setattr(user, field, user_data[field])
        user.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Capture AFTER snapshot
        after = {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "kyc_status": instance.kyc_status,
            "has_live_account": instance.has_live_account,
            "address_info": instance.address_info,
            "referred_by": str(instance.referred_by_id) if instance.referred_by_id else None,
        }

        # Log Event
        if before != after:
            log_event(
                request=request,
                user=user,
                category="profile",
                event_type="profile_updated",
                metadata={"before": before, "after": after},
                description=f"Trader profile updated by admin ({request.user.email})"
            )

        return instance


    
class ChallengeProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChallengeProduct
        fields = [
            'id',
            'name',
            'challenge_type',
            'account_size',
            'entry_fee',
            'max_daily_loss',
            'max_total_loss',
            'profit_target_phase_1',
            'profit_target_phase_2',
            'rules',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
        
class ChallengePhaseSerializer(serializers.ModelSerializer):
    phase_type_display = serializers.CharField(source="get_phase_type_display", read_only=True)

    class Meta:
        model = ChallengePhase
        fields = [
            "id",
            "challenge",
            "phase_type",
            "phase_type_display",
            "trading_period",
            "min_trading_days",
            "max_daily_loss",
            "max_loss",
            "profit_target",
        ]
        extra_kwargs = {
            "challenge": {"required": True},
        }

class ChallengeSerializer(serializers.ModelSerializer):
    step_type_display = serializers.CharField(source="get_step_type_display", read_only=True)
    phases = ChallengePhaseSerializer(many=True, read_only=True)

    class Meta:
        model = Challenge
        fields = [
            "id",
            "name",
            "step_type",
            "step_type_display",
            "is_active",
            "phases",
        ]            
        
class ChallengeDetailSerializer(serializers.ModelSerializer):
    phases = ChallengePhaseSerializer(many=True, read_only=True)

    class Meta:
        model = Challenge
        fields = ['name', 'step_type', 'is_active', 'phases']

class ChallengeEnrollmentListSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    client_email = serializers.SerializerMethodField()
    current_balance = serializers.SerializerMethodField()
    challenge = ChallengeDetailSerializer(read_only=True)
    start_date = serializers.DateField(format="%Y-%m-%d")
    completed_date = serializers.DateField(format="%Y-%m-%d", allow_null=True)
    updated_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S")
    live_start_date = serializers.DateField(format="%Y-%m-%d", allow_null=True)
    latest_breach = serializers.SerializerMethodField()

    class Meta:
        model = ChallengeEnrollment
        fields = [
            'id',
            'client_name',
            'client_email',
            'challenge',
            'account_size',
            'currency',
            'status',
            'start_date',
            'completed_date',
            'updated_at',
            'live_start_date',
            
            # 🆕 Add MT5-related fields
            'broker_type',
            'mt5_account_id',
            'mt5_password',
            'mt5_investor_password',

            'current_balance',
            'latest_breach',
        ]

    def get_client_name(self, obj):
        user = obj.client.user
        return f"{user.first_name} {user.last_name}".strip() or user.username

    def get_client_email(self, obj):
        return obj.client.user.email
    
    def get_current_balance(self, obj):
        """Safely fetch MT5 balance if MT5 ID is available."""
        if not obj.mt5_account_id:
            return None

        try:
            balance = fetch_user_balance(obj.mt5_account_id)
            if balance is None:
                return None
            # Convert Decimal to string or float for JSON serialization
            return float(balance)
        except Exception as e:
            # Log it safely if desired
            # logger.warning(f"Failed to fetch balance for {obj.mt5_account_id}: {e}")
            return None
        
    def get_latest_breach(self, obj):
        """Return latest breach info only when status is failed."""
        if obj.status != "failed":
            return None

        latest = obj.breach_records.order_by("-breached_at").first()
        if not latest:
            return None

        return {
            "rule": latest.rule,
            "reason": latest.reason,
            "previous_state": latest.previous_state,
            "breached_at": latest.breached_at.isoformat() if latest.breached_at else None,
        }
    
    
class ClientKYCListSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='client.user.get_full_name')
    email = serializers.EmailField(source='client.user.email')

    class Meta:
        model = ClientKYC
        fields = [
            'id',
            'name',
            'email',
            'initiate_date',
            'updated_at',
            'status',
        ]    

logger = logging.getLogger(__name__)
User = get_user_model()

class WooOrderSerializer(serializers.Serializer):
    id                   = serializers.IntegerField()
    status               = serializers.CharField()
    total                = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency             = serializers.CharField(required=False, allow_blank=True)
    billing              = serializers.DictField()
    shipping             = serializers.DictField(required=False, default=dict)
    line_items           = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    coupon_lines         = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    customer_ip_address  = serializers.IPAddressField(required=False, allow_null=True)
    payment_method       = serializers.CharField(required=False, allow_blank=True, default='')

    def _verify_payment_with_woocommerce(self, order_id):
        wc = WooAPI(
            url=settings.WC_API_URL,
            consumer_key=settings.WC_CONSUMER_KEY,
            consumer_secret=settings.WC_CONSUMER_SECRET,
            version="wc/v3",
            timeout=10
        )
        resp = wc.get(f"orders/{order_id}")
        if not resp.ok:
            logger.error("Woo API error %s %s", resp.status_code, resp.text)
            raise serializers.ValidationError("Could not verify payment with WooCommerce")
        remote = resp.json()
        if remote.get("status") not in ("processing", "completed"):
            raise serializers.ValidationError(f"Order still '{remote.get('status')}'")
        return remote

    def validate(self, data):
        if data.get("status") == "pending":
            data.update(self._verify_payment_with_woocommerce(data["id"]))
        if data["status"] not in ("processing", "completed"):
            raise serializers.ValidationError("Order not yet paid")
        return data

    def create(self, data):
        billing    = data["billing"]
        email      = billing.get("email", "")
        first_name = billing.get("first_name", "")
        last_name  = billing.get("last_name", "")
        phone      = billing.get("phone", "")

        # 1) Create or get the User and ensure phone is saved
        user, created = User.objects.get_or_create(
            username=email,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "phone": phone,
                "role": "client",
            }
        )
        if not created and not user.phone and phone:
            user.phone = phone
            user.save(update_fields=["phone"])

        # Build a structured address dict
        address_dict = {
            "first_name": first_name,
            "last_name": last_name,
            "company":    billing.get("company", ""),
            "address_line_1": billing.get("address_1", ""),
            "address_line_2": billing.get("address_2", ""),
            "city":       billing.get("city", ""),
            "state":      billing.get("state", ""),
            "postcode":   billing.get("postcode", ""),
            "country":    billing.get("country", ""),
            "email":      email,
            "phone":      phone,
        }

        # 2) Always update_or_create the ClientProfile with that same dict
        ClientProfile.objects.update_or_create(
            user=user,
            defaults={"address_info": address_dict}
        )

        # 3) Compute monetary fields
        items        = data.get("line_items", [])
        subtotal     = sum(Decimal(i.get("subtotal", "0") or "0") for i in items)
        first_item   = items[0] if items else {}
        qty          = int(first_item.get("quantity", 1))
        unit_price   = Decimal(first_item.get("price", "0") or "0")
        coupons      = data.get("coupon_lines", [])
        coupon_codes = [c.get("code") for c in coupons]
        coupon_disc  = sum(Decimal(c.get("discount", "0") or "0") for c in coupons)
        
         # 🆕 Extract challenge/account metadata
        metadata = first_item.get("meta_data", [])
        challenge_account_size = next(
            (m.get("value") for m in metadata if m.get("key") == "pa_account-size"),
            ""
        )
        challenge_broker_type = next(
            (m.get("value") for m in metadata if m.get("key") == "pa_broker-type"),
            ""
        )

        # 🆕 WooCommerce-specific metadata
        woo_order_id = data.get("id")
        woo_order_number = data.get("number", "")
        woo_order_key = data.get("order_key", "")
        woo_customer_id = data.get("customer_id")
        transaction_id = data.get("transaction_id", "")
        currency = data.get("currency", "USD")

        # 4) Create the Order, storing the SAME structured dict in billing_address
        order = Order.objects.create(
            user                 = user,
            date_created         = timezone.now(),
            status               = data["status"],
            payment_status       = "paid",
            customer_name        = f"{first_name} {last_name}".strip(),
            customer_email       = email,
            customer_ip          = data.get("customer_ip_address"),
            billing_address      = address_dict,
            product_name         = first_item.get("name", ""),
            cost                 = unit_price,
            quantity             = qty,
            total_usd            = data["total"],
            items_subtotal_usd   = subtotal,
            coupons_discount_usd = coupon_disc,
            order_total_usd      = data["total"],
            paid_usd             = data["total"],
            coupon_codes         = coupon_codes,
            payment_method       = data.get("payment_method", ""),
            # 🆕 WooCommerce fields
            woo_order_id         = woo_order_id,
            woo_order_number     = woo_order_number,
            woo_order_key        = woo_order_key,
            woo_customer_id      = woo_customer_id,

            # 🆕 Tracking / metadata
            currency             = currency,
            transaction_id       = transaction_id,

            # 🆕 Challenge metadata
            challenge_name           = first_item.get("name", ""),
            challenge_account_size   = challenge_account_size,
            challenge_broker_type    = challenge_broker_type,
        )
        
        # 5️⃣ Handle Affiliate Tracking for all line_items
        for item in items:
            meta_data = item.get("meta_data", [])
            referral_code = next((m.get("value") for m in meta_data if m.get("key") == "affiliate_code"), None)
            if referral_code:
                try:
                    affiliate_profile = AffiliateProfile.objects.get(referral_code=referral_code, approved=True)
                except AffiliateProfile.DoesNotExist:
                    logger.warning(f"Affiliate code '{referral_code}' not found or not approved")
                    affiliate_profile = None
                    
                if referral_code and affiliate_profile and user.role == "client" and not order.referral_code:
                    order.referral_code = referral_code
                    order.affiliate = affiliate_profile
                    order.save(update_fields=["referral_code", "affiliate"])
    

                if affiliate_profile and user.role == "client":
                    # Avoid duplicate referral
                    existing_referral = AffiliateReferral.objects.filter(
                        affiliate=affiliate_profile,
                        referred_user=user,
                        challenge_name=item.get("name")
                    ).first()

                    if not existing_referral:
                        total_amount = Decimal(item.get("total", 0))
                        commission_amount = Decimal("0.00")

                        custom = getattr(affiliate_profile, "custom_commission", None)
                        if custom and custom.is_active:
                            # Prefer fixed amount if set
                            if custom.fixed_amount_per_referral:
                                commission_amount = custom.fixed_amount_per_referral
                            elif custom.commission_rate:
                                commission_amount = (total_amount * Decimal(custom.commission_rate) / 100).quantize(Decimal("0.01"))
                            else:
                                tier_rate = affiliate_profile.current_tier.commission_rate if affiliate_profile.current_tier else 0
                                commission_amount = (total_amount * Decimal(tier_rate) / 100).quantize(Decimal("0.01"))
                        else:
                            # No active custom commission — fallback to tier rate
                            tier_rate = affiliate_profile.current_tier.commission_rate if affiliate_profile.current_tier else 0
                            commission_amount = (total_amount * Decimal(tier_rate) / 100).quantize(Decimal("0.01"))

                        AffiliateReferral.objects.create(
                            affiliate=affiliate_profile,
                            referred_user=user,
                            challenge_name=item.get("name", ""),
                            commission_amount=commission_amount,
                            commission_status="pending",
                        )
                        logger.info(f"Affiliate referral recorded: {affiliate_profile.user.username} → {user.email}, commission: {commission_amount}")
        
        # =======================================
        # 4.5) Create ChallengeEnrollments
        # =======================================
        # Assume the client profile we just upserted:
        client_profile = order.user.client_profile

        def parse_account_size(raw):
            try:
                cleaned = str(raw).replace("$", "").replace(",", "").strip()
                return Decimal(cleaned)
            except (ValueError, TypeError, decimal.InvalidOperation):
                logger.warning(f"Could not parse account size from value: '{raw}'")
                return None

        for item in data.get("line_items", []):
            name = item.get("name", "").strip()
            try:
                challenge = Challenge.objects.get(name=name, is_active=True)
            except Challenge.DoesNotExist:
                logger.debug(f"No challenge matched for item name: {name}")
                continue  # skip if not a known challenge

            # Extract metadata
            meta = item.get("meta_data", [])
            size_str = next((m.get("value") for m in meta if m.get("key") == "pa_account-size"), None)
            currency = data.get("currency") or order.billing_address.get("currency", "USD")

            account_size = parse_account_size(size_str)
            if account_size is None:
                logger.warning(f"No valid account-size for challenge '{challenge.name}' in order {order.id}")
                continue

            # Create or update ChallengeEnrollment
            # Create or update ChallengeEnrollment
            enrollment = ChallengeEnrollment.objects.create(
            client=client_profile,
            challenge=challenge,
            account_size=account_size,
            currency=currency,
            order=order
            )

            if created:
                logger.info(f"✅ Created ChallengeEnrollment for user={user.email} challenge={challenge.name} with order={order.id}")
            else:
                logger.info(f"ℹ️ Reused existing ChallengeEnrollment for user={user.email} challenge={challenge.name}")
                changed = False
                if enrollment.account_size != account_size:
                    enrollment.account_size = account_size
                    changed = True
                if enrollment.currency != currency:
                    enrollment.currency = currency
                    changed = True
                if changed:
                    enrollment.save(update_fields=["account_size", "currency", "updated_at"])


        return order        
   
class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = '__all__'

class OrderAffiliateSerializer(serializers.Serializer):
    affiliate_user_id = serializers.CharField(required=True)

    def validate_affiliate_user_id(self, value):

        # Accept UUID or integer
        try:
            user = User.objects.get(pk=value)
        except (User.DoesNotExist, ValueError):
            raise serializers.ValidationError("Affiliate user not found or not approved.")

        try:
            affiliate_profile = AffiliateProfile.objects.get(user=user, approved=True)
        except AffiliateProfile.DoesNotExist:
            raise serializers.ValidationError("Affiliate user not approved.")
        return affiliate_profile               
        
User = get_user_model()

class MT5TradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MT5Trade
        fields = '__all__'

class TraderPayoutSerializer(serializers.ModelSerializer):
    trader_username = serializers.CharField(source='trader.username', read_only=True)
    mt5_account_id = serializers.CharField(
        source='challenge_enrollment.mt5_account_id', 
        read_only=True
    )
    challenge_name = serializers.CharField(
        source='challenge_enrollment.challenge.name',
        read_only=True
    )
    account_size = serializers.DecimalField(
        source='challenge_enrollment.account_size', 
        max_digits=12, 
        decimal_places=2, 
        read_only=True
    )

    class Meta:
        model = TraderPayout
        fields = '__all__'  # keep everything
        read_only_fields = ['net_profit', 'requested_at', 'reviewed_at', 'paid_at']

class TraderPayoutActionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['approved', 'rejected', 'extended_review'])
    admin_note = serializers.CharField(required=False, allow_blank=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

    # New optional fields
    is_custom_amount = serializers.BooleanField(required=False, default=False)
    exclude_amount = serializers.DecimalField(
        required=False, max_digits=12, decimal_places=2, allow_null=True
    )
    exclude_reason = serializers.CharField(required=False, allow_blank=True)

    # Extended review optional days (defaults to 10 if omitted)
    extension_business_days = serializers.IntegerField(required=False, min_value=1, max_value=30)

    def validate(self, attrs):
        if attrs['status'] == 'rejected' and not attrs.get('rejection_reason'):
            raise serializers.ValidationError(
                "Rejection reason is required when rejecting a payout."
            )
        return attrs        
        
class Certificate2Serializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    # Direct UUID inputs instead of dotted source fields
    enrollment_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    payout_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Certificate
        fields = [
            'id',
            'user', 'user_username',
            'certificate_type',
            'title',
            'enrollment_id',
            'payout_id',
            'image_url',
            'pdf_url',
            'issued_date',
            'expiry_date',
            'metadata',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'issued_date', 'created_at', 'updated_at']

    def update(self, instance, validated_data):
        # Extract IDs
        enrollment_id = validated_data.pop("enrollment_id", None)
        payout_id = validated_data.pop("payout_id", None)

        # Update FKs if provided
        if enrollment_id is not None:
            instance.enrollment = (
                ChallengeEnrollment.objects.filter(id=enrollment_id).first()
            )

        if payout_id is not None:
            instance.payout = (
                TraderPayout.objects.filter(id=payout_id).first()
            )

        # Standard field updates
        return super().update(instance, validated_data)

class EnPayoutConfigurationSerializer(serializers.ModelSerializer):
    client = serializers.PrimaryKeyRelatedField(read_only=True)
    enrollment = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = PayoutConfiguration
        fields = "__all__"
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "client",
            "enrollment",
        )

class PayoutConfigurationSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    client_email = serializers.EmailField(source='client.email', read_only=True)
    mt5_account_id = serializers.CharField(source='enrollment.mt5_account_id', read_only=True)
    challenge_name = serializers.CharField(source='enrollment.challenge.name', read_only=True)
    account_size = serializers.DecimalField(source='enrollment.account_size', max_digits=12, decimal_places=2, read_only=True)
    trader_share_percent = serializers.SerializerMethodField()

    class Meta:
        model = PayoutConfiguration
        fields = [
            'id',
            'enrollment',
            'client_name',
            'client_email',
            'challenge_name',
            'mt5_account_id',
            'account_size',
            'config_type',
            'live_trading_start_date',
            'profit_share_percent',
            'payment_cycle',
            'custom_cycle_days',
            'custom_payout_days',
            'first_payout_delay_days',
            'subsequent_cycle_days',
            'min_net_amount',
            'base_share_percent',
            'min_trading_days',
            'custom_next_withdrawal_datetime',
            'is_active',
            'notes',
            'created_at',
            'updated_at',
            'trader_share_percent',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_client_name(self, obj):
        """
        Return client's full name if available,
        otherwise check client_profile.address_info,
        otherwise fall back to email.
        """
        user = obj.client
        # 1. Try Django built-in first/last name
        if user.first_name or user.last_name:
            return f"{user.first_name} {user.last_name}".strip()

        # 2. Try ClientProfile address_info fields
        profile = getattr(user, "client_profile", None)
        if profile and profile.address_info:
            first = profile.address_info.get("first_name")
            last = profile.address_info.get("last_name")
            if first or last:
                return f"{first or ''} {last or ''}".strip()

        # 3. Fallback to username or email
        return user.email or user.username

    def get_trader_share_percent(self, obj):
        if obj.config_type == "custom" and obj.profit_share_percent is not None:
            return obj.profit_share_percent
        if obj.enrollment and hasattr(obj.enrollment.challenge, "payout_policy"):
            policy = obj.enrollment.challenge.payout_policy
            num_previous = obj.enrollment.client.user.payouts.filter(
                status__in=["approved", "paid"]
            ).count()
            return policy.get_share_for(num_previous + 1)
        return 0

    
class AdminNotificationSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(
        write_only=True,
        required=False,
        help_text="Optional: Send to specific user by email. Leave blank for global (all users)."
    )

    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'user_email', 'title', 'message', 'type',
            'is_read', 'created_at', 'read_at', 'expires_at', 'action_url', 'image_url'
        ]
        read_only_fields = ['id', 'created_at', 'read_at', 'is_read', 'user']

    def create(self, validated_data):
        user_email = validated_data.pop('user_email', None)

        if user_email:
            try:
                user = User.objects.get(email=user_email)
                return Notification.objects.create(user=user, **validated_data)
            except User.DoesNotExist:
                raise serializers.ValidationError({"user_email": "User not found with this email."})
        else:
            # Global notification: Send to all active users
            users = User.objects.filter(is_active=True)
            notifications = [Notification(user=user, **validated_data) for user in users]
            Notification.objects.bulk_create(notifications)
            return notifications[0]  # Just return one instance for DRF to serialize

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['user_email'] = instance.user.email if instance.user else None
        return data                   

class ScheduledNotificationSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(write_only=True, required=False)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ScheduledNotification
        fields = [
            "id", "title", "message", "type", "action_url", "image_url", "expires_at",
            "scheduled_for", "status", "status_display", "user_email",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def create(self, validated_data):
        user_email = validated_data.pop("user_email", None)
        user = None
        if user_email:
            try:
                user = User.objects.get(email=user_email)
            except User.DoesNotExist:
                raise serializers.ValidationError({"user_email": "User not found"})

        sn = ScheduledNotification.objects.create(user=user, **validated_data)

        # Schedule task
        result = deliver_scheduled_notification.apply_async(args=[str(sn.id)], eta=sn.scheduled_for)
        sn.celery_task_id = result.id
        sn.save(update_fields=["celery_task_id"])
        return sn

    def update(self, instance, validated_data):
        if instance.status in ["sent", "cancelled"]:
            raise serializers.ValidationError("Cannot modify sent or cancelled notifications.")

        # Cancel previous Celery task if exists
        if instance.celery_task_id:
            app.control.revoke(instance.celery_task_id, terminate=True)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.status = "pending"
        instance.save()

        # Reschedule new task
        result = deliver_scheduled_notification.apply_async(args=[str(instance.id)], eta=instance.scheduled_for)
        instance.celery_task_id = result.id
        instance.save(update_fields=["celery_task_id"])
        return instance

class ClientTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Allows login using either email or username (case-insensitive),
    directly issues JWT tokens after verifying password,
    and adds extra user info.
    """

    def validate(self, attrs):
        request = self.context.get("request")
        ip = request.META.get("REMOTE_ADDR")
        user_agent = request.headers.get("User-Agent")

        username_or_email = attrs.get(User.USERNAME_FIELD) or attrs.get("username") or attrs.get("email")
        password = attrs.get("password")
        logger.debug("LOGIN ATTEMPT → input=%s", username_or_email)

        if not username_or_email or not password:
            log_event(
                request=request,
                user=None,
                category="security",
                event_type="login_failed",
                metadata={"reason": "missing_fields", "login_input": username_or_email, "ip": ip, "ua": user_agent},
                description="Login attempt failed: username/email or password missing."
            )
            raise serializers.ValidationError(_("Username/Email and password are required."))

        # Try both email and username case-insensitively
        user = (
            User.objects.filter(email__iexact=username_or_email).first()
            or User.objects.filter(username__iexact=username_or_email).first()
        )
        if not user:
            log_event(
                request=request,
                user=None,
                category="security",
                event_type="login_failed",
                metadata={"reason": "user_not_found", "login_input": username_or_email, "ip": ip, "ua": user_agent},
                description=f"Login failed for input '{username_or_email}'."
            )
            raise serializers.ValidationError(_("No client/affiliate account found with these credentials."))

        # Verify password
        if not user.check_password(password):
            log_event(
                request=request,
                user=user,
                category="security",
                event_type="login_failed",
                metadata={"reason": "invalid_password", "login_input": username_or_email, "ip": ip, "ua": user_agent},
                description=f"Login failed: incorrect password for user {user.email}."
            )
            raise serializers.ValidationError(_("Invalid credentials."))

        # Restrict allowed roles
        if user.role not in ("client", "affiliate"):
            log_event(
                request=request,
                user=user,
                category="security",
                event_type="login_failed",
                metadata={"reason": "invalid_role", "role": user.role, "ip": ip, "ua": user_agent},
                description=f"Login blocked: role '{user.role}' not allowed for token login."
            )
            raise serializers.ValidationError(_("No client/affiliate account found with these credentials."))

        logger.debug("PASSWORD OK & ROLE OK → user id %s", user.id)

        # Directly create JWT tokens instead of super().validate()
        refresh = RefreshToken.for_user(user)
        data = {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

        # Log success
        log_event(
            request=request,
            user=user,
            category="security",
            event_type="login_success",
            metadata={"ip": ip, "ua": user_agent},
            description=f"User ({user.email}) logged in successfully."
        )

        # Build full name
        full_name = None
        if hasattr(user, "client_profile") and getattr(user.client_profile, "address_info", None):
            addr = user.client_profile.address_info
            if isinstance(addr, str):
                try:
                    addr = json.loads(addr)
                except Exception:
                    addr = {}
            if isinstance(addr, dict):
                fn = str(addr.get("first_name") or "").strip()
                ln = str(addr.get("last_name") or "").strip()
                if fn or ln:
                    full_name = f"{fn} {ln}".strip()

        if not full_name:
            fn = str(user.first_name or "").strip()
            ln = str(user.last_name or "").strip()
            if fn or ln:
                full_name = f"{fn} {ln}".strip()
            elif user.get_full_name():
                full_name = str(user.get_full_name()).strip()
        if not full_name:
            full_name = "WeFund User"

        # Add extra info for frontend
        data.update({
            "user_id": str(user.id),
            "username": user.username,
            "role": user.role,
            "full_name": full_name,
            "profile_picture": (
                user.profile_picture
                or "https://we-fund.b-cdn.net/img/default-avatar.svg"
            ),
            "created_at": user.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        })

        logger.info("LOGIN SUCCESS → user id %s (%s)", user.id, user.role)
        return data


class ClientTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        refresh = RefreshToken(attrs["refresh"])
        user_id = refresh.get("user_id")

        User = get_user_model()
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return data

        full_name = (
            f"{user.first_name} {user.last_name}".strip()
            or user.get_full_name()
            or user.username
        )

        data.update({
            "user_id": str(user.id),
            "username": user.username,
            "role": user.role,
            "full_name": full_name,
            "profile_picture": user.profile_picture or "https://we-fund.b-cdn.net/img/default-avatar.svg",
        })

        # ✅ Always return rotated refresh
        if self.token is not None:
            data["refresh"] = str(self.token)

        return data
        
User = get_user_model()

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'role', 'status', 'two_factor_enabled',
        ]
        read_only_fields = ['id', 'username', 'email', 'role', 'status']
        
        
class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = ['id', 'code', 'discount_percent', 'usage_limit_per_user']

logger = logging.getLogger(__name__)

class OfferSerializer(serializers.ModelSerializer):
    coupons = CouponSerializer(many=True, required=False)

    # 🔧 This accepts the uploaded file temporarily (not stored in model)
    feature_image_file = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = Offer
        fields = [
            'id', 'title', 'description', 'feature_image_file', 'feature_image',
            'start_date', 'end_date', 'is_active', 'coupons',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'feature_image']

    def create(self, validated_data):
        request = self.context.get("request")
        coupons_data = validated_data.pop('coupons', [])
        image_file = validated_data.pop('feature_image_file', None)

        if image_file:
            filename = f"offers/{image_file.name}"
            try:
                cdn_url = upload_to_bunnycdn(image_file, filename)
                validated_data["feature_image"] = cdn_url
                logger.info(f"✅ Uploaded to BunnyCDN: {cdn_url}")
            except Exception as e:
                logger.exception("❌ BunnyCDN upload failed")
                raise serializers.ValidationError({
                    "feature_image_file": "Failed to upload image to BunnyCDN."
                })

        offer = Offer.objects.create(**validated_data)

        for coupon_data in coupons_data:
            Coupon.objects.create(offer=offer, **coupon_data)

        # Event Log
        log_event(
            request=request,
            category="offer",
            event_type="offer_created",
            user=request.user if request and request.user.is_authenticated else None,
            metadata={
                "offer_id": str(offer.id),
                "title": offer.title,
                "start_date": str(offer.start_date),
                "end_date": str(offer.end_date),
                "coupons_created": len(coupons_data),
            },
            description=f"Admin ({request.user.email}) created a promotional offer."
        )    

        return offer

    def update(self, instance, validated_data):
        request = self.context.get("request")

        # Capture BEFORE snapshot
        before = {
            "title": instance.title,
            "description": instance.description,
            "feature_image": instance.feature_image,
            "start_date": str(instance.start_date),
            "end_date": str(instance.end_date),
            "is_active": instance.is_active,
            "coupon_count": instance.coupons.count(),
        }

        coupons_data = validated_data.pop('coupons', [])
        image_file = validated_data.pop('feature_image_file', None)

        if image_file:
            filename = f"offers/{image_file.name}"
            try:
                cdn_url = upload_to_bunnycdn(image_file, filename)
                validated_data["feature_image"] = cdn_url
                logger.info(f"✅ Updated image on BunnyCDN: {cdn_url}")
            except Exception as e:
                logger.exception("❌ BunnyCDN upload failed (update)")
                raise serializers.ValidationError({
                    "feature_image_file": "Failed to upload image to BunnyCDN."
                })

        instance = super().update(instance, validated_data)

        # Refresh coupons
        instance.coupons.all().delete()
        for coupon_data in coupons_data:
            Coupon.objects.create(offer=instance, **coupon_data)

        # Capture AFTER snapshot
        after = {
            "title": instance.title,
            "description": instance.description,
            "feature_image": instance.feature_image,
            "start_date": str(instance.start_date),
            "end_date": str(instance.end_date),
            "is_active": instance.is_active,
            "coupon_count": instance.coupons.count(),
        }

        if before != after:
            log_event(
                request=request,
                user=request.user if request and request.user.is_authenticated else None,
                category="offer",
                event_type="offer_updated",
                metadata={
                    "offer_id": str(instance.id),
                    "before": before,
                    "after": after,
                },
                description=f"Admin ({request.user.email}) updated promotional offer."
            )    

        return instance
    
User = get_user_model()

class AddressInfoSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    company = serializers.CharField(required=False, allow_blank=True)
    address_line_1 = serializers.CharField(required=False, allow_blank=True)
    address_line_2 = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    postcode = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

class ClientPaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientPaymentMethod
        exclude = ('client',)
        extra_kwargs = {
            'paypal_email': {'required': False},
            'crypto_wallet_address': {'required': False},
            'bank_account_name': {'required': False},
            'bank_account_number': {'required': False},
            'iban': {'required': False},
            'swift_code': {'required': False},
            'bank_name': {'required': False},
            'bank_branch': {'required': False},
            'bank_country': {'required': False},
            'bank_currency': {'required': False},
            'crypto_type': {'required': False},
            'label': {'required': False},
        }

class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSettings
        exclude = ('id', 'user')

class ClientProfileSettingsSerializer(serializers.ModelSerializer):
    address_info = AddressInfoSerializer()

    class Meta:
        model = ClientProfile
        fields = ('address_info',)

class UserProfileSettingsSerializer(serializers.ModelSerializer):
    client_profile = ClientProfileSettingsSerializer()
    notification_settings = NotificationSettingsSerializer()
    payment_methods = ClientPaymentMethodSerializer(many=True)

    profile_picture_file = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = User
        fields = (
            'email', 'username', 'first_name', 'last_name', 'phone',
            'date_of_birth', 'profile_picture', 'profile_picture_file',
            'two_factor_enabled', 'two_factor_method',
            'client_profile', 'notification_settings',
            'payment_methods'
        )
        read_only_fields = ('email',)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('profile_picture'):
            data['profile_picture'] = "https://we-fund.b-cdn.net/img/default-avatar.svg"
        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get("request")

        client_data = validated_data.pop('client_profile', {})
        notif_data = validated_data.pop('notification_settings', {})
        payment_methods_data = validated_data.pop('payment_methods', [])

        # --- BEFORE SNAPSHOTS ---
        before_profile = {
            "first_name": instance.first_name,
            "last_name": instance.last_name,
            "phone": instance.phone,
            "date_of_birth": str(instance.date_of_birth),
            "two_factor_enabled": instance.two_factor_enabled,
            "two_factor_method": instance.two_factor_method,
        }

        before_notif = {
            field: getattr(instance.notification_settings, field)
            for field in [
                "system_new_challenge", "system_announcements", "system_risk_alerts",
                "system_community", "system_platform",
                "email_new_challenge", "email_announcements", "email_risk_alerts",
                "email_community", "email_platform"
            ]
        }

        before_payment_methods = list(instance.payment_methods.values())

        # --- PROFILE PICTURE ---
        picture_file = validated_data.pop('profile_picture_file', None)
        if picture_file:
            filename = f'profiles/{instance.id}.jpg'
            profile_url = upload_to_bunnycdn(picture_file, filename)
            instance.profile_picture = profile_url
            instance.save(update_fields=["profile_picture"])

            log_event(
                request=request,
                user=instance,
                category="profile",
                event_type="profile_picture_updated",
                metadata={"profile_picture_url": profile_url},
                description=f"User ({instance.email}) updated profile picture."
            )

        # --- BASIC PROFILE FIELDS ---
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # --- CLIENT PROFILE (Address Info) ---
        if client_data:
            addr_data = client_data.get('address_info')
            if addr_data:
                for attr, value in addr_data.items():
                    instance.client_profile.address_info[attr] = value
                instance.client_profile.save()

        # --- NOTIFICATION SETTINGS ---
        if notif_data:
            for attr, value in notif_data.items():
                setattr(instance.notification_settings, attr, value)
            instance.notification_settings.save()

        # Compare and Log Notification Change
        after_notif = {
            field: getattr(instance.notification_settings, field)
            for field in before_notif.keys()
        }
        if before_notif != after_notif:
            log_event(
                request=request,
                user=instance,
                category="profile",
                event_type="notification_settings_updated",
                metadata={"before": before_notif, "after": after_notif},
                description=f"User ({instance.email}) updated notification settings."
            )

        # --- PAYMENT METHODS ---
        if payment_methods_data is not None:
            instance.payment_methods.all().delete()
            for method_data in payment_methods_data:
                ClientPaymentMethod.objects.create(client=instance, **method_data)

        after_payment_methods = list(instance.payment_methods.values())
        if before_payment_methods != after_payment_methods:
            log_event(
                request=request,
                user=instance,
                category="profile",
                event_type="payment_method_updated",
                metadata={"before": before_payment_methods, "after": after_payment_methods},
                description=f"User ({instance.email}) updated payment methods."
            )

        # --- COMPARE PROFILE FIELDS AND LOG ---
        after_profile = {
            "first_name": instance.first_name,
            "last_name": instance.last_name,
            "phone": instance.phone,
            "date_of_birth": str(instance.date_of_birth),
            "two_factor_enabled": instance.two_factor_enabled,
            "two_factor_method": instance.two_factor_method,
        }

        if before_profile != after_profile:
            log_event(
                request=request,
                user=instance,
                category="profile",
                event_type="profile_updated",
                metadata={"before": before_profile, "after": after_profile},
                description=f"User ({instance.email}) updated profile details."
            )

        return instance
    
class PublicOfferSerializer(serializers.ModelSerializer):
    coupons = CouponSerializer(many=True, read_only=True)

    class Meta:
        model = Offer
        fields = ['id', 'title', 'description', 'feature_image', 'start_date', 'end_date', 'coupons']
        
class AchievementSerializer(serializers.Serializer):
    total_payout = serializers.DecimalField(max_digits=12, decimal_places=2)
    highest_payout = serializers.DecimalField(max_digits=12, decimal_places=2)
    best_trade = serializers.DecimalField(max_digits=15, decimal_places=2)
    longest_funded_days = serializers.IntegerField()

class ChallengeItemSerializer(serializers.Serializer):
    name = serializers.CharField()
    status = serializers.CharField()
    phases = serializers.ListField(child=serializers.CharField())
    account_id = serializers.CharField(allow_null=True)
    start_date = serializers.DateField()

class ActiveChallengesSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    list = ChallengeItemSerializer(many=True)

class TopTraderSerializer(serializers.Serializer):
    place = serializers.IntegerField()
    trader = serializers.CharField()
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    equity_growth = serializers.DecimalField(max_digits=6, decimal_places=2)

class ClientDashboardSerializer(serializers.Serializer):
    achievements = AchievementSerializer()
    active_challenges = ActiveChallengesSerializer()
    top_traders = TopTraderSerializer(many=True)
    
class LeaderboardEntrySerializer(serializers.Serializer):
    place = serializers.IntegerField()
    username = serializers.CharField()
    profile_picture = serializers.CharField(allow_null=True)
    equity = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    growth_percentage = serializers.DecimalField(max_digits=6, decimal_places=2)
    won_trade_percent = serializers.DecimalField(max_digits=5, decimal_places=2)
    
class DailyPLSerializer(serializers.Serializer):
    date = serializers.DateField()
    profit = serializers.DecimalField(max_digits=15, decimal_places=2)
    trades = serializers.IntegerField()
    lots = serializers.FloatField()

class TradeHistorySerializer(serializers.ModelSerializer):
    side = serializers.SerializerMethodField()

    class Meta:
        model = MT5Trade
        fields = [
            "order",
            "open_time",
            "open_price",
            "close_time",
            "close_price",
            "symbol",
            "volume",
            "profit",
            "side",
        ]

    def get_side(self, obj):
        cmd_map = {
            0: "Buy",
            1: "Sell",
            2: "Buy Limit",
            3: "Sell Limit",
            4: "Buy Stop",
            5: "Sell Stop",
        }
        return cmd_map.get(obj.cmd, f"Unknown ({obj.cmd})")



class MyStatsSerializer(serializers.Serializer):
    net_pnl = serializers.DecimalField(max_digits=15, decimal_places=2)
    win_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    avg_rr = serializers.DecimalField(max_digits=5, decimal_places=2)
    profit_factor = serializers.DecimalField(max_digits=10, decimal_places=2)

    total_winners = serializers.DecimalField(max_digits=15, decimal_places=2)
    best_win = serializers.DecimalField(max_digits=15, decimal_places=2)
    avg_win = serializers.DecimalField(max_digits=15, decimal_places=2)
    max_win_streak = serializers.IntegerField()

    total_losers = serializers.DecimalField(max_digits=15, decimal_places=2)
    worst_loss = serializers.DecimalField(max_digits=15, decimal_places=2)
    avg_loss = serializers.DecimalField(max_digits=15, decimal_places=2)
    max_loss_streak = serializers.IntegerField()

    pnl_daily = DailyPLSerializer(many=True)
    best_day = serializers.DictField()   # {'date': 'YYYY-MM-DD', 'profit': decimal}
    worst_day = serializers.DictField()  # same

    trade_history = TradeHistorySerializer(many=True)
    
class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = [
            'id',
            'certificate_type',
            'title',
            'image_url',
            'pdf_url',
            'issued_date',
            'expiry_date',
            'metadata',
        ]
        read_only_fields = fields
        
class WithdrawalSummarySerializer(serializers.Serializer):
    current_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    withdrawal_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit_share_percent = serializers.DecimalField(max_digits=5, decimal_places=2)
    trader_share = serializers.DecimalField(max_digits=12, decimal_places=2)
    next_withdrawal_date = serializers.DateField()

class TraderPayoutHistorySerializer(serializers.ModelSerializer):
    mt5_account_id = serializers.SerializerMethodField()
    client_status_label = serializers.SerializerMethodField()
    extended_review_details = serializers.SerializerMethodField()
    rejection_details = serializers.SerializerMethodField()
    exclude_details = serializers.SerializerMethodField()

    class Meta:
        model = TraderPayout
        fields = [
            'id',
            'profit',
            'profit_share',
            'net_profit',
            'amount',
            'method',
            'method_details',
            'status',
            'requested_at',
            'reviewed_at',
            'paid_at',
            'mt5_account_id',
            'exclude_amount',
            'exclude_reason',
            'extended_review_until',
            'client_status_label',
            'extended_review_details',
            'rejection_details',
            'exclude_details',
        ]
        read_only_fields = fields

    # --- Derived fields ---
    def get_mt5_account_id(self, obj):
        if obj.challenge_enrollment:
            return obj.challenge_enrollment.mt5_account_id
        return None

    def get_client_status_label(self, obj):
        if obj.status == 'extended_review':
            days = obj.extended_review_days or 10
            return f"Extended Review – up to {days} business days"
        return obj.status.replace("_", " ").title()

    # --- Extended review info ---
    def get_extended_review_details(self, obj):
        if obj.status != 'extended_review':
            return None
        return {
            "extended_review_days": obj.extended_review_days,
            "extended_review_until": obj.extended_review_until,
            "note": f"This payout is under extended review for up to {obj.extended_review_days or 10} business days.",
        }

    # --- Rejection info ---
    def get_rejection_details(self, obj):
        if obj.status != 'rejected':
            return None
        return {
            "rejection_reason": obj.rejection_reason or "No reason provided",
            "admin_note": obj.admin_note or "",
            "reviewed_at": obj.reviewed_at,
        }

    # --- Exclusion info ---
    def get_exclude_details(self, obj):
        if not obj.exclude_amount:
            return None
        return {
            "exclude_amount": obj.exclude_amount,
            "exclude_reason": obj.exclude_reason or "Not specified",
            "is_custom_amount": obj.is_custom_amount,
        }
        
class ClientInitSerializer(serializers.ModelSerializer):
    is_first_login = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'full_name', 'is_first_login']

    def get_is_first_login(self, user):
        return not hasattr(user, 'client_profile') or not user.client_profile.first_login_completed

    def get_full_name(self, user):
        return f"{user.first_name} {user.last_name}".strip()
    
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'type',
            'is_read', 'created_at', 'read_at', 'action_url', 'image_url'
        ]
        
class AffiliateProfileSerializer(serializers.ModelSerializer):
    total_referrals = serializers.SerializerMethodField()
    active_referrals = serializers.SerializerMethodField()
    total_earnings = serializers.SerializerMethodField()
    conversion_rate = serializers.SerializerMethodField()

    approved_earnings = serializers.SerializerMethodField()
    pending_earnings = serializers.SerializerMethodField()
    processing_earnings = serializers.SerializerMethodField()
    rejected_earnings = serializers.SerializerMethodField()

    wallet_balance = serializers.SerializerMethodField()
    wallet_total_earned = serializers.SerializerMethodField()
    recent_payouts = serializers.SerializerMethodField()

    class Meta:
        model = AffiliateProfile
        fields = [
            'referral_code', 'website_url', 'promotion_strategy', 'approved',
            'total_referrals', 'active_referrals', 'total_earnings', 'conversion_rate',
            'approved_earnings', 'pending_earnings', 'processing_earnings', 'rejected_earnings',
            'wallet_balance', 'wallet_total_earned', 'recent_payouts'
        ]

    # --- Referral stats ---
    def get_total_referrals(self, obj):
        return obj.referrals.count()

    def get_active_referrals(self, obj):
        return obj.referrals.filter(commission_status='approved').count()

    def get_total_earnings(self, obj):
        return sum(r.commission_amount for r in obj.referrals.all())

    def get_conversion_rate(self, obj):
        total = obj.referrals.count()
        active = obj.referrals.filter(commission_status='approved').count()
        return round((active / total) * 100, 1) if total > 0 else 0.0

    def get_approved_earnings(self, obj):
        return sum(r.commission_amount for r in obj.referrals.filter(commission_status='approved'))

    def get_pending_earnings(self, obj):
        return sum(r.commission_amount for r in obj.referrals.filter(commission_status='pending'))

    def get_processing_earnings(self, obj):
        return sum(r.commission_amount for r in obj.referrals.filter(commission_status='processing'))

    def get_rejected_earnings(self, obj):
        return sum(r.commission_amount for r in obj.referrals.filter(commission_status='rejected'))

    # --- Wallet info ---
    def get_wallet_balance(self, obj):
        wallet = getattr(obj.user, "affiliate_wallet", None)
        return wallet.balance if wallet else 0.00

    def get_wallet_total_earned(self, obj):
        wallet = getattr(obj.user, "affiliate_wallet", None)
        return wallet.total_earned if wallet else 0.00

    # --- Payouts info ---
    def get_recent_payouts(self, obj):
        payouts = obj.user.affiliate_payouts.all().order_by('-requested_at')[:5]
        return [
            {
                "id": str(p.id),
                "amount": p.amount,
                "status": p.status,
                "requested_at": p.requested_at,
                "processed_at": p.processed_at,
            }
            for p in payouts
        ]


class AffiliateReferralSerializer(serializers.ModelSerializer):
    referred_user_email = serializers.EmailField(source='referred_user.email')

    class Meta:
        model = AffiliateReferral
        fields = [
            'id', 'referred_user_email', 'date_referred', 'challenge_name',
            'commission_amount', 'commission_status', 'note'
        ]

class AffiliateWalletTransactionSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = AffiliateWalletTransaction
        fields = [
            'id',
            'transaction_type',
            'transaction_type_display',
            'status',
            'status_display',
            'amount',
            'note',
            'created_at',
        ]
        
class AffiliatePayoutCreateSerializer(serializers.ModelSerializer):
    payment_method_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = AffiliatePayout
        fields = ['amount', 'payment_method_id', 'notes']

    def validate(self, data):
        user = self.context['request'].user

        if not hasattr(user, 'affiliate_profile') or not user.affiliate_profile.approved:
            return Response({"detail": "Only approved affiliates can request payouts."}, status=403)

        try:
            wallet = user.affiliate_wallet
        except:
            raise serializers.ValidationError("Affiliate wallet not found.")

        amount = data['amount']
        if amount <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")

        if amount < 100:
            raise serializers.ValidationError("Minimum withdrawal amount is $100.")

        if wallet.balance < amount:
            raise serializers.ValidationError("Insufficient wallet balance.")

        # Check valid payment method
        try:
            payment_method = ClientPaymentMethod.objects.get(
                id=data['payment_method_id'],
                client=user
            )
        except ClientPaymentMethod.DoesNotExist:
            raise serializers.ValidationError("Invalid payment method.")

        data['wallet'] = wallet
        data['payment_method'] = payment_method
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        amount = validated_data['amount']
        wallet = validated_data['wallet']
        payment_method = validated_data['payment_method']

        # Create payout record
        payout = AffiliatePayout.objects.create(
            affiliate=user,
            amount=amount,
            status='pending',
            payment_method=payment_method,
            notes=validated_data.get('notes', '')
        )

        # Create wallet transaction (pending status)
        transaction = AffiliateWalletTransaction.objects.create(
            wallet=wallet,
            transaction_type='payout',
            amount=-amount,
            status='pending',
            related_payout=payout,
            note='Payout requested by affiliate'
        )

        # Link transaction to payout
        payout.wallet_transaction = transaction
        payout.save()

        # Don't deduct actual balance yet — you can handle that on approval if needed
        return payout
    
class TraderPayoutRequestSerializer(serializers.Serializer):
    enrollment_id = serializers.UUIDField()
    method = serializers.ChoiceField(choices=TraderPayout.PAYOUT_METHOD_CHOICES)
    method_details = serializers.JSONField()
    
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'phone', 'role', 'is_active']
        
class ClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientProfile
        fields = ['kyc_status', 'has_live_account', 'address_info', 'referred_by']
        
class BreachHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BreachHistory
        fields = ['id', 'rule', 'reason', 'breached_at']
        
class AffiliateWalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = AffiliateWallet
        fields = ['id', 'balance', 'total_earned']
        
class AffiliatePayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = AffiliatePayout
        fields = ['id', 'amount', 'status', 'requested_at', 'processed_at']
        
class SoftBreachSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    # account_id already exists in SoftBreach
    class Meta:
        model = SoftBreach
        fields = [
            'id', 'account_id', 'user_name', 'user_id', 'rule', 'severity', 'value',
            'description', 'detected_at', 'resolved', 'resolved_at'
        ]

class HardBreachSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    account_id = serializers.SerializerMethodField()
    reverted = serializers.SerializerMethodField()

    class Meta:
        model = BreachHistory
        fields = [
            'id', 'user_name', 'user_id', 'account_id',
            'rule', 'reason', 'breached_at', 'reverted'
        ]

    def get_account_id(self, obj):
        if obj.enrollment and hasattr(obj.enrollment, 'mt5_account_id'):
            return obj.enrollment.mt5_account_id
        return None

    def get_reverted(self, obj):
        # if no enrollment, can't match a revert record
        if not obj.enrollment:
            return False

        # if breached_at is missing, avoid 500
        breached_at = getattr(obj, "breached_at", None)
        if breached_at is None:
            return False  # or fallback to obj.created_at if you prefer

        # build same-day bounds (handles naive/aware safely)
        if timezone.is_aware(breached_at):
            same_day_start = breached_at.astimezone(timezone.get_current_timezone()).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
        else:
            same_day_start = breached_at.replace(hour=0, minute=0, second=0, microsecond=0)

        same_day_end = same_day_start + timezone.timedelta(days=1)

        return BreachHistory.objects.filter(
            enrollment=obj.enrollment,
            rule__in=["Breach Reverted", "Breach Reverted (Bulk)"],
            breached_at__gte=same_day_start,
            breached_at__lt=same_day_end,
        ).exists()
    
class AdminAffiliateDashboardSerializer(serializers.Serializer):
    total_affiliates = serializers.IntegerField()
    total_commission = serializers.DecimalField(max_digits=20, decimal_places=2)
    total_payout_requests = serializers.IntegerField()
    total_payouts = serializers.DecimalField(max_digits=20, decimal_places=2)

class AdminAffiliateUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'status', 'created_at', 'profile_picture', 'phone']
        
class AdminTopAffiliateSerializer(serializers.ModelSerializer):
    total_commission = serializers.DecimalField(max_digits=20, decimal_places=2)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'total_commission']

class AdminRecentReferralSerializer(serializers.ModelSerializer):
    affiliate_username = serializers.CharField(source='affiliate.user.username', read_only=True)
    referred_username = serializers.CharField(source='referred_user.username', read_only=True)

    class Meta:
        model = AffiliateReferral
        fields = ['id', 'affiliate_username', 'referred_username', 'challenge_name', 'commission_amount', 'date_referred']

class AdminAffiliateClicksSerializer(serializers.Serializer):
    affiliate_id = serializers.UUIDField()
    affiliate_username = serializers.CharField()
    total_clicks = serializers.IntegerField()            
    
class AdminAffiliateWalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = AffiliateWallet
        fields = ['balance', 'total_earned', 'last_updated']

class AdminAffiliateWalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AffiliateWalletTransaction
        fields = [
            'id', 'transaction_type', 'amount', 'status',
            'note', 'created_at', 'related_payout'
        ]

class AdminAffiliateReferralSerializer(serializers.ModelSerializer):
    affiliate_id = serializers.UUIDField(source='affiliate.id', read_only=True)
    affiliate_username = serializers.CharField(source='affiliate.user.username', read_only=True)
    affiliate_email = serializers.EmailField(source='affiliate.user.email', read_only=True)

    referred_user_id = serializers.UUIDField(source='referred_user.id', read_only=True)
    referred_username = serializers.CharField(source='referred_user.username', read_only=True)
    referred_email = serializers.EmailField(source='referred_user.email', read_only=True)

    class Meta:
        model = AffiliateReferral
        fields = [
            'id',
            'affiliate_id', 'affiliate_username', 'affiliate_email',
            'referred_user_id', 'referred_username', 'referred_email',
            'challenge_name',
            'commission_amount', 'commission_status', 'date_referred', 'note',
            'created_at', 'updated_at',
        ]


class AdminAffiliatePayoutSerializer(serializers.ModelSerializer):
    affiliate_name = serializers.CharField(source='affiliate.user.get_full_name', read_only=True)
    affiliate_email = serializers.EmailField(source='affiliate.user.email', read_only=True)

    class Meta:
        model = AffiliatePayout
        fields = [
            'id', 'affiliate', 'affiliate_name', 'affiliate_email',
            'amount', 'status', 'requested_at', 'processed_at',
            'transaction_id', 'is_manual', 'notes'
        ]
        read_only_fields = ['requested_at']

class EnrollmentAccountTradeHistorySerializer(serializers.ModelSerializer):
    account_id = serializers.CharField(source='mt5_account_id')
    trades = serializers.SerializerMethodField()

    class Meta:
        model = EnrollmentAccount
        fields = ['phase_type', 'account_id', 'status', 'trades']

    def get_trades(self, obj):
        if not obj.mt5_account_id:
            return []
        trades = MT5Trade.objects.filter(account_id=obj.mt5_account_id)
        from .serializers import PayoutMT5TradeSerializer
        return PayoutMT5TradeSerializer(trades, many=True).data

def calculate_rrr(trade):
    entry = float(trade.open_price)
    sl = float(trade.sl)
    tp = float(trade.tp)

    # Skip if SL or TP not set
    if not sl or not tp:
        return None

    if trade.cmd == 0:  # Buy
        risk = entry - sl
        reward = tp - entry
    elif trade.cmd == 1:  # Sell
        risk = sl - entry
        reward = entry - tp
    else:
        return None  # Other trade types (hedge, pending, etc.)

    # Valid only if both positive
    if risk <= 0 or reward <= 0:
        return None

    return round(reward / risk, 2)
        
class PayoutMT5TradeSerializer(serializers.ModelSerializer):
    rrr = serializers.SerializerMethodField()

    class Meta:
        model = MT5Trade
        fields = "__all__"  # include every model field + rrr

    def get_rrr(self, obj):
        return calculate_rrr(obj)

class PayoutBreachSerializer(serializers.ModelSerializer):
    class Meta:
        model = BreachHistory
        fields = ['rule', 'reason', 'breached_at']

class PayoutSoftBreachSerializer(serializers.ModelSerializer):
    class Meta:
        model = SoftBreach
        fields = ['rule', 'severity', 'value', 'description', 'detected_at', 'resolved']

class TraderPayoutSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TraderPayout
        fields = [
            "id",
            "amount",
            "profit",
            "profit_share",
            "net_profit",
            "released_fund",
            "method",
            "status",
            'admin_note',          # 🔥 include admin note
            'rejection_reason',    # 🔥 reason for rejection
            'is_custom_amount',    # 🔥 manual override flag
            'exclude_amount',      # 🔥 amount excluded
            'exclude_reason',
            "requested_at",
            "reviewed_at",
            "paid_at",
        ]

class TraderPayoutAdminDetailSerializer(serializers.ModelSerializer):
    trader_name = serializers.CharField(source='trader.get_full_name', read_only=True)
    trader_email = serializers.EmailField(source='trader.email', read_only=True)
    
    # Challenge info
    challenge_type = serializers.CharField(source='challenge_enrollment.challenge.name', read_only=True)
    challenge_start_date = serializers.DateField(source='challenge_enrollment.start_date', read_only=True)
    challenge_status = serializers.CharField(source='challenge_enrollment.status', read_only=True)
    account_size = serializers.DecimalField(source='challenge_enrollment.account_size', max_digits=12, decimal_places=2, read_only=True)
    
    # MT5 Account info
    mt5_account_id = serializers.CharField(source='challenge_enrollment.mt5_account_id', read_only=True)
    current_balance = serializers.SerializerMethodField()
    total_profit_loss = serializers.DecimalField(source='profit', max_digits=12, decimal_places=2, read_only=True)
    
    # Trading performance
    total_trades = serializers.SerializerMethodField()
    win_rate = serializers.SerializerMethodField()
    net_profit = serializers.DecimalField(source='profit', max_digits=12, decimal_places=2, read_only=True)
    average_win = serializers.SerializerMethodField()
    average_loss = serializers.SerializerMethodField()
    average_trade_duration = serializers.SerializerMethodField()
    
    # Risk Analysis
    total_breaches = serializers.SerializerMethodField()
    soft_breaches = serializers.SerializerMethodField()
    hard_breaches = serializers.SerializerMethodField()
    risk_score = serializers.SerializerMethodField()
    
    # AI / ML Analysis (mock)
    ai_recommendations = serializers.SerializerMethodField()
    ai_trading_review = serializers.SerializerMethodField()
    
    # Trade History
    trade_history = serializers.SerializerMethodField()

    # All payout history for this trader
    payout_history = serializers.SerializerMethodField()

    # Enrollment ID for internal notes
    enrollment_id = serializers.UUIDField(source='challenge_enrollment.id', read_only=True)
    # Trader user ID for unified notes
    trader_user_id = serializers.IntegerField(source='trader.id', read_only=True)

    class Meta:
        model = TraderPayout
        fields = [
            'id', 'enrollment_id', 'trader_user_id', 'trader_name', 'trader_email',
            'challenge_type', 'challenge_start_date', 'challenge_status', 'account_size',
            'mt5_account_id', 'current_balance', 'total_profit_loss',
            'total_trades', 'win_rate', 'net_profit', 'average_win', 'average_loss', 'average_trade_duration',
            'total_breaches', 'soft_breaches', 'hard_breaches', 'risk_score',
            'ai_recommendations', 'ai_trading_review', 'trade_history',
            'payout_history',

            'amount',
            'profit',
            'profit_share',
            'released_fund',
            'method',
            'method_details',
            'status',
            'admin_note',
            'rejection_reason',
            'is_custom_amount',
            'exclude_amount',
            'exclude_reason',
            'requested_at',
            'reviewed_at',
            'paid_at',
        ]
    
    def get_current_balance(self, obj):
        return obj.challenge_enrollment.account_size + obj.profit

    def get_total_trades(self, obj):
        return MT5Trade.objects.filter(account_id=obj.challenge_enrollment.mt5_account_id).count()

    def get_win_rate(self, obj):
        trades = MT5Trade.objects.filter(account_id=obj.challenge_enrollment.mt5_account_id)
        if not trades.exists():
            return 0
        wins = trades.filter(profit__gt=0).count()
        return round((wins / trades.count()) * 100, 2)
    
    def get_average_win(self, obj):
        trades = MT5Trade.objects.filter(account_id=obj.challenge_enrollment.mt5_account_id, profit__gt=0)
        if not trades.exists():
            return 0
        return round(trades.aggregate(avg_win=serializers.models.Avg('profit'))['avg_win'], 2)

    def get_average_loss(self, obj):
        trades = MT5Trade.objects.filter(account_id=obj.challenge_enrollment.mt5_account_id, profit__lt=0)
        if not trades.exists():
            return 0
        return round(trades.aggregate(avg_loss=serializers.models.Avg('profit'))['avg_loss'], 2)
    
    def get_average_trade_duration(self, obj):
        trades = MT5Trade.objects.filter(account_id=obj.challenge_enrollment.mt5_account_id)
        if not trades.exists():
            return 0
        total_seconds = sum([(t.close_time - t.open_time).total_seconds() for t in trades])
        return total_seconds / trades.count()
    
    def get_total_breaches(self, obj):
        soft_count = SoftBreach.objects.filter(payout=obj).count()
        hard_count = BreachHistory.objects.filter(enrollment=obj.challenge_enrollment).count()
        return soft_count + hard_count

    def get_soft_breaches(self, obj):
        return PayoutSoftBreachSerializer(SoftBreach.objects.filter(payout=obj), many=True).data

    def get_hard_breaches(self, obj):
        return PayoutBreachSerializer(BreachHistory.objects.filter(enrollment=obj.challenge_enrollment), many=True).data

    def get_risk_score(self, obj):
        try:
            if obj.ai_analysis and obj.ai_analysis.risk_score is not None:
                return float(obj.ai_analysis.risk_score)
        except TraderPayoutAIAnalysis.DoesNotExist:
            pass
        return None
    
    def get_ai_recommendations(self, obj):
        try:
            return obj.ai_analysis.ai_recommendations
        except TraderPayoutAIAnalysis.DoesNotExist:
            return None

    def get_ai_trading_review(self, obj):
        try:
            return {
                "summary": obj.ai_analysis.summary,
                "trading_style": obj.ai_analysis.trading_style,
                "risk_assessment": obj.ai_analysis.risk_assessment,
                "recommendation": obj.ai_analysis.recommendation
            }
        except TraderPayoutAIAnalysis.DoesNotExist:
            return None

    def get_trade_history(self, obj):
        trade_history = []

        # 1️⃣ Add current active MT5 account trades
        if obj.challenge_enrollment.mt5_account_id:
            from .serializers import PayoutMT5TradeSerializer
            current_trades = MT5Trade.objects.filter(account_id=obj.challenge_enrollment.mt5_account_id)
            trade_history.append({
                "phase_type": "current",
                "account_id": obj.challenge_enrollment.mt5_account_id,
                "status": "active",
                "trades": PayoutMT5TradeSerializer(current_trades, many=True).data
            })

        # 2️⃣ Add past MT5 accounts trades
        past_accounts = obj.challenge_enrollment.accounts.all()
        from .serializers import EnrollmentAccountTradeHistorySerializer
        past_trades_data = EnrollmentAccountTradeHistorySerializer(past_accounts, many=True).data
        trade_history.extend(past_trades_data)

        return trade_history
    
    def get_payout_history(self, obj):
        """Return all payouts for the same challenge enrollment."""
        from .serializers import TraderPayoutSimpleSerializer

        payouts = TraderPayout.objects.filter(
            challenge_enrollment=obj.challenge_enrollment
        ).order_by('-requested_at')

        return TraderPayoutSimpleSerializer(payouts, many=True).data
    
class EAApprovalRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = EATradingBotRequest
        fields = [
            "id", "client", "enrollment", "mq5_file_url",
            "status", "rejection_reason", "created_at", "updated_at"
        ]
        read_only_fields = ["status", "rejection_reason", "mq5_file_url", "created_at", "updated_at"]
        
class EATradingBotRequestSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.user.get_full_name", read_only=True)
    client_email = serializers.EmailField(source="client.user.email", read_only=True)
    enrollment_id = serializers.UUIDField(source="enrollment.id", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.username", read_only=True)

    class Meta:
        model = EATradingBotRequest
        fields = [
            "id",
            "client_name",
            "client_email",
            "enrollment_id",
            "mq5_file_url",
            "status",
            "rejection_reason",
            "created_at",
            "updated_at",
            "reviewed_by_name",
        ]
        read_only_fields = ["created_at", "updated_at", "reviewed_by_name"]
        
class AffiliateCommissionTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = AffiliateCommissionTier
        fields = "__all__"
        
class CRMAffiliateProfileSerializer(serializers.ModelSerializer):
    referral_count = serializers.IntegerField(read_only=True)
    current_tier = serializers.SerializerMethodField()

    class Meta:
        model = AffiliateProfile
        fields = [
            "id",
            "referral_code",
            "approved",
            "website_url",
            "promotion_strategy",
            "referral_count",
            "current_tier",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["referral_code", "referral_count", "current_tier"]

    def get_current_tier(self, obj):
        tier = obj.current_tier
        if tier:
            return {
                "id": tier.id,
                "name": tier.name,
                "commission_rate": tier.commission_rate,
                "min_referrals": tier.min_referrals,
                "max_referrals": tier.max_referrals,
            }
        return None

class CRMAffiliateUserSerializer(serializers.ModelSerializer):
    affiliate_profile = CRMAffiliateProfileSerializer()
    custom_commission = serializers.DictField(write_only=True, required=False)
    custom_commission_info = serializers.SerializerMethodField(read_only=True)
    effective_commission_rate = serializers.SerializerMethodField(read_only=True)
    current_tier_info = serializers.SerializerMethodField(read_only=True)
    manual_tier_override_info = serializers.SerializerMethodField(read_only=True)
    auto_tier_info = serializers.SerializerMethodField(read_only=True)



    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "status",
            "profile_picture",
            "date_of_birth",
            "role",
            "created_at",
            "updated_at",
            "affiliate_profile",
            "custom_commission",
            "custom_commission_info",
            "effective_commission_rate",
            "current_tier_info",
            "manual_tier_override_info",
            "auto_tier_info",
        ]

    def generate_referral_code(self):
        """
        Generate a unique referral code like WEF200751
        """
        while True:
            code = f"WEF{random.randint(100000, 999999)}"
            if not AffiliateProfile.objects.filter(referral_code=code).exists():
                return code
            
    def get_custom_commission_info(self, obj):
        profile = getattr(obj, "affiliate_profile", None)
        if not profile or not hasattr(profile, "custom_commission"):
            return None

        cc = profile.custom_commission
        return {
            "is_active": cc.is_active,
            "commission_rate": str(cc.commission_rate) if cc.commission_rate else None,
            "fixed_amount_per_referral": str(cc.fixed_amount_per_referral) if cc.fixed_amount_per_referral else None,
            "notes": cc.notes,
            "created_at": cc.created_at,
            "updated_at": cc.updated_at,
        }

    def get_effective_commission_rate(self, obj):
        profile = getattr(obj, "affiliate_profile", None)
        if not profile:
            return None

        # 1) Use active custom commission if exists
        custom = getattr(profile, "custom_commission", None)
        if custom and custom.is_active and custom.commission_rate:
            return str(custom.commission_rate)

        # 2) Otherwise fallback to current tier rate
        tier = getattr(profile, "current_tier", None)
        if tier:
            return str(tier.commission_rate)

        # 3) Default: no rate available
        return "0.00"
    
    def get_current_tier_info(self, obj):
        """
        Returns tier details if affiliate belongs to a global commission tier.
        """
        profile = getattr(obj, "affiliate_profile", None)
        if not profile:
            return None

        tier = getattr(profile, "current_tier", None)
        if not tier:
            return None
        
    def get_manual_tier_override_info(self, obj):
        profile = getattr(obj, "affiliate_profile", None)
        if not profile or not profile.manual_tier_override:
            return None

        tier = profile.manual_tier_override
        return {
            "id": str(tier.id),
            "name": tier.name,
            "commission_rate": str(tier.commission_rate),
        }


    def get_auto_tier_info(self, obj):
        profile = getattr(obj, "affiliate_profile", None)
        if not profile:
            return None

        # Use auto tier directly (ignore override)
        auto_tier = profile.auto_tier if hasattr(profile, "auto_tier") else profile.current_tier
        # ✅ Fallback to safe auto-tier logic
        if not auto_tier:
            return None

        return {
            "id": str(auto_tier.id),
            "name": auto_tier.name,
            "min_referrals": auto_tier.min_referrals,
            "max_referrals": auto_tier.max_referrals,
            "commission_rate": str(auto_tier.commission_rate),
        }

        
    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get("request")
        profile_data = validated_data.pop("affiliate_profile", {})
        custom_commission_data = validated_data.pop("custom_commission", None)

        raw_password = get_random_string(length=10)

        user = User.objects.create_user(
            **validated_data,
            role="affiliate",
            password=raw_password
        )

        referral_code = self.generate_referral_code()
        profile, _ = AffiliateProfile.objects.get_or_create(
            user=user,
            defaults={"referral_code": referral_code}
        )

        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()

        if custom_commission_data:
            rate = custom_commission_data.get("commission_rate")
            if rate:
                try:
                    rate = Decimal(str(rate))
                except InvalidOperation:
                    raise serializers.ValidationError({"custom_commission": "Invalid commission rate format"})

            AffiliateCustomCommission.objects.update_or_create(
                affiliate=profile,
                defaults={
                    "is_active": custom_commission_data.get("is_active", True),
                    "commission_rate": rate,
                    "fixed_amount_per_referral": custom_commission_data.get("fixed_amount_per_referral"),
                    "notes": custom_commission_data.get("notes", "Set via CRM"),
                }
            )

            # Log custom commission
            log_event(
                request=request,
                user=user,
                category="affiliate",
                event_type="affiliate_custom_commission_set",
                metadata={
                    "rate": str(rate),
                    "fixed_amount": custom_commission_data.get("fixed_amount_per_referral")
                },
                description=f"Admin ({request.user.email}) set custom commission for affiliate"
            )

        # MAIN CREATE LOG
        log_event(
            request=request,
            user=user,
            category="affiliate",
            event_type="affiliate_created",
            metadata={
                "referral_code": profile.referral_code
            },
            description=f"Admin ({request.user.email}) created new affiliate user"
        )

        EmailService.send_affiliate_credentials(
            to_email=user.email,
            subject="WeFund | Welcome to the Affiliate Program",
            context={
                "username": user.username,
                "password": raw_password,
                "referral_code": profile.referral_code,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        )

        return user


    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get("request")
        before = {
            "first_name": instance.first_name,
            "last_name": instance.last_name,
            "email": instance.email,
            "phone": instance.phone,
        }

        profile_data = validated_data.pop("affiliate_profile", {})
        custom_commission_data = validated_data.pop("custom_commission", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        profile, _ = AffiliateProfile.objects.get_or_create(user=instance)

        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()

        # Custom commission change log
        if custom_commission_data:
            rate = custom_commission_data.get("commission_rate")
            if rate:
                try:
                    rate = Decimal(str(rate))
                except InvalidOperation:
                    raise serializers.ValidationError({"custom_commission": "Invalid commission rate format"})

            AffiliateCustomCommission.objects.update_or_create(
                affiliate=profile,
                defaults={
                    "is_active": custom_commission_data.get("is_active", True),
                    "commission_rate": rate,
                    "fixed_amount_per_referral": custom_commission_data.get("fixed_amount_per_referral"),
                    "notes": custom_commission_data.get("notes", "Updated via CRM"),
                }
            )

            log_event(
                request=request,
                user=instance,
                category="affiliate",
                event_type="affiliate_custom_commission_set",
                metadata={"commission_rate": str(rate)},
                description=f"Admin ({request.user.email}) updated affiliate custom commission"
            )

        # Manual tier override (if included in request)
        manual_tier_override_id = self.initial_data.get("manual_tier_override_id")
        if manual_tier_override_id is not None:
            old_tier = profile.manual_tier_override.name if profile.manual_tier_override else None

            if str(manual_tier_override_id).lower() in ["", "null", "none"]:
                profile.manual_tier_override = None
                profile.save(update_fields=["manual_tier_override"])

                log_event(
                    request=request,
                    user=instance,
                    category="affiliate",
                    event_type="affiliate_tier_override_removed",
                    metadata={"previous_tier": old_tier},
                    description=f"Admin ({request.user.email}) removed manual affiliate tier override"
                )
            else:
                new_tier = AffiliateCommissionTier.objects.get(id=manual_tier_override_id)
                profile.manual_tier_override = new_tier
                profile.save(update_fields=["manual_tier_override"])

                log_event(
                    request=request,
                    user=instance,
                    category="affiliate",
                    event_type="affiliate_tier_overridden",
                    metadata={"new_tier": new_tier.name},
                    description=f"Admin ({request.user.email}) manually assigned affiliate tier '{new_tier.name}'"
                )

        # Generic profile update log
        after = {
            "first_name": instance.first_name,
            "last_name": instance.last_name,
            "email": instance.email,
            "phone": instance.phone,
        }

        if before != after:
            log_event(
                request=request,
                user=instance,
                category="affiliate",
                event_type="affiliate_profile_updated",
                metadata={"before": before, "after": after},
                description=f"Admin ({request.user.email}) updated affiliate profile fields"
            )

        return instance
    
class GridChallengeEnrollmentSerializer(serializers.ModelSerializer):
    challenge_type = serializers.SerializerMethodField()
    account_number = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    end_date = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    credentials = serializers.SerializerMethodField()
    metrics = serializers.SerializerMethodField()
    enrollment_id = serializers.UUIDField(source='id', read_only=True)
    pap_checkout_url = serializers.SerializerMethodField()

    class Meta:
        model = ChallengeEnrollment
        fields = [
            "id",                # overridden to return mt5_account_id
            "enrollment_id",     # actual UUID for PAP checkout
            "challenge_type",
            "account_number",
            "account_size",
            "balance",
            "currency",
            "end_date",
            "status_label",
            "status",
            "payment_type",
            "progress",
            "credentials",
            "metrics",
            "pap_checkout_url",
        ]

    def get_id(self, obj):
        """Use MT5 account ID as the unique identifier."""
        return obj.mt5_account_id or str(obj.pk)

    def get_challenge_type(self, obj):
        """
        Example: "100K – 2 Step Phase 1"
        """
        account = f"{int(obj.account_size):,}"

        # Step type from Challenge model
        step_type = "1 Step" if obj.challenge.step_type == "1-step" else "2 Step"

        # Derive phase from enrollment status
        if obj.status == "awaiting_payment":
            # Use challenge name (e.g. "1 Step - Pro") instead of phase
            return f"{account} – {obj.challenge.name}"
        elif obj.status.startswith("phase_1"):
            phase = "Phase 1"
        elif obj.status.startswith("phase_2"):
            phase = "Phase 2"
        elif obj.status.startswith("live"):
            phase = "Live"
        else:
            phase = ""

        return f"{account} – {step_type} {phase}".strip()

    def get_account_number(self, obj):
        return f"#{obj.mt5_account_id}" if obj.mt5_account_id else "–"

    def get_balance(self, obj):
        if obj.mt5_account_id:
            balance = fetch_user_balance(obj.mt5_account_id)
            return f"${balance:,.2f}" if balance is not None else "–"
        return "–"

    def get_end_date(self, obj):
        # Failed challenges → updated_at
        if obj.status == "failed" and obj.updated_at:
            return obj.updated_at.strftime("%Y-%m-%d")

        # Completed / Passed → completed_date
        if obj.status in ["completed", "phase_1_passed", "phase_2_passed"] and obj.completed_date:
            return obj.completed_date.strftime("%Y-%m-%d")

        # Live / In Progress → No end date
        return "–"

    def get_status_label(self, obj):
        if obj.status == "payout_limit_reached":
            return "Payout Limit Reached"
        elif obj.status == "awaiting_payment":
            return "Payment Required"
        elif "in_progress" in obj.status:
            return "In Progress"
        elif "passed" in obj.status or obj.status == "completed":
            return "Passed"
        elif "failed" in obj.status:
            return "Failed"
        return "–"

    def get_progress(self, obj):
        """
        Compute % completed based on challenge rules:
          - 1-step = 10% target
          - 2-step Phase 1 = 8% target
          - 2-step Phase 2 = 5% target
        """
        balance = fetch_user_balance(obj.mt5_account_id) if obj.mt5_account_id else None
        if balance is None:
            return 0

        profit = float(balance) - float(obj.account_size)

        if obj.challenge.step_type == "1-step":
            target = float(obj.account_size) * 0.10
        else:
            if obj.status.startswith("phase_1"):
                target = float(obj.account_size) * 0.08
            elif obj.status.startswith("phase_2"):
                target = float(obj.account_size) * 0.05
            else:
                target = float(obj.account_size) * 0.05

        progress = (profit / target) * 100 if target > 0 else 0
        return round(max(0, min(progress, 100)), 2)

    def get_credentials(self, obj):
        """
        Return MT5 credentials for the client.
        """
        return {
            "broker": obj.broker_type or "mt5",
            "server": "NeolinCapitalMarket-Server",
            "login": obj.mt5_account_id or "",
            "password": obj.mt5_password or "",
            "investor_password": obj.mt5_investor_password or "",
        }

    def get_pap_checkout_url(self, obj):
        """
        For PAP enrollments in awaiting_payment status, return the checkout URL
        with variant and enrollment params so the website can create a completion order.
        """
        if obj.status != "awaiting_payment" or obj.payment_type != "pay_after_pass":
            return None

        # Find the variant for this enrollment's challenge product
        try:
            from django.conf import settings
            product = obj.challenge.website_products.filter(is_pay_after_pass=True, is_active=True).first()
            if not product:
                return None
            variant = product.variants.filter(
                account_size=int(obj.account_size),
                is_active=True,
            ).first()
            if not variant:
                return None
            website_url = getattr(settings, 'WEBSITE_URL', 'https://www.we-fund.com')
            url = f"{website_url}/checkout?variantId={variant.id}&enrollmentId={obj.id}"

            # Carry over discount code and referral code from the initial PAP order
            try:
                from urllib.parse import quote
                initial_order = getattr(obj.order, 'website_order', None)
                if initial_order:
                    if initial_order.discount_code:
                        url += f"&discountCode={quote(initial_order.discount_code.code)}"
                    if initial_order.referral_code:
                        url += f"&ref={quote(initial_order.referral_code)}"
            except Exception:
                pass

            return url
        except Exception:
            return None

    def get_metrics(self, obj):
        try:
            phase_type = obj.get_current_phase_type()
            phase = obj.challenge.phases.get(phase_type=phase_type)

            account_size = float(obj.account_size)

            # Pull current MT5 data (balance = equity in replication DB)
            current_balance = float(fetch_user_balance(obj.mt5_account_id) or account_size)
            current_equity = float(fetch_user_equity(obj.mt5_account_id) or account_size)

            # Limits
            max_daily_loss_amount = round(account_size * float(phase.max_daily_loss) / 100, 2)
            max_loss_amount = round(account_size * float(phase.max_loss) / 100, 2)
            profit_target_amount = (
                round(account_size * float(phase.profit_target) / 100, 2)
                if phase.profit_target else None
            )

            # Progress calculations
            profit_progress = None
            if profit_target_amount:
                profit_progress = round(
                    ((current_balance - account_size) / profit_target_amount) * 100, 2
                )

            max_loss_progress = (
                round(((account_size - current_equity) / max_loss_amount) * 100, 2)
                if max_loss_amount else None
            )

            max_daily_loss_progress = None  # (daily loss requires separate tracking)

            return {
                "currency": obj.currency,
                "trading_period": phase.trading_period,
                "min_trading_days": phase.min_trading_days,
                "max_daily_loss": {
                    "percent": float(phase.max_daily_loss),
                    "amount": max_daily_loss_amount,
                },
                "max_loss": {
                    "percent": float(phase.max_loss),
                    "amount": max_loss_amount,
                },
                "profit_target": {
                    "percent": float(phase.profit_target) if phase.profit_target is not None else None,
                    "amount": profit_target_amount,
                },
                "current_performance": {
                    "balance": current_balance,
                    "equity": current_equity,
                    "profit": round(current_balance - account_size, 2),
                    "profit_progress": profit_progress,
                    "max_loss_progress": max_loss_progress,
                    "max_daily_loss_progress": max_daily_loss_progress,
                }
            }
        except (ChallengePhase.DoesNotExist, ValueError):
            return None
        
class ChallengeEnrollmentCRUDSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.user.get_full_name", read_only=True)
    challenge_name = serializers.CharField(source="challenge.name", read_only=True)

    create_mt5_account = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = ChallengeEnrollment
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")

    def create(self, validated_data):
        request = self.context.get("request")
        create_mt5 = validated_data.pop("create_mt5_account", False)

        # Auto-detect PAP: if the challenge has a PAP website product, set payment_type
        if validated_data.get("payment_type", "standard") == "standard":
            challenge = validated_data.get("challenge")
            if challenge and challenge.website_products.filter(is_pay_after_pass=True).exists():
                validated_data["payment_type"] = "pay_after_pass"

        enrollment = super().create(validated_data)

        log_event(
        request=request,
        user=enrollment.client.user,  # Trader
        category="challenge",
        event_type="challenge_purchased",
        challenge_enrollment=enrollment,
        metadata={
            "admin_id": str(request.user.id),
            "admin_email": request.user.email,
            "challenge_id": str(enrollment.challenge.id),
            "account_size": float(enrollment.account_size),
        },
        description=f"Admin ({request.user.email}) created challenge enrollment: "
                    f"{enrollment.challenge.name} (${enrollment.account_size})"
        )

        if create_mt5:
            user = enrollment.client.user
            address_info = getattr(enrollment.client, "address_info", {}) or {}

            # Generate passwords
            mt5_password = generate_mt5_compliant_password()
            investor_password = generate_mt5_compliant_password()
            
            # --- CGM: Get group name dynamically ---
            mt5_group_name = settings.MT5_GROUP_NAME  # fallback
            current_phase_type = enrollment.get_current_phase_type()

            try:
                challenge_phase = ChallengePhase.objects.get(
                    challenge=enrollment.challenge,
                    phase_type=current_phase_type,
                )
                mapping = challenge_phase.group_mapping
                mt5_group_name = mapping.mt5_group
            except (ChallengePhase.DoesNotExist, ChallengePhaseGroupMapping.DoesNotExist):
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(
                    f"[CGM] No group mapping found for {enrollment.challenge} - {current_phase_type}, using default"
                )
                
            raw_address_info = getattr(enrollment.client, "address_info", {}) or {}
            if isinstance(raw_address_info, str):
                try:
                    address_info = json.loads(raw_address_info)
                except Exception:
                    address_info = {}
            else:
                address_info = raw_address_info    

            # Build payload for MT5 API
            payload = [{
                "index": 0,
                "agentAccount": settings.MT5_AGENT_ACCOUNT,
                "canTrade": True,
                "comment": f"{enrollment.get_current_phase_type()} - Enrollment {enrollment.id}",
                "group": {"name": mt5_group_name},
                "hasSendReportEnabled": True,
                "isEnabled": True,
                "leverage": settings.MT5_LEVERAGE,
                "password": mt5_password,
                "investorPassword": investor_password,
                "enable_change_password": True,
                "password_phone": user.phone or "",
                "status": "RE",
                "pltAccount": {
                    "taxes": settings.MT5_TAX_RATE,
                    "balance": float(enrollment.account_size),
                },
                "user": {
                    "address": {
                        "address": address_info.get("address_line_1", ""),
                        "city": address_info.get("city", ""),
                        "state": address_info.get("state", ""),
                        "zipcode": address_info.get("postcode", ""),
                        "country": address_info.get("country", ""),
                    },
                    "name": f"{user.first_name} {user.last_name}",
                    "email": user.email,
                    "phone": user.phone or "",
                }
            }]

            # Call MT5 API
            mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
            response = mt5_client.add_user(payload)

            account_id = (response.get("array") or [{}])[0].get("accountID")

            # Save credentials to enrollment
            enrollment.mt5_account_id = account_id
            enrollment.mt5_password = mt5_password
            enrollment.mt5_investor_password = investor_password
            enrollment.broker_type = "mt5"
            enrollment.save(update_fields=[
                "mt5_account_id", "mt5_password", "mt5_investor_password", "broker_type"
            ])

            log_event(
            request=request,
            user=user,  # Trader
            category="mt5",
            event_type="mt5_account_created",
            challenge_enrollment=enrollment,
            metadata={
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "mt5_account_id": str(account_id),
                "group_name": mt5_group_name,
            },
            description=f"Admin ({request.user.email}) created MT5 account {account_id} "
                        f"for challenge enrollment"
            )


        return enrollment
    
    def update(self, instance, validated_data):
        request = self.context.get("request")

        # Snapshot BEFORE
        before = {
            "status": instance.status,
            "account_size": float(instance.account_size),
            "currency": instance.currency,
            "broker_type": instance.broker_type,
            "mt5_account_id": instance.mt5_account_id,
            "mt5_password": "*****" if instance.mt5_password else None,
            "mt5_investor_password": "*****" if instance.mt5_investor_password else None,
            "start_date": str(instance.start_date),
            "completed_date": str(instance.completed_date) if instance.completed_date else None,
            "live_start_date": str(instance.live_start_date) if instance.live_start_date else None,
            "notes": instance.notes,
        }

        old_status = instance.status
        updated_instance = super().update(instance, validated_data)

        # Snapshot AFTER
        after = {
            "status": updated_instance.status,
            "account_size": float(updated_instance.account_size),
            "currency": updated_instance.currency,
            "broker_type": updated_instance.broker_type,
            "mt5_account_id": updated_instance.mt5_account_id,
            "mt5_password": "*****" if updated_instance.mt5_password else None,
            "mt5_investor_password": "*****" if updated_instance.mt5_investor_password else None,
            "start_date": str(updated_instance.start_date),
            "completed_date": str(updated_instance.completed_date) if updated_instance.completed_date else None,
            "live_start_date": str(updated_instance.live_start_date) if updated_instance.live_start_date else None,
            "notes": updated_instance.notes,
        }

        # Compare snapshots
        if before != after:
            # ✅ Log all changes
            log_event(
            request=request,
            user=updated_instance.client.user,
            category="challenge",
            event_type="challenge_phase_changed" if updated_instance.status != old_status else "challenge_config_updated",
            challenge_enrollment=updated_instance,
            metadata={
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "before": before,
                "after": after
            },
            description=(
                f"Admin ({request.user.email}) changed challenge phase from {old_status} → {updated_instance.status}"
                if updated_instance.status != old_status
                else f"Admin ({request.user.email}) updated challenge configuration"
            )
        )

        new_status = updated_instance.status  # safer than pulling from validated_data

        if new_status != old_status:
            balance = None
            if updated_instance.mt5_account_id:
                try:
                    from wefund.mt5_controller.utils import fetch_user_balance
                    balance = fetch_user_balance(updated_instance.mt5_account_id)
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(
                        f"Could not fetch balance for account {updated_instance.mt5_account_id}: {e}"
                    )

            EnrollmentEvent.objects.create(
                enrollment=updated_instance,
                event_type="status_changed",
                notes=f"Status manually changed from {old_status} to {new_status}",
                balance=balance,
                equity=balance,  # equity not available from MySQL
            )

        return updated_instance
        
class ClientDropdownSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ClientProfile
        fields = ["id", "full_name", "email"]

class ChallengeEnrollmentDropdownSerializer(serializers.ModelSerializer):
    trader_name = serializers.CharField(source="client.user.get_full_name", read_only=True)
    trader_email = serializers.EmailField(source="client.user.email", read_only=True)
    challenge_name = serializers.CharField(source="challenge.name", read_only=True)

    class Meta:
        model = ChallengeEnrollment
        fields = [
            "id",
            "mt5_account_id",
            "account_size",
            "status",
            "trader_name",
            "trader_email",
            "challenge_name",
        ]        
        
class EnrollmentEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)

    class Meta:
        model = EnrollmentEvent
        fields = [
            "id",
            "event_type",
            "event_type_display",
            "timestamp",
            "balance",
            "equity",
            "notes",
        ]
        
class ChallengePhaseGroupMappingSerializer(serializers.ModelSerializer):
    challenge_phase_name = serializers.CharField(
        source="challenge_phase.__str__", read_only=True
    )
    challenge_name = serializers.CharField(
        source="challenge_phase.challenge.name", read_only=True
    )
    step_type = serializers.CharField(
        source="challenge_phase.challenge.step_type", read_only=True
    )

    class Meta:
        model = ChallengePhaseGroupMapping
        fields = [
            "id",
            "challenge_phase",
            "challenge_phase_name",
            "challenge_name",
            "step_type",
            "mt5_group",
            "is_active",
        ]
        
class ChallengePhaseOptionSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()

    class Meta:
        model = ChallengePhase
        fields = ["id", "label"]

    def get_label(self, obj):
        # Example: "50k Evaluation - Phase 1"
        return f"{obj.challenge.name} - {obj.get_phase_type_display()}"

class EnrollmentTransitionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnrollmentTransitionLog
        fields = [
            "id",
            "from_status",
            "to_status",
            "reason",
            "meta",
            "created_at",
        ]
    
class MigrationCSVSerializer(serializers.Serializer):
    username = serializers.CharField()
    email = serializers.EmailField()
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, default='client')
    phone = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    profile_picture = serializers.URLField(required=False, allow_blank=True)
    
    # ClientProfile fields
    kyc_status = serializers.ChoiceField(choices=ClientProfile.KYC_STATUS_CHOICES, default='pending')
    referred_by_email = serializers.EmailField(required=False, allow_blank=True)

    # ChallengeEnrollment fields
    challenge_name = serializers.CharField()
    phase_status = serializers.ChoiceField(choices=ChallengeEnrollment.STATUS_CHOICES, default='phase_1_in_progress')
    account_size = serializers.DecimalField(max_digits=12, decimal_places=2, default=10000.00)
    currency = serializers.CharField(max_length=10, default='USD')
    
    # MT5 fields
    broker_type = serializers.CharField(required=False, allow_blank=True)
    mt5_account_id = serializers.CharField(required=False, allow_blank=True)
    mt5_password = serializers.CharField(required=False, allow_blank=True)
    mt5_investor_password = serializers.CharField(required=False, allow_blank=True)
    
    next_withdrawal_date = serializers.DateField(
    required=False,
    allow_null=True,
    input_formats=["%Y-%m-%d"]
    )

    
    # 🔑 Add this method inside the serializer
    def validate_kyc_status(self, value):
        if value:
            return value.strip().lower()
        return "pending"
    
class MigrationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MigrationLog
        fields = "__all__"
        
class ComplianceResponsibleTradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceResponsibleTrade
        fields = [
            "id", "ticket_id", "symbol", "direction", "lot_size",
            "open_time_utc", "close_time_utc", "pnl", "margin_at_open_pct",
            "reason_flagged", "breach_type"
        ]


class TraderPayoutComplianceAnalysisSerializer(serializers.ModelSerializer):
    responsible_trades = ComplianceResponsibleTradeSerializer(many=True, read_only=True)

    class Meta:
        model = TraderPayoutComplianceAnalysis
        fields = [
            "id",
            "payout",
            "version",
            "hard_breach_detected",
            "soft_breach_detected",
            "hard_breaches",
            "soft_breaches",
            "evidence",
            "metrics",
            "payout_adjustments",
            "responsible_trades",
            "created_at",
            "updated_at",
        ]
        
class ClientKYCSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.user.get_full_name", read_only=True)
    client_email = serializers.EmailField(source="client.user.email", read_only=True)
    operator_name = serializers.CharField(source="operator.get_full_name", read_only=True)

    class Meta:
        model = ClientKYC
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "session_id", "session_link")
        
class InternalNoteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    model = serializers.SerializerMethodField()

    content_type = serializers.CharField(write_only=True, required=False, allow_null=True)
    trader = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role='client'), required=False, allow_null=True)

    class Meta:
        model = InternalNote
        fields = [
            "id", "created_by", "created_by_name",
            "content_type", "model", "object_id",
            "trader",
            "note", "is_private", "category", "is_high_risk", "created_at",
        ]
        read_only_fields = ("id", "created_by", "created_by_name", "model", "created_at")

    def get_model(self, obj):
        if obj.content_type:
            return obj.content_type.model
        return None

    def create(self, validated_data):
        from django.contrib.contenttypes.models import ContentType

        model_name = validated_data.pop("content_type", None)
        if model_name:
            try:
                ct = ContentType.objects.get(model=model_name.lower())
            except ContentType.DoesNotExist:
                raise serializers.ValidationError({"content_type": f"Invalid model: {model_name}"})
            validated_data["content_type"] = ct
        else:
            validated_data["content_type"] = None

        # Auto-resolve trader from enrollment if not provided
        if not validated_data.get("trader") and model_name == "challengeenrollment" and validated_data.get("object_id"):
            try:
                enrollment = ChallengeEnrollment.objects.get(id=validated_data["object_id"])
                validated_data["trader"] = enrollment.client.user
            except ChallengeEnrollment.DoesNotExist:
                pass

        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
    
class PayoutSplitTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayoutSplitTier
        fields = "__all__"
        read_only_fields = ("id",)


class PayoutPolicySerializer(serializers.ModelSerializer):
    challenge_name = serializers.CharField(source="challenge.name", read_only=True)
    step_type = serializers.CharField(source="challenge.step_type", read_only=True)
    split_tiers = PayoutSplitTierSerializer(many=True, read_only=True)

    class Meta:
        model = PayoutPolicy
        fields = "__all__"
        read_only_fields = ("id", "challenge_name", "step_type")
        
class SuperUserProfileSerializer(serializers.ModelSerializer):
    profile_picture_file = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "phone", "profile_picture", "two_factor_enabled", "two_factor_method",
            "profile_picture_file",
        ]
        read_only_fields = ["id", "username", "email", "profile_picture"]

    def update(self, instance, validated_data):
        request = self.context.get("request")

        picture_file = validated_data.pop("profile_picture_file", None)

        before = {
            "first_name": instance.first_name,
            "last_name": instance.last_name,
            "phone": instance.phone,
            "two_factor_enabled": instance.two_factor_enabled,
            "two_factor_method": instance.two_factor_method,
        }

        # Normal field updates
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        profile_picture_changed = False

        # Handle profile picture upload
        if picture_file:
            filename = f"profiles/{instance.id}.jpg"
            profile_url = upload_to_bunnycdn(picture_file, filename)
            instance.profile_picture = profile_url
            profile_picture_changed = True

        instance.save()

        # --- Logging ---

        # Profile data change log
        after = {
            "first_name": instance.first_name,
            "last_name": instance.last_name,
            "phone": instance.phone,
            "two_factor_enabled": instance.two_factor_enabled,
            "two_factor_method": instance.two_factor_method,
        }

        if before != after:
            log_event(
                request=request,
                user=instance,
                category="admin",
                event_type="admin_profile_updated",
                metadata={"before": before, "after": after},
                description=f"Admin ({request.user.email}) updated their profile details."
            )

        # Profile picture change log
        if profile_picture_changed:
            log_event(
                request=request,
                user=instance,
                category="admin",
                event_type="admin_profile_picture_updated",
                metadata={"profile_picture_url": instance.profile_picture},
                description=f"Admin ({request.user.email}) updated their profile picture."
            )

        return instance
        
class SuperUserPasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_new_password(self, value):
        validate_password(value)  # ensures strong password rules
        return value

class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate_new_password(self, value):
        # Validate the new password strength using Django's password validators
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(e.messages)
        return value

    def validate(self, attrs):
        # Ensure the new password and confirm password match
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("New password and confirm password do not match.")
        return attrs        
    
class PeriodicTaskSerializer(serializers.ModelSerializer):
    schedule = serializers.SerializerMethodField()

    class Meta:
        model = PeriodicTask
        fields = ["id", "name", "task", "enabled", "schedule"]

    def get_schedule(self, obj):
        if obj.interval:
            return f"every {obj.interval.every} {obj.interval.period}"
        if obj.crontab:
            return f"cron: {obj.crontab}"
        return "unknown"
    
class MT5DailySnapshotSerializer(serializers.ModelSerializer):
    enrollment_id = serializers.UUIDField(source="enrollment.id", read_only=True)
    client_name = serializers.CharField(source="enrollment.client.user.get_full_name", read_only=True)
    challenge_name = serializers.CharField(source="enrollment.challenge.name", read_only=True)

    class Meta:
        model = MT5DailySnapshot
        fields = [
            "id", "date", "account_id",
            "enrollment_id", "client_name", "challenge_name",
            "starting_balance", "starting_equity",
            "ending_balance", "ending_equity",
            "today_profit", "total_profit",
            "today_max_drawdown", "total_max_drawdown",
            "daily_loss_used", "total_loss_used",
            "created_at", "updated_at",
        ]
        
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        # normalize email just in case
        email = value.strip()
        # Use case-insensitive lookup
        if not User.objects.filter(Q(email__iexact=email), role="client").exists():
            raise serializers.ValidationError("No client account found with this email.")
        return email
    
class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate(self, attrs):
        try:
            uid = urlsafe_base64_decode(attrs["uid"]).decode()
            user = User.objects.get(pk=uid, role="client")
        except Exception:
            raise serializers.ValidationError("Invalid user ID")

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError("Invalid or expired token")

        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user
    
class IPSummarySerializer(serializers.Serializer):
    ip = serializers.CharField()
    accounts_count = serializers.IntegerField()
    
class AccountByIPSerializer(serializers.Serializer):
    login = serializers.CharField()
    name = serializers.CharField()
    email = serializers.CharField()
    phone = serializers.CharField()
    status = serializers.CharField()
    group = serializers.CharField()
    balance = serializers.DecimalField(max_digits=20, decimal_places=2)
    city = serializers.CharField()
    country = serializers.CharField()
    created = serializers.DateTimeField()
    enrollment_id = serializers.UUIDField(allow_null=True)
    
class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, min_length=8,
        help_text="Password must be at least 8 characters."
    )
    rbac_role_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    rbac_role = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "status", "phone", "date_of_birth", "profile_picture",
            "two_factor_enabled", "two_factor_method", "password",
            "rbac_role_id", "rbac_role",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_rbac_role(self, obj):
        if obj.rbac_role:
            return {
                "id": str(obj.rbac_role.id),
                "name": obj.rbac_role.name,
                "slug": obj.rbac_role.slug,
            }
        return None

    def validate_role(self, value):
        if value not in ["admin", "support", "risk", "content_creator", "discord_manager"]:
            raise serializers.ValidationError("Only admin, support, or risk roles are allowed.")
        return value

    def _apply_rbac_role(self, user, validated_data):
        from wefund.rbac_models import Role
        rbac_role_id = validated_data.pop("rbac_role_id", None)
        if rbac_role_id is not None:
            try:
                role = Role.objects.get(pk=rbac_role_id)
                user.rbac_role = role
                # Sync legacy role field
                user.role = role.slug if role.slug in dict(User.ROLE_CHOICES) else user.role
                # Only admin role gets is_superuser
                user.is_superuser = (role.slug == "admin")
            except Role.DoesNotExist:
                pass
        elif rbac_role_id is None and "rbac_role_id" in self.initial_data:
            user.rbac_role = None

    def create(self, validated_data):
        request = self.context.get("request")
        password = validated_data.pop("password")
        rbac_role_id = validated_data.pop("rbac_role_id", None)

        # Determine is_superuser based on rbac_role
        is_superuser = True  # default for backward compat
        if rbac_role_id is not None:
            from wefund.rbac_models import Role
            try:
                role_obj = Role.objects.get(pk=rbac_role_id)
                is_superuser = (role_obj.slug == "admin")
            except Role.DoesNotExist:
                pass

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email"),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=validated_data["role"],
            status=validated_data.get("status", "active"),
            phone=validated_data.get("phone"),
            date_of_birth=validated_data.get("date_of_birth"),
            profile_picture=validated_data.get("profile_picture"),
            two_factor_enabled=validated_data.get("two_factor_enabled", False),
            two_factor_method=validated_data.get("two_factor_method"),
            is_staff=True,
            is_superuser=is_superuser,
        )
        user.set_password(password)

        # Assign RBAC role
        if rbac_role_id is not None:
            from wefund.rbac_models import Role
            try:
                user.rbac_role = Role.objects.get(pk=rbac_role_id)
            except Role.DoesNotExist:
                pass

        user.save()

        # Log event
        log_event(
            request=request,
            user=user,
            category="admin",
            event_type="admin_user_created",
            metadata={
                "created_by": request.user.email,
                "role": user.role,
                "email": user.email,
            },
            description=f"Admin ({request.user.email}) created a new admin-level user ({user.email})."
        )

        return user

    def update(self, instance, validated_data):
        request = self.context.get("request")

        before = {
            "first_name": instance.first_name,
            "last_name": instance.last_name,
            "email": instance.email,
            "phone": instance.phone,
            "role": instance.role,
            "status": instance.status,
            "two_factor_enabled": instance.two_factor_enabled,
            "two_factor_method": instance.two_factor_method,
        }

        password = validated_data.pop("password", None)
        self._apply_rbac_role(instance, validated_data)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()

        after = {
            "first_name": instance.first_name,
            "last_name": instance.last_name,
            "email": instance.email,
            "phone": instance.phone,
            "role": instance.role,
            "status": instance.status,
            "two_factor_enabled": instance.two_factor_enabled,
            "two_factor_method": instance.two_factor_method,
        }

        if before != after or password:
            log_event(
                request=request,
                user=instance,
                category="admin",
                event_type="admin_user_updated",
                metadata={"before": before, "after": after},
                description=f"Admin ({request.user.email}) updated admin user ({instance.email})."
            )

        return instance


class CertificateTemplateSerializer(serializers.ModelSerializer):
    available_images = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CertificateTemplate
        fields = [
            "id",
            "key",
            "title",
            "background_file",
            "name_x",
            "name_y",
            "name_font_size",
            "date_x",
            "date_y",
            "date_font_size",
            "certificate_type",       # ✅ new
            "profitshare_x",          # ✅ new
            "profitshare_y",          # ✅ new
            "profitshare_font_size",  # ✅ new
            "is_active",
            "available_images",
        ]

    def get_available_images(self, obj):
        return list_available_certificate_images()

class CertificateManualCreateSerializer(serializers.Serializer):
    client_email = serializers.EmailField()
    mt5_account_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    template_key = serializers.ChoiceField(choices=[
        ("live_account", "Live Account"),
        ("phase_one", "Phase One"),
        ("phase_two", "Phase Two"),
        ("funded", "Funded"),
    ])
    title = serializers.CharField(max_length=255)

    def validate_client_email(self, value):
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email not found.")
        if user.role != "client":
            raise serializers.ValidationError("Selected user is not a client.")
        return user

    def validate_mt5_account_id(self, value):
        if value:
            try:
                return ChallengeEnrollment.objects.get(mt5_account_id=value)
            except ChallengeEnrollment.DoesNotExist:
                raise serializers.ValidationError("No challenge enrollment found for this MT5 account.")
        return None

    def create(self, validated_data):
        user = validated_data["client_email"]  # this is actually the User instance from validate_client_email
        enrollment = validated_data.get("mt5_account_id")  # this is the ChallengeEnrollment instance
        template_key = validated_data["template_key"]
        title = validated_data["title"]

        # Generate & upload to BunnyCDN
        result = generate_and_upload_certificate(
            template_key=template_key,
            trader_name=user.get_full_name() or user.username,
            issue_date=timezone.now(),
        )

        cert = Certificate.objects.create(
            user=user,
            certificate_type="phase_pass",
            title=title,
            enrollment=enrollment,
            image_url=result.get("image_url"),
            pdf_url=result.get("pdf_url"),
            metadata={"generated_by": "manual_api", "template": template_key},
        )
        return cert

class PayoutCertificateManualCreateSerializer(serializers.Serializer):
    client_email = serializers.EmailField()
    payout_id = serializers.UUIDField(required=False, allow_null=True)
    title = serializers.CharField(max_length=255)
    profit_share = serializers.FloatField(required=False, allow_null=True)

    def validate_client_email(self, value):
        print(f"[DEBUG] Validating client_email: {value}")
        try:
            user = User.objects.get(email=value)
            print(f"[DEBUG] Found user: id={user.id}, role={user.role}")
        except User.DoesNotExist:
            print(f"[DEBUG] User with email {value} not found")
            raise serializers.ValidationError("User with this email not found.")
        if user.role != "client":
            print(f"[DEBUG] User {user.id} is not a client")
            raise serializers.ValidationError("Selected user is not a client.")
        return user

    def validate_payout_id(self, value):
        print(f"[DEBUG] Validating payout_id: {value}")
        if value:
            try:
                payout = TraderPayout.objects.get(pk=value)
                print(f"[DEBUG] Found TraderPayout: id={payout.id}")
                return payout
            except TraderPayout.DoesNotExist:
                print(f"[DEBUG] TraderPayout with id={value} not found")
                raise serializers.ValidationError("TraderPayout not found.")
        return None

    def create(self, validated_data):
        print(f"[DEBUG] Creating payout certificate with data: {validated_data}")
        user = validated_data["client_email"]  # resolved to User in validate
        payout = validated_data.get("payout_id")
        title = validated_data["title"]
        profit_share = validated_data.get("profit_share")

        profit_share_text = f"${profit_share}" if profit_share else None
        print(f"[DEBUG] Profit share text: {profit_share_text}")

        result = generate_and_upload_payout_certificate(
            trader_name=user.get_full_name() or user.username,
            profit_share_text=profit_share_text,
            issue_date=timezone.now(),
        )
        print(f"[DEBUG] Certificate generation result: {result}")

        cert = Certificate.objects.create(
            user=user,
            certificate_type="payout",
            title=title,
            payout=payout,
            image_url=result.get("image_url"),
            pdf_url=result.get("pdf_url"),
            metadata={"generated_by": "manual_api", "template": "payout"},
        )
        print(f"[DEBUG] Certificate created: id={cert.id}, user={user.id}")
        return cert  


# ActivityLog Serializers
class ActivityLogSerializer(serializers.ModelSerializer):
    """
    Serializer for ActivityLog model - used for listing logs with trader info
    """
    actor_name = serializers.SerializerMethodField()
    content_object_type = serializers.SerializerMethodField()
    content_object_id = serializers.SerializerMethodField()
    content_object_name = serializers.SerializerMethodField()
    trader_name = serializers.SerializerMethodField()
    trader_email = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'actor', 'actor_name', 'action_type', 'content_type',
            'object_id', 'content_object_type', 'content_object_id',
            'content_object_name', 'details', 'trader_name', 'trader_email',
            'created_at'
        ]
        read_only_fields = fields

    # ------------------------------
    # Utility helper for safe parsing
    # ------------------------------
    def _safe_address_info(self, address_info):
        """
        Ensure address_info is always a dict.
        Handles JSON string or dict gracefully.
        """
        if not address_info:
            return {}
        if isinstance(address_info, dict):
            return address_info
        if isinstance(address_info, str):
            try:
                return json.loads(address_info)
            except Exception:
                return {}
        return {}

    # ------------------------------
    # Actor / Content Object Methods
    # ------------------------------
    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.username
        return "System"

    def get_content_object_type(self, obj):
        return obj.content_type.model if obj.content_type else None

    def get_content_object_id(self, obj):
        return str(obj.object_id)

    def get_content_object_name(self, obj):
        if obj.content_object:
            target = obj.content_object
            for attr in ['get_full_name', 'username', 'name', 'title']:
                if hasattr(target, attr):
                    val = getattr(target, attr)
                    return val() if callable(val) else val
            return str(target)
        return None

    # ------------------------------
    # Trader Info Methods
    # ------------------------------
    def get_trader_name(self, obj):
        """
        Retrieve trader name whether the content object links to a User or ClientProfile.
        Handles both dict and JSON-string address_info.
        """
        content = obj.content_object
        if not content:
            return None

        client = getattr(content, 'client', None)

        # Case 1: Direct ClientProfile
        if isinstance(content, ClientProfile):
            client_profile = content
            user = client_profile.user
            info = self._safe_address_info(client_profile.address_info)
            first = info.get("first_name") or ""
            last = info.get("last_name") or ""
            return (f"{first} {last}".strip() or user.get_full_name() or user.username)

        # Case 2: content.client is a ClientProfile
        if isinstance(client, ClientProfile):
            user = client.user
            info = self._safe_address_info(client.address_info)
            first = info.get("first_name") or ""
            last = info.get("last_name") or ""
            return (f"{first} {last}".strip() or user.get_full_name() or user.username)

        # Case 3: content.client is a User
        if client and hasattr(client, 'client_profile'):
            info = self._safe_address_info(client.client_profile.address_info)
            first = info.get("first_name") or ""
            last = info.get("last_name") or ""
            return (f"{first} {last}".strip() or client.get_full_name() or client.username)

        return None

    def get_trader_email(self, obj):
        """
        Retrieve trader email from User or ClientProfile.
        """
        content = obj.content_object
        if not content:
            return None

        client = getattr(content, 'client', None)

        if isinstance(content, ClientProfile):
            return content.user.email

        if isinstance(client, ClientProfile):
            return client.user.email

        if client and hasattr(client, 'email'):
            return client.email

        return None

class ActivityLogDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for ActivityLog model - used for detailed log information
    """
    actor_name = serializers.SerializerMethodField()
    actor_email = serializers.SerializerMethodField()
    actor_role = serializers.SerializerMethodField()
    content_object_type = serializers.SerializerMethodField()
    content_object_id = serializers.SerializerMethodField()
    content_object_name = serializers.SerializerMethodField()
    content_object_details = serializers.SerializerMethodField()
    action_type_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'actor', 'actor_name', 'actor_email', 'actor_role',
            'action_type', 'action_type_display', 'content_type', 
            'object_id', 'content_object_type', 'content_object_id', 
            'content_object_name', 'content_object_details', 'details', 'created_at'
        ]
        read_only_fields = fields
    
    def get_actor_name(self, obj):
        """Get the name of the actor (user who performed the action)"""
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.username
        return "System"
    
    def get_actor_email(self, obj):
        """Get the email of the actor"""
        if obj.actor:
            return obj.actor.email
        return None
    
    def get_actor_role(self, obj):
        """Get the role of the actor"""
        if obj.actor:
            return obj.actor.role
        return None
    
    def get_content_object_type(self, obj):
        """Get the type of the content object"""
        if obj.content_type:
            return obj.content_type.model
        return None
    
    def get_content_object_id(self, obj):
        """Get the ID of the content object"""
        return str(obj.object_id)
    
    def get_content_object_name(self, obj):
        """Get a human-readable name for the content object"""
        if obj.content_object:
            # Try to get a meaningful name based on the object type
            if hasattr(obj.content_object, 'get_full_name'):
                return obj.content_object.get_full_name()
            elif hasattr(obj.content_object, 'username'):
                return obj.content_object.username
            elif hasattr(obj.content_object, 'name'):
                return obj.content_object.name
            elif hasattr(obj.content_object, 'title'):
                return obj.content_object.title
            else:
                return str(obj.content_object)
        return None
    
    def get_content_object_details(self, obj):
        """Get additional details about the content object"""
        if obj.content_object:
            details = {}
            # Add relevant fields based on object type
            if hasattr(obj.content_object, 'status'):
                details['status'] = obj.content_object.status
            if hasattr(obj.content_object, 'email'):
                details['email'] = obj.content_object.email
            if hasattr(obj.content_object, 'role'):
                details['role'] = obj.content_object.role
            if hasattr(obj.content_object, 'account_size'):
                details['account_size'] = str(obj.content_object.account_size)
            if hasattr(obj.content_object, 'currency'):
                details['currency'] = obj.content_object.currency
            return details
        return None
    
    def get_action_type_display(self, obj):
        """Get the display name for the action type"""
        return obj.get_action_type_display()


class TopEarningTraderSerializer(serializers.Serializer):
    """Serializer for top earning traders dashboard"""
    trader_id = serializers.UUIDField(source='id', read_only=True)
    trader_name = serializers.SerializerMethodField()
    trader_email = serializers.EmailField(source='email', read_only=True)
    
    # Revenue (how much they spent on challenges)
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Payouts (amount + count)
    accepted_payout_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    accepted_payout_count = serializers.IntegerField(read_only=True)
    has_payouts = serializers.SerializerMethodField()
    
    # Accounts breakdown
    active_accounts = serializers.IntegerField(read_only=True)
    funded_accounts = serializers.IntegerField(read_only=True)
    total_accounts = serializers.IntegerField(read_only=True)
    breached_accounts = serializers.IntegerField(read_only=True)
    
    def get_trader_name(self, obj):
        return obj.get_full_name() or obj.username
    
    def get_has_payouts(self, obj):
        """Returns true if trader has received any payouts"""
        return obj.accepted_payout_count > 0

class MT5MigrationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MT5MigrationLog
        fields = [
            "id",
            "old_mt5_id",
            "new_mt5_id",
            "client_email",
            "generate_password",
            "main_password",
            "investor_password",
            "status",
            "remarks",
            "error_message",
            "processed_at",
        ]

class RewardTaskSerializer(serializers.ModelSerializer):
    # ----- Example Image -----
    example_image_file = serializers.FileField(required=False, write_only=True)
    remove_example_image = serializers.BooleanField(required=False, write_only=True, default=False)
    example_image = serializers.URLField(read_only=True)

    # ----- Feature Image -----
    feature_image_file = serializers.FileField(required=False, write_only=True)
    remove_feature_image = serializers.BooleanField(required=False, write_only=True, default=False)
    feature_image = serializers.URLField(read_only=True)

    # ---- Expiration / Scheduling (NEW) ----
    is_expired = serializers.SerializerMethodField(read_only=True)
    is_scheduled = serializers.SerializerMethodField(read_only=True)
    is_available = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = RewardTask
        fields = [
            "id",
            "title",
            "description",
            "instructions",
            "url",
            "requires_url_submission",

            # Feature Image
            "feature_image",
            "feature_image_file",
            "remove_feature_image",

            # Example Image
            "example_image",
            "example_image_file",
            "remove_example_image",

            # Expiration / Scheduling
            "starts_at",
            "expires_at",
            "expire_action",
            "is_scheduled",
            "is_expired",
            "is_available",

            "reward_amount",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "example_image",
            "feature_image",
            "is_scheduled",
            "is_expired",
            "is_available",
        ]

    def validate(self, attrs):
        """
        Basic sanity checks:
        - if both provided, expires_at must be after starts_at
        """
        starts_at = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        expires_at = attrs.get("expires_at", getattr(self.instance, "expires_at", None))

        if starts_at and expires_at and expires_at <= starts_at:
            raise serializers.ValidationError({
                "expires_at": "expires_at must be later than starts_at."
            })
        return attrs

    def get_is_expired(self, obj):
        return bool(obj.expires_at and timezone.now() >= obj.expires_at)

    def get_is_scheduled(self, obj):
        return bool(obj.starts_at and timezone.now() < obj.starts_at)

    def get_is_available(self, obj):
        # Uses your model helpers if you added them; otherwise compute safely.
        if hasattr(obj, "is_available"):
            return bool(obj.is_available)
        if obj.status != "active":
            return False
        if obj.starts_at and timezone.now() < obj.starts_at:
            return False
        if obj.expires_at and timezone.now() >= obj.expires_at:
            return False
        return True

    def create(self, validated_data):
        # REMOVE write-only fields
        for field in [
            "example_image_file",
            "remove_example_image",
            "feature_image_file",
            "remove_feature_image",
        ]:
            validated_data.pop(field, None)

        return super().create(validated_data)

    def update(self, instance, validated_data):
        # REMOVE write-only fields
        for field in [
            "example_image_file",
            "remove_example_image",
            "feature_image_file",
            "remove_feature_image",
        ]:
            validated_data.pop(field, None)

        return super().update(instance, validated_data)


class RewardSubmissionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)

    class Meta:
        model = RewardSubmission
        fields = '__all__'
        read_only_fields = [
            'id', 'status', 'reviewed_by', 'reviewed_at', 'created_at',
            'user', 'reward_amount'
        ]

from django.utils import timezone
from rest_framework import serializers

class RedeemItemSerializer(serializers.ModelSerializer):
    """
    Serializer for RedeemItem — supports BunnyCDN image upload + expiration fields.
    """
    image_file = serializers.FileField(write_only=True, required=False)
    remove_image = serializers.BooleanField(write_only=True, required=False, default=False)

    # Expiration computed flags (read-only)
    is_expired = serializers.SerializerMethodField(read_only=True)
    is_scheduled = serializers.SerializerMethodField(read_only=True)
    is_available = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = RedeemItem
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "image_url",
            "is_expired",
            "is_scheduled",
            "is_available",
        ]

    def validate(self, attrs):
        # Validate starts_at/expires_at relation
        starts_at = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        expires_at = attrs.get("expires_at", getattr(self.instance, "expires_at", None))

        if starts_at and expires_at and expires_at <= starts_at:
            raise serializers.ValidationError({"expires_at": "expires_at must be later than starts_at."})

        return attrs

    def get_is_expired(self, obj):
        return bool(obj.expires_at and timezone.now() >= obj.expires_at)

    def get_is_scheduled(self, obj):
        return bool(obj.starts_at and timezone.now() < obj.starts_at)

    def get_is_available(self, obj):
        # Prefer model helper if present
        if hasattr(obj, "is_available"):
            return bool(obj.is_available)
        if getattr(obj, "is_archived", False):
            return False
        if not obj.is_active:
            return False
        if obj.starts_at and timezone.now() < obj.starts_at:
            return False
        if obj.expires_at and timezone.now() >= obj.expires_at:
            return False
        return True

    def create(self, validated_data):
        image_file = validated_data.pop("image_file", None)
        validated_data.pop("remove_image", None)

        instance = super().create(validated_data)

        if image_file:
            filename = f"redeem_items/{instance.id}/{image_file.name}"
            image_url = upload_to_bunnycdn(image_file, filename)
            instance.image_url = image_url
            instance.save(update_fields=["image_url", "updated_at"])

        return instance

    def update(self, instance, validated_data):
        image_file = validated_data.pop("image_file", None)
        remove_image = validated_data.pop("remove_image", False)

        instance = super().update(instance, validated_data)

        if remove_image:
            instance.image_url = None
            instance.save(update_fields=["image_url", "updated_at"])

        if image_file:
            filename = f"redeem_items/{instance.id}/{image_file.name}"
            image_url = upload_to_bunnycdn(image_file, filename)
            instance.image_url = image_url
            instance.save(update_fields=["image_url", "updated_at"])

        # Optional: apply expiration immediately if someone sets expires_at in the past
        if hasattr(instance, "apply_expiration_if_needed"):
            instance.apply_expiration_if_needed(save=True)

        return instance

class WeCoinTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeCoinTransaction
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'wallet']

class RedemptionSerializer(serializers.ModelSerializer):
    item_title = serializers.CharField(source='item.title', read_only=True)
    item_category = serializers.CharField(source='item.category', read_only=True)

    class Meta:
        model = Redemption
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'reviewed_at', 'reviewed_by']

class WeCoinWalletSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    transactions = WeCoinTransactionSerializer(many=True, read_only=True)
    redemptions = RedemptionSerializer(source='user.redemptions', many=True, read_only=True)

    class Meta:
        model = WeCoinWallet
        fields = [
            'id', 'user', 'user_username', 'user_email', 'balance',
            'transactions', 'redemptions'
        ]
        read_only_fields = ['id', 'user', 'user_username', 'user_email']

class ClientRewardSubmissionSerializer(serializers.ModelSerializer):
    """
    Serializer for client-submitted reward tasks.
    Supports proof image upload (via BunnyCDN).
    """
    proof_file = serializers.FileField(write_only=True, required=False)

    class Meta:
        model = RewardSubmission
        fields = [
            'id', 'task', 'notes',
            'proof_url',          # URL provided by the user
            'proof_file',         # file uploaded by user
            'proof_image',        # CDN URL (read-only)
            'status', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'proof_image']

    def validate(self, data):
        user = self.context['request'].user
        task = data.get('task')

        # Ensure task is active
        if task.status != 'active':
            raise serializers.ValidationError("This task is not active.")

        # Prevent duplicates unless declined
        existing = RewardSubmission.objects.filter(
            user=user, task=task
        ).exclude(status='declined')

        if existing.exists():
            raise serializers.ValidationError("You have already submitted this task.")

        # 🔥 REQUIRE URL IF THE TASK DEMANDS IT
        if task.requires_url_submission and not data.get("proof_url"):
            raise serializers.ValidationError("This task requires submitting a URL as proof.")

        return data

    def create(self, validated_data):
        proof_file = validated_data.pop('proof_file', None)
        request = self.context.get('request')
        user = request.user
        task = validated_data['task']

        reward_amount = task.reward_amount or 0

        submission = RewardSubmission.objects.create(
            user=user,
            status='pending',
            reward_amount=reward_amount,
            **validated_data
        )

        # 🔥 If a screenshot file is uploaded → upload to BunnyCDN
        if proof_file:
            filename = f"reward_submissions/{user.id}/{submission.id}/{proof_file.name}"
            cdn_url = upload_to_bunnycdn(proof_file, filename)

            submission.proof_image = cdn_url
            submission.save(update_fields=['proof_image'])

        log_event(
            request=request,
            user=user,
            category="wecoins",
            event_type="wecoins_task_submitted",
            metadata={
                "submission_id": str(submission.id),
                "task_id": str(task.id),
                "task_title": task.title,
                "reward_amount": str(reward_amount),
            },
            description=f"User ({user.email}) submitted task '{task.title}' for review."
        )

        return submission

class ClientRedeemItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RedeemItem
        fields = [
            'id', 'title', 'description', 'category',
            'required_wecoins', 'stock_quantity', 'image_url',
        ]

class ClientRedemptionSerializer(serializers.ModelSerializer):
    item_title = serializers.CharField(source='item.title', read_only=True)
    item_required_wecoins = serializers.DecimalField(
        source='item.required_wecoins', max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = Redemption
        fields = [
            'id', 'item', 'item_title', 'item_required_wecoins',
            'status', 'admin_comment', 'delivery_data', 'created_at'
        ]
        read_only_fields = [
            'id', 'status', 'admin_comment', 'delivery_data', 'created_at',
            'item_title', 'item_required_wecoins'
        ]

    def validate(self, data):
        user = self.context['request'].user
        item = data.get('item')

        if not item.is_active:
            raise serializers.ValidationError("This item is not currently available.")

        wallet = getattr(user, 'wecoin_wallet', None)
        if not wallet or wallet.balance < item.required_wecoins:
            raise serializers.ValidationError("Insufficient WeCoins to redeem this item.")

        # Optional stock check
        if item.stock_quantity and item.stock_quantity <= 0:
            raise serializers.ValidationError("This item is out of stock.")

        # Prevent multiple active (pending/approved) redemptions of same item
        active_existing = Redemption.objects.filter(
            user=user, item=item, status__in=['pending', 'approved']
        )
        if active_existing.exists():
            raise serializers.ValidationError("You already have an active redemption for this item.")

        # Per-user lifetime redemption limit (0 = unlimited)
        if item.max_per_user > 0:
            redeemed_count = Redemption.objects.filter(
                user=user, item=item
            ).exclude(status='declined').count()
            if redeemed_count >= item.max_per_user:
                raise serializers.ValidationError(
                    f"You have reached the maximum redemption limit ({item.max_per_user}) for this item."
                )

        return data

    def create(self, validated_data):
        request = self.context.get("request")
        user = self.context['request'].user
        item = validated_data['item']
        wallet = user.wecoin_wallet
        cost = item.required_wecoins

        # Deduct coins and create redemption atomically
        with transaction.atomic():
            wallet.balance -= item.required_wecoins
            wallet.save()

            redemption = Redemption.objects.create(
                user=user,
                item=item,
                status='pending'
            )

            # Reduce stock (if limited)
            if item.stock_quantity > 0:
                item.stock_quantity -= 1
                item.save()

            # Log transaction
            WeCoinTransaction.objects.create(
                wallet=wallet,
                type='spend',
                amount=item.required_wecoins,
                description=f"Redeemed item: {item.title}"
            )

            log_event(
            request=request,
            user=user,
            category="wecoins",
            event_type="wecoins_redeemed",
            metadata={
                "redemption_id": str(redemption.id),
                "item_id": str(item.id),
                "item_title": item.title,
                "cost": str(cost),
                "new_balance": str(wallet.balance),
            },
            description=f"User ({user.email}) redeemed '{item.title}' for {cost} WeCoins."
        )

        return redemption

class ClientRedemptionHistorySerializer(serializers.ModelSerializer):
    item_title = serializers.CharField(source='item.title', read_only=True)
    item_category = serializers.CharField(source='item.category', read_only=True)
    item_required_wecoins = serializers.DecimalField(
        source='item.required_wecoins', max_digits=12, decimal_places=2, read_only=True
    )
    item_image = serializers.URLField(source='item.image_url', read_only=True, allow_null=True)

    class Meta:
        model = Redemption
        fields = [
            'id',
            'item',
            'item_title',
            'item_category',
            'item_required_wecoins',
            'item_image',
            'status',
            'admin_comment',
            'delivery_data',
            'created_at',
            'reviewed_at'
        ]
        read_only_fields = fields

class ClientWeCoinTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeCoinTransaction
        fields = ['id', 'type', 'amount', 'description', 'created_at']
        read_only_fields = fields


class ClientWeCoinWalletSerializer(serializers.ModelSerializer):
    transactions = ClientWeCoinTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = WeCoinWallet
        fields = ['id', 'balance', 'transactions']
        read_only_fields = fields


# ---------------------------------------------------------------------
# Reset Token Serializers
# ---------------------------------------------------------------------

class ResetTokenConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResetTokenConfig
        fields = ['is_enabled', 'max_resets_per_enrollment']


class EligibleEnrollmentSerializer(serializers.Serializer):
    """Read-only serializer for showing eligible enrollments with pricing."""
    id = serializers.UUIDField()
    account_size = serializers.DecimalField(max_digits=12, decimal_places=2)
    mt5_account_id = serializers.CharField()
    challenge_name = serializers.SerializerMethodField()
    wecoins_cost = serializers.SerializerMethodField()
    status = serializers.CharField()
    has_pending_reset = serializers.SerializerMethodField()
    resets_used = serializers.SerializerMethodField()
    max_resets = serializers.SerializerMethodField()

    def get_challenge_name(self, obj):
        return obj.challenge.name

    def get_wecoins_cost(self, obj):
        return ResetTokenConfig.get_price(obj.account_size)

    def get_has_pending_reset(self, obj):
        return obj.reset_tokens.filter(status__in=['pending', 'approved']).exists()

    def get_resets_used(self, obj):
        return obj.reset_tokens.filter(status='used').count()

    def get_max_resets(self, obj):
        return ResetTokenConfig.get_config().max_resets_per_enrollment


class ClientResetTokenSerializer(serializers.Serializer):
    """Handles purchasing a reset token — validates and deducts WeCoins."""
    enrollment = serializers.PrimaryKeyRelatedField(
        queryset=ChallengeEnrollment.objects.all()
    )

    def validate_enrollment(self, enrollment):
        user = self.context['request'].user
        config = ResetTokenConfig.get_config()

        if not config.is_enabled:
            raise serializers.ValidationError("Reset tokens are currently disabled.")
        if enrollment.client.user != user:
            raise serializers.ValidationError("This enrollment does not belong to you.")
        if enrollment.challenge.step_type != '1-step':
            raise serializers.ValidationError("Reset tokens are only available for 1-Step challenges.")
        if enrollment.status != 'live_in_progress':
            raise serializers.ValidationError("Reset tokens are only available for live accounts.")
        price = ResetTokenConfig.get_price(enrollment.account_size)
        if price is None:
            raise serializers.ValidationError("No reset token pricing available for this account size.")
        if enrollment.reset_tokens.filter(status__in=['pending', 'approved']).exists():
            raise serializers.ValidationError("This enrollment already has a pending or approved reset token.")
        if config.max_resets_per_enrollment > 0:
            used_count = enrollment.reset_tokens.filter(status='used').count()
            if used_count >= config.max_resets_per_enrollment:
                raise serializers.ValidationError(
                    f"Maximum resets reached ({config.max_resets_per_enrollment}) for this enrollment."
                )
        return enrollment

    def validate(self, attrs):
        user = self.context['request'].user
        enrollment = attrs['enrollment']
        cost = ResetTokenConfig.get_price(enrollment.account_size)

        wallet, _ = WeCoinWallet.objects.get_or_create(user=user)
        if wallet.balance < cost:
            raise serializers.ValidationError(
                f"Insufficient WeCoins. Required: {cost}, Available: {wallet.balance}"
            )
        return attrs

    def create(self, validated_data):
        from wefund.event_logger import log_event
        request = self.context['request']
        user = request.user
        enrollment = validated_data['enrollment']
        cost = ResetTokenConfig.get_price(enrollment.account_size)
        wallet, _ = WeCoinWallet.objects.get_or_create(user=user)

        with transaction.atomic():
            wallet.balance -= cost
            wallet.save()

            token = ResetToken.objects.create(
                user=user,
                enrollment=enrollment,
                wecoins_cost=cost,
                status='pending'
            )

            WeCoinTransaction.objects.create(
                wallet=wallet,
                type='spend',
                amount=cost,
                description=f"Reset token: {enrollment.challenge.name} {int(enrollment.account_size / 1000)}k"
            )

            log_event(
                request=request,
                user=user,
                category="wecoins",
                event_type="reset_token_purchased",
                challenge_enrollment=enrollment,
                metadata={
                    "reset_token_id": str(token.id),
                    "enrollment_id": str(enrollment.id),
                    "account_size": str(enrollment.account_size),
                    "cost": str(cost),
                    "new_balance": str(wallet.balance),
                },
                description=f"User ({user.email}) purchased reset token for {int(enrollment.account_size / 1000)}k account ({cost} WeCoins)."
            )

        return token


class ResetTokenReadSerializer(serializers.ModelSerializer):
    """Read serializer for listing reset tokens (client + admin)."""
    enrollment_id = serializers.UUIDField(source='enrollment.id')
    account_size = serializers.DecimalField(source='enrollment.account_size', max_digits=12, decimal_places=2)
    mt5_account_id = serializers.CharField(source='enrollment.mt5_account_id')
    challenge_name = serializers.CharField(source='enrollment.challenge.name')
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ResetToken
        fields = [
            'id', 'user_email', 'user_name', 'enrollment_id', 'account_size',
            'mt5_account_id', 'challenge_name', 'wecoins_cost', 'status',
            'admin_comment', 'created_at', 'reviewed_at', 'used_at',
        ]

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.email


class ResetTokenActionSerializer(serializers.Serializer):
    """Admin action serializer — approve, decline, or mark as used."""
    ACTION_CHOICES = [
        ('approve', 'Approve'),
        ('decline', 'Decline'),
        ('use', 'Mark as Used'),
    ]
    action = serializers.ChoiceField(choices=ACTION_CHOICES)
    comment = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        instance = self.instance
        action = attrs['action']
        if action == 'approve' and instance.status != 'pending':
            raise serializers.ValidationError("Can only approve pending tokens.")
        if action == 'decline' and instance.status not in ['pending', 'approved']:
            raise serializers.ValidationError("Can only decline pending or approved tokens.")
        if action == 'use' and instance.status != 'approved':
            raise serializers.ValidationError("Can only mark approved tokens as used.")
        return attrs

    def update(self, instance, validated_data):
        from wefund.event_logger import log_event
        request = self.context['request']
        action = validated_data['action']
        comment = validated_data.get('comment', '')

        if action == 'approve':
            instance.status = 'approved'
        elif action == 'decline':
            instance.status = 'declined'
            with transaction.atomic():
                wallet, _ = WeCoinWallet.objects.get_or_create(user=instance.user)
                wallet.balance += instance.wecoins_cost
                wallet.save()
                WeCoinTransaction.objects.create(
                    wallet=wallet,
                    type='adjustment',
                    amount=instance.wecoins_cost,
                    description=f"Refund: reset token declined ({int(instance.enrollment.account_size / 1000)}k)"
                )
                log_event(
                    request=request,
                    user=instance.user,
                    category="wecoins",
                    event_type="reset_token_refunded",
                    challenge_enrollment=instance.enrollment,
                    metadata={
                        "reset_token_id": str(instance.id),
                        "refunded_amount": str(instance.wecoins_cost),
                    },
                    description=f"Reset token declined, {instance.wecoins_cost} WeCoins refunded to {instance.user.email}."
                )
        elif action == 'use':
            instance.status = 'used'
            instance.used_at = timezone.now()

        instance.admin_comment = comment
        instance.reviewed_by = request.user
        instance.reviewed_at = timezone.now()
        instance.save()

        log_event(
            request=request,
            user=instance.user,
            category="wecoins",
            event_type=f"reset_token_{action}d",
            challenge_enrollment=instance.enrollment,
            metadata={
                "reset_token_id": str(instance.id),
                "action": action,
                "admin": request.user.email,
            },
            description=f"Reset token {action}d by {request.user.email} for {instance.user.email}."
        )
        return instance


# ---------------------------------------------------------------------
# 1. Affiliate Profile
# ---------------------------------------------------------------------
class AffiliateProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.username", read_only=True)
    referral_count = serializers.SerializerMethodField()
    current_tier_name = serializers.SerializerMethodField()
    effective_rate = serializers.SerializerMethodField()
    effective_fixed_amount = serializers.SerializerMethodField()

    class Meta:
        model = AffiliateProfile
        fields = [
            "id",
            "user_email",
            "user_name",
            "referral_code",
            "approved",
            "website_url",
            "promotion_strategy",
            "referral_count",
            "current_tier_name",
            "effective_rate",
            "effective_fixed_amount",
            "created_at",
            "updated_at",
        ]

    def get_referral_count(self, obj):
        return obj.referral_count

    def get_current_tier_name(self, obj):
        tier = obj.current_tier
        return tier.name if tier else None

    def get_effective_rate(self, obj):
        return str(obj.effective_commission_rate)

    def get_effective_fixed_amount(self, obj):
        val = obj.effective_fixed_amount
        return str(val) if val else None


# ---------------------------------------------------------------------
# 2. Affiliate Wallet
# ---------------------------------------------------------------------
class AffiliateWalletSerializer(serializers.ModelSerializer):
    affiliate_email = serializers.EmailField(source="affiliate.email", read_only=True)

    class Meta:
        model = AffiliateWallet
        fields = [
            "id",
            "affiliate_email",
            "balance",
            "total_earned",
            "last_updated",
        ]


# ---------------------------------------------------------------------
# 3. Wallet Transaction
# ---------------------------------------------------------------------
class AffiliateWalletTransactionSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.CharField(
        source="get_transaction_type_display", read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )

    class Meta:
        model = AffiliateWalletTransaction
        fields = [
            "id",
            "transaction_type",
            "transaction_type_display",
            "amount",
            "status",
            "status_display",
            "note",
            "created_at",
        ]


# ---------------------------------------------------------------------
# 4. Affiliate Referral
# ---------------------------------------------------------------------
class AffiliateReferralSerializer(serializers.ModelSerializer):
    referred_user_email = serializers.EmailField(source="referred_user.email", read_only=True)
    referred_user_name = serializers.CharField(source="referred_user.username", read_only=True)
    affiliate_code = serializers.CharField(source="affiliate.referral_code", read_only=True)

    class Meta:
        model = AffiliateReferral
        fields = [
            "id",
            "affiliate_code",
            "referred_user_email",
            "referred_user_name",
            "date_referred",
            "challenge_name",
            "commission_amount",
            "commission_status",
            "note",
            "created_at",
            "updated_at",
        ]


# ---------------------------------------------------------------------
# 5. Affiliate Payout
# ---------------------------------------------------------------------
class AffiliatePayoutSerializer(serializers.ModelSerializer):
    affiliate_email = serializers.EmailField(source="affiliate.email", read_only=True)
    payment_method_label = serializers.CharField(source="payment_method.label", read_only=True)
    payment_type = serializers.CharField(source="payment_method.payment_type", read_only=True)

    class Meta:
        model = AffiliatePayout
        fields = [
            "id",
            "affiliate_email",
            "payment_method_label",
            "payment_type",
            "amount",
            "status",
            "notes",
            "requested_at",
            "processed_at",
            "transaction_id",
            "is_manual",
        ]


# ---------------------------------------------------------------------
# 6. Custom Commission
# ---------------------------------------------------------------------
class AffiliateCustomCommissionSerializer(serializers.ModelSerializer):
    affiliate_email = serializers.EmailField(source="affiliate.user.email", read_only=True)

    class Meta:
        model = AffiliateCustomCommission
        fields = [
            "id",
            "affiliate_email",
            "is_active",
            "commission_rate",
            "fixed_amount_per_referral",
            "notes",
            "created_at",
            "updated_at",
        ]

    def validate(self, data):
        rate = data.get("commission_rate")
        fixed = data.get("fixed_amount_per_referral")

        if not rate and not fixed:
            raise serializers.ValidationError(
                "Either 'commission_rate' or 'fixed_amount_per_referral' must be provided."
            )
        return data


# ---------------------------------------------------------------------
# 7. Admin Affiliate Overview (Composite)
# ---------------------------------------------------------------------
class AdminAffiliateOverviewSerializer(serializers.Serializer):
    """
    Combines multiple data points for the admin overview endpoint.
    """

    user = serializers.DictField()
    profile = AffiliateProfileSerializer()
    wallet = AffiliateWalletSerializer()
    custom_commission = AffiliateCustomCommissionSerializer()
    stats = serializers.DictField()
    
class AssignReferralCodeSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(required=True)
    referral_code = serializers.CharField(max_length=32, required=True)

    def validate_referral_code(self, value):
        """Ensure referral code is unique (case-insensitive)."""
        if AffiliateProfile.objects.filter(referral_code__iexact=value).exists():
            raise serializers.ValidationError("This referral code is already in use.")
        return value

    def validate_user_id(self, value):
        try:
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")
        return value

    def save(self):

        user_id = self.validated_data["user_id"]
        referral_code = self.validated_data["referral_code"]

        user = User.objects.get(id=user_id)

        # Get or create affiliate profile for this user
        profile, _ = AffiliateProfile.objects.get_or_create(
            user=user,
            defaults={"approved": True, "referral_code": referral_code},
        )

        # If already exists, just update the code
        if profile.referral_code != referral_code:
            profile.referral_code = referral_code
            profile.save(update_fields=["referral_code", "updated_at"])

        return profile
    
class AssignAffiliateTierSerializer(serializers.Serializer):
    user_id = serializers.UUIDField(required=True)
    tier_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_user_id(self, value):
        try:
            user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")
        if not hasattr(user, "affiliate_profile"):
            raise serializers.ValidationError("User does not have an affiliate profile.")
        return value

    def validate_tier_id(self, value):
        if value is None:
            return value  # Removing override is allowed

        try:
            AffiliateCommissionTier.objects.get(id=value)
        except AffiliateCommissionTier.DoesNotExist:
            raise serializers.ValidationError("Invalid tier ID.")
        return value

    def save(self):
        user_id = self.validated_data["user_id"]
        tier_id = self.validated_data.get("tier_id")

        user = User.objects.get(id=user_id)
        profile = user.affiliate_profile

        if tier_id is None:
            # Remove manual override -> revert to auto tiering
            profile.manual_tier_override = None
            profile.save(update_fields=["manual_tier_override", "updated_at"])
            return profile

        # Assign manual override
        tier = AffiliateCommissionTier.objects.get(id=tier_id)
        profile.manual_tier_override = tier
        profile.save(update_fields=["manual_tier_override", "updated_at"])
        return profile    

class ConvertAffiliateToClientSerializer(serializers.Serializer):
    """
    Input can be either `user_id` or `email`.
    """
    user_id = serializers.UUIDField(required=False)
    email = serializers.EmailField(required=False)

    def validate(self, attrs):
        if not attrs.get("user_id") and not attrs.get("email"):
            raise serializers.ValidationError("Provide either `user_id` or `email`.")
        return attrs

class WeCoinsBetaAccessAdminSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(
        source="user.get_full_name", read_only=True
    )

    class Meta:
        model = BetaFeatureAccess
        fields = [
            "id",
            "user",
            "user_email",
            "user_name",
            "status",
            "request_notes",
            "admin_notes",
            "requested_at",
            "reviewed_at",
        ]
        read_only_fields = [
            "user",
            "user_email",
            "user_name",
            "requested_at",
            "reviewed_at",
        ]
        
class StopLossChangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StopLossChange
        fields = [
            "id",
            "position_id",
            "login",
            "symbol",
            "side",
            "old_sl",
            "new_sl",
            "digits",
            "price_open",
            "price_current",
            "tp",
            "profit",
            "storage",
            "changed_at",
            "created_at",
            "dealer",
            "expert_id",
            "comment",
        ]
        read_only_fields = fields

class TopAffiliateSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    referral_count = serializers.IntegerField(source="referral_count_total", read_only=True)
    total_commission = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_payout = serializers.DecimalField(max_digits=12, decimal_places=2)
    commission_rate = serializers.SerializerMethodField()
    current_tier = serializers.CharField(source="current_tier.name", read_only=True)

    def get_commission_rate(self, obj):
        """
        Returns effective commission rate (custom > manual tier > auto tier)
        """
        rate = getattr(obj, "effective_commission_rate", None)
        if rate is not None:
            return str(rate)

        # fallback logic (if view didn't set it)
        custom = getattr(obj, "custom_commission", None)
        if custom and custom.is_active and custom.commission_rate:
            return str(custom.commission_rate)

        tier = getattr(obj, "current_tier", None)
        if tier:
            return str(tier.commission_rate)

        return "0.00"

    class Meta:
        model = AffiliateProfile
        fields = [
            "id",
            "username",
            "email",
            "referral_code",
            "approved",
            "referral_count",
            "total_commission",
            "total_paid",
            "pending_payout",
            "commission_rate",
            "current_tier",
            "created_at",
        ]
        
class EventLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    challenge = serializers.SerializerMethodField()

    def get_user(self, obj):
        if not obj.user:
            return None

        # Default fallback
        full_name = obj.user.get_full_name().strip() or obj.user.username

        # Try reading name from ClientProfile.address_info
        if hasattr(obj.user, "client_profile") and obj.user.client_profile.address_info:
            addr = obj.user.client_profile.address_info

            # Convert string → dict if needed
            if isinstance(addr, str):
                try:
                    import json
                    addr = json.loads(addr)
                except Exception:
                    addr = {}

            if isinstance(addr, dict):
                first = addr.get("first_name") or ""
                last = addr.get("last_name") or ""
                name = f"{first} {last}".strip()
                if name:
                    full_name = name

        return {
            "id": str(obj.user.id),
            "username": obj.user.username,
            "email": obj.user.email,
            "full_name": full_name,
        }

    def get_challenge(self, obj):
        if not obj.challenge_enrollment:
            return None
        return {
            "id": str(obj.challenge_enrollment.id),
            "mt5_account_id": obj.challenge_enrollment.mt5_account_id,
        }

    class Meta:
        model = EventLog
        fields = [
            "id",
            "timestamp",
            "category",
            "event_type",
            "engine",
            "user",
            "challenge",
            "ip_address",
            "metadata",
            "description",
        ]

class RedeemItemSummarySerializer(serializers.ModelSerializer):
    total_redemptions = serializers.IntegerField(read_only=True)
    pending_count = serializers.IntegerField(read_only=True)
    approved_count = serializers.IntegerField(read_only=True)
    fulfilled_count = serializers.IntegerField(read_only=True)
    declined_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = RedeemItem
        fields = [
            'id', 'title', 'category', 'required_wecoins', 'stock_quantity', 'is_active',
            'total_redemptions', 'pending_count', 'approved_count', 'fulfilled_count', 'declined_count'
        ]


class RedemptionListSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    item_title = serializers.CharField(source='item.title', read_only=True)

    class Meta:
        model = Redemption
        fields = [
            'id', 'user_name', 'user_email', 'item_title', 'status',
            'admin_comment', 'created_at', 'reviewed_by', 'reviewed_at', 'delivery_data'
        ]

class RedemptionActionSerializer(serializers.ModelSerializer):
    action = serializers.ChoiceField(choices=['approve', 'decline', 'fulfill', 'reset'])
    comment = serializers.CharField(required=False, allow_blank=True)
    delivery_data = serializers.JSONField(required=False)

    class Meta:
        model = Redemption
        fields = ['action', 'comment', 'delivery_data']

    def validate(self, data):
        instance = self.instance
        action = data.get('action')

        # prevent invalid state changes
        if instance.status in ['fulfilled', 'declined'] and action in ['approve', 'decline']:
            raise serializers.ValidationError(f"Cannot {action} a redemption that is already {instance.status}.")
        return data

    def save(self, **kwargs):
        instance = self.instance
        request = self.context['request']
        action = self.validated_data['action']
        comment = self.validated_data.get('comment', '')
        delivery_data = self.validated_data.get('delivery_data', {})

        if action == 'approve':
            instance.status = 'approved'
        elif action == 'decline':
            instance.status = 'declined'
        elif action == 'fulfill':
            instance.status = 'fulfilled'
        elif action == 'reset':
            instance.status = 'pending'

        instance.admin_comment = comment
        instance.delivery_data = delivery_data or instance.delivery_data
        instance.reviewed_by = request.user
        instance.reviewed_at = timezone.now()
        instance.save()

        return instance

class BetaFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = BetaFeature
        fields = [
            'id', 'code', 'name', 'description', 
            'status', 'requires_kya', 'requires_kyc',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class ChallengePayoutAnalyticsSerializer(serializers.Serializer):
    challenge_id = serializers.IntegerField()
    challenge_name = serializers.CharField()
    step_type = serializers.CharField()

    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_payouts = serializers.DecimalField(max_digits=12, decimal_places=2)

    profit_margin_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit_margin_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)

    payout_count = serializers.IntegerField()
    payout_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)

    funded_accounts_count = serializers.IntegerField()
    total_enrollments = serializers.IntegerField()

class AccountSizePayoutAnalyticsSerializer(serializers.Serializer):
    account_size = serializers.DecimalField(max_digits=12, decimal_places=2)

    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_payouts = serializers.DecimalField(max_digits=12, decimal_places=2)

    profit_margin_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit_margin_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)

    payout_count = serializers.IntegerField()
    payout_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)

    funded_accounts_count = serializers.IntegerField()
    total_enrollments = serializers.IntegerField()

class CountryPayoutAnalyticsSerializer(serializers.Serializer):
    country = serializers.CharField()

    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_payouts = serializers.DecimalField(max_digits=12, decimal_places=2)

    profit_margin_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit_margin_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)

    payout_count = serializers.IntegerField()
    average_payout_value = serializers.DecimalField(max_digits=12, decimal_places=2)

    funded_accounts_count = serializers.IntegerField()

class UnprofitableCountryAnalyticsSerializer(serializers.Serializer):
    country = serializers.CharField()

    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_payouts = serializers.DecimalField(max_digits=12, decimal_places=2)

    total_loss = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit_margin_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    profit_margin_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)

    payout_count = serializers.IntegerField()
    funded_accounts_count = serializers.IntegerField()

class EnrollmentEventLogSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)
    engine_display = serializers.CharField(source="get_engine_display", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = EventLog
        fields = [
            "id",
            "timestamp",
            "category",
            "category_display",
            "event_type",
            "event_type_display",
            "engine",
            "engine_display",
            "description",
            "ip_address",
            "metadata",

            # User Info
            "user",
            "username",
            "user_email",

            # Enrollment relation
            "challenge_enrollment",
        ]

class ManualUpgradeSerializer(serializers.Serializer):
    new_status = serializers.ChoiceField(choices=ChallengeEnrollment.STATUS_CHOICES)
    reason = serializers.CharField(required=False, allow_blank=True)

class RiskScanRequestSerializer(serializers.Serializer):
    payout_id = serializers.UUIDField()

class PayoutAIAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayoutAIAnalysis
        fields = "__all__"

class CompetitionPrizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetitionPrize
        fields = ["id", "rank_from", "rank_to", "description"]


class CompetitionRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetitionRule
        fields = "__all__"
        read_only_fields = ["id", "competition"]

class ChallengeMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Challenge
        fields = ["id", "name", "step_type", "is_active"]

class CompetitionSerializer(serializers.ModelSerializer):
    prizes = CompetitionPrizeSerializer(many=True, required=False)
    manual_rules = CompetitionRuleSerializer(many=True, required=False)

    # File inputs (not stored directly in DB)
    banner_file = serializers.ImageField(write_only=True, required=False)
    organizer_logo_file = serializers.ImageField(write_only=True, required=False)

    # Selected challenge (readable object)
    challenge_detail = ChallengeMiniSerializer(source="challenge", read_only=True)

    # All available challenges for CRM dropdown
    available_challenges = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Competition
        fields = "__all__"

    # Enforce manual rules when global rules are disabled
    def validate(self, data):
        use_global = data.get("use_global_rules", True)
        rules = self.initial_data.get("manual_rules")

        if not use_global and not rules:
            raise serializers.ValidationError(
                "Manual rules are required when global rules are disabled."
            )

        return data

    # Return all active challenges for CRM selector
    def get_available_challenges(self, obj):
        qs = Challenge.objects.filter(is_active=True).order_by("name")
        return ChallengeMiniSerializer(qs, many=True).data
    
    def _extract_nested(self, key, validated_data):
        """
        Handles nested fields coming from multipart/form-data
        (JSON string → Python list)
        """
        value = validated_data.pop(key, None)

        if value is None and key in self.initial_data:
            try:
                value = json.loads(self.initial_data.get(key))
            except Exception:
                raise serializers.ValidationError({
                    key: "Invalid JSON format"
                })

        return value or []

    @transaction.atomic
    def create(self, validated_data):
        prizes = self._extract_nested("prizes", validated_data)
        rules = self._extract_nested("manual_rules", validated_data)

        banner_file = validated_data.pop("banner_file", None)
        organizer_logo_file = validated_data.pop("organizer_logo_file", None)

        # Upload banner
        if banner_file:
            filename = f"competitions/banners/{uuid.uuid4()}_{banner_file.name}"
            validated_data["banner"] = upload_to_bunnycdn(banner_file, filename)

        # Upload organizer logo
        if organizer_logo_file:
            filename = f"competitions/organizers/{uuid.uuid4()}_{organizer_logo_file.name}"
            validated_data["organizer_logo"] = upload_to_bunnycdn(
                organizer_logo_file, filename
            )

        competition = Competition.objects.create(**validated_data)

        # Save prizes
        for prize in prizes:
            CompetitionPrize.objects.create(
                competition=competition,
                **prize
            )

        # Save manual rules
        for rule in rules:
            CompetitionRule.objects.create(
                competition=competition,
                **rule
            )

        return competition

    @transaction.atomic
    def update(self, instance, validated_data):
        prizes = self._extract_nested("prizes", validated_data)
        rules = self._extract_nested("manual_rules", validated_data)

        banner_file = validated_data.pop("banner_file", None)
        organizer_logo_file = validated_data.pop("organizer_logo_file", None)

        # Upload new banner if provided
        if banner_file:
            filename = f"competitions/banners/{uuid.uuid4()}_{banner_file.name}"
            instance.banner = upload_to_bunnycdn(banner_file, filename)

        # Upload new organizer logo if provided
        if organizer_logo_file:
            filename = f"competitions/organizers/{uuid.uuid4()}_{organizer_logo_file.name}"
            instance.organizer_logo = upload_to_bunnycdn(
                organizer_logo_file, filename
            )

        # Update remaining fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        # Replace prizes
        instance.prizes.all().delete()
        for prize in prizes:
            CompetitionPrize.objects.create(
                competition=instance,
                **prize
            )

        # Replace manual rules
        instance.manual_rules.all().delete()
        for rule in rules:
            CompetitionRule.objects.create(
                competition=instance,
                **rule
            )

        return instance

class AdminCompetitionListSerializer(serializers.ModelSerializer):
    total_registrations = serializers.IntegerField(read_only=True)

    class Meta:
        model = Competition
        fields = [
            "id",
            "title",
            "status",
            "start_at",
            "end_at",
            "prize_pool_text",
            "total_registrations",
            "created_at",
        ]

class AdminCompetitionRegistrationSerializer(serializers.ModelSerializer):
    trader_name = serializers.SerializerMethodField()
    trader_email = serializers.SerializerMethodField()

    mt5_login = serializers.SerializerMethodField()  # ✅ FROM CHALLENGE
    mt5_initial_balance = serializers.SerializerMethodField()
    mt5_current_balance = serializers.SerializerMethodField()
    mt5_live_equity = serializers.SerializerMethodField()

    class Meta:
        model = CompetitionRegistration
        fields = [
            "id",
            "trader_name",
            "trader_email",
            "mt5_login",
            "mt5_initial_balance",
            "mt5_current_balance",
            "mt5_live_equity",
            "status",
            "joined_at",
        ]

    def get_trader_name(self, obj):
        profile = getattr(obj.user, "client_profile", None)
        if profile:
            first = profile.address_info.get("first_name", "")
            last = profile.address_info.get("last_name", "")
            return f"{first} {last}".strip() or obj.user.username
        return obj.user.username

    def get_trader_email(self, obj):
        return obj.user.email

    # ✅ MT5 LOGIN FROM CHALLENGE
    def get_mt5_login(self, obj):
        if obj.challenge_enrollment:
            return obj.challenge_enrollment.mt5_account_id
        return None

    # ✅ INITIAL BALANCE FROM CHALLENGE
    def get_mt5_initial_balance(self, obj):
        if obj.challenge_enrollment:
            return obj.challenge_enrollment.account_size
        return None

    # ✅ LIVE BALANCE FROM CHALLENGE MT5
    def get_mt5_current_balance(self, obj):
        if not obj.challenge_enrollment or not obj.challenge_enrollment.mt5_account_id:
            return None
        return fetch_user_balance(obj.challenge_enrollment.mt5_account_id) or Decimal("0.00")

    # ✅ LIVE EQUITY FROM CHALLENGE MT5
    def get_mt5_live_equity(self, obj):
        if not obj.challenge_enrollment or not obj.challenge_enrollment.mt5_account_id:
            return None
        return fetch_user_equity(obj.challenge_enrollment.mt5_account_id) or Decimal("0.00")

class LiveCompetitionLeaderboardSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    trader_name = serializers.CharField()
    trader_email = serializers.EmailField()
    mt5_login = serializers.CharField()
    initial_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    equity = serializers.DecimalField(max_digits=12, decimal_places=2)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    growth_percent = serializers.DecimalField(max_digits=8, decimal_places=2)
    total_trades = serializers.IntegerField()

class AdminCompetitionLeaderboardSerializer(serializers.ModelSerializer):
    trader_name = serializers.SerializerMethodField()
    trader_email = serializers.SerializerMethodField()
    mt5_initial_balance = serializers.SerializerMethodField()

    class Meta:
        model = CompetitionRankingSnapshot
        fields = [
            "rank",
            "trader_name",
            "trader_email",
            "mt5_login",
            "mt5_initial_balance",
            "growth_percent",
            "total_trades",
            "equity",
            "balance",
            "captured_at",
        ]

    def get_trader_name(self, obj):
        if obj.user.leaderboard_display_name:
            return obj.user.leaderboard_display_name
        profile = getattr(obj.user, "client_profile", None)
        if profile:
            first = profile.address_info.get("first_name", "")
            last = profile.address_info.get("last_name", "")
            return f"{first} {last}".strip() or obj.user.username
        return obj.user.username

    def get_trader_email(self, obj):
        return obj.user.email

    # ✅ INITIAL BALANCE FROM CHALLENGE ENROLLMENT
    def get_mt5_initial_balance(self, obj):
        reg = CompetitionRegistration.objects.filter(
            competition=obj.competition,
            user=obj.user
        ).select_related("challenge_enrollment").first()

        if reg and reg.challenge_enrollment:
            return reg.challenge_enrollment.account_size

        # ✅ Fallback (older competitions)
        return obj.competition.initial_balance

class TraderCompetitionCardSerializer(serializers.ModelSerializer):
    participants = serializers.IntegerField(read_only=True)
    cta = serializers.SerializerMethodField()
    is_joined = serializers.SerializerMethodField()

    class Meta:
        model = Competition
        fields = [
            "id",
            "banner",
            "organizer_logo",
            "title",
            "prize_pool_text",
            "short_description",
            "entry_type",
            "start_at",
            "end_at",
            "status",
            "participants",
            "cta",
            "is_joined",
        ]

    def get_is_joined(self, obj):
        user = self.context["request"].user
        return CompetitionRegistration.objects.filter(
            competition=obj,
            user=user
        ).exists()

    def get_cta(self, obj):
        user = self.context["request"].user
        joined = CompetitionRegistration.objects.filter(
            competition=obj,
            user=user
        ).exists()

        if obj.status == "ended":
            return "ENDED"
        if joined:
            return "VIEW"
        return "JOIN"

class TraderCompetitionDetailSerializer(serializers.ModelSerializer):
    participants = serializers.IntegerField(read_only=True)
    is_joined = serializers.SerializerMethodField()

    # MT5 Credentials (from ChallengeEnrollment)
    mt5_login = serializers.SerializerMethodField()
    mt5_password = serializers.SerializerMethodField()
    mt5_investor_password = serializers.SerializerMethodField()
    mt5_server = serializers.SerializerMethodField()

    top_three = serializers.SerializerMethodField()
    top_prizes = serializers.SerializerMethodField()

    class Meta:
        model = Competition
        fields = [
            "id",
            "title",
            "banner",
            "organizer_logo",
            "short_description",
            "full_description",
            "prize_pool_text",
            "rules_markdown",
            "entry_type",
            "start_at",
            "end_at",
            "organizer_name",
            "participants",
            "is_joined",

            "top_prizes",

            # MT5 Credentials
            "mt5_login",
            "mt5_password",
            "mt5_investor_password",
            "mt5_server",

            "top_three",
        ]

    def get_is_joined(self, obj):
        user = self.context["request"].user
        return CompetitionRegistration.objects.filter(
            competition=obj,
            user=user
        ).exists()
    
    def get_top_prizes(self, obj):
        prizes = (
            obj.prizes
            .all()
            .order_by("rank_from")[:3]
        )

        return [
            {
                "rank_from": prize.rank_from,
                "rank_to": prize.rank_to,
                "description": prize.description,
            }
            for prize in prizes
        ]

    # Get Challenge MT5 Login
    def get_mt5_login(self, obj):
        reg = self._get_registration(obj)
        if reg and reg.challenge_enrollment:
            return reg.challenge_enrollment.mt5_account_id
        return None

    # Get Challenge MT5 Password
    def get_mt5_password(self, obj):
        reg = self._get_registration(obj)
        if reg and reg.challenge_enrollment:
            return reg.challenge_enrollment.mt5_password
        return None

    # Get Challenge MT5 Investor Password
    def get_mt5_investor_password(self, obj):
        reg = self._get_registration(obj)
        if reg and reg.challenge_enrollment:
            return reg.challenge_enrollment.mt5_investor_password
        return None

    # MT5 Server Name From Settings
    def get_mt5_server(self, obj):
        reg = self._get_registration(obj)
        if reg and reg.challenge_enrollment:
            return getattr(settings, "MT5_SERVER_NAME", None)
        return None

    # Internal helper to avoid duplicate queries
    def _get_registration(self, obj):
        user = self.context["request"].user
        return CompetitionRegistration.objects.filter(
            competition=obj,
            user=user
        ).select_related("challenge_enrollment").first()
    
    def _get_user_display_name(self, user):
        # ClientProfile (highest priority)
        profile = getattr(user, "client_profile", None)
        if profile:
            addr = profile.address_info or {}
            first = addr.get("first_name")
            last = addr.get("last_name")
            if first or last:
                return f"{first or ''} {last or ''}".strip()

        # User model full name
        if user.first_name or user.last_name:
            return f"{user.first_name} {user.last_name}".strip()

        # Final fallback (never username)
        return "WeFund Trader"

    def get_top_three(self, obj):
        qs = (
            CompetitionRankingSnapshot.objects
            .filter(competition=obj)
            .select_related("user", "user__client_profile")
            .order_by("rank")[:3]
        )

        return [
            {
                "rank": row.rank,
                "name": self._get_user_display_name(row.user),
                "growth_percent": row.growth_percent,
            }
            for row in qs
        ]
    
    def get_top_prizes(self, obj):
        prizes = (
            obj.prizes
            .all()
            .order_by("rank_from")[:4]
        )

        return [
            {
                "rank_from": prize.rank_from,
                "rank_to": prize.rank_to,
                "description": prize.description,
            }
            for prize in prizes
        ]

class ClientCompetitionLeaderboardTableSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = CompetitionRankingSnapshot
        fields = [
            "rank",
            "name",
            "total_trades",
            "growth_percent",
        ]

    def get_name(self, obj):
        if obj.user.leaderboard_display_name:
            return obj.user.leaderboard_display_name
        profile = getattr(obj.user, "client_profile", None)
        if profile:
            first = profile.address_info.get("first_name", "")
            last = profile.address_info.get("last_name", "")
            full = f"{first} {last}".strip()
            return full if full else obj.user.username
        return obj.user.username

class CompetitionsBetaAccessAdminSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = BetaFeatureAccess
        fields = [
            "id",
            "user_id",
            "user_email",
            "user_full_name",
            "status",
            "admin_notes",
            "requested_at",
            "reviewed_at",
        ]
        read_only_fields = fields

class AIRiskRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIRiskRule
        fields = [
            "id",
            "code",
            "name",
            "description",
            "severity",
            "detection_guidelines",
            "is_active",
            "version",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "version",
            "created_at",
            "updated_at",
        ]


class AIRiskAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIRiskAnalysis
        fields = "__all__"


class AIRiskReviewFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIRiskReviewFeedback
        fields = [
            "human_decision",
            "human_agrees_with_ai",
            "human_reasoning",
            "patterns_confirmed",
            "patterns_rejected",
            "patterns_added",
            "review_difficulty",
            "training_priority",
            "is_training_example",
        ]


# -------------------------------------------------------------------
# Economic Calendar Serializers
# -------------------------------------------------------------------

class EconomicEventSerializer(serializers.ModelSerializer):
    """Full CRUD serializer for economic calendar events"""
    event_datetime_gmt2 = serializers.SerializerMethodField()

    class Meta:
        model = EconomicEvent
        fields = [
            'id',
            'event_name',
            'currency',
            'impact',
            'event_datetime',
            'event_datetime_gmt2',
            'time_window_minutes',
            'affected_symbols',
            'actual_value',
            'forecast_value',
            'previous_value',
            'source',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_event_datetime_gmt2(self, obj):
        if not obj.event_datetime:
            return None
        from zoneinfo import ZoneInfo
        gmt2 = obj.event_datetime.astimezone(ZoneInfo('Europe/Helsinki'))
        return gmt2.strftime('%Y-%m-%d %H:%M:%S')

    def validate_impact(self, value):
        valid_impacts = ['low', 'medium', 'high']
        if value.lower() not in valid_impacts:
            raise serializers.ValidationError(
                f"Impact must be one of: {', '.join(valid_impacts)}"
            )
        return value.lower()

    def validate_currency(self, value):
        if value:
            return value.upper()
        return value


class EconomicCalendarSyncScheduleSerializer(serializers.ModelSerializer):
    """Read-only sync status serializer"""

    class Meta:
        model = EconomicCalendarSyncSchedule
        fields = [
            'id',
            'last_sync_at',
            'next_sync_at',
            'sync_interval_hours',
            'is_enabled',
            'schedule_hour',
            'last_sync_result',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


# -------------------------------------------------------------------
# AI Learning Center Serializers
# -------------------------------------------------------------------

class AILearningStatsSerializer(serializers.Serializer):
    """Stats response for AI Learning Center"""
    total_analyses = serializers.IntegerField()
    total_reviewed = serializers.IntegerField()
    ai_accuracy = serializers.FloatField()
    patterns_by_type = serializers.DictField(child=serializers.IntegerField())
    decisions_by_type = serializers.DictField(child=serializers.IntegerField())


class AIAnalysisWithFeedbackSerializer(serializers.ModelSerializer):
    """AI Analysis with feedback info for learning center"""
    payout_id = serializers.UUIDField(source='payout.id', read_only=True)
    human_decision = serializers.CharField(source='feedback.human_decision', read_only=True, default=None)
    human_agrees_with_ai = serializers.BooleanField(source='feedback.human_agrees_with_ai', read_only=True, default=None)
    is_training_example = serializers.BooleanField(source='feedback.is_training_example', read_only=True, default=False)
    reviewed_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = AIRiskAnalysis
        fields = [
            'id',
            'payout_id',
            'account_id',
            'ai_recommendation',
            'ai_confidence',
            'ai_patterns_detected',
            'human_decision',
            'human_agrees_with_ai',
            'is_training_example',
            'created_at',
            'reviewed_at',
        ]


class AITrainingExampleSerializer(serializers.ModelSerializer):
    """Training example serializer with full details"""
    payout_id = serializers.UUIDField(source='payout.id', read_only=True)
    human_decision = serializers.CharField(source='feedback.human_decision', read_only=True)
    human_agrees_with_ai = serializers.BooleanField(source='feedback.human_agrees_with_ai', read_only=True)
    is_training_example = serializers.BooleanField(source='feedback.is_training_example', read_only=True)
    training_priority = serializers.IntegerField(source='feedback.training_priority', read_only=True)
    approved_at = serializers.DateTimeField(source='feedback.created_at', read_only=True)
    approved_by = serializers.CharField(source='feedback.reviewer.email', read_only=True, default=None)

    class Meta:
        model = AIRiskAnalysis
        fields = [
            'id',
            'payout_id',
            'account_id',
            'ai_recommendation',
            'ai_confidence',
            'ai_patterns_detected',
            'human_decision',
            'human_agrees_with_ai',
            'is_training_example',
            'training_priority',
            'approved_at',
            'approved_by',
            'created_at',
        ]

class CopyTradingDetectRequestSerializer(serializers.Serializer):
    account_ids = serializers.ListField(
        child=serializers.CharField(),
        min_length=2,
        max_length=500,
        allow_empty=False
    )

    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)

    window_seconds = serializers.IntegerField(required=False, min_value=1, max_value=60, default=5)
    min_accounts = serializers.IntegerField(required=False, min_value=2, max_value=20, default=2)

    # Optional: reduce false positives
    volume_tolerance_ratio = serializers.FloatField(required=False, min_value=0.0, max_value=5.0)  # e.g. 0.1 => ±10%
    include_trades = serializers.BooleanField(required=False, default=True)
    max_trades_per_cluster = serializers.IntegerField(required=False, min_value=1, max_value=200, default=50)

    def validate_account_ids(self, value):
        cleaned = []
        for x in value:
            s = str(x).strip()
            if not s.isdigit():
                raise serializers.ValidationError(f"Invalid account id: {x}")
            cleaned.append(int(s))
        cleaned = sorted(set(cleaned))
        if len(cleaned) < 2:
            raise serializers.ValidationError("Provide at least 2 account_ids.")
        return cleaned

class FindSimilarAccountsRequestSerializer(serializers.Serializer):
    seed_account_id = serializers.CharField()

    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)

    window_seconds = serializers.IntegerField(required=False, min_value=1, max_value=60, default=5)

    # ranking / noise control
    min_matches = serializers.IntegerField(required=False, min_value=1, max_value=100000, default=3)
    max_results = serializers.IntegerField(required=False, min_value=1, max_value=200, default=20)

    # optional: only compare buy/sell
    include_trades = serializers.BooleanField(required=False, default=False)

    def validate_seed_account_id(self, value):
        s = str(value).strip()
        if not s.isdigit():
            raise serializers.ValidationError("seed_account_id must be a numeric MT5 login.")
        return int(s)

class HedgingDetectRequestSerializer(serializers.Serializer):
    account_ids = serializers.ListField(
        child=serializers.CharField(),
        min_length=1,
        max_length=500,
        allow_empty=False
    )

    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)

    window_seconds = serializers.IntegerField(required=False, min_value=1, max_value=60, default=5)
    min_pairs = serializers.IntegerField(required=False, min_value=1, max_value=100000, default=1)

    include_trades = serializers.BooleanField(required=False, default=True)
    max_pairs_per_account = serializers.IntegerField(required=False, min_value=1, max_value=200, default=50)

    def validate_account_ids(self, value):
        cleaned = []
        for x in value:
            s = str(x).strip()
            if not s.isdigit():
                raise serializers.ValidationError(f"Invalid account id: {x}")
            cleaned.append(int(s))
        return sorted(set(cleaned))


class HedgingFindSimilarRequestSerializer(serializers.Serializer):
    seed_account_id = serializers.CharField()

    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)

    window_seconds = serializers.IntegerField(required=False, min_value=1, max_value=60, default=5)

    min_matches = serializers.IntegerField(required=False, min_value=1, max_value=100000, default=2)
    max_results = serializers.IntegerField(required=False, min_value=1, max_value=200, default=20)

    include_evidence = serializers.BooleanField(required=False, default=False)
    max_evidence_per_account = serializers.IntegerField(required=False, min_value=1, max_value=100, default=20)

    def validate_seed_account_id(self, value):
        s = str(value).strip()
        if not s.isdigit():
            raise serializers.ValidationError("seed_account_id must be a numeric MT5 login.")
        return int(s)


class TradingReportSerializer(serializers.ModelSerializer):
    generated_by_email = serializers.SerializerMethodField()

    class Meta:
        model = TradingReport
        fields = [
            'id', 'period_type', 'period_start', 'period_end',
            'generated_at', 'generated_by', 'generated_by_email',
            'data', 'is_auto_generated', 'slack_sent',
        ]
        read_only_fields = ['id', 'generated_at', 'generated_by', 'generated_by_email', 'is_auto_generated', 'slack_sent']

    def get_generated_by_email(self, obj):
        return obj.generated_by.email if obj.generated_by else None


class TradingReportListSerializer(serializers.ModelSerializer):
    generated_by_email = serializers.SerializerMethodField()

    class Meta:
        model = TradingReport
        fields = [
            'id', 'period_type', 'period_start', 'period_end',
            'generated_at', 'generated_by_email', 'is_auto_generated', 'slack_sent',
        ]

    def get_generated_by_email(self, obj):
        return obj.generated_by.email if obj.generated_by else None


class TradingReportConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradingReportConfig
        fields = [
            'is_enabled', 'slack_webhook_url', 'slack_enabled',
            'auto_weekly', 'auto_monthly', 'weekly_day', 'monthly_day',
        ]
        
class AdminClientPaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientPaymentMethod
        fields = [
            "id",
            "client",
            "payment_type",
            "paypal_email",
            "rise_email",
            "bank_account_name",
            "bank_account_number",
            "iban",
            "swift_code",
            "bank_name",
            "bank_branch",
            "bank_country",
            "bank_currency",
            "crypto_type",
            "crypto_wallet_address",
            "is_default",
            "label",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "client"]

    def validate(self, attrs):
        # Determine effective payment_type for both create & update
        payment_type = attrs.get("payment_type") or getattr(self.instance, "payment_type", None)

        def req(field):
            val = attrs.get(field) if field in attrs else getattr(self.instance, field, None)
            if not val:
                raise serializers.ValidationError({field: "This field is required for this payment type."})

        # Minimal rules (extend as you like)
        if payment_type == "paypal":
            req("paypal_email")
        elif payment_type == "rise":
            req("rise_email")
        elif payment_type == "bank":
            req("bank_account_name")
            req("bank_account_number")
            req("bank_name")
            # IBAN/SWIFT optional depending on region; keep optional unless you want strict
        elif payment_type == "crypto":
            req("crypto_type")
            req("crypto_wallet_address")

        return attrs
    
class AdminAffiliateProfileCreateSerializer(serializers.ModelSerializer):
    # optional: let admin pass a custom referral code, otherwise model auto-generates
    referral_code = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = AffiliateProfile
        fields = ["referral_code", "approved", "website_url", "promotion_strategy", "manual_tier_override"]

    def validate_referral_code(self, value):
        if not value:
            return value
        if AffiliateProfile.objects.filter(referral_code=value).exists():
            raise serializers.ValidationError("Referral code already exists.")
        return value


# -------------------------------------------------------------------
# Release Serializers
# -------------------------------------------------------------------

class ReleaseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Release
        fields = [
            'id', 'title', 'description', 'version', 'release_date',
            'repos_affected', 'is_major', 'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return name or obj.created_by.username
        return None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ReleaseListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Release
        fields = [
            'id', 'title', 'version', 'release_date',
            'repos_affected', 'is_major', 'created_by_name',
            'created_at',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return name or obj.created_by.username
        return None

# -------------------------------------------------------------------
# Blog Serializers
# -------------------------------------------------------------------

class BlogCategoryAdminSerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()

    class Meta:
        model = BlogCategory
        fields = ['id', 'name', 'slug', 'description', 'sort_order', 'is_active', 'post_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_post_count(self, obj):
        return obj.posts.count()

    def validate_slug(self, value):
        from django.utils.text import slugify
        return slugify(value) if value else value

    def create(self, validated_data):
        from django.utils.text import slugify
        if not validated_data.get('slug'):
            validated_data['slug'] = slugify(validated_data['name'])
        return super().create(validated_data)


class BlogTagAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogTag
        fields = ['id', 'name', 'slug', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        from django.utils.text import slugify
        if not validated_data.get('slug'):
            validated_data['slug'] = slugify(validated_data['name'])
        return super().create(validated_data)


class BlogPostAdminSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    tag_names = serializers.SerializerMethodField()
    author_email = serializers.SerializerMethodField()
    tag_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False
    )

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'excerpt', 'content',
            'category', 'category_name', 'tags', 'tag_names', 'tag_ids',
            'featured_image', 'featured_image_alt',
            'meta_title', 'meta_description', 'focus_keyword', 'canonical_url',
            'author', 'author_email', 'author_display_name',
            'status', 'published_at',
            'reading_time_minutes', 'ai_generated', 'ai_metadata',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'tags']

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_tag_names(self, obj):
        return list(obj.tags.values_list('name', flat=True))

    def get_author_email(self, obj):
        return obj.author.email if obj.author else None

    def _calc_reading_time(self, content):
        import re
        text = re.sub(r'<[^>]+>', '', content or '')
        word_count = len(text.split())
        return max(1, round(word_count / 200))

    def create(self, validated_data):
        from django.utils.text import slugify
        tag_ids = validated_data.pop('tag_ids', [])

        if not validated_data.get('slug'):
            validated_data['slug'] = slugify(validated_data.get('title', ''))

        validated_data['reading_time_minutes'] = self._calc_reading_time(
            validated_data.get('content', '')
        )

        if not validated_data.get('author'):
            validated_data['author'] = self.context['request'].user

        post = super().create(validated_data)
        if tag_ids:
            post.tags.set(tag_ids)
        return post

    def update(self, instance, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)

        if 'content' in validated_data:
            validated_data['reading_time_minutes'] = self._calc_reading_time(
                validated_data['content']
            )

        post = super().update(instance, validated_data)
        if tag_ids is not None:
            post.tags.set(tag_ids)
        return post


class BlogPostListPublicSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    category_slug = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'excerpt',
            'featured_image', 'featured_image_alt',
            'category_name', 'category_slug',
            'author_display_name', 'published_at',
            'reading_time_minutes',
        ]

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_category_slug(self, obj):
        return obj.category.slug if obj.category else None


class BlogPostDetailPublicSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    category_slug = serializers.SerializerMethodField()
    tag_names = serializers.SerializerMethodField()
    related_posts = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'title', 'slug', 'excerpt', 'content',
            'featured_image', 'featured_image_alt',
            'category_name', 'category_slug', 'tag_names',
            'meta_title', 'meta_description', 'canonical_url',
            'author_display_name', 'published_at',
            'reading_time_minutes',
            'related_posts',
        ]

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_category_slug(self, obj):
        return obj.category.slug if obj.category else None

    def get_tag_names(self, obj):
        return list(obj.tags.values_list('name', flat=True))

    def get_related_posts(self, obj):
        qs = BlogPost.objects.filter(
            status='published',
            category=obj.category,
        ).exclude(id=obj.id).order_by('-published_at')[:3]
        return BlogPostListPublicSerializer(qs, many=True).data


class BlogCategoryPublicSerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()

    class Meta:
        model = BlogCategory
        fields = ['id', 'name', 'slug', 'description', 'post_count']

    def get_post_count(self, obj):
        return obj.posts.filter(status='published').count()


# -------------------------------------------------------------------
# WeMeet Booking Serializers
# -------------------------------------------------------------------

class MeetingAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingAvailability
        fields = ['id', 'day_of_week', 'start_time', 'end_time', 'is_active']
        read_only_fields = ['id']


class MeetingDateOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingDateOverride
        fields = ['id', 'date', 'is_blocked', 'start_time', 'end_time']
        read_only_fields = ['id']


class MeetingProfileSerializer(serializers.ModelSerializer):
    """Full profile serializer for admin CRUD."""
    availabilities = MeetingAvailabilitySerializer(many=True, read_only=True)
    user_name = serializers.SerializerMethodField()
    booking_url = serializers.SerializerMethodField()

    class Meta:
        model = MeetingProfile
        fields = [
            'id', 'user', 'slug', 'headline', 'bio',
            'durations_offered', 'default_duration', 'timezone',
            'buffer_minutes', 'max_days_ahead', 'min_notice_hours', 'is_active',
            'google_calendar_connected', 'google_calendar_id',
            'availabilities', 'user_name', 'booking_url',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.username

    def get_booking_url(self, obj):
        from django.conf import settings
        return f"{getattr(settings, 'MEET_URL', 'https://meet.we-fund.com')}/{obj.slug}"


class MeetingProfilePublicSerializer(serializers.ModelSerializer):
    """Public-facing serializer: no tokens or internal fields."""
    user_name = serializers.SerializerMethodField()
    user_profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = MeetingProfile
        fields = [
            'slug', 'headline', 'bio', 'durations_offered',
            'default_duration', 'timezone', 'max_days_ahead',
            'user_name', 'user_profile_picture',
        ]

    def get_user_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.username

    def get_user_profile_picture(self, obj):
        return obj.user.profile_picture or ''


class MeetingBookingSerializer(serializers.ModelSerializer):
    """Admin view of bookings with all fields."""
    host_name = serializers.SerializerMethodField()

    class Meta:
        model = MeetingBooking
        fields = [
            'id', 'meeting_profile', 'guest_name', 'guest_email',
            'guest_notes', 'start_time', 'end_time', 'duration_minutes',
            'timezone', 'status', 'daily_room_name', 'daily_room_url',
            'host_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_host_name(self, obj):
        name = f"{obj.meeting_profile.user.first_name} {obj.meeting_profile.user.last_name}".strip()
        return name or obj.meeting_profile.user.username


class MeetingBookingCreateSerializer(serializers.Serializer):
    """Public booking creation serializer."""
    guest_name = serializers.CharField(max_length=200)
    guest_email = serializers.EmailField()
    guest_notes = serializers.CharField(required=False, allow_blank=True, default='')
    start_time = serializers.DateTimeField()
    duration_minutes = serializers.IntegerField()
    timezone = serializers.CharField(max_length=50)

    def validate_duration_minutes(self, value):
        if value not in [15, 30, 60]:
            raise serializers.ValidationError("Duration must be 15, 30, or 60 minutes.")
        return value


class AdminMeetingBookingCreateSerializer(serializers.Serializer):
    """Admin-initiated booking creation serializer."""
    guest_name = serializers.CharField(max_length=200)
    guest_email = serializers.EmailField()
    guest_notes = serializers.CharField(required=False, allow_blank=True, default='')
    start_time = serializers.DateTimeField()
    duration_minutes = serializers.IntegerField()
    timezone = serializers.CharField(max_length=50)
    send_email = serializers.BooleanField(default=True)

    def validate_duration_minutes(self, value):
        if value not in [15, 30, 60]:
            raise serializers.ValidationError("Duration must be 15, 30, or 60 minutes.")
        return value


class MeetingBookingPublicSerializer(serializers.ModelSerializer):
    """Public view of a booking (for confirmation/room pages)."""
    host_name = serializers.SerializerMethodField()
    host_profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = MeetingBooking
        fields = [
            'id', 'guest_name', 'guest_email', 'start_time', 'end_time',
            'duration_minutes', 'timezone', 'status',
            'daily_room_url', 'host_name', 'host_profile_picture',
            'created_at',
        ]

    def get_host_name(self, obj):
        name = f"{obj.meeting_profile.user.first_name} {obj.meeting_profile.user.last_name}".strip()
        return name or obj.meeting_profile.user.username

    def get_host_profile_picture(self, obj):
        return obj.meeting_profile.user.profile_picture or ''


# ── Leaderboard Management ──────────────────────────────────────────

class AdminLeaderboardTraderSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source='id', read_only=True)
    full_name = serializers.SerializerMethodField()
    has_live_account = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'user_id',
            'email',
            'full_name',
            'leaderboard_display_name',
            'hidden_from_leaderboard',
            'has_live_account',
            'profile_picture',
        ]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_has_live_account(self, obj):
        return ChallengeEnrollment.objects.filter(
            client=getattr(obj, 'client_profile', None),
            status='live_in_progress',
            is_active=True,
        ).exists()


class AdminLeaderboardTraderUpdateSerializer(serializers.Serializer):
    hidden_from_leaderboard = serializers.BooleanField(required=False)
    leaderboard_display_name = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True,
    )


# ─── Email Template & Log Serializers ────────────────────────────────────────

from wefund.models import EmailTemplate, EmailLog


class EmailTemplateSerializer(serializers.ModelSerializer):
    last_modified_by_email = serializers.SerializerMethodField()

    class Meta:
        model = EmailTemplate
        fields = '__all__'
        read_only_fields = ['template_path', 'created_at', 'updated_at', 'last_modified_by']

    def get_last_modified_by_email(self, obj):
        return obj.last_modified_by.email if obj.last_modified_by else None


class EmailLogSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = EmailLog
        fields = '__all__'
        read_only_fields = [f.name for f in EmailLog._meta.fields]

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None


class AutoRewardRuleSerializer(serializers.ModelSerializer):
    grants_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = AutoRewardRule
        fields = [
            'id', 'title', 'description', 'trigger_type', 'threshold',
            'reward_amount', 'is_active', 'grants_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'grants_count', 'created_at', 'updated_at']

    def get_grants_count(self, obj):
        return obj.grants.count()
