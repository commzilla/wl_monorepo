from django.contrib.auth import authenticate, get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework import status, permissions, viewsets, response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import TraderCreateSerializer, TraderListSerializer, ChallengeProductSerializer, ChallengeSerializer, ChallengePhaseSerializer, ChallengeEnrollmentListSerializer, ClientKYCListSerializer, WooOrderSerializer, OrderSerializer, UserProfileSerializer, TraderPayoutSerializer, Certificate2Serializer, PayoutConfigurationSerializer, AdminNotificationSerializer, ChallengePhaseOptionSerializer, TraderPayoutComplianceAnalysisSerializer, PayoutPolicySerializer, PayoutSplitTierSerializer, MigrationLogSerializer, MT5DailySnapshotSerializer, CertificateTemplateSerializer, ChallengeEnrollmentDropdownSerializer, ActivityLogSerializer, ActivityLogDetailSerializer, MT5MigrationLogSerializer, WeCoinWalletSerializer, AssignReferralCodeSerializer, ScheduledNotificationSerializer, WeCoinsBetaAccessAdminSerializer, StopLossChangeSerializer
from django_countries import countries
from django.db import IntegrityError
from rest_framework.generics import ListAPIView
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from wefund.models import ClientProfile, ChallengeProduct, ChallengeEnrollment, ClientKYC, Order, Challenge, ChallengePhase, Certificate, TraderPayout, PayoutConfiguration, Notification, SoftBreach, BreachHistory, AffiliateReferral, AffiliatePayout, AffiliateClick, EnrollmentAccount, EATradingBotRequest, AffiliateCommissionTier, EnrollmentEvent, ChallengePhaseGroupMapping, EnrollmentTransitionLog, TraderPayoutComplianceAnalysis, InternalNote, PayoutPolicy, PayoutSplitTier, MigrationLog, ClientPaymentMethod, MT5DailySnapshot, ImpersonationLog, CertificateTemplate, PayoutConfigImportLog, GeneratedPasswordLog, MTActionPanelLogs, ActivityLog, MT5MigrationLog, RewardTask, RewardSubmission, WeCoinWallet, WeCoinTransaction, RedeemItem, AffiliateProfile, AffiliateCustomCommission, AffiliateWalletTransaction, ScheduledNotification, BetaFeatureAccess, StopLossChange, EventLog, Redemption, BetaFeature, TradingReport, TradingReportConfig, AutoRewardRule
from rest_framework import generics, filters
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from django.utils import timezone as dj_timezone
import threading
import logging
import random
import json
from uuid import UUID
from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import ClientTokenObtainPairSerializer
from .services.mt5_client import MT5Client
from .services.email_service import EmailService
from .utils.security import generate_mt5_compliant_password
from rest_framework import viewsets
from wefund.models import Offer, MT5Trade
from .serializers import OfferSerializer, TraderDetailSerializer, MT5TradeSerializer, SoftBreachSerializer, HardBreachSerializer, EATradingBotRequestSerializer, AffiliateCommissionTierSerializer, CRMAffiliateUserSerializer, OrderAffiliateSerializer, TraderPayoutActionSerializer, ChallengeEnrollmentCRUDSerializer, ClientDropdownSerializer, EnrollmentEventSerializer, ChallengePhaseGroupMappingSerializer, EnrollmentTransitionLogSerializer, ClientKYCSerializer, SuperUserProfileSerializer, SuperUserPasswordChangeSerializer, AdminUserSerializer, EnPayoutConfigurationSerializer, CertificateManualCreateSerializer, PayoutCertificateManualCreateSerializer, RewardTaskSerializer, RewardSubmissionSerializer, RedeemItemSerializer, AssignAffiliateTierSerializer, TopAffiliateSerializer, EventLogSerializer, AutoRewardRuleSerializer
from .permissions import HasPermission
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, DateTimeFromToRangeFilter, DateTimeFilter, DateFromToRangeFilter, CharFilter
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from .utils.certificate_generator import generate_and_upload_certificate
from django.utils.timezone import now
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponseForbidden, JsonResponse
from datetime import datetime, date, timezone
from datetime import timedelta
from zoneinfo import ZoneInfo
import django_filters
import base64
import io
from django.shortcuts import render
from PIL import Image, ImageDraw, ImageFont
import os
from rest_framework.pagination import PageNumberPagination
from collections import defaultdict
from django.db.models import Count, Case, When, IntegerField, Sum, Q, Avg, DecimalField, Value
from django.db.models.functions import Coalesce
from .serializers import (
    AdminAffiliateDashboardSerializer,
    AdminAffiliateUserSerializer,
    AdminTopAffiliateSerializer,
    AdminRecentReferralSerializer,
    AdminAffiliateClicksSerializer,
    AdminAffiliateWalletSerializer,
    AdminAffiliateWalletTransactionSerializer,
    AdminAffiliateReferralSerializer,
    AdminAffiliatePayoutSerializer,
    TraderPayoutAdminDetailSerializer,
    MigrationCSVSerializer,
    InternalNoteSerializer,
    PeriodicTaskSerializer,
)
from django.core.mail import send_mail
from wefund.risk.utils import disable_trading
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from rest_framework_simplejwt.exceptions import InvalidToken
from wefund.mt5_controller.utils import fetch_all_groups
import csv, io, uuid
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from django.db.models import F, ExpressionWrapper, DurationField
from django.utils.crypto import get_random_string
import smtplib
from django.core.mail import EmailMessage, get_connection
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import update_session_auth_hash
import pytz
from wefund.risk.utils import activate_trading
from django_celery_beat.models import PeriodicTask, IntervalSchedule, CrontabSchedule
from wefund.mt5_controller.utils import fetch_user_balance, fetch_user_equity
import secrets
import string
import hmac
import hashlib
from wefund.mt5_controller.utils import fetch_ip_summary, fetch_accounts_by_ip
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from wefund.integrations.rise.engine import invite_user_via_rise
from wefund.compliance.engine import generate_compliance_analysis
from wefund.generate_ai_payout_analysis import generate_ai_payout_analysis
from django.utils.decorators import method_decorator
import copy
from wefund.mt5_controller.utils import fetch_user_closed_trades
from django.db import transaction
from api.utils.payout_certificate_generator import generate_and_upload_payout_certificate
from wefund.integrations.social_media.discord_notifier import send_payout_certificate_to_discord
from wefund.integrations.social_media.telegram_notifier import send_payout_certificate_to_telegram
from django.core.validators import validate_email
from django.http import Http404
from .serializers import (
    AffiliateProfileSerializer,
    AffiliateReferralSerializer,
    AffiliatePayoutSerializer,
    AffiliateWalletSerializer,
    AffiliateWalletTransactionSerializer,
    AffiliateCustomCommissionSerializer,
)
from wefund.tasks.schedule_notification import deliver_scheduled_notification
from backend.celery import app
from django.utils.dateparse import parse_datetime
from django.utils.dateparse import parse_date
from wefund.event_logger import log_event, log_engine_event
from .serializers import RedeemItemSummarySerializer, RedemptionListSerializer, RedemptionActionSerializer, BetaFeatureSerializer, ChallengePayoutAnalyticsSerializer, CompetitionsBetaAccessAdminSerializer, ResetTokenConfigSerializer, ResetTokenReadSerializer, ResetTokenActionSerializer
from .utils.bunnycdn import upload_to_bunnycdn
from .analytics.challenge_payouts import get_challenge_payout_analytics
from .analytics.account_size_payouts import get_account_size_payout_analytics
from .analytics.country_payouts import get_country_wise_payout_analytics
from .analytics.unprofitable_countries import get_unprofitable_countries_analytics
from .analytics.risk_core_metrics import get_risk_core_metrics
from .analytics.trends import get_trends_analytics
from .analytics.trader_behavior_analytics import get_trader_behavior_analytics
from .analytics.order_pass_breach_analytics import get_order_pass_breach_analytics
from .serializers import AccountSizePayoutAnalyticsSerializer, CountryPayoutAnalyticsSerializer, UnprofitableCountryAnalyticsSerializer, EnrollmentEventLogSerializer, ManualUpgradeSerializer, AIRiskAnalysisSerializer, AIRiskReviewFeedbackSerializer, AIAnalysisWithFeedbackSerializer, AITrainingExampleSerializer
from wefund.risk.utils import get_open_trades
from wefund.risk.rules.inactivity import get_phase_start_date
from wefund.challenges.engine import handle_transition
from wefund.risk_v2.engine import run_risk_scan_for_payout
from .serializers import RiskScanRequestSerializer, PayoutAIAnalysisSerializer, CompetitionSerializer, AdminCompetitionListSerializer, AdminCompetitionRegistrationSerializer, AdminCompetitionLeaderboardSerializer, LiveCompetitionLeaderboardSerializer, ConvertAffiliateToClientSerializer, EconomicEventSerializer, EconomicCalendarSyncScheduleSerializer
from wefund.ai_analysis.orchestrator import run_payout_ai_analysis
from wefund.risk_v2.engine import attach_report_to_payout
from wefund.models import RiskScanReport, PayoutAIAnalysis, Competition, CompetitionStatusLog, CompetitionRegistration, CompetitionRankingSnapshot, AIRiskAnalysis, AIRiskReviewFeedback, EconomicEvent, EconomicCalendarSyncSchedule, ResetToken, ResetTokenConfig
from wefund.services.consistency_engine import WeFundConsistencyEngine
from django.http import HttpResponse
from django.core.paginator import Paginator
from wefund.ai_risk.engine import AIRiskEngine, AIRiskEngineError
import mimetypes
from django.http import FileResponse
from wefund.ai_risk.report_engine import generate_payout_risk_report
from api.utils.time import now_gmt2_naive
from api.utils.competition_finalize import (
    build_final_leaderboard_rows,
    prize_for_rank,
    save_final_snapshots,
)
from .filters import OrderExportFilter
from django.db.models import QuerySet
from django.http import StreamingHttpResponse
from dataclasses import dataclass
from typing import Deque, Dict, List, Optional, Set, Tuple
from collections import defaultdict, deque
from .serializers import CopyTradingDetectRequestSerializer, FindSimilarAccountsRequestSerializer, HedgingDetectRequestSerializer, HedgingFindSimilarRequestSerializer, AdminClientPaymentMethodSerializer, AdminAffiliateProfileCreateSerializer

User = get_user_model()

class SuperuserJWTLoginView(APIView):
    """
    Superuser login endpoint.
    Allows login with email or username.
    Returns JWT tokens on success.
    """

    def post(self, request):
        identifier = request.data.get("username")  # username or email
        password = request.data.get("password")

        if not identifier or not password:
            return Response(
                {"error": "Username/email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Lookup user case-insensitively
        try:
            user = User.objects.get(Q(username__iexact=identifier) | Q(email__iexact=identifier))
        except User.DoesNotExist:
            return Response({"error": "Invalid username/email or password."},
                            status=status.HTTP_401_UNAUTHORIZED)

        # Authenticate using username
        user = authenticate(username=user.username, password=password)

        if not user or not (user.is_superuser or user.is_staff):
            return Response(
                {"error": "Invalid username/email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)

        log_event(
            request=request,
            user=user,
            category="security",
            event_type="admin_login_success",
            metadata={
                "ip": request.META.get("REMOTE_ADDR"),
                "user_agent": request.headers.get("User-Agent"),
            },
            description=f"CRM user {user.email} logged into admin panel."
        )

        # Build permissions list
        permissions_list = user.get_all_permissions_list()
        if user.is_superuser and not permissions_list:
            from wefund.rbac_models import Permission
            permissions_list = list(Permission.objects.values_list("codename", flat=True))

        role_name = None
        role_slug = None
        if user.rbac_role:
            role_name = user.rbac_role.name
            role_slug = user.rbac_role.slug

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_superuser": user.is_superuser,
            "permissions": permissions_list,
            "role_name": role_name,
            "role_slug": role_slug,
        })
        
class AdminTokenRefreshView(TokenRefreshView):
    """
    Refresh JWT tokens only for staff/superuser.
    Requires ROTATE_REFRESH_TOKENS=True and BLACKLIST_AFTER_ROTATION=True
    """

    serializer_class = TokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except InvalidToken:
            raise InvalidToken("Invalid or expired refresh token.")

        validated_data = serializer.validated_data
        access = validated_data.get("access")
        new_refresh = validated_data.get("refresh")

        # Decode refresh token to check user
        refresh_obj = self.get_serializer().token_class(new_refresh)
        user_id = refresh_obj.get("user_id")
        user = User.objects.filter(id=user_id).first()

        if not user or not (user.is_staff or user.is_superuser):
            raise PermissionDenied("Only admins can refresh here.")

        return Response({
            "access": access,
            "refresh": new_refresh,  # ⚠️ Always replace on frontend
        })        
        
class CountryListView(APIView):
    """
    Returns all country codes and names. No authentication required.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response([
            {"code": code, "name": name} for code, name in list(countries)
        ])        

class AddTraderView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['traders.add']

    def post(self, request):
        serializer = TraderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = serializer.save()
            password = getattr(user, "_plain_password", None)  # comes from serializer

            # --- Log Event ---
            log_event(
                request=request,
                user=user,
                category="account",
                event_type="account_created",
                metadata={"created_by_admin": request.user.id},
                description=f"Trader account created by admin ({request.user.email})"
            )

            # --- Frontend URL fallback if not in settings ---
            frontend_url = getattr(settings, "FRONTEND_URL", "https://dashboard.we-fund.com")

            # --- Send HTML email only ---
            context = {
                "full_name": user.get_full_name(),
                "email": user.email,
                "password": password,
                "login_url": f"{frontend_url}/login",
            }
            subject = "WeFund | Your Platform Login Credentials"
            html_message = EmailService.render_template("emails/crm/trader_credentials.html", context)

            send_mail(
                subject=subject,
                message="",  # no plain text
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
            )
            EmailService.log_email(subject, user.email, body_html=html_message,
                                   category='admin', user=user)

        except IntegrityError:
            return Response(
                {"error": "A trader with that email or profile already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"message": "Trader created successfully", "id": str(user.id)},
            status=status.HTTP_201_CREATED,
        )
        
class TraderListView(generics.ListAPIView):
    serializer_class = TraderListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['kyc_status',]
    search_fields = ['user__first_name', 'user__last_name', 'user__email']

    def get_queryset(self):
        return ClientProfile.objects.select_related('user').filter(user__role='client')

class ResetTraderPasswordView(APIView):
    """
    Superuser-only view to reset a trader's password and email new credentials.
    """
    permission_classes = [HasPermission]
    required_permissions = ['traders.reset_password']

    def post(self, request, *args, **kwargs):
        user_id = request.data.get("user_id")
        email = request.data.get("email")

        if not user_id and not email:
            return Response(
                {"error": "Please provide either user_id or email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Get the user ---
        if user_id:
            user = get_object_or_404(User, id=user_id, role="client")
        else:
            user = get_object_or_404(User, email=email, role="client")

        # --- Generate new random password ---
        alphabet = string.ascii_letters + string.digits
        password = "".join(secrets.choice(alphabet) for _ in range(10))

        # --- Update password ---
        user.set_password(password)
        user.save()

        # Log Event
        log_event(
            request=request,
            user=user,
            category="account",
            event_type="password_changed",
            metadata={
                "reset_by_admin_id": str(request.user.id),
                "reset_by_admin_email": request.user.email,
                "reset_for_user_id": str(user.id),
                "reset_for_user_email": user.email,
            },
            description=f"Password reset for trader by admin ({request.user.email})"
        )

        # --- Frontend URL fallback ---
        frontend_url = getattr(settings, "FRONTEND_URL", "https://dashboard.we-fund.com")

        # --- Send HTML email ---
        context = {
            "full_name": user.get_full_name(),
            "email": user.email,
            "password": password,
            "login_url": f"{frontend_url}/login",
        }
        subject = "WeFund | Your Password Has Been Reset"
        html_message = EmailService.render_template("emails/crm/reset_password.html", context)

        send_mail(
            subject=subject,
            message="",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
        )
        EmailService.log_email(subject, user.email, body_html=html_message,
                               category='admin', user=user)

        return Response(
            {"message": f"Password reset successfully for {user.email} and emailed."},
            status=status.HTTP_200_OK,
        )


class ResetAffiliatePasswordView(APIView):
    """
    Admin-only view to reset an affiliate's password and email new credentials.
    """
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.reset_password']

    def post(self, request, *args, **kwargs):
        user_id = request.data.get("user_id")
        email = request.data.get("email")

        if not user_id and not email:
            return Response(
                {"error": "Please provide either user_id or email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user_id:
            user = get_object_or_404(User, id=user_id, role="affiliate")
        else:
            user = get_object_or_404(User, email=email, role="affiliate")

        alphabet = string.ascii_letters + string.digits
        password = "".join(secrets.choice(alphabet) for _ in range(10))

        user.set_password(password)
        user.save()

        log_event(
            request=request,
            user=user,
            category="account",
            event_type="password_changed",
            metadata={
                "reset_by_admin_id": str(request.user.id),
                "reset_by_admin_email": request.user.email,
                "reset_for_user_id": str(user.id),
                "reset_for_user_email": user.email,
            },
            description=f"Password reset for affiliate by admin ({request.user.email})"
        )

        frontend_url = getattr(settings, "FRONTEND_URL", "https://dashboard.we-fund.com")

        context = {
            "full_name": user.get_full_name(),
            "email": user.email,
            "password": password,
            "login_url": f"{frontend_url}/login",
        }
        subject = "WeFund | Your Password Has Been Reset"
        html_message = EmailService.render_template("emails/crm/reset_password.html", context)

        send_mail(
            subject=subject,
            message="",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
        )
        EmailService.log_email(subject, user.email, body_html=html_message,
                               category='admin', user=user)

        return Response(
            {"message": f"Password reset successfully for {user.email} and emailed."},
            status=status.HTTP_200_OK,
        )


class GenerateTraderPasswordView(APIView):
    """
    Superuser-only view to generate a secure random password,
    assign it to a trader, and log a masked version for auditing.
    """
    permission_classes = [HasPermission]
    required_permissions = ['traders.reset_password']

    def post(self, request, *args, **kwargs):
        user_id = request.data.get("user_id")
        email = request.data.get("email")

        if not user_id and not email:
            return Response(
                {"error": "Please provide either user_id or email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Get the user ---
        if user_id:
            user = get_object_or_404(User, id=user_id, role="client")
        else:
            user = get_object_or_404(User, email=email, role="client")

        # --- Generate password ---
        length = int(request.data.get("length", 10))
        alphabet = string.ascii_letters + string.digits
        password = "".join(secrets.choice(alphabet) for _ in range(length))

        # --- Update user password ---
        user.set_password(password)
        user.save()

        # --- Masked version for DB log ---
        masked_password = (
            password[:2] + "*" * (length - 4) + password[-2:] if length > 4 else "*" * length
        )

        # --- Log generation ---
        GeneratedPasswordLog.objects.create(
            admin=request.user,
            generated_password=masked_password,
            length=length,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        # ✅ Log in EventLog (auditable + dashboard visible)
        log_event(
            request=request,
            user=user,
            category="account",
            event_type="password_changed",
            metadata={
                "masked_password": masked_password,
                "generated_by_admin_id": str(request.user.id),
                "generated_by_admin_email": request.user.email,
                "length": length,
            },
            description=f"Password generated and reset by admin ({request.user.email})."
        )

        return Response(
            {
                "user": user.email,
                "password": password,
                "message": f"Password generated and set for {user.email}."
            },
            status=status.HTTP_200_OK,
        )

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]
        return request.META.get("REMOTE_ADDR") 
    
class TenPerPagePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

class TraderViewSet(viewsets.ModelViewSet):
    permission_classes = [HasPermission]
    required_permissions = ['traders.view']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['kyc_status']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'challenge_enrollments__mt5_account_id']
    ordering_fields = ['user__date_joined', 'user__first_name', 'user__email', 'kyc_status']
    ordering = ['-user__date_joined']  # most recent users first

    pagination_class = TenPerPagePagination
    lookup_field = 'user_id'

    def get_queryset(self):
        return ClientProfile.objects.select_related('user') \
            .prefetch_related('challenge_enrollments') \
            .filter(user__role='client')

    def get_serializer_class(self):
        if self.action == 'list':
            return TraderListSerializer
        return TraderDetailSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = instance.user

        # Log BEFORE deletion
        log_event(
            request=request,
            user=user,
            category="admin",
            event_type="admin_action",
            metadata={"deleted_user_id": str(user.id), "deleted_email": user.email},
            description=f"Trader account deleted by admin ({request.user.email})"
        )

        # Perform delete
        self.perform_destroy(instance)
        user.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)    
    
class ChallengeProductViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD for ChallengeProduct.
    """
    queryset = ChallengeProduct.objects.all().order_by('-created_at')
    serializer_class = ChallengeProductSerializer
    permission_classes = [HasPermission]
    required_permissions = ['challenges.view']
    
class ChallengeViewSet(viewsets.ModelViewSet):
    queryset = Challenge.objects.all()
    serializer_class = ChallengeSerializer
    permission_classes = [HasPermission]
    required_permissions = ['challenges.view']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            self.required_permissions = ['challenges.view']
        elif self.action == 'create':
            self.required_permissions = ['challenges.create']
        elif self.action == 'destroy':
            self.required_permissions = ['challenges.delete']
        else:
            self.required_permissions = ['challenges.create']
        return [HasPermission()]

    def perform_create(self, serializer):
        request = self.request
        challenge = serializer.save()

        log_event(
            request=request,
            user=request.user,
            category="challenge",
            event_type="challenge_created",
            metadata={
                "challenge_id": str(challenge.id),
                "name": challenge.name,
                "step_type": challenge.step_type,
            },
            description=f"Admin ({request.user.email}) created challenge '{challenge.name}'."
        )

    def perform_update(self, serializer):
        request = self.request
        instance = self.get_object()

        before = {
            "name": instance.name,
            "step_type": instance.step_type,
            "is_active": instance.is_active,
        }

        challenge = serializer.save()

        after = {
            "name": challenge.name,
            "step_type": challenge.step_type,
            "is_active": challenge.is_active,
        }

        if before != after:
            log_event(
                request=request,
                user=request.user,
                category="challenge",
                event_type="challenge_updated",
                metadata={"before": before, "after": after},
                description=f"Admin ({request.user.email}) updated challenge '{challenge.name}'."
            )

    def perform_destroy(self, instance):
        request = self.request
        challenge_name = instance.name
        challenge_id = str(instance.id)

        instance.delete()

        log_event(
            request=request,
            user=request.user,
            category="challenge",
            event_type="challenge_deleted",
            metadata={"challenge_id": challenge_id, "name": challenge_name},
            description=f"Admin ({request.user.email}) deleted challenge '{challenge_name}'."
        )

class ChallengePhaseViewSet(viewsets.ModelViewSet):
    queryset = ChallengePhase.objects.select_related("challenge").all()
    serializer_class = ChallengePhaseSerializer
    permission_classes = [HasPermission]
    required_permissions = ['challenges.view']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            self.required_permissions = ['challenges.view']
        elif self.action == 'destroy':
            self.required_permissions = ['challenges.delete']
        else:
            self.required_permissions = ['challenges.create']
        return [HasPermission()]

    def perform_create(self, serializer):
        request = self.request
        phase = serializer.save()

        log_event(
            request=request,
            user=request.user,
            category="challenge",
            event_type="challenge_phase_created",
            metadata={
                "phase_id": str(phase.id),
                "challenge_id": str(phase.challenge.id),
                "phase_type": phase.phase_type,
            },
            description=f"Admin ({request.user.email}) created phase ({phase.get_phase_type_display()}) for challenge {phase.challenge.name}."
        )

    def perform_update(self, serializer):
        request = self.request
        instance = self.get_object()

        before = {
            "phase_type": instance.phase_type,
            "trading_period": instance.trading_period,
            "min_trading_days": instance.min_trading_days,
            "max_daily_loss": instance.max_daily_loss,
            "max_loss": instance.max_loss,
            "profit_target": instance.profit_target,
        }

        phase = serializer.save()

        after = {
            "phase_type": phase.phase_type,
            "trading_period": phase.trading_period,
            "min_trading_days": phase.min_trading_days,
            "max_daily_loss": phase.max_daily_loss,
            "max_loss": phase.max_loss,
            "profit_target": phase.profit_target,
        }

        if before != after:
            log_event(
                request=request,
                user=request.user,
                category="challenge",
                event_type="challenge_phase_updated",
                metadata={"before": before, "after": after},
                description=f"Admin ({request.user.email}) updated phase ({phase.get_phase_type_display()}) for challenge {phase.challenge.name}."
            )

    def perform_destroy(self, instance):
        request = self.request
        phase_info = f"{instance.get_phase_type_display()} (ID {instance.id})"
        challenge_name = instance.challenge.name

        instance.delete()

        log_event(
            request=request,
            user=request.user,
            category="challenge",
            event_type="challenge_phase_deleted",
            metadata={
                "phase_id": str(instance.id),
                "challenge": challenge_name,
            },
            description=f"Admin ({request.user.email}) deleted phase {phase_info} from challenge {challenge_name}."
        )
                

class ChallengePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

class ChallengeEnrollmentListView(generics.ListAPIView):
    """
    Admin-only list of all challenge enrollments with challenge details and phases.
    Includes overview of Total, Active, Live, and Failed challenges (optimized).
    Ordered by most recent first.
    """
    queryset = ChallengeEnrollment.objects.select_related(
        'client__user',
        'challenge'
    ).prefetch_related('challenge__phases').order_by('-created_at')
    
    serializer_class = ChallengeEnrollmentListSerializer
    permission_classes = [HasPermission]
    required_permissions = ['enrollments.view']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'challenge__id', 'challenge__step_type', 'mt5_account_id', 'accounts__mt5_account_id']
    search_fields = [
        'client__user__first_name',
        'client__user__last_name',
        'client__user__email',
        'challenge__name',
        'mt5_account_id',
        'accounts__mt5_account_id',
    ]
    pagination_class = ChallengePagination

    def list(self, request, *args, **kwargs):
        # Apply filters and search
        queryset = self.filter_queryset(self.get_queryset())

        # Optimized overview counts in a single query
        overview_counts = queryset.aggregate(
            total_challenges=Count('id'),
            active=Count(
                Case(
                    When(status__in=[
                        'phase_1_in_progress',
                        'phase_1_passed',
                        'phase_2_in_progress',
                        'phase_2_passed'
                    ], then=1),
                    output_field=IntegerField()
                )
            ),
            live=Count(
                Case(
                    When(status='live_in_progress', then=1),
                    output_field=IntegerField()
                )
            ),
            failed=Count(
                Case(
                    When(status='failed', then=1),
                    output_field=IntegerField()
                )
            )
        )

        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'overview': overview_counts,
                'results': serializer.data
            })

        # If pagination is disabled or not applied
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'overview': overview_counts,
            'results': serializer.data
        })    

class ClientKYCViewSet(viewsets.ModelViewSet):
    queryset = ClientKYC.objects.select_related('client__user', 'operator').all()
    serializer_class = ClientKYCSerializer
    permission_classes = [HasPermission]
    required_permissions = ['kyc.view']

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'rise_invite_sent', 'rise_invite_accepted', 'operator']
    search_fields = ['client__user__first_name', 'client__user__last_name', 'client__user__email']
    ordering_fields = ['created_at', 'updated_at', 'status']
    ordering = ['-created_at']

    def perform_update(self, serializer):
        instance = self.get_object()

        # Snapshot before change
        before = {
            "status": instance.status,
            "rise_invite_sent": instance.rise_invite_sent,
            "rise_invite_accepted": instance.rise_invite_accepted,
            "operator": instance.operator.get_full_name() if instance.operator else None,
            "rise_api_response": instance.rise_api_response,
        }

        updated_instance = serializer.save(operator=self.request.user)

        # Snapshot after change
        after = {
            "status": updated_instance.status,
            "rise_invite_sent": updated_instance.rise_invite_sent,
            "rise_invite_accepted": updated_instance.rise_invite_accepted,
            "operator": updated_instance.operator.get_full_name() if updated_instance.operator else None,
            "rise_api_response": updated_instance.rise_api_response,
        }

        # If no changes, skip logging
        if before != after:
            log_event(
                request=self.request,
                user=updated_instance.client.user,
                category="kyc",
                event_type="kyc_updated",
                metadata={
                    "admin_id": str(self.request.user.id),
                    "admin_email": self.request.user.email,
                    "before": before,
                    "after": after,
                },
                description=f"KYC updated by admin ({self.request.user.email})"
            )

        return updated_instance
    
class ClientKYCListView(generics.ListAPIView):
    """
    Admin: List all client KYC sessions with search & filters
    """
    queryset = ClientKYC.objects.select_related('client__user').all()
    serializer_class = ClientKYCListSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    
    # Filter by status (pending, approved, rejected, etc.)
    filterset_fields = ['status']
    # Search by name, email, or session ID
    search_fields = [
        'client__user__first_name',
        'client__user__last_name',
        'client__user__email',
        'session_id',
    ]    
    
logger = logging.getLogger(__name__)
    
class WooCommerceOrderWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        # --- Verify WooCommerce signature ---
        signature = request.headers.get("X-WC-Webhook-Signature")
        if not signature:
            logger.warning("Missing WooCommerce webhook signature")
            return HttpResponseForbidden("Missing signature")

        try:
            secret = settings.WC_WEBHOOK_SECRET.encode("utf-8")
            body = request.body  # raw bytes
            expected = base64.b64encode(
                hmac.new(secret, body, hashlib.sha256).digest()
            ).decode("utf-8")
        except Exception as e:
            logger.exception("Error verifying WooCommerce webhook")
            return HttpResponseForbidden("Signature verification error")

        if not hmac.compare_digest(signature, expected):
            logger.error("Invalid WooCommerce webhook signature")
            return HttpResponseForbidden("Invalid signature")

        # --- At this point request is verified ---
        logger.info("WooCommerce webhook verified")

        serializer = WooOrderSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("Invalid Woo payload: %s", serializer.errors)
            return JsonResponse(serializer.errors, status=400)

        order = serializer.save()
        order.raw_data = request.data
        order.save(update_fields=["raw_data"])

        # MT5 account creation
        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        # Prepare payload (same as before, including secure generated passwords)
        # assuming `app_password` and `mt5_password` were generated/stored in serializer.create()
        user = order.user
        # Generate passwords
        user_password = generate_mt5_compliant_password().strip()
        mt5_password = generate_mt5_compliant_password().strip()
        investor_password = generate_mt5_compliant_password().strip()

        logger.warning(f"Generated passwords -> User: {user_password}, MT5: {mt5_password}, Investor: {investor_password}")


        # Set user's password
        user.set_password(user_password)
        user.save(update_fields=["password"])
        
        try:
            profile_id = user.clientprofile.profile_id
        except (AttributeError, ClientProfile.DoesNotExist):
            profile_id = ""
            
        def get_account_size_from_line_items(line_items):
            for item in line_items:
                meta_data = item.get("meta_data", [])
                for meta in meta_data:
                    if meta.get("key") == "pa_account-size":
                        raw_value = str(meta.get("value", "")).replace(",", "").replace("$", "").strip()
                        try:
                            account_size = float(raw_value)
                            logger.info(f"Extracted account size: {account_size}")
                            return account_size
                        except (ValueError, TypeError):
                            logger.warning(f"Could not parse account size value: {raw_value}")
                            return 0.0
            logger.warning("pa_account-size not found in any line_items")
            return 0.0



        # Extract account size from meta_data (WooCommerce sends this in the payload)
        line_items = request.data.get("line_items", [])
        account_size = get_account_size_from_line_items(line_items)
        
        # Find the active enrollment linked to this order
        enrollment = ChallengeEnrollment.objects.filter(order=order, is_active=True).first()
        mt5_group_name = settings.MT5_GROUP_NAME  # fallback

        if enrollment:
            current_phase_type = enrollment.get_current_phase_type()
            try:
                challenge_phase = ChallengePhase.objects.get(
                    challenge=enrollment.challenge,
                    phase_type=current_phase_type
                )
                mapping = challenge_phase.group_mapping
                mt5_group_name = mapping.mt5_group
            except (ChallengePhase.DoesNotExist, ChallengePhaseGroupMapping.DoesNotExist):
                logger.warning(f"No group mapping found for {enrollment.challenge} - {current_phase_type}, using default")
    

        mt5_payload = [{
        "index": 0,
        "agentAccount": settings.MT5_AGENT_ACCOUNT,
        "canTrade": True,
        "comment": "Created from WooCommerce order",
        "group": {"name": mt5_group_name},
        "hasSendReportEnabled": True,
        "isEnabled": True,
        "leverage": settings.MT5_LEVERAGE,
        "password": mt5_password,
        "investorPassword": investor_password,
        "enable_change_password": True,
        "password_phone": user.phone or "",
        "id": profile_id,
        "status": "RE",
        "user_color": settings.MT5_USER_COLOR,
        "pltAccount": {
            "taxes": settings.MT5_TAX_RATE,
            "balance": account_size
        },
        "user": {
            "address": {
                "address": order.billing_address.get("address_line_1", ""),
                "city": order.billing_address.get("city", ""),
                "state": order.billing_address.get("state", ""),
                "zipcode": order.billing_address.get("postcode", ""),
                "country": order.billing_address.get("country", "")
            },
            "name": order.customer_name,
            "email": order.customer_email,
            "phone": order.billing_address.get("phone", "")
        }
    }]


        # 🔹 Log the MT5 payload before sending
        logger.debug("MT5 payload being sent: %s", mt5_payload)

        mt5_response = mt5_client.add_user(mt5_payload)
        logger.info("MT5 AddUser response: %s", mt5_response)

        # 🔹 Log failure clearly if MT5 creation fails
        if mt5_response.get("systemErrorStatus") or mt5_response.get("applicationStatus"):
            logger.error("MT5 account creation failed: %s", mt5_response)

        # Extract and store MT5 account ID
        elem = (mt5_response.get("array") or [{}])[0]
        mt5_account_id = elem.get("accountID")
        if mt5_account_id:
            order.mt5_account_id = mt5_account_id
            order.save(update_fields=["mt5_account_id"])
            
        # 🔐 Save all MT5 and user credentials to Order
        order.mt5_payload_sent = mt5_payload
        order.mt5_response = mt5_response
        order.mt5_account_id = mt5_account_id
        order.mt5_password = mt5_password
        order.mt5_investor_password = investor_password
        order.plaintext_password = user_password
        order.save(update_fields=[
            "mt5_payload_sent",
            "mt5_response",
            "mt5_account_id",
            "mt5_password",
            "mt5_investor_password",
            "plaintext_password"
        ])
        # === 🆕 Update only ChallengeEnrollments linked to this Order ===
        try:
            challenge_enrollments = ChallengeEnrollment.objects.filter(order=order, is_active=True, mt5_account_id__isnull=True)
            for enrollment in challenge_enrollments:
                enrollment.mt5_account_id = mt5_account_id
                enrollment.mt5_password = mt5_password
                enrollment.mt5_investor_password = investor_password
                enrollment.broker_type = "mt5"
                enrollment.save(update_fields=[
                    "mt5_account_id",
                    "mt5_password",
                    "mt5_investor_password",
                    "broker_type",
                    "updated_at"
                ])
                logger.info(f"MT5 details stored for ChallengeEnrollment: {enrollment.id}")
        except Exception as e:
            logger.exception(f"Failed to update ChallengeEnrollment MT5 fields for order {order.id}: {str(e)}")
        

        email_context = {
        'username': user.username,
        'password': user_password,
        'mt5_login': mt5_account_id,
        'mt5_password': mt5_password,
        }
        EmailService.send_user_credentials(
            to_email=user.email,
            subject="WeFund | Your Account & MT5 Login Details",
            context=email_context
        )

        return Response({"detail": "Order processed", "order_id": order.id}, status=status.HTTP_201_CREATED)
        
# === Pagination Class ===
class OrderPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

# === Custom FilterSet for Orders ===
class OrderFilter(FilterSet):
    start_date = DateTimeFilter(field_name="date_created", lookup_expr='gte')
    end_date = DateTimeFilter(field_name="date_created", lookup_expr='lte')

    class Meta:
        model = Order
        fields = ['status', 'payment_status', 'payment_method', 'start_date', 'end_date']

# === Admin Order List with Filtered Overview + Date Range ===
class AdminOrderListView(generics.ListAPIView):
    """
    Admin view to list, search, and filter orders with pagination.
    Returns overview stats that respect current filters/search including date range.
    """
    queryset = Order.objects.all().order_by('-date_created')
    serializer_class = OrderSerializer
    permission_classes = [HasPermission]
    required_permissions = ['orders.view']
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['customer_name', 'customer_email', 'product_name', 'coupon_codes', 'woo_order_id', 'woo_order_number', 'mt5_account_id']
    ordering_fields = ['date_created', 'order_total_usd', 'paid_usd']
    filterset_class = OrderFilter
    pagination_class = OrderPagination

    def list(self, request, *args, **kwargs):
        # Apply search, filters, and date range
        filtered_qs = self.filter_queryset(self.get_queryset())

        # === Overview calculations based on filtered queryset ===
        overview = filtered_qs.aggregate(
            total_orders=Count('id'),
            total_revenue=Sum('order_total_usd'),
            total_discounts=Sum('coupons_discount_usd'),
            completed_orders=Count('id', filter=Q(status='completed'))
        )

        # === Paginated orders ===
        page = self.paginate_queryset(filtered_qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'overview': overview,
                'orders': serializer.data
            })

        serializer = self.get_serializer(filtered_qs, many=True)
        return Response({
            'overview': overview,
            'orders': serializer.data
        })
    
class AdminOrderDeleteView(generics.DestroyAPIView):
    """
    Admin view to delete a specific order.
    """
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [HasPermission]
    required_permissions = ['orders.delete']
    lookup_field = 'id'  # assuming you are using 'id' as the primary key     
    
class OrderAffiliateDetailView(generics.RetrieveAPIView):
    """
    GET: Fetch current affiliate assigned to an order
    """
    queryset = Order.objects.all()
    permission_classes = [HasPermission]
    required_permissions = ['orders.view']

    def get(self, request, *args, **kwargs):
        order = self.get_object()
        if order.affiliate:
            data = {
                "referral_code": order.referral_code,
                "affiliate_user_id": order.affiliate.user.id,
                "affiliate_username": order.affiliate.user.username,
            }
        else:
            data = {
                "referral_code": None,
                "affiliate_user_id": None,
                "affiliate_username": None,
            }
        return response.Response(data)

class OrderAffiliateAssignView(generics.UpdateAPIView):
    """
    POST: Assign an affiliate to an order and create referral commission
    """
    queryset = Order.objects.all()
    permission_classes = [HasPermission]
    required_permissions = ['orders.view']
    serializer_class = OrderAffiliateSerializer

    def post(self, request, *args, **kwargs):
        order = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        affiliate_profile = serializer.validated_data['affiliate_user_id']

        # Update order
        order.affiliate = affiliate_profile
        order.referral_code = affiliate_profile.referral_code
        order.save(update_fields=['affiliate', 'referral_code'])

        # Avoid duplicate commission
        existing_referral = AffiliateReferral.objects.filter(
            affiliate=affiliate_profile,
            referred_user=order.user,
            challenge_name=order.challenge_name
        ).first()

        if not existing_referral:
            commission_rate = affiliate_profile.current_tier.commission_rate if affiliate_profile.current_tier else 0
            commission_amount = (Decimal(order.total_usd) * Decimal(commission_rate) / 100).quantize(Decimal('0.01'))

            AffiliateReferral.objects.create(
                affiliate=affiliate_profile,
                referred_user=order.user,
                challenge_name=order.challenge_name,
                commission_amount=commission_amount,
                commission_status='pending',
            )

        return response.Response({
            "message": "Affiliate assigned successfully",
            "affiliate_user_id": affiliate_profile.user.id,
            "commission_amount": str(commission_amount)
        }, status=status.HTTP_200_OK)
    
User = get_user_model()

class UserProfileView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    lookup_field = 'id'  # userId in URL will match UUID primary key

    def get_queryset(self):
        # Staff with RBAC role or superusers can see all profiles
        user = self.request.user
        if user.is_superuser or (user.is_staff and user.rbac_role):
            return User.objects.all()
        return User.objects.filter(id=user.id)

    def check_object_permissions(self, request, obj):
        is_crm_staff = request.user.is_superuser or (request.user.is_staff and request.user.rbac_role)
        if request.user != obj and not is_crm_staff:
            self.permission_denied(request, message="Cannot access another user's profile.")
        return super().check_object_permissions(request, obj)
    
class MyProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
logger = logging.getLogger(__name__)

class OfferViewSet(viewsets.ModelViewSet):
    queryset = Offer.objects.all().order_by('-created_at')
    serializer_class = OfferSerializer
    permission_classes = [HasPermission]
    required_permissions = ['orders.view']
    parser_classes = [MultiPartParser, FormParser]  # for image upload

    def create(self, request, *args, **kwargs):
        logger.debug("Incoming offer create request")

        # Print keys for debug
        logger.debug(f"Request data: {request.data}")
        logger.debug(f"Request FILES: {request.FILES}")

        try:
            response = super().create(request, *args, **kwargs)
            logger.debug(f"Offer created successfully with image URL: {response.data.get('feature_image')}")
            return response
        except Exception as e:
            logger.exception("Error while creating offer with feature image")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    def destroy(self, request, *args, **kwargs):
        offer = self.get_object()

        before = {
            "id": str(offer.id),
            "title": offer.title,
            "start_date": str(offer.start_date),
            "end_date": str(offer.end_date),
            "coupon_count": offer.coupons.count(),
            "is_active": offer.is_active,
        }

        # Log before deleting
        log_event(
            request=request,
            user=request.user,
            category="offer",
            event_type="offer_deleted",
            metadata={"offer": before},
            description=f"Admin ({request.user.email}) deleted offer '{offer.title}'."
        )

        return super().destroy(request, *args, **kwargs)    
    
class MT5AccountListView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['trades.view']

    def get(self, request):
        account_ids = (
            MT5Trade.objects.order_by('account_id')
            .values_list('account_id', flat=True)
            .distinct()
        )
        return Response(account_ids)
    
class MT5TradeFilter(FilterSet):
    open_time = DateTimeFromToRangeFilter()
    close_time = DateTimeFromToRangeFilter()

    class Meta:
        model = MT5Trade
        fields = ['account_id', 'symbol', 'open_time', 'close_time']

class AccountPagination(PageNumberPagination):
    page_size = 10  # 10 accounts per page
    page_size_query_param = 'page_size'
    max_page_size = 50

class MT5TradeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MT5TradeSerializer
    permission_classes = [HasPermission]
    required_permissions = ['trades.view']
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = MT5TradeFilter
    search_fields = ['symbol', 'comment', 'order']
    ordering_fields = ['open_time', 'close_time', 'profit']
    ordering = ['-close_time']
    pagination_class = AccountPagination

    def get_queryset(self):
        return MT5Trade.objects.all()

    def list(self, request, *args, **kwargs):
        search_value = request.query_params.get("search", "").strip()

        # ----- PRIORITY ORDER-ID SEARCH (avoids SearchFilter) -----
        if search_value.isdigit():
            trade = MT5Trade.objects.filter(order=search_value).first()
            if trade:
                grouped_data = [
                    {
                        "account_id": trade.account_id,
                        "trades": MT5TradeSerializer([trade], many=True).data
                    }
                ]
                # IMPORTANT FIX: DO NOT PAGINATE THIS
                return Response(grouped_data)

            return Response([])

        # ----- NORMAL FLOW (use DRF filters) -----
        queryset = self.filter_queryset(self.get_queryset())

        # Step 1: list available accounts
        account_ids = (
            queryset
            .values_list("account_id", flat=True)
            .distinct()
            .order_by("account_id")
        )

        # Step 2: paginate accounts
        page = self.paginate_queryset(account_ids)
        if page is None:
            page = account_ids

        # Step 3: fetch trades for those accounts (after filtering)
        trades_qs = (
            queryset
            .filter(account_id__in=page)
            .order_by("-close_time")
        )

        # Step 4: group by account
        grouped = defaultdict(list)
        for t in trades_qs:
            grouped[t.account_id].append(t)

        # Step 5: build response
        grouped_data = [
            {
                "account_id": acc,
                "trades": MT5TradeSerializer(grouped[acc], many=True).data
            }
            for acc in page
        ]

        return self.get_paginated_response(grouped_data)

class MT5AccountTradesViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Superuser-only view to inspect all trades for a single MT5 account.
    Usage: /api/mt5-trades/<account_id>/trades/
    """
    serializer_class = MT5TradeSerializer
    permission_classes = [HasPermission]
    required_permissions = ['trades.view']
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class = MT5TradeFilter
    search_fields = ['symbol', 'comment']
    ordering_fields = ['open_time', 'close_time', 'profit']
    ordering = ['-close_time']
    pagination_class = AccountPagination

    def get_queryset(self):
        account_id = self.kwargs.get("account_id")
        return MT5Trade.objects.filter(account_id=account_id).order_by('-close_time')
    
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def issue_certificate_view(request, enrollment_id):
    """
    Issues a certificate for a completed challenge enrollment.
    """
    enrollment = get_object_or_404(
        ChallengeEnrollment.objects.select_related("client__user"),
        id=enrollment_id,
        client__user=request.user
    )

    trader_name = enrollment.client.user.get_full_name() or enrollment.client.user.username

    urls = generate_and_upload_certificate(
        trader_name=trader_name,
        issue_date=enrollment.completed_date or enrollment.live_start_date or None
    )

    cert = Certificate.objects.create(
        user=enrollment.client.user,
        enrollment=enrollment,
        certificate_type="phase_pass",
        title=f"{enrollment.challenge.name} Passed – ${enrollment.account_size:,}",
        image_url=urls["image_url"],
        pdf_url=urls["pdf_url"],
    )

    return Response({
        "message": "Certificate issued",
        "image_url": cert.image_url,
        "pdf_url": cert.pdf_url,
    })

# Pagination: 10 items per page
class PayoutResultsSetPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100
    
class TraderPayoutFilter(FilterSet):
    date = DateFromToRangeFilter(field_name='requested_at', label='Requested Date (From/To)')
    status = CharFilter(field_name='status', lookup_expr='iexact')
    trader_email = CharFilter(field_name='trader__email', lookup_expr='icontains')
    trader_username = CharFilter(field_name='trader__username', lookup_expr='icontains')

    class Meta:
        model = TraderPayout
        fields = ['status', 'trader_email', 'trader_username', 'date']    
    
class TraderPayoutViewSet(viewsets.ModelViewSet):
    queryset = TraderPayout.objects.all()
    serializer_class = TraderPayoutSerializer
    permission_classes = [HasPermission]
    required_permissions = ['payouts.view']
    pagination_class = PayoutResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = TraderPayoutFilter
    search_fields = ['trader__username', 'trader__email', 'challenge_enrollment__id', 'challenge_enrollment__mt5_account_id']
    ordering_fields = ['requested_at', 'amount', 'net_profit', 'status']

    def perform_update(self, serializer):
        instance = serializer.save()
        status = instance.status

        if status == 'approved' and not instance.reviewed_at:
            instance.reviewed_at = now()
        elif status == 'paid' and not instance.paid_at:
            instance.paid_at = now()
        instance.save()

    def list(self, request, *args, **kwargs):
    # Apply filters and order by newest first
        base_qs = self.filter_queryset(
            self.get_queryset().order_by('-requested_at')
        )

        # Clone queryset before aggregation to avoid re-evaluation issues
        overview_qs = base_qs.all()

        # Overview stats (full filtered queryset, ignoring pagination)
        overview = overview_qs.aggregate(
            total_count=Count('id'),
            total_amount=Sum('amount'),
            total_profit=Sum('profit'),
            total_net_profit=Sum('net_profit'),
            total_profit_share=Sum('profit_share'),
            total_pending_payout=Sum('amount', filter=Q(status__in=['pending', 'extended_review'])),
            total_rejected_amount=Sum('amount', filter=Q(status='rejected')),
            total_approved_profit=Sum('profit', filter=Q(status='approved')),
            total_approved_net_profit=Sum('net_profit', filter=Q(status='approved')),
        )

        # ✅ Status-wise counts (computed from fresh queryset to avoid aggregation side-effects)
        status_counts = (
            overview_qs.values('status')
            .annotate(count=Count('id'))
            .order_by()
        )
        overview['status_counts'] = {
            item['status']: item['count'] for item in status_counts
        }

        # Pagination
        page = self.paginate_queryset(base_qs)
        serializer = self.get_serializer(page, many=True) if page is not None else self.get_serializer(base_qs, many=True)

        # Flattened response
        response_data = {
            'overview': overview,
            'results': serializer.data
        }

        if page is not None:
            return self.get_paginated_response(response_data)
        return Response(response_data)

def handle_payout_limit_check(payout, request=None):
    """
    After a payout is approved, check if the enrollment has reached the
    maximum number of paid payouts allowed by its PayoutPolicy.
    If so, close the account (set status to payout_limit_reached).
    """
    enrollment = payout.challenge_enrollment
    if not enrollment:
        return

    policy = getattr(enrollment.challenge, 'payout_policy', None)
    if not policy or policy.max_payouts == 0:
        return  # unlimited

    approved_count = enrollment.payouts.filter(status='approved').count()
    if approved_count < policy.max_payouts:
        return

    # --- Limit reached: close the account ---
    previous_status = enrollment.status
    enrollment.status = 'payout_limit_reached'
    enrollment.is_active = False
    enrollment.save(update_fields=['status', 'is_active', 'updated_at'])

    # Disable MT5 trading (overrides the re-enable that just happened on approval)
    account_id = enrollment.mt5_account_id
    if account_id:
        try:
            mt5 = MT5Client(api_url=settings.MT5_API_URL, api_key=settings.MT5_API_KEY)
            mt5.disable_trading(account_id)
        except Exception as e:
            logger.error(f"[PAYOUT LIMIT] Failed to disable MT5 trading for {account_id}: {e}")

    # Calculate total paid out
    from django.db.models import Sum
    total_paid = enrollment.payouts.filter(
        status='approved'
    ).aggregate(total=Sum('released_fund'))['total'] or 0

    # In-app notification
    Notification.objects.create(
        user=payout.trader,
        title="Funded Account Closed — Payout Limit Reached",
        message=(
            f"Your funded account (MT5 #{account_id or 'N/A'}) has reached the maximum "
            f"of {policy.max_payouts} paid payouts. The account is now permanently closed. "
            f"Total paid out: ${total_paid:,.2f}. Thank you for trading with WeFund!"
        ),
        type='payout',
    )

    # Send notification email
    try:
        trader_name = payout.trader.first_name or payout.trader.username
        challenge_name = enrollment.challenge.name if enrollment.challenge else "N/A"
        email_context = {
            "trader_name": trader_name,
            "mt5_account_id": account_id or "N/A",
            "total_payouts": approved_count,
            "total_paid_amount": f"${total_paid:,.2f}",
            "max_payouts": policy.max_payouts,
            "challenge_name": challenge_name,
        }
        html_message = EmailService.render_template("emails/payout/payout_limit_reached.html", email_context)
        _subj = "WeFund | Your funded account has reached its payout limit"
        email = EmailMultiAlternatives(
            subject=_subj,
            body=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[payout.trader.email],
        )
        email.attach_alternative(html_message, "text/html")
        email.send()
        EmailService.log_email(_subj, payout.trader.email, body_html=html_message,
                               category='payout', user=payout.trader)
    except Exception as e:
        logger.error(f"[PAYOUT LIMIT] Failed to send email for payout {payout.id}: {e}")
        EmailService.log_email("WeFund | Your funded account has reached its payout limit",
                               payout.trader.email, category='payout',
                               user=payout.trader, status='failed', error_message=e)

    # Log event
    log_event(
        request=request,
        user=payout.trader,
        category="payout",
        event_type="payout_limit_reached",
        challenge_enrollment=enrollment,
        metadata={
            "payout_id": str(payout.id),
            "max_payouts": policy.max_payouts,
            "approved_count": approved_count,
            "total_paid": float(total_paid),
            "mt5_account_id": account_id,
        },
        description=(
            f"Enrollment {enrollment.id} reached payout limit "
            f"({approved_count}/{policy.max_payouts}). Account closed."
        ),
    )

    # Enrollment transition log
    EnrollmentTransitionLog.objects.create(
        enrollment=enrollment,
        from_status=previous_status,
        to_status='payout_limit_reached',
        reason=f"Reached maximum payouts ({approved_count}/{policy.max_payouts})",
        meta={
            "payout_id": str(payout.id),
            "total_paid": float(total_paid),
        },
    )


class TraderPayoutActionView(generics.UpdateAPIView):
    """
    Admin endpoint to approve, reject or put a payout under extended review.
    """
    queryset = TraderPayout.objects.all()
    serializer_class = TraderPayoutActionSerializer
    permission_classes = [HasPermission]
    required_permissions = ['payouts.approve']
    lookup_field = 'id'  # UUID

    def update(self, request, *args, **kwargs):
        payout = self.get_object()

        # Snapshot BEFORE changes
        before = {
            "status": payout.status,
            "net_profit": float(payout.net_profit or 0),
            "released_fund": float(payout.released_fund or 0),
            "exclude_amount": float(payout.exclude_amount or 0),
            "exclude_reason": payout.exclude_reason,
        }

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # --- Core & optional fields ---
        action_status = data['status']
        payout.admin_note = data.get('admin_note', payout.admin_note)
        payout.rejection_reason = data.get('rejection_reason', payout.rejection_reason)
        payout.reviewed_at = now_gmt2_naive()
        payout.is_custom_amount = data.get('is_custom_amount', payout.is_custom_amount)
        payout.exclude_amount = data.get('exclude_amount', payout.exclude_amount)
        payout.exclude_reason = data.get('exclude_reason', payout.exclude_reason)

        if action_status == 'extended_review':
            days = data.get('extension_business_days') or 10
            payout.set_extended_review(days)
            payout.released_fund = 0
            update_fields = [
                'status', 'admin_note', 'rejection_reason', 'reviewed_at',
                'is_custom_amount', 'exclude_amount', 'exclude_reason',
                'released_fund', 'extended_review_until', 'extended_review_days'
            ]
        else:
            payout.status = action_status
            if payout.status in ['approved', 'paid']:
                exclude = payout.exclude_amount or 0
                total_profit = payout.profit or 0
                profit_share = payout.profit_share or 0

                # Deduct exclusion before applying profit share
                exclude = payout.exclude_amount or 0
                net_profit = payout.net_profit or 0

                # Reduce released fund only, NEVER net_profit
                payout.released_fund = max(net_profit - exclude, 0)

                # Clear one-time custom withdrawal date so automatic cycle
                # logic takes over from this payout's date onward.
                payout_config = getattr(
                    payout.challenge_enrollment, "payout_config", None
                )
                if payout_config and payout_config.custom_next_withdrawal_datetime:
                    payout_config.custom_next_withdrawal_datetime = None
                    payout_config.save(update_fields=["custom_next_withdrawal_datetime"])
            else:
                payout.released_fund = 0
            update_fields = [
                'status', 'admin_note', 'rejection_reason', 'reviewed_at',
                'is_custom_amount', 'exclude_amount', 'exclude_reason',
                'released_fund'
            ]

        payout.save(update_fields=update_fields)

        # Snapshot AFTER changes
        after = {
            "status": payout.status,
            "net_profit": float(payout.net_profit or 0),
            "released_fund": float(payout.released_fund or 0),
            "exclude_amount": float(payout.exclude_amount or 0),
            "exclude_reason": payout.exclude_reason,
        }

        # ✅ Log Event (based on final status)
        if payout.status == "extended_review":
            event_type = "payout_extended"
            desc = f"Admin ({request.user.email}) extended payout review."
        elif payout.status == "approved":
            event_type = "payout_approved"
            desc = f"Admin ({request.user.email}) approved payout."
        elif payout.status == "rejected":
            event_type = "payout_rejected"
            desc = f"Admin ({request.user.email}) rejected payout."
        elif payout.status == "paid":
            event_type = "payout_paid"
            desc = f"Payout was paid out to trader."
        else:
            event_type = "payout_updated"
            desc = f"Admin ({request.user.email}) updated payout."

        log_event(
            request=request,
            user=payout.trader,
            category="payout",
            event_type=event_type,
            challenge_enrollment=payout.challenge_enrollment,
            metadata={
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "payout_id": str(payout.id),
                "amount": float(payout.amount),
                "before": before,
                "after": after,
            },
            description=desc
        )

        # Automatically generate payout certificate
        if payout.status == "approved":
            try:
                import uuid as uuid_mod
                cert_uuid = uuid_mod.uuid4()

                trader_name = payout.trader.get_full_name() or payout.trader.username
                issue_date = payout.reviewed_at or now_gmt2_naive()
                profit_text = f"${payout.released_fund:,.2f}"

                # QR code on certificate image is controlled by env var (default: off)
                qr_enabled = os.getenv("CERTIFICATE_QR_ENABLED", "false").lower() in ("true", "1", "yes")

                cert_data = generate_and_upload_payout_certificate(
                    trader_name=trader_name,
                    profit_share_text=profit_text,
                    issue_date=issue_date,
                    certificate_id=str(cert_uuid) if qr_enabled else None,
                )

                # Create certificate record in Certificate table
                cert = Certificate.objects.create(
                    id=cert_uuid,
                    user=payout.trader,
                    certificate_type="payout",
                    title=f"Payout Certificate - ${payout.released_fund:,.2f}",
                    enrollment=payout.challenge_enrollment,
                    payout=payout,
                    image_url=cert_data.get("image_url"),
                    pdf_url=cert_data.get("pdf_url"),
                    metadata={
                        "payout_id": str(payout.id),
                        "net_profit": float(payout.net_profit),
                        "released_fund": float(payout.released_fund),
                        "profit_share": float(payout.profit_share),
                        "generated_at": issue_date.strftime("%Y-%m-%d %H:%M:%S"),
                        "verification_url": f"https://dashboard.we-fund.com/verify/{cert_uuid}",
                    },
                )

                log_engine_event(
                    event_type="payout_certificate_generated",
                    engine="payout",
                    user=payout.trader,
                    challenge_enrollment=payout.challenge_enrollment,
                    metadata={
                        "payout_id": str(payout.id),
                        "certificate_id": str(cert.id),
                        "released_fund": float(payout.released_fund),
                        "image_url": cert_data.get("image_url"),
                        "pdf_url": cert_data.get("pdf_url"),
                    },
                    description=f"Payout certificate generated for {payout.trader.email} (Amount: ${payout.released_fund:,.2f})"
                )

                # Send to Discord
                send_payout_certificate_to_discord(
                    first_name=payout.trader.get_full_name(),
                    payout_amount=payout.released_fund,
                    certificate_url=cert_data.get("image_url"),
                    pdf_url=cert_data.get("pdf_url"),
                )

                # Send to Telegram
                send_payout_certificate_to_telegram(
                    first_name=payout.trader.get_full_name(),
                    payout_amount=payout.released_fund,
                    certificate_url=cert_data.get("image_url"),
                )

            except Exception as e:
                import logging
                logging.exception(f"[PAYOUT CERTIFICATE] Failed for payout {payout.id}: {e}")

        # --- Re-enable trading + refund amount when payout is rejected ---
        account_id = payout.challenge_enrollment.mt5_account_id

        if payout.status == "approved":
            # Re-enable trading only
            if account_id:
                mt5 = MT5Client(api_url=settings.MT5_API_URL, api_key=settings.MT5_API_KEY)
                mt5.activate_trading(account_id)

        elif payout.status == "rejected":
            # ✅ NO REFUND — Only re-enable trading
            if account_id:
                mt5 = MT5Client(
                    api_url=settings.MT5_API_URL,
                    api_key=settings.MT5_API_KEY
                )
                mt5.activate_trading(account_id)



        # --- Payout summary (used in email + response) ---
        payout_summary = {
            "trader_name": payout.trader.first_name,
            "amount": payout.amount,
            "status": payout.status.capitalize(),
            "admin_note": payout.admin_note or "",
            "rejection_reason": payout.rejection_reason or "",
            "reviewed_at": payout.reviewed_at.strftime("%Y-%m-%d %H:%M:%S") if payout.reviewed_at else "",
            "is_custom_amount": payout.is_custom_amount,
            "exclude_amount": payout.exclude_amount or 0,
            "exclude_reason": payout.exclude_reason or "",
            "net_profit": payout.net_profit,
            "released_fund": payout.released_fund,
        }

        # --- Select email template ---
        if payout.status == "approved":
            subject = "WeFund | Your payout has been sent"
            template = "emails/payout/payout_approved.html"
        elif payout.status == "rejected":
            subject = "WeFund | Payout request rejected"
            template = "emails/payout/payout_rejected.html"
        else:
            subject = "WeFund | Payout under Extended Review"
            template = "emails/payout/payout_request.html"  # fallback generic template

        html_message = EmailService.render_template(template, payout_summary)
        text_message = html_message  # fallback

        # --- Send Email ---
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[payout.trader.email],
        )
        email.attach_alternative(html_message, "text/html")
        email.send()
        EmailService.log_email(subject, payout.trader.email, body_html=html_message,
                               category='payout', user=payout.trader)

        # --- Auto-reward WeCoins milestone check ---
        if payout.status == 'approved':
            try:
                from api.services.auto_reward_service import check_and_grant_auto_rewards
                check_and_grant_auto_rewards(payout.trader, 'payout_approved')
            except Exception:
                import logging as _log
                _log.getLogger(__name__).exception(
                    f"Auto reward check failed for {payout.trader.email} after payout approval"
                )

        # --- Check payout limit after approval ---
        if payout.status == 'approved':
            handle_payout_limit_check(payout, request)

        return Response({
            "id": str(payout.id),
            "status": payout.status,
            "released_fund": float(payout.released_fund),
            "reviewed_at": payout.reviewed_at,
            "extended_review_until": payout.extended_review_until,
            "extended_review_days": payout.extended_review_days,
        }, status=status.HTTP_200_OK)


class TraderPayoutExtendReviewView(generics.UpdateAPIView):
    """
    Admin endpoint to extend payout review.
    Creates a notification and sends a custom email.
    """
    queryset = TraderPayout.objects.all()
    permission_classes = [HasPermission]
    required_permissions = ['payouts.approve']
    lookup_field = "id"

    def post(self, request, *args, **kwargs):
        payout = self.get_object()

        # Snapshot before (optional but useful)
        before = {
            "status": payout.status,
            "extended_review_until": str(payout.extended_review_until) if payout.extended_review_until else None,
            "extended_review_days": payout.extended_review_days,
        }

        # Parse business days safely
        try:
            days = int(request.data.get("extension_business_days") or 10)
        except (TypeError, ValueError):
            days = 10

        # Update payout record
        payout.set_extended_review(days)
        payout.reviewed_at = dj_timezone.now()
        payout.released_fund = 0
        payout.save(
            update_fields=[
                "status",
                "extended_review_until",
                "extended_review_days",
                "reviewed_at",
                "released_fund",
            ]
        )

        # Create in-app notification
        Notification.objects.create(
            user=payout.trader,
            type="payout",
            title="Payout Under Extended Review",
            message=(
                f"Your payout request of ${payout.amount} is currently under extended review. "
                f"Our team will complete verification within {days} business days."
            ),
            is_custom=True,
            action_url="/withdrawl",
        )

        # Send extended review email via EmailService
        EmailService.send_extended_review_email(payout.trader, payout, days)

        # EventLog: Payout Review Extended
        log_event(
            request=request,
            user=payout.trader,
            category="payout",
            event_type="payout_extended",
            challenge_enrollment=payout.challenge_enrollment,
            metadata={
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "payout_id": str(payout.id),
                "amount": float(payout.amount),
                "days_extended": days,
                "extended_review_until": str(payout.extended_review_until) if payout.extended_review_until else None,
                "before": before,
                "after": {
                    "status": payout.status,
                    "extended_review_until": str(payout.extended_review_until) if payout.extended_review_until else None,
                    "extended_review_days": payout.extended_review_days,
                },
            },
            description=f"Admin ({request.user.email}) placed payout under extended review for {days} business days."
        )

        return Response(
            {
                "id": str(payout.id),
                "status": payout.status,
                "extended_review_until": payout.extended_review_until,
                "extended_review_days": payout.extended_review_days,
            },
            status=status.HTTP_200_OK,
        )

        
class CertificatePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

class Certificate2ViewSet(viewsets.ModelViewSet):
    queryset = Certificate.objects.all()
    serializer_class = Certificate2Serializer
    permission_classes = [HasPermission]
    required_permissions = ['certificates.manage']
    pagination_class = CertificatePagination

    def perform_update(self, serializer):
        request = self.request
        instance = self.get_object()

        # Snapshot BEFORE
        before = {
            "title": instance.title,
            "certificate_type": instance.certificate_type,
            "image_url": instance.image_url,
            "pdf_url": instance.pdf_url,
            "issued_date": str(instance.issued_date) if instance.issued_date else None,
        }

        updated_instance = serializer.save()

        # Snapshot AFTER
        after = {
            "title": updated_instance.title,
            "certificate_type": updated_instance.certificate_type,
            "image_url": updated_instance.image_url,
            "pdf_url": updated_instance.pdf_url,
            "issued_date": str(updated_instance.issued_date) if updated_instance.issued_date else None,
        }

        # Only log if something actually changed
        if before != after:
            log_event(
                request=request,
                user=updated_instance.user,
                category="certificate",
                event_type="certificate_updated",
                challenge_enrollment=updated_instance.enrollment,
                metadata={
                    "certificate_id": str(updated_instance.id),
                    "before": before,
                    "after": after,
                    "admin_id": str(request.user.id),
                    "admin_email": request.user.email,
                },
                description=f"Certificate updated by admin ({request.user.email})."
            )

    def perform_destroy(self, instance):
        request = self.request

        # Capture metadata BEFORE delete (because instance will be gone afterwards)
        metadata = {
            "certificate_id": str(instance.id),
            "title": instance.title,
            "certificate_type": instance.certificate_type,
            "user_id": str(instance.user.id),
            "user_email": instance.user.email,
            "payout_id": str(instance.payout.id) if instance.payout else None,
        }

        # Log event BEFORE deletion
        log_event(
            request=request,
            user=instance.user,
            category="certificate",
            event_type="certificate_deleted",
            challenge_enrollment=instance.enrollment,
            metadata=metadata,
            description=f"Certificate deleted by admin ({request.user.email})."
        )

        instance.delete()
    
class PayoutConfigurationViewSet(viewsets.ModelViewSet):
    """
    Superuser-only CRUD for PayoutConfiguration (Challenge Enrollment based).
    Supports search and filters by client name, email, MT5 ID, and more.
    """
    queryset = (
        PayoutConfiguration.objects
        .select_related('client', 'enrollment', 'enrollment__challenge')
        .all()
    )
    serializer_class = PayoutConfigurationSerializer
    permission_classes = [HasPermission]
    required_permissions = ['payouts.view_config']

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'client__username',
        'client__email',
        'enrollment__mt5_account_id',
    ]
    filterset_fields = {
        'is_active': ['exact'],
        'config_type': ['exact'],
        'payment_cycle': ['exact'],
    }
    ordering_fields = ['created_at', 'updated_at', 'live_trading_start_date']
    ordering = ['-created_at']
    
    
def generate_certificate_image(
    *,
    trader_name: str,
    issue_date: datetime = None,
    base_image_path: str = None,
    font_path: str = None,
    name_font_size: int = 50,
    date_font_size: int = 36,
    name_x: int = 1200,
    name_y: int = 923,
    date_x: int = 400,
    date_y: int = 1359,
) -> Image.Image:

    if not base_image_path:
        base_image_path = os.path.join(settings.BASE_DIR, "static", "certificates", "Live Account Certificate.png")

    if not font_path:
        font_path = os.path.join(settings.BASE_DIR, "static", "fonts", "Roboto-Bold.ttf")

    issue_date = issue_date or timezone.now()
    date_str = issue_date.strftime("%B %d, %Y")

    base = Image.open(base_image_path).convert("RGBA")
    draw = ImageDraw.Draw(base)

    name_font = ImageFont.truetype(font_path, name_font_size)
    date_font = ImageFont.truetype(font_path, date_font_size)

    fill_color = (255, 255, 255, 255)
    draw.text((name_x, name_y), trader_name, font=name_font, fill=fill_color)
    draw.text((date_x, date_y), date_str, font=date_font, fill=fill_color)

    return base


def certificate_preview_view(request):
    # Render the HTML page with input fields
    return render(request, "certificates/preview_tool.html")


@csrf_exempt
def certificate_render_api(request):
    if request.method == "POST":
        data = request.POST

        trader_name = data.get("trader_name", "John Doe")
        issue_date_raw = data.get("issue_date")
        issue_date = datetime.strptime(issue_date_raw, "%Y-%m-%d") if issue_date_raw else datetime.now()

        name_x = int(data.get("name_x", 1200))
        name_y = int(data.get("name_y", 923))
        date_x = int(data.get("date_x", 400))
        date_y = int(data.get("date_y", 1359))

        img = generate_certificate_image(
            trader_name=trader_name,
            issue_date=issue_date,
            name_x=name_x,
            name_y=name_y,
            date_x=date_x,
            date_y=date_y
        )

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        base64_image = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return JsonResponse({"preview": f"data:image/png;base64,{base64_image}"})

    return JsonResponse({"error": "Only POST supported"}, status=405)

class NotificationPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


# ---------------------------
# Base ViewSet
# ---------------------------
class AdminNotificationBaseViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet for admin notifications.
    Enforces superuser access and logs all admin notification actions.
    """
    permission_classes = [HasPermission]
    required_permissions = ['notifications.manage']
    serializer_class = AdminNotificationSerializer
    pagination_class = NotificationPagination

    def perform_create(self, serializer):
        request = self.request
        notification = serializer.save()

        log_event(
            request=request,
            user=request.user,
            category="system",
            event_type="notification_created",
            metadata={
                "notification_id": str(notification.id),
                "title": notification.title,
                "is_global": notification.is_global,
                "is_custom": notification.is_custom,
                "target_user": notification.user.email if notification.user else None,
            },
            description=f"Admin ({request.user.email}) created notification"
        )

    def perform_update(self, serializer):
        request = self.request
        before = serializer.instance.__dict__.copy()
        notification = serializer.save()
        after = notification.__dict__.copy()

        if before != after:
            log_event(
                request=request,
                user=request.user,
                category="system",
                event_type="notification_updated",
                metadata={
                    "notification_id": str(notification.id),
                    "before": before,
                    "after": after,
                },
                description=f"Admin ({request.user.email}) updated notification"
            )

    def perform_destroy(self, instance):
        request = self.request

        log_event(
            request=request,
            user=request.user,
            category="system",
            event_type="notification_deleted",
            metadata={"notification_id": str(instance.id)},
            description=f"Admin ({request.user.email}) deleted notification"
        )

        instance.delete()


# ---------------------------
# Global Notifications
# ---------------------------
class GlobalNotificationViewSet(AdminNotificationBaseViewSet):
    """
    CRUD API for Global notifications (is_global=True, is_custom=False)
    """

    def get_queryset(self):
        return Notification.objects.filter(
            is_global=True,
            is_custom=False
        ).order_by('-created_at')

    def perform_create(self, serializer):
        """
        Global notification: will create a notification for all users.
        """
        serializer.save(is_global=True, is_custom=False)


# ---------------------------
# Custom Notifications
# ---------------------------
class CustomNotificationViewSet(AdminNotificationBaseViewSet):
    """
    CRUD API for Custom notifications (is_custom=True, is_global=False)
    """

    def get_queryset(self):
        return Notification.objects.filter(
            is_custom=True,
            is_global=False
        ).order_by('-created_at')

    def perform_create(self, serializer):
        """
        Custom notification: must have a target user
        """
        serializer.save(is_custom=True, is_global=False)


# ---------------------------
# All Notifications
# ---------------------------
class AllNotificationViewSet(AdminNotificationBaseViewSet):
    """
    CRUD API for all notifications, no filtering.
    """
    queryset = Notification.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        """
        Create notifications as-is; rely on provided flags
        """
        serializer.save()

class ScheduledNotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [HasPermission]
    required_permissions = ['notifications.manage']
    serializer_class = ScheduledNotificationSerializer
    queryset = ScheduledNotification.objects.all().order_by("-scheduled_for")

    def perform_create(self, serializer):
        request = self.request
        sn = serializer.save()

        log_event(
            request=request,
            user=request.user,
            category="system",
            event_type="scheduled_notification_created",
            metadata={"scheduled_id": str(sn.id), "scheduled_for": sn.scheduled_for},
            description=f"Admin ({request.user.email}) created scheduled notification"
        )

    def perform_update(self, serializer):
        request = self.request
        before = serializer.instance.__dict__.copy()
        sn = serializer.save()
        after = sn.__dict__.copy()

        if before != after:
            log_event(
                request=request,
                user=request.user,
                category="system",
                event_type="scheduled_notification_updated",
                metadata={"scheduled_id": str(sn.id), "before": before, "after": after},
                description=f"Admin ({request.user.email}) updated scheduled notification"
            )

    def perform_destroy(self, instance):
        request = self.request
        log_event(
            request=request,
            user=request.user,
            category="system",
            event_type="scheduled_notification_deleted",
            metadata={"scheduled_id": str(instance.id)},
            description=f"Admin ({request.user.email}) deleted scheduled notification"
        )
        instance.delete()

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        sn = self.get_object()
        # existing logic ...
        log_event(request, request.user, "system", "scheduled_notification_paused",
                  {"scheduled_id": str(sn.id)}, f"Admin ({request.user.email}) paused scheduled notification")
        return Response({"detail": "Notification paused successfully."})

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        sn = self.get_object()
        # existing logic ...
        log_event(request, request.user, "system", "scheduled_notification_resumed",
                  {"scheduled_id": str(sn.id)}, f"Admin ({request.user.email}) resumed scheduled notification")
        return Response({"detail": "Notification resumed successfully."})

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        sn = self.get_object()
        # existing logic ...
        log_event(request, request.user, "system", "scheduled_notification_cancelled",
                  {"scheduled_id": str(sn.id)}, f"Admin ({request.user.email}) cancelled scheduled notification")
        return Response({"detail": "Notification cancelled successfully."})
    
class NotificationImageUploadView(APIView):
    """
    POST /api/admin/notifications/upload-image/
    Upload an image file to BunnyCDN for use in notifications.
    Returns the public CDN URL.
    """
    permission_classes = [HasPermission]
    required_permissions = ['notifications.manage']
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        from api.utils.bunnycdn import upload_to_bunnycdn
        import uuid as _uuid

        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        if file.content_type not in allowed_types:
            return Response(
                {"error": f"Invalid file type: {file.content_type}. Allowed: JPEG, PNG, WebP, GIF"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.size > 5 * 1024 * 1024:
            return Response({"error": "File too large. Max 5MB."}, status=status.HTTP_400_BAD_REQUEST)

        ext = file.name.rsplit(".", 1)[-1].lower() if "." in file.name else "jpg"
        filename = f"notifications/{_uuid.uuid4().hex[:12]}.{ext}"

        try:
            url = upload_to_bunnycdn(file, filename)
            return Response({"url": url})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

class RiskDashboardOverviewView(generics.GenericAPIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def get(self, request, *args, **kwargs):
        total_soft = SoftBreach.objects.count()
        active_soft = SoftBreach.objects.filter(resolved=False).count()

        total_hard = BreachHistory.objects.exclude(rule="Breach Reverted").count()
        active_hard = BreachHistory.objects.exclude(rule="Breach Reverted").count()  # all are active except reverted

        reverted_total = BreachHistory.objects.filter(rule="Breach Reverted").count()

        return Response({
            "soft_breaches_total": total_soft,
            "soft_breaches_active": active_soft,
            "hard_breaches_total": total_hard,
            "hard_breaches_active": active_hard,
            "reverted_breaches_total": reverted_total,
        })

class RiskDashboardSoftBreachesView(generics.ListAPIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']
    pagination_class = StandardResultsSetPagination
    serializer_class = SoftBreachSerializer
    queryset = SoftBreach.objects.all().order_by("-detected_at")
    
class RiskDashboardHardBreachesView(generics.ListAPIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']
    pagination_class = StandardResultsSetPagination
    serializer_class = HardBreachSerializer
    queryset = BreachHistory.objects.exclude(rule="Breach Reverted").order_by("-breached_at")
    
class RiskDashboardRevertedBreachesView(generics.ListAPIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']
    pagination_class = StandardResultsSetPagination
    serializer_class = HardBreachSerializer
    queryset = BreachHistory.objects.filter(rule="Breach Reverted").order_by("-breached_at")    

class AdminAffiliateDashboardView(generics.GenericAPIView):
    """
    Main Admin Affiliate Dashboard:
    - Returns summary metrics, top affiliates, recent referrals,
      total clicks per affiliate, and paginated list of affiliates.
    """
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.view']

    def get(self, request, *args, **kwargs):
        # --- Summary Metrics ---
        total_affiliates = User.objects.filter(role='affiliate').count()
        total_commission = AffiliateReferral.objects.filter(
            commission_status='approved'
        ).aggregate(total=Sum('commission_amount'))['total'] or 0

        total_payout_requests = AffiliatePayout.objects.count()
        total_payouts = AffiliatePayout.objects.filter(
            status__in=['approved', 'paid']
        ).aggregate(total=Sum('amount'))['total'] or 0

        summary = {
            'total_affiliates': total_affiliates,
            'total_commission': total_commission,
            'total_payout_requests': total_payout_requests,
            'total_payouts': total_payouts,
        }

        # --- Top Affiliates by Commission ---
        top_affiliates_qs = User.objects.filter(role='affiliate').annotate(
        total_commission=Sum('affiliate_profile__referrals__commission_amount')
        ).order_by('-total_commission')[:5]
        top_affiliates = AdminTopAffiliateSerializer(top_affiliates_qs, many=True).data

        # --- Recent Referrals ---
        recent_referrals_qs = AffiliateReferral.objects.order_by('-date_referred')[:10]
        recent_referrals = AdminRecentReferralSerializer(recent_referrals_qs, many=True).data

        # --- Total Clicks per Affiliate ---
        clicks_qs = AffiliateClick.objects.values(
            'referral_code', 'referral_code'
        ).annotate(total_clicks=Count('id'))

        # Map referral_code → affiliate username
        affiliate_clicks_data = []
        for c in clicks_qs:
            try:
                affiliate_user = User.objects.get(affiliate_profile__referral_code=c['referral_code'])
                affiliate_clicks_data.append({
                    'affiliate_id': affiliate_user.id,
                    'affiliate_username': affiliate_user.username,
                    'total_clicks': c['total_clicks']
                })
            except User.DoesNotExist:
                continue

        # --- Paginated Affiliates List ---
        affiliates = User.objects.filter(role='affiliate').order_by('-created_at')
        status = request.GET.get('status')
        if status:
            affiliates = affiliates.filter(status=status)

        page = self.paginate_queryset(affiliates)
        if page is not None:
            affiliates_page = AdminAffiliateUserSerializer(page, many=True).data
            return self.get_paginated_response({
                'summary': summary,
                'top_affiliates': top_affiliates,
                'recent_referrals': recent_referrals,
                'affiliate_clicks': affiliate_clicks_data,
                'affiliates': affiliates_page
            })

        affiliates_page = AdminAffiliateUserSerializer(affiliates, many=True).data
        return Response({
            'summary': summary,
            'top_affiliates': top_affiliates,
            'recent_referrals': recent_referrals,
            'affiliate_clicks': affiliate_clicks_data,
            'affiliates': affiliates_page
        })
        
class AdminAffiliateWalletView(generics.RetrieveAPIView):
    """
    Admin view: Get affiliate's wallet balance and total earned.
    """
    serializer_class = AdminAffiliateWalletSerializer
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.view']

    def get_object(self):
        return self.request.user.affiliate_wallet

class AdminAffiliateWalletTransactionListView(generics.ListAPIView):
    """
    Admin view: List wallet transactions (commissions, payouts, adjustments).
    """
    serializer_class = AdminAffiliateWalletTransactionSerializer
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.view']

    def get_queryset(self):
        return self.request.user.affiliate_wallet.transactions.all()

class TenResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'  # Optional: allow client to override
    max_page_size = 100

class AffiliateReferralFilter(django_filters.FilterSet):
    # Related fields
    affiliate_user_id = django_filters.UUIDFilter(field_name='affiliate__user__id')
    affiliate_user_email = django_filters.CharFilter(
        field_name='affiliate__user__email', lookup_expr='iexact'
    )
    referred_username = django_filters.CharFilter(
        field_name='referred_user__username', lookup_expr='icontains'
    )

    # Date range
    referred_from = django_filters.DateFilter(field_name='date_referred', lookup_expr='gte')
    referred_to = django_filters.DateFilter(field_name='date_referred', lookup_expr='lte')

    class Meta:
        model = AffiliateReferral
        fields = [
            'commission_status',
            'affiliate_user_id',
            'affiliate_user_email',
            'referred_username',
            'referred_from',
            'referred_to',
        ]


class AdminAffiliateReferralViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD for AffiliateReferrals with search, filters, and totals.
    """
    serializer_class = AdminAffiliateReferralSerializer
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.view']
    queryset = AffiliateReferral.objects.all().order_by('-date_referred')
    pagination_class = TenResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'commission_status': ['exact'],
        'affiliate__user__id': ['exact'],
        'affiliate__user__email': ['exact'],
        'referred_user__id': ['exact'],
        'referred_user__email': ['exact'],
        'date_referred': ['date', 'gte', 'lte'],
    }
    search_fields = [
        'affiliate__user__first_name',
        'affiliate__user__last_name',
        'affiliate__user__email',
        'referred_user__first_name',
        'referred_user__last_name',
        'referred_user__email',
        'challenge_name',
        'note',
    ]
    ordering_fields = ['date_referred', 'commission_amount', 'commission_status']

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Calculate totals
        total_referrals = queryset.count()
        total_commission = queryset.aggregate(Sum('commission_amount'))['commission_amount__sum'] or 0
        status_breakdown = queryset.values('commission_status').annotate(
            count=Count('id'),
            total=Sum('commission_amount')
        )

        response = super().list(request, *args, **kwargs)
        response.data = {
            "summary": {
                "total_referrals": total_referrals,
                "total_commission": total_commission,
                "by_status": status_breakdown,
            },
            "results": response.data
        }
        return response

class AffiliatePayoutFilter(django_filters.FilterSet):
    # Related lookups
    affiliate_user_id = django_filters.UUIDFilter(field_name='affiliate__user__id')
    affiliate_user_email = django_filters.CharFilter(
        field_name='affiliate__user__email', lookup_expr='iexact'
    )

    # Date range
    processed_from = django_filters.DateFilter(field_name='processed_at', lookup_expr='gte')
    processed_to = django_filters.DateFilter(field_name='processed_at', lookup_expr='lte')

    class Meta:
        model = AffiliatePayout
        fields = [
            'status',
            'is_manual',
            'affiliate_user_id',
            'affiliate_user_email',
            'processed_from',
            'processed_to',
        ]


class AdminAffiliatePayoutViewSet(viewsets.ModelViewSet):
    serializer_class = AdminAffiliatePayoutSerializer
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.manage_payouts']
    queryset = AffiliatePayout.objects.all().order_by('-requested_at')
    pagination_class = TenResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = AffiliatePayoutFilter

    search_fields = [
        'affiliate__user__first_name',
        'affiliate__user__last_name',
        'affiliate__user__email',
    ]
    ordering_fields = ['requested_at', 'processed_at', 'status']

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Overview calculations
        total_payouts = queryset.aggregate(Sum('amount'))['amount__sum'] or 0
        approved_paid = queryset.filter(status__in=['approved', 'paid']).aggregate(
            Sum('amount')
        )['amount__sum'] or 0
        pending_payouts = queryset.filter(status='pending').aggregate(
            Sum('amount')
        )['amount__sum'] or 0
        status_breakdown = queryset.values('status').annotate(
            count=Count('id'),
            total=Sum('amount')
        )

        # Original paginated results
        response = super().list(request, *args, **kwargs)
        response.data = {
            "summary": {
                "total_payouts": total_payouts,
                "approved_paid": approved_paid,
                "pending_payouts": pending_payouts,
                "by_status": status_breakdown,
            },
            "results": response.data
        }
        return response
    
class TraderPayoutDetailView(generics.RetrieveAPIView):
    serializer_class = TraderPayoutAdminDetailSerializer
    permission_classes = [HasPermission]
    required_permissions = ['payouts.view']
    lookup_field = 'id'
    queryset = TraderPayout.objects.all()
    
    def get(self, request, *args, **kwargs):
        payout_id = kwargs.get('id')
        try:
            payout = TraderPayout.objects.get(id=payout_id)
        except TraderPayout.DoesNotExist:
            return Response({"error": "Payout not found"}, status=404)
        
        serializer = self.get_serializer(payout)
        return Response(serializer.data)
    

# Helper for relative time
def humanize_time(dt):
    delta = now() - dt
    seconds = delta.total_seconds()
    if seconds < 60:
        return "less than a minute ago"
    elif seconds < 3600:
        mins = int(seconds // 60)
        return f"{mins} minute{'s' if mins>1 else ''} ago"
    elif seconds < 86400:
        hours = int(seconds // 3600)
        return f"{hours} hour{'s' if hours>1 else ''} ago"
    else:
        days = int(seconds // 86400)
        return f"{days} day{'s' if days>1 else ''} ago"

# Map enrollment status to human-readable phase
STATUS_PHASE_MAPPING = {
    'phase_1_in_progress': 'Phase 1 In Progress',
    'phase_1_passed': 'Passed Phase 1',
    'phase_2_in_progress': 'Phase 2 In Progress',
    'phase_2_passed': 'Passed Phase 2',
    'live_in_progress': 'Live - In Progress',
    'completed': 'Completed',
    'failed': 'Failed',
    'payout_limit_reached': 'Payout Limit Reached',
}

class AdminDashboardAPIView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['dashboard.view']

    def get(self, request, *args, **kwargs):
        # === User Metrics ===
        total_users = User.objects.filter(role="client").count()

        # === Challenge Metrics ===
        total_challenges = ChallengeEnrollment.objects.count()
        phase_1_count = ChallengeEnrollment.objects.filter(status__startswith="phase_1").count()
        phase_2_count = ChallengeEnrollment.objects.filter(status__startswith="phase_2").count()
        live_count = ChallengeEnrollment.objects.filter(status="live_in_progress").count()

        # === Payout Metrics ===
        payouts_qs = TraderPayout.objects.all()
        total_payouts_count = payouts_qs.count()
        total_payouts_amount = payouts_qs.aggregate(total=Sum("amount"))["total"] or 0

        # Payouts grouped by status
        payouts_status_wise = {
            status: payouts_qs.filter(status=status).count()
            for status, _ in TraderPayout.STATUS_CHOICES
        }

        avg_payout = payouts_qs.aggregate(avg=Avg("amount"))["avg"] or 0

        # === Existing Overview (keep your original logic) ===
        active_challenges_qs = ChallengeEnrollment.objects.filter(
            is_active=True,
        ).exclude(status__in=['completed', 'failed', 'payout_limit_reached'])

        active_traders_count = ClientProfile.objects.filter(
            challenge_enrollments__in=active_challenges_qs
        ).distinct().count()

        active_challenges_count = active_challenges_qs.filter(
            status__in=['phase_1_in_progress', 'phase_2_in_progress', 'live_in_progress']
        ).count()

        completed_challenges_count = ChallengeEnrollment.objects.filter(
            status='live_in_progress'
        ).count()

        total_balance = active_challenges_qs.aggregate(
            total=Sum('account_size')
        )['total'] or 0

        pending_payouts_count = TraderPayout.objects.filter(status='pending').count()
        pending_kyc_count = ClientProfile.objects.filter(kyc_status='pending').count()

        overview = {
            # 🔹 New Metrics
            "total_users": total_users,
            "total_challenges": total_challenges,
            "phase_1": phase_1_count,
            "phase_2": phase_2_count,
            "live_accounts": live_count,
            "total_payouts": {
                "count": total_payouts_count,
                "amount": float(total_payouts_amount),
                "status_wise": payouts_status_wise,
            },
            "number_of_payouts": total_payouts_count,
            "average_payout": float(avg_payout),

            # 🔹 Existing Metrics
            "active_traders": active_traders_count,
            "active_challenges": active_challenges_count,
            "completed_challenges": completed_challenges_count,
            "total_balance": float(total_balance),
            "pending_payouts": pending_payouts_count,
            "pending_kyc": pending_kyc_count,
        }

        # === Recent Challenges (latest 3) ===
        recent_challenges_qs = ChallengeEnrollment.objects.select_related(
            'client__user', 'challenge'
        ).order_by('-created_at')[:4]

        recent_challenges = []
        for enroll in recent_challenges_qs:
            days_left = None
            if enroll.completed_date:
                days_left = (enroll.completed_date - date.today()).days
                days_left = max(days_left, 0)
            recent_challenges.append({
                "trader_name": enroll.client.user.get_full_name(),
                "challenge_name": f"{enroll.challenge.name} ({enroll.challenge.step_type})",
                "phase_status": STATUS_PHASE_MAPPING.get(enroll.status, enroll.status),
                "start_date": enroll.start_date,
                "days_left": days_left
            })

        # === Recent Payouts (latest 3) ===
        recent_payouts_qs = (
            TraderPayout.objects
            .select_related('trader')
            .exclude(requested_at__isnull=True)
            .order_by('-requested_at')[:3]
        )

        recent_payouts = [
            {
                "trader_name": payout.trader.get_full_name(),
                "amount": float(payout.amount),
                "status": payout.status.title(),
                "time_ago": humanize_time(payout.requested_at),
            }
            for payout in recent_payouts_qs
        ]

        # === Recent KYC (latest 3) ===
        recent_kyc_qs = ClientKYC.objects.select_related('client__user').order_by('-created_at')[:3]
        recent_kyc = [
            {
                "trader_name": kyc.client.user.get_full_name(),
                "status": kyc.status.title(),
                "time_ago": humanize_time(kyc.created_at),
            }
            for kyc in recent_kyc_qs
        ]

        return Response({
            "overview": overview,
            "recent_challenges": recent_challenges,
            "recent_payouts": recent_payouts,
            "recent_kyc": recent_kyc
        })

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
        
class ReviewChallengeEnrollmentView(APIView):
    """
    Detailed review of a specific Challenge Enrollment.
    Includes client profile, challenge data, phases, MT5 accounts and trades.
    """

    permission_classes = [HasPermission]
    required_permissions = ['enrollments.review']

    def get(self, request, enrollment_id):
        enrollment = get_object_or_404(
            ChallengeEnrollment.objects.select_related("client__user", "challenge"),
            id=enrollment_id,
        )

        # --- Client Profile ---
        client_profile = {
            "id": str(enrollment.client.id),
            "user_id": enrollment.client.user.id,
            "full_name": enrollment.client.user.get_full_name(),
            "email": enrollment.client.user.email,
            "kyc_status": enrollment.client.kyc_status,
            "address_info": enrollment.client.address_info,
        }

        # --- Enrollment Data ---
        enrollment_data = {
            "id": str(enrollment.id),
            "challenge_name": enrollment.challenge.name,
            "step_type": enrollment.challenge.step_type,
            "account_size": float(enrollment.account_size),
            "currency": enrollment.currency,
            "status": enrollment.status,
            "start_date": enrollment.start_date,
            "completed_date": enrollment.completed_date,
            "live_start_date": enrollment.live_start_date,
        }

        # --- All Challenge Phases ---
        phases = []
        current_phase_type = enrollment.get_current_phase_type()
        all_phases = ChallengePhase.objects.filter(challenge=enrollment.challenge).order_by("phase_type")

        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)

        for phase in all_phases:
            phase_info = {
                "phase_type": phase.phase_type,
                "trading_period": phase.trading_period,
                "min_trading_days": phase.min_trading_days,
                "max_daily_loss": float(phase.max_daily_loss),
                "max_loss": float(phase.max_loss),
                "profit_target": float(phase.profit_target) if phase.profit_target else None,
                "is_current": (phase.phase_type == current_phase_type),
                # Metrics (only for current phase)
                "current_balance": None,
                "profit_target_left": None,
                "max_daily_loss_left": None,
                "max_total_loss_left": None,
                "daily_pnl": None,
            }

            if phase.phase_type == current_phase_type and enrollment.mt5_account_id:
                balance_data = mt5_client.get_account_balance(enrollment.mt5_account_id)
                balance = balance_data.get("balance") if balance_data else None
                phase_info["current_balance"] = balance

                if balance:
                    # Profit Target Left
                    if phase.profit_target:
                        profit_required = float(enrollment.account_size) * (float(phase.profit_target) / 100.0)
                        phase_info["profit_target_left"] = max(
                            0.0, profit_required - (float(balance) - float(enrollment.account_size))
                        )

                    # Max Total Loss Left
                    max_loss_amount = float(enrollment.account_size) * (float(phase.max_loss) / 100.0)
                    current_loss = float(enrollment.account_size) - float(balance)
                    phase_info["max_total_loss_left"] = max(0.0, max_loss_amount - max(0.0, current_loss))

                    # Max Daily Loss Left (today)
                    now = datetime.now(timezone.utc)
                    start_of_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
                    end_of_day = start_of_day + timedelta(days=1)

                    closed_trades_today = MT5Trade.objects.filter(
                        account_id=enrollment.mt5_account_id,
                        close_time__gte=start_of_day,
                        close_time__lt=end_of_day,
                    )
                    realized_today = closed_trades_today.aggregate(total=Sum("profit"))["total"] or 0.0

                    unrealized_today = 0.0
                    open_trades = mt5_client.get_open_trades(enrollment.mt5_account_id)
                    for t in open_trades:
                        unrealized_today += float(t.get("profit", 0.0))

                    daily_pnl = float(realized_today) + float(unrealized_today)
                    phase_info["daily_pnl"] = daily_pnl

                    max_daily_loss_amount = float(enrollment.account_size) * (float(phase.max_daily_loss) / 100.0)
                    phase_info["max_daily_loss_left"] = max(
                        0.0, max_daily_loss_amount - abs(min(0.0, daily_pnl))
                    )
                    
                    mt5_tz = pytz.timezone("Etc/GMT-2")  # GMT+2 fixed offset
                    now_mt5 = datetime.now(mt5_tz)
                    end_of_day_mt5 = datetime(
                        now_mt5.year, now_mt5.month, now_mt5.day, 23, 59, 59, tzinfo=mt5_tz
                    )

                    remaining_seconds = int((end_of_day_mt5 - now_mt5).total_seconds())
                    remaining_hours, remaining_seconds = divmod(remaining_seconds, 3600)
                    remaining_minutes, _ = divmod(remaining_seconds, 60)

                    # Format nicely
                    phase_info["max_daily_loss_time_remaining"] = f"{remaining_hours}h {remaining_minutes}m"
                    
                    # 🔹 Fetch today's snapshot (broker timezone based)
                    mt5_tz = pytz.timezone("Etc/GMT-2")  # GMT+2 broker time
                    today_mt5 = datetime.now(mt5_tz).date()

                    snapshot = MT5DailySnapshot.objects.filter(
                        enrollment=enrollment,
                        account_id=enrollment.mt5_account_id,
                        date=today_mt5
                    ).first()

                    if snapshot:
                        phase_info["daily_starting_balance"] = float(snapshot.starting_balance)
                        phase_info["daily_starting_equity"] = float(snapshot.starting_equity)
                    else:
                        phase_info["daily_starting_balance"] = None
                        phase_info["daily_starting_equity"] = None


            phases.append(phase_info)

        # --- Accounts (current + past) ---
        accounts_data = []

        # Current account (directly on enrollment)
        if enrollment.mt5_account_id:
            balance_data = mt5_client.get_account_balance(enrollment.mt5_account_id)
            trades = MT5Trade.objects.filter(account_id=enrollment.mt5_account_id).order_by("-open_time")
            accounts_data.append({
                "id": str(enrollment.id),
                "phase_type": current_phase_type,
                "status": enrollment.status,
                "mt5_account_id": enrollment.mt5_account_id,
                "balance": balance_data.get("balance") if balance_data else None,
                "trades": [
                    {
                        "order": t.order,
                        "symbol": t.symbol,
                        "cmd": t.cmd,
                        "volume": t.volume,
                        "open_time": t.open_time,
                        "open_price": float(t.open_price),
                        "close_time": t.close_time,
                        "close_price": float(t.close_price),
                        "profit": float(t.profit),
                        "sl": float(t.sl),
                        "tp": float(t.tp),
                        "commission": float(t.commission),
                        "comment": t.comment,
                        "rrr": calculate_rrr(t),
                    }
                    for t in trades
                ]
            })

        # Past accounts from EnrollmentAccount relation
        for account in enrollment.accounts.all():
            balance_data = None
            if account.mt5_account_id:
                balance_data = mt5_client.get_account_balance(account.mt5_account_id)

            trades = MT5Trade.objects.filter(account_id=account.mt5_account_id).order_by("-open_time")

            accounts_data.append({
                "id": str(account.id),
                "phase_type": account.phase_type,
                "status": account.status,
                "mt5_account_id": account.mt5_account_id,
                "balance": balance_data.get("balance") if balance_data else None,
                "trades": [
                    {
                        "order": t.order,
                        "symbol": t.symbol,
                        "cmd": t.cmd,
                        "volume": t.volume,
                        "open_time": t.open_time,
                        "open_price": float(t.open_price),
                        "close_time": t.close_time,
                        "close_price": float(t.close_price),
                        "sl": float(t.sl),
                        "tp": float(t.tp),
                        "profit": float(t.profit),
                        "commission": float(t.commission),
                        "comment": t.comment,
                        "rrr": calculate_rrr(t),
                    }
                    for t in trades
                ]
            })

        latest_breach = None
        if enrollment.status == "failed":
            latest = enrollment.breach_records.order_by("-breached_at").first()
            if latest:
                latest_breach = {
                    "rule": latest.rule,
                    "reason": latest.reason,
                    "previous_state": latest.previous_state,
                    "breached_at": latest.breached_at.isoformat() if latest.breached_at else None,
                }    

        return Response({
            "client_profile": client_profile,
            "enrollment": enrollment_data,
            "latest_breach": latest_breach,
            "phases": phases,          # all phases (marking current + metrics)
            "accounts": accounts_data  # current + past accounts
        })

class ChallengeEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = ChallengeEnrollment.objects.all().select_related("client__user", "challenge")
    serializer_class = ChallengeEnrollmentCRUDSerializer
    permission_classes = [HasPermission]
    required_permissions = ['enrollments.view']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = instance.client.user  # Trader

        # Log the deletion event BEFORE deleting the record
        log_event(
            request=request,
            user=user,
            category="challenge",
            event_type="challenge_deleted",
            challenge_enrollment=instance,
            metadata={
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "challenge_id": str(instance.challenge.id),
                "challenge_name": instance.challenge.name,
                "account_size": float(instance.account_size),
                "current_status": instance.status,
                "mt5_account_id": instance.mt5_account_id,
            },
            description=f"Admin ({request.user.email}) deleted challenge enrollment."
        )

        return super().destroy(request, *args, **kwargs)
    
class ClientDropdownViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API for superusers to fetch clients for dropdowns when creating enrollments.
    """
    queryset = ClientProfile.objects.select_related("user").all()
    serializer_class = ClientDropdownSerializer
    permission_classes = [HasPermission]
    required_permissions = ['traders.view']


class ChallengeEnrollmentDropdownViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API for superusers to fetch challenge enrollments for dropdowns,
    searchable by trader's email/name/MT5 ID.
    """
    queryset = ChallengeEnrollment.objects.select_related("client__user", "challenge").all()
    serializer_class = ChallengeEnrollmentDropdownSerializer
    permission_classes = [HasPermission]
    required_permissions = ['enrollments.view']
    filter_backends = [filters.SearchFilter]
    # you can search by trader's email, full name, or mt5_account_id
    search_fields = [
        "client__user__email",
        "client__user__first_name",
        "client__user__last_name",
        "mt5_account_id",
    ]        

class AccountDetailsView(APIView):
    """
    API to fetch full MT5 account details for a Challenge Enrollment.
    """

    permission_classes = [HasPermission]
    required_permissions = ['trades.view']

    def get(self, request, enrollment_id):
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        if not enrollment.mt5_account_id:
            return Response(
                {"success": False, "error": "No active MT5 account for this enrollment."},
                status=400,
            )

        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        result = mt5_client.get_account_details(enrollment.mt5_account_id)

        if result.get("success"):
            return Response({
                "success": True,
                "enrollment_id": str(enrollment.id),
                "mt5_account_id": enrollment.mt5_account_id,
                "account_details": result.get("details", {}),
                "applicationStatus": result.get("applicationStatus", "")
            })
        else:
            return Response({
                "success": False,
                "error": result.get("error", "Unknown error"),
                "enrollment_id": str(enrollment.id),
                "mt5_account_id": enrollment.mt5_account_id,
            }, status=500)

class EnrollmentOpenTradesView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['enrollments.view']

    def get(self, request, enrollment_id):
        enrollment = get_object_or_404(
            ChallengeEnrollment.objects.select_related("challenge", "client__user"),
            id=enrollment_id,
        )

        if not enrollment.mt5_account_id:
            return Response({"error": "No active MT5 account for this enrollment."}, status=400)

        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)

        try:
            open_trades = mt5_client.get_open_trades(enrollment.mt5_account_id)
        except Exception as e:
            return Response({"error": f"MT5 API error: {str(e)}"}, status=500)

        trades_data = []
        for t in open_trades:
            # fix volume scaling for MT5
            volume = float(t.get("volume", 0)) / 10000.0

            # fix time
            open_time_val = t.get("open_time")
            open_time_str = None
            if open_time_val:
                try:
                    open_time_str = datetime.utcfromtimestamp(int(open_time_val)).strftime("%Y-%m-%d %H:%M:%S")
                except Exception:
                    open_time_str = str(open_time_val)

            trades_data.append({
                "order": t.get("order"),
                "symbol": t.get("symbol"),
                "cmd": t.get("cmd"),
                "volume": f"{volume:.2f}",  # correctly scaled
                "open_time": open_time_str,
                "open_price": t.get("open_price"),
                "sl": t.get("sl"),
                "tp": t.get("tp"),
                "profit": float(t.get("profit", 0)),
                "swap": t.get("swap"),
                "commission": t.get("commission"),
                "comment": t.get("comment"),
            })


        return Response({
            "enrollment_id": str(enrollment.id),
            "mt5_account_id": enrollment.mt5_account_id,
            "open_trades": trades_data,
        })

class AccountMetricsView(APIView):
    """
    Returns account performance metrics for a given ChallengeEnrollment.
    """

    permission_classes = [HasPermission]
    required_permissions = ['trades.view']

    def get(self, request, enrollment_id):
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        if not enrollment.mt5_account_id:
            return Response(
                {"success": False, "error": "No MT5 account linked with this enrollment."},
                status=400,
            )

        # --- Base values
        initial_balance = Decimal(enrollment.account_size)

        # --- Live values from MT5
        balance = Decimal(fetch_user_balance(enrollment.mt5_account_id) or 0)
        equity = Decimal(fetch_user_equity(enrollment.mt5_account_id) or 0)

        # --- Profit/Loss
        profit_loss = balance - initial_balance

        # --- Current phase config
        phase_type = enrollment.get_current_phase_type()
        phase = None
        if phase_type:
            phase = enrollment.challenge.phases.filter(phase_type=phase_type).first()

        # --- Daily starting balance (snapshot or fallback)
        today = now().date()
        snapshot = MT5DailySnapshot.objects.filter(
            account_id=enrollment.mt5_account_id, date=today
        ).first()
        daily_starting_balance = snapshot.starting_balance if snapshot else balance

        # --- Daily Drawdown
        daily_dd_amount = daily_dd_pct = None
        if phase and phase.max_daily_loss:
            daily_dd_pct = Decimal(phase.max_daily_loss)
            daily_dd_amount = (daily_starting_balance * daily_dd_pct) / Decimal(100)

        # --- Profit Target
        profit_target_amount = profit_target_pct = None
        if phase and phase.profit_target:
            profit_target_pct = Decimal(phase.profit_target)
            profit_target_amount = (initial_balance * profit_target_pct) / Decimal(100)

        # --- Global Drawdown
        global_dd_amount = global_dd_pct = None
        if phase and phase.max_loss:
            global_dd_pct = Decimal(phase.max_loss)
            global_dd_amount = (initial_balance * global_dd_pct) / Decimal(100)

        data = {
            "initial_balance": float(initial_balance),
            "live_balance": float(balance),
            "live_equity": float(equity),
            "profit_loss": float(profit_loss),

            "daily_starting_balance": float(daily_starting_balance),
            "daily_drawdown": {
                "amount": float(daily_dd_amount) if daily_dd_amount is not None else None,
                "percentage": float(daily_dd_pct) if daily_dd_pct is not None else None,
            },
            "profit_target": {
                "amount": float(profit_target_amount) if profit_target_amount is not None else None,
                "percentage": float(profit_target_pct) if profit_target_pct is not None else None,
            },
            "global_drawdown": {
                "amount": float(global_dd_amount) if global_dd_amount is not None else None,
                "percentage": float(global_dd_pct) if global_dd_pct is not None else None,
            },
        }

        return Response({"success": True, "enrollment_id": str(enrollment.id), "metrics": data})

class EnrollmentManualBreachScanView(APIView):
    """
    Superuser API to manually scan breaches for a specific enrollment.
    Checks: Max Daily Loss, Max Total Loss, Inactivity
    """
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def get(self, request, enrollment_id):
        enrollment = ChallengeEnrollment.objects.select_related("challenge", "client__user").filter(id=enrollment_id).first()
        if not enrollment:
            return Response({"error": "Invalid enrollment."}, status=404)

        if not enrollment.mt5_account_id:
            return Response({"error": "No MT5 account linked."}, status=400)

        # Active challenge phase
        phase_type = enrollment.get_current_phase_type()
        if not phase_type:
            return Response({"error": "No active phase for this enrollment."}, status=400)

        try:
            phase = ChallengePhase.objects.get(challenge=enrollment.challenge, phase_type=phase_type)
        except ChallengePhase.DoesNotExist:
            return Response({"error": "Phase config not found."}, status=500)

        account_id = int(enrollment.mt5_account_id)
        equity = fetch_user_equity(account_id)
        balance = fetch_user_balance(account_id)

        # Today in GMT+2
        today = dj_timezone.now().astimezone(ZoneInfo("Etc/GMT-2")).date()

        # Check if account has trades
        has_trades = MT5Trade.objects.filter(account_id=account_id).exists()

        results = {
            "enrollment_id": str(enrollment.id),
            "mt5_account_id": enrollment.mt5_account_id,
            "rules": []
        }

        # === 1) Max Daily Loss ===
        if has_trades:
            snapshot = MT5DailySnapshot.objects.filter(account_id=account_id, date=today).first()

            if snapshot:
                start_balance = float(snapshot.starting_balance)
            else:
                # Fallback to account_size if no snapshot
                start_balance = float(enrollment.account_size)

            current_equity = float(equity or start_balance)
            max_daily_loss_percent = float(phase.max_daily_loss)
            max_loss_amount = start_balance * (max_daily_loss_percent / 100.0)
            threshold = start_balance - max_loss_amount

            if current_equity < threshold:
                reason = (
                    f"Equity dropped below permitted daily threshold.\n"
                    f"Start Balance: ${start_balance:.2f}\n"
                    f"Allowed Max Drop ({max_daily_loss_percent}%): -${max_loss_amount:.2f}\n"
                    f"Current Equity: ${current_equity:.2f}\n"
                    f"Threshold: ${threshold:.2f}"
                )
                results["rules"].append({
                    "rule": "Max Daily Loss",
                    "status": "breached",
                    "reason": reason,
                })
            else:
                results["rules"].append({
                    "rule": "Max Daily Loss",
                    "status": "passed",
                    "stats": {
                        "start_balance": start_balance,
                        "current_equity": current_equity,
                        "threshold": threshold
                    }
                })
        else:
            results["rules"].append({
                "rule": "Max Daily Loss",
                "status": "skipped",
                "reason": "No trades found for this account."
            })

        # === 2) Max Total Loss ===
        if has_trades:
            account_size = float(enrollment.account_size)
            max_loss_percent = float(phase.max_loss)
            threshold_equity = account_size * (1 - max_loss_percent / 100.0)
            current_equity = float(equity or 0.0)

            if current_equity < threshold_equity:
                reason = (
                    f"Max Total Loss breached: Equity ${current_equity:.2f} "
                    f"fell below threshold ${threshold_equity:.2f} "
                    f"(Max Loss {max_loss_percent}%)"
                )
                results["rules"].append({
                    "rule": "Max Total Loss",
                    "status": "breached",
                    "reason": reason
                })
            else:
                results["rules"].append({
                    "rule": "Max Total Loss",
                    "status": "passed",
                    "stats": {
                        "account_size": account_size,
                        "current_equity": current_equity,
                        "threshold": threshold_equity
                    }
                })
        else:
            results["rules"].append({
                "rule": "Max Total Loss",
                "status": "skipped",
                "reason": "No trades found for this account."
            })

        # === 3) Inactivity (phase-aware, same as automated rule) ===
        reference_start_date = get_phase_start_date(enrollment)

        if not reference_start_date:
            results["rules"].append({
                "rule": "Inactivity",
                "status": "skipped",
                "reason": "No valid phase start date found for this enrollment."
            })
        else:
            now = dj_timezone.now()
            inactivity_limit = now - timedelta(days=30)
            inactivity_limit_date = inactivity_limit.date()

            # If this phase is less than 30 days old → skip
            if reference_start_date >= inactivity_limit_date:
                results["rules"].append({
                    "rule": "Inactivity",
                    "status": "skipped",
                    "reason": (
                        "Current phase is less than 30 days old. "
                        f"Phase Start Date: {reference_start_date}"
                    )
                })
            else:
                # Check open trades (active positions)
                open_trades = get_open_trades(account_id)
                if open_trades:
                    results["rules"].append({
                        "rule": "Inactivity",
                        "status": "passed",
                        "reason": "Active open trades exist; account is not inactive."
                    })
                else:
                    # Check last closed trade
                    last_closed_trade = (
                        MT5Trade.objects
                        .filter(account_id=account_id, close_time__isnull=False)
                        .order_by("-close_time")
                        .first()
                    )

                    if not last_closed_trade:
                        # No closed trades at all, and phase is already 30+ days old
                        days_since_start = (now.date() - reference_start_date).days
                        results["rules"].append({
                            "rule": "Inactivity",
                            "status": "breached",
                            "reason": (
                                "No trades (open or closed) have been recorded on this account.\n"
                                f"Phase Start Date: {reference_start_date}\n"
                                f"Inactive for {days_since_start} days."
                            )
                        })
                    else:
                        # We have closed trades → check if last closed trade is older than 30 days
                        if last_closed_trade.close_time < inactivity_limit:
                            days_inactive = (now - last_closed_trade.close_time).days
                            results["rules"].append({
                                "rule": "Inactivity",
                                "status": "breached",
                                "reason": (
                                    "No trading activity (open or closed) in the last 30 days.\n"
                                    f"Last Closed Trade: {last_closed_trade.close_time.strftime('%Y-%m-%d %H:%M:%S')}\n"
                                    f"Days Inactive: {days_inactive} days."
                                )
                            })
                        else:
                            days_inactive = (now.date() - last_closed_trade.close_time.date()).days
                            results["rules"].append({
                                "rule": "Inactivity",
                                "status": "passed",
                                "stats": {
                                    "last_trade_date": last_closed_trade.close_time.strftime('%Y-%m-%d'),
                                    "days_inactive": days_inactive
                                }
                            })

        return Response(results)
        
class CloseEnrollmentTradesView(APIView):
    """
    API to close all open trades for a Challenge Enrollment's active MT5 account.
    """

    permission_classes = [HasPermission]
    required_permissions = ['enrollments.review']

    def post(self, request, enrollment_id):
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        if not enrollment.mt5_account_id:
            return Response(
                {"success": False, "error": "No active MT5 account for this enrollment."},
                status=400,
            )

        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        result = mt5_client.close_open_trades(enrollment.mt5_account_id)

        if result.get("success"):
            return Response({
                "success": True,
                "message": f"All open trades closed for account {enrollment.mt5_account_id}.",
                "enrollment_id": str(enrollment.id),
                "mt5_account_id": enrollment.mt5_account_id,
            })
        else:
            return Response({
                "success": False,
                "error": result.get("error", "Unknown error"),
                "systemErrorStatus": result.get("systemErrorStatus", ""),
                "enrollment_id": str(enrollment.id),
                "mt5_account_id": enrollment.mt5_account_id,
            }, status=500)
            
class AccountFundsView(APIView):
    """
    API to deposit or withdraw funds from a Challenge Enrollment's MT5 account.
    """

    permission_classes = [HasPermission]
    required_permissions = ['trades.view']

    def post(self, request, enrollment_id):
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        if not enrollment.mt5_account_id:
            return Response(
                {"success": False, "error": "No active MT5 account for this enrollment."},
                status=400,
            )

        action = request.data.get("action")
        amount = request.data.get("amount")
        comment = request.data.get("comment", "Manual Adjustment")

        if action not in ["deposit", "withdraw"]:
            return Response(
                {"success": False, "error": "Invalid action. Use 'deposit' or 'withdraw'."},
                status=400,
            )

        if not amount or float(amount) <= 0:
            return Response(
                {"success": False, "error": "Invalid amount. Must be > 0."},
                status=400,
            )

        amount = float(amount)
        trader_user = enrollment.client.user

        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)

        if action == "deposit":
            result = mt5_client.deposit_funds(enrollment.mt5_account_id, amount, comment)
            event_type = "mt5_deposit"
            description = f"Admin ({request.user.email}) deposited ${amount} into MT5 account {enrollment.mt5_account_id}"
        else:  # withdraw
            result = mt5_client.withdraw_profit(enrollment.mt5_account_id, amount, comment)
            event_type = "mt5_withdrawal"
            description = f"Admin ({request.user.email}) withdrew ${amount} from MT5 account {enrollment.mt5_account_id}"

        # Only log on success
        if result.get("success"):
            log_event(
                request=request,
                user=trader_user,
                category="mt5",
                event_type=event_type,
                challenge_enrollment=enrollment,
                metadata={
                    "admin_id": str(request.user.id),
                    "admin_email": request.user.email,
                    "mt5_account_id": enrollment.mt5_account_id,
                    "amount": amount,
                    "comment": comment,
                },
                description=description
            )

            return Response({
                "success": True,
                "message": f"{action.capitalize()} of {amount} executed for account {enrollment.mt5_account_id}.",
                "enrollment_id": str(enrollment.id),
                "mt5_account_id": enrollment.mt5_account_id,
                "amount": amount,
                "action": action,
            })

        # Log not needed on failure because no change took place
        return Response({
            "success": False,
            "error": result.get("error", "Unknown error"),
            "enrollment_id": str(enrollment.id),
            "mt5_account_id": enrollment.mt5_account_id,
            "amount": amount,
            "action": action,
        }, status=500)
            
class BlockAccountView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['mt5.disable_account']

    def post(self, request, enrollment_id):
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        if not enrollment.mt5_account_id:
            return Response(
                {"success": False, "error": "Enrollment has no linked MT5 account."},
                status=400,
            )

        title = request.data.get("title")
        explanation = request.data.get("explanation")

        if not title or not explanation:
            return Response(
                {"success": False, "error": "Both 'title' and 'explanation' are required."},
                status=400,
            )

        trader_user = enrollment.client.user

        # Save before snapshot
        before = {
            "status": enrollment.status,
            "is_active": enrollment.is_active,
            "notes": enrollment.notes,
        }

        # Step 1: Disable MT5 Trading
        success = disable_trading(int(enrollment.mt5_account_id))
        if not success:
            return Response(
                {"success": False, "error": "Failed to disable MT5 trading account."},
                status=500,
            )

        # Step 2: Mark enrollment failed
        enrollment.status = "failed"
        enrollment.is_active = False
        enrollment.notes = (enrollment.notes or "") + f"\n[BLOCKED] {title}: {explanation}"
        enrollment.save()

        # Save after snapshot
        after = {
            "status": enrollment.status,
            "is_active": enrollment.is_active,
            "notes": enrollment.notes,
        }

        # Step 3: Record breach history
        breach = BreachHistory.objects.create(
            user=trader_user,
            client=enrollment.client,
            enrollment=enrollment,
            rule=title,
            reason=explanation,
        )

        # Step 3A — Log Event (Dashboard Audit Trail)
        log_event(
            request=request,
            user=trader_user,
            category="challenge",
            event_type="challenge_blocked",
            challenge_enrollment=enrollment,
            metadata={
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "mt5_account_id": enrollment.mt5_account_id,
                "title": title,
                "explanation": explanation,
                "before": before,
                "after": after,
                "breach_id": str(breach.id),
            },
            description=f"Admin ({request.user.email}) blocked challenge account and marked it as failed: {title}"
        )

        # Step 4: Create system notification
        Notification.objects.create(
            user=trader_user,
            title=f"Challenge Blocked: {title}",
            message=f"Your account ({enrollment.mt5_account_id}) has been blocked.\n\nReason: {explanation}",
            type="challenge",
            is_custom=True,
        )

        # Step 5: Email user
        _block_subject = f"Challenge Account Blocked - {title}"
        _block_body = (
            f"Dear {trader_user.get_full_name()},\n\n"
            f"Your challenge account ({enrollment.mt5_account_id}) has been blocked and marked as failed.\n\n"
            f"Reason: {title}\nDetails: {explanation}\n\n"
            f"If you believe this is a mistake, please contact support.\n\n"
            f"Best regards,\n{settings.SITE_NAME} Team"
        )
        try:
            send_mail(
                subject=_block_subject,
                message=_block_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[trader_user.email],
                fail_silently=True,
            )
            EmailService.log_email(_block_subject, trader_user.email, body_text=_block_body,
                                   category='challenge', user=trader_user)
        except:
            EmailService.log_email(_block_subject, trader_user.email, body_text=_block_body,
                                   category='challenge', user=trader_user, status='failed')

        return Response({
            "success": True,
            "message": f"Account {enrollment.mt5_account_id} blocked and marked as failed.",
            "enrollment_id": str(enrollment.id),
            "mt5_account_id": enrollment.mt5_account_id,
            "breach_id": str(breach.id),
        })

class EnrollmentTransitionLogListView(generics.ListAPIView):
    """
    Get all transition logs for a specific enrollment.
    Example: /api/enrollments/<uuid:enrollment_id>/logs/
    """
    serializer_class = EnrollmentTransitionLogSerializer
    permission_classes = [HasPermission]
    required_permissions = ['enrollments.view']

    def get_queryset(self):
        enrollment_id = self.kwargs["enrollment_id"]
        return EnrollmentTransitionLog.objects.filter(
            enrollment_id=enrollment_id
        ).order_by("-created_at")
        
class ChallengeAccountsView(APIView):
    """
    Returns all MT5 accounts (current + past) for a specific ChallengeEnrollment.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, enrollment_id):
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        # Ensure only owner or staff with permission can view
        if not (request.user.is_superuser or request.user.has_perm_code('challenges.view') or enrollment.client.user == request.user):
            return Response({"detail": "Not authorized"}, status=403)

        accounts = []

        # Current active account from ChallengeEnrollment
        if enrollment.mt5_account_id:
            accounts.append({
                "phase": enrollment.phase.name if hasattr(enrollment, "phase") else "Current",
                "broker_type": enrollment.broker_type,
                "mt5_account_id": enrollment.mt5_account_id,
                "password": enrollment.mt5_password,
                "investor_password": enrollment.mt5_investor_password,
            })

        # Past accounts from EnrollmentAccount
        past_accounts = EnrollmentAccount.objects.filter(enrollment=enrollment).order_by("created_at")
        for acc in past_accounts:
            accounts.append({
                "phase": acc.phase.name if hasattr(acc, "phase") else "Past",
                "broker_type": acc.broker_type,
                "mt5_account_id": acc.mt5_account_id,
                "password": acc.mt5_password,
                "investor_password": acc.mt5_investor_password,
            })

        return Response({
            "challenge_id": str(enrollment.id),
            "accounts": accounts
        })

class EnrollmentSnapshotsView(APIView):
    """
    Returns all MT5DailySnapshot entries for a specific ChallengeEnrollment.
    Only superusers/admins are allowed.
    """

    permission_classes = [HasPermission]
    required_permissions = ['enrollments.view']

    def get(self, request, enrollment_id):
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        snapshots = (
            MT5DailySnapshot.objects.filter(enrollment=enrollment)
            .select_related("enrollment__client__user", "enrollment__challenge")
            .order_by("-date")
        )

        serializer = MT5DailySnapshotSerializer(snapshots, many=True)
        return Response({
            "enrollment_id": str(enrollment.id),
            "challenge_name": enrollment.challenge.name,
            "client_name": enrollment.client.user.get_full_name(),
            "snapshots": serializer.data
        })
    
class EnrollmentPayoutConfigView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['payouts.view_config']

    def get(self, request, enrollment_id):
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        try:
            payout_config = enrollment.payout_config
        except ObjectDoesNotExist:
            return Response(
                {"detail": "No payout config exists for this enrollment."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PayoutConfigurationSerializer(payout_config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, enrollment_id):
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        if PayoutConfiguration.objects.filter(enrollment=enrollment).exists():
            return Response(
                {"detail": "Payout config already exists. Use PUT to update."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = EnPayoutConfigurationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payout_config = serializer.save(
            enrollment=enrollment,
            client=enrollment.client.user,
        )

        # Log creation
        log_event(
            request=request,
            user=enrollment.client.user,
            category="payout",
            event_type="payout_config_created",
            challenge_enrollment=enrollment,
            metadata={
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "config": serializer.data,
            },
            description=f"Admin ({request.user.email}) created payout config."
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def put(self, request, enrollment_id):
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        payout_config = getattr(enrollment, "payout_config", None)
        if not payout_config:
            return Response(
                {"detail": "No payout config exists. Use POST to create one."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Snapshot before update
        before = PayoutConfigurationSerializer(payout_config).data

        serializer = EnPayoutConfigurationSerializer(
            payout_config, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        updated_config = serializer.save()

        # Snapshot after update
        after = PayoutConfigurationSerializer(updated_config).data

        if before != after:
            log_event(
                request=request,
                user=enrollment.client.user,
                category="payout",
                event_type="payout_config_updated",
                challenge_enrollment=enrollment,
                metadata={
                    "admin_id": str(request.user.id),
                    "admin_email": request.user.email,
                    "before": before,
                    "after": after,
                },
                description=f"Admin ({request.user.email}) updated payout config."
            )

        return Response(serializer.data, status=status.HTTP_200_OK)

class EnrollmentPayoutHistoryView(APIView):
    """
    Returns all payout history for a specific ChallengeEnrollment.
    Only superusers/admins are allowed.
    """

    permission_classes = [HasPermission]
    required_permissions = ['payouts.view']

    def get(self, request, enrollment_id):
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        payouts = (
            TraderPayout.objects.filter(challenge_enrollment=enrollment)
            .select_related("trader", "challenge_enrollment")
            .order_by("-requested_at")
        )

        serializer = TraderPayoutSerializer(payouts, many=True)

        return Response({
            "enrollment_id": str(enrollment.id),
            "challenge_name": enrollment.challenge.name,
            "client_name": enrollment.client.user.get_full_name(),
            "payouts": serializer.data
        }, status=status.HTTP_200_OK)

class AdminManualEnrollmentPayoutView(APIView):
    """
    Superuser-only API to manually create a payout entry for a specific ChallengeEnrollment.
    Used by the Challenge Enrollment Manager to add payout history manually.
    """
    permission_classes = [HasPermission]
    required_permissions = ['payouts.approve']

    def post(self, request, enrollment_id):
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        amount = request.data.get("amount")
        profit = request.data.get("profit")
        profit_share = request.data.get("profit_share")
        method = request.data.get("method")  # paypal, bank, crypto, rise
        method_details = request.data.get("method_details", {})
        status_value = request.data.get("status", "pending")
        admin_note = request.data.get("admin_note")

        if not amount or not profit or not profit_share or not method:
            return Response(
                {"detail": "amount, profit, profit_share and method are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        payout = TraderPayout.objects.create(
            trader=enrollment.client.user,
            challenge_enrollment=enrollment,
            amount=Decimal(amount),
            profit=Decimal(profit),
            profit_share=Decimal(profit_share),
            net_profit=Decimal(amount),
            method=method,
            method_details=method_details,
            status=status_value,
            admin_note=admin_note,
            is_custom_amount=True
        )

        # Always log payout creation
        log_event(
            request=request,
            user=enrollment.client.user,
            category="payout",
            event_type="payout_created",
            challenge_enrollment=enrollment,
            metadata={
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "payout_id": str(payout.id),
                "amount": float(payout.amount),
                "profit": float(payout.profit),
                "profit_share": float(payout.profit_share),
                "method": method,
                "status": payout.status,
            },
            description=f"Admin ({request.user.email}) created a manual payout record."
        )


        return Response(
            {
                "message": "Manual payout record created successfully.",
                "payout_id": str(payout.id),
                "enrollment_id": str(enrollment.id),
                "amount": str(payout.amount),
                "profit": str(payout.profit),
                "profit_share": str(payout.profit_share),
                "status": payout.status,
            },
            status=status.HTTP_201_CREATED
        )

class EnrollmentBreachHistoryView(APIView):
    """
    Returns all hard & soft breach history for a specific ChallengeEnrollment.
    Only superusers/admins are allowed.
    """
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def get(self, request, enrollment_id):
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        # Hard breaches (include evidence + positions)
        hard_breaches = (
            BreachHistory.objects
            .filter(enrollment=enrollment)
            .select_related("evidence")
            .prefetch_related("evidence__positions")
            .order_by("-breached_at")
        )

        hard_data = []
        for b in hard_breaches:
            ev = getattr(b, "evidence", None)

            evidence_data = None
            if ev:
                evidence_data = {
                    "id": str(ev.id),
                    "account_id": ev.account_id,

                    # timestamps
                    "captured_at": ev.captured_at,
                    "broker_time": ev.broker_time,
                    "created_at": ev.created_at,

                    # account state
                    "equity": str(ev.equity) if ev.equity is not None else None,
                    "balance": str(ev.balance) if ev.balance is not None else None,
                    "margin": str(ev.margin) if ev.margin is not None else None,
                    "free_margin": str(ev.free_margin) if ev.free_margin is not None else None,

                    # rule context
                    "start_balance": str(ev.start_balance) if ev.start_balance is not None else None,
                    "threshold": str(ev.threshold) if ev.threshold is not None else None,
                    "max_loss_amount": str(ev.max_loss_amount) if ev.max_loss_amount is not None else None,
                    "max_loss_percent": str(ev.max_loss_percent) if ev.max_loss_percent is not None else None,

                    # raw payloads
                    "equity_payload": ev.equity_payload,
                    "positions_payload": ev.positions_payload,

                    # positions
                    "positions_count": ev.positions_count,
                    "positions": [
                        {
                            "id": str(p.id),
                            "ticket": p.ticket,
                            "symbol": p.symbol,
                            "side": p.side,
                            "volume": str(p.volume),

                            "open_price": str(p.open_price) if p.open_price is not None else None,
                            "current_price": str(p.current_price) if p.current_price is not None else None,

                            "sl": str(p.sl) if p.sl is not None else None,
                            "tp": str(p.tp) if p.tp is not None else None,

                            "profit": str(p.profit) if p.profit is not None else None,
                            "swap": str(p.swap) if p.swap is not None else None,
                            "commission": str(p.commission) if p.commission is not None else None,

                            "opened_at": p.opened_at,
                            "magic": p.magic,
                            "comment": p.comment,
                            "created_at": p.created_at,
                        }
                        for p in ev.positions.all().order_by("created_at")
                    ],
                }

            hard_data.append(
        {
            "id": str(b.id),
            "rule": b.rule,
            "reason": b.reason,
            "breached_at": b.breached_at,
            "evidence": evidence_data,  # ✅ None if not available
        }
    )

        # Soft breaches
        soft_breaches = SoftBreach.objects.filter(enrollment=enrollment).order_by("-detected_at")
        soft_data = [
            {
                "id": str(s.id),
                "rule": s.rule,
                "severity": s.severity,
                "value": str(s.value) if s.value is not None else None,
                "description": s.description,
                "detected_at": s.detected_at,
                "resolved": s.resolved,
                "resolved_at": s.resolved_at,
            }
            for s in soft_breaches
        ]

        return Response(
            {
                "enrollment_id": str(enrollment.id),
                "challenge_name": enrollment.challenge.name,
                "client_name": enrollment.client.user.get_full_name(),
                "hard_breaches": hard_data,
                "soft_breaches": soft_data,
            },
            status=status.HTTP_200_OK,
        )

class EnrollmentEventLogListView(generics.ListAPIView):
    """
    List all EventLog entries linked with a specific Challenge Enrollment.
    Only superusers can access this.
    """
    serializer_class = EnrollmentEventLogSerializer
    permission_classes = [HasPermission]
    required_permissions = ['system.view_event_logs']

    def get_queryset(self):
        enrollment_id = self.kwargs.get("enrollment_id")
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)

        return (
            EventLog.objects
            .filter(challenge_enrollment=enrollment)
            .select_related("user")     # optimization
            .order_by("-timestamp")     # already ordered in Meta, but explicit
        )

class ManualEnrollmentStatusUpdateView(APIView):
    """
    Admin-only manual challenge status override.
    Allows upgrading/downgrading enrollment to any status.
    Fully logs transition + EventLog + TransitionLog.
    """
    permission_classes = [HasPermission]
    required_permissions = ['enrollments.review']

    def post(self, request, enrollment_id):
        serializer = ManualUpgradeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["new_status"]
        reason = serializer.validated_data.get("reason", "Admin override")

        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)
        old_status = enrollment.status

        # Map status → phase_type
        status_to_phase = {
            "phase_1_in_progress": "phase-1",
            "phase_1_passed": "phase-1",

            "phase_2_in_progress": "phase-2",
            "phase_2_passed": "phase-2",

            "live_in_progress": "live-trader",

            "completed": "live-trader",
            "failed": "live-trader",
        }

        phase_type = status_to_phase.get(new_status)

        # ------------------------------
        # Perform transition (reusing main challenge engine behavior)
        # ------------------------------
        mt5_result = handle_transition(
            enrollment=enrollment,
            from_status=old_status,
            to_status=new_status,
            phase_type=phase_type,
            reason=reason
        )

        # ------------------------------
        # Additional EventLog for audit
        # ------------------------------
        log_engine_event(
            event_type="challenge_transition",
            engine="challenge",
            user=request.user,
            challenge_enrollment=enrollment,
            metadata={
                "old_status": old_status,
                "new_status": new_status,
                "phase_type": phase_type,
                "reason": reason,
                "admin_id": request.user.id,
                "mt5_account_id": mt5_result["account_id"] if mt5_result else None,
            },
            description=f"[ADMIN] Enrollment manually changed from {old_status} → {new_status}"
        )

        return Response(
            {
                "message": "Enrollment status updated successfully.",
                "from_status": old_status,
                "to_status": new_status,
                "phase_type": phase_type,
                "mt5_created": True if mt5_result else False,
                "mt5_account_id": mt5_result["account_id"] if mt5_result else None,
            },
            status=status.HTTP_200_OK
        )

class EATradingBotRequestAdminViewSet(viewsets.ModelViewSet):
    """
    Superuser API for reviewing EA Trading Bot Requests.
    """
    queryset = EATradingBotRequest.objects.select_related("client__user", "enrollment", "reviewed_by")
    serializer_class = EATradingBotRequestSerializer
    permission_classes = [HasPermission]
    required_permissions = ['risk.manage_ea']

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        status_choice = request.data.get("status")
        rejection_reason = request.data.get("rejection_reason", "")

        if status_choice not in ["approved", "rejected"]:
            return Response({"detail": "Invalid status. Use 'approved' or 'rejected'."},
                            status=status.HTTP_400_BAD_REQUEST)

        instance.status = status_choice
        instance.reviewed_by = request.user

        if status_choice == "rejected":
            instance.rejection_reason = rejection_reason
        else:
            instance.rejection_reason = ""  # clear rejection reason on approval

        instance.save()
        user = instance.client.user
        enrollment = instance.enrollment

        log_event(
            request=request,
            user=user,
            category="mt5",
            event_type="ea_request_approved" if status_choice == "approved" else "ea_request_rejected",
            challenge_enrollment=enrollment,
            metadata={
                "ea_request_id": str(instance.id),
                "mt5_account_id": enrollment.mt5_account_id,
                "mq5_filename": instance.mq5_file_url.split("/")[-1] if instance.mq5_file_url else None,
                "reviewed_by_admin": request.user.email,
                "rejection_reason": rejection_reason if status_choice == "rejected" else None,
            },
            description=(
                f"Admin {request.user.email} "
                f"{'approved' if status_choice == 'approved' else 'rejected'} "
                f"EA request for {user.email} (MT5 {enrollment.mt5_account_id})."
            ),
        )

        context = {
            "client_name": user.get_full_name(),
            "mt5_account_id": enrollment.mt5_account_id,
            "filename_only": instance.mq5_file_url.split("/")[-1] if instance.mq5_file_url else None,
            "rejection_reason": rejection_reason,
        }

        if status_choice == "approved":
            subject = "WeFund | Your EA Approval Request Has Been Approved"
            template_name = "emails/ea_submission/ea_request_approved.html"
        else:
            subject = "WeFund | Your EA Approval Request Has Been Rejected"
            template_name = "emails/ea_submission/ea_request_rejected.html"

        html_content = EmailService.render_template(template_name, context)

        msg = EmailMultiAlternatives(
            subject=subject,
            body="Please view this email in HTML format.",  # plain-text fallback
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        EmailService.log_email(subject, user.email, body_html=html_content,
                               category='other', user=user)

        return Response(self.get_serializer(instance).data)
    
class AffiliateCommissionTierViewSet(viewsets.ModelViewSet):
    """
    Superuser CRUD API for managing Affiliate Commission Tiers
    """
    queryset = AffiliateCommissionTier.objects.all().order_by("min_referrals")
    serializer_class = AffiliateCommissionTierSerializer
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.assign_tier']

    def perform_create(self, serializer):
        request = self.request
        tier = serializer.save()

        log_event(
            request=request,
            user=request.user,
            category="affiliate",
            event_type="affiliate_tier_created",
            metadata={
                "tier_id": str(tier.id),
                "name": tier.name,
                "min_referrals": tier.min_referrals,
                "max_referrals": tier.max_referrals,
                "commission_rate": str(tier.commission_rate),
            },
            description=f"Admin ({request.user.email}) created affiliate tier '{tier.name}'."
        )

    def perform_update(self, serializer):
        request = self.request
        instance = self.get_object()

        before = {
            "name": instance.name,
            "min_referrals": instance.min_referrals,
            "max_referrals": instance.max_referrals,
            "commission_rate": str(instance.commission_rate),
        }

        tier = serializer.save()

        after = {
            "name": tier.name,
            "min_referrals": tier.min_referrals,
            "max_referrals": tier.max_referrals,
            "commission_rate": str(tier.commission_rate),
        }

        if before != after:
            log_event(
                request=request,
                user=request.user,
                category="affiliate",
                event_type="affiliate_tier_updated",
                metadata={
                    "tier_id": str(tier.id),
                    "before": before,
                    "after": after,
                },
                description=f"Admin ({request.user.email}) updated affiliate tier '{tier.name}'."
            )

    def perform_destroy(self, instance):
        request = self.request

        log_event(
            request=request,
            user=request.user,
            category="affiliate",
            event_type="affiliate_tier_deleted",
            metadata={
                "tier_id": str(instance.id),
                "name": instance.name,
                "min_referrals": instance.min_referrals,
                "max_referrals": instance.max_referrals,
                "commission_rate": str(instance.commission_rate),
            },
            description=f"Admin ({request.user.email}) deleted affiliate tier '{instance.name}'."
        )

        instance.delete()
    
class AffiliateUserViewSet(viewsets.ModelViewSet):
    serializer_class = CRMAffiliateUserSerializer
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.view']
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["username", "email", "first_name", "last_name"]
    ordering_fields = ["created_at", "first_name", "last_name"]

    def get_queryset(self):
        return (
            User.objects.filter(affiliate_profile__isnull=False)
            .select_related("affiliate_profile")
            .prefetch_related("affiliate_profile__custom_commission")
            .order_by("-created_at")
        )

    # ✅ Approve Affiliate
    @action(detail=True, methods=["post"], url_path="approve")
    def approve_affiliate(self, request, pk=None):
        user = self.get_object()
        if not hasattr(user, "affiliate_profile"):
            return Response({"detail": "User has no affiliate profile."}, status=400)

        profile = user.affiliate_profile
        if not profile.approved:
            profile.approved = True
            profile.save(update_fields=["approved", "updated_at"])

            log_event(
                request=request,
                user=user,
                category="affiliate",
                event_type="affiliate_approved",
                metadata={"referral_code": profile.referral_code},
                description=f"Admin ({request.user.email}) approved affiliate"
            )

        return Response({"detail": "Affiliate approved successfully."})

    # ✅ Disapprove Affiliate
    @action(detail=True, methods=["post"], url_path="disapprove")
    def disapprove_affiliate(self, request, pk=None):
        user = self.get_object()
        if not hasattr(user, "affiliate_profile"):
            return Response({"detail": "User has no affiliate profile."}, status=400)

        profile = user.affiliate_profile
        if profile.approved:
            profile.approved = False
            profile.save(update_fields=["approved", "updated_at"])

            log_event(
                request=request,
                user=user,
                category="affiliate",
                event_type="affiliate_unapproved",
                metadata={"referral_code": profile.referral_code},
                description=f"Admin ({request.user.email}) disapproved affiliate"
            )

        return Response({"detail": "Affiliate disapproved successfully."})

    # ✅ Delete Affiliate Profile (but NOT user)
    def destroy(self, request, *args, **kwargs):
        user = self.get_object()

        if hasattr(user, "affiliate_profile"):
            ref_code = user.affiliate_profile.referral_code
            user.affiliate_profile.delete()

            log_event(
                request=request,
                user=user,
                category="affiliate",
                event_type="affiliate_deleted",
                metadata={"referral_code": ref_code},
                description=f"Admin ({request.user.email}) removed affiliate profile"
            )

        # We do NOT delete the user — only affiliate access removed
        return Response(
            {"detail": "Affiliate profile removed. User account remains active."},
            status=status.HTTP_204_NO_CONTENT
        )
        
class AffiliateManagementViewSet(viewsets.ViewSet): 
    """
    Admin-only endpoint to convert a client into an affiliate
    without changing their main role (remains 'client').
    Supports both user_id and email for lookup,
    and optional custom commission setup.
    """
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.view']

    @action(detail=False, methods=["post"], url_path="make-affiliate")
    @transaction.atomic
    def make_affiliate(self, request):
        user_id = request.data.get("user_id")
        email = request.data.get("email")
        approve_now = request.data.get("approve_now", True)
        custom_commission_data = request.data.get("custom_commission")

        # Validate presence of either user_id or email
        if not user_id and not email:
            return Response(
                {"detail": "Either 'user_id' or 'email' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = None

        # Try lookup by user_id first
        if user_id:
            if isinstance(user_id, int) or str(user_id).isdigit():
                user = User.objects.filter(pk=user_id).first()
            else:
                try:
                    UUID(str(user_id))
                    user = User.objects.filter(id=user_id).first()
                except ValueError:
                    return Response(
                        {"detail": "Invalid user_id format. Expected UUID or integer ID."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        # If no user found and email provided, lookup by email
        if not user and email:
            try:
                validate_email(email)
            except ValidationError:
                return Response(
                    {"detail": "Invalid email address."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = User.objects.filter(email__iexact=email).first()

        if not user:
            return Response(
                {"detail": "User not found with given identifier."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Prevent duplicate affiliate profile
        if hasattr(user, "affiliate_profile"):
            return Response(
                {"detail": "This user is already an affiliate."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Normalize approve_now
        if isinstance(approve_now, str):
            approve_now = approve_now.lower() in ["true", "1", "yes", "approved"]

        # Generate unique referral code
        referral_code = f"WEF{random.randint(100000, 999999)}"
        while AffiliateProfile.objects.filter(referral_code=referral_code).exists():
            referral_code = f"WEF{random.randint(100000, 999999)}"

        # Create affiliate profile
        profile = AffiliateProfile.objects.create(
            user=user,
            referral_code=referral_code,
            approved=bool(approve_now),
        )

        # Optional: handle custom commission
        if isinstance(custom_commission_data, dict) and custom_commission_data:
            rate = custom_commission_data.get("commission_rate")
            if rate:
                try:
                    rate = Decimal(str(rate))
                except InvalidOperation:
                    return Response(
                        {"detail": "Invalid commission rate format."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            AffiliateCustomCommission.objects.update_or_create(
                affiliate=profile,
                defaults={
                    "is_active": custom_commission_data.get("is_active", True),
                    "commission_rate": rate,
                    "fixed_amount_per_referral": custom_commission_data.get(
                        "fixed_amount_per_referral"
                    ),
                    "notes": custom_commission_data.get("notes", "Set via CRM"),
                },
            )

        log_event(
            request=request,
            user=user,
            category="affiliate",
            event_type="affiliate_created",
            metadata={
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "affiliate_user_id": str(user.id),
                "referral_code": referral_code,
                "approved_immediately": bool(approve_now),
                "custom_commission_set": bool(custom_commission_data),
                "custom_commission_details": custom_commission_data or {},
            },
            description=f"Admin ({request.user.email}) converted user to affiliate"
        )

        if approve_now:
            log_event(
                request=request,
                user=user,
                category="affiliate",
                event_type="affiliate_approved",
                metadata={"referral_code": profile.referral_code},
                description=f"Affiliate auto-approved at creation by {request.user.email}"
            )    

        # Serialize and return response
        serializer = CRMAffiliateUserSerializer(user)
        return Response(
            {
                "detail": f"{user.username or user.email} has been successfully made an affiliate.",
                "identifier_used": "user_id" if user_id else "email",
                "affiliate_profile": serializer.data.get("affiliate_profile"),
                "custom_commission_info": serializer.data.get("custom_commission_info"),
            },
            status=status.HTTP_201_CREATED,
        )        

class AdminAssignReferralCodeView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.manage']

    def post(self, request):
        serializer = AssignReferralCodeSerializer(data=request.data)
        if serializer.is_valid():
            profile = serializer.save()

            # Before / After snapshot
            before_referral_code = profile.referral_code if profile.pk else None
            after_referral_code = profile.referral_code

            # Event Log
            log_event(
                request=request,
                user=profile.user,
                category="affiliate",
                event_type="affiliate_referral_code_assigned",
                metadata={
                    "admin_id": str(request.user.id),
                    "admin_email": request.user.email,
                    "user_id": str(profile.user.id),
                    "old_referral_code": before_referral_code,
                    "new_referral_code": after_referral_code,
                    "approved": profile.approved,
                },
                description=(
                    f"Admin ({request.user.email}) assigned referral code "
                    f"'{after_referral_code}' to user {profile.user.email}"
                )
            )

            return Response(
                {
                    "success": True,
                    "message": "Referral code assigned successfully.",
                    "data": {
                        "user_id": str(profile.user.id),
                        "username": profile.user.username,
                        "email": profile.user.email,
                        "referral_code": profile.referral_code,
                        "approved": profile.approved,
                    },
                },
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminAssignAffiliateTierView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.assign_tier']

    def post(self, request):
        serializer = AssignAffiliateTierSerializer(data=request.data)
        if serializer.is_valid():
            profile = serializer.save()
            tier = profile.manual_tier_override

            # Detect Previous State
            before_tier = profile.manual_tier_override.name if profile.manual_tier_override else None

            if tier is None:
                # Manual override removed — reverted to auto-tier
                log_event(
                    request=request,
                    user=profile.user,
                    category="affiliate",
                    event_type="affiliate_tier_override_removed",
                    metadata={
                        "admin_id": str(request.user.id),
                        "admin_email": request.user.email,
                        "user_id": str(profile.user.id),
                        "previous_manual_tier": before_tier,
                        "new_auto_tier": profile.current_tier.name if profile.current_tier else None,
                        "effective_rate": str(profile.effective_commission_rate),
                    },
                    description=f"Admin ({request.user.email}) removed manual tier override and restored auto-tiering"
                )

                return Response(
                    {
                        "success": True,
                        "message": "Manual tier override removed. Auto-tiering restored.",
                        "data": {
                            "user_id": str(profile.user.id),
                            "username": profile.user.username,
                            "email": profile.user.email,
                            "auto_tier_name": profile.current_tier.name if profile.current_tier else None,
                            "effective_rate": str(profile.effective_commission_rate),
                        },
                    },
                    status=status.HTTP_200_OK,
                )

            # Manual tier applied
            log_event(
                request=request,
                user=profile.user,
                category="affiliate",
                event_type="affiliate_tier_overridden",
                metadata={
                    "admin_id": str(request.user.id),
                    "admin_email": request.user.email,
                    "user_id": str(profile.user.id),
                    "manual_tier_id": str(tier.id),
                    "manual_tier_name": tier.name,
                    "effective_rate": str(profile.effective_commission_rate),
                },
                description=f"Admin ({request.user.email}) manually assigned affiliate tier '{tier.name}'"
            )

            return Response(
                {
                    "success": True,
                    "message": "Manual tier override applied successfully.",
                    "data": {
                        "user_id": str(profile.user.id),
                        "username": profile.user.username,
                        "email": profile.user.email,
                        "manual_tier_id": str(tier.id),
                        "manual_tier_name": tier.name,
                        "effective_rate": str(profile.effective_commission_rate),
                    },
                },
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ConvertAffiliateToClientView(APIView):
    """
    Converts an affiliate user to client role and ensures ClientProfile exists.
    Idempotent: safe to call multiple times.
    """
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.manage']

    @transaction.atomic
    def post(self, request):
        serializer = ConvertAffiliateToClientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_id = serializer.validated_data.get("user_id")
        email = serializer.validated_data.get("email")

        qs = User.objects.select_for_update()
        if user_id:
            user = qs.filter(id=user_id).first()
        else:
            user = qs.filter(email__iexact=email).first()

        if not user:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Optional: if you ONLY want to allow affiliate -> client
        if user.role != "affiliate" and user.role != "client":
            return Response(
                {"detail": f"Only affiliate->client is allowed. Current role: {user.role}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update role
        role_changed = (user.role != "client")
        user.role = "client"
        user.save(update_fields=["role"])

        # Ensure client profile exists
        client_profile, created = ClientProfile.objects.get_or_create(user=user)

        return Response(
            {
                "success": True,
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "username": user.username,
                    "role": user.role,
                    "status": user.status,
                },
                "client_profile": {
                    "id": getattr(client_profile, "id", None),
                    "created": created,
                },
                "role_changed": role_changed,
            },
            status=status.HTTP_200_OK
        )

class EnrollmentEventListView(generics.ListAPIView):
    """
    API to fetch event logs for a specific challenge enrollment.
    Only accessible by superusers.
    """
    serializer_class = EnrollmentEventSerializer
    permission_classes = [HasPermission]
    required_permissions = ['system.view_event_logs']

    def get_queryset(self):
        enrollment_id = self.kwargs.get("enrollment_id")
        enrollment = get_object_or_404(ChallengeEnrollment, id=enrollment_id)
        return EnrollmentEvent.objects.filter(enrollment=enrollment)
    
class ChallengePhaseGroupMappingViewSet(viewsets.ModelViewSet):
    """
    Superuser-only CRUD for mapping ChallengePhase -> MT5 group
    """
    queryset = ChallengePhaseGroupMapping.objects.all().select_related(
        "challenge_phase", "challenge_phase__challenge"
    )
    serializer_class = ChallengePhaseGroupMappingSerializer
    permission_classes = [HasPermission]
    required_permissions = ['challenges.view']

    def perform_create(self, serializer):
        mapping = serializer.save()
        request = self.request
        phase = mapping.challenge_phase

        log_event(
            request=request,
            user=request.user,
            category="challenge",
            event_type="challenge_phase_group_mapping_created",
            metadata={
                "mapping_id": str(mapping.id),
                "phase_id": str(phase.id),
                "phase_type": phase.phase_type,
                "challenge": phase.challenge.name,
                "mt5_group": mapping.mt5_group,
            },
            description=f"Admin ({request.user.email}) created MT5 group mapping: "
                        f"{phase.challenge.name} Phase-{phase.phase_type} → {mapping.mt5_group}"
        )

    def perform_update(self, serializer):
        request = self.request
        instance = self.get_object()

        before = {
            "mt5_group": instance.mt5_group,
            "is_active": instance.is_active,
        }

        mapping = serializer.save()

        after = {
            "mt5_group": mapping.mt5_group,
            "is_active": mapping.is_active,
        }

        if before != after:
            log_event(
                request=request,
                user=request.user,
                category="challenge",
                event_type="challenge_phase_group_mapping_updated",
                metadata={
                    "mapping_id": str(mapping.id),
                    "before": before,
                    "after": after,
                    "challenge": mapping.challenge_phase.challenge.name,
                    "phase_type": mapping.challenge_phase.phase_type,
                },
                description=f"Admin ({request.user.email}) updated MT5 group mapping for "
                            f"{mapping.challenge_phase.challenge.name} Phase-{mapping.challenge_phase.phase_type}"
            )

    def perform_destroy(self, instance):
        request = self.request
        phase = instance.challenge_phase

        log_event(
            request=request,
            user=request.user,
            category="challenge",
            event_type="challenge_phase_group_mapping_deleted",
            metadata={
                "mapping_id": str(instance.id),
                "phase_id": str(phase.id),
                "challenge": phase.challenge.name,
                "phase_type": phase.phase_type,
                "mt5_group": instance.mt5_group,
            },
            description=f"Admin ({request.user.email}) deleted MT5 group mapping for "
                        f"{phase.challenge.name} Phase-{phase.phase_type}"
        )

        super().perform_destroy(instance)

    @action(detail=False, methods=["get"])
    def available_groups(self, request):
        """
        Fetch all groups directly from MT5 and return details.
        """
        try:
            groups = fetch_all_groups()
            return Response(groups, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
class ChallengePhaseOptionsView(generics.ListAPIView):
    queryset = ChallengePhase.objects.select_related("challenge").all()
    serializer_class = ChallengePhaseOptionSerializer
    permission_classes = [HasPermission]
    required_permissions = ['challenges.view']
    
class MigrationToolUploadView(generics.GenericAPIView):
    """
    Upload CSV to create clients and challenge enrollments.
    Admin-only endpoint.
    Provides detailed error messages per row.
    """
    permission_classes = [HasPermission]
    required_permissions = ['system.view_migration_logs']
    serializer_class = MigrationCSVSerializer

    def post(self, request, *args, **kwargs):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "No CSV file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate batch_id for this upload
        batch_id = uuid.uuid4()
        
        # Read CSV
        decoded_file = file.read().decode("utf-8")
        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)

        results = {"created": 0, "skipped": 0, "errors": []}

        for i, row in enumerate(reader, start=1):
            row_errors = []
            
            # === Handle optional date_of_birth with default ===
            dob = row.get("date_of_birth")
            if not dob or dob.strip() == "":
                row["date_of_birth"] = "1999-01-01"

            val = row.get("next_withdrawal_date")
            if val:
                row["next_withdrawal_date"] = val.strip()
            else:
                row["next_withdrawal_date"] = None

            
            # === Validate row with serializer ===
            serializer = self.get_serializer(data=row)
            if not serializer.is_valid():
                row_errors.append(serializer.errors)
                results["errors"].append({"row": i, "errors": row_errors})

                log_event(
                    request=request,
                    user=None,
                    category="migration",
                    event_type="migration_row_failed",
                    metadata={
                        "batch_id": str(batch_id),
                        "row_number": i,
                        "admin_id": str(request.user.id),
                        "admin_email": request.user.email,
                        "email": row.get("email"),
                        "errors": serializer.errors,
                    },
                    description=f"Migration: Admin {request.user.email} failed to import row {i}."
                )

                MigrationLog.objects.create(
                    batch_id=batch_id,
                    row_number=i,
                    email=row.get("email", ""),
                    username=row.get("username", ""),
                    challenge_name=row.get("challenge_name", ""),
                    success=False,
                    errors=serializer.errors,
                )
                continue
            

            data = serializer.validated_data

            # === Validate referred_by_email if provided ===
            referred_by = None
            if data.get("referred_by_email"):
                try:
                    referred_by = User.objects.get(
                        email=data["referred_by_email"], role="affiliate"
                    )
                except User.DoesNotExist:
                    row_errors.append(
                        f"Affiliate with email '{data['referred_by_email']}' does not exist."
                    )

            # === Validate challenge exists ===
            try:
                challenge = Challenge.objects.get(name=data["challenge_name"])
            except Challenge.DoesNotExist:
                row_errors.append(
                    f"Challenge '{data['challenge_name']}' does not exist."
                )

            # If there are row-level errors, record and skip
            if row_errors:
                results["errors"].append({"row": i, "errors": row_errors})
                MigrationLog.objects.create(
                    batch_id=batch_id,
                    row_number=i,
                    email=data.get("email", ""),
                    username=data.get("username", ""),
                    challenge_name=data.get("challenge_name", ""),
                    success=False,
                    errors=row_errors,
                )
                continue

            # === Create or get User ===
            user, created_user = User.objects.get_or_create(
                email=data["email"],
                defaults={
                    "username": data["username"],
                    "first_name": data.get("first_name", ""),
                    "last_name": data.get("last_name", ""),
                    "role": data.get("role", "client"),
                    "phone": data.get("phone"),
                    "date_of_birth": data.get("date_of_birth"),
                    "profile_picture": data.get("profile_picture"),
                },
            )
            
            # === Ensure ClientProfile exists ===
            if user.is_client():
                client_profile, created = ClientProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        "kyc_status": data.get("kyc_status", "pending"),
                        "referred_by": referred_by,
                    },
                )

                # 🔑 Update if profile already existed
                if not created:
                    updated = False
                    if data.get("kyc_status") and client_profile.kyc_status != data["kyc_status"]:
                        client_profile.kyc_status = data["kyc_status"]
                        updated = True
                    if referred_by and client_profile.referred_by != referred_by:
                        client_profile.referred_by = referred_by
                        updated = True
                    if updated:
                        client_profile.save()
                        
                rise_method, created_rise = ClientPaymentMethod.objects.get_or_create(
                client=user,
                payment_type="rise",
                defaults={
                    "rise_email": user.email,
                    "label": "Rise Payout",
                    "is_default": False,
                },
            )
                if not created_rise:
                    if rise_method.rise_email != user.email:
                        rise_method.rise_email = user.email
                        rise_method.save(update_fields=["rise_email"])            


            # === Create ChallengeEnrollment ===
            enrollment = ChallengeEnrollment.objects.create(
                client=user.client_profile,
                challenge=challenge,
                status=data.get("phase_status", "phase_1_in_progress"),
                account_size=data.get("account_size", 10000.00),
                currency=data.get("currency", "USD"),
                broker_type=(data.get("broker_type") or "").lower(),
                mt5_account_id=data.get("mt5_account_id", ""),
                mt5_password=data.get("mt5_password", ""),
                mt5_investor_password=data.get("mt5_investor_password", ""),
            )

            log_event(
                request=request,
                user=user,
                category="migration",
                event_type="migration_row_success",
                challenge_enrollment=enrollment,
                metadata={
                    "batch_id": str(batch_id),
                    "row_number": i,
                    "admin_id": str(request.user.id),
                    "admin_email": request.user.email,
                    "challenge_name": data["challenge_name"],
                    "account_size": data.get("account_size"),
                    "kyc_status": data.get("kyc_status", "pending"),
                    "referred_by": data.get("referred_by_email"),
                },
                description=f"Migration: Admin {request.user.email} created enrollment for {user.email} in challenge {data['challenge_name']} (row {i})."
            )
            
            payout_config_type = "default"
            next_withdrawal = data.get("next_withdrawal_date")

            payout_config = getattr(user, "payout_config", None)

            if payout_config:
                # update existing config
                if next_withdrawal:
                    payout_config.live_trading_start_date = next_withdrawal - timedelta(days=14)
                    payout_config.config_type = "custom"
                    payout_config.payment_cycle = "biweekly"
                    payout_config.profit_share_percent = 80.00
                    payout_config.min_net_amount=50.00
                    payout_config.notes = "Updated from CSV migration"
                    payout_config.save()
                    payout_config_type = "custom"
            else:
                # create new
                if next_withdrawal:
                    PayoutConfiguration.objects.create(
                        client=user,
                        config_type="custom",
                        live_trading_start_date=next_withdrawal - timedelta(days=14),
                        payment_cycle="biweekly",
                        profit_share_percent=80.00,
                        min_net_amount=50.00,
                        is_active=True,
                        notes="Custom config migrated from CSV (next withdrawal provided)",
                    )
                    payout_config_type = "custom"
                else:
                    PayoutConfiguration.objects.create(
                        client=user,
                        config_type="default",
                        live_trading_start_date=dj_timezone.now().date(),
                        payment_cycle="monthly",
                        is_active=True,
                        notes="Auto-created during migration (default config)",
                    )


            
            # === Log Migration ===
            MigrationLog.objects.create(
                batch_id=batch_id,
                row_number=i,
                user=user,
                email=user.email,
                username=user.username,
                created_user=created_user,
                kyc_status=data.get("kyc_status", "pending"),
                referred_by_email=data.get("referred_by_email", ""),
                challenge_name=data["challenge_name"],
                phase_status=data.get("phase_status"),
                account_size=data.get("account_size"),
                currency=data.get("currency"),
                broker_type=(data.get("broker_type") or "").lower(),
                mt5_account_id=data.get("mt5_account_id", ""),
                mt5_password=data.get("mt5_password", ""),
                mt5_investor_password=data.get("mt5_investor_password", ""),
                payout_config_type=payout_config_type,
                next_withdrawal_date=data.get("next_withdrawal_date"),
                success=True,
                notes="Migrated successfully",
            )

            results["created"] += 1

        results["batch_id"] = str(batch_id)
        return Response(results)

class MigrationLogListView(generics.ListAPIView):
    """
    List all migration logs with search, filtering, and pagination.
    Example filters:
      - ?batch_id=<uuid>
      - ?email=salmanraza.cloud@gmail.com
      - ?username=salmanraza
      - ?challenge_name=HFT (1-Step Challenge) Accounts
      - ?payout_config_type=custom
      - ?success=true
      - ?created_at_after=2025-09-01
      - ?created_at_before=2025-09-07
      - ?mt5_account_id=369370786
      - ?broker_type=mt5
    """
    permission_classes = [HasPermission]
    required_permissions = ['system.view_migration_logs']
    serializer_class = MigrationLogSerializer
    pagination_class = None  # Or plug in PageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    # === Filtering options ===
    filterset_fields = {
        "batch_id": ["exact"],
        "email": ["icontains", "exact"],
        "username": ["icontains", "exact"],
        "challenge_name": ["icontains", "exact"],
        "payout_config_type": ["exact"],
        "success": ["exact"],
        "created_at": ["gte", "lte"],
        "mt5_account_id": ["exact", "icontains"],   # ✅ new
        "broker_type": ["exact", "icontains"],      # ✅ new
    }

    # === Search across multiple fields ===
    search_fields = [
        "email",
        "username",
        "challenge_name",
        "notes",
        "mt5_account_id",            # ✅ new
        "mt5_password",              # ✅ optional
        "mt5_investor_password",     # ✅ optional
        "broker_type"                # ✅ new
    ]

    # === Allow ordering by fields ===
    ordering_fields = [
        "created_at",
        "email",
        "username",
        "challenge_name",
        "mt5_account_id",   # ✅ new
        "broker_type"       # ✅ new
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        return MigrationLog.objects.all().order_by("-created_at")
    
class MigrationSendEmailView(APIView):
    """
    Reset password and send migration emails for all users in a batch.
    """
    permission_classes = [HasPermission]
    required_permissions = ['system.view_migration_logs']

    def post(self, request, *args, **kwargs):
        batch_id = request.data.get("batch_id")
        if not batch_id:
            return Response({"error": "batch_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        logs = MigrationLog.objects.filter(batch_id=batch_id, success=True).select_related("user")
        if not logs.exists():
            return Response({"error": "No successful migration logs found for this batch"}, status=status.HTTP_404_NOT_FOUND)

        sent, failed = [], []

        for log in logs:
            user = log.user
            if not user:
                failed.append({"email": log.email, "error": "No linked user"})
                continue

            # Reset password
            temp_password = get_random_string(10)
            user.set_password(temp_password)
            user.save()

            # Build email context
            context = {
                "full_name": f"{user.first_name} {user.last_name}".strip(),
                "email": user.email,
                "password": temp_password,
                "mt5_account_id": log.mt5_account_id,
                "mt5_password": log.mt5_password,
                "mt5_investor_password": log.mt5_investor_password,
            }

            try:
                EmailService.send_migration_email(user.email, context)
                sent.append(user.email)
            except Exception as e:
                failed.append({"email": user.email, "error": str(e)})

        return Response({
            "batch_id": batch_id,
            "sent": sent,
            "failed": failed
        }, status=status.HTTP_200_OK)    
    
class PayoutComplianceAnalysisView(generics.RetrieveAPIView):
    """
    GET /api/payouts/<payout_id>/compliance-analysis/

    Returns compliance analysis (AI-generated + flagged trades) for a given payout.
    """
    serializer_class = TraderPayoutComplianceAnalysisSerializer
    permission_classes = [HasPermission]
    required_permissions = ['payouts.view']

    lookup_field = "payout_id"

    def get_object(self):
        payout_id = self.kwargs.get("payout_id")
        try:
            payout = TraderPayout.objects.get(id=payout_id)
        except TraderPayout.DoesNotExist:
            raise NotFound("Payout not found")

        try:
            return payout.compliance_analysis
        except TraderPayoutComplianceAnalysis.DoesNotExist:
            raise NotFound("Compliance analysis not available for this payout yet.")
        
class ChallengeAnalyticsView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['dashboard.view']

    def get(self, request):
        # === Base counts in one query ===
        passed_phase1_statuses = ["phase_1_passed", "phase_2_in_progress", "phase_2_passed", "live_in_progress", "completed", "payout_limit_reached"]
        passed_phase2_statuses = ["phase_2_passed", "live_in_progress", "completed", "payout_limit_reached"]
        reached_live_statuses = ["live_in_progress", "completed", "payout_limit_reached"]

        totals = ChallengeEnrollment.objects.aggregate(
            total=Count("id"),
            phase1=Count("id", filter=Q(status__startswith="phase_1")),
            phase2=Count("id", filter=Q(status__startswith="phase_2")),
            live=Count("id", filter=Q(status__startswith="live")),
            mt5_accounts=Count("id", filter=~Q(mt5_account_id="") & ~Q(mt5_account_id__isnull=True)),
            failed=Count("id", filter=Q(status="failed")),
            passed_phase1=Count("id", filter=Q(status__in=passed_phase1_statuses)),
            passed_phase2=Count("id", filter=Q(status__in=passed_phase2_statuses)),
            reached_live=Count("id", filter=Q(status__in=reached_live_statuses)),
            # For "Reached Live" denominator: 1-step who passed P1 + 2-step who passed P2
            onestep_passed_p1=Count("id", filter=Q(status__in=passed_phase1_statuses, challenge__step_type="1-step")),
            twostep_passed_p2=Count("id", filter=Q(status__in=passed_phase2_statuses, challenge__step_type="2-step")),
        )

        total_challenges = totals["total"] or 0

        # === Percentages ===
        blocked_pct = (totals["failed"] / total_challenges * 100) if total_challenges else 0
        passed_phase1_pct = (totals["passed_phase1"] / total_challenges * 100) if total_challenges else 0
        passed_phase2_pct = (totals["passed_phase2"] / totals["passed_phase1"] * 100) if totals["passed_phase1"] else 0
        reached_live_denom = totals["onestep_passed_p1"] + totals["twostep_passed_p2"]
        reached_live_pct = (totals["reached_live"] / reached_live_denom * 100) if reached_live_denom else 0

        failed_accounts = totals["failed"]

        breach_totals = BreachHistory.objects.aggregate(
            daily=Count("id", filter=Q(rule="max_daily_loss")),
            maxdd=Count("id", filter=Q(rule="max_total_loss")),
        )

        daily_dd_breached_pct = (
            breach_totals["daily"] / failed_accounts * 100 if failed_accounts else 0
        )
        max_dd_breached_pct = (
            breach_totals["maxdd"] / failed_accounts * 100 if failed_accounts else 0
        )

        # === Users ===
        total_users = User.objects.filter(role="client").count()
        avg_accounts_per_user = total_challenges / total_users if total_users else 0

        # === Avg Pass Time (start_date → live_start_date)
        pass_time = ChallengeEnrollment.objects.filter(
            live_start_date__isnull=False
        ).annotate(
            duration=ExpressionWrapper(
                F("live_start_date") - F("start_date"),
                output_field=DurationField()
            )
        ).aggregate(avg_days=Avg("duration"))["avg_days"]

        # === Avg Breach Time (created_at → updated_at, only failed)
        breach_time = ChallengeEnrollment.objects.filter(
            status="failed"
        ).annotate(
            duration=ExpressionWrapper(
                F("updated_at") - F("created_at"),
                output_field=DurationField()
            )
        ).aggregate(avg_days=Avg("duration"))["avg_days"]

        # === Pending payouts (exclude from stats) ===
        pending_payouts = TraderPayout.objects.filter(status="pending").count()

        # === Step stats (1-step & 2-step) ===
        # Funnel: count everyone who passed THROUGH each phase, using live_start_date
        # to distinguish failed-at-live vs failed-before-live.

        def build_funnel(step_type):
            qs = ChallengeEnrollment.objects.filter(challenge__step_type=step_type)
            s = qs.aggregate(
                total=Count("id"),
                p1_in_progress=Count("id", filter=Q(status="phase_1_in_progress")),
                p1_passed=Count("id", filter=Q(status="phase_1_passed")),
                p2_in_progress=Count("id", filter=Q(status="phase_2_in_progress")),
                p2_passed=Count("id", filter=Q(status="phase_2_passed")),
                live_active=Count("id", filter=Q(status="live_in_progress")),
                completed=Count("id", filter=Q(status__in=["completed", "payout_limit_reached"])),
                failed_at_live=Count("id", filter=Q(status="failed", live_start_date__isnull=False)),
                failed_before_live=Count("id", filter=Q(status="failed", live_start_date__isnull=True)),
            )

            # Everyone who got past Phase 1 (currently beyond P1, or failed after reaching live)
            passed_p1 = s["p1_passed"] + s["p2_in_progress"] + s["p2_passed"] + s["live_active"] + s["completed"] + s["failed_at_live"]

            # Live entrants = those who reached live phase
            live_entered = s["live_active"] + s["completed"] + s["failed_at_live"]

            steps = []

            if step_type == "1-step":
                # Phase 1 → Live
                p1_fails = s["failed_before_live"]
                p1_total = passed_p1 + p1_fails
                steps.append({
                    "label": "Phase 1",
                    "entered": s["total"],
                    "passes": passed_p1,
                    "fails": p1_fails,
                    "in_progress": s["p1_in_progress"],
                    "total": p1_total,
                    "fail_rate": f"{(p1_fails / p1_total * 100):.2f}%" if p1_total else "0.00%",
                })
                steps.append({
                    "label": "Live",
                    "entered": live_entered,
                    "passes": s["completed"],
                    "fails": s["failed_at_live"],
                    "in_progress": s["live_active"],
                    "total": live_entered,
                    "fail_rate": f"{(s['failed_at_live'] / live_entered * 100):.2f}%" if live_entered else "0.00%",
                })
            else:
                # Phase 1 → Phase 2 → Live
                # For 2-step, failed_before_live includes both P1 and P2 fails.
                # We can infer: P2 entrants = p2_in_progress + p2_passed + live_active + completed + failed_at_live
                p2_entered = s["p2_in_progress"] + s["p2_passed"] + s["live_active"] + s["completed"] + s["failed_at_live"]
                # P1 fails = those who failed before live AND never entered P2
                # Best approximation: failed_before_live - failed_at_p2
                # failed_at_p2 = passed_p1 - p1_passed - p2_entered... no that doesn't work.
                # Simpler: p1_fails = total - p1_in_progress - passed_p1 - (failed_at_p2 unknown)
                # We attribute all failed_before_live to P1 as a conservative estimate,
                # then compute P2 fails as entered_p2 - passed_p2 - p2_in_progress.
                p1_fails = s["total"] - s["p1_in_progress"] - passed_p1
                p1_total = passed_p1 + p1_fails

                passed_p2 = s["p2_passed"] + s["live_active"] + s["completed"] + s["failed_at_live"]
                p2_fails = p2_entered - s["p2_in_progress"] - passed_p2
                p2_total = passed_p2 + p2_fails

                steps.append({
                    "label": "Phase 1",
                    "entered": s["total"],
                    "passes": passed_p1,
                    "fails": p1_fails,
                    "in_progress": s["p1_in_progress"],
                    "total": p1_total,
                    "fail_rate": f"{(p1_fails / p1_total * 100):.2f}%" if p1_total else "0.00%",
                })
                steps.append({
                    "label": "Phase 2",
                    "entered": p2_entered,
                    "passes": passed_p2,
                    "fails": p2_fails,
                    "in_progress": s["p2_in_progress"],
                    "total": p2_total,
                    "fail_rate": f"{(p2_fails / p2_total * 100):.2f}%" if p2_total else "0.00%",
                })
                steps.append({
                    "label": "Live",
                    "entered": live_entered,
                    "passes": s["completed"],
                    "fails": s["failed_at_live"],
                    "in_progress": s["live_active"],
                    "total": live_entered,
                    "fail_rate": f"{(s['failed_at_live'] / live_entered * 100):.2f}%" if live_entered else "0.00%",
                })

            return steps

        one_step_stats = build_funnel("1-step")
        two_step_stats = build_funnel("2-step")

        # === Final Response ===
        data = {
            "total_challenges": total_challenges,
            "phase1_count": totals["phase1"],
            "phase2_count": totals["phase2"],
            "live_traders": totals["live"],
            "mt5_accounts_count": totals["mt5_accounts"],

            "daily_dd_breached_pct": round(daily_dd_breached_pct, 2),
            "max_dd_breached_pct": round(max_dd_breached_pct, 2),
            "blocked_accounts_pct": round(blocked_pct, 2),

            "passed_phase1_count": totals["passed_phase1"],
            "passed_phase1_pct": round(passed_phase1_pct, 2),
            "passed_phase2_count": totals["passed_phase2"],
            "passed_phase2_pct": round(passed_phase2_pct, 2),
            "reached_live_count": totals["reached_live"],
            "reached_live_pct": round(reached_live_pct, 2),

            "total_users": total_users,
            "avg_accounts_per_user": round(avg_accounts_per_user, 2),

            "avg_pass_time": round(pass_time.days + pass_time.seconds / 86400, 2) if pass_time else None,
            "avg_breach_time": round(breach_time.days + breach_time.seconds / 86400, 2) if breach_time else None,

            "pending_payouts": pending_payouts,

            "one_step_stats": one_step_stats,
            "two_step_stats": two_step_stats,
        }

        return Response(data)
    
class PayoutAnalyticsView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['dashboard.view']

    def get(self, request):
        qs = TraderPayout.objects.all()

        # === Date Filtering ===
        date_filter_applied = False
        quick = request.query_params.get("quick")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        today = now().date()
        filter_start = None
        filter_end = None

        if quick and quick != "all":
            date_filter_applied = True
            if quick == "today":
                filter_start = today
                filter_end = today
            elif quick == "last_7_days":
                filter_start = today - timedelta(days=6)
                filter_end = today
            elif quick == "last_30_days":
                filter_start = today - timedelta(days=29)
                filter_end = today
            elif quick == "this_month":
                filter_start = today.replace(day=1)
                filter_end = today
            elif quick == "last_month":
                last_day_prev = today.replace(day=1) - timedelta(days=1)
                filter_start = last_day_prev.replace(day=1)
                filter_end = last_day_prev
        elif date_from and date_to:
            date_filter_applied = True
            filter_start = date.fromisoformat(date_from)
            filter_end = date.fromisoformat(date_to)

        if date_filter_applied and filter_start and filter_end:
            qs = qs.filter(
                requested_at__date__gte=filter_start,
                requested_at__date__lte=filter_end,
            )

        # === Totals ===
        total_payouts_value = qs.aggregate(total=Sum("amount"))["total"] or 0
        avg_payouts_value = qs.aggregate(avg=Avg("amount"))["avg"] or 0
        num_payouts = qs.count()

        total_withdrawable_profits = qs.aggregate(total=Sum("profit"))["total"] or 0
        total_withdrawable_net = qs.aggregate(total=Sum("net_profit"))["total"] or 0
        avg_profit_split = qs.aggregate(avg=Avg("profit_share"))["avg"] or 0

        # === Previous Period Comparison ===
        previous_period = {}
        trends = {}
        if date_filter_applied and filter_start and filter_end:
            period_days = (filter_end - filter_start).days + 1
            prev_end = filter_start - timedelta(days=1)
            prev_start = prev_end - timedelta(days=period_days - 1)
            prev_qs = TraderPayout.objects.filter(
                requested_at__date__gte=prev_start,
                requested_at__date__lte=prev_end,
            )
            prev_total = prev_qs.aggregate(total=Sum("amount"))["total"] or 0
            prev_count = prev_qs.count()
            prev_avg = prev_qs.aggregate(avg=Avg("amount"))["avg"] or 0
            previous_period = {
                "total_payouts_value": float(prev_total),
                "num_payouts": prev_count,
                "avg_payouts_value": float(prev_avg),
            }

            def pct_change(current, previous):
                if previous == 0:
                    return 100.0 if current > 0 else 0.0
                return round(((current - previous) / previous) * 100, 1)

            trends = {
                "total_payouts_value": pct_change(float(total_payouts_value), float(prev_total)),
                "num_payouts": pct_change(num_payouts, prev_count),
                "avg_payouts_value": pct_change(float(avg_payouts_value), float(prev_avg)),
            }

        # === Payout Reach Rates (Nth payout count / total clients with payouts) ===
        client_payout_counts = (
            qs.values("trader")
            .annotate(cnt=Count("id"))
            .values_list("cnt", flat=True)
        )

        total_clients_with_payouts = len(client_payout_counts)

        def reach_rate(n):
            return (
                sum(1 for c in client_payout_counts if c >= n)
                / total_clients_with_payouts * 100
                if total_clients_with_payouts
                else 0
            )

        payout_reach_rates = {
            "1st": reach_rate(1),
            "2nd": reach_rate(2),
            "3rd": reach_rate(3),
            "4th": reach_rate(4),
        }

        # === Repeat Withdrawal Rate ===
        repeat_withdrawals = sum(1 for c in client_payout_counts if c > 1)
        repeat_withdrawal_rate = (
            repeat_withdrawals / total_clients_with_payouts * 100
            if total_clients_with_payouts else 0
        )

        # === Payouts by Challenge (1-step vs 2-step) ===
        enrollment_filter = {"payouts__isnull": False}
        if date_filter_applied and filter_start and filter_end:
            enrollment_filter["payouts__requested_at__date__gte"] = filter_start
            enrollment_filter["payouts__requested_at__date__lte"] = filter_end

        payouts_by_challenge = ChallengeEnrollment.objects.filter(
            **enrollment_filter
        ).values("challenge__step_type").annotate(
            total_value=Sum("payouts__amount"),
            count=Count("payouts__id"),
        )

        # === Step Type Breakdown (with avg) ===
        step_type_breakdown = list(
            ChallengeEnrollment.objects.filter(
                **enrollment_filter
            ).values("challenge__step_type").annotate(
                total_value=Sum("payouts__amount"),
                count=Count("payouts__id"),
                avg_value=Avg("payouts__amount"),
            )
        )

        # === Account Size Breakdown ===
        account_size_breakdown = list(
            ChallengeEnrollment.objects.filter(
                **enrollment_filter
            ).values("account_size").annotate(
                total_value=Sum("payouts__amount"),
                count=Count("payouts__id"),
                avg_value=Avg("payouts__amount"),
            ).order_by("-total_value")
        )

        # === Time-based stats (always calendar month, unaffected by filter) ===
        last_month = today.replace(day=1) - timedelta(days=1)
        last_month_start = last_month.replace(day=1)
        last_month_end = last_month.replace(day=last_month.day)
        curr_month_start = today.replace(day=1)

        all_qs = TraderPayout.objects.all()
        last_month_payouts = all_qs.filter(
            requested_at__date__gte=last_month_start,
            requested_at__date__lte=last_month_end,
        ).aggregate(total=Sum("amount"))["total"] or 0

        curr_month_payouts = all_qs.filter(
            requested_at__date__gte=curr_month_start
        ).aggregate(total=Sum("amount"))["total"] or 0

        # === Total Live Challenge Enrollment Account Size ===
        funded_value = ChallengeEnrollment.objects.filter(status="live_in_progress") \
        .aggregate(total=Sum("account_size"))["total"] or 0

        withdrawals = qs.aggregate(
            approved=Sum("amount", filter=Q(status="approved")),
            paid=Sum("amount", filter=Q(status="paid")),
            pending=Sum("amount", filter=Q(status="pending")),
            declined=Sum("amount", filter=Q(status="rejected")),
        )

        # === Top repeat withdrawers ===
        top_repeat_withdrawers = (
            qs.values("trader__id", "trader__first_name", "trader__last_name")
            .annotate(
                withdrawal_count=Count("id"),
                total_net=Sum("net_profit"),
                total_client_share=Sum("amount"),
            )
            .order_by("-withdrawal_count")[:10]
        )

        # === Payouts by country ===
        payouts_by_country_qs = (
            qs.filter(trader__client_profile__address_info__country__isnull=False)
            .values("trader__client_profile__address_info__country")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )
        payouts_by_country = [
            {
                "trader__profile__country": row["trader__client_profile__address_info__country"],
                "total": row["total"] or 0,
                "count": row["count"],
            }
            for row in payouts_by_country_qs
        ]

        data = {
            "total_payouts_value": total_payouts_value,
            "avg_payouts_value": avg_payouts_value,
            "num_payouts": num_payouts,
            "total_withdrawable_profits": total_withdrawable_profits,
            "total_withdrawable_net": total_withdrawable_net,
            "avg_profit_split": avg_profit_split,
            "payout_reach_rates": payout_reach_rates,
            "repeat_withdrawal_rate": repeat_withdrawal_rate,
            "payouts_by_challenge": list(payouts_by_challenge),
            "last_month_payouts": last_month_payouts,
            "current_month_payouts": curr_month_payouts,
            "total_funded_value": funded_value,
            "approved_withdrawals_value": withdrawals["approved"] or 0,
            "paid_withdrawals_value": withdrawals["paid"] or 0,
            "pending_withdrawals_value": withdrawals["pending"] or 0,
            "declined_withdrawals_value": withdrawals["declined"] or 0,
            "top_repeat_withdrawers": list(top_repeat_withdrawers),
            "payouts_by_country": payouts_by_country,
            "date_filter_applied": date_filter_applied,
            "previous_period": previous_period,
            "trends": trends,
            "step_type_breakdown": step_type_breakdown,
            "account_size_breakdown": account_size_breakdown,
        }

        return Response(data)
    
class OrderAnalyticsView(APIView):
    """
    Analytics dashboard for Orders.
    Provides aggregated stats on orders, revenue, discounts, affiliates, and more.
    """
    permission_classes = [HasPermission]
    required_permissions = ['dashboard.view']

    def get(self, request):
        qs = Order.objects.all()

        # === Core Metrics ===
        total_orders = qs.count()
        total_revenue = qs.aggregate(total=Sum("order_total_usd"))["total"] or 0
        avg_order_value = qs.aggregate(avg=Avg("order_total_usd"))["avg"] or 0
        refunded_amount = qs.filter(status="refunded").aggregate(total=Sum("order_total_usd"))["total"] or 0

        # === Discounts & Coupons ===
        total_discounts = qs.aggregate(total=Sum("coupons_discount_usd"))["total"] or 0
        coupon_usage_count = qs.exclude(coupon_codes=[]).count()

        # === Payment Status ===
        payment_status_breakdown = qs.values("payment_status").annotate(count=Count("id"))

        # === Status Breakdown ===
        status_breakdown = qs.values("status").annotate(count=Count("id"))

        # === Monthly Trends ===
        now = dj_timezone.now()
        last_month = now - timedelta(days=30)

        last_month_orders = qs.filter(date_created__gte=last_month).count()
        last_month_revenue = qs.filter(date_created__gte=last_month).aggregate(total=Sum("order_total_usd"))["total"] or 0

        current_month_orders = qs.filter(date_created__month=now.month, date_created__year=now.year).count()
        current_month_revenue = qs.filter(date_created__month=now.month, date_created__year=now.year).aggregate(total=Sum("order_total_usd"))["total"] or 0

        # === Affiliates ===
        affiliate_orders = qs.filter(affiliate__isnull=False).count()
        affiliate_revenue = qs.filter(affiliate__isnull=False).aggregate(total=Sum("order_total_usd"))["total"] or 0

        # === Orders by Country ===
        orders_by_country = (
            qs.exclude(billing_address={})
            .values(country=F("billing_address__country"))
            .annotate(count=Count("id"), revenue=Sum("order_total_usd"))
            .order_by("-count")
        )

        # === Top Customers ===
        top_customers = (
            qs.values("customer_email", "customer_name")
            .annotate(
                order_count=Count("id"),
                total_spent=Sum("order_total_usd"),
                avg_spent=Avg("order_total_usd"),
            )
            .order_by("-total_spent")[:10]
        )
        
        # === Repeating Top Customers ===
        repeating_customers = (
            qs.values("customer_email", "customer_name")
            .annotate(
                order_count=Count("id"),
                total_spent=Sum("order_total_usd"),
                avg_spent=Avg("order_total_usd"),
            )
            .filter(order_count__gt=1)   # only repeat buyers
            .order_by("-order_count", "-total_spent")[:10]
        )

        data = {
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "avg_order_value": avg_order_value,
            "refunded_amount": refunded_amount,
            "total_discounts": total_discounts,
            "coupon_usage_count": coupon_usage_count,
            "payment_status_breakdown": list(payment_status_breakdown),
            "status_breakdown": list(status_breakdown),
            "last_month_orders": last_month_orders,
            "last_month_revenue": last_month_revenue,
            "current_month_orders": current_month_orders,
            "current_month_revenue": current_month_revenue,
            "affiliate_orders": affiliate_orders,
            "affiliate_revenue": affiliate_revenue,
            "orders_by_country": list(orders_by_country),
            "top_customers": list(top_customers),
            "repeating_customers": list(repeating_customers),
        }
        return Response(data)
    
class TradeAnalyticsView(APIView):
    """
    Analytics dashboard for MT5 Trades — LIVE FUNDED ACCOUNTS ONLY.
    Includes challenge funnel stats and live account survival metrics.
    """
    permission_classes = [HasPermission]
    required_permissions = ['dashboard.view']

    @staticmethod
    def _live_account_ids():
        """Return set of MT5 account_id ints belonging to live-phase enrollments."""
        live_statuses = ["live_in_progress", "completed"]
        ids = set()
        for aid in (
            ChallengeEnrollment.objects.filter(
                status__in=live_statuses,
                mt5_account_id__isnull=False,
            )
            .exclude(mt5_account_id="")
            .values_list("mt5_account_id", flat=True)
        ):
            try:
                ids.add(int(aid))
            except (ValueError, TypeError):
                pass
        for aid in (
            EnrollmentAccount.objects.filter(
                enrollment__status__in=live_statuses,
                phase_type="live-trader",
                mt5_account_id__isnull=False,
            )
            .exclude(mt5_account_id="")
            .values_list("mt5_account_id", flat=True)
        ):
            try:
                ids.add(int(aid))
            except (ValueError, TypeError):
                pass
        return ids

    def get(self, request):
        # === Filter to live accounts only ===
        live_ids = self._live_account_ids()
        qs = MT5Trade.objects.filter(account_id__in=live_ids) if live_ids else MT5Trade.objects.none()

        # === Core Metrics ===
        total_trades = qs.count()
        total_profit = qs.aggregate(total=Sum("profit"))["total"] or 0
        avg_profit_per_trade = qs.aggregate(avg=Avg("profit"))["avg"] or 0
        total_commission = qs.aggregate(total=Sum("commission"))["total"] or 0
        total_storage = qs.aggregate(total=Sum("storage"))["total"] or 0

        # === Trade Directions ===
        direction_breakdown = qs.values("cmd").annotate(count=Count("id"))

        # === By Symbols ===
        top_symbols = (
            qs.values("symbol")
            .annotate(
                trade_count=Count("id"),
                total_profit=Sum("profit"),
                avg_profit=Avg("profit"),
            )
            .order_by("-trade_count")[:10]
        )

        # === By Accounts ===
        top_accounts = (
            qs.values("account_id")
            .annotate(
                trade_count=Count("id"),
                total_profit=Sum("profit"),
                avg_profit=Avg("profit"),
            )
            .order_by("-total_profit")[:10]
        )

        # === Monthly Trends ===
        now = dj_timezone.now()
        last_month_start = now.replace(day=1) - timedelta(days=1)
        last_month_start = last_month_start.replace(day=1)

        last_month_qs = qs.filter(
            close_time__month=last_month_start.month,
            close_time__year=last_month_start.year,
        )
        last_month_trades = last_month_qs.count()
        last_month_profit = last_month_qs.aggregate(total=Sum("profit"))["total"] or 0

        current_month_qs = qs.filter(close_time__month=now.month, close_time__year=now.year)
        current_month_trades = current_month_qs.count()
        current_month_profit = current_month_qs.aggregate(total=Sum("profit"))["total"] or 0

        # === Top Losing Trades ===
        worst_trades = (
            qs.order_by("profit")
            .values("order", "account_id", "symbol", "profit", "volume", "open_price", "close_price")
            [:10]
        )

        # === Top Winning Trades ===
        best_trades = (
            qs.order_by("-profit")
            .values("order", "account_id", "symbol", "profit", "volume", "open_price", "close_price")
            [:10]
        )

        # === Challenge Funnel Stats ===
        total_enrollments = ChallengeEnrollment.objects.count()
        failed_phase1 = ChallengeEnrollment.objects.filter(
            status="failed",
        ).filter(
            Q(live_start_date__isnull=True),
        ).filter(
            # Never had a phase-2 account → failed in phase 1
            ~Q(accounts__phase_type="phase-2"),
        ).count()
        failed_phase2 = ChallengeEnrollment.objects.filter(
            status="failed",
            live_start_date__isnull=True,
            accounts__phase_type="phase-2",
        ).distinct().count()
        reached_live = ChallengeEnrollment.objects.filter(
            status__in=["live_in_progress", "completed", "payout_limit_reached"],
        ).count()
        # Also count failed enrollments that did reach live before failing
        reached_live += ChallengeEnrollment.objects.filter(
            status="failed",
            live_start_date__isnull=False,
        ).count()
        live_active = ChallengeEnrollment.objects.filter(status="live_in_progress").count()
        live_failed = ChallengeEnrollment.objects.filter(
            status="failed",
            live_start_date__isnull=False,
        ).count()

        # === Live Account Survival ===
        # Average days a live account lasted before breach
        survival_data = (
            ChallengeEnrollment.objects.filter(
                status="failed",
                live_start_date__isnull=False,
                breach_records__isnull=False,
            )
            .distinct()
            .values_list("live_start_date", "breach_records__breached_at")
        )
        survival_days_list = []
        for live_start, breach_at in survival_data:
            if live_start and breach_at:
                delta = (breach_at.date() - live_start).days
                if delta >= 0:
                    survival_days_list.append(delta)
        avg_live_survival_days = (
            round(sum(survival_days_list) / len(survival_days_list), 1)
            if survival_days_list else None
        )

        data = {
            "total_live_accounts": len(live_ids),
            "total_trades": total_trades,
            "total_profit": total_profit,
            "avg_profit_per_trade": avg_profit_per_trade,
            "total_commission": total_commission,
            "total_storage": total_storage,
            "direction_breakdown": list(direction_breakdown),
            "top_symbols": list(top_symbols),
            "top_accounts": list(top_accounts),
            "last_month_trades": last_month_trades,
            "last_month_profit": last_month_profit,
            "current_month_trades": current_month_trades,
            "current_month_profit": current_month_profit,
            "best_trades": list(best_trades),
            "worst_trades": list(worst_trades),
            # Challenge funnel
            "funnel": {
                "total_enrollments": total_enrollments,
                "failed_phase1": failed_phase1,
                "failed_phase2": failed_phase2,
                "reached_live": reached_live,
                "live_active": live_active,
                "live_failed": live_failed,
            },
            # Live account survival
            "avg_live_survival_days": avg_live_survival_days,
        }
        return Response(data)

EXPECTED_API_KEY = "LK9U6G4l43n0"

class SMTPTestView(APIView):
    """
    POST /api/utils/test-smtp/
    Body:
    {
        "api_key": "your-secret-api-key",
        "host": "smtp.gmail.com",
        "port": 587,
        "username": "your@email.com",
        "password": "yourpassword",
        "use_tls": true,
        "use_ssl": false,
        "to_email": "recipient@example.com"
    }
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Step 1: Check API key
        api_key = request.data.get("api_key")
        if api_key != EXPECTED_API_KEY:
            return Response(
                {"error": "Invalid API key."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Step 2: Extract fields
        host = request.data.get("host")
        port = request.data.get("port")
        username = request.data.get("username")
        password = request.data.get("password")
        use_tls = bool(request.data.get("use_tls", False))
        use_ssl = bool(request.data.get("use_ssl", False))
        to_email = request.data.get("to_email")

        # Step 3: Validation
        if not all([host, port, username, password, to_email]):
            return Response(
                {"error": "Missing required fields"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if use_tls and use_ssl:
            return Response(
                {"error": "EMAIL_USE_TLS and EMAIL_USE_SSL cannot both be true."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Step 4: Try sending email
        try:
            connection = get_connection(
                host=host,
                port=port,
                username=username,
                password=password,
                use_tls=use_tls,
                use_ssl=use_ssl,
                fail_silently=False,
            )

            email = EmailMessage(
                subject="SMTP Test Email",
                body="This is a test email to confirm SMTP settings are working.",
                from_email="support@we-fund.com",
                to=[to_email],
                connection=connection,
            )

            email.send()

            return Response({"success": f"Test email sent to {to_email}"})
        except Exception as e:
            return Response({"error": str(e)}, status=500)
        
class InternalNotePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class InternalNoteViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Internal Notes.
    Allows attaching notes to any model via content_type + object_id.
    Example: ?content_type=clientprofile&object_id=<uuid>
    """
    serializer_class = InternalNoteSerializer
    permission_classes = [HasPermission]
    required_permissions = ['traders.edit']
    pagination_class = InternalNotePagination

    def get_queryset(self):
        queryset = InternalNote.objects.all()

        trader_id = self.request.query_params.get("trader_id")
        content_type = self.request.query_params.get("content_type")
        object_id = self.request.query_params.get("object_id")

        if trader_id:
            # Unified notes: return ALL notes for this trader
            queryset = queryset.filter(trader_id=trader_id)
        elif content_type and object_id:
            try:
                ct = ContentType.objects.get(model=content_type.lower())
                queryset = queryset.filter(content_type=ct, object_id=object_id)
            except ContentType.DoesNotExist:
                queryset = queryset.none()
        elif self.action == 'list':
            # Require filtering for list action to prevent leaking all notes
            queryset = queryset.none()

        return queryset.order_by("-created_at")

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Return a lightweight summary of notes for a given object or trader."""
        trader_id = request.query_params.get("trader_id")
        content_type = request.query_params.get("content_type")
        object_id = request.query_params.get("object_id")

        empty_response = {"total_count": 0, "has_high_risk": False, "category_counts": {}, "latest_notes": []}

        if trader_id:
            # Unified summary: all notes for this trader
            notes = InternalNote.objects.filter(trader_id=trader_id).order_by("-created_at")
        elif content_type and object_id:
            # Validate object_id is a valid UUID
            import uuid as uuid_mod
            try:
                uuid_mod.UUID(str(object_id))
            except (ValueError, AttributeError):
                return Response(empty_response)

            try:
                ct = ContentType.objects.get(model=content_type.lower())
            except ContentType.DoesNotExist:
                return Response(empty_response)

            notes = InternalNote.objects.filter(content_type=ct, object_id=object_id).order_by("-created_at")
        else:
            return Response(
                {"error": "trader_id or content_type+object_id are required"},
                status=400,
            )

        total_count = notes.count()

        if total_count == 0:
            return Response(empty_response)

        has_high_risk = notes.filter(is_high_risk=True).exists()

        from django.db.models import Count
        category_qs = notes.values("category").annotate(count=Count("id"))
        category_counts = {item["category"]: item["count"] for item in category_qs}

        latest_notes = notes[:3]
        serializer = self.get_serializer(latest_notes, many=True)

        return Response({
            "total_count": total_count,
            "has_high_risk": has_high_risk,
            "category_counts": category_counts,
            "latest_notes": serializer.data,
        })

class PayoutPolicyViewSet(viewsets.ModelViewSet):
    queryset = PayoutPolicy.objects.select_related("challenge").prefetch_related("split_tiers")
    serializer_class = PayoutPolicySerializer
    permission_classes = [HasPermission]
    required_permissions = ['payouts.view_config']

    def perform_create(self, serializer):
        policy = serializer.save()
        log_event(
            request=self.request,
            user=self.request.user,
            category="payout",
            event_type="payout_policy_created",
            metadata={
                "challenge": policy.challenge.name,
                "first_payout_delay_days": policy.first_payout_delay_days,
                "subsequent_cycle_days": policy.subsequent_cycle_days,
                "min_net_amount": str(policy.min_net_amount),
                "base_share_percent": str(policy.base_share_percent),
                "is_active": policy.is_active,
            },
            description=f"Payout policy created for challenge {policy.challenge.name}"
        )

    def perform_update(self, serializer):
        policy = self.get_object()

        before = {
            "first_payout_delay_days": policy.first_payout_delay_days,
            "subsequent_cycle_days": policy.subsequent_cycle_days,
            "min_net_amount": str(policy.min_net_amount),
            "base_share_percent": str(policy.base_share_percent),
            "is_active": policy.is_active,
        }

        policy = serializer.save()

        after = {
            "first_payout_delay_days": policy.first_payout_delay_days,
            "subsequent_cycle_days": policy.subsequent_cycle_days,
            "min_net_amount": str(policy.min_net_amount),
            "base_share_percent": str(policy.base_share_percent),
            "is_active": policy.is_active,
        }

        if before != after:
            log_event(
                request=self.request,
                user=self.request.user,
                category="payout",
                event_type="payout_policy_updated",
                metadata={"before": before, "after": after},
                description=f"Payout policy updated for challenge {policy.challenge.name}"
            )

    def perform_destroy(self, instance):
        challenge_name = instance.challenge.name

        log_event(
            request=self.request,
            user=self.request.user,
            category="payout",
            event_type="payout_policy_deleted",
            metadata={"challenge": challenge_name},
            description=f"Payout policy deleted for challenge {challenge_name}"
        )

        return super().perform_destroy(instance)


class PayoutSplitTierViewSet(viewsets.ModelViewSet):
    """
    CRUD for payout split tiers.
    """
    queryset = PayoutSplitTier.objects.select_related("policy")
    serializer_class = PayoutSplitTierSerializer
    permission_classes = [HasPermission]
    required_permissions = ['payouts.view_config']

    def perform_create(self, serializer):
        request = self.request
        tier = serializer.save()

        log_event(
            request=request,
            user=request.user,
            category="payout",
            event_type="payout_split_tier_created",
            metadata={
                "tier_id": str(tier.id),
                "policy_id": str(tier.policy.id),
                "challenge_name": tier.policy.challenge.name,
                "from_payout_number": tier.from_payout_number,
                "to_payout_number": tier.to_payout_number,
                "share_percent": str(tier.share_percent),
            },
            description=(
                f"Admin ({request.user.email}) created payout split tier "
                f"for challenge '{tier.policy.challenge.name}'."
            )
        )

    def perform_update(self, serializer):
        request = self.request
        instance = self.get_object()

        before = {
            "from_payout_number": instance.from_payout_number,
            "to_payout_number": instance.to_payout_number,
            "share_percent": str(instance.share_percent),
        }

        tier = serializer.save()

        after = {
            "from_payout_number": tier.from_payout_number,
            "to_payout_number": tier.to_payout_number,
            "share_percent": str(tier.share_percent),
        }

        if before != after:
            log_event(
                request=request,
                user=request.user,
                category="payout",
                event_type="payout_split_tier_updated",
                metadata={
                    "tier_id": str(tier.id),
                    "policy_id": str(tier.policy.id),
                    "challenge_name": tier.policy.challenge.name,
                    "before": before,
                    "after": after,
                },
                description=(
                    f"Admin ({request.user.email}) updated payout split tier "
                    f"for challenge '{tier.policy.challenge.name}'."
                )
            )

    def perform_destroy(self, instance):
        request = self.request

        log_event(
            request=request,
            user=request.user,
            category="payout",
            event_type="payout_split_tier_deleted",
            metadata={
                "tier_id": str(instance.id),
                "policy_id": str(instance.policy.id),
                "challenge_name": instance.policy.challenge.name,
                "from_payout_number": instance.from_payout_number,
                "to_payout_number": instance.to_payout_number,
                "share_percent": str(instance.share_percent),
            },
            description=(
                f"Admin ({request.user.email}) deleted payout split tier "
                f"for challenge '{instance.policy.challenge.name}'."
            )
        )

        instance.delete()

    
class SuperUserProfileView(generics.RetrieveUpdateAPIView):
    """
    View & edit logged-in superuser profile.
    """
    serializer_class = SuperUserProfileSerializer
    permission_classes = [HasPermission]
    required_permissions = ['users.view']

    def get_object(self):
        return self.request.user


class SuperUserPasswordChangeView(generics.UpdateAPIView):
    """
    Change password for logged-in superuser.
    """
    serializer_class = SuperUserPasswordChangeSerializer
    permission_classes = [HasPermission]
    required_permissions = ['users.edit']

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"old_password": ["Incorrect password."]}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["new_password"])
        user.save()
        update_session_auth_hash(request, user)  # keep session alive after password change

        log_event(
            request=request,
            user=user,
            category="security",
            event_type="superuser_password_changed",
            metadata={
                "user_id": str(user.id),
                "username": user.username,
            },
            description=f"Superuser ({user.email}) changed their account password."
        )

        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)
    
class RevertBreachAndActivateView(APIView):
    """
    Reverts a breach by breach_id using saved pre-breach state,
    re-activates trading, and logs the action.
    """
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def post(self, request, breach_id):
        breach = get_object_or_404(
            BreachHistory.objects.select_related("enrollment__client__user"),
            id=breach_id
        )
        enrollment = breach.enrollment
        user = enrollment.client.user

        # Snapshot BEFORE revert
        before = {
            "status": enrollment.status,
            "is_active": enrollment.is_active,
            "notes": enrollment.notes,
        }

        # --- Step 1: Reactivate MT5 trading ---
        if not enrollment.mt5_account_id:
            return Response(
                {"error": "Enrollment has no linked MT5 account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            success = activate_trading(int(enrollment.mt5_account_id))
            if not success:
                return Response(
                    {"error": "Failed to activate trading on MT5."},
                    status=status.HTTP_502_BAD_GATEWAY
                )
        except Exception as e:
            logger.exception(f"[RevertBreach] Failed to activate trading for {enrollment.mt5_account_id}: {e}")
            return Response(
                {"error": f"MT5 activation error: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        # --- Step 2: Restore previous enrollment state ---
        prev = breach.previous_state or {}

        # Use stored values if present, otherwise safe defaults
        enrollment.status = prev.get("status", "active")
        enrollment.is_active = prev.get("is_active", True)
        enrollment.notes = prev.get("notes", enrollment.notes)

        # If it's the first time going live, keep live_start_date consistent
        if not enrollment.live_start_date:
            enrollment.live_start_date = dj_timezone.now().date()

        enrollment.save(update_fields=["status", "is_active", "notes", "live_start_date", "updated_at"])

        # Snapshot AFTER revert
        after = {
            "status": enrollment.status,
            "is_active": enrollment.is_active,
            "notes": enrollment.notes,
        }

        # --- Step 3: Log Event ---
        log_event(
            request=request,
            user=user,
            category="risk",
            event_type="breach_reverted",
            challenge_enrollment=enrollment,
            metadata={
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "breach_id": str(breach.id),
                "before": before,
                "after": after,
            },
            description=f"Admin ({request.user.email}) reverted breach #{breach.id} and reactivated trading"
        )

        # --- Step 3: Log revert action ---
        BreachHistory.objects.create(
            user=request.user,
            client=enrollment.client,
            enrollment=enrollment,
            rule="Breach Reverted",
            reason=f"Breach #{breach.id} reverted by admin {request.user.username}",
            previous_state=None  # optional: you can skip this
        )

        logger.info(
            f"[RevertBreach] Breach {breach.id} reverted for enrollment {enrollment.id} by {request.user.username}"
        )

        return Response(
            {
                "message": f"Breach {breach.id} reverted and trading re-activated.",
                "breach_id": breach.id,
                "enrollment_id": str(enrollment.id),
                "restored_status": enrollment.status,
                "mt5_account": enrollment.mt5_account_id
            },
            status=status.HTTP_200_OK
        )
    
class BulkRevertBreachAndActivateView(APIView):
    """
    Allows admin to revert multiple breaches in bulk.
    Accepts a list of breach IDs, attempts to revert each one
    using the same logic as RevertBreachAndActivateView, but continues
    even if some fail (collects results).
    """
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def post(self, request):
        breach_ids = request.data.get("breach_ids")
        if not breach_ids or not isinstance(breach_ids, list):
            return Response(
                {"error": "Please provide a list of breach_ids."},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = {"success": [], "failed": []}

        for breach_id in breach_ids:
            try:
                breach = BreachHistory.objects.select_related(
                    "enrollment__client__user"
                ).get(id=breach_id)
                enrollment = breach.enrollment
                user = enrollment.client.user

                before = {
                    "status": enrollment.status,
                    "is_active": enrollment.is_active,
                    "notes": enrollment.notes,
                }

                # --- Reactivate MT5 ---
                if not enrollment.mt5_account_id:
                    raise ValueError("No MT5 account linked.")

                try:
                    success = activate_trading(int(enrollment.mt5_account_id))
                    if not success:
                        raise ValueError("Failed to activate trading on MT5.")
                except Exception as e:
                    raise ValueError(f"MT5 activation error: {str(e)}")

                # --- Restore previous state ---
                prev = breach.previous_state or {}
                enrollment.status = prev.get("status", "active")
                enrollment.is_active = prev.get("is_active", True)
                enrollment.notes = prev.get("notes", enrollment.notes)

                if not enrollment.live_start_date:
                    enrollment.live_start_date = dj_timezone.now().date()

                with transaction.atomic():
                    enrollment.save(
                        update_fields=[
                            "status", "is_active", "notes", "live_start_date", "updated_at"
                        ]
                    )

                    # Log Event
                    log_event(
                        request=request,
                        user=user,
                        category="risk",
                        event_type="breach_reverted_bulk",
                        challenge_enrollment=enrollment,
                        metadata={
                            "admin_id": str(request.user.id),
                            "admin_email": request.user.email,
                            "breach_id": str(breach.id),
                            "bulk": True,
                            "before": before,
                            "after": {
                                "status": enrollment.status,
                                "is_active": enrollment.is_active,
                                "notes": enrollment.notes,
                            },
                        },
                        description=f"Admin ({request.user.email}) reverted breach #{breach.id} (bulk action)."
                    )

                    # Add new BreachHistory record for tracking
                    BreachHistory.objects.create(
                        user=request.user,
                        client=enrollment.client,
                        enrollment=enrollment,
                        rule="Breach Reverted (Bulk)",
                        reason=f"Breach #{breach.id} reverted via bulk action by {request.user.username}",
                    )

                results["success"].append({
                    "breach_id": breach_id,
                    "enrollment_id": str(enrollment.id),
                    "mt5_account": enrollment.mt5_account_id,
                })

            except Exception as e:
                logger.exception(f"[BulkRevertBreach] Failed for breach {breach_id}: {e}")
                results["failed"].append({
                    "breach_id": breach_id,
                    "error": str(e),
                })

        summary = {
            "total": len(breach_ids),
            "success_count": len(results["success"]),
            "failed_count": len(results["failed"]),
            "success": results["success"],
            "failed": results["failed"],
        }

        logger.info(
            f"[BulkRevertBreach] Bulk revert completed by {request.user.email}. "
            f"Success: {len(results['success'])}, Failed: {len(results['failed'])}"
        )

        return Response(summary, status=status.HTTP_200_OK)    
        
class PeriodicTaskListView(generics.ListAPIView):
    """List all periodic tasks"""
    queryset = PeriodicTask.objects.all().order_by("name")
    serializer_class = PeriodicTaskSerializer
    permission_classes = [HasPermission]
    required_permissions = ['system.manage_engine']


class PeriodicTaskToggleView(generics.UpdateAPIView):
    queryset = PeriodicTask.objects.all()
    serializer_class = PeriodicTaskSerializer
    permission_classes = [HasPermission]
    required_permissions = ['system.manage_engine']

    def post(self, request, pk):
        task = self.get_object()
        action = request.data.get("action")  # "start" or "stop"

        before = task.enabled

        if action == "start":
            task.enabled = True
            event_type = "engine_task_started"
            description = f"Admin ({request.user.email}) ENABLED periodic task '{task.name}'."
        elif action == "stop":
            task.enabled = False
            event_type = "engine_task_stopped"
            description = f"Admin ({request.user.email}) DISABLED periodic task '{task.name}'."
        else:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

        task.save()

        # Log Event
        log_event(
            request=request,
            user=request.user,
            category="engine",
            event_type=event_type,
            metadata={
                "task_id": str(task.id),
                "task_name": task.name,
                "previous_enabled": before,
                "new_enabled": task.enabled,
            },
            description=description
        )

        return Response(PeriodicTaskSerializer(task).data)


class PeriodicTaskEditView(generics.UpdateAPIView):
    queryset = PeriodicTask.objects.all()
    serializer_class = PeriodicTaskSerializer
    permission_classes = [HasPermission]
    required_permissions = ['system.manage_engine']

    def post(self, request, pk):
        task = self.get_object()
        schedule_type = request.data.get("type")  # "interval" or "crontab"

        before = {
            "interval": str(task.interval) if task.interval else None,
            "crontab": str(task.crontab) if task.crontab else None,
        }

        if schedule_type == "interval":
            every = int(request.data.get("every", 1))
            period = request.data.get("period", "minutes")
            interval, _ = IntervalSchedule.objects.get_or_create(every=every, period=period)
            task.interval = interval
            task.crontab = None

        elif schedule_type == "crontab":
            cron, _ = CrontabSchedule.objects.get_or_create(
                minute=request.data.get("minute", "0"),
                hour=request.data.get("hour", "*"),
                day_of_week=request.data.get("day_of_week", "*"),
                day_of_month=request.data.get("day_of_month", "*"),
                month_of_year=request.data.get("month_of_year", "*"),
                timezone="UTC"
            )
            task.crontab = cron
            task.interval = None

        else:
            return Response({"error": "Invalid schedule type"}, status=status.HTTP_400_BAD_REQUEST)

        task.save()

        after = {
            "interval": str(task.interval) if task.interval else None,
            "crontab": str(task.crontab) if task.crontab else None,
        }

        # Log Event
        log_event(
            request=request,
            user=request.user,
            category="engine",
            event_type="engine_task_schedule_updated",
            metadata={
                "task_id": str(task.id),
                "task_name": task.name,
                "before": before,
                "after": after,
            },
            description=f"Admin ({request.user.email}) updated schedule for periodic task '{task.name}'."
        )

        return Response(PeriodicTaskSerializer(task).data)
    
class IPSummaryView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_ip_analysis']

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        data = fetch_ip_summary(limit=999999999, search=search or None)
        return Response(data)


class AccountsByIPView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_ip_analysis']

    def get(self, request, ip):
        accounts = fetch_accounts_by_ip(ip)

        # Check enrollment for each account
        enriched_accounts = []
        for acc in accounts:
            enrollment = ChallengeEnrollment.objects.filter(
                mt5_account_id=str(acc["login"])
            ).first()
            acc["enrollment_id"] = enrollment.id if enrollment else None
            enriched_accounts.append(acc)

        return Response(enriched_accounts)
    
class AdminUserViewSet(viewsets.ModelViewSet):
    """
    CRUD API for managing admin, support, and risk users.
    """
    serializer_class = AdminUserSerializer
    permission_classes = [HasPermission]
    required_permissions = ['users.view']

    def get_queryset(self):
        return User.objects.filter(role__in=["admin", "support", "risk", "content_creator", "discord_manager"])
    
    def perform_destroy(self, instance):
        request = self.request

        log_event(
            request=request,
            user=instance,
            category="admin",
            event_type="admin_user_deleted",
            metadata={"email": instance.email, "role": instance.role},
            description=f"Admin ({request.user.email}) deleted admin user ({instance.email})."
        )

        instance.delete()
    
class ImpersonateUserView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['traders.impersonate']

    def post(self, request):
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id is required"}, status=400)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if user.role not in ("client", "affiliate"):
            return Response({"error": "Can only impersonate client/affiliate"}, status=400)

        # Create one-time ticket
        ticket = str(uuid.uuid4())
        cache.set(f"impersonate:{ticket}", user.id, timeout=60)  # valid for 60 sec

        # Log impersonation
        ImpersonationLog.objects.create(
            superuser=request.user,
            target_user=user,
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")
        )

        # EventLog entry for UI audit trail
        log_event(
            request=request,
            user=user,  # the user being impersonated
            category="admin",
            event_type="admin_action",
            metadata={
                "impersonated_user_id": str(user.id),
                "impersonated_user_email": user.email,
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "ticket": ticket,
            },
            description=f"Admin ({request.user.email}) requested impersonation of {user.email}"
        )

        return Response({"ticket": ticket}, status=200)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]
        return request.META.get("REMOTE_ADDR")

class CertificateTemplateViewSet(viewsets.ModelViewSet):
    """
    API endpoint to manage certificate templates.
    Only superusers can create, update, or delete.
    """
    queryset = CertificateTemplate.objects.all()
    serializer_class = CertificateTemplateSerializer
    permission_classes = [HasPermission]
    required_permissions = ['certificates.manage']

class BulkPayoutConfigImportView(APIView):
    """
    API endpoint for superusers to bulk import payout configs from CSV.
    CSV Header: MT5 ID | DATE | SHARE
    """

    permission_classes = [HasPermission]
    required_permissions = ['payouts.view_config']

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"detail": "No file uploaded."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Setup log
        log = PayoutConfigImportLog.objects.create(
            uploaded_by=request.user,
            file_name=file.name,
        )

        errors = []
        processed = 0
        total = 0

        try:
            data = file.read().decode("utf-8")
            reader = csv.DictReader(io.StringIO(data))

            for row in reader:
                total += 1
                try:
                    mt5_id = row.get("MT5 ID")
                    date_str = row.get("DATE")
                    share = row.get("SHARE")

                    if not (mt5_id and date_str and share):
                        raise ValueError("Missing required fields (MT5 ID, DATE, SHARE)")

                    enrollment = get_object_or_404(ChallengeEnrollment, mt5_account_id=mt5_id)

                    live_date = datetime.strptime(date_str.strip(), "%Y-%m-%d").date()

                    # Create payout config
                    payout_cfg = PayoutConfiguration.objects.create(
                        client=enrollment.client.user,
                        enrollment=enrollment,
                        config_type="custom",
                        live_trading_start_date=live_date - timedelta(days=14),
                        payment_cycle="biweekly",
                        profit_share_percent=share,
                        min_net_amount=50.00,
                        is_active=True,
                        notes="Custom config migrated from CSV (next withdrawal provided)",
                    )

                    processed += 1

                    log_event(
                        request=request,
                        user=enrollment.client.user,
                        category="migration",
                        event_type="payout_config_import_success",
                        challenge_enrollment=enrollment,
                        metadata={
                            "admin_id": str(request.user.id),
                            "admin_email": request.user.email,
                            "row_number": total,
                            "mt5_account_id": mt5_id,
                            "profit_share": share,
                            "live_start_date": payout_cfg.live_trading_start_date.isoformat(),
                        },
                        description=f"Payout config imported successfully for account {mt5_id} by {request.user.email}."
                    )

                except Exception as e:
                    errors.append({"row": total, "error": str(e)})

                    log_event(
                        request=request,
                        user=None,
                        category="migration",
                        event_type="payout_config_import_failed",
                        metadata={
                            "admin_id": str(request.user.id),
                            "admin_email": request.user.email,
                            "row_number": total,
                            "mt5_account_id": row.get("MT5 ID"),
                            "raw_row": row,
                            "error": str(e),
                        },
                        description=f"Payout config import failed for row {total} by {request.user.email}."
                    )

        finally:
            log.total_rows = total
            log.processed_rows = processed
            log.errors = errors
            log.save()

        return Response({
            "detail": f"Processed {processed}/{total} rows.",
            "log_id": log.id,
            "errors": errors
        }, status=status.HTTP_200_OK)

class ManualRiseInviteView(APIView):
    """
    Allows superusers/admins to manually send a Rise invite to a trader
    using their trader_id (UUID of User).
    Also updates ClientKYC and ensures Rise payment method is present.
    """
    permission_classes = [HasPermission]
    required_permissions = ['kyc.send_rise_invite']

    def post(self, request):
        trader_id = request.data.get("trader_id")
        if not trader_id:
            return Response({"detail": "trader_id is required."},
                            status=status.HTTP_400_BAD_REQUEST)

        # ensure the user exists and is a client
        trader = get_object_or_404(User, id=trader_id, role="client")
        client = trader.client_profile  # OneToOne so safe to access

        try:
            result = invite_user_via_rise([trader.email], role="contractor")

            # ✅ Update or create ClientKYC on success
            kyc, _ = ClientKYC.objects.get_or_create(client=client)
            kyc.rise_invite_sent = True
            kyc.rise_invite_accepted = False  # webhook will update later
            kyc.rise_api_response = result
            kyc.updated_at = dj_timezone.now()
            kyc.save()

            # ✅ Ensure Rise payment method exists / synced
            rise_method, created = ClientPaymentMethod.objects.get_or_create(
                client=trader,
                payment_type="rise",
                defaults={
                    "rise_email": trader.email,
                    "label": "Rise Payout",
                    "is_default": True,
                },
            )
            if not created and rise_method.rise_email != trader.email:
                rise_method.rise_email = trader.email
                rise_method.save(update_fields=["rise_email"])

            # ✅ Log event: KYC Initiated
            log_event(
                request=request,
                user=trader,
                category="kyc",
                event_type="kyc_initiated",
                metadata={
                    "admin_id": str(request.user.id),
                    "admin_email": request.user.email,
                    "trader_id": str(trader.id),
                    "trader_email": trader.email,
                    "rise_response": result,
                },
                description=f"KYC initiated manually by admin ({request.user.email}) for trader {trader.email}"
            )    

            return Response(
                {
                    "success": True,
                    "message": f"Rise invite sent to {trader.email}",
                    "rise_response": result
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:
            # ❌ On failure, update ClientKYC with error
            kyc, _ = ClientKYC.objects.get_or_create(client=client)
            kyc.rise_api_response = {"error": str(e)}
            kyc.updated_at = dj_timezone.now()
            kyc.save(update_fields=["rise_api_response", "updated_at"])

            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

def safe_run_ai_functions(payout_id: str):
    logger.info(f"[DEBUG] safe_run_ai_functions started for payout {payout_id}")
    try:
        generate_ai_payout_analysis(payout_id)
        logger.info(f"[DEBUG] AI payout analysis finished for payout {payout_id}")
    except Exception as e:
        logger.exception(f"[AI Payout Analysis Error] Payout {payout_id}: {e}")

    try:
        generate_compliance_analysis(payout_id)
        logger.info(f"[DEBUG] Compliance analysis finished for payout {payout_id}")
    except Exception as e:
        logger.exception(f"[Compliance Analysis Error] Payout {payout_id}: {e}")


class TriggerPayoutAnalysisView(APIView):
    """
    POST /admin/payouts/trigger-analysis/
    Body JSON: { "payout_id": "uuid" }
    """
    permission_classes = [HasPermission]
    required_permissions = ['payouts.approve']

    def post(self, request):
        payout_id = request.data.get("payout_id")
        if not payout_id:
            return Response(
                {"error": "payout_id is required in request body"},
                status=status.HTTP_400_BAD_REQUEST
            )

        payout = get_object_or_404(TraderPayout, id=payout_id)
        logger.debug(f"[DEBUG] Found payout {payout.id} for {payout.trader}")

        threading.Thread(target=safe_run_ai_functions, args=(str(payout.id),), daemon=True).start()
        logger.info(f"[DEBUG] Started background thread for payout {payout.id}")

        return Response(
            {
                "detail": f"Triggered AI & compliance analysis for payout {payout.id}.",
                "payout_id": str(payout.id),
                "status": payout.status,
                "amount": str(payout.amount),
            },
            status=status.HTTP_200_OK,
        )

mt5 = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)

class AdminAccountPnLView(APIView):
    """
    Superuser-only API to view Balance, Equity, Available P&L, Net P&L, Profit Share % and Open Positions for one MT5 account.
    """
    permission_classes = [HasPermission]
    required_permissions = ['trades.view']

    def get_profit_share_percent(self, enrollment, available_pnl):
        if available_pnl is None or available_pnl <= 0:
            return None

        payout_config = getattr(enrollment, "payout_config", None)
        if payout_config and payout_config.config_type == "custom" and payout_config.profit_share_percent:
            return payout_config.profit_share_percent

        if hasattr(enrollment.challenge, "payout_policy"):
            policy = enrollment.challenge.payout_policy
            # ✅ count payouts only for this enrollment
            previous_payouts = enrollment.payouts.filter(status__in=["approved", "paid"]).count()
            next_payout_number = previous_payouts + 1
            return policy.get_share_for(next_payout_number)

        return None

    def get(self, request):
        account_id = request.query_params.get("account_id")
        if not account_id:
            return Response({"detail": "Missing 'account_id' query parameter."},
                            status=status.HTTP_400_BAD_REQUEST)

        enrollment = ChallengeEnrollment.objects.filter(mt5_account_id=account_id).first()
        if not enrollment:
            return Response({"detail": f"No enrollment found for MT5 account {account_id}."},
                            status=status.HTTP_404_NOT_FOUND)

        # --- Live Data ---
        balance = fetch_user_balance(account_id)
        equity = fetch_user_equity(account_id)
        available_pnl = (equity - Decimal(enrollment.account_size)) if equity is not None else None
        open_positions = bool(mt5.get_open_trades(account_id=account_id))

        # --- Profit share & net pnl ---
        profit_share_percent = self.get_profit_share_percent(enrollment, available_pnl)
        net_pnl = None
        if profit_share_percent and available_pnl and available_pnl > 0:
            net_pnl = round(available_pnl * (Decimal(profit_share_percent) / Decimal(100)), 2)

        data = {
            "account_id": account_id,
            "client_name": enrollment.client.user.get_full_name(),
            "client_email": enrollment.client.user.email,
            "status": enrollment.status,
            "account_size": str(enrollment.account_size),
            "currency": enrollment.currency,
            "raw_balance": str(balance) if balance is not None else None,
            "raw_equity": str(equity) if equity is not None else None,
            "available_pnl": str(available_pnl) if available_pnl is not None else None,
            "profit_share_percent": str(profit_share_percent) if profit_share_percent is not None else None,
            "net_pnl": str(net_pnl) if net_pnl is not None else None,
            "open_positions": open_positions,
        }

        return Response(data, status=status.HTTP_200_OK)

class AdminTraderPaymentMethodsView(APIView):
    """
    Superuser-only API to fetch all payment methods for a trader by username or email.
    """
    permission_classes = [HasPermission]
    required_permissions = ['payouts.view']

    def get(self, request):
        identifier = request.query_params.get("identifier")  # can be username or email
        if not identifier:
            return Response(
                {"detail": "Missing 'identifier' query parameter (username or email)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        trader = User.objects.filter(role="client").filter(
            (Q(username__iexact=identifier) | Q(email__iexact=identifier))
        ).first()

        if not trader:
            return Response(
                {"detail": f"No client found with username/email '{identifier}'."},
                status=status.HTTP_404_NOT_FOUND
            )

        payment_methods = ClientPaymentMethod.objects.filter(client=trader).values(
            "id",
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
        )
        return Response(list(payment_methods), status=status.HTTP_200_OK)

class AdminCreatePayoutView(APIView):
    """
    Superuser-only API to create a payout request for a trader by email, MT5 account ID and payment method.
    Will:
      - Calculate profit and net payout
      - Check for open positions (must be zero)
      - Withdraw profit from MT5
      - Create payout record
    """
    permission_classes = [HasPermission]
    required_permissions = ['payouts.approve']

    def get_profit_share_percent(self, enrollment, available_pnl):
        if available_pnl is None or available_pnl <= 0:
            return None

        payout_config = getattr(enrollment, "payout_config", None)
        if payout_config and payout_config.config_type == "custom" and payout_config.profit_share_percent:
            return payout_config.profit_share_percent

        if hasattr(enrollment.challenge, "payout_policy"):
            policy = enrollment.challenge.payout_policy
            previous_payouts = enrollment.payouts.filter(status__in=["approved", "paid"]).count()
            next_payout_number = previous_payouts + 1
            return policy.get_share_for(next_payout_number)

        return None

    def post(self, request):
        client_email = request.data.get("client_email")
        account_id = request.data.get("mt5_account_id")
        payment_method = request.data.get("payment_method")
        method_details = request.data.get("method_details", {})
        admin_note = request.data.get("admin_note")

        if not client_email or not account_id or not payment_method:
            return Response(
                {"detail": "client_email, mt5_account_id and payment_method are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ---- Validate client ----
        trader = User.objects.filter(email__iexact=client_email, role="client").first()
        if not trader:
            return Response({"detail": f"No client found with email {client_email}."},
                            status=status.HTTP_404_NOT_FOUND)

        # ---- Validate enrollment ----
        enrollment = ChallengeEnrollment.objects.filter(mt5_account_id=account_id, client=trader.client_profile).first()
        if not enrollment:
            return Response({"detail": f"No enrollment found for account {account_id} belonging to {client_email}."},
                            status=status.HTTP_404_NOT_FOUND)

        # ---- Live data ----
        balance = fetch_user_balance(account_id)
        equity = fetch_user_equity(account_id)
        if equity is None:
            return Response({"detail": f"Unable to fetch equity for account {account_id}."},
                            status=status.HTTP_400_BAD_REQUEST)

        # ✅ Check for open positions
        open_positions = bool(mt5.get_open_trades(account_id=account_id))
        if open_positions:
            return Response(
                {"detail": "Cannot create payout while there are open positions on this account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ---- Calculate profit & net ----
        profit = equity - Decimal(enrollment.account_size)
        if profit <= 0:
            return Response({"detail": f"No profit available for payout (profit={profit})."},
                            status=status.HTTP_400_BAD_REQUEST)

        profit_share_percent = self.get_profit_share_percent(enrollment, profit)
        if profit_share_percent is None:
            return Response({"detail": "Unable to determine profit share percent."},
                            status=status.HTTP_400_BAD_REQUEST)

        net_profit = round(profit * (Decimal(profit_share_percent) / 100), 2)

        # ---- Withdraw from MT5 ----
        withdrawal_result = mt5.withdraw_profit(account_id, profit, comment="Trader Profit Withdrawal")
        if not withdrawal_result.get("success"):
            return Response(
                {"detail": f"MT5 withdrawal failed: {withdrawal_result.get('error')}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ---- Create payout record ----
        payout = TraderPayout.objects.create(
            trader=trader,
            challenge_enrollment=enrollment,
            amount=net_profit,
            profit=profit,
            profit_share=profit_share_percent,
            net_profit=net_profit,
            method=payment_method,
            method_details=method_details,
            status="pending",
            admin_note=admin_note,
            requested_at=dj_timezone.now(),
        )

        log_event(
            request=request,
            user=trader,  # show event under trader's timeline
            category="payout",
            event_type="payout_created",
            challenge_enrollment=enrollment,
            metadata={
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "mt5_account_id": account_id,
                "profit": str(profit),
                "profit_share_percent": str(profit_share_percent),
                "net_profit": str(net_profit),
                "method": payment_method,
                "method_details": method_details,
            },
            description=(
                f"Admin ({request.user.email}) initiated payout request for "
                f"{trader.email} — Net: {net_profit}, Profit Share: {profit_share_percent}%"
            )
        )

        return Response(
            {
                "message": "Payout request created and profit withdrawn successfully.",
                "payout_id": str(payout.id),
                "profit": str(profit),
                "profit_share_percent": str(profit_share_percent),
                "net_profit": str(net_profit),
                "admin_note": admin_note,
            },
            status=status.HTTP_201_CREATED
        )

class ActivateTradingView(APIView):
    """
    Superuser-only view to enable trading on a given MT5 account.
    """
    permission_classes = [HasPermission]
    required_permissions = ['mt5.activate_trading']

    def post(self, request):
        account_id = request.data.get("account_id")
        if not account_id:
            return Response({"error": "Missing account_id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            account_id = int(account_id)
        except ValueError:
            return Response({"error": "account_id must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        success = mt5_client.activate_trading(account_id)

        if success:
            enrollment = ChallengeEnrollment.objects.filter(mt5_account_id=str(account_id)).first()
            trader_user = enrollment.client.user if enrollment else None

            # Log to EventLog (Audit)
            log_event(
                request=request,
                user=trader_user,
                category="mt5",
                event_type="mt5_trading_enabled",
                challenge_enrollment=enrollment,
                metadata={
                    "admin_id": str(request.user.id),
                    "admin_email": request.user.email,
                    "mt5_account_id": account_id,
                },
                description=f"Admin ({request.user.email}) enabled trading for MT5 account {account_id}"
            )

            # Log action
            MTActionPanelLogs.objects.create(
                user=request.user,
                action="activate_trading",
                target_id=str(account_id),
                extra_data={"message": f"Trading successfully enabled for account {account_id}"},
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT"),
            )

            return Response({"message": f"Trading successfully enabled for account {account_id}"})
        else:
            return Response(
                {"error": f"Failed to enable trading for account {account_id}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class DisableTradingView(APIView):
    """
    Superuser-only view to disable trading on a given MT5 account.
    """
    permission_classes = [HasPermission]
    required_permissions = ['mt5.disable_account']

    def post(self, request):
        account_id = request.data.get("account_id")
        if not account_id:
            return Response({"error": "Missing account_id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            account_id = int(account_id)
        except ValueError:
            return Response({"error": "account_id must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        success = mt5_client.disable_trading(account_id)

        if success:
            enrollment = ChallengeEnrollment.objects.filter(mt5_account_id=str(account_id)).first()
            trader_user = enrollment.client.user if enrollment else None

            # EventLog for auditing
            log_event(
                request=request,
                user=trader_user,
                category="mt5",
                event_type="mt5_trading_disabled",
                challenge_enrollment=enrollment,
                metadata={
                    "admin_id": str(request.user.id),
                    "admin_email": request.user.email,
                    "mt5_account_id": account_id,
                },
                description=f"Admin ({request.user.email}) disabled trading for MT5 account {account_id}"
            )

            # Log action
            MTActionPanelLogs.objects.create(
                user=request.user,
                action="disable_trading",
                target_id=str(account_id),
                extra_data={"message": f"Trading successfully disabled for account {account_id}"},
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT"),
            )

            return Response({"message": f"Trading successfully disabled for account {account_id}"})
        else:
            return Response(
                {"error": f"Failed to disable trading for account {account_id}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class EnableAccountView(APIView):
    """
    Superuser-only view to enable an MT5 account (isEnabled=True).
    """
    permission_classes = [HasPermission]
    required_permissions = ['mt5.activate_trading']

    def post(self, request):
        account_id = request.data.get("account_id")
        if not account_id:
            return Response({"error": "Missing account_id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            account_id = int(account_id)
        except ValueError:
            return Response({"error": "account_id must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        success = mt5_client.enable_account(account_id)

        if success:
            enrollment = ChallengeEnrollment.objects.filter(mt5_account_id=str(account_id)).first()
            trader_user = enrollment.client.user if enrollment else None

            # Log in EventLog (Audit Trail)
            log_event(
                request=request,
                user=trader_user,
                category="mt5",
                event_type="mt5_account_enabled",
                challenge_enrollment=enrollment,
                metadata={
                    "admin_id": str(request.user.id),
                    "admin_email": request.user.email,
                    "mt5_account_id": account_id,
                },
                description=f"Admin ({request.user.email}) enabled MT5 account {account_id}"
            )


            # Log action
            MTActionPanelLogs.objects.create(
                user=request.user,
                action="enable_account",
                target_id=str(account_id),
                extra_data={"message": f"Account {account_id} successfully enabled"},
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT"),
            )

            return Response({"message": f"Account {account_id} successfully enabled"})
        else:
            return Response(
                {"error": f"Failed to enable account {account_id}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DisableAccountView(APIView):
    """
    Superuser-only view to disable an MT5 account (isEnabled=False).
    """
    permission_classes = [HasPermission]
    required_permissions = ['mt5.disable_account']

    def post(self, request):
        account_id = request.data.get("account_id")
        if not account_id:
            return Response({"error": "Missing account_id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            account_id = int(account_id)
        except ValueError:
            return Response({"error": "account_id must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        success = mt5_client.disable_account(account_id)

        if success:
            enrollment = ChallengeEnrollment.objects.filter(mt5_account_id=str(account_id)).first()
            trader_user = enrollment.client.user if enrollment else None

            # Log to EventLog (auditable + visible in dashboard)
            log_event(
                request=request,
                user=trader_user,
                category="mt5",
                event_type="mt5_account_disabled",
                challenge_enrollment=enrollment,
                metadata={
                    "admin_id": str(request.user.id),
                    "admin_email": request.user.email,
                    "mt5_account_id": account_id,
                },
                description=f"Admin ({request.user.email}) disabled MT5 account {account_id}"
            )

            # Log action
            MTActionPanelLogs.objects.create(
                user=request.user,
                action="disable_account",
                target_id=str(account_id),
                extra_data={"message": f"Account {account_id} successfully disabled"},
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT"),
            )

            return Response({"message": f"Account {account_id} successfully disabled"})
        else:
            return Response(
                {"error": f"Failed to disable account {account_id}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        
class ChangeGroupView(APIView):
    """
    Superuser-only view to change the MT5 group of an account.
    """
    permission_classes = [HasPermission]
    required_permissions = ['mt5.activate_trading']

    def post(self, request):
        account_id = request.data.get("account_id")
        new_group = request.data.get("new_group")

        if not account_id:
            return Response({"error": "Missing account_id"}, status=status.HTTP_400_BAD_REQUEST)
        if not new_group:
            return Response({"error": "Missing new_group"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            account_id = int(account_id)
        except ValueError:
            return Response({"error": "account_id must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        success = mt5_client.change_group(account_id, new_group)

        if success:
            enrollment = ChallengeEnrollment.objects.filter(mt5_account_id=str(account_id)).first()
            trader_user = enrollment.client.user if enrollment else None

            # Log to EventLog (Audit Trail)
            log_event(
                request=request,
                user=trader_user,
                category="mt5",
                event_type="mt5_group_changed",
                challenge_enrollment=enrollment,
                metadata={
                    "admin_id": str(request.user.id),
                    "admin_email": request.user.email,
                    "mt5_account_id": account_id,
                    "new_group": new_group,
                },
                description=f"Admin ({request.user.email}) moved MT5 account {account_id} to group {new_group}"
            )

            # Log action
            MTActionPanelLogs.objects.create(
                user=request.user,
                action="change_group",
                target_id=str(account_id),
                extra_data={
                    "message": f"Account {account_id} successfully moved to group {new_group}",
                    "new_group": new_group,
                },
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT"),
            )

            return Response({"message": f"Account {account_id} successfully moved to group {new_group}"})
        else:
            return Response(
                {"error": f"Failed to change group for account {account_id}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )        

class ChangePasswordView(APIView):
    """
    Superuser-only view to change MT5 account password(s)
    - Calls MT5 API (ChangeUserPasswords)
    - Updates ChallengeEnrollment record in DB
    - Logs admin action
    """
    permission_classes = [HasPermission]
    required_permissions = ['mt5.activate_trading']

    def post(self, request):
        enrollment_id = request.data.get("enrollment_id")
        account_id = request.data.get("account_id")
        mode = request.data.get("mode", "main")
        main_password = request.data.get("main_password")
        investor_password = request.data.get("investor_password")

        # --- Step 1: Validation ---
        if not enrollment_id and not account_id:
            return Response(
                {"error": "Provide either enrollment_id or account_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        enrollment = None
        if enrollment_id:
            enrollment = get_object_or_404(ChallengeEnrollment, pk=enrollment_id)
            if not enrollment.mt5_account_id:
                return Response(
                    {"error": f"Enrollment {enrollment_id} has no MT5 account assigned."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            account_id = int(enrollment.mt5_account_id)
        else:
            try:
                account_id = int(account_id)
            except ValueError:
                return Response({"error": "account_id must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        if mode not in ("main", "investor", "both"):
            return Response({"error": "mode must be 'main', 'investor', or 'both'"}, status=status.HTTP_400_BAD_REQUEST)

        # --- Step 2: Generate missing passwords ---
        if mode in ("main", "both") and not main_password:
            main_password = generate_mt5_compliant_password()
        if mode in ("investor", "both") and not investor_password:
            investor_password = generate_mt5_compliant_password()
        if mode == "both" and main_password == investor_password:
            investor_password = generate_mt5_compliant_password()

        # --- Step 3: Call MT5 API ---
        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        success = mt5_client.change_password(
            account_id=account_id,
            main_password=main_password,
            investor_password=investor_password,
            mode=mode,
        )

        if not success:
            return Response(
                {"error": f"Failed to change password(s) for account {account_id}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # --- Step 4: Update DB (only if enrollment is known) ---
        if enrollment:
            update_fields = []
            if mode in ("main", "both"):
                enrollment.mt5_password = main_password
                update_fields.append("mt5_password")
            if mode in ("investor", "both"):
                enrollment.mt5_investor_password = investor_password
                update_fields.append("mt5_investor_password")
            if update_fields:
                enrollment.save(update_fields=update_fields)
                logger.info(f"[ChangePassword] Updated DB for enrollment {enrollment.id}: {update_fields}")

        def mask(p):
            return p[:2] + "*" * (len(p) - 4) + p[-2:] if len(p) > 4 else "*" * len(p)        

        # ✅ Create Event Log Entry
        log_event(
            request=request,
            user=(enrollment.client.user if enrollment else None),
            category="mt5",
            event_type="mt5_password_changed",
            challenge_enrollment=enrollment,
            metadata={
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "account_id": account_id,
                "mode": mode,
                "main_password_masked": mask(main_password) if mode in ("main", "both") else None,
                "investor_password_masked": mask(investor_password) if mode in ("investor", "both") else None,
            },
            description=f"Admin ({request.user.email}) changed MT5 password(s) for account {account_id}"
        )        

        # --- Step 5: Log admin action ---
        MTActionPanelLogs.objects.create(
            user=request.user,
            action="change_password",
            target_id=str(enrollment.id if enrollment else account_id),
            extra_data={
                "message": f"Password(s) successfully changed for account {account_id}",
                "mode": mode,
                "main_changed": mode in ("main", "both"),
                "investor_changed": mode in ("investor", "both"),
            },
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT"),
        )

        # --- Step 6: Return final response ---
        return Response(
            {
                "message": f"Password(s) successfully changed for account {account_id}",
                "account_id": account_id,
                "enrollment_id": enrollment.id if enrollment else None,
                "mode": mode,
                "main_password": main_password if mode in ("main", "both") else None,
                "investor_password": investor_password if mode in ("investor", "both") else None,
            },
            status=status.HTTP_200_OK,
        )

class RetryMT5AccountCreationView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['mt5.activate_trading']

    def post(self, request):
        enrollment_id = request.data.get("enrollment_id")
        if not enrollment_id:
            return Response({"error": "Missing enrollment_id"}, status=status.HTTP_400_BAD_REQUEST)

        enrollment = get_object_or_404(ChallengeEnrollment, pk=enrollment_id)

        if enrollment.mt5_account_id and str(enrollment.mt5_account_id) not in ["", "0", None]:
            return Response(
                {"error": "Enrollment already has a valid MT5 account ID"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = enrollment.client.user

        # Parse address_info (may be JSON string or dict)
        address_info = getattr(enrollment.client, "address_info", {}) or {}
        if isinstance(address_info, str):
            try:
                address_info = json.loads(address_info)
            except Exception:
                address_info = {}

        # Generate MT5 passwords
        mt5_password = generate_mt5_compliant_password()
        investor_password = generate_mt5_compliant_password()

        # Determine MT5 group
        mt5_group_name = settings.MT5_GROUP_NAME
        current_phase_type = enrollment.get_current_phase_type()
        try:
            challenge_phase = ChallengePhase.objects.get(
                challenge=enrollment.challenge,
                phase_type=current_phase_type,
            )
            mapping = challenge_phase.group_mapping
            mt5_group_name = mapping.mt5_group
        except (ChallengePhase.DoesNotExist, ChallengePhaseGroupMapping.DoesNotExist):
            logger.warning(
                f"[RetryMT5] No group mapping found for {enrollment.challenge} - {current_phase_type}, using default"
            )

        # Build payload (with initial balance same as serializer)
        payload = [{
            "index": 0,
            "agentAccount": settings.MT5_AGENT_ACCOUNT,
            "canTrade": True,
            "comment": f"{current_phase_type} - Enrollment {enrollment.id}",
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
                "balance": float(enrollment.account_size),  # keep deposit here like serializer
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

        # Logging — safe mask
        safe_payload = copy.deepcopy(payload)
        for p in safe_payload:
            if "password" in p:
                p["password"] = "********"
            if "investorPassword" in p:
                p["investorPassword"] = "********"
        logger.info(f"[RetryMT5][REQUEST] Payload: {safe_payload}")

        # Call MT5 API
        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        response = mt5_client.add_user(payload)
        logger.info(f"[RetryMT5][RESPONSE] {response}")

        sys_err = response.get("systemErrorStatus", "")
        if sys_err:
            return Response(
                {"error": "MT5 user creation failed", "mt5_error": sys_err, "mt5_raw": response},
                status=status.HTTP_400_BAD_REQUEST
            )


        account_id = (response.get("array") or [{}])[0].get("accountID")
        if not account_id:
            return Response({"error": "MT5 response missing accountID", "mt5_raw": response}, status=status.HTTP_400_BAD_REQUEST)

        # Save credentials
        enrollment.mt5_account_id = account_id
        enrollment.mt5_password = mt5_password
        enrollment.mt5_investor_password = investor_password
        enrollment.broker_type = "mt5"
        enrollment.save(update_fields=[
            "mt5_account_id", "mt5_password", "mt5_investor_password", "broker_type"
        ])

        # Log Event to EventLog table
        log_event(
            request=request,
            user=user,
            category="mt5",
            event_type="mt5_account_created",
            challenge_enrollment=enrollment,
            metadata={
                "admin_id": str(request.user.id),
                "admin_email": request.user.email,
                "mt5_account_id": str(account_id),
                "group_name": mt5_group_name,
                "retry": True,
            },
            description=f"Admin ({request.user.email}) retried MT5 account creation — created account {account_id}"
        )

        MTActionPanelLogs.objects.create(
            user=request.user,
            action="retry_mt5_account_creation",
            target_id=str(enrollment.id),
            extra_data={
                "message": f"MT5 account {account_id} created successfully",
                "account_id": account_id,
                "mt5_group": mt5_group_name,
            },
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT"),
        )

        return Response(
            {"message": f"MT5 account {account_id} created successfully for enrollment {enrollment.id}"},
            status=status.HTTP_200_OK
        )

class ManualCertificateGenerateView(APIView):
    """
    POST: Superuser manually generates a certificate for a trader.
    """
    permission_classes = [HasPermission]
    required_permissions = ['certificates.manage']

    def post(self, request, *args, **kwargs):
        serializer = CertificateManualCreateSerializer(data=request.data)
        if serializer.is_valid():
            cert = serializer.save()

            # Log challenge certificate creation
            log_event(
                request=request,
                user=cert.user,  # Trader receiving the certificate
                category="certificate",
                event_type="challenge_certificate_generated",
                challenge_enrollment=cert.enrollment,  # Will be None for non-challenge certs
                metadata={
                    "certificate_id": str(cert.id),
                    "certificate_type": cert.certificate_type,
                    "title": cert.title,
                    "enrollment_id": str(cert.enrollment_id) if cert.enrollment_id else None,
                },
                description=f"Admin ({request.user.email}) manually generated challenge certificate '{cert.title}' for {cert.user.email}."
            )

            return Response(
                {
                    "id": str(cert.id),
                    "title": cert.title,
                    "certificate_type": cert.certificate_type,
                    "image_url": cert.image_url,
                    "pdf_url": cert.pdf_url,
                    "issued_date": cert.issued_date,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class ManualPayoutCertificateGenerateView(APIView):
    """
    POST: Superuser manually generates a payout certificate for a trader.
    """
    permission_classes = [HasPermission]
    required_permissions = ['certificates.manage']

    def post(self, request, *args, **kwargs):
        serializer = PayoutCertificateManualCreateSerializer(data=request.data)
        if serializer.is_valid():
            cert = serializer.save()

            log_event(
            request=request,
            user=cert.user,  # trader receiving the certificate
            category="certificate",
            event_type="payout_certificate_generated",
            challenge_enrollment=cert.enrollment,  # may be None depending on cert
            metadata={
                "certificate_id": str(cert.id),
                "certificate_type": cert.certificate_type,
                "title": cert.title,
                "payout_id": str(cert.payout.id) if cert.payout else None,
                "released_fund": float(cert.payout.released_fund) if cert.payout else None,
            },
            description=f"Admin ({request.user.email}) manually generated payout certificate '{cert.title}' for {cert.user.email}."
            )
            
            return Response(
                {
                    "id": str(cert.id),
                    "title": cert.title,
                    "certificate_type": cert.certificate_type,
                    "image_url": cert.image_url,
                    "pdf_url": cert.pdf_url,
                    "issued_date": cert.issued_date,
                    "client_email": cert.user.email,
                    "payout_id": str(cert.payout.id) if cert.payout else None,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PayoutLookupByEmailView(APIView):
    """
    POST: Superuser gives client email → returns payout IDs and summary info.
    """
    permission_classes = [HasPermission]
    required_permissions = ['payouts.view']

    def post(self, request, *args, **kwargs):
        email = request.data.get("client_email")
        if not email:
            return Response({"error": "client_email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email, role="client")
        except User.DoesNotExist:
            return Response({"error": "Client with this email not found."}, status=status.HTTP_404_NOT_FOUND)

        payouts = TraderPayout.objects.filter(trader=user).order_by("-requested_at")
        data = [
            {
                "payout_id": str(p.id),
                "payout_value": float(p.amount),
                "payout_date": p.requested_at.strftime("%Y-%m-%d %H:%M:%S"),
                "payout_status": p.status,
            }
            for p in payouts
        ]

        return Response({"client_email": user.email, "payouts": data}, status=status.HTTP_200_OK)


class MT5TradeListView(APIView):
    """
    Admin view to list all trades for a given MT5 account.
    Pass ?mt5_id=XXXXX as query param.
    Returns both synced (DB) and not-synced (live only) trades with sync_status.
    """
    permission_classes = [HasPermission]
    required_permissions = ['trades.view']

    def get(self, request):
        mt5_id = request.query_params.get("mt5_id")
        if not mt5_id:
            return Response({"detail": "mt5_id query param is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            account_id = int(mt5_id)
        except ValueError:
            return Response({"detail": "Invalid mt5_id value"}, status=status.HTTP_400_BAD_REQUEST)

        # Get local DB trades
        db_trades = MT5Trade.objects.filter(account_id=account_id)
        db_orders = {t.order for t in db_trades}

        # Fetch live trades
        try:
            live_trades = fetch_user_closed_trades(account_id, limit=500)
        except Exception as e:
            return Response({"detail": f"Failed to fetch from MT5: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

        results = []

        # Synced (from DB)
        for t in db_trades:
            results.append({
                "order": t.order,
                "account_id": t.account_id,
                "symbol": t.symbol,
                "cmd": t.cmd,
                "volume": t.volume,
                "open_time": t.open_time,
                "open_price": str(t.open_price),
                "close_time": t.close_time,
                "close_price": str(t.close_price),
                "profit": str(t.profit),
                "commission": str(t.commission),
                "comment": t.comment,
                "is_closed": t.is_closed,
                "sync_status": "synced"
            })

        # Not synced (only from live)
        for trade in live_trades:
            order_id = trade.get("deal_id") or trade.get("position_id")
            if order_id and order_id not in db_orders:
                results.append({
                    "order": order_id,
                    "account_id": account_id,
                    "symbol": trade.get("symbol"),
                    "cmd": 0 if trade.get("side") == "BUY" else 1,
                    "volume": float(trade.get("volume", 0)),
                    "open_time": trade.get("open_time"),
                    "open_price": trade.get("open_price"),
                    "close_time": trade.get("close_time"),
                    "close_price": trade.get("close_price"),
                    "profit": trade.get("profit"),
                    "commission": trade.get("commission"),
                    "comment": trade.get("comment"),
                    "is_closed": trade.get("is_closed", False),
                    "sync_status": "not_synced",
                })

        # Sort by close_time desc if present, else open_time
        results.sort(key=lambda x: x.get("close_time") or x.get("open_time"), reverse=True)

        return Response(results)

class MT5ClosedTradesSyncCheckView(APIView):
    """
    Admin view — fetch closed trades for past 1 year from MT5
    and show whether each trade is synced in DB.
    """
    permission_classes = [HasPermission]
    required_permissions = ['trades.view']

    def get(self, request):
        mt5_id = request.query_params.get("mt5_id")
        if not mt5_id:
            return Response({"detail": "mt5_id query param is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            account_id = int(mt5_id)
        except ValueError:
            return Response({"detail": "Invalid mt5_id value"}, status=status.HTTP_400_BAD_REQUEST)

        # Date range: 1 year back until now
        end = int(datetime.now(timezone.utc).timestamp())
        start = int((datetime.now(timezone.utc) - timedelta(days=365)).timestamp())

        client = MT5Client(api_url=settings.MT5_API_URL, api_key=settings.MT5_API_KEY)
        try:
            mt5_trades = client.get_closed_trades(account_id, start, end)
        except Exception as e:
            return Response({"detail": f"Failed to fetch from MT5: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

        db_orders = set(
            MT5Trade.objects.filter(account_id=account_id).values_list("order", flat=True)
        )

        def ts_to_iso(ts):
            try:
                if ts and int(ts) > 0:
                    return datetime.utcfromtimestamp(int(ts)).isoformat() + "Z"
            except:
                pass
            return None

        results = []
        for t in mt5_trades:
            order_id = t.get("order")
            if not order_id:
                continue

            # adjust volume (Kenmore returns raw units — your original code divides by 100 for MySQL, but here sample is huge: 2,000,000 likely 20 lots if /100000)
            raw_vol = t.get("volume", 0) or 0
            volume_lots = float(raw_vol) / 10000


            results.append({
                "order": order_id,
                "account_id": t.get("accountID"),
                "symbol": t.get("symbol"),
                "digits": t.get("digits"),
                "cmd": t.get("cmd"),
                "volume": volume_lots,
                "open_time": ts_to_iso(t.get("open_time")),
                "open_price": t.get("open_price"),
                "close_time": ts_to_iso(t.get("close_time")),
                "close_price": t.get("close_price"),
                "sl": t.get("sl"),
                "tp": t.get("tp"),
                "profit": t.get("profit"),
                "commission": t.get("commission"),
                "commission_agent": t.get("commission_agent"),
                "storage": t.get("storage"),
                "comment": t.get("comment"),
                "margin_rate": t.get("margin_rate"),
                "sync_status": "synced" if order_id in db_orders else "not_synced",
            })

        # Sort newest first by close_time
        results.sort(key=lambda x: x.get("close_time") or x.get("open_time") or "", reverse=True)

        return Response(results)                

def safe_decimal(value, default="0"):
    """Safely convert to Decimal, avoiding crashes on invalid or empty values."""
    try:
        if value in [None, "", "null", "None", "NaN"]:
            return Decimal(default)
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


class MT5TradeResyncView(APIView):
    """
    Admin-only view to force re-sync of closed trades for a given MT5 account.
    - Fetches live data from MT5 JSON API
    - Compares with DB (MT5Trade)
    - If ?dry_run=true → only preview changes (no DB writes)
    - Returns summary report
    """
    permission_classes = [HasPermission]
    required_permissions = ['trades.view']

    def get(self, request):
        mt5_id = request.query_params.get("mt5_id")
        if not mt5_id:
            return Response({"detail": "mt5_id query param is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            account_id = int(mt5_id)
        except ValueError:
            return Response({"detail": "Invalid mt5_id value"}, status=status.HTTP_400_BAD_REQUEST)

        dry_run = request.query_params.get("dry_run", "false").lower() == "true"

        try:
            live_trades = fetch_user_closed_trades(account_id, limit=1000)
        except Exception as e:
            logger.exception(f"[MT5TradeResync] Failed to fetch MT5 trades for {account_id}: {e}")
            return Response({"detail": f"Failed to fetch from MT5: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

        existing_orders = {t.order: t for t in MT5Trade.objects.filter(account_id=account_id)}

        created_count, updated_count, skipped_count = 0, 0, 0
        preview_created, preview_updated = [], []

        def make_naive(dt):
            if dt is None:
                return None
            if isinstance(dt, (int, float)):
                return datetime.utcfromtimestamp(dt)
            return dt.replace(tzinfo=None)

        for trade in live_trades:
            order_id = trade.get("deal_id") or trade.get("position_id")
            if not order_id:
                continue

            cmd = 0 if trade.get("side") == "BUY" else 1

            defaults = {
                "timestamp": make_naive(trade.get("close_time")),
                "symbol": trade.get("symbol"),
                "digits": 5,  # default precision
                "cmd": cmd,
                "volume": float(trade.get("volume", 0)),

                "open_time": make_naive(trade.get("open_time")),
                "open_price": safe_decimal(trade.get("open_price")),
                "close_time": make_naive(trade.get("close_time")),
                "close_price": safe_decimal(trade.get("close_price")),

                # Non-null numeric fields (same as Celery task)
                "sl": safe_decimal(trade.get("sl")),
                "tp": safe_decimal(trade.get("tp")),
                "commission": safe_decimal(trade.get("commission")),
                "commission_agent": Decimal("0.00"),
                "storage": Decimal("0.00"),
                "profit": safe_decimal(trade.get("profit")),
                "taxes": Decimal("0.00"),

                # Other defaults matching production logic
                "value_date": 0,
                "expiration": 0,
                "conv_reserv": 0,
                "open_conv_rate": Decimal("0"),
                "close_conv_rate": Decimal("0"),
                "magic": 0,
                "comment": trade.get("comment", "resynced"),
                "spread": Decimal("0"),
                "margin_rate": Decimal("0"),
                "is_closed": trade.get("is_closed", True),
            }

            existing = existing_orders.get(order_id)
            if existing:
                if existing.profit != defaults["profit"] or existing.close_time != defaults["close_time"]:
                    updated_count += 1
                    preview_updated.append(order_id)
                    if not dry_run:
                        for field, value in defaults.items():
                            setattr(existing, field, value)
                        existing.save()
                else:
                    skipped_count += 1
            else:
                created_count += 1
                preview_created.append(order_id)
                if not dry_run:
                    MT5Trade.objects.create(account_id=account_id, order=order_id, **defaults)

        summary = {
            "account_id": account_id,
            "fetched_from_mt5": len(live_trades),
            "existing_in_db": len(existing_orders),
            "created_new": created_count,
            "updated_existing": updated_count,
            "skipped": skipped_count,
            "total_after_sync": MT5Trade.objects.filter(account_id=account_id).count() if not dry_run else len(existing_orders),
            "dry_run": dry_run,
            "preview_created": preview_created[:20],
            "preview_updated": preview_updated[:20],
        }

        # ✅ Find related challenge enrollment for correct audit trace
        enrollment = ChallengeEnrollment.objects.filter(mt5_account_id=str(account_id)).first()

        # ✅ Log Event (only if changes are actually committed or intentional review)
        if created_count > 0 or updated_count > 0 or dry_run:
            log_event(
                request=request,
                user=enrollment.client.user if enrollment else None,
                category="mt5",
                event_type="mt5_trades_resynced",
                challenge_enrollment=enrollment,
                metadata={
                    "admin_id": str(request.user.id),
                    "admin_email": request.user.email,
                    "account_id": account_id,
                    "created_new": created_count,
                    "updated_existing": updated_count,
                    "skipped": skipped_count,
                    "dry_run": dry_run,
                },
                description=(
                    f"Admin ({request.user.email}) performed {'DRY RUN ' if dry_run else ''}"
                    f"closed MT5 trade re-sync for account {account_id}"
                )
            )

        logger.info(f"[MT5TradeResync] Completed for {account_id} (dry_run={dry_run}): {summary}")
        return Response(summary, status=status.HTTP_200_OK)

# ActivityLog Views
class ActivityLogFilter(django_filters.FilterSet):
    """
    Filter for ActivityLog with date range, user, and action type filters
    """
    created_at = DateFromToRangeFilter(field_name='created_at')
    action_type = django_filters.ChoiceFilter(choices=ActivityLog.ACTION_CHOICES)
    actor = django_filters.UUIDFilter(field_name='actor__id')
    content_type = django_filters.CharFilter(field_name='content_type__model')
    
    class Meta:
        model = ActivityLog
        fields = ['created_at', 'action_type', 'actor', 'content_type']


class ActivityLogListView(generics.ListAPIView):
    """
    API endpoint for listing activity logs with filters and pagination.
    
    Permissions:
    - Admin users: Can see all logs and filter by any user
    - Regular users: Can only see their own logs
    
    Filters:
    - date_from, date_to: Date range filter
    - user_id: Filter by specific user (admin only)
    - action_type: Filter by action type
    - content_type: Filter by content object type
    - page: Page number for pagination
    - page_size: Number of items per page
    """
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ActivityLogFilter
    search_fields = ['details', 'action_type']
    ordering_fields = ['created_at', 'action_type']
    ordering = ['-created_at']
    pagination_class = None  # We'll handle pagination manually

    def get_queryset(self):
        """
        Filter queryset based on user permissions
        """
        from django.db.models import Q
        from django.contrib.contenttypes.models import ContentType

        queryset = ActivityLog.objects.select_related('actor', 'content_type').prefetch_related('content_object')

        # Users with activity_logs permission can see all logs
        if self.request.user.has_perm_code('system.view_activity_logs'):
            return queryset

        # Regular users can only see logs related to their own objects
        # This includes logs where they are the actor or the content object is related to them
        user_related_objects = []

        # Get all objects related to this user
        if hasattr(self.request.user, 'client_profile'):
            user_related_objects.append(self.request.user.client_profile)
            # Get challenge enrollments for this client
            enrollments = ChallengeEnrollment.objects.filter(client=self.request.user.client_profile)
            user_related_objects.extend(enrollments)

        # Filter logs to only include those related to the user
        if user_related_objects:
            # Create Q objects for each content type and object
            q_objects = []
            for obj in user_related_objects:
                content_type = ContentType.objects.get_for_model(obj)
                q_objects.append(
                    Q(content_type=content_type, object_id=obj.pk)
                )

            # Also include logs where the user is the actor
            q_objects.append(Q(actor=self.request.user))
            
            # Combine all Q objects with OR
            final_q = q_objects[0]
            for q in q_objects[1:]:
                final_q |= q
            
            queryset = queryset.filter(final_q)
        else:
            # If user has no related objects, only show logs where they are the actor
            queryset = queryset.filter(actor=self.request.user)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """
        Override list method to add custom pagination and filtering
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Get pagination parameters
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        # Validate page size (max 100)
        page_size = min(page_size, 100)
        
        # Calculate pagination
        total_count = queryset.count()
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        
        # Get the page of results
        page_queryset = queryset[start_index:end_index]
        
        # Serialize the results
        serializer = self.get_serializer(page_queryset, many=True)
        
        # Calculate pagination info
        total_pages = (total_count + page_size - 1) // page_size
        has_next = page < total_pages
        has_previous = page > 1
        
        return Response({
            'results': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_count': total_count,
                'total_pages': total_pages,
                'has_next': has_next,
                'has_previous': has_previous,
                'next_page': page + 1 if has_next else None,
                'previous_page': page - 1 if has_previous else None,
            }
        })


class ActivityLogDetailView(generics.RetrieveAPIView):
    """
    API endpoint for getting detailed information about a specific activity log.
    
    Permissions:
    - Admin users: Can see details of any log
    - Regular users: Can only see details of logs related to their own objects
    """
    serializer_class = ActivityLogDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        """
        Filter queryset based on user permissions (same logic as list view)
        """
        from django.db.models import Q
        from django.contrib.contenttypes.models import ContentType
        
        queryset = ActivityLog.objects.select_related('actor', 'content_type').prefetch_related('content_object')

        # Users with activity_logs permission can see all logs
        if self.request.user.has_perm_code('system.view_activity_logs'):
            return queryset

        # Regular users can only see logs related to their own objects
        user_related_objects = []

        # Get all objects related to this user
        if hasattr(self.request.user, 'client_profile'):
            user_related_objects.append(self.request.user.client_profile)
            # Get challenge enrollments for this client
            enrollments = ChallengeEnrollment.objects.filter(client=self.request.user.client_profile)
            user_related_objects.extend(enrollments)
        
        # Filter logs to only include those related to the user
        if user_related_objects:
            # Create Q objects for each content type and object
            q_objects = []
            for obj in user_related_objects:
                content_type = ContentType.objects.get_for_model(obj)
                q_objects.append(
                    Q(content_type=content_type, object_id=obj.pk)
                )
            
            # Also include logs where the user is the actor
            q_objects.append(Q(actor=self.request.user))
            
            # Combine all Q objects with OR
            final_q = q_objects[0]
            for q in q_objects[1:]:
                final_q |= q
            
            queryset = queryset.filter(final_q)
        else:
            # If user has no related objects, only show logs where they are the actor
            queryset = queryset.filter(actor=self.request.user)
        
        return queryset


ACTIVE_ENROLLMENT_STATUSES = [
    'phase_1_in_progress',
    'phase_1_passed',
    'phase_2_in_progress',
    'phase_2_passed',
    'live_in_progress',
]

class TopEarningTradersView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['dashboard.view']

    def get(self, request):
        from_date = request.query_params.get("from_date")
        to_date = request.query_params.get("to_date")
        min_revenue = request.query_params.get("min_revenue")
        has_payouts = request.query_params.get("has_payouts")

        # Parse dates
        start_date = parse_date(from_date) if from_date else None
        end_date = parse_date(to_date) if to_date else None

        # Build base filters for date range
        order_date_filter = Q()
        payout_date_filter = Q()

        if start_date:
            start_datetime = datetime.combine(start_date, datetime.min.time())
            order_date_filter &= Q(orders__date_created__gte=start_datetime)
            payout_date_filter &= Q(payouts__requested_at__gte=start_datetime)

        if end_date:
            end_datetime = datetime.combine(end_date, datetime.max.time())
            order_date_filter &= Q(orders__date_created__lte=end_datetime)
            payout_date_filter &= Q(payouts__requested_at__lte=end_datetime)

        traders = (
            User.objects.filter(role="client")
            .annotate(
                total_revenue=Coalesce(
                    Sum(
                        "orders__order_total_usd",
                        filter=Q(
                            orders__payment_status="paid",
                            orders__status__in=["completed", "processing"]
                        ) & order_date_filter,
                        distinct=True,
                    ),
                    Decimal("0.00"),
                ),
                payouts_paid_total=Coalesce(
                    Sum(
                        "payouts__released_fund",
                        filter=Q(payouts__status="paid") & payout_date_filter,
                        distinct=True,
                    ),
                    Decimal("0.00"),
                ),
                payouts_approved_total=Coalesce(
                    Sum(
                        "payouts__released_fund",
                        filter=Q(payouts__status="approved") & payout_date_filter,
                        distinct=True,
                    ),
                    Decimal("0.00"),
                ),
                payouts_any_count=Coalesce(
                    Count(
                        "payouts",
                        filter=Q(payouts__status__in=["approved", "paid"]) & payout_date_filter,
                        distinct=True,
                    ),
                    0,
                ),
                affiliate_commission_total=Coalesce(
                    Sum("affiliate_referrals__commission_amount"),
                    Decimal("0.00"),
                ),
                active_accounts=Coalesce(
                    Count(
                        "client_profile__challenge_enrollments",
                        filter=Q(client_profile__challenge_enrollments__status__in=ACTIVE_ENROLLMENT_STATUSES),
                        distinct=True,
                    ),
                    0,
                ),
                funded_accounts=Coalesce(
                    Count(
                        "client_profile__challenge_enrollments",
                        filter=Q(client_profile__challenge_enrollments__status="live_in_progress"),
                        distinct=True,
                    ),
                    0,
                ),
                total_accounts=Coalesce(
                    Count("client_profile__challenge_enrollments", distinct=True),
                    0,
                ),
                breached_accounts=Coalesce(
                    Count(
                        "client_profile__challenge_enrollments",
                        filter=Q(client_profile__challenge_enrollments__status="failed"),
                        distinct=True,
                    ),
                    0,
                ),
            )
        )

        if min_revenue:
            traders = traders.filter(total_revenue__gte=min_revenue)
        if has_payouts and has_payouts.lower() == "true":
            traders = traders.filter(payouts_any_count__gt=0)

        traders = traders.filter(total_revenue__gt=0).order_by("-total_revenue")

        def d(v):
            return Decimal(v or 0).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        rows = []
        sum_revenue = Decimal("0.00")
        sum_payouts = Decimal("0.00")
        sum_aff_comm = Decimal("0.00")
        sum_net = Decimal("0.00")

        for u in traders:
            revenue = d(u.total_revenue)
            payouts_total = d(u.payouts_paid_total) + d(u.payouts_approved_total)
            aff_comm_total = d(u.affiliate_commission_total)
            net_profit = revenue - payouts_total - aff_comm_total
            profit_margin = (net_profit / revenue * Decimal("100")) if revenue > 0 else Decimal("0.00")

            rows.append({
                "user_id": str(u.id),
                "name": u.get_full_name() or u.username,
                "email": u.email,
                "total_revenue": revenue,
                "total_payouts": payouts_total,
                "total_affiliate_commission": aff_comm_total,
                "net_profit": net_profit,
                "profit_margin": profit_margin.quantize(Decimal("0.01")),
                "active_accounts": u.active_accounts,
                "funded_accounts": u.funded_accounts,
                "total_accounts": u.total_accounts,
                "breached_accounts": u.breached_accounts,
            })

            sum_revenue += revenue
            sum_payouts += payouts_total
            sum_aff_comm += aff_comm_total
            sum_net += net_profit

        summary = {
            "total_traders": len(rows),
            "total_revenue_sum": sum_revenue,
            "total_payouts_sum": sum_payouts,
            "total_affiliate_commission_sum": sum_aff_comm,
            "total_net_profit_sum": sum_net,
            "avg_revenue_per_trader": (sum_revenue / Decimal(len(rows))) if rows else Decimal("0.00"),
            "avg_net_profit_per_trader": (sum_net / Decimal(len(rows))) if rows else Decimal("0.00"),
        }

        return Response({
            "summary": summary,
            "count": len(rows),
            "traders": rows,
        })
        
class TraderBreakdownView(APIView):
    """
    Admin/Risk-only API
    Returns a secure and detailed breakdown for a specific trader:
    - Financial summary (revenue, payouts, affiliate commissions)
    - Orders with MT5 IDs
    - Enrollments with MT5 IDs, broker type, and account details
    """
    permission_classes = [HasPermission]
    required_permissions = ['dashboard.view']

    def get(self, request, user_id):
        user = get_object_or_404(User, id=user_id, role='client')

        # --- Totals ---
        total_revenue = (
            user.orders.filter(payment_status='paid')
            .aggregate(total=Sum('order_total_usd'))['total'] or Decimal('0.00')
        )
        payouts_paid = (
            user.payouts.filter(status='paid')
            .aggregate(total=Sum('released_fund'))['total'] or Decimal('0.00')
        )
        payouts_approved = (
            user.payouts.filter(status='approved')
            .aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        )
        total_payouts = payouts_paid + payouts_approved

        total_aff_commission = (
            user.affiliate_referrals.aggregate(total=Sum('commission_amount'))['total'] or Decimal('0.00')
        )

        net_profit = total_revenue - total_payouts - total_aff_commission
        profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0

        # --- Enrollments ---
        enrollments_qs = user.client_profile.challenge_enrollments.select_related('challenge').all()
        active_statuses = [
            'phase_1_in_progress', 'phase_1_passed',
            'phase_2_in_progress', 'phase_2_passed', 'live_in_progress'
        ]

        active_accounts = enrollments_qs.filter(status__in=active_statuses).count()
        funded_accounts = enrollments_qs.filter(status='live_in_progress').count()
        breached_accounts = enrollments_qs.filter(status='failed').count()
        total_accounts = enrollments_qs.count()

        enrollments_list = [{
            "id": str(e.id),
            "challenge_name": e.challenge.name if e.challenge else None,
            "status": e.status,
            "account_size": float(e.account_size),
            "currency": e.currency,
            "broker_type": e.broker_type,
            "mt5_account_id": e.mt5_account_id,
            "is_active": e.is_active,
            "start_date": e.start_date,
            "completed_date": e.completed_date,
            "live_start_date": e.live_start_date,
            "created_at": e.created_at,
            "updated_at": e.updated_at,
        } for e in enrollments_qs]

        # --- Orders ---
        orders_list = list(
            user.orders.filter(payment_status='paid')
            .values(
                'id', 'product_name', 'order_total_usd', 'date_created', 'status',
                'challenge_account_size', 'challenge_broker_type', 'mt5_account_id'
            )
            .order_by('-date_created')
        )

        # --- Payouts ---
        payouts_list = list(
            user.payouts.all()
            .values(
                'id', 'status', 'amount', 'released_fund',
                'profit', 'profit_share', 'net_profit',
                'requested_at', 'paid_at', 'method'
            )
            .order_by('-requested_at')
        )

        # --- Affiliate Commissions ---
        commissions_list = list(
            user.affiliate_referrals.all()
            .values(
                'id', 'commission_amount', 'commission_status',
                'challenge_name', 'created_at'
            )
            .order_by('-created_at')
        )

        # --- Response ---
        return Response({
            "client": {
                "id": str(user.id),
                "name": user.get_full_name() or user.username,
                "email": user.email,
                "kyc_status": getattr(user.client_profile, "kyc_status", None),
            },
            "summary": {
                "total_revenue": total_revenue,
                "total_payouts": total_payouts,
                "total_affiliate_commission": total_aff_commission,
                "net_profit": net_profit,
                "profit_margin": round(profit_margin, 2),
                "active_accounts": active_accounts,
                "funded_accounts": funded_accounts,
                "breached_accounts": breached_accounts,
                "total_accounts": total_accounts,
            },
            "orders": orders_list,
            "payouts": payouts_list,
            "affiliate_commissions": commissions_list,
            "enrollments": enrollments_list,
        })        

class MT5MigrationAPIView(APIView):
    """
    Superuser tool to migrate MT5 accounts via CSV upload.
    CSV Format:
        old_mt5_id,new_mt5_id,generate_password
    """

    permission_classes = [HasPermission]
    required_permissions = ['system.view_migration_logs']

    def post(self, request):
        if "file" not in request.FILES:
            return Response(
                {"error": "Please upload a CSV file with 'file' key."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file = request.FILES["file"]
        data = file.read().decode("utf-8")
        reader = csv.DictReader(io.StringIO(data))
        mt5 = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)

        results = []
        processed = 0

        for row in reader:
            old_id = str(row.get("old_mt5_id", "")).strip()
            new_id = str(row.get("new_mt5_id", "")).strip()
            gen_pwd = str(row.get("generate_password", "N")).strip().upper() == "Y"

            if not old_id or not new_id:
                continue

            log = MT5MigrationLog.objects.create(
                old_mt5_id=old_id,
                new_mt5_id=new_id,
                generate_password=gen_pwd,
                status="pending",
            )

            try:
                with transaction.atomic():
                    enrollment = (
                        ChallengeEnrollment.objects.select_related("client__user")
                        .get(mt5_account_id=old_id)
                    )
                    trader = enrollment.client.user
                    trader_email = trader.email

                    main_pwd = investor_pwd = None

                    # ✅ Generate MT5-compliant passwords if requested
                    if gen_pwd:
                        main_pwd = generate_mt5_compliant_password()
                        investor_pwd = generate_mt5_compliant_password()

                        mt5.change_password(
                            account_id=new_id,
                            main_password=main_pwd,
                            investor_password=investor_pwd,
                            mode="both",
                        )

                        enrollment.mt5_password = main_pwd
                        enrollment.mt5_investor_password = investor_pwd

                    # ✅ Update Enrollment
                    enrollment.mt5_account_id = new_id
                    enrollment.save(
                        update_fields=[
                            "mt5_account_id",
                            "mt5_password",
                            "mt5_investor_password",
                        ]
                    )

                    # ✅ Update Trades
                    MT5Trade.objects.filter(account_id=old_id).update(account_id=new_id)

                    # ✅ Send migration email
                    context = {
                        "full_name": trader.get_full_name(),
                        "email": trader_email,
                        "mt5_account_id": new_id,
                        "mt5_password": main_pwd,
                        "mt5_investor_password": investor_pwd,
                    }
                    EmailService.send_broker_migration_email(trader_email, context)

                    log_event(
                        request=request,
                        user=trader,
                        category="migration",
                        event_type="mt5_migration_success",
                        challenge_enrollment=enrollment,
                        metadata={
                            "old_mt5_id": old_id,
                            "new_mt5_id": new_id,
                            "generate_password": gen_pwd,
                            "admin_id": str(request.user.id),
                            "admin_email": request.user.email,
                        },
                        description=f"MT5 Account migrated {old_id} → {new_id} by admin {request.user.email}."
                    )

                    # ✅ Log success
                    log.status = "success"
                    log.client_email = trader_email
                    log.main_password = main_pwd
                    log.investor_password = investor_pwd
                    log.remarks = "Enrollment & trades updated successfully"
                    log.save()

                    results.append(
                        {
                            "old_mt5_id": old_id,
                            "new_mt5_id": new_id,
                            "email": trader_email,
                            "status": "success",
                        }
                    )

            except ChallengeEnrollment.DoesNotExist:
                log.status = "failed"
                log.error_message = f"No enrollment found for MT5 ID {old_id}"
                log.save()

                log_event(
                    request=request,
                    user=None,
                    category="migration",
                    event_type="mt5_migration_failed",
                    metadata={
                        "old_mt5_id": old_id,
                        "new_mt5_id": new_id,
                        "reason": "Enrollment not found",
                        "admin_id": str(request.user.id),
                        "admin_email": request.user.email,
                    },
                    description=f"MT5 Migration failed for {old_id}: enrollment not found."
                )

                results.append(
                    {
                        "old_mt5_id": old_id,
                        "new_mt5_id": new_id,
                        "status": "failed",
                        "error": "Enrollment not found",
                    }
                )

            except Exception as e:
                log.status = "failed"
                log.error_message = str(e)
                log.save()

                log_event(
                    request=request,
                    user=enrollment.client.user if 'enrollment' in locals() else None,
                    category="migration",
                    event_type="mt5_migration_failed",
                    metadata={
                        "old_mt5_id": old_id,
                        "new_mt5_id": new_id,
                        "error": str(e),
                        "admin_id": str(request.user.id),
                        "admin_email": request.user.email,
                    },
                    description=f"MT5 Migration failed for {old_id}: {e}"
                )

                logger.exception(f"[MT5 Migration] Failed for {old_id}: {e}")
                results.append(
                    {
                        "old_mt5_id": old_id,
                        "new_mt5_id": new_id,
                        "status": "failed",
                        "error": str(e),
                    }
                )

            processed += 1

        return Response(
            {
                "message": f"Processed {processed} record(s)",
                "results": results,
            },
            status=status.HTTP_200_OK,
        )
    

class MT5MigrationLogsAPIView(APIView):
    """
    Superuser-only endpoint to view all MT5 migration logs.
    Supports filtering by old_mt5_id, new_mt5_id, email, or status.
    Example:
        GET /api/admin/mt5-migration/logs/?status=failed
        GET /api/admin/mt5-migration/logs/?old_mt5_id=369372111
    """

    permission_classes = [HasPermission]
    required_permissions = ['system.view_migration_logs']

    def get(self, request):
        queryset = MT5MigrationLog.objects.all().order_by("-processed_at")

        # Optional filters
        old_mt5_id = request.query_params.get("old_mt5_id")
        new_mt5_id = request.query_params.get("new_mt5_id")
        email = request.query_params.get("email")
        status_filter = request.query_params.get("status")

        if old_mt5_id:
            queryset = queryset.filter(old_mt5_id__icontains=old_mt5_id)
        if new_mt5_id:
            queryset = queryset.filter(new_mt5_id__icontains=new_mt5_id)
        if email:
            queryset = queryset.filter(client_email__icontains=email)
        if status_filter:
            queryset = queryset.filter(status__iexact=status_filter)

        # Pagination (optional: manual lightweight pagination)
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 25))
        start = (page - 1) * page_size
        end = start + page_size
        total_count = queryset.count()

        serializer = MT5MigrationLogSerializer(queryset[start:end], many=True)

        return Response(
            {
                "count": total_count,
                "page": page,
                "page_size": page_size,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class AutoRewardRuleViewSet(viewsets.ModelViewSet):
    queryset = AutoRewardRule.objects.all()
    serializer_class = AutoRewardRuleSerializer
    permission_classes = [HasPermission]
    required_permissions = ['wecoins.manage_tasks']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            self.required_permissions = ['wecoins.view_tasks']
        else:
            self.required_permissions = ['wecoins.manage_tasks']
        return [HasPermission()]


class RewardTaskViewSet(viewsets.ModelViewSet):
    queryset = RewardTask.objects.all().order_by("-created_at")
    serializer_class = RewardTaskSerializer
    permission_classes = [HasPermission]
    required_permissions = ['wecoins.manage_tasks']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            self.required_permissions = ['wecoins.view_tasks']
        else:
            self.required_permissions = ['wecoins.manage_tasks']
        return [HasPermission()]

    # --------------------------------------------------
    # Expiration Auto-Handling
    # --------------------------------------------------

    def _apply_expiration(self, instance):
        """
        Applies expiration logic if task is expired.
        Requires model method: apply_expiration_if_needed()
        """
        if hasattr(instance, "apply_expiration_if_needed"):
            instance.apply_expiration_if_needed(save=True)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Apply expiration check (safe limit to avoid heavy scan)
        for task in queryset[:200]:
            self._apply_expiration(task)

        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        self._apply_expiration(instance)
        return super().retrieve(request, *args, **kwargs)

    # --------------------------------------------------
    # Image Handling (BunnyCDN)
    # --------------------------------------------------

    def handle_images(self, serializer, task):
        """Upload/remove feature & example images via BunnyCDN."""

        # -----------------------------
        # FEATURE IMAGE
        # -----------------------------
        if serializer.validated_data.get("remove_feature_image"):
            task.feature_image = None
            task.save(update_fields=["feature_image"])

        feature_file = self.request.FILES.get("feature_image_file")
        if feature_file:
            ext = feature_file.name.split(".")[-1]
            filename = f"reward_tasks/feature/{uuid.uuid4()}.{ext}"
            cdn_url = upload_to_bunnycdn(feature_file, filename)

            task.feature_image = cdn_url
            task.save(update_fields=["feature_image"])

        # -----------------------------
        # EXAMPLE IMAGE
        # -----------------------------
        if serializer.validated_data.get("remove_example_image"):
            task.example_image = None
            task.save(update_fields=["example_image"])

        example_file = self.request.FILES.get("example_image_file")
        if example_file:
            ext = example_file.name.split(".")[-1]
            filename = f"reward_tasks/examples/{uuid.uuid4()}.{ext}"
            cdn_url = upload_to_bunnycdn(example_file, filename)

            task.example_image = cdn_url
            task.save(update_fields=["example_image"])

    # --------------------------------------------------
    # Create
    # --------------------------------------------------

    def perform_create(self, serializer):
        task = serializer.save()
        self.handle_images(serializer, task)

        log_event(
            request=self.request,
            user=self.request.user,
            category="wecoins",
            event_type="wecoins_task_created",
            metadata={
                "task_id": str(task.id),
                "title": task.title,
                "starts_at": task.starts_at.isoformat() if task.starts_at else None,
                "expires_at": task.expires_at.isoformat() if task.expires_at else None,
                "expire_action": task.expire_action,
            },
            description=f"Admin ({self.request.user.email}) created reward task '{task.title}'"
        )

    # --------------------------------------------------
    # Update
    # --------------------------------------------------

    def perform_update(self, serializer):
        instance = self.get_object()

        before = {
            "title": instance.title,
            "status": instance.status,
            "reward_amount": str(instance.reward_amount),
            "feature_image": instance.feature_image,
            "example_image": instance.example_image,
            "starts_at": instance.starts_at.isoformat() if instance.starts_at else None,
            "expires_at": instance.expires_at.isoformat() if instance.expires_at else None,
            "expire_action": instance.expire_action,
        }

        task = serializer.save()
        self.handle_images(serializer, task)

        after = {
            "title": task.title,
            "status": task.status,
            "reward_amount": str(task.reward_amount),
            "feature_image": task.feature_image,
            "example_image": task.example_image,
            "starts_at": task.starts_at.isoformat() if task.starts_at else None,
            "expires_at": task.expires_at.isoformat() if task.expires_at else None,
            "expire_action": task.expire_action,
        }

        if before != after:
            log_event(
                request=self.request,
                user=self.request.user,
                category="wecoins",
                event_type="wecoins_task_updated",
                metadata={
                    "task_id": str(task.id),
                    "before": before,
                    "after": after,
                },
                description=f"Admin ({self.request.user.email}) updated reward task '{task.title}'"
            )

    # --------------------------------------------------
    # Delete
    # --------------------------------------------------

    def perform_destroy(self, instance):
        log_event(
            request=self.request,
            user=self.request.user,
            category="wecoins",
            event_type="wecoins_task_deleted",
            metadata={
                "task_id": str(instance.id),
                "title": instance.title,
            },
            description=f"Admin ({self.request.user.email}) deleted reward task '{instance.title}'"
        )
        instance.delete()

class RewardSubmissionViewSet(viewsets.ModelViewSet):
    """
    CRUD for Reward Submissions — users submit tasks, admin reviews.
    """
    queryset = RewardSubmission.objects.all().select_related('user', 'task')
    serializer_class = RewardSubmissionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'task']
    search_fields = ['user__username', 'task__title']
    ordering_fields = ['created_at', 'status']
    required_permissions = ['wecoins.manage_submissions']

    def get_permissions(self):
        if self.action in ['approve', 'decline', 'partial_update', 'destroy', 'update']:
            self.required_permissions = ['wecoins.manage_submissions']
            return [HasPermission()]
        self.required_permissions = ['wecoins.view_submissions']
        return [HasPermission()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Users with view_submissions permission see all; others see only their own
        if not user.is_superuser and not user.has_perm_code('wecoins.view_submissions'):
            qs = qs.filter(user=user)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    # --- Admin Actions ---
    @action(detail=True, methods=['post'], permission_classes=[HasPermission])
    def approve(self, request, pk=None):
        """
        Admin approves a submission and optionally credits WeCoins.
        """
        submission = self.get_object()
        if submission.status != 'pending':
            return Response({'detail': 'Already reviewed.'}, status=status.HTTP_400_BAD_REQUEST)

        reward_amount = request.data.get('reward_amount', submission.task.reward_amount)
        submission.status = 'approved'
        submission.reward_amount = reward_amount
        submission.reviewed_by = request.user
        submission.reviewed_at = dj_timezone.now()
        submission.save()

        # ✅ Optional: credit WeCoins to wallet
        wallet, _ = WeCoinWallet.objects.get_or_create(user=submission.user)
        wallet.balance += reward_amount
        wallet.save()

        WeCoinTransaction.objects.create(
            wallet=wallet,
            type='earn',
            amount=reward_amount,
            description=f"Reward for completing task: {submission.task.title}"
        )

        log_event(
        request=request,
        user=submission.user,
        category="wecoins",
        event_type="wecoins_submission_approved",
        metadata={"submission_id": str(submission.id), "task": submission.task.title, "amount": str(reward_amount)},
        description=f"Admin ({request.user.email}) approved reward submission and credited {reward_amount} WeCoins"
        )

        return Response({'detail': f'Submission approved, {reward_amount} WeCoins credited.'})

    @action(detail=True, methods=['post'], permission_classes=[HasPermission])
    def decline(self, request, pk=None):
        """
        Admin declines a submission with a comment.
        """
        submission = self.get_object()
        if submission.status != 'pending':
            return Response({'detail': 'Already reviewed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        comment = request.data.get('admin_comment', '')
        submission.status = 'declined'
        submission.admin_comment = comment
        submission.reviewed_by = request.user
        submission.reviewed_at = dj_timezone.now()
        submission.save()

        log_event(
        request=request,
        user=submission.user,
        category="wecoins",
        event_type="wecoins_submission_declined",
        metadata={"submission_id": str(submission.id), "task": submission.task.title},
        description=f"Admin ({request.user.email}) declined reward submission"
        )

        return Response({'detail': 'Submission declined.'})
    
class RedeemItemViewSet(viewsets.ModelViewSet):
    """
    CRUD for Redeemable Items (WeCoins Shop) + expiration support
    """
    queryset = RedeemItem.objects.all().order_by("-created_at")
    serializer_class = RedeemItemSerializer
    permission_classes = [HasPermission]
    required_permissions = ['wecoins.manage_redeem_items']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            self.required_permissions = ['wecoins.view_redeem_items']
        else:
            self.required_permissions = ['wecoins.manage_redeem_items']
        return [HasPermission()]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "is_active", "is_archived"]  # NEW
    search_fields = ["title", "description", "coupon_code", "addon_code"]
    ordering_fields = ["created_at", "required_wecoins", "title", "starts_at", "expires_at"]  # NEW

    # --------------------------------------------------
    # Expiration Auto-Handling
    # --------------------------------------------------

    def _apply_expiration(self, instance):
        """
        Applies expiration logic if item is expired.
        Requires model method: apply_expiration_if_needed()
        """
        if hasattr(instance, "apply_expiration_if_needed"):
            instance.apply_expiration_if_needed(save=True)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Apply expiration check (safe limit to avoid heavy scan)
        for item in queryset[:200]:
            self._apply_expiration(item)

        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        self._apply_expiration(instance)
        return super().retrieve(request, *args, **kwargs)

    # --------------------------------------------------
    # Queryset rules
    # --------------------------------------------------

    def get_queryset(self):
        qs = super().get_queryset()

        # Keep expired state consistent even when the list isn't hit (optional)
        # (We already do list/retrieve application above.)

        user = getattr(self.request, "user", None)
        if user and not user.is_superuser and not user.has_perm_code('wecoins.manage_redeem_items'):
            # Users without manage permission: only show currently available items
            qs = qs.filter(is_active=True, is_archived=False)
        return qs

    # --------------------------------------------------
    # Logging
    # --------------------------------------------------

    def perform_create(self, serializer):
        item = serializer.save()

        log_event(
            request=self.request,
            user=self.request.user,
            category="wecoins",
            event_type="wecoins_redeem_item_created",
            metadata={
                "item_id": str(item.id),
                "title": item.title,
                "cost": str(item.required_wecoins),
                "category": item.category,
                "is_active": item.is_active,
                "is_archived": getattr(item, "is_archived", False),
                "starts_at": item.starts_at.isoformat() if item.starts_at else None,
                "expires_at": item.expires_at.isoformat() if item.expires_at else None,
                "expire_action": getattr(item, "expire_action", None),
            },
            description=f"Admin ({self.request.user.email}) created redeem item '{item.title}'",
        )

    def perform_update(self, serializer):
        instance = self.get_object()

        before = {
            "title": instance.title,
            "required_wecoins": str(instance.required_wecoins),
            "is_active": instance.is_active,
            "is_archived": getattr(instance, "is_archived", False),
            "category": instance.category,
            "stock_quantity": instance.stock_quantity,
            "coupon_code": instance.coupon_code,
            "addon_code": instance.addon_code,
            "image_url": instance.image_url,
            "starts_at": instance.starts_at.isoformat() if instance.starts_at else None,
            "expires_at": instance.expires_at.isoformat() if instance.expires_at else None,
            "expire_action": getattr(instance, "expire_action", None),
        }

        item = serializer.save()

        # If expires_at was set to past, enforce immediately
        self._apply_expiration(item)

        after = {
            "title": item.title,
            "required_wecoins": str(item.required_wecoins),
            "is_active": item.is_active,
            "is_archived": getattr(item, "is_archived", False),
            "category": item.category,
            "stock_quantity": item.stock_quantity,
            "coupon_code": item.coupon_code,
            "addon_code": item.addon_code,
            "image_url": item.image_url,
            "starts_at": item.starts_at.isoformat() if item.starts_at else None,
            "expires_at": item.expires_at.isoformat() if item.expires_at else None,
            "expire_action": getattr(item, "expire_action", None),
        }

        if before != after:
            log_event(
                request=self.request,
                user=self.request.user,
                category="wecoins",
                event_type="wecoins_redeem_item_updated",
                metadata={"item_id": str(item.id), "before": before, "after": after},
                description=f"Admin ({self.request.user.email}) updated redeem item '{item.title}'",
            )

    def perform_destroy(self, instance):
        log_event(
            request=self.request,
            user=self.request.user,
            category="wecoins",
            event_type="wecoins_redeem_item_deleted",
            metadata={"item_id": str(instance.id), "title": instance.title},
            description=f"Admin ({self.request.user.email}) deleted redeem item '{instance.title}'",
        )
        instance.delete()

class WeCoinWalletViewSet(viewsets.ModelViewSet):
    """
    Admin view for managing WeCoin wallets.
    Allows viewing all users' balances, transaction history, and manual adjustments.
    """
    queryset = WeCoinWallet.objects.select_related('user').prefetch_related('transactions')
    serializer_class = WeCoinWalletSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__username', 'user__email']
    ordering_fields = ['balance', 'user__username', 'user__email']
    required_permissions = ['wecoins.view_ledger']

    def get_permissions(self):
        self.required_permissions = ['wecoins.view_ledger']
        return [HasPermission()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Users with view_ledger permission see all wallets; others see only their own
        if not user.is_superuser and not user.has_perm_code('wecoins.view_ledger'):
            qs = qs.filter(user=user)
        return qs

    @action(detail=True, methods=['post'], permission_classes=[HasPermission])
    def adjust_balance(self, request, pk=None):
        """
        Manually adjust a user's WeCoin balance (positive or negative).
        Automatically logs the transaction as 'adjustment'.
        """
        wallet = self.get_object()
        amount = request.data.get('amount')
        description = request.data.get('description', 'Manual Adjustment')

        # Validate and safely convert to Decimal
        try:
            amount = Decimal(str(amount))
        except (InvalidOperation, TypeError, ValueError):
            return Response({'detail': 'Invalid amount format.'}, status=status.HTTP_400_BAD_REQUEST)

        # Apply adjustment
        wallet.balance += amount
        wallet.save(update_fields=['balance'])

        # Record transaction
        WeCoinTransaction.objects.create(
            wallet=wallet,
            type='adjustment',
            amount=amount,
            description=description
        )

        log_event(
        request=request,
        user=wallet.user,
        category="wecoins",
        event_type="wecoins_wallet_adjusted",
        metadata={"wallet_id": str(wallet.id), "amount": str(amount), "new_balance": str(wallet.balance)},
        description=f"Admin ({request.user.email}) adjusted WeCoin wallet balance"
        )

        return Response({
            'detail': f'Wallet updated by {amount} WeCoins.',
            'new_balance': str(wallet.balance)
        })
        
class AdminAffiliateManagerViewSet(viewsets.ViewSet):
    """
    Admin-facing API to manage all affiliate-related operations
    for a specific affiliate user.
    """
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.manage']

    def get_affiliate_user(self, user_id):
            """
            Return a user who is either an affiliate OR has an affiliate_profile.
            (Supports hybrid users who are both client + affiliate)
            """
            user = get_object_or_404(User, id=user_id)

            # Check if user is affiliate or has affiliate profile
            has_affiliate_profile = hasattr(user, "affiliate_profile")

            if user.role not in ["affiliate", "client"] or not has_affiliate_profile:
                raise Http404("User is not an affiliate or does not have an affiliate profile.")

            return user
        
    # ---- Overview ----
    @action(detail=True, methods=["get"])
    def overview(self, request, pk=None):
        """
        Retrieve full affiliate overview: profile, wallet, commission, stats
        """
        user = self.get_affiliate_user(pk)
        profile = getattr(user, "affiliate_profile", None)
        wallet = getattr(user, "affiliate_wallet", None)
        custom_comm = getattr(profile, "custom_commission", None) if profile else None

        data = {
            "user": {
                "id": str(user.id),
                "name": f"{user.first_name} {user.last_name}".strip(),
                "email": user.email,
                "status": user.status,
                "phone": user.phone,
                "created_at": user.created_at,
            },
            "profile": AffiliateProfileSerializer(profile).data if profile else None,
            "wallet": AffiliateWalletSerializer(wallet).data if wallet else None,
            "custom_commission": (
                AffiliateCustomCommissionSerializer(custom_comm).data
                if custom_comm else None
            ),
            "stats": {
                "total_referrals": profile.referrals.count() if profile else 0,
                "approved_referrals": profile.referrals.filter(commission_status="approved").count() if profile else 0,
                "total_payouts": user.affiliate_payouts.count(),
                "total_earned": wallet.total_earned if wallet else Decimal("0.00"),
            },
        }

        return Response(data, status=status.HTTP_200_OK)

    # ---- Referrals ----
    @action(detail=True, methods=["get"])
    def referrals(self, request, pk=None):
        """
        List all referrals for this affiliate
        """
        user = self.get_affiliate_user(pk)
        referrals = AffiliateReferral.objects.filter(affiliate__user=user)
        serializer = AffiliateReferralSerializer(referrals, many=True)
        return Response(serializer.data)

    # ---- Payouts ----
    @action(detail=True, methods=["get"])
    def payouts(self, request, pk=None):
        """
        List all payouts for this affiliate
        """
        user = self.get_affiliate_user(pk)
        payouts = AffiliatePayout.objects.filter(affiliate=user)
        serializer = AffiliatePayoutSerializer(payouts, many=True)
        return Response(serializer.data)

    # ---- Wallet ----
    @action(detail=True, methods=["get"])
    def wallet(self, request, pk=None):
        """
        Get affiliate wallet info and recent transactions
        """
        user = self.get_affiliate_user(pk)
        wallet = getattr(user, "affiliate_wallet", None)
        if not wallet:
            return Response({"detail": "No wallet found."}, status=404)

        wallet_data = AffiliateWalletSerializer(wallet).data
        transactions = wallet.transactions.all()[:10]
        tx_serializer = AffiliateWalletTransactionSerializer(transactions, many=True)

        return Response({
            "wallet": wallet_data,
            "recent_transactions": tx_serializer.data,
        })

    # ---- Wallet Adjust ----
    @action(detail=True, methods=["post"])
    def adjust_wallet(self, request, pk=None):
        """
        Manually adjust affiliate wallet (add/remove funds)
        """
        user = self.get_affiliate_user(pk)
        wallet = getattr(user, "affiliate_wallet", None)
        if not wallet:
            return Response({"detail": "No wallet found."}, status=404)

        amount = Decimal(request.data.get("amount", 0))
        note = request.data.get("note", "Manual Adjustment")
        if amount == 0:
            return Response({"detail": "Amount cannot be zero."}, status=400)

        wallet.balance += amount
        wallet.total_earned += amount if amount > 0 else Decimal("0.00")
        wallet.save()

        AffiliateWalletTransaction.objects.create(
            wallet=wallet,
            transaction_type="adjustment",
            amount=amount,
            note=note,
            status="approved",
        )

        return Response({
            "detail": f"Wallet adjusted by {amount} USD.",
            "new_balance": wallet.balance
        }, status=200)

    # ---- Custom Commission ----
    @action(detail=True, methods=["post"])
    def set_custom_commission(self, request, pk=None):
        """
        Create or update custom commission for an affiliate
        """
        user = self.get_affiliate_user(pk)
        profile = getattr(user, "affiliate_profile", None)
        if not profile:
            return Response({"detail": "Affiliate profile not found."}, status=404)

        serializer = AffiliateCustomCommissionSerializer(
            instance=getattr(profile, "custom_commission", None),
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(affiliate=profile)

        return Response({
            "detail": "Custom commission updated successfully.",
            "data": serializer.data
        })

    @action(detail=True, methods=["delete"])
    def disable_custom_commission(self, request, pk=None):
        """
        Disable (deactivate) custom commission for affiliate
        """
        user = self.get_affiliate_user(pk)
        profile = getattr(user, "affiliate_profile", None)
        if not profile or not hasattr(profile, "custom_commission"):
            return Response({"detail": "No custom commission found."}, status=404)

        custom = profile.custom_commission
        custom.is_active = False
        custom.save()

        return Response({"detail": "Custom commission disabled."})
    
class WeCoinsBetaAdminViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin: Manage Beta Access for WeCoins users.
    - List all beta requests
    - Approve / Decline in one click
    """

    permission_classes = [HasPermission]
    required_permissions = ['config.manage_beta_features']
    serializer_class = WeCoinsBetaAccessAdminSerializer

    def get_queryset(self):
        qs = BetaFeatureAccess.objects.filter(
            feature__code="wecoins"
        ).select_related("user")

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs.order_by("-requested_at")

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        access = self.get_object()

        access.status = "approved"
        access.reviewed_at = dj_timezone.now()
        access.save(update_fields=["status", "reviewed_at"])

        # Log Event
        log_event(
            request=request,
            user=access.user,
            category="wecoins",
            event_type="wecoins_beta_request_approved",
            metadata={
                "beta_id": str(access.id),
                "user_id": str(access.user.id),
                "user_email": access.user.email,
            },
            description=f"Admin ({request.user.email}) approved WeCoins beta access request."
        )

        return Response({"detail": "Approved"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        access = self.get_object()

        admin_notes = request.data.get("admin_notes", "")

        access.status = "declined"
        access.admin_notes = admin_notes
        access.reviewed_at = dj_timezone.now()
        access.save(update_fields=["status", "admin_notes", "reviewed_at"])

        # Log Event
        log_event(
            request=request,
            user=access.user,
            category="wecoins",
            event_type="wecoins_beta_request_declined",
            metadata={
                "beta_id": str(access.id),
                "user_id": str(access.user.id),
                "user_email": access.user.email,
                "admin_notes": admin_notes,
            },
            description=f"Admin ({request.user.email}) declined WeCoins beta access request."
        )

        return Response({"detail": "Declined"}, status=status.HTTP_200_OK)
    
class CompetitionsBetaAdminViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin: Manage Beta Access for Competitions users.
    - List all beta requests
    - Approve / Decline in one click
    """

    permission_classes = [HasPermission]
    required_permissions = ['config.manage_beta_features']
    serializer_class = CompetitionsBetaAccessAdminSerializer

    def get_queryset(self):
        qs = BetaFeatureAccess.objects.filter(
            feature__code="competitions"
        ).select_related("user")

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs.order_by("-requested_at")

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        access = self.get_object()

        access.status = "approved"
        access.reviewed_at = dj_timezone.now()
        access.save(update_fields=["status", "reviewed_at"])

        # ✅ Log Event
        log_event(
            request=request,
            user=access.user,
            category="competitions",
            event_type="competitions_beta_request_approved",
            metadata={
                "beta_id": str(access.id),
                "user_id": str(access.user.id),
                "user_email": access.user.email,
            },
            description=f"Admin ({request.user.email}) approved Competitions beta access request."
        )

        return Response({"detail": "Approved"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        access = self.get_object()

        admin_notes = request.data.get("admin_notes", "")

        access.status = "declined"
        access.admin_notes = admin_notes
        access.reviewed_at = dj_timezone.now()
        access.save(update_fields=["status", "admin_notes", "reviewed_at"])

        # ✅ Log Event
        log_event(
            request=request,
            user=access.user,
            category="competitions",
            event_type="competitions_beta_request_declined",
            metadata={
                "beta_id": str(access.id),
                "user_id": str(access.user.id),
                "user_email": access.user.email,
                "admin_notes": admin_notes,
            },
            description=f"Admin ({request.user.email}) declined Competitions beta access request."
        )

        return Response({"detail": "Declined"}, status=status.HTTP_200_OK)    
        
class LargeResultsSetPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class StopLossHistoryAdminViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin-only API to view SL change history with filtering support.
    """
    queryset = StopLossChange.objects.all().order_by("-changed_at")
    serializer_class = StopLossChangeSerializer
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_stoploss']
    pagination_class = LargeResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ["symbol", "comment"]

    def get_queryset(self):
        qs = super().get_queryset()

        position_id = self.request.query_params.get("position_id")
        login = self.request.query_params.get("login")
        symbol = self.request.query_params.get("symbol")
        side = self.request.query_params.get("side")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if position_id:
            qs = qs.filter(position_id=position_id)

        if login:
            qs = qs.filter(login=login)

        if symbol:
            qs = qs.filter(symbol__iexact=symbol)

        if side in ("BUY", "SELL"):
            qs = qs.filter(side=side)

        if date_from:
            dt = parse_datetime(date_from)
            if dt:
                qs = qs.filter(changed_at__gte=dt)

        if date_to:
            dt = parse_datetime(date_to)
            if dt:
                qs = qs.filter(changed_at__lte=dt)

        return qs

class TopAffiliatesView(generics.ListAPIView):
    """
    Admin endpoint — ranked list of top affiliates with full tier/custom commission support.
    """
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.view']
    serializer_class = TopAffiliateSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = [
        "referral_count_total", "total_commission",
        "total_paid", "pending_payout", "created_at"
    ]
    ordering = ["-total_commission"]

    def get_queryset(self):
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        tier = self.request.query_params.get("tier")
        approved = self.request.query_params.get("approved")

        qs = (
            AffiliateProfile.objects.select_related(
                "user", "manual_tier_override"
            )
            .prefetch_related("custom_commission")
        )

        # Aggregate affiliate statistics
        qs = qs.annotate(
            referral_count_total=Count("referrals"),
            total_commission=Coalesce(
                Sum("referrals__commission_amount"),
                Value(0),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
            total_paid=Coalesce(
                Sum(
                    "user__affiliate_payouts__amount",
                    filter=Q(user__affiliate_payouts__status__iexact="approved"),
                ),
                Value(0),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
            pending_payout=Coalesce(
                Sum(
                    "user__affiliate_payouts__amount",
                    filter=Q(user__affiliate_payouts__status__iexact="pending"),
                ),
                Value(0),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
        )

        # Optional filters
        if approved in ["true", "false"]:
            qs = qs.filter(approved=(approved == "true"))
        if tier:
            qs = qs.filter(manual_tier_override__id=tier)
        if start_date and end_date:
            qs = qs.filter(created_at__date__range=[start_date, end_date])

        # Add a dynamic computed attribute (safe temporary one)
        for profile in qs:
            # Leverage model's property directly for logic
            profile._effective_rate = profile.effective_commission_rate or Decimal("0.00")

        return qs.order_by("-total_commission")

class EventLogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200

class EventLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    View all logged events (admin only).
    """
    queryset = EventLog.objects.all().select_related(
        "user",
        "challenge_enrollment",
        "challenge_enrollment__client",
        "challenge_enrollment__client__user",
    )
    serializer_class = EventLogSerializer
    permission_classes = [HasPermission]
    required_permissions = ['system.view_event_logs']
    pagination_class = EventLogPagination

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]

    # Filter support
    filterset_fields = [
        "category",
        "event_type",
        "user",
        "challenge_enrollment",
    ]

    # Searching text / email / username / description / metadata
    search_fields = [
        "user__username",
        "user__email",
        "description",
        "metadata",
    ]

    # Allow sorting
    ordering_fields = [
        "timestamp",
        "category",
        "event_type",
    ]

    ordering = ["-timestamp"]

class RedeemDashboardViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin dashboard view for seeing redemption stats per item,
    and drilling down into redemptions for each item.
    """
    permission_classes = [HasPermission]
    required_permissions = ['wecoins.view_redemptions']
    queryset = RedeemItem.objects.all().order_by('-created_at')
    serializer_class = RedeemItemSummarySerializer

    def get_queryset(self):
        return (
            RedeemItem.objects
            .annotate(
                total_redemptions=Count('redemptions'),
                pending_count=Count('redemptions', filter=Q(redemptions__status='pending')),
                approved_count=Count('redemptions', filter=Q(redemptions__status='approved')),
                fulfilled_count=Count('redemptions', filter=Q(redemptions__status='fulfilled')),
                declined_count=Count('redemptions', filter=Q(redemptions__status='declined')),
            )
        )

    @action(detail=True, methods=['get'])
    def redemptions(self, request, pk=None):
        """
        Returns all redemption records for this specific item.
        """
        item = self.get_object()
        queryset = item.redemptions.select_related('user', 'reviewed_by').order_by('-created_at')
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        serializer = RedemptionListSerializer(queryset, many=True)
        return Response(serializer.data)
    
class RedemptionActionViewSet(viewsets.GenericViewSet):
    """
    Handles admin actions on individual redemptions: approve / decline / fulfill / reset
    Only write actions here, so manage permission is required.
    """
    permission_classes = [HasPermission]
    required_permissions = ['wecoins.manage_redemptions']
    queryset = Redemption.objects.select_related('user', 'item')

    @action(detail=True, methods=['post'])
    def action(self, request, pk=None):
        redemption = self.get_object()
        serializer = RedemptionActionSerializer(
            redemption,
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "id": redemption.id,
                "status": redemption.status,
                "message": f"Redemption {serializer.validated_data['action']} successful."
            },
            status=status.HTTP_200_OK
        )


class AdminResetTokenConfigView(generics.RetrieveUpdateAPIView):
    """Admin GET/PUT for reset token settings (singleton)."""
    serializer_class = ResetTokenConfigSerializer
    permission_classes = [HasPermission]
    required_permissions = ['wecoins.manage_redemptions']

    def get_object(self):
        return ResetTokenConfig.get_config()


class AdminResetTokenViewSet(viewsets.ModelViewSet):
    """Admin CRUD + action for reset tokens."""
    serializer_class = ResetTokenReadSerializer
    permission_classes = [HasPermission]
    required_permissions = ['wecoins.manage_redemptions']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'enrollment__mt5_account_id']
    filterset_fields = ['status']
    ordering_fields = ['created_at', 'wecoins_cost', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        return ResetToken.objects.all().select_related(
            'user', 'enrollment', 'enrollment__challenge', 'reviewed_by'
        )

    @action(detail=True, methods=['post'])
    def perform_action(self, request, pk=None):
        token = self.get_object()
        serializer = ResetTokenActionSerializer(
            instance=token, data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(ResetTokenReadSerializer(updated).data)


class BetaFeatureAdminViewSet(viewsets.ModelViewSet):
    """
    Simple admin CRUD for Beta Features.
    Includes custom endpoint to update feature status.
    """
    queryset = BetaFeature.objects.all().order_by('-created_at')
    serializer_class = BetaFeatureSerializer
    permission_classes = [HasPermission]
    required_permissions = ['config.manage_beta_features']

    @action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, pk=None):
        """
        POST /admin/beta-features/<id>/change-status/
        Payload: { "status": "active" }
        """
        feature = self.get_object()
        new_status = request.data.get("status")

        # Validate
        valid_statuses = dict(BetaFeature.STATUS_CHOICES).keys()
        if new_status not in valid_statuses:
            return Response(
                {"detail": "Invalid status."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Apply update
        old_status = feature.status
        feature.status = new_status
        feature.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "message": "Status updated successfully.",
                "old_status": old_status,
                "new_status": new_status,
            },
            status=status.HTTP_200_OK,
        )


class ChallengeWisePayoutsView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def get(self, request):
        data = get_challenge_payout_analytics()
        serializer = ChallengePayoutAnalyticsSerializer(data, many=True)
        return Response(serializer.data)

class AccountSizeWisePayoutsView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def get(self, request):
        data = get_account_size_payout_analytics()
        serializer = AccountSizePayoutAnalyticsSerializer(data, many=True)
        return Response(serializer.data)

class CountryWisePayoutsView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def get(self, request):
        data = get_country_wise_payout_analytics()
        serializer = CountryPayoutAnalyticsSerializer(data, many=True)
        return Response(serializer.data)

class UnprofitableCountriesView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def get(self, request):
        data = get_unprofitable_countries_analytics()
        serializer = UnprofitableCountryAnalyticsSerializer(data, many=True)
        return Response(serializer.data)
    
class RiskCoreMetricsView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def get(self, request):
        data = get_risk_core_metrics(request)
        return Response(data)

class TrendsAnalyticsView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def get(self, request):
        data = get_trends_analytics()
        return Response(data)

class TraderBehaviorAnalyticsView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def get(self, request):
        data = get_trader_behavior_analytics(request)
        return Response(data)

class OrderPassBreachAnalyticsView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def get(self, request):
        data = get_order_pass_breach_analytics(request)
        return Response(data)

class RunRiskScanAPIView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def post(self, request, *args, **kwargs):
        serializer = RiskScanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payout_id = serializer.validated_data["payout_id"]

        try:
            payout = TraderPayout.objects.get(id=payout_id)
        except TraderPayout.DoesNotExist:
            return Response(
                {"error": f"Payout with ID {payout_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            report = run_risk_scan_for_payout(payout)
        except Exception as e:
            import traceback
            return Response(
                {
                    "error": "Risk engine failed.",
                    "details": str(e),
                    "traceback": traceback.format_exc(),   # 👈 FULL ERROR
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"message": "Risk report generated successfully.", "report": report},
            status=status.HTTP_200_OK,
        )

class RunPayoutAIAnalysisView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['payouts.approve']

    def post(self, request):
        payout_id = request.data.get("payout_id")

        if not payout_id:
            return Response(
                {"error": "payout_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payout = TraderPayout.objects.get(id=payout_id)
        except TraderPayout.DoesNotExist:
            return Response(
                {"error": "Payout not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # 🧠 Run the Engine
        analysis = run_payout_ai_analysis(payout_id)

        serializer = PayoutAIAnalysisSerializer(analysis)
        return Response(serializer.data, status=status.HTTP_200_OK)

class RiskEngineReportView(APIView):
    """
    Fetch Risk Engine v2 report for a payout.

    Behavior:
    - If report exists → return it
    - If report does NOT exist → return refresh option
    - If refresh=true → delete old report (if any), rescan, save, return
    """
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_dashboard']

    def get(self, request):
        payout_id = request.query_params.get("payout_id")
        refresh = request.query_params.get("refresh") == "true"

        if not payout_id:
            return Response(
                {"detail": "Missing required parameter: payout_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Load payout ---
        try:
            payout = TraderPayout.objects.get(id=payout_id)
        except TraderPayout.DoesNotExist:
            return Response(
                {"detail": "Invalid payout ID."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # --- Fetch existing report ---
        existing_report = RiskScanReport.objects.filter(payout=payout).first()

        # --- REFRESH REQUESTED ---
        if refresh:
            # Explicitly delete old report (if exists)
            if existing_report:
                existing_report.delete()

            report_obj = attach_report_to_payout(
                payout=payout,
                admin_user=request.user,
            )

            return Response(
                self._build_response(report_obj, has_report=True),
                status=status.HTTP_200_OK,
            )

        # --- NO REFRESH ---
        if not existing_report:
            return Response(
                {
                    "payout_id": str(payout.id),
                    "has_report": False,
                    "refresh_available": True,
                    "detail": "No Risk Engine v2 report exists for this payout.",
                },
                status=status.HTTP_200_OK,
            )

        # --- EXISTING REPORT ---
        return Response(
            self._build_response(existing_report, has_report=True),
            status=status.HTTP_200_OK,
        )

    def _build_response(self, report_obj: RiskScanReport, *, has_report: bool):
        return {
            "payout_id": str(report_obj.payout_id),
            "has_report": has_report,
            "refresh_available": True,
            "global_score": report_obj.global_score,
            "max_severity": report_obj.max_severity,
            "recommended_action": report_obj.recommended_action,
            "generated_at": (
                report_obj.generated_at.isoformat()
                if report_obj.generated_at
                else None
            ),
            "scan_window": report_obj.report.get("scan_window"),
            "report": report_obj.report,
        }

class GetPayoutAIAnalysisView(APIView):
    """
    GET  → return existing AI analysis for payout
    POST → refresh (re-run AI engine) and return { started: true }
    """
    permission_classes = [HasPermission]
    required_permissions = ['risk.ai_analysis']

    def get(self, request, payout_id):
        """
        Returns complete AI analysis for the given payout.
        """

        payout = TraderPayout.objects.filter(id=payout_id).first()
        if not payout:
            return Response(
                {"detail": "Payout not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            analysis = payout.ai_analysis_v2
        except PayoutAIAnalysis.DoesNotExist:
            return Response(
                {"detail": "AI analysis not generated for this payout."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Full response payload for frontend
        data = {
            "payout_id": str(payout.id),
            "status": analysis.status,
            "error_message": analysis.error_message,

            "llm_model": analysis.llm_model,
            "llm_prompt_version": analysis.llm_prompt_version,

            "stats": analysis.stats,
            "trade_samples": analysis.trade_samples,

            "ai_summary": analysis.ai_summary,
            "ai_trading_style": analysis.ai_trading_style,
            "ai_risk_profile": analysis.ai_risk_profile,
            "ai_consistency": analysis.ai_consistency,
            "ai_recommendations": analysis.ai_recommendations,

            "recommendation": {
                "decision": analysis.recommendation,
                "confidence": analysis.recommendation_confidence,
                "rationale": analysis.recommendation_rationale,
            },

            "llm_raw_response": analysis.llm_raw_response,
        }

        return Response(data, status=status.HTTP_200_OK)

    # ============================================================
    #                REFRESH FEATURE (POST)
    # ============================================================
    def post(self, request, payout_id):
        """
        Refresh the AI Analysis — re-run engine and overwrite result.
        Runs asynchronously (threaded) so frontend gets instant response.
        """

        payout = TraderPayout.objects.filter(id=payout_id).first()
        if not payout:
            return Response(
                {"detail": "Payout not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Mark status as "running" immediately
        analysis, _ = PayoutAIAnalysis.objects.get_or_create(
            payout=payout,
            defaults={"trader": payout.trader, "enrollment": payout.challenge_enrollment}
        )
        analysis.status = "running"
        analysis.error_message = ""
        analysis.save()

        # Run engine in background thread
        def _background_job():
            try:
                run_payout_ai_analysis(payout_id)
            except Exception as e:
                a = PayoutAIAnalysis.objects.get(payout=payout)
                a.status = "failed"
                a.error_message = f"EngineError: {e}"
                a.save()

        threading.Thread(target=_background_job, daemon=True).start()

        return Response(
            {
                "detail": "AI analysis refresh started.",
                "payout_id": payout_id,
                "status": "running"
            },
            status=status.HTTP_200_OK
        )

class RunPayoutConsistencyCheckView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['payouts.approve']

    def post(self, request, payout_id):
        api_key = settings.ANTHROPIC_API_KEY
        refresh = request.query_params.get("refresh") == "true"

        try:
            payout = TraderPayout.objects.get(id=payout_id)
        except TraderPayout.DoesNotExist:
            return Response({"error": "Payout not found"}, status=status.HTTP_404_NOT_FOUND)

        existing = getattr(payout, "consistency_report", None)

        # ============================================================
        # CASE 1: Already exists & NOT refresh → return existing report
        # ============================================================
        if existing and not refresh:
            return Response({
                "message": "Existing report available",
                "already_generated": True,
                "report_id": str(existing.id),
                "verdict": existing.verdict,
                "approved_amount": float(existing.approved_amount),
                "deduction_percentage": float(existing.deduction_percentage),
                "payout_status": existing.payout_status,
                "reason": existing.reason,

                # NEW FIELDS
                "analysis": existing.analysis,                        # AI structured output
                "ai_request": existing.ai_request,                    # request sent
                "ai_raw_response": existing.ai_raw_response,          # raw Claude text
                "ai_parsed_response": existing.ai_parsed_response,    # parsed JSON
            })

        # ============================================================
        # CASE 2: Refresh requested → delete and regenerate
        # ============================================================
        if existing and refresh:
            existing.delete()

        # ============================================================
        # CASE 3: Generate new report
        # ============================================================
        engine = WeFundConsistencyEngine(api_key=api_key)

        try:
            report = engine.run_for_payout(payout_id)
            return Response({
                "message": "New consistency analysis generated",
                "already_generated": False,
                "report_id": str(report.id),
                "verdict": report.verdict,
                "approved_amount": float(report.approved_amount),
                "deduction_percentage": float(report.deduction_percentage),
                "payout_status": report.payout_status,
                "reason": report.reason,

                # NEW FIELDS
                "analysis": report.analysis,
                "ai_request": report.ai_request,
                "ai_raw_response": report.ai_raw_response,
                "ai_parsed_response": report.ai_parsed_response,
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ExportChallengeEnrollmentCSVView(APIView):
    """
    Admin Export:
    - All challenge enrollments
    - Filter by challenge, status
    - Custom date range
    - Quick date filters
    - CSV downloadable sheet
    """

    permission_classes = [HasPermission]
    required_permissions = ['enrollments.export']

    def get(self, request):
        params = request.query_params

        challenge_id = params.get("challenge_id")
        status = params.get("status")

        date_from = params.get("from")
        date_to = params.get("to")

        quick_date = params.get("quick_date")

        queryset = ChallengeEnrollment.objects.select_related(
            "client__user",
            "challenge",
        ).prefetch_related("breach_records")

        # Challenge Filter
        if challenge_id:
            queryset = queryset.filter(challenge_id=challenge_id)

        # Status Filter
        if status:
            queryset = queryset.filter(status=status)

        # Custom Date Range Filter (start_date)
        if date_from and date_to:
            queryset = queryset.filter(start_date__range=[date_from, date_to])

        # Quick Date Filters
        today = dj_timezone.now().date()

        if quick_date == "today":
            queryset = queryset.filter(start_date=today)

        elif quick_date == "last_7_days":
            queryset = queryset.filter(start_date__gte=today - timedelta(days=7))

        elif quick_date == "this_month":
            queryset = queryset.filter(
                start_date__year=today.year,
                start_date__month=today.month
            )

        elif quick_date == "last_month":
            first_day_this_month = today.replace(day=1)
            last_month_last_day = first_day_this_month - timedelta(days=1)

            queryset = queryset.filter(
                start_date__year=last_month_last_day.year,
                start_date__month=last_month_last_day.month
            )

        # CSV Response
        response = HttpResponse(content_type="text/csv")
        filename = f"challenge_enrollments_{today}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)

        # Sheet Headers
        writer.writerow([
            "Client Name",
            "Client Email",
            "Challenge Name",
            "MT5 Account ID",
            "Account Size",
            "Current Balance",
            "Current Status",
            "Start Date",
            "Live/Breach Date",
        ])

        for obj in queryset:

            user = obj.client.user
            client_name = f"{user.first_name} {user.last_name}".strip() or user.username
            client_email = user.email

            challenge_name = obj.challenge.name if obj.challenge else "-"

            mt5_account_id = obj.mt5_account_id or "-"

            account_size = obj.account_size

            # Fetch MT5 Balance Safely
            try:
                current_balance = (
                    fetch_user_balance(obj.mt5_account_id)
                    if obj.mt5_account_id else None
                )
            except Exception:
                current_balance = None

            # ✅ Status Handling (SAFE for DICT or STRING)
            if obj.status == "failed":
                latest_breach = obj.breach_records.order_by("-breached_at").first()

                if latest_breach and latest_breach.previous_state:

                    prev_state = latest_breach.previous_state

                    # ✅ If previous_state is dict → use its label safely
                    if isinstance(prev_state, dict):
                        prev_label = (
                            prev_state.get("label")
                            or prev_state.get("status")
                            or "Unknown Phase"
                        )

                    # ✅ If previous_state is string → format it
                    elif isinstance(prev_state, str):
                        prev_label = prev_state.replace("_", " ").title()

                    else:
                        prev_label = "Unknown Phase"

                    current_status = f"{prev_label} - Failed"
                    live_or_breach_date = latest_breach.breached_at.date()

                else:
                    current_status = "Failed"
                    live_or_breach_date = "-"

            else:
                current_status = obj.get_status_display()
                live_or_breach_date = obj.live_start_date or "-"

            writer.writerow([
                client_name,
                client_email,
                challenge_name,
                mt5_account_id,
                account_size,
                current_balance if current_balance is not None else "-",
                current_status,
                obj.start_date,
                live_or_breach_date,
            ])

        return response
    
class AdminCompetitionViewSet(viewsets.ModelViewSet):
    serializer_class = CompetitionSerializer
    permission_classes = [HasPermission]
    required_permissions = ['competitions.manage']
    queryset = Competition.objects.all().order_by("-created_at")

    # CREATE = Draft only
    def perform_create(self, serializer):
        serializer.save(status="draft")

    # EDIT restrictions
    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.status == "ended":
            raise Exception("Ended competitions cannot be edited.")
        serializer.save()

    # PUBLISH (Draft → Upcoming)
    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        competition = self.get_object()

        if competition.status != "draft":
            return Response(
                {"detail": "Only Draft competitions can be published."},
                status=status.HTTP_400_BAD_REQUEST
            )

        old = competition.status
        competition.status = "upcoming"
        competition.save()

        CompetitionStatusLog.objects.create(
            competition=competition,
            old_status=old,
            new_status="upcoming"
        )

        return Response({"detail": "Competition published successfully."})

    # FORCE START (Upcoming → Ongoing)
    @action(detail=True, methods=["post"])
    def force_start(self, request, pk=None):
        competition = self.get_object()

        if competition.status != "upcoming":
            return Response(
                {"detail": "Only Upcoming competitions can be started."},
                status=status.HTTP_400_BAD_REQUEST
            )

        old = competition.status
        competition.status = "ongoing"
        competition.save()

        CompetitionStatusLog.objects.create(
            competition=competition,
            old_status=old,
            new_status="ongoing"
        )

        return Response({"detail": "Competition started."})

    # END NOW (Any → Ended)
    @action(detail=True, methods=["post"])
    def end_now(self, request, pk=None):
        competition = self.get_object()

        if competition.status == "ended":
            return Response({"detail": "Competition already ended."}, status=status.HTTP_400_BAD_REQUEST)

        # 1) Compute final leaderboard BEFORE status flip (doesn't matter, but clearer)
        rows = build_final_leaderboard_rows(competition)

        # 2) Save final snapshots (DB)
        save_final_snapshots(competition, rows)

        # 3) End competition + status log
        old = competition.status
        competition.status = "ended"
        competition.save(update_fields=["status"])

        CompetitionStatusLog.objects.create(
            competition=competition,
            old_status=old,
            new_status="ended"
        )

        # 4) Send emails AFTER COMMIT
        def _send_result_emails():
            now = timezone.now()

            for row in rows:
                user = row["user"]
                if not user.email:
                    continue

                rank = row["rank"]
                growth_percent = row["growth_percent"]

                prize_text = prize_for_rank(competition, rank)

                if prize_text:
                    EmailService.send_competition_winner_email(
                        to_email=user.email,
                        subject=f"🎉 You Won! — {competition.title} (Rank #{rank})",
                        context={
                            "user": user,
                            "competition": competition,
                            "rank": rank,
                            "growth_percent": growth_percent,
                            "prize_text": prize_text,
                            "now": now,
                            "brand_name": "WeFund",
                        }
                    )
                else:
                    EmailService.send_competition_loser_email(
                        to_email=user.email,
                        subject=f"Competition Results — {competition.title}",
                        context={
                            "user": user,
                            "competition": competition,
                            "rank": rank,
                            "growth_percent": growth_percent,
                            "now": now,
                            "brand_name": "WeFund",
                        }
                    )

        transaction.on_commit(_send_result_emails)

        return Response({"detail": "Competition ended successfully."})

class AdminCompetitionStatusListView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['competitions.view']

    def get(self, request):

        status_param = request.query_params.get("status")  
        # expected: draft / upcoming / ongoing / ended

        qs = Competition.objects.annotate(
            total_registrations=Count("registrations")
        ).order_by("-created_at")

        if status_param:
            qs = qs.filter(status=status_param)

        serializer = AdminCompetitionListSerializer(qs, many=True)
        return Response(serializer.data)

class AdminCompetitionRegistrationsView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['competitions.view_registrations']

    def get(self, request, competition_id):

        try:
            competition = Competition.objects.get(id=competition_id)
        except Competition.DoesNotExist:
            return Response({"detail": "Competition not found"}, status=404)

        qs = (
            CompetitionRegistration.objects
            .filter(competition=competition)
            .select_related("user", "user__client_profile")
            .order_by("-joined_at")
        )

        serializer = AdminCompetitionRegistrationSerializer(qs, many=True)
        return Response({
            "competition": competition.title,
            "total_registrations": qs.count(),
            "registrations": serializer.data
        })

class LiveCompetitionLeaderboardView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['competitions.view_leaderboard']

    def get(self, request, competition_id):

        try:
            competition = Competition.objects.get(
                id=competition_id,
                status__in=["ongoing", "ended"]
            )
        except Competition.DoesNotExist:
            return Response(
                {"detail": "Competition not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # ✅ Fetch all participants with challenge enrollment
        regs = (
            CompetitionRegistration.objects
            .filter(
                competition=competition,
                challenge_enrollment__isnull=False,
                user__hidden_from_leaderboard=False,
            )
            .select_related("user", "challenge_enrollment", "user__client_profile")
        )

        leaderboard_rows = []

        for reg in regs:
            enrollment = reg.challenge_enrollment

            mt5_login = enrollment.mt5_account_id
            if not mt5_login:
                continue

            initial_balance = enrollment.account_size

            # ✅ LIVE MT5 DATA
            live_balance = fetch_user_balance(mt5_login) or Decimal("0.00")
            live_equity = fetch_user_equity(mt5_login) or Decimal("0.00")

            # ✅ LIVE GROWTH %
            if initial_balance > 0:
                growth_percent = ((live_equity - initial_balance) / initial_balance) * 100
            else:
                growth_percent = Decimal("0.00")

            # ✅ LIVE TOTAL TRADES (from your DB)
            total_trades = MT5Trade.objects.filter(
                mt5_login=mt5_login,
                trade_type="deal"
            ).count()

            if reg.user.leaderboard_display_name:
                trader_name = reg.user.leaderboard_display_name
            else:
                profile = getattr(reg.user, "client_profile", None)
                if profile:
                    first = profile.address_info.get("first_name", "")
                    last = profile.address_info.get("last_name", "")
                    trader_name = f"{first} {last}".strip() or reg.user.username
                else:
                    trader_name = reg.user.username

            leaderboard_rows.append({
                "user_id": reg.user.id,
                "trader_name": trader_name,
                "trader_email": reg.user.email,
                "mt5_login": mt5_login,
                "initial_balance": initial_balance,
                "equity": live_equity,
                "balance": live_balance,
                "growth_percent": round(growth_percent, 2),
                "total_trades": total_trades,
            })

        # ✅ LIVE SORTING BY GROWTH
        leaderboard_rows.sort(
            key=lambda x: x["growth_percent"],
            reverse=True
        )

        # ✅ ASSIGN LIVE RANKS
        for idx, row in enumerate(leaderboard_rows, start=1):
            row["rank"] = idx

        # ✅ PAGINATION (LIVE)
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 50))

        paginator = Paginator(leaderboard_rows, page_size)
        page_obj = paginator.get_page(page)

        serializer = LiveCompetitionLeaderboardSerializer(page_obj, many=True)

        # ✅ STICKY USER RANK
        my_rank = None
        for row in leaderboard_rows:
            if str(row["user_id"]) == str(request.user.id):
                my_rank = row["rank"]
                break

        return Response({
            "competition": competition.title,
            "mode": "LIVE",
            "total_participants": len(leaderboard_rows),
            "total_pages": paginator.num_pages,
            "current_page": page,
            "my_rank": my_rank,
            "results": serializer.data,
        })

class AdminCompetitionLeaderboardView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['competitions.view_leaderboard']

    def get(self, request, competition_id):

        try:
            competition = Competition.objects.get(id=competition_id)
        except Competition.DoesNotExist:
            return Response({"detail": "Competition not found"}, status=404)

        qs = CompetitionRankingSnapshot.objects.filter(
            competition=competition,
            user__hidden_from_leaderboard=False,
        ).select_related("user").order_by("rank")

        # Optional Sorting
        sort_by = request.query_params.get("sort")  
        # allowed: rank, growth, trades, equity, balance

        if sort_by == "growth":
            qs = qs.order_by("-growth_percent")
        elif sort_by == "trades":
            qs = qs.order_by("-total_trades")
        elif sort_by == "equity":
            qs = qs.order_by("-equity")
        elif sort_by == "balance":
            qs = qs.order_by("-balance")

        # Pagination
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 50))

        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page)

        serializer = AdminCompetitionLeaderboardSerializer(page_obj, many=True)

        return Response({
            "competition": competition.title,
            "total_participants": paginator.count,
            "total_pages": paginator.num_pages,
            "current_page": page,
            "results": serializer.data
        })

class AdminCompetitionLeaderboardExportCSV(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['competitions.export_leaderboard']

    def get(self, request, competition_id):

        try:
            competition = Competition.objects.get(id=competition_id)
        except Competition.DoesNotExist:
            return Response({"detail": "Competition not found"}, status=404)

        qs = CompetitionRankingSnapshot.objects.filter(
            competition=competition
        ).select_related("user").order_by("rank")

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{competition.title}_leaderboard.csv"'

        writer = csv.writer(response)
        writer.writerow([
            "Rank",
            "Trader Name",
            "Trader Email",
            "MT5 Login",
            "Growth %",
            "Trades",
            "Equity",
            "Balance",
            "Captured At"
        ])

        for row in qs:
            profile = getattr(row.user, "client_profile", None)
            trader_name = (
                f"{profile.address_info.get('first_name', '')} "
                f"{profile.address_info.get('last_name', '')}".strip()
                if profile else row.user.username
            )

            writer.writerow([
                row.rank,
                trader_name,
                row.user.email,
                row.mt5_login,
                row.growth_percent,
                row.total_trades,
                row.equity,
                row.balance,
                row.captured_at.strftime("%Y-%m-%d %H:%M:%S"),
            ])

        return response

STALE_AFTER_MINUTES = 5


class AIRiskAnalysisView(APIView):
    """
    Admin endpoint to:
    - Fetch existing AI Risk Analysis for a payout
    - Trigger / re-trigger async AI risk scan
    """

    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    # ---------------------------------------------
    # GET → Fetch existing analysis
    # ---------------------------------------------
    def get(self, request, payout_id):
        try:
            payout = TraderPayout.objects.get(id=payout_id)
        except TraderPayout.DoesNotExist:
            return Response(
                {"detail": "Payout not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        analysis = getattr(payout, "ai_risk_analysis", None)

        if not analysis:
            return Response(
                {
                    "exists": False,
                    "can_scan": True,
                    "detail": "No AI risk analysis exists for this payout",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AIRiskAnalysisSerializer(analysis)

        can_scan = True
        if analysis.status in ("queued", "running"):
            can_scan = self._is_stale(analysis)

        return Response(
            {
                "exists": True,
                "can_scan": can_scan,
                "status": analysis.status,
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # ---------------------------------------------
    # POST → Trigger / Refresh analysis (ASYNC)
    # ---------------------------------------------
    def post(self, request, payout_id):
        try:
            payout = TraderPayout.objects.get(id=payout_id)
        except TraderPayout.DoesNotExist:
            return Response(
                {"detail": "Payout not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        existing = getattr(payout, "ai_risk_analysis", None)

        # ------------------------------------------------
        # Prevent unsafe duplicate runs
        # ------------------------------------------------
        if existing:
            if existing.status in ("queued", "running"):
                if not self._is_stale(existing):
                    return Response(
                        {
                            "detail": "AI risk analysis already in progress",
                            "status": existing.status,
                            "analysis_id": existing.id,
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

                # STALE → allow re-run
                logger.warning(
                    "Stale AI risk analysis detected (status=%s, id=%s). Re-running.",
                    existing.status,
                    existing.id,
                )

            # Safe to delete old analysis
            existing.delete()

        engine = AIRiskEngine()

        try:
            analysis = engine.run_for_payout(payout_id=payout.id)
        except AIRiskEngineError as exc:
            logger.exception("AI risk scan failed for payout %s", payout_id)
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        serializer = AIRiskAnalysisSerializer(analysis)

        return Response(
            {
                "exists": True,
                "queued": True,
                "status": analysis.status,
                "analysis_id": analysis.id,
                "data": serializer.data,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    # ---------------------------------------------
    # Helpers
    # ---------------------------------------------
    def _is_stale(self, analysis) -> bool:
        """
        Consider analysis stale if queued/running for more than X minutes.
        """
        now = dj_timezone.now()
        reference_time = analysis.started_at or analysis.created_at

        if not reference_time:
            return True

        return now - reference_time > timedelta(minutes=STALE_AFTER_MINUTES)


class AIRiskReviewFeedbackView(APIView):
    """
    Admin endpoint for human review feedback on AI risk analysis.
    """

    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    # ---------------------------------------------
    # GET → Fetch existing feedback
    # ---------------------------------------------
    def get(self, request, analysis_id):
        try:
            analysis = AIRiskAnalysis.objects.get(id=analysis_id)
        except AIRiskAnalysis.DoesNotExist:
            return Response(
                {"detail": "AI risk analysis not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        feedback = getattr(analysis, "feedback", None)
        if not feedback:
            return Response(
                {"exists": False},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AIRiskReviewFeedbackSerializer(feedback)
        return Response(
            {"exists": True, "data": serializer.data},
            status=status.HTTP_200_OK,
        )

    # ---------------------------------------------
    # POST → Submit feedback (ONCE)
    # ---------------------------------------------
    def post(self, request, analysis_id):
        try:
            analysis = AIRiskAnalysis.objects.get(id=analysis_id)
        except AIRiskAnalysis.DoesNotExist:
            return Response(
                {"detail": "AI risk analysis not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if analysis.status != "completed":
            return Response(
                {"detail": "AI analysis not completed yet"},
                status=status.HTTP_409_CONFLICT,
            )

        if hasattr(analysis, "feedback"):
            return Response(
                {"detail": "Feedback already submitted"},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = AIRiskReviewFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        feedback = serializer.save(
            analysis=analysis,
            reviewer=request.user,
        )

        # ---------------------------------------------
        # Lock final decision at analysis level
        # ---------------------------------------------
        analysis.final_decision = feedback.human_decision
        analysis.reviewed_at = timezone.now()
        analysis.requires_human_review = False
        analysis.save(update_fields=[
            "final_decision",
            "reviewed_at",
            "requires_human_review",
        ])

        return Response(
            {
                "created": True,
                "final_decision": analysis.final_decision,
            },
            status=status.HTTP_201_CREATED,
        )
    
class AIRiskReportExportView(APIView):
    """
    Admin-only endpoint to export full AI + Risk PDF report for a payout.
    """

    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    def get(self, request, payout_id):
        # ------------------------------------------------
        # FETCH PAYOUT + RELATED OBJECTS
        # ------------------------------------------------
        try:
            payout = TraderPayout.objects.select_related(
                "ai_risk_analysis",
                "risk_scan",           # ✅ CORRECT FIELD
                "challenge_enrollment",
            ).get(id=payout_id)
        except TraderPayout.DoesNotExist:
            return Response(
                {"detail": "Payout not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        ai_analysis = getattr(payout, "ai_risk_analysis", None)
        if not ai_analysis:
            return Response(
                {"detail": "AI risk analysis not found for this payout"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if ai_analysis.status != "completed":
            return Response(
                {"detail": "AI risk analysis is not completed yet"},
                status=status.HTTP_409_CONFLICT,
            )

        risk_scan = getattr(payout, "risk_scan", None)

        # ------------------------------------------------
        # GENERATE PDF
        # ------------------------------------------------
        try:
            pdf_path = generate_payout_risk_report(
                payout=payout,
                ai_analysis=ai_analysis,
                risk_scan=risk_scan,
            )
        except Exception as exc:
            return Response(
                {"detail": f"Failed to generate PDF: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not pdf_path or not os.path.exists(pdf_path):
            return Response(
                {"detail": "Generated PDF file not found"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ------------------------------------------------
        # STREAM PDF
        # ------------------------------------------------
        filename = f"payout-risk-report-{payout.id}.pdf"
        content_type, _ = mimetypes.guess_type(pdf_path)

        response = FileResponse(
            open(pdf_path, "rb"),
            content_type=content_type or "application/pdf",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        return response


# -------------------------------------------------------------------
# AI Learning Center Views
# -------------------------------------------------------------------

class AILearningStatsView(APIView):
    """
    GET /api/admin/ai-risk-learning/stats/
    Returns accuracy stats, pattern distribution, and decision distribution.
    """
    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    def get(self, request):
        from django.db.models import Count, Case, When, IntegerField, F
        from django.db.models.functions import Coalesce

        # Total analyses
        total_analyses = AIRiskAnalysis.objects.filter(status='completed').count()

        # Total reviewed (with feedback)
        total_reviewed = AIRiskReviewFeedback.objects.count()

        # AI accuracy (% where human agrees with AI)
        if total_reviewed > 0:
            agreed_count = AIRiskReviewFeedback.objects.filter(human_agrees_with_ai=True).count()
            ai_accuracy = agreed_count / total_reviewed
        else:
            ai_accuracy = 0.0

        # Patterns by type - aggregate from ai_patterns_detected JSONField
        patterns_by_type = {}
        analyses_with_patterns = AIRiskAnalysis.objects.filter(
            status='completed'
        ).exclude(ai_patterns_detected=[]).values_list('ai_patterns_detected', flat=True)

        for patterns in analyses_with_patterns:
            # Defensive check: ensure patterns is a list
            if patterns and isinstance(patterns, list):
                for pattern in patterns:
                    if pattern and isinstance(pattern, str):
                        patterns_by_type[pattern] = patterns_by_type.get(pattern, 0) + 1

        # Decisions by type
        decisions = AIRiskAnalysis.objects.filter(
            status='completed'
        ).exclude(ai_recommendation__isnull=True).values('ai_recommendation').annotate(
            count=Count('id')
        )
        decisions_by_type = {d['ai_recommendation'].lower(): d['count'] for d in decisions if d['ai_recommendation']}

        return Response({
            'total_analyses': total_analyses,
            'total_reviewed': total_reviewed,
            'ai_accuracy': round(ai_accuracy, 4),
            'patterns_by_type': patterns_by_type,
            'decisions_by_type': decisions_by_type,
        })


class AILearningAnalysesView(APIView):
    """
    GET /api/admin/ai-risk-learning/analyses/
    Returns paginated list of AI analyses with feedback info.

    Query params:
    - has_feedback: true/false
    - is_training_example: true/false
    - human_agrees_with_ai: true/false
    - ai_recommendation: approve/reject/manual_review
    - page: int
    - page_size: int (default 20)
    """
    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    def get(self, request):
        from django.core.paginator import Paginator

        qs = AIRiskAnalysis.objects.filter(
            status='completed'
        ).select_related('payout', 'feedback', 'feedback__reviewer').order_by('-created_at')

        # Apply filters
        has_feedback = request.query_params.get('has_feedback')
        if has_feedback is not None:
            if has_feedback.lower() == 'true':
                qs = qs.filter(feedback__isnull=False)
            elif has_feedback.lower() == 'false':
                qs = qs.filter(feedback__isnull=True)

        is_training = request.query_params.get('is_training_example')
        if is_training is not None:
            if is_training.lower() == 'true':
                qs = qs.filter(feedback__is_training_example=True)
            elif is_training.lower() == 'false':
                qs = qs.filter(feedback__is_training_example=False)

        agrees = request.query_params.get('human_agrees_with_ai')
        if agrees is not None:
            if agrees.lower() == 'true':
                qs = qs.filter(feedback__human_agrees_with_ai=True)
            elif agrees.lower() == 'false':
                qs = qs.filter(feedback__human_agrees_with_ai=False)

        recommendation = request.query_params.get('ai_recommendation')
        if recommendation:
            qs = qs.filter(ai_recommendation__iexact=recommendation)

        # Pagination with input validation
        try:
            page = int(request.query_params.get('page', 1))
            page = max(1, page)  # Ensure positive
        except (ValueError, TypeError):
            page = 1

        try:
            page_size = int(request.query_params.get('page_size', 20))
            page_size = max(1, min(100, page_size))  # Clamp between 1 and 100
        except (ValueError, TypeError):
            page_size = 20

        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page)

        # Serialize
        serializer = AIAnalysisWithFeedbackSerializer(page_obj.object_list, many=True)

        return Response({
            'count': paginator.count,
            'next': page + 1 if page_obj.has_next() else None,
            'previous': page - 1 if page_obj.has_previous() else None,
            'results': serializer.data,
        })


class AILearningTrainingListView(APIView):
    """
    GET /api/admin/ai-risk-learning/training/
    Returns list of analyses marked as training examples.
    """
    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    def get(self, request):
        qs = AIRiskAnalysis.objects.filter(
            status='completed',
            feedback__is_training_example=True
        ).select_related('payout', 'feedback', 'feedback__reviewer').order_by('-feedback__created_at')

        serializer = AITrainingExampleSerializer(qs, many=True)
        return Response(serializer.data)


class AILearningTrainingApproveView(APIView):
    """
    POST /api/admin/ai-risk-learning/training/{id}/approve/
    Marks an analysis as a training example.
    """
    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    def post(self, request, analysis_id):
        try:
            analysis = AIRiskAnalysis.objects.get(id=analysis_id)
        except AIRiskAnalysis.DoesNotExist:
            return Response(
                {'detail': 'Analysis not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if analysis.status != 'completed':
            return Response(
                {'detail': 'Analysis is not completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        feedback = getattr(analysis, 'feedback', None)
        if not feedback:
            return Response(
                {'detail': 'Analysis has no human feedback yet'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate and sanitize priority input
        try:
            priority = int(request.data.get('priority', 1))
            priority = max(0, min(10, priority))  # Clamp between 0 and 10
        except (ValueError, TypeError):
            priority = 1

        feedback.is_training_example = True
        feedback.training_priority = priority
        feedback.save(update_fields=['is_training_example', 'training_priority'])

        return Response({
            'status': 'approved',
            'id': str(analysis.id),
        })


class AILearningTrainingRejectView(APIView):
    """
    POST /api/admin/ai-risk-learning/training/{id}/reject/
    Removes an analysis from training examples.
    """
    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    def post(self, request, analysis_id):
        try:
            analysis = AIRiskAnalysis.objects.get(id=analysis_id)
        except AIRiskAnalysis.DoesNotExist:
            return Response(
                {'detail': 'Analysis not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        feedback = getattr(analysis, 'feedback', None)
        if not feedback:
            return Response(
                {'detail': 'Analysis has no human feedback'},
                status=status.HTTP_400_BAD_REQUEST
            )

        feedback.is_training_example = False
        feedback.training_priority = 0
        feedback.save(update_fields=['is_training_example', 'training_priority'])

        # Log the rejection reason if provided
        reason = request.data.get('reason', '')
        if reason:
            logger.info(
                "Training example rejected: analysis_id=%s, reason=%s, by=%s",
                analysis_id, reason, request.user.email
            )

        return Response({
            'status': 'rejected',
            'id': str(analysis.id),
        })


class Echo:
    """An object that implements just the write method of the file-like interface."""
    def write(self, value):
        return value


def safe_get(dct, path, default=""):
    """
    safe_get(raw, ["billing","email"])
    """
    cur = dct or {}
    for key in path:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(key)
        if cur is None:
            return default
    return cur


def _sanitize_csv(val):
    """Prevent CSV formula injection by prefixing dangerous characters with a single quote."""
    if isinstance(val, str) and val and val[0] in ("=", "+", "-", "@", "\t", "\r"):
        # Don't mangle legitimate numeric strings like "-15.50"
        try:
            float(val)
            return val
        except ValueError:
            return "'" + val
    return val


def extract_line_item(raw_data: dict, index: int = 0) -> dict:
    items = (raw_data or {}).get("line_items") or []
    if not items or index >= len(items):
        return {}
    return items[index] or {}


def extract_meta_value(line_item: dict, meta_key: str) -> str:
    meta = (line_item or {}).get("meta_data") or []
    for m in meta:
        if (m or {}).get("key") == meta_key:
            v = (m or {}).get("value", "")
            return "" if v is None else str(v)
    return ""


class OrderExportCSVView(APIView):
    """
    GET /api/admin/orders/export.csv?...filters...
    Returns a CSV export of orders (streamed).
    """
    permission_classes = [HasPermission]
    required_permissions = ['orders.view']
    filter_backends = [DjangoFilterBackend]
    filterset_class = OrderExportFilter

    def get_queryset(self) -> QuerySet[Order]:
        qs = (
            Order.objects
            .select_related("user", "affiliate__user")
            .order_by("-date_created")
        )
        return qs

    def apply_filters(self, request, qs):
        # Apply django-filter filters
        f = self.filterset_class(request.GET, queryset=qs)
        qs = f.qs

        # Optional extra filters based on raw_data (done in Python; OK for moderate datasets)
        # For very large datasets, consider denormalizing these into model fields.
        country = request.GET.get("country")  # billing country (IE, US, etc.)
        sku = request.GET.get("sku")          # first line item sku
        woo_status = request.GET.get("woo_status")  # raw_data["status"]
        product_id = request.GET.get("product_id")  # raw_data line_items[0].product_id

        if country:
            country = country.strip().upper()
            qs = [o for o in qs if safe_get(o.raw_data, ["billing", "country"], "").upper() == country]

        if woo_status:
            woo_status = woo_status.strip().lower()
            qs = [o for o in qs if str((o.raw_data or {}).get("status", "")).lower() == woo_status]

        if sku:
            sku = sku.strip().upper()
            qs = [o for o in qs if str(extract_line_item(o.raw_data).get("sku", "")).upper() == sku]

        if product_id:
            try:
                pid = int(product_id)
                qs = [o for o in qs if int(extract_line_item(o.raw_data).get("product_id") or 0) == pid]
            except ValueError:
                pass

        return qs

    # WooCommerce raw uses "address_1"/"address_2"; model billing_address stores "address_line_1"/"address_line_2"
    _BILLING_KEY_MAP = {"address_1": "address_line_1", "address_2": "address_line_2"}

    def _billing_field(self, o, raw_billing, field):
        """Get billing field from raw_data first, fall back to model billing_address."""
        val = raw_billing.get(field, "")
        if not val:
            model_key = self._BILLING_KEY_MAP.get(field, field)
            val = (o.billing_address or {}).get(model_key, "")
        return val or ""

    def build_row(self, o: Order) -> dict:
        raw = o.raw_data or {}
        billing = raw.get("billing") or {}
        shipping = raw.get("shipping") or {}
        li0 = extract_line_item(raw, 0)

        # meta values from raw_data -> line_items[0].meta_data
        meta_account_size = extract_meta_value(li0, "pa_account-size")
        meta_broker_type = extract_meta_value(li0, "pa_broker-type")
        meta_challenge_type = extract_meta_value(li0, "challenge_type")
        meta_plugin_source = extract_meta_value(li0, "plugin_source")

        date_paid_raw = raw.get("date_paid", "")
        if isinstance(date_paid_raw, dict):
            date_paid_str = date_paid_raw.get("date", "")
        else:
            date_paid_str = str(date_paid_raw) if date_paid_raw else ""

        # Affiliate username (resolve FK to readable name)
        affiliate_name = ""
        if o.affiliate and hasattr(o.affiliate, "user"):
            u = o.affiliate.user
            affiliate_name = f"{u.first_name} {u.last_name}".strip() or u.email
        elif o.affiliate_id:
            affiliate_name = str(o.affiliate_id)

        # Coupon codes (list → comma-separated string)
        coupons = o.coupon_codes or []
        coupon_str = ", ".join(str(c) for c in coupons) if isinstance(coupons, list) else str(coupons)

        return {
            # Model identifiers
            "id": o.id,
            "date_created": o.date_created.strftime("%Y-%m-%d %H:%M:%S") if o.date_created else "",
            "status": o.status,
            "payment_status": o.payment_status,

            "woo_order_id": o.woo_order_id or "",
            "woo_order_number": o.woo_order_number or "",
            "woo_order_key": o.woo_order_key or "",
            "woo_customer_id": o.woo_customer_id or "",

            "customer_name": o.customer_name,
            "customer_email": o.customer_email,
            "customer_ip": o.customer_ip or "",

            # Product (Fix #1: was missing entirely)
            "product_name": o.product_name or "",

            # Amounts (model)
            "cost": str(o.cost),
            "quantity": o.quantity,
            "total_usd": str(o.total_usd),
            "items_subtotal_usd": str(o.items_subtotal_usd),
            "coupons_discount_usd": str(o.coupons_discount_usd),
            "order_total_usd": str(o.order_total_usd),
            "paid_usd": str(o.paid_usd),
            "currency": o.currency,
            "coupon_codes": coupon_str,

            "payment_method": o.payment_method,
            "transaction_id": o.transaction_id or "",

            # Challenge / affiliate
            "challenge_name": o.challenge_name,
            "challenge_broker_type": o.challenge_broker_type,
            "challenge_account_size": o.challenge_account_size,
            "referral_code": o.referral_code or "",
            "affiliate": affiliate_name,

            # MT5
            "mt5_account_id": o.mt5_account_id or "",
            "mt5_password": o.mt5_password or "",
            "mt5_investor_password": o.mt5_investor_password or "",

            # Billing (with fallback to model billing_address)
            "billing_first_name": self._billing_field(o, billing, "first_name"),
            "billing_last_name": self._billing_field(o, billing, "last_name"),
            "billing_company": self._billing_field(o, billing, "company"),
            "billing_email": self._billing_field(o, billing, "email"),
            "billing_phone": self._billing_field(o, billing, "phone"),
            "billing_country": self._billing_field(o, billing, "country"),
            "billing_state": self._billing_field(o, billing, "state"),
            "billing_city": self._billing_field(o, billing, "city"),
            "billing_postcode": self._billing_field(o, billing, "postcode"),
            "billing_address_1": self._billing_field(o, billing, "address_1"),
            "billing_address_2": self._billing_field(o, billing, "address_2"),

            "shipping_first_name": shipping.get("first_name", ""),
            "shipping_last_name": shipping.get("last_name", ""),
            "shipping_country": shipping.get("country", ""),
            "shipping_city": shipping.get("city", ""),
            "shipping_postcode": shipping.get("postcode", ""),
            "shipping_address_1": shipping.get("address_1", ""),
            "shipping_address_2": shipping.get("address_2", ""),

            # Raw-derived (top-level)
            "raw_order_id": raw.get("id", ""),
            "raw_number": raw.get("number", ""),
            "raw_status": raw.get("status", ""),
            "raw_total": raw.get("total", ""),
            "raw_currency": raw.get("currency", ""),
            "raw_date_created": raw.get("date_created", ""),
            "raw_date_paid": date_paid_str,

            # First line item summary
            "li0_name": li0.get("name", ""),
            "li0_sku": li0.get("sku", ""),
            "li0_product_id": li0.get("product_id", ""),
            "li0_variation_id": li0.get("variation_id", ""),
            "li0_quantity": li0.get("quantity", ""),
            "li0_subtotal": li0.get("subtotal", ""),
            "li0_total": li0.get("total", ""),

            # meta_data extracted
            "meta_account_size": meta_account_size,
            "meta_broker_type": meta_broker_type,
            "meta_challenge_type": meta_challenge_type,
            "meta_plugin_source": meta_plugin_source,
        }

    def get(self, request, *args, **kwargs):
        qs = self.get_queryset()
        qs = self.apply_filters(request, qs)

        # If we converted qs into a list by python filtering, it won't be a QuerySet anymore.
        iterable = qs

        # CSV header order
        fieldnames = [
            "id","date_created","status","payment_status",
            "woo_order_id","woo_order_number","woo_order_key","woo_customer_id",
            "customer_name","customer_email","customer_ip",
            "product_name",
            "cost","quantity","total_usd","items_subtotal_usd","coupons_discount_usd","order_total_usd","paid_usd","currency",
            "coupon_codes",
            "payment_method","transaction_id",
            "challenge_name","challenge_broker_type","challenge_account_size",
            "referral_code","affiliate",
            "mt5_account_id","mt5_password","mt5_investor_password",
            "billing_first_name","billing_last_name","billing_company","billing_email","billing_phone","billing_country","billing_state","billing_city","billing_postcode","billing_address_1","billing_address_2",
            "shipping_first_name","shipping_last_name","shipping_country","shipping_city","shipping_postcode","shipping_address_1","shipping_address_2",
            "raw_order_id","raw_number","raw_status","raw_total","raw_currency","raw_date_created","raw_date_paid",
            "li0_name","li0_sku","li0_product_id","li0_variation_id","li0_quantity","li0_subtotal","li0_total",
            "meta_account_size","meta_broker_type","meta_challenge_type","meta_plugin_source",
        ]

        def row_generator():
            pseudo_buffer = Echo()
            writer = csv.DictWriter(pseudo_buffer, fieldnames=fieldnames)
            # UTF-8 BOM so Excel correctly handles non-ASCII characters
            yield "\ufeff"
            # header
            yield writer.writeheader()
            # rows
            for o in iterable:
                row = {k: _sanitize_csv(v) for k, v in self.build_row(o).items()}
                yield writer.writerow(row)

        filename = f"orders_export_{dj_timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response = StreamingHttpResponse(row_generator(), content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


# -------------------------------------------------------------------
# Economic Calendar ViewSet
# -------------------------------------------------------------------

class EconomicEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Economic Calendar events.
    Provides CRUD operations plus sync and toggle actions.
    """
    serializer_class = EconomicEventSerializer
    permission_classes = [HasPermission]
    required_permissions = ['economic_calendar.view']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            self.required_permissions = ['economic_calendar.view']
        else:
            self.required_permissions = ['economic_calendar.manage']
        return [HasPermission()]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['currency', 'impact', 'source', 'is_active']
    search_fields = ['event_name', 'currency']
    ordering_fields = ['event_datetime', 'created_at', 'currency', 'impact']
    ordering = ['event_datetime']

    def get_queryset(self):
        queryset = EconomicEvent.objects.all()

        # Date range filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(event_datetime__gte=start_date)
        if end_date:
            queryset = queryset.filter(event_datetime__lte=end_date)

        # High impact only filter
        high_impact_only = self.request.query_params.get('high_impact_only')
        if high_impact_only and high_impact_only.lower() == 'true':
            queryset = queryset.filter(impact='high')

        return queryset

    def create(self, request, *args, **kwargs):
        # Set source to manual for manually created events
        data = request.data.copy()
        data['source'] = 'manual'
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'])
    def sync(self, request):
        """Trigger manual sync from Forex Factory API"""

        from wefund.tasks.economic_calendar_tasks import sync_economic_calendar

        try:
            # Run sync task synchronously for immediate feedback
            result = sync_economic_calendar(force=True)
            return Response({
                'status': 'success',
                'message': 'Economic calendar synced successfully',
                'result': result
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def sync_status(self, request):
        """Get sync schedule status"""
        schedule, _ = EconomicCalendarSyncSchedule.objects.get_or_create(
            id='economic_calendar'
        )
        serializer = EconomicCalendarSyncScheduleSerializer(schedule)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle event active status"""
        event = self.get_object()
        event.is_active = not event.is_active
        event.save(update_fields=['is_active', 'updated_at'])

        return Response({
            'id': str(event.id),
            'is_active': event.is_active,
            'message': f"Event {'activated' if event.is_active else 'deactivated'} successfully"
        })

    @action(detail=False, methods=['get'])
    def high_impact(self, request):
        """Get high-impact events for dashboard/events tab"""
        queryset = self.get_queryset().filter(impact='high', is_active=True)

        currency = request.query_params.get('currency')
        if currency:
            queryset = queryset.filter(currency=currency.upper())

        # Get upcoming events (from now)
        now = dj_timezone.now()
        upcoming = queryset.filter(event_datetime__gte=now).order_by('event_datetime')[:50]

        # Get past 7 days events
        past_7_days = now - timedelta(days=7)
        past = queryset.filter(
            event_datetime__lt=now,
            event_datetime__gte=past_7_days
        ).order_by('-event_datetime')[:50]

        return Response({
            'upcoming': EconomicEventSerializer(upcoming, many=True).data,
            'past': EconomicEventSerializer(past, many=True).data
        })
    

BUY_CMD = 0
SELL_CMD = 1


def cmd_to_side(cmd: int) -> Optional[str]:
    if cmd == BUY_CMD:
        return "BUY"
    if cmd == SELL_CMD:
        return "SELL"
    return None


@dataclass
class _TradeLite:
    account_id: int
    order: int
    symbol: str
    cmd: int
    volume: float
    open_time: datetime
    open_price: float


def _cluster_key(
    symbol: str,
    side: str,
    start_time: datetime,
    account_ids: Set[int]
) -> str:
    # bucket by second to avoid microsecond noise
    bucket = int(start_time.timestamp())
    accounts_key = ",".join(map(str, sorted(account_ids)))
    return f"{symbol}:{side}:{bucket}:{accounts_key}"


class CopyTradingDetectView(APIView):
    """
    POST /api/risk/copy-trading/detect/

    Detects copy trading clusters across provided accounts:
      - same symbol
      - same BUY/SELL
      - within N seconds (default 5)
      - >= min_accounts (default 2)
    """
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_copy_trading']

    def post(self, request):
        ser = CopyTradingDetectRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        account_ids: List[int] = data["account_ids"]
        date_from = data.get("date_from")
        date_to = data.get("date_to")
        window_seconds = data.get("window_seconds", 5)
        min_accounts = data.get("min_accounts", 2)
        volume_tolerance_ratio = data.get("volume_tolerance_ratio")  # optional
        include_trades = data.get("include_trades", True)
        max_trades_per_cluster = data.get("max_trades_per_cluster", 50)

        # Default scan range: last 24 hours (safe + practical)
        if not date_to:
            date_to = dj_timezone.now()
        if not date_from:
            date_from = date_to - timedelta(hours=24)

        window = timedelta(seconds=window_seconds)

        # Pull trades for only these accounts and only BUY/SELL
        # Expand range slightly to avoid boundary misses
        qs = (
            MT5Trade.objects
            .filter(account_id__in=account_ids)
            .filter(cmd__in=[BUY_CMD, SELL_CMD])
            .filter(open_time__gte=date_from - window, open_time__lte=date_to + window)
            .only("account_id", "order", "symbol", "cmd", "volume", "open_time", "open_price")
            .order_by("symbol", "cmd", "open_time")
        )

        buffers: Dict[Tuple[str, int], Deque[_TradeLite]] = defaultdict(deque)
        seen: Set[str] = set()
        clusters: List[dict] = []

        # lightweight iteration
        for t in qs.iterator(chunk_size=5000):
            lite = _TradeLite(
                account_id=int(t.account_id),
                order=int(t.order),
                symbol=t.symbol,
                cmd=int(t.cmd),
                volume=float(t.volume),
                open_time=t.open_time,
                open_price=float(t.open_price),
            )

            key = (lite.symbol, lite.cmd)
            buf = buffers[key]

            min_time = lite.open_time - window
            while buf and buf[0].open_time < min_time:
                buf.popleft()

            buf.append(lite)

            # distinct accounts in current window
            accounts_in_window = {x.account_id for x in buf}
            if len(accounts_in_window) < min_accounts:
                continue

            side = cmd_to_side(lite.cmd)
            if not side:
                continue

            # Optional anti-false-positive: volumes should be similar
            if volume_tolerance_ratio is not None:
                vols = [x.volume for x in buf]
                vmin, vmax = min(vols), max(vols)
                if vmin <= 0:
                    continue
                if (vmax - vmin) / vmin > float(volume_tolerance_ratio):
                    continue

            start_time = min(x.open_time for x in buf)
            end_time = max(x.open_time for x in buf)

            ck = _cluster_key(lite.symbol, side, start_time, accounts_in_window)
            if ck in seen:
                continue
            seen.add(ck)

            trades_sorted = sorted(buf, key=lambda x: x.open_time)
            # cap trades included in response for safety
            trades_sorted = trades_sorted[-max_trades_per_cluster:]

            clusters.append({
                "symbol": lite.symbol,
                "side": side,
                "window_seconds": window_seconds,
                "start_time": start_time,
                "end_time": end_time,
                "accounts": sorted(accounts_in_window),
                "orders": sorted({x.order for x in trades_sorted}),
                "trades": ([
                    {
                        "account_id": x.account_id,
                        "order": x.order,
                        "open_time": x.open_time,
                        "open_price": x.open_price,
                        "volume": x.volume,
                    } for x in trades_sorted
                ] if include_trades else []),
            })

        # ---- Enrich accounts -> enrollment/client ----
        # ChallengeEnrollment.mt5_account_id is CharField, so compare as strings
        all_accounts = sorted({aid for c in clusters for aid in c["accounts"]})
        enrollment_qs = (
            ChallengeEnrollment.objects
            .filter(mt5_account_id__in=[str(a) for a in all_accounts])
            .select_related("client__user", "challenge")
            .only(
                "id", "mt5_account_id", "status", "account_size", "currency", "broker_type",
                "client__id", "client__kyc_status",
                "client__user__first_name", "client__user__last_name", "client__user__username",
                "client__user__email",
                "challenge__name"
            )
        )

        account_info = {}
        for e in enrollment_qs:
            try:
                aid = int(e.mt5_account_id)
            except (TypeError, ValueError):
                continue
            user = e.client.user
            account_info[aid] = {
                "enrollment_id": str(e.id),
                "challenge": e.challenge.name,
                "enrollment_status": e.status,
                "account_size": str(e.account_size),
                "currency": e.currency,
                "broker_type": e.broker_type,
                "client": {
                    "client_id": str(e.client.id),
                    "name": user.get_full_name() or user.username,
                    "email": user.email,
                    "kyc_status": e.client.kyc_status,
                }
            }

        # Attach enriched info to each cluster
        for c in clusters:
            c["accounts_detail"] = [
                {"account_id": aid, **account_info.get(aid, {"unmapped": True})}
                for aid in c["accounts"]
            ]
            # simple severity heuristic
            n = len(c["accounts"])
            c["severity"] = "HIGH" if n >= 4 else ("MEDIUM" if n == 3 else "LOW")
            c["reason"] = f"Same symbol + same side within {window_seconds}s across {n} accounts"

        return Response({
            "range": {"from": date_from, "to": date_to},
            "params": {
                "window_seconds": window_seconds,
                "min_accounts": min_accounts,
                "volume_tolerance_ratio": volume_tolerance_ratio,
                "include_trades": include_trades,
                "max_trades_per_cluster": max_trades_per_cluster,
            },
            "requested_accounts": account_ids,
            "clusters_found": len(clusters),
            "clusters": clusters,
        })

class FindSimilarAccountsView(APIView):
    """
    POST /api/risk/copy-trading/find-similar/

    Input: 1 seed MT5 account
    Output: ranked list of other accounts that match seed trades
            (same symbol+side within window_seconds)
    """
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_ip_analysis']

    def post(self, request):
        ser = FindSimilarAccountsRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        seed_account_id = data["seed_account_id"]
        date_from = data.get("date_from")
        date_to = data.get("date_to")
        window_seconds = data.get("window_seconds", 5)
        min_matches = data.get("min_matches", 3)
        max_results = data.get("max_results", 20)
        include_trades = data.get("include_trades", False)

        # Default safe range (you can pass any range you want)
        if not date_to:
            date_to = dj_timezone.now()
        if not date_from:
            date_from = date_to - timedelta(hours=24)

        window = timedelta(seconds=window_seconds)

        # 1) Seed trades (only BUY/SELL) within the range
        seed_qs = (
            MT5Trade.objects
            .filter(account_id=seed_account_id, cmd__in=[BUY_CMD, SELL_CMD])
            .filter(open_time__gte=date_from, open_time__lte=date_to)
            .only("order", "symbol", "cmd", "open_time", "open_price", "volume")
            .order_by("open_time")
        )
        seed_trades = list(seed_qs)

        if not seed_trades:
            return Response({
                "seed_account_id": seed_account_id,
                "range": {"from": date_from, "to": date_to},
                "window_seconds": window_seconds,
                "message": "No seed trades found in the given range.",
                "similar_accounts": [],
            })

        symbols = sorted({t.symbol for t in seed_trades})
        min_time = seed_trades[0].open_time - window
        max_time = seed_trades[-1].open_time + window

        # 2) Candidate trades from OTHER accounts for same symbols+side in expanded window
        cand_qs = (
            MT5Trade.objects
            .filter(cmd__in=[BUY_CMD, SELL_CMD])
            .filter(symbol__in=symbols)
            .filter(open_time__gte=min_time, open_time__lte=max_time)
            .exclude(account_id=seed_account_id)
            .only("account_id", "order", "symbol", "cmd", "open_time", "open_price", "volume")
            .order_by("symbol", "cmd", "open_time")
        )

        # Index candidate trades by (symbol, cmd)
        cand_by_key = defaultdict(list)
        for t in cand_qs.iterator(chunk_size=10000):
            cand_by_key[(t.symbol, int(t.cmd))].append(t)

        # 3) Two-pointer match counting per (symbol, cmd)
        match_count = defaultdict(int)
        match_symbols = defaultdict(set)
        first_match_time = {}
        last_match_time = {}

        # Optional evidence storage (bounded)
        evidence = defaultdict(list)
        MAX_EVIDENCE_PER_ACCOUNT = 30

        for key in sorted({(t.symbol, int(t.cmd)) for t in seed_trades}):
            seed_list = [t for t in seed_trades if (t.symbol, int(t.cmd)) == key]
            cand_list = cand_by_key.get(key, [])
            if not cand_list:
                continue

            j = 0
            for s in seed_list:
                lo = s.open_time - window
                hi = s.open_time + window

                # advance j to first candidate >= lo
                while j < len(cand_list) and cand_list[j].open_time < lo:
                    j += 1

                k = j
                while k < len(cand_list) and cand_list[k].open_time <= hi:
                    c = cand_list[k]
                    aid = int(c.account_id)

                    match_count[aid] += 1
                    match_symbols[aid].add(s.symbol)

                    if aid not in first_match_time or c.open_time < first_match_time[aid]:
                        first_match_time[aid] = c.open_time
                    if aid not in last_match_time or c.open_time > last_match_time[aid]:
                        last_match_time[aid] = c.open_time

                    if include_trades and len(evidence[aid]) < MAX_EVIDENCE_PER_ACCOUNT:
                        evidence[aid].append({
                            "seed": {
                                "order": int(s.order),
                                "symbol": s.symbol,
                                "side": cmd_to_side(int(s.cmd)),
                                "open_time": s.open_time,
                                "open_price": str(s.open_price),
                                "volume": float(s.volume),
                            },
                            "other": {
                                "account_id": aid,
                                "order": int(c.order),
                                "open_time": c.open_time,
                                "open_price": str(c.open_price),
                                "volume": float(c.volume),
                            }
                        })

                    k += 1

        # 4) Filter + rank
        scored = [
            {
                "account_id": aid,
                "matches": cnt,
                "matched_symbols": sorted(match_symbols[aid]),
                "first_match_time": first_match_time.get(aid),
                "last_match_time": last_match_time.get(aid),
                "evidence": evidence.get(aid, []),
            }
            for aid, cnt in match_count.items()
            if cnt >= min_matches
        ]

        scored.sort(key=lambda x: x["matches"], reverse=True)
        scored = scored[:max_results]

        # 5) Enrich suspect accounts with enrollment/client
        suspect_ids = [str(x["account_id"]) for x in scored]
        enrollments = (
            ChallengeEnrollment.objects
            .filter(mt5_account_id__in=suspect_ids)
            .select_related("client__user", "challenge")
            .only(
                "id", "mt5_account_id", "status", "account_size", "currency",
                "client__id", "client__kyc_status",
                "client__user__first_name", "client__user__last_name", "client__user__username",
                "client__user__email",
                "challenge__name"
            )
        )

        info = {}
        for e in enrollments:
            try:
                aid = int(e.mt5_account_id)
            except (TypeError, ValueError):
                continue
            u = e.client.user
            info[aid] = {
                "enrollment_id": str(e.id),
                "challenge": e.challenge.name,
                "enrollment_status": e.status,
                "account_size": str(e.account_size),
                "currency": e.currency,
                "client": {
                    "client_id": str(e.client.id),
                    "name": u.get_full_name() or u.username,
                    "email": u.email,
                    "kyc_status": e.client.kyc_status,
                }
            }

        # 6) Add a simple confidence ratio
        seed_count = len(seed_trades)
        for row in scored:
            row["confidence_ratio"] = round(row["matches"] / max(seed_count, 1), 4)
            row["enrollment"] = info.get(row["account_id"])

            # severity heuristic
            m = row["matches"]
            row["severity"] = "HIGH" if m >= 30 else ("MEDIUM" if m >= 10 else "LOW")
            row["reason"] = f"Matched {m} seed trades (same symbol+side within {window_seconds}s)"

        return Response({
            "seed_account_id": seed_account_id,
            "seed_trades_count": seed_count,
            "range": {"from": date_from, "to": date_to},
            "params": {
                "window_seconds": window_seconds,
                "min_matches": min_matches,
                "max_results": max_results,
                "include_trades": include_trades,
            },
            "similar_accounts_found": len(scored),
            "similar_accounts": scored,
        })

class HedgingDetectView(APIView):
    """
    POST /admin/risk/hedging/detect/

    Detects hedging for each account:
      - same symbol
      - opposite side (BUY vs SELL)
      - open_time within window_seconds (default 5)
    """
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_hedging']

    def post(self, request):
        ser = HedgingDetectRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        account_ids = data["account_ids"]
        date_from = data.get("date_from")
        date_to = data.get("date_to")
        window_seconds = data.get("window_seconds", 5)
        min_pairs = data.get("min_pairs", 1)
        include_trades = data.get("include_trades", True)
        max_pairs_per_account = data.get("max_pairs_per_account", 50)

        if not date_to:
            date_to = dj_timezone.now()
        if not date_from:
            date_from = date_to - timedelta(hours=24)

        window = timedelta(seconds=window_seconds)

        # Pull trades for accounts (only BUY/SELL), order by account, symbol, open_time
        qs = (
            MT5Trade.objects
            .filter(account_id__in=account_ids, cmd__in=[0, 1])
            .filter(open_time__gte=date_from - window, open_time__lte=date_to + window)
            .only("account_id", "order", "symbol", "cmd", "volume", "open_time", "open_price")
            .order_by("account_id", "symbol", "open_time")
        )

        # Rolling window per (account_id, symbol)
        buffers = defaultdict(deque)

        # per-account results
        pairs_by_account = defaultdict(list)
        seen_pair_keys = set()

        for t in qs.iterator(chunk_size=5000):
            key = (int(t.account_id), t.symbol)
            buf = buffers[key]

            # evict outside window
            min_time = t.open_time - window
            while buf and buf[0].open_time < min_time:
                buf.popleft()

            # compare t against opposite-side trades in buf
            for prev in buf:
                if int(prev.cmd) == int(t.cmd):
                    continue  # same side, not hedging
                # within window is guaranteed by buffer eviction
                # Build stable dedupe key
                a = int(t.account_id)
                o1, o2 = sorted([int(prev.order), int(t.order)])
                bucket = int(min(prev.open_time, t.open_time).timestamp())
                pair_key = f"{a}:{t.symbol}:{bucket}:{o1}:{o2}"
                if pair_key in seen_pair_keys:
                    continue
                seen_pair_keys.add(pair_key)

                buy = prev if int(prev.cmd) == 0 else t
                sell = prev if int(prev.cmd) == 1 else t

                pairs_by_account[a].append({
                    "symbol": t.symbol,
                    "start_time": min(prev.open_time, t.open_time),
                    "end_time": max(prev.open_time, t.open_time),
                    "buy": {
                        "order": int(buy.order),
                        "open_time": buy.open_time,
                        "open_price": str(buy.open_price),
                        "volume": float(buy.volume),
                    },
                    "sell": {
                        "order": int(sell.order),
                        "open_time": sell.open_time,
                        "open_price": str(sell.open_price),
                        "volume": float(sell.volume),
                    }
                })

                # cap for safety
                if len(pairs_by_account[a]) >= max_pairs_per_account:
                    break

            buf.append(t)

        # Filter by min_pairs
        filtered_accounts = [aid for aid in account_ids if len(pairs_by_account.get(aid, [])) >= min_pairs]

        # Enrich with enrollment/client
        enrollments = (
            ChallengeEnrollment.objects
            .filter(mt5_account_id__in=[str(a) for a in filtered_accounts])
            .select_related("client__user", "challenge")
        )
        info = {}
        for e in enrollments:
            try:
                aid = int(e.mt5_account_id)
            except (TypeError, ValueError):
                continue
            u = e.client.user
            info[aid] = {
                "enrollment_id": str(e.id),
                "challenge": e.challenge.name,
                "enrollment_status": e.status,
                "account_size": str(e.account_size),
                "currency": e.currency,
                "client": {
                    "client_id": str(e.client.id),
                    "name": u.get_full_name() or u.username,
                    "email": u.email,
                    "kyc_status": e.client.kyc_status,
                }
            }

        results = []
        for aid in account_ids:
            pairs = pairs_by_account.get(aid, [])
            if len(pairs) < min_pairs:
                continue
            results.append({
                "account_id": aid,
                "pairs_found": len(pairs),
                "severity": "HIGH" if len(pairs) >= 10 else ("MEDIUM" if len(pairs) >= 3 else "LOW"),
                "enrollment": info.get(aid),
                "pairs": pairs if include_trades else [],
                "reason": f"Opposite-side trades on same symbol within {window_seconds}s",
            })

        return Response({
            "range": {"from": date_from, "to": date_to},
            "params": {
                "window_seconds": window_seconds,
                "min_pairs": min_pairs,
                "include_trades": include_trades,
                "max_pairs_per_account": max_pairs_per_account,
            },
            "requested_accounts": account_ids,
            "accounts_flagged": len(results),
            "results": results,
        })


class HedgingFindSimilarView(APIView):
    """
    POST /admin/risk/hedging/find-similar/

    Given seed_account_id, find other accounts that perform hedging
    (BUY+SELL on same symbol within window_seconds) in the same period,
    and rank them by number of matched hedging events.
    """
    permission_classes = [HasPermission]
    required_permissions = ['risk.view_hedging']

    def post(self, request):
        ser = HedgingFindSimilarRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        seed_account_id = data["seed_account_id"]
        date_from = data.get("date_from")
        date_to = data.get("date_to")
        window_seconds = data.get("window_seconds", 5)

        min_matches = data.get("min_matches", 2)
        max_results = data.get("max_results", 20)

        include_evidence = data.get("include_evidence", False)
        max_evidence_per_account = data.get("max_evidence_per_account", 20)

        if not date_to:
            date_to = dj_timezone.now()
        if not date_from:
            date_from = date_to - timedelta(hours=24)

        window = timedelta(seconds=window_seconds)

        # ------------------------------------------------------------
        # Step 1) Build seed hedging events
        # Event = (symbol, start_time, end_time) where we found BUY+SELL within window
        # ------------------------------------------------------------
        seed_qs = (
            MT5Trade.objects
            .filter(account_id=seed_account_id, cmd__in=[0, 1])
            .filter(open_time__gte=date_from - window, open_time__lte=date_to + window)
            .only("order", "symbol", "cmd", "open_time", "open_price", "volume")
            .order_by("symbol", "open_time")
        )

        buffers = defaultdict(deque)  # key: symbol -> deque of recent trades
        seed_events = []              # list of dict events
        seen_seed_event_keys = set()

        for t in seed_qs.iterator(chunk_size=5000):
            sym = t.symbol
            buf = buffers[sym]

            # evict older than window
            min_time = t.open_time - window
            while buf and buf[0].open_time < min_time:
                buf.popleft()

            # find opposite-side in window
            for prev in buf:
                if int(prev.cmd) == int(t.cmd):
                    continue

                start = min(prev.open_time, t.open_time)
                end = max(prev.open_time, t.open_time)

                # dedupe by symbol + second-bucket + involved orders (stable)
                o1, o2 = sorted([int(prev.order), int(t.order)])
                bucket = int(start.timestamp())
                ek = f"{sym}:{bucket}:{o1}:{o2}"
                if ek in seen_seed_event_keys:
                    continue
                seen_seed_event_keys.add(ek)

                buy = prev if int(prev.cmd) == 0 else t
                sell = prev if int(prev.cmd) == 1 else t

                seed_events.append({
                    "symbol": sym,
                    "start_time": start,
                    "end_time": end,
                    "seed_buy": {
                        "order": int(buy.order),
                        "open_time": buy.open_time,
                        "open_price": str(buy.open_price),
                        "volume": float(buy.volume),
                    },
                    "seed_sell": {
                        "order": int(sell.order),
                        "open_time": sell.open_time,
                        "open_price": str(sell.open_price),
                        "volume": float(sell.volume),
                    },
                })
                break  # one match is enough to form a seed hedging event for this trade

            buf.append(t)

        if not seed_events:
            return Response({
                "seed_account_id": seed_account_id,
                "range": {"from": date_from, "to": date_to},
                "window_seconds": window_seconds,
                "message": "No hedging events found for seed account in the given range.",
                "similar_accounts": [],
            })

        # Reduce to minimal search constraints for candidates
        symbols = sorted({e["symbol"] for e in seed_events})
        min_time = min(e["start_time"] for e in seed_events) - window
        max_time = max(e["end_time"] for e in seed_events) + window

        # ------------------------------------------------------------
        # Step 2) Pull candidate trades from OTHER accounts in same symbols/time window
        # ------------------------------------------------------------
        cand_qs = (
            MT5Trade.objects
            .filter(cmd__in=[0, 1])
            .filter(symbol__in=symbols)
            .filter(open_time__gte=min_time, open_time__lte=max_time)
            .exclude(account_id=seed_account_id)
            .only("account_id", "order", "symbol", "cmd", "open_time", "open_price", "volume")
            .order_by("account_id", "symbol", "open_time")
        )

        # ------------------------------------------------------------
        # Step 3) For each candidate account+symbol, detect hedging pairs and see if they overlap seed events
        # Overlap rule: candidate hedging window intersects seed event window (within same symbol)
        # ------------------------------------------------------------
        seed_windows_by_symbol = defaultdict(list)
        for e in seed_events:
            seed_windows_by_symbol[e["symbol"]].append((e["start_time"], e["end_time"]))

        # sort windows for faster scanning
        for sym in seed_windows_by_symbol:
            seed_windows_by_symbol[sym].sort(key=lambda x: x[0])

        # trackers
        match_count = defaultdict(int)
        matched_symbols = defaultdict(set)
        evidence = defaultdict(list)

        # rolling buffers per (account_id, symbol)
        buffers2 = defaultdict(deque)

        def intersects(a_start, a_end, b_start, b_end) -> bool:
            return a_start <= b_end and b_start <= a_end

        # helper to check if a candidate hedging window intersects any seed window for that symbol
        def matches_seed_window(symbol: str, c_start, c_end) -> bool:
            windows = seed_windows_by_symbol.get(symbol, [])
            # windows count is usually small; linear scan is fine
            for s_start, s_end in windows:
                if intersects(s_start - window, s_end + window, c_start, c_end):
                    return True
            return False

        seen_candidate_pair_keys = set()

        for t in cand_qs.iterator(chunk_size=10000):
            key = (int(t.account_id), t.symbol)
            buf = buffers2[key]

            min_time2 = t.open_time - window
            while buf and buf[0].open_time < min_time2:
                buf.popleft()

            # try to form a hedging pair with opposite cmd in buffer
            for prev in buf:
                if int(prev.cmd) == int(t.cmd):
                    continue

                c_start = min(prev.open_time, t.open_time)
                c_end = max(prev.open_time, t.open_time)

                # Only count if it aligns with seed hedging time windows for that symbol
                if not matches_seed_window(t.symbol, c_start, c_end):
                    continue

                aid = int(t.account_id)
                o1, o2 = sorted([int(prev.order), int(t.order)])
                bucket = int(c_start.timestamp())
                pk = f"{aid}:{t.symbol}:{bucket}:{o1}:{o2}"
                if pk in seen_candidate_pair_keys:
                    continue
                seen_candidate_pair_keys.add(pk)

                match_count[aid] += 1
                matched_symbols[aid].add(t.symbol)

                if include_evidence and len(evidence[aid]) < max_evidence_per_account:
                    buy = prev if int(prev.cmd) == 0 else t
                    sell = prev if int(prev.cmd) == 1 else t
                    evidence[aid].append({
                        "symbol": t.symbol,
                        "start_time": c_start,
                        "end_time": c_end,
                        "buy": {
                            "order": int(buy.order),
                            "open_time": buy.open_time,
                            "open_price": str(buy.open_price),
                            "volume": float(buy.volume),
                        },
                        "sell": {
                            "order": int(sell.order),
                            "open_time": sell.open_time,
                            "open_price": str(sell.open_price),
                            "volume": float(sell.volume),
                        },
                    })

                break

            buf.append(t)

        # ------------------------------------------------------------
        # Step 4) Rank & Enrich
        # ------------------------------------------------------------
        scored = [
            {
                "account_id": aid,
                "matches": cnt,
                "matched_symbols": sorted(matched_symbols[aid]),
                "evidence": evidence.get(aid, []),
            }
            for aid, cnt in match_count.items()
            if cnt >= min_matches
        ]
        scored.sort(key=lambda x: x["matches"], reverse=True)
        scored = scored[:max_results]

        # Enrich with enrollment/client
        suspect_ids = [str(x["account_id"]) for x in scored]
        enrollments = (
            ChallengeEnrollment.objects
            .filter(mt5_account_id__in=suspect_ids)
            .select_related("client__user", "challenge")
            .only(
                "id", "mt5_account_id", "status", "account_size", "currency",
                "client__id", "client__kyc_status",
                "client__user__first_name", "client__user__last_name", "client__user__username",
                "client__user__email",
                "challenge__name"
            )
        )

        info = {}
        for e in enrollments:
            try:
                aid = int(e.mt5_account_id)
            except (TypeError, ValueError):
                continue
            u = e.client.user
            info[aid] = {
                "enrollment_id": str(e.id),
                "challenge": e.challenge.name,
                "enrollment_status": e.status,
                "account_size": str(e.account_size),
                "currency": e.currency,
                "client": {
                    "client_id": str(e.client.id),
                    "name": u.get_full_name() or u.username,
                    "email": u.email,
                    "kyc_status": e.client.kyc_status,
                }
            }

        seed_event_count = len(seed_events)
        for row in scored:
            row["confidence_ratio"] = round(row["matches"] / max(seed_event_count, 1), 4)
            row["severity"] = "HIGH" if row["matches"] >= 10 else ("MEDIUM" if row["matches"] >= 4 else "LOW")
            row["reason"] = f"Hedging aligned with seed (opposite sides within {window_seconds}s)"
            row["enrollment"] = info.get(row["account_id"])

        return Response({
            "seed_account_id": seed_account_id,
            "seed_hedging_events": seed_event_count,
            "range": {"from": date_from, "to": date_to},
            "params": {
                "window_seconds": window_seconds,
                "min_matches": min_matches,
                "max_results": max_results,
                "include_evidence": include_evidence,
                "max_evidence_per_account": max_evidence_per_account,
            },
            "similar_accounts_found": len(scored),
            "similar_accounts": scored,
            # optional: include seed events for debugging
            "seed_events": seed_events[:50],  # cap
        })


# ── Trading Reports ──────────────────────────────────────────────

from .serializers import TradingReportSerializer, TradingReportListSerializer, TradingReportConfigSerializer
from api.analytics.trading_reports import generate_trading_report, anonymize_report_data


class TradingReportViewSet(viewsets.ModelViewSet):
    """
    CRUD + on-demand generation for Top-5 Trading Reports.
    """
    permission_classes = [HasPermission]
    required_permissions = ['trading_reports.view']
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['period_type', 'is_auto_generated']
    ordering_fields = ['generated_at', 'period_start']
    ordering = ['-generated_at']
    http_method_names = ['get', 'post', 'put', 'head', 'options']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            self.required_permissions = ['trading_reports.view']
        else:
            self.required_permissions = ['trading_reports.manage']
        return [HasPermission()]

    def get_serializer_class(self):
        if self.action == 'list':
            return TradingReportListSerializer
        return TradingReportSerializer

    def get_queryset(self):
        return TradingReport.objects.select_related('generated_by').all()

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        """On-demand report generation."""
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')
        period_type = request.data.get('period_type', 'custom')

        if not period_start or not period_end:
            return Response(
                {"error": "period_start and period_end are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if period_type not in ('weekly', 'monthly', 'custom'):
            return Response(
                {"error": "Invalid period_type. Allowed values: weekly, monthly, custom."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from django.utils.dateparse import parse_date as _parse_date
            ps = _parse_date(period_start)
            pe = _parse_date(period_end)
            if not ps or not pe:
                raise ValueError()
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if ps > pe:
            return Response(
                {"error": "period_start must be before or equal to period_end."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report = generate_trading_report(
            period_start=ps,
            period_end=pe,
            period_type=period_type,
            user=request.user,
            is_auto=False,
        )

        # Optionally send Slack notification (synchronous — no Celery dependency)
        try:
            config = TradingReportConfig.objects.get(pk='trading_report')
            if config.slack_enabled and config.slack_webhook_url:
                from api.utils.slack import send_slack_message, format_trading_report_blocks
                blocks = format_trading_report_blocks(report)
                success = send_slack_message(config.slack_webhook_url, blocks)
                if success:
                    report.slack_sent = True
                    report.save(update_fields=['slack_sent'])
        except TradingReportConfig.DoesNotExist:
            pass
        except Exception:
            logger.exception("Slack notification failed for report %s", report.id)

        serializer = TradingReportSerializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='anonymized')
    def anonymized(self, request, pk=None):
        """Return anonymized version of a report for sharing/export."""
        report = self.get_object()
        anon_data = anonymize_report_data(report.data)
        result = TradingReportSerializer(report).data
        result['data'] = anon_data
        return Response(result)

    @action(detail=False, methods=['get', 'put'], url_path='config')
    def config(self, request):
        """Get or update the singleton TradingReportConfig."""
        obj, _ = TradingReportConfig.objects.get_or_create(pk='trading_report')

        if request.method == 'GET':
            serializer = TradingReportConfigSerializer(obj)
            return Response(serializer.data)

        serializer = TradingReportConfigSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
class AdminTraderPaymentMethodListCreateView(generics.ListCreateAPIView):
    """
    /admin/traders/<trader_id>/payment-methods/
    - GET: list all payment methods for trader
    - POST: add a new payment method for trader
    """
    permission_classes = [HasPermission]
    required_permissions = ['payouts.view']
    serializer_class = AdminClientPaymentMethodSerializer

    def get_trader(self):
        trader_id = self.kwargs["trader_id"]
        trader = get_object_or_404(User, id=trader_id, role="client")
        return trader

    def get_queryset(self):
        trader = self.get_trader()
        return ClientPaymentMethod.objects.filter(client=trader).order_by("-created_at")

    def perform_create(self, serializer):
        trader = self.get_trader()

        # save first
        obj = serializer.save(client=trader)

        # default handling
        if obj.is_default:
            ClientPaymentMethod.objects.filter(client=trader).exclude(id=obj.id).update(is_default=False)


class AdminTraderPaymentMethodDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    /admin/traders/<trader_id>/payment-methods/<method_id>/
    - GET: view a single method
    - PATCH/PUT: edit method
    - DELETE: delete method
    """
    permission_classes = [HasPermission]
    required_permissions = ['payouts.view']
    serializer_class = AdminClientPaymentMethodSerializer
    lookup_url_kwarg = "method_id"

    def get_trader(self):
        trader_id = self.kwargs["trader_id"]
        trader = get_object_or_404(User, id=trader_id, role="client")
        return trader

    def get_queryset(self):
        trader = self.get_trader()
        return ClientPaymentMethod.objects.filter(client=trader)

    def perform_update(self, serializer):
        trader = self.get_trader()
        obj = serializer.save()

        # Ensure the method still belongs to trader (extra safety)
        if obj.client_id != trader.id:
            raise PermissionError("Payment method does not belong to this trader.")

        # default handling
        if obj.is_default:
            ClientPaymentMethod.objects.filter(client=trader).exclude(id=obj.id).update(is_default=False)
            
class AdminCreateAffiliateProfileForTraderView(APIView):
    """
    POST /admin/traders/<uuid:trader_id>/affiliate-profile/
    Creates AffiliateProfile for a specific trader WITHOUT changing user.role.
    """
    permission_classes = [HasPermission]
    required_permissions = ['affiliates.manage']

    @transaction.atomic
    def post(self, request, trader_id):
        trader = get_object_or_404(User, id=trader_id)

        # optional strict guard: only allow for client users
        if trader.role != "client":
            return Response(
                {"detail": "Affiliate profile can only be created for users with role='client'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if AffiliateProfile.objects.filter(user=trader).exists():
            return Response(
                {"detail": "Affiliate profile already exists for this user."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AdminAffiliateProfileCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create profile (referral_code auto-generated if blank)
        affiliate_profile = AffiliateProfile.objects.create(
            user=trader,
            referral_code=serializer.validated_data.get("referral_code") or "",
            approved=serializer.validated_data.get("approved", False),
            website_url=serializer.validated_data.get("website_url"),
            promotion_strategy=serializer.validated_data.get("promotion_strategy", ""),
            manual_tier_override=serializer.validated_data.get("manual_tier_override"),
        )
        affiliate_profile.save()

        return Response(
            {
                "detail": "Affiliate profile created successfully.",
                "user_id": str(trader.id),
                "user_role": trader.role,  # unchanged
                "affiliate_profile": {
                    "id": str(affiliate_profile.id),
                    "referral_code": affiliate_profile.referral_code,
                    "approved": affiliate_profile.approved,
                    "website_url": affiliate_profile.website_url,
                    "promotion_strategy": affiliate_profile.promotion_strategy,
                    "manual_tier_override": str(affiliate_profile.manual_tier_override_id)
                    if affiliate_profile.manual_tier_override_id else None,
                    "created_at": affiliate_profile.created_at.isoformat() if affiliate_profile.created_at else None,
                    "updated_at": affiliate_profile.updated_at.isoformat() if affiliate_profile.updated_at else None,
                },
            },
            status=status.HTTP_201_CREATED
        )
        
@api_view(["GET"])
@permission_classes([HasPermission])
def admin_user_event_logs(request, user_id):
    """
    GET /admin/users/<uuid:user_id>/event-logs/

    Returns event logs:
    - Directly linked to the user (EventLog.user = user)
    - Linked to any of the user's challenge enrollments
      (EventLog.challenge_enrollment.client.user = user)

    Ensures no duplicates via distinct().
    Optional query params:
      - category=...
      - event_type=...
      - enrollment_id=<uuid>
    """
    user = get_object_or_404(User, id=user_id)

    qs = (
        EventLog.objects
        .filter(
            Q(user=user) |
            Q(challenge_enrollment__client__user=user)
        )
        .select_related("user", "challenge_enrollment")
        .order_by("-timestamp")
        .distinct()
    )

    # Optional filters
    category = request.query_params.get("category")
    if category:
        qs = qs.filter(category=category)

    event_type = request.query_params.get("event_type")
    if event_type:
        qs = qs.filter(event_type=event_type)

    enrollment_id = request.query_params.get("enrollment_id")
    if enrollment_id:
        qs = qs.filter(challenge_enrollment_id=enrollment_id)

    return Response(EventLogSerializer(qs, many=True).data, status=status.HTTP_200_OK)

admin_user_event_logs.cls.required_permissions = ['system.view_event_logs']

@api_view(["GET"])
@permission_classes([HasPermission])
def admin_user_wecoins_overview(request, user_id):
    """
    GET /admin/users/<uuid:user_id>/wecoins/

    Returns all WeCoins-related data for a specific user:
    - wallet
    - transactions
    - reward submissions (+task info)
    - redemptions (+item info)
    """
    user = get_object_or_404(User, id=user_id)

    wallet, _ = WeCoinWallet.objects.get_or_create(user=user)

    # Optional query params
    limit = int(request.query_params.get("limit", 200))  # cap lists
    tx_limit = min(limit, 500)

    # Transactions
    transactions_qs = (
        WeCoinTransaction.objects
        .filter(wallet=wallet)
        .order_by("-created_at")[:tx_limit]
    )
    transactions = [
        {
            "id": str(t.id),
            "type": t.type,
            "amount": float(t.amount),
            "description": t.description,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in transactions_qs
    ]

    # Reward submissions (+ task)
    submissions_qs = (
        RewardSubmission.objects
        .filter(user=user)
        .select_related("task", "reviewed_by")
        .order_by("-created_at")[:limit]
    )
    submissions = [
        {
            "id": str(s.id),
            "status": s.status,
            "notes": s.notes,
            "proof_url": s.proof_url,
            "proof_image": s.proof_image,
            "admin_comment": s.admin_comment,
            "reward_amount": float(s.reward_amount),
            "reviewed_by": s.reviewed_by.email if s.reviewed_by else None,
            "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "task": {
                "id": str(s.task.id) if s.task else None,
                "title": s.task.title if s.task else None,
                "status": s.task.status if s.task else None,
                "reward_amount": float(s.task.reward_amount) if s.task else 0.0,
                "requires_url_submission": bool(s.task.requires_url_submission) if s.task else False,
                "starts_at": s.task.starts_at.isoformat() if s.task and s.task.starts_at else None,
                "expires_at": s.task.expires_at.isoformat() if s.task and s.task.expires_at else None,
                "is_available": bool(s.task.is_available) if s.task else False,
            }
        }
        for s in submissions_qs
    ]

    # Redemptions (+ item)
    redemptions_qs = (
        Redemption.objects
        .filter(user=user)
        .select_related("item", "reviewed_by")
        .order_by("-created_at")[:limit]
    )
    redemptions = [
        {
            "id": str(r.id),
            "status": r.status,
            "admin_comment": r.admin_comment,
            "reviewed_by": r.reviewed_by.email if r.reviewed_by else None,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "delivery_data": r.delivery_data,
            "item": {
                "id": str(r.item.id) if r.item else None,
                "title": r.item.title if r.item else None,
                "category": r.item.category if r.item else None,
                "required_wecoins": float(r.item.required_wecoins) if r.item else 0.0,
                "stock_quantity": r.item.stock_quantity if r.item else 0,
                "max_per_user": r.item.max_per_user if r.item else 0,
                "is_active": bool(r.item.is_active) if r.item else False,
                "is_archived": bool(r.item.is_archived) if r.item else False,
                "starts_at": r.item.starts_at.isoformat() if r.item and r.item.starts_at else None,
                "expires_at": r.item.expires_at.isoformat() if r.item and r.item.expires_at else None,
                "is_available": bool(r.item.is_available) if r.item else False,
                "coupon_code": r.item.coupon_code if r.item else None,
                "addon_code": r.item.addon_code if r.item else None,
                "image_url": r.item.image_url if r.item else None,
            }
        }
        for r in redemptions_qs
    ]

    # Auto reward grants
    from wefund.models import AutoRewardGrant
    grants_qs = (
        AutoRewardGrant.objects
        .filter(user=user)
        .select_related("rule")
        .order_by("-granted_at")[:limit]
    )
    auto_rewards = [
        {
            "id": str(g.id),
            "granted_at": g.granted_at.isoformat() if g.granted_at else None,
            "rule": {
                "id": str(g.rule.id),
                "title": g.rule.title,
                "trigger_type": g.rule.trigger_type,
                "threshold": g.rule.threshold,
                "reward_amount": float(g.rule.reward_amount),
            }
        }
        for g in grants_qs
    ]

    return Response(
        {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.get_full_name(),
                "role": user.role,
                "status": user.status,
            },
            "wallet": {
                "id": str(wallet.id),
                "balance": float(wallet.balance),
            },
            "transactions": transactions,
            "reward_submissions": submissions,
            "redemptions": redemptions,
            "auto_rewards": auto_rewards,
        },
        status=status.HTTP_200_OK
    )

admin_user_wecoins_overview.cls.required_permissions = ['wecoins.view_ledger']


# ── Leaderboard Management (Admin) ──────────────────────────────

class AdminLeaderboardManagementView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['leaderboard.view']

    def get(self, request):

        visibility = request.query_params.get("visibility", "all")
        live_only = request.query_params.get("live_only", "false").lower() == "true"
        search = request.query_params.get("search", "").strip()

        qs = User.objects.filter(role="client", status="active").select_related("client_profile")

        if visibility == "hidden":
            qs = qs.filter(hidden_from_leaderboard=True)
        elif visibility == "visible":
            qs = qs.filter(hidden_from_leaderboard=False)

        if live_only:
            qs = qs.filter(
                client_profile__challenge_enrollments__status="live_in_progress",
                client_profile__challenge_enrollments__is_active=True,
            ).distinct()

        if search:
            qs = qs.filter(
                Q(email__icontains=search)
                | Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        qs = qs.order_by("-created_at")

        # Pagination
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 25))
        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page)

        rows = []
        for user in page_obj:
            has_live = ChallengeEnrollment.objects.filter(
                client=getattr(user, "client_profile", None),
                status="live_in_progress",
                is_active=True,
            ).exists() if getattr(user, "client_profile", None) else False

            rows.append({
                "user_id": str(user.id),
                "email": user.email,
                "full_name": user.get_full_name() or user.username,
                "leaderboard_display_name": user.leaderboard_display_name,
                "hidden_from_leaderboard": user.hidden_from_leaderboard,
                "has_live_account": has_live,
                "profile_picture": user.profile_picture or "",
            })

        # Stats
        total_clients = User.objects.filter(role="client", status="active").count()
        hidden_count = User.objects.filter(role="client", status="active", hidden_from_leaderboard=True).count()

        return Response({
            "stats": {
                "total": total_clients,
                "visible": total_clients - hidden_count,
                "hidden": hidden_count,
            },
            "total_pages": paginator.num_pages,
            "current_page": page,
            "total_results": paginator.count,
            "results": rows,
        })


class AdminLeaderboardTraderUpdateView(APIView):
    permission_classes = [HasPermission]
    required_permissions = ['leaderboard.manage']

    def patch(self, request, user_id):

        try:
            target_user = User.objects.get(id=user_id, role="client")
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=404)

        changed_fields = []

        if "hidden_from_leaderboard" in request.data:
            new_val = request.data["hidden_from_leaderboard"]
            if new_val != target_user.hidden_from_leaderboard:
                target_user.hidden_from_leaderboard = new_val
                changed_fields.append(f"hidden_from_leaderboard={'hidden' if new_val else 'visible'}")

        if "leaderboard_display_name" in request.data:
            new_name = request.data["leaderboard_display_name"] or None
            if new_name != target_user.leaderboard_display_name:
                target_user.leaderboard_display_name = new_name
                changed_fields.append(f"leaderboard_display_name={new_name or 'cleared'}")

        if changed_fields:
            target_user.save(update_fields=["hidden_from_leaderboard", "leaderboard_display_name", "updated_at"])
            log_event(
                event_type="leaderboard_visibility_update",
                user=request.user,
                category="admin",
                metadata={"changes": changed_fields, "target_email": target_user.email, "target_user_id": str(target_user.id)},
                description=f"Leaderboard visibility updated for {target_user.email}: {', '.join(changed_fields)}",
            )

        return Response({
            "detail": "Updated successfully",
            "user_id": str(target_user.id),
            "hidden_from_leaderboard": target_user.hidden_from_leaderboard,
            "leaderboard_display_name": target_user.leaderboard_display_name,
        })