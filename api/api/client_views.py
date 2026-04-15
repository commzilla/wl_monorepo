import os
import jwt
import json
from django.conf import settings
from django.utils import timezone
from django.utils.timezone import now
from rest_framework import views, viewsets, generics, filters, permissions, status
from rest_framework.views import APIView
from .serializers import ClientTokenObtainPairSerializer, ClientInitSerializer, UserProfileSettingsSerializer, PublicOfferSerializer, CertificateSerializer, EAApprovalRequestSerializer, GridChallengeEnrollmentSerializer, ClientTokenRefreshSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer, PasswordChangeSerializer, ClientRewardSubmissionSerializer, ClientRedeemItemSerializer, ClientRedemptionSerializer
from rest_framework.exceptions import PermissionDenied
from wefund.models import NotificationSettings, Offer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db.models import Sum, Max, F, ExpressionWrapper, DurationField, Count, F, Min
from django.db.models.functions import Now
from rest_framework.response import Response
from .serializers import ClientDashboardSerializer, LeaderboardEntrySerializer
from wefund.models import TraderPayout, ChallengeEnrollment, MT5Trade, EventLog, User, ChallengeEnrollment, ChallengePhase, Certificate, PayoutConfiguration, TraderPayout, Notification, AffiliateProfile, AffiliateReferral, AffiliateClick, AffiliateWalletTransaction, ClientPaymentMethod, EATradingBotRequest, MT5DailySnapshot, RewardTask, RewardSubmission, RedeemItem, Redemption, WeCoinWallet, BetaFeature, BetaFeatureAccess, Competition, CompetitionRegistration, CompetitionRankingSnapshot, ResetToken, ResetTokenConfig
from .services.mt5_client import MT5Client
from rest_framework.pagination import PageNumberPagination, LimitOffsetPagination
from .serializers import MyStatsSerializer, DailyPLSerializer, TradeHistorySerializer, WithdrawalSummarySerializer, TraderPayoutHistorySerializer, NotificationSerializer, AffiliateProfileSerializer, AffiliateReferralSerializer, AffiliatePayoutCreateSerializer, AffiliateWalletTransactionSerializer, ClientPaymentMethodSerializer, RewardTaskSerializer, RewardSubmissionSerializer, ClientRedemptionHistorySerializer, ClientWeCoinWalletSerializer, EligibleEnrollmentSerializer, ClientResetTokenSerializer, ResetTokenReadSerializer
from collections import defaultdict
import time
from datetime import datetime, timedelta, date
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.datastructures import MultiValueDictKeyError
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, DateFilter, CharFilter
from decimal import Decimal
import calendar
from .utils.bunnycdn import upload_to_bunnycdn
from .serializers import ChallengeEnrollmentSerializer
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives  # assuming you already use this
from django.template.loader import render_to_string
from rest_framework_simplejwt.views import TokenRefreshView
from django.db.models.functions import Coalesce
from django.db.models import DateTimeField
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from api.services.email_service import EmailService
from zoneinfo import ZoneInfo
from django.core.cache import cache
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken, TokenError
from django.contrib.auth import authenticate, update_session_auth_hash
from django.shortcuts import get_object_or_404
from wefund.mt5_controller.utils import fetch_user_balance
from django.db.models import Q
from wefund.mt5_controller.utils import fetch_user_balance, fetch_user_equity
from wefund.event_logger import log_event
from .serializers import RegistrationRequestSerializer, OTPVerificationSerializer, CompleteRegistrationSerializer, TraderCompetitionCardSerializer, TraderCompetitionDetailSerializer, ClientCompetitionLeaderboardTableSerializer
from .utils.currency import convert_to_usd
from .utils.competition_account import create_mt5_for_challenge_enrollment
from api.utils.time import now_gmt2_naive
from api.utils.payout_schedule import compute_next_withdrawal_datetime


class ClientLoginView(TokenObtainPairView):
    """
    POST: { username, password } -> { access, refresh, user_id, username, role }
    """
    serializer_class = ClientTokenObtainPairSerializer

class ClientTokenRefreshView(APIView):
    """
    POST: { "refresh": "<refresh_token>" }
    -> { access, refresh, user_id, username, role, full_name, profile_picture, created_at }
    """

    authentication_classes = []  # No auth, refresh is the auth
    permission_classes = []

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Validate refresh token
            refresh = RefreshToken(refresh_token)

            # Fetch user linked to this token
            user = User.objects.get(id=refresh["user_id"])

            # Generate new tokens
            access_token = str(refresh.access_token)
            new_refresh_token = str(refresh)  # rotated

            # Build full_name safely
            full_name = None
            if hasattr(user, "client_profile") and user.client_profile.address_info:
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
                else:
                    full_name = "WeFund User"

            return Response(
                {
                    "access": access_token,
                    "refresh": new_refresh_token,
                    "user_id": str(user.id),
                    "username": user.username,
                    "role": user.role,
                    "full_name": full_name,
                    "profile_picture": (
                        user.profile_picture
                        or "https://we-fund.b-cdn.net/img/default-avatar.svg"
                    ),
                    "created_at": user.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                },
                status=status.HTTP_200_OK,
            )

        except TokenError as e:
            return Response(
                {"error": "Invalid or expired refresh token.", "detail": str(e)},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except User.DoesNotExist:
            return Response(
                {"error": "User not found for this token."},
                status=status.HTTP_404_NOT_FOUND,
            )
        

class RegistrationRequestView(APIView):
    def post(self, request):
        serializer = RegistrationRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"detail": "OTP sent to your email."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OTPVerificationView(APIView):
    def post(self, request):
        serializer = OTPVerificationSerializer(data=request.data)
        if serializer.is_valid():
            return Response({"detail": "Email verified successfully."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CompleteRegistrationView(APIView):
    def post(self, request):
        serializer = CompleteRegistrationSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"detail": "Registration completed successfully."},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)        
    
class ClientDashboardInitView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        if not user.is_client():
            return Response({'detail': 'Not a client user'}, status=403)

        return Response(ClientInitSerializer(user).data, status=200)

    @transaction.atomic
    def post(self, request):
        """
        First-time name update: Save first/last name and log the event.
        """
        user = request.user
        if not user.is_client():
            return Response({'detail': 'Unauthorized'}, status=403)

        client_profile = getattr(user, 'client_profile', None)
        if client_profile is None or client_profile.first_login_completed:
            return Response({'detail': 'First login already completed or profile missing'}, status=400)

        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()

        if not first_name or not last_name:
            return Response({'detail': 'First and Last name required'}, status=400)

        # Capture before state
        before = {
            "first_name": user.first_name,
            "last_name": user.last_name,
        }

        # Update
        user.first_name = first_name
        user.last_name = last_name
        user.save(update_fields=["first_name", "last_name"])

        client_profile.first_login_completed = True
        client_profile.save(update_fields=["first_login_completed"])

        after = {
            "first_name": user.first_name,
            "last_name": user.last_name,
        }

        # Log event using standard system event format
        log_event(
            request=request,
            user=user,
            category="profile",
            event_type="name_updated",
            metadata={
                "before": before,
                "after": after
            },
            description=f"Client ({user.email}) updated first and last name during onboarding."
        )

        return Response({'detail': 'Name updated successfully'}, status=200)    

class ClientProfileSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        if not (user.is_client() or user.is_affiliate()):
            raise PermissionDenied("Only client or affiliate users can access this endpoint.")
        
        # ✅ Ensure NotificationSettings exists
        NotificationSettings.objects.get_or_create(user=user)
        
        return user

class PasswordChangeView(generics.UpdateAPIView):
    serializer_class = PasswordChangeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        if not (user.is_client() or user.is_affiliate()):
            raise PermissionDenied("Only client or affiliate users can access this endpoint.")
        return user

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check old password
        old_password = serializer.validated_data.get("old_password")
        if not user.check_password(old_password):
            # Log failed password attempt
            log_event(
                request=request,
                user=user,
                category="security",
                event_type="password_change",
                metadata={},
                description=f"User ({user.email}) attempted password change with incorrect old password."
            )
            return Response({"error": "Old password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        # Change password
        new_password = serializer.validated_data["new_password"]
        user.set_password(new_password)
        user.save()

        # Keep session alive
        update_session_auth_hash(request, user)

        # Log successful password change
        log_event(
            request=request,
            user=user,
            category="security",
            event_type="password_changed",
            metadata={},
            description=f"User ({user.email}) successfully changed password."
        )

        return Response({"message": "Password successfully changed."}, status=status.HTTP_200_OK)       
    
class ActiveOffersView(generics.GenericAPIView):
    """
    Returns both active and past offers for authenticated clients.
    - Active Offers: is_active=True, date within range
    - Past Offers: is_active=True but already ended OR invite-only offers
    """
    serializer_class = PublicOfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        if not user.is_client():
            raise PermissionDenied("Only client users can view active offers.")

        today = timezone.now().date()

        # --- Active Offers ---
        active_offers = Offer.objects.filter(
            is_active=True,
            start_date__lte=today,
            end_date__gte=today
        ).prefetch_related('coupons')

        # --- Past Offers (ended or invite-only) ---
        past_offers = Offer.objects.filter(
            is_active=True
        ).filter(
            end_date__lt=today
        ).prefetch_related('coupons')

        return Response({
            "active_offers": PublicOfferSerializer(active_offers, many=True).data,
            "past_offers": PublicOfferSerializer(past_offers, many=True).data
        })        

class ClientDashboardView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.is_client():
            raise PermissionDenied("Only client users can access the dashboard.")

        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)

        # --- Achievements ---
        payouts = TraderPayout.objects.filter(trader=user, status='approved')
        total_payout = payouts.aggregate(total=Sum('amount'))['total'] or 0
        highest_payout = payouts.aggregate(maxp=Max('amount'))['maxp'] or 0

        account_ids = [
            int(a) for a in ChallengeEnrollment.objects
            .filter(client__user=user, is_active=True)
            .exclude(mt5_account_id__isnull=True)
            .values_list('mt5_account_id', flat=True)
            if a.isdigit()
        ]
        best_trade = MT5Trade.objects.filter(account_id__in=account_ids)\
            .aggregate(best=Max('profit'))['best'] or 0

        durations = ChallengeEnrollment.objects.filter(
            client__user=user, is_active=True, live_start_date__isnull=False
        ).annotate(
            funded_time=ExpressionWrapper(
                now() - F('live_start_date'),
                output_field=DurationField()
            )
        )
        longest = durations.aggregate(maxd=Max('funded_time'))['maxd']
        longest_days = longest.days if longest else 0

        # --- Active Challenges ---
        active_enrolls = ChallengeEnrollment.objects.filter(client__user=user, is_active=True).select_related('challenge')
        challenges_data = []
        PHASE_ORDER = ['phase-1', 'phase-2', 'live-trader']

        for e in active_enrolls:
            # 1) steps & total_phases
            all_phases = list(e.challenge.phases.all())
            ordered = sorted(all_phases, key=lambda p: PHASE_ORDER.index(p.phase_type))
            steps = [{"name": p.get_phase_type_display()} for p in ordered]
            total_phases = len(steps)

            # 2) current phase config
            phase_map = {
                'phase_1_in_progress': 'phase-1',
                'phase_2_in_progress': 'phase-2',
                'live_in_progress': 'live-trader',
            }
            curr_type = phase_map.get(e.status)
            current_phase = next((p for p in ordered if p.phase_type == curr_type), None)
            current_phase_data = {
                "name": current_phase.get_phase_type_display(),
                "profit_target": float(current_phase.profit_target) if current_phase and current_phase.profit_target is not None else None,
                "max_daily_loss": float(current_phase.max_daily_loss) if current_phase else None,
                "max_loss": float(current_phase.max_loss) if current_phase else None,
                "trading_period": current_phase.trading_period if current_phase else None,
                "min_trading_days": current_phase.min_trading_days if current_phase else None,
            } if current_phase else {}

            # 3) metrics
            balance_info = mt5_client.get_account_balance(e.mt5_account_id) if e.mt5_account_id else {}
            current_balance = float(balance_info.get("balance", e.account_size) or e.account_size)
            account_size = float(e.account_size)

            # profit target
            pt_pct = float(current_phase.profit_target) if current_phase and current_phase.profit_target else 0.0
            pt_amt = account_size * (pt_pct/100)
            net_profit = current_balance - account_size
            pt_left = max(0, pt_amt - net_profit)

            # permitted loss
            ml_pct = float(current_phase.max_loss) if current_phase and current_phase.max_loss else 0.0
            ml_amt = account_size * (ml_pct/100)
            tot_loss = max(0, account_size - current_balance)
            perm_left = max(0, ml_amt - tot_loss)
            perm_used_pct = (tot_loss / ml_amt * 100) if ml_amt > 0 else 0

            # --- NEW Max Daily Loss Calculation ---
            today = now().date()
            snapshot = MT5DailySnapshot.objects.filter(
                enrollment=e,
                account_id=e.mt5_account_id,
                date=today
            ).first()

            start_equity = Decimal(snapshot.starting_equity) if snapshot and snapshot.starting_equity else Decimal(e.account_size)
            current_equity = fetch_user_equity(e.mt5_account_id) or Decimal(current_balance)

            mdl_pct = Decimal(current_phase.max_daily_loss) if current_phase and current_phase.max_daily_loss is not None else Decimal(0)
            mdl_amt = (start_equity * mdl_pct) / 100
            daily_loss = max(Decimal(0), start_equity - current_equity)
            daily_left = max(Decimal(0), mdl_amt - daily_loss)
            daily_used_pct = float((daily_loss / mdl_amt * 100) if mdl_amt > 0 else 0)

            # trading days
            trade_days = MT5Trade.objects.filter(account_id=e.mt5_account_id)\
                .dates('close_time', 'day').count() if e.mt5_account_id else 0

            # time left today
            now_time = now()
            midnight = (now_time + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            time_left = str(midnight - now_time).split('.')[0]
            traded_today = MT5Trade.objects.filter(
                account_id=e.mt5_account_id, close_time__date=now_time.date()
            ).exists() if e.mt5_account_id else False

            metrics = {
                "profit_target": {
                    "percentage": pt_pct,
                    "maximum": round(pt_amt, 2),
                    "left": round(pt_left, 2),
                },
                "max_daily_loss": {
                    "used_percentage": round(daily_used_pct, 2),
                    "maximum": float(mdl_amt),
                    "left": float(daily_left),
                    "percentage": float(mdl_pct),
                    "time_left_today": time_left if traded_today else None
                },
                "max_permitted_loss": {
                    "used_percentage": round(perm_used_pct, 2),
                    "maximum": round(ml_amt, 2),
                    "left": round(perm_left, 2),
                    "percentage": ml_pct
                },
                "trading_days": {
                    "required": current_phase.min_trading_days if current_phase and current_phase.min_trading_days else 0,
                    "completed": trade_days
                }
            }

            challenges_data.append({
                "name": e.challenge.name,
                "currency": e.currency,
                "step_type": e.challenge.get_step_type_display(),
                "status": e.get_status_display(),
                "total_phases": total_phases,
                "steps": steps,
                "current_phase": current_phase_data,
                "account_id": e.mt5_account_id,
                "platform": e.broker_type.upper() if e.broker_type else "MT5",
                "start_date": e.start_date,
                "credentials": {
                    "login": e.mt5_account_id,
                    "password": e.mt5_password,
                    "server": "Wefund Markets Ltd"
                },
                "metrics": metrics
            })

        # --- Top Traders ---
        top_traders = []
        clients = User.objects.filter(role='client', status='active')
        for c in clients:
            eq = (ChallengeEnrollment.objects.filter(client__user=c, is_active=True)
                  .aggregate(total=Sum('account_size'))['total'] or 0)
            paid = (TraderPayout.objects.filter(trader=c, status='paid')
                    .aggregate(total=Sum('amount'))['total'] or 0)
            tot = eq + paid
            growth = ((tot - eq)/eq*100) if eq > 0 else 0
            pic = c.profile_picture if c.profile_picture else "https://we-fund.b-cdn.net/img/default-avatar.svg"
            top_traders.append({
                "trader": c.get_full_name() or c.username,
                "profile_picture": pic,
                "starting_balance": float(eq),
                "total_paid": float(tot),
                "equity_growth": round(growth, 2)
            })
        top_traders = sorted(top_traders, key=lambda x: x['total_paid'], reverse=True)[:10]
        for idx, t in enumerate(top_traders):
            t["place"] = idx + 1

        return Response({
            "achievements": {
                "total_payout": total_payout,
                "highest_payout": highest_payout,
                "best_trade": best_trade,
                "longest_funded_days": longest_days,
            },
            "active_challenges": {
                "count": active_enrolls.count(),
                "list": challenges_data,
            },
            "top_traders": top_traders,
        })
        
class LeaderboardPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class LeaderboardView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LeaderboardEntrySerializer
    pagination_class = LeaderboardPagination

    def get(self, request, *args, **kwargs):
        clients = User.objects.filter(
            role='client',
            status='active',
            hidden_from_leaderboard=False,
            client_profile__challenge_enrollments__status='live_in_progress',
            client_profile__challenge_enrollments__is_active=True
        ).distinct()

        entries = []
        for client in clients:
            live_enrollments = ChallengeEnrollment.objects.filter(
                client=client.client_profile,
                status='live_in_progress',
                is_active=True
            )

            equity = live_enrollments.aggregate(total=Sum('account_size'))['total'] or 0

            profit_paid = (
                TraderPayout.objects
                .filter(trader=client, status='approved')
                .aggregate(total=Sum('profit'))['total'] or 0
            )

            # ✅ Net Profit = equity growth + payouts
            profit = equity + profit_paid
            growth_pct = ((profit - equity) / equity * 100) if equity > 0 else 0

            account_ids = [
                int(acc_id) for acc_id in live_enrollments
                .exclude(mt5_account_id__isnull=True)
                .exclude(mt5_account_id='')
                .values_list('mt5_account_id', flat=True)
                if str(acc_id).isdigit()
            ]

            trades = MT5Trade.objects.filter(account_id__in=account_ids)
            total_trades = trades.count()
            won_trades = trades.filter(profit__gt=0).count()
            won_pct = (won_trades / total_trades * 100) if total_trades > 0 else 0

            entries.append({
                'username': client.get_leaderboard_name(),
                "profile_picture": client.profile_picture or "https://we-fund.b-cdn.net/img/default-avatar.svg",
                'equity': equity,
                'profit': profit,
                'growth_percentage': round(growth_pct, 2),
                'won_trade_percent': round(won_pct, 2),
            })

        # ✅ Sort by growth % (not profit)
        entries.sort(key=lambda x: x['growth_percentage'], reverse=True)
        for idx, e in enumerate(entries):
            e['place'] = idx + 1

        page = self.paginate_queryset(entries)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)


    
class MyStatsPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class MyStatsView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MyStatsSerializer
    pagination_class = MyStatsPagination

    def get(self, request, *args, **kwargs):
        user = request.user
        if not user.is_client():
            return Response({"detail": "Only clients may view stats."}, status=403)

        # Get all active enrollments with MT5 accounts
        enroll_qs = ChallengeEnrollment.objects.filter(
            client__user=user
        ).exclude(mt5_account_id__isnull=True)

        if not enroll_qs.exists():
            return Response({"detail": "No active challenge accounts found."}, status=404)

        # Pick specific enrollment from query param if provided
        enroll_param = (
        request.query_params.get("enrollment")
        or request.query_params.get("enrollment_id")
    )
        if enroll_param:
            try:
                enrollment = enroll_qs.get(pk=enroll_param)
            except ChallengeEnrollment.DoesNotExist:
                return Response(
                    {"detail": f"Enrollment {enroll_param} not found or inactive."},
                    status=400
                )
        else:
            enrollment = enroll_qs.first()

        account_id = enrollment.mt5_account_id

        # For dropdown toggle on frontend
        available_enrollments = [
            {
                "enrollment_id": e.pk,
                "account_id": e.mt5_account_id,
                "challenge_name": getattr(e.challenge, "name", None),
                "account_size": e.account_size,
                "currency": e.currency,
            }
            for e in enroll_qs
        ]

        # All trades for the selected account
        trades_qs = MT5Trade.objects.filter(account_id=account_id).order_by('-close_time')

        # === Start statistics calculations ===
        # Starting balance from ChallengeEnrollment
        starting_balance = enrollment.account_size or 0

        # Current balance fetched live from MT5, fallback to local calculation
        live_balance = fetch_user_balance(account_id)
        if live_balance is not None:
            current_balance = float(live_balance)
        else:
            total_pnl = float(trades_qs.filter(is_closed=True).aggregate(s=Sum('profit'))['s'] or 0)
            current_balance = float(starting_balance) + total_pnl

        # True Net PnL = current balance - starting balance
        net_pnl = current_balance - float(starting_balance)

        wins = trades_qs.filter(profit__gt=0)
        losses = trades_qs.filter(profit__lt=0)
        total_winners = wins.aggregate(total=Sum('profit'))['total'] or 0
        total_losers = losses.aggregate(total=Sum('profit'))['total'] or 0  # negative number

        win_count = wins.count()
        loss_count = losses.count()
        total_trades = win_count + loss_count

        win_rate = (win_count / total_trades * 100) if total_trades else 0

        avg_win = (total_winners / win_count) if win_count else 0
        avg_loss = (total_losers / loss_count) if loss_count else 0  # negative
        avg_rr = (avg_win / abs(avg_loss)) if (avg_win and avg_loss) else 0

        profit_factor = (total_winners / abs(total_losers)) if (total_winners and total_losers) else 0

        best_win = wins.aggregate(maxp=Max('profit'))['maxp'] or 0
        worst_loss = losses.aggregate(minp=Min('profit'))['minp'] or 0

        # Streaks
        by_day = trades_qs.values('close_time__date').annotate(day_win=Sum('profit')).order_by('close_time__date')
        max_win_streak = max_loss_streak = 0
        cur_win = cur_loss = 0
        for rec in by_day:
            val = rec['day_win']
            if val > 0:
                cur_win += 1
                max_win_streak = max(max_win_streak, cur_win)
                cur_loss = 0
            elif val < 0:
                cur_loss += 1
                max_loss_streak = max(max_loss_streak, cur_loss)
                cur_win = 0
            else:
                cur_win = cur_loss = 0

        # Daily P&L
        daily = []
        for rec in by_day:
            date = rec['close_time__date']
            profit = rec['day_win'] or 0
            day_trades = MT5Trade.objects.filter(account_id=account_id, close_time__date=date)
            lots = day_trades.aggregate(total=Sum('volume'))['total'] or 0
            daily.append({
                "date": date,
                "profit": profit,
                "trades": day_trades.count(),
                "lots": lots
            })

        best_day = {"date": None, "profit": 0}
        worst_day = {"date": None, "profit": 0}
        for rec in daily:
            if rec['profit'] > best_day['profit']:
                best_day = {"date": rec['date'], "profit": rec['profit']}
            if rec['profit'] < worst_day['profit']:
                worst_day = {"date": rec['date'], "profit": rec['profit']}

        # Trade history (paginated)
        page = self.paginate_queryset(trades_qs)
        history_ser = TradeHistorySerializer(page, many=True)

        # Final output
        out = {
            "selected_enrollment": {
                "enrollment_id": enrollment.pk,
                "account_id": account_id,
                "challenge_name": getattr(enrollment.challenge, "name", None),
                "account_size": enrollment.account_size,
                "currency": enrollment.currency,
            },
            "available_enrollments": available_enrollments,

            "net_pnl": net_pnl,
            "win_rate": round(win_rate, 2),
            "avg_rr": round(avg_rr * 100, 2),           # as %
            "profit_factor": round(profit_factor, 2),

            "total_winners": total_winners,
            "best_win": best_day['profit'] if best_day['profit'] > 0 else best_win,
            "avg_win": round(avg_win, 2),
            "max_win_streak": max_win_streak,

            "total_losers": total_losers,
            "worst_loss": worst_day['profit'] if worst_day['profit'] < 0 else worst_loss,
            "avg_loss": round(avg_loss, 2),
            "max_loss_streak": max_loss_streak,

            "pnl_daily": DailyPLSerializer(daily, many=True).data,
            "best_day": best_day,
            "worst_day": worst_day,

            "trade_history": history_ser.data,
        }

        return self.get_paginated_response(out)

class MonthlyPnlSummaryView(APIView):
    """
    GET /api/client/<account_id>/daily-summary/?month=YYYY-MM
    Response: for each day in that month, total closed-trade profit.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, account_id):
        # 1) Validate enrollment belongs to user
        try:
            ChallengeEnrollment.objects.get(
                client__user=request.user,
                mt5_account_id=str(account_id),
                is_active=True
            )
        except ChallengeEnrollment.DoesNotExist:
            return Response({"detail": "No active enrollment for that account."},
                            status=status.HTTP_404_NOT_FOUND)

        # 2) Parse ?month=YYYY-MM
        month_str = request.query_params.get("month")
        if not month_str:
            return Response({"detail": "month=YYYY-MM is required"},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            year, month = map(int, month_str.split("-"))
            _, last_day = calendar.monthrange(year, month)
        except Exception:
            return Response({"detail": "Invalid month format. Use YYYY-MM."},
                            status=status.HTTP_400_BAD_REQUEST)

        start_date = date(year, month, 1)
        end_date   = date(year, month, last_day)

        # 3) Query DB trades
        trades = MT5Trade.objects.filter(
            account_id=account_id,
            close_time__date__gte=start_date,
            close_time__date__lte=end_date
        )

        # 4) Aggregate daily profits
        summary = { (start_date + timedelta(days=i)): {"profit": 0.0} for i in range(last_day) }

        for t in trades:
            d = t.close_time.date()
            summary[d]["profit"] += float(t.profit)

        # 5) Format response
        days = [
            {"date": d.isoformat(), "profit": round(info["profit"], 2)}
            for d, info in sorted(summary.items())
        ]

        return Response({
            "account_id": int(account_id),
            "year": year,
            "month": month,
            "days": days
        })


class DailyPnlDetailView(APIView):
    """
    GET /api/client/<account_id>/daily-summary/<YYYY-MM-DD>/
    Response: total profit, count, lots, plus a simple PnL-over-time series for that day.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, account_id, day):
        # 1) Validate enrollment
        try:
            ChallengeEnrollment.objects.get(
                client__user=request.user,
                mt5_account_id=str(account_id),
                is_active=True
            )
        except ChallengeEnrollment.DoesNotExist:
            return Response({"detail": "No active enrollment for that account."},
                            status=status.HTTP_404_NOT_FOUND)

        # 2) Parse date
        try:
            target = datetime.strptime(day, "%Y-%m-%d").date()
        except ValueError:
            return Response({"detail": "Invalid date. Use YYYY-MM-DD."},
                            status=status.HTTP_400_BAD_REQUEST)

        # 3) Fetch trades for that day
        trades = MT5Trade.objects.filter(
            account_id=account_id,
            close_time__date=target
        ).order_by("close_time")

        total_profit = 0.0
        total_lots   = 0.0
        count        = trades.count()

        pnl_points = []
        cum_pnl = 0.0

        for t in trades:
            profit = float(t.profit)
            volume = float(t.volume)  # already in lots in your model

            total_profit += profit
            total_lots   += volume

            cum_pnl += profit
            pnl_points.append({
                "time": t.close_time.strftime("%H:%M"),
                "pnl": round(cum_pnl, 2)
            })

        return Response({
            "account_id": int(account_id),
            "date": day,
            "profit": round(total_profit, 2),
            "trade_count": count,
            "lots": round(total_lots, 2),
            "pnl_chart": pnl_points
        })

class OpenTradePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

def make_naive(dt):
    """Strip tzinfo from datetime, keep the exact timestamp."""
    if dt is None:
        return None
    return dt.replace(tzinfo=None)

class OpenTradesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            account_id = int(request.query_params["account_id"])
        except (MultiValueDictKeyError, ValueError):
            return Response({"error": "Valid account_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        symbol = request.query_params.get("symbol")
        min_profit = request.query_params.get("min_profit")
        max_profit = request.query_params.get("max_profit")
        sort_by = request.query_params.get("sort_by")  # profit, volume, open_price, open_time
        sort_order = request.query_params.get("sort_order", "desc")

        client = MT5Client(api_url=settings.MT5_API_URL, api_key=settings.MT5_API_KEY)
        trades = client.get_open_trades(account_id)

        if isinstance(trades, dict) and trades.get("error"):
            return Response(trades, status=status.HTTP_502_BAD_GATEWAY)

        # Filtering
        if symbol:
            trades = [t for t in trades if t.get("symbol", "").lower() == symbol.lower()]

        if min_profit:
            try:
                min_profit_val = float(min_profit)
                trades = [t for t in trades if float(t.get("profit", 0)) >= min_profit_val]
            except ValueError:
                pass

        if max_profit:
            try:
                max_profit_val = float(max_profit)
                trades = [t for t in trades if float(t.get("profit", 0)) <= max_profit_val]
            except ValueError:
                pass

        # Sorting
        valid_sort_fields = {"profit", "volume", "open_price", "open_time"}
        if sort_by in valid_sort_fields:
            reverse = sort_order != "asc"

            def sort_key(t):
                if sort_by == "open_time":
                    return int(t.get("open_time", 0))
                if sort_by == "volume":
                    # sort using scaled lots
                    return float(t.get("volume", 0)) / 10000.0
                return float(t.get(sort_by, 0))

            trades.sort(key=sort_key, reverse=reverse)

        # Transform trades: scale volume and convert open_time
        for t in trades:
            # Scale volume to lots
            volume = float(t.get("volume", 0)) / 10000.0
            t["volume"] = f"{volume:.2f}"

            # Convert open_time to naive datetime (exact MT5 timestamp)
            open_time_val = t.get("open_time")
            if open_time_val:
                try:
                    dt = datetime.fromtimestamp(int(open_time_val))
                    t["open_time"] = make_naive(dt).strftime("%Y-%m-%d %H:%M:%S")
                except Exception:
                    t["open_time"] = str(open_time_val)

        # Paginate
        paginator = OpenTradePagination()
        paginated = paginator.paginate_queryset(trades, request)
        return paginator.get_paginated_response(paginated)
    
class IsClient(permissions.BasePermission):
    """
    Allows access only to users with role='client'.
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'client'
        )

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50

class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    list:
    Return a paginated list of the authenticated client's certificates.

    retrieve:
    Return the details of a single certificate belonging to the client.
    """
    serializer_class = CertificateSerializer
    permission_classes = [permissions.IsAuthenticated, IsClient]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        # Return only certificates owned by the requesting user
        return Certificate.objects.filter(user=self.request.user).order_by('-issued_date')
    
class WithdrawalAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsClient]

    def _get_policy_numbers(self, config, enrollment):
        # ✅ explicit None check, so 0 is respected
        if config.config_type == "custom":
            first_delay = config.first_payout_delay_days if config.first_payout_delay_days is not None else 0
            sub_days    = config.subsequent_cycle_days if config.subsequent_cycle_days is not None else 14
            min_net     = config.min_net_amount if config.min_net_amount is not None else Decimal("50.00")
            base_share  = config.base_share_percent if config.base_share_percent is not None else Decimal("80.00")
            return int(first_delay), int(sub_days), Decimal(min_net), Decimal(base_share)

        policy = getattr(enrollment.challenge, "payout_policy", None)
        if policy:
            first_delay = policy.first_payout_delay_days or 0
            sub_days    = policy.subsequent_cycle_days or 14
            min_net     = policy.min_net_amount or Decimal("50.00")
            base_share  = policy.base_share_percent or Decimal("80.00")
        else:
            first_delay, sub_days, min_net, base_share = 0, 14, Decimal("50.00"), Decimal("80.00")

        return int(first_delay), int(sub_days), Decimal(min_net), Decimal(base_share)

    def _last_cycle_anchor(self, enrollment) -> date | None:
        """
        Last payout milestone for this enrollment only.
        """
        qs = (
            enrollment.payouts
            .filter(status__in=["pending", "approved", "paid", "rejected"])  # now includes pending
            .annotate(anchor_at=Coalesce('paid_at', 'reviewed_at', 'requested_at', output_field=DateTimeField()))
            .order_by('-anchor_at')
        )
        last = qs.first()
        if not last:
            return None
        dt = last.paid_at or last.reviewed_at or last.requested_at
        return dt.date() if hasattr(dt, "date") else dt

    def _next_monthly_on_day(self, earliest: date, target_day: int) -> date:
        """
        Next occurrence of target_day >= earliest.
        """
        y, m = earliest.year, earliest.month

        def days_in_month(year, month):
            if month == 12:
                nxt = date(year + 1, 1, 1)
            else:
                nxt = date(year, month + 1, 1)
            return (nxt - date(year, month, 1)).days

        while True:
            dim = days_in_month(y, m)
            d = min(target_day, dim)
            candidate = date(y, m, d)
            if candidate >= earliest:
                return candidate
            if m == 12:
                y, m = y + 1, 1
            else:
                m += 1

    def _next_custom_days(self, earliest: date, days_list: list[int]) -> date:
        today = timezone.now().date()
        base = max(today, earliest)
        y, m = base.year, base.month

        def days_in_month(year, month):
            if month == 12:
                nxt = date(year + 1, 1, 1)
            else:
                nxt = date(year, month + 1, 1)
            return (nxt - date(year, month, 1)).days

        while True:
            dim = days_in_month(y, m)
            candidates = []
            for d in sorted(days_list):
                if d < 1:
                    continue
                candidates.append(date(y, m, min(d, dim)))
            candidates = [c for c in candidates if c >= base]
            if candidates:
                return min(candidates)
            if m == 12:
                y, m = y + 1, 1
            else:
                m += 1
            base = date(y, m, 1)

    def _compute_next_withdrawal_date(self, config, enrollment) -> date:
        # If admin set a manual override, ALWAYS use it
        if config.custom_next_withdrawal_datetime:
            return config.custom_next_withdrawal_datetime.date()

        first_delay, subsequent_days, _, _ = self._get_policy_numbers(config, enrollment)
        start = config.live_trading_start_date
        first_eligible = start + timedelta(days=first_delay)
        last_anchor = self._last_cycle_anchor(enrollment)

        # No previous payout → first eligible date
        if not last_anchor:
            return first_eligible

        # Normal automatic cycle logic
        cycle = subsequent_days or 14
        return last_anchor + timedelta(days=cycle)


    def _resolve_share_percent(self, config, enrollment) -> Decimal:
        """
        Use explicit profit_share_percent if present, else challenge policy tier.
        """
        if config.profit_share_percent is not None:
            return Decimal(config.profit_share_percent)
        policy = getattr(enrollment.challenge, "payout_policy", None)
        if policy:
            num_prev = enrollment.payouts.filter(status__in=["approved", "paid"]).count()
            return Decimal(policy.get_share_for(num_prev + 1))
        return Decimal("0")

    def get(self, request):
        user = request.user
        enrollments = user.client_profile.challenge_enrollments.filter(
            status="live_in_progress",
            mt5_account_id__isnull=False
        )
        if not enrollments.exists():
            return Response({"status": "not_eligible", "message": "No funded accounts found.", "accounts": []})

        mt5 = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        accounts_data = []

        for enroll in enrollments:
            bal_resp = mt5.get_account_balance(enroll.mt5_account_id)

            if not bal_resp or bal_resp.get("error") or "balance" not in bal_resp:
                accounts_data.append({
                    "enrollment_id": str(enroll.id),
                    "account": enroll.mt5_account_id,
                    "status": "error",
                    "message": f"Unable to fetch MT5 balance. Response: {bal_resp}"
                })
                continue

            balance = Decimal(str(bal_resp["balance"]))

            profit = balance - enroll.account_size

            config = getattr(enroll, "payout_config", None)
            if not config:
                accounts_data.append({"enrollment_id": str(enroll.id), "account": enroll.mt5_account_id,
                                      "status": "not_eligible", "message": "No payout config set."})
                continue

            first_delay, subsequent_days, min_net, _ = self._get_policy_numbers(config, enroll)
            share_percent = self._resolve_share_percent(config, enroll)
            trader_share = (profit * (share_percent / 100)).quantize(Decimal("0.01"))
            next_date = self._compute_next_withdrawal_date(config, enroll)

            today = timezone.now().date()
            status_flag = "eligible"
            messages = []

            if today < next_date:
                status_flag = "not_eligible"
                messages.append(f"Next payout window opens on {next_date.isoformat()}.")
            if trader_share < min_net:
                status_flag = "not_eligible"
                messages.append(f"Minimum net amount after split is {min_net}. Your current share is {trader_share}.")

            # Resolve min trading days: config override → policy → 0
            policy_obj = getattr(enroll.challenge, "payout_policy", None)
            min_td = 0
            if config.config_type == "custom" and config.min_trading_days is not None:
                min_td = config.min_trading_days
            elif policy_obj and policy_obj.min_trading_days:
                min_td = policy_obj.min_trading_days

            current_trading_days = (
                MT5Trade.objects.filter(account_id=enroll.mt5_account_id)
                .values("open_time__date")
                .distinct()
                .count()
            ) if min_td > 0 else 0

            if min_td > 0 and current_trading_days < min_td:
                status_flag = "not_eligible"
                messages.append(f"Minimum {min_td} trading days required. You have {current_trading_days}.")

            accounts_data.append({
                "enrollment_id": str(enroll.id),
                "account_id": enroll.mt5_account_id,
                "currency": enroll.currency,
                "current_balance": float(balance),
                "profit": float(profit),
                "profit_share_percent": float(share_percent),
                "trader_share": float(trader_share),
                "next_withdrawal_date": next_date,
                "payment_cycle": config.payment_cycle,
                "first_payout_delay_days": first_delay,
                "subsequent_cycle_days": subsequent_days,
                "min_net_amount": float(min_net),
                "min_trading_days": min_td,
                "current_trading_days": current_trading_days,
                "status": status_flag,
                "message": " ".join(messages) or "Eligible",
            })

        return Response({"accounts": accounts_data})


class PayoutHistoryByAccountView(APIView):
    """
    GET payout history for a specific MT5 account (ChallengeEnrollment).
    Only accessible by the account owner.
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request, mt5_account_id):
        user = request.user
        # --- Validate client role ---
        if not hasattr(user, "client_profile"):
            return Response(
                {"detail": "Only clients can view payout history."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # --- Locate the enrollment safely ---
        enrollment = get_object_or_404(
            ChallengeEnrollment,
            mt5_account_id=mt5_account_id,
            client=user.client_profile
        )

        # --- Fetch payouts for this enrollment ---
        payouts_qs = TraderPayout.objects.filter(
            trader=user,
            challenge_enrollment=enrollment
        ).order_by("-requested_at")

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(payouts_qs, request, view=self)
        serializer = TraderPayoutHistorySerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)

class TradingResultView(APIView):
    """
    Returns trading results for the logged-in client using MT5DailySnapshot.
    Builds chart data from snapshots and fetches real-time equity (best-effort).
    Also returns dynamic Daily Loss Limit + Max Trailing Drawdown based on CURRENT equity.
    """
    permission_classes = [permissions.IsAuthenticated, IsClient]

    PHASE_MAP = {
        'phase_1_in_progress': 'phase-1',
        'phase_1_passed':      'phase-1',
        'phase_2_in_progress': 'phase-2',
        'phase_2_passed':      'phase-2',
        'live_in_progress':    'live-trader',
        'completed':           'live-trader',
        'failed':              'live-trader',
    }

    def _to_float(self, v, default=0.0):
        try:
            return float(v)
        except (TypeError, ValueError):
            return float(default)

    def _get_fallback_equity_from_snapshots(self, qs):
        last_snap = qs.last()
        last_value = (
            last_snap.ending_equity
            or last_snap.ending_balance
            or last_snap.starting_equity
            or last_snap.starting_balance
            or 0
        )
        return self._to_float(last_value, 0.0)

    def _get_live_equity(self, account_id, fallback_equity):
        """
        Best-effort MT5 equity fetch. If it fails, returns fallback_equity.
        """
        equity_today = fallback_equity
        try:
            mt5 = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
            acct_resp = mt5.get_account_balance(int(account_id))
            # Expected: {"equity": ..., "balance": ...} etc.
            if isinstance(acct_resp, dict) and acct_resp.get("equity") is not None:
                equity_today = self._to_float(acct_resp["equity"], fallback_equity)
        except Exception:
            pass
        return equity_today

    def get(self, request):
        account_id = request.query_params.get("account_id")
        if not account_id:
            return Response({"detail": "account_id is required."},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            enroll = ChallengeEnrollment.objects.get(
                client__user=request.user,
                is_active=True,
                mt5_account_id=account_id,
            )
        except ChallengeEnrollment.DoesNotExist:
            return Response({"detail": "No active enrollment for that account."},
                            status=status.HTTP_404_NOT_FOUND)

        # Determine phase
        phase_type = self.PHASE_MAP.get(enroll.status)
        try:
            phase = ChallengePhase.objects.get(
                challenge=enroll.challenge,
                phase_type=phase_type
            )
        except ChallengePhase.DoesNotExist:
            return Response({"detail": f"No ChallengePhase for {phase_type}."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Pull snapshots
        qs = enroll.daily_snapshots.order_by("date")
        if not qs.exists():
            return Response({"detail": "No trading snapshots available."},
                            status=status.HTTP_404_NOT_FOUND)

        # Chart data (balance series)
        data = []
        for snap in qs:
            bal = snap.ending_balance or snap.starting_balance
            data.append({"date": snap.date.isoformat(), "balance": self._to_float(bal, 0)})

        start_balance = self._to_float(qs.first().starting_balance, 0)

        # Equity today: snapshot fallback -> MT5 best-effort
        fallback_equity = self._get_fallback_equity_from_snapshots(qs)
        equity_today = self._get_live_equity(account_id, fallback_equity)

        # Percent values
        max_daily_loss_pct = self._to_float(phase.max_daily_loss, 0) / 100.0   # e.g. 4% => 0.04
        max_loss_pct = self._to_float(phase.max_loss, 0) / 100.0               # e.g. 8% => 0.08

        # === Dynamic limits based on CURRENT equity (as requested) ===
        daily_loss_limit_amount = equity_today * max_daily_loss_pct
        daily_loss_floor = equity_today - daily_loss_limit_amount

        trailing_drawdown_limit_amount = equity_today * max_loss_pct
        trailing_drawdown_floor = equity_today - trailing_drawdown_limit_amount

        # Profit target line (kept as-is: based on starting balance + profit_target)
        profit_target_line = start_balance + self._to_float(phase.profit_target, 0)

        return Response({
            "account_id": account_id,
            "start_date": qs.first().date.isoformat(),
            "end_date": qs.last().date.isoformat(),
            "starting_balance": round(start_balance, 2),

            "equity_today": round(equity_today, 2),

            # Profit target
            "profit_target_line": round(profit_target_line, 2),

            # Existing field (keep for frontend compatibility)
            "max_daily_loss_pct": max_daily_loss_pct,

            # NEW: Daily Loss Limit (dynamic, based on current equity)
            "daily_loss_limit_pct": max_daily_loss_pct,
            "daily_loss_limit_amount": round(daily_loss_limit_amount, 2),
            "daily_loss_floor": round(daily_loss_floor, 2),

            # NEW: Max Trailing Drawdown (dynamic, based on current equity)
            "max_trailing_drawdown_pct": max_loss_pct,
            "max_trailing_drawdown_amount": round(trailing_drawdown_limit_amount, 2),
            "max_trailing_drawdown_floor": round(trailing_drawdown_floor, 2),

            "data": data,
        })
    
class ClientNotificationListView(generics.ListAPIView):
    """
    List active (non-expired) notifications for the logged-in client user.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        now = timezone.now()
        # Step 1: Only notifications for the user
        queryset = Notification.objects.filter(user=self.request.user)

        # Step 2: Exclude expired ones
        queryset = queryset.exclude(expires_at__lte=now)

        return queryset.order_by('-created_at')


class ClientNotificationDetailView(generics.RetrieveAPIView):
    """
    Retrieve single notification details.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class MarkNotificationReadView(APIView):
    """
    Mark a specific notification as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(id=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Notification not found'}, status=404)

        if not notification.is_read:
            notification.mark_as_read()

        return Response({'detail': 'Notification marked as read'})


class ClientNotificationDeleteView(APIView):
    """
    Soft delete (hide) a notification by marking it as expired for the client.
    Instead of deleting from DB, we set expires_at = now().
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            notification = Notification.objects.get(id=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({'detail': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

        # Soft delete: mark as expired
        notification.expires_at = timezone.now()
        notification.save(update_fields=['expires_at'])

        return Response({'detail': 'Notification hidden successfully'}, status=status.HTTP_200_OK)

def generate_referral_code(user_id):
    return f"WEF{10000 + int(str(user_id.int)[-6:])}"
    
class AffiliateProfileView(APIView):
    """
    GET: Return affiliate profile if exists
    POST: Create new affiliate profile
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            profile = user.affiliate_profile
            return Response(AffiliateProfileSerializer(profile).data)
        except AffiliateProfile.DoesNotExist:
            return Response({'detail': 'Affiliate profile not found'}, status=404)

    def post(self, request):
        user = request.user

        if hasattr(user, 'affiliate_profile'):
            return Response({'detail': 'Affiliate profile already exists'}, status=400)

        website_url = request.data.get('website_url')
        promotion_strategy = request.data.get('promotion_strategy')

        if not promotion_strategy:
            return Response({'promotion_strategy': 'This field is required.'}, status=400)

        referral_code = generate_referral_code(user.id)

        with transaction.atomic():
            profile = AffiliateProfile.objects.create(
                user=user,
                referral_code=referral_code,
                website_url=website_url,
                promotion_strategy=promotion_strategy,
                approved=False  # can be auto-approved if needed
            )

        log_event(
            request=request,
            user=user,
            category="affiliate",
            event_type="affiliate_registered",
            metadata={
                "referral_code": referral_code,
                "website_url": website_url,
                "promotion_strategy": promotion_strategy
            },
            description=f"User ({user.email}) created an affiliate profile."
        )    

        return Response(AffiliateProfileSerializer(profile).data, status=201)


class AffiliateReferralListView(generics.ListAPIView):
    serializer_class = AffiliateReferralSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['referred_user__email', 'challenge_name', 'note']
    ordering_fields = ['date_referred', 'commission_amount']
    ordering = ['-date_referred']
    filterset_fields = ['commission_status']  # filter by status directly

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, 'affiliate_profile', None)
        if not profile:
            return AffiliateReferral.objects.none()

        qs = AffiliateReferral.objects.filter(affiliate=profile)

        # Optional: Date range filter
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            qs = qs.filter(date_referred__gte=start_date)
        if end_date:
            qs = qs.filter(date_referred__lte=end_date)

        return qs
    
class AffiliateWalletTransactionFilter(FilterSet):
    created_at__gte = DateFilter(field_name="created_at", lookup_expr='gte')
    created_at__lte = DateFilter(field_name="created_at", lookup_expr='lte')
    transaction_type = CharFilter(field_name="transaction_type", lookup_expr='iexact', required=False)
    status = CharFilter(field_name="status", lookup_expr='iexact', required=False)

    class Meta:
        model = AffiliateWalletTransaction
        fields = ['transaction_type', 'status', 'created_at__gte', 'created_at__lte']


class AffiliateWalletTransactionListView(generics.ListAPIView):
    """
    Lists wallet transactions for the logged-in affiliate with filtering, pagination, and date range support.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AffiliateWalletTransactionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = AffiliateWalletTransactionFilter

    def get_queryset(self):
        user = self.request.user
        print(f"[DEBUG] Authenticated user: {user.email}")

        # Check if the user has an affiliate profile
        affiliate_profile = getattr(user, 'affiliate_profile', None)
        print(f"[DEBUG] Found affiliate_profile: {affiliate_profile}")

        if not affiliate_profile:
            print("[DEBUG] User is not an affiliate.")
            return AffiliateWalletTransaction.objects.none()

        # Correct way to get wallet from user, not from affiliate_profile
        wallet = getattr(user, 'affiliate_wallet', None)
        if not wallet:
            print("[DEBUG] Wallet not found for user.")
            return AffiliateWalletTransaction.objects.none()

        print(f"[DEBUG] Found wallet: {wallet.id}")
        qs = AffiliateWalletTransaction.objects.filter(wallet=wallet).order_by('-created_at')
        print(f"[DEBUG] Wallet transaction count: {qs.count()}")
        return qs
    
    
class AffiliateFunnelStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            profile = user.affiliate_profile
        except AffiliateProfile.DoesNotExist:
            return Response({"detail": "You are not an affiliate."}, status=400)

        referral_code = profile.referral_code

        # Clicks
        total_clicks = AffiliateClick.objects.filter(referral_code=referral_code).count()

        # Referrals (signups who bought a challenge)
        total_referrals = profile.referrals.count()

        # Approved commissions
        approved_commissions = profile.referrals.filter(commission_status='approved').count()

        # Conversion rates
        click_to_signup = round((total_referrals / total_clicks) * 100, 1) if total_clicks else 0.0
        signup_to_conversion = round((approved_commissions / total_referrals) * 100, 1) if total_referrals else 0.0

        return Response({
            "clicks": total_clicks,
            "signups": total_referrals,
            "referred_challenge_buys": total_referrals,  # same as signups who purchased
            "approved_commissions": approved_commissions,
            "conversion_rate": {
                "click_to_signup": f"{click_to_signup}%",
                "signup_to_conversion": f"{signup_to_conversion}%"
            }
        })
        
class AffiliatePayoutRequestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = AffiliatePayoutCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            payout = serializer.save()

            log_event(
                request=request,
                user=request.user,
                category="affiliate",
                event_type="affiliate_payout_requested",
                metadata={
                    "payout_id": str(payout.id),
                    "amount": str(payout.amount),
                    "currency": getattr(payout, "currency", None),
                    "status": payout.status,
                },
                description=f"User ({request.user.email}) requested an affiliate payout of {payout.amount}."
            )

            return Response({
                "detail": "Payout request submitted successfully.",
                "payout_id": str(payout.id),
                "amount": payout.amount,
                "status": payout.status,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class EligibleAccountsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        if not user.is_client():
            return Response({"detail": "Only clients can view this."}, status=403)

        client = user.client_profile
        enrollments = ChallengeEnrollment.objects.filter(
            client=client,
            status="live_in_progress",
            is_active=True,
            mt5_account_id__isnull=False
        )

        mt5 = MT5Client(api_url=settings.MT5_API_URL, api_key=settings.MT5_API_KEY)
        accounts = []

        for enrollment in enrollments:
            mt5_id = enrollment.mt5_account_id
            balance_data = mt5.get_account_balance(mt5_id)

            if not balance_data or "balance" not in balance_data:
                continue

            balance = Decimal(str(balance_data["balance"]))
            profit = balance - enrollment.account_size
            if profit <= 0:
                continue

            currency = enrollment.currency
    
            # Default: no conversion
            exchange_rate = None
            profit_usd = None
            net_profit_usd = None

            # Only convert when NOT USD
            if currency and currency.upper() != "USD":
                profit_usd, exchange_rate = convert_to_usd(currency, profit)

            # --- Prefer payout_config if exists (regardless of config_type) ---
            payout_config = getattr(enrollment, "payout_config", None)
            policy = getattr(enrollment.challenge, "payout_policy", None)

            if payout_config:
                profit_share = payout_config.profit_share_percent or Decimal("0.00")
                min_net_amount = payout_config.min_net_amount or Decimal("50.00")
                first_delay = payout_config.first_payout_delay_days or 0
                cycle_days = payout_config.subsequent_cycle_days or 14
            elif policy:
                past_payouts = user.payouts.filter(
                    challenge_enrollment=enrollment,
                    status__in=["pending", "approved", "paid", "rejected"]
                ).count()
                profit_share = policy.get_share_for(past_payouts + 1)
                min_net_amount = policy.min_net_amount
                first_delay = policy.first_payout_delay_days or 0
                cycle_days = policy.subsequent_cycle_days or 14
            else:
                profit_share = Decimal("0.00")
                min_net_amount = Decimal("50.00")
                first_delay = 0
                cycle_days = 14

            net_profit = profit * (profit_share / Decimal("100.00"))
            management_share = profit - net_profit

            if profit_usd is not None:
                net_profit_usd = (profit_usd * (profit_share / Decimal("100.00"))).quantize(Decimal("0.01"))

            # --- Eligibility checks ---
            today = date.today()
            errors = []
            next_eligible_date = today

            # Admin custom override takes priority over all automatic logic
            if payout_config and payout_config.custom_next_withdrawal_datetime:
                custom_date = payout_config.custom_next_withdrawal_datetime.date()
                if today < custom_date:
                    errors.append(f"Next payout eligible after {custom_date.isoformat()}")
                    next_eligible_date = max(next_eligible_date, custom_date)
            else:
                # Get last payout if any
                last_payout = user.payouts.filter(
                    challenge_enrollment=enrollment,
                    status__in=["pending", "approved", "paid", "rejected"]
                ).order_by("-reviewed_at").first()

                if not last_payout:
                    # ➜ First payout — only use first payout delay
                    start_date = enrollment.live_start_date or enrollment.start_date
                    if start_date and first_delay > 0:
                        first_eligible_date = start_date + timedelta(days=first_delay)
                        if today < first_eligible_date:
                            errors.append(f"First payout eligible after {first_eligible_date.isoformat()}")
                            next_eligible_date = max(next_eligible_date, first_eligible_date)
                else:
                    # ➜ Subsequent payouts — use cycle days
                    if cycle_days > 0:
                        last_date = (
                            last_payout.paid_at
                            or last_payout.reviewed_at
                            or last_payout.requested_at
                        ).date()
                        next_cycle_date = last_date + timedelta(days=cycle_days)
                        if today < next_cycle_date:
                            errors.append(f"Next payout eligible after {next_cycle_date.isoformat()}")
                            next_eligible_date = max(next_eligible_date, next_cycle_date)

            # Minimum net amount check
            if net_profit < min_net_amount:
                errors.append(
                    f"Net profit {net_profit.quantize(Decimal('0.01'))} "
                    f"is below minimum required {min_net_amount}"
                )

            record = {
            "enrollment_id": str(enrollment.id),
            "account_id": mt5_id,
            "account_size": float(enrollment.account_size),
            "balance": float(balance),
            "profit": float(profit.quantize(Decimal("0.01"))),
            "profit_share": float(profit_share),
            "net_profit": float(net_profit.quantize(Decimal("0.01"))),
            "management_share": float(management_share.quantize(Decimal("0.01"))),
            "currency": currency,
            "is_eligible": len(errors) == 0,
            "errors": errors,
            "next_eligible_date": next_eligible_date.isoformat() if errors else today.isoformat(),
            }

            # Only add conversion results if NOT USD
            if currency.upper() != "USD" and exchange_rate is not None:
                record["exchange_rate_to_usd"] = float(exchange_rate)
                record["profit_usd"] = float(profit_usd)
                record["net_profit_usd"] = float(net_profit_usd)

            accounts.append(record)

        return Response(accounts)

class ClientPaymentMethodListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        methods = ClientPaymentMethod.objects.filter(client=user)

        def serialize(method):
            details = {}
            if method.payment_type == "paypal":
                details = {"paypal_email": method.paypal_email}
            elif method.payment_type == "bank":
                details = {
                    "bank_account_name": method.bank_account_name,
                    "bank_account_number": method.bank_account_number,
                    "iban": method.iban,
                    "swift_code": method.swift_code,
                    "bank_name": method.bank_name,
                    "bank_branch": method.bank_branch,
                    "bank_country": method.bank_country,
                    "bank_currency": method.bank_currency,
                }
            elif method.payment_type == "crypto":
                details = {
                    "crypto_type": method.crypto_type,
                    "wallet_address": method.crypto_wallet_address,
                }

            return {
                "id": str(method.id),
                "payment_type": method.payment_type,
                "label": method.label,
                "is_default": method.is_default,
                "details": details,
            }

        return Response([serialize(m) for m in methods])

    
class RequestTraderPayoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        # 1) Required fields
        for key in ("enrollment_id", "payment_method_id"):
            if key not in data:
                return Response(
                    {"detail": f"'{key}' is required."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 2) Validate ChallengeEnrollment
        try:
            enrollment = ChallengeEnrollment.objects.get(
                id=data["enrollment_id"],
                client__user=user,
                status="live_in_progress",
                is_active=True
            )
        except ChallengeEnrollment.DoesNotExist:
            return Response(
                {"detail": "Invalid or unauthorized enrollment."},
                status=status.HTTP_400_BAD_REQUEST
            )

        account_id = enrollment.mt5_account_id
        if not account_id:
            return Response(
                {"detail": "No MT5 account linked."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2a) Payout limit check
        policy = getattr(enrollment.challenge, 'payout_policy', None)
        if policy and policy.max_payouts > 0:
            approved_count = enrollment.payouts.filter(status='approved').count()
            if approved_count >= policy.max_payouts:
                # Close the account immediately
                enrollment.status = 'payout_limit_reached'
                enrollment.is_active = False
                enrollment.save(update_fields=['status', 'is_active', 'updated_at'])

                # Disable MT5 trading
                try:
                    mt5 = MT5Client(api_url=settings.MT5_API_URL, api_key=settings.MT5_API_KEY)
                    mt5.disable_trading(account_id)
                except Exception:
                    pass

                # Total paid out
                total_paid = enrollment.payouts.filter(
                    status='approved'
                ).aggregate(total=Sum('released_fund'))['total'] or 0

                # In-app notification
                Notification.objects.create(
                    user=user,
                    title="Funded Account Closed — Payout Limit Reached",
                    message=(
                        f"Your funded account (MT5 #{account_id}) has reached the maximum "
                        f"of {policy.max_payouts} paid payouts. The account is now permanently closed. "
                        f"Total paid out: ${total_paid:,.2f}. Thank you for trading with WeFund!"
                    ),
                    type='payout',
                )

                # Send notification email
                try:
                    trader_name = user.first_name or user.username
                    challenge_name = enrollment.challenge.name if enrollment.challenge else "N/A"
                    email_context = {
                        "trader_name": trader_name,
                        "mt5_account_id": account_id,
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
                        to=[user.email],
                    )
                    email.attach_alternative(html_message, "text/html")
                    email.send()
                    EmailService.log_email(_subj, user.email, body_html=html_message,
                                           category='payout', user=user)
                except Exception:
                    pass

                return Response(
                    {"detail": "Your funded account has reached the maximum number of paid payouts and is now closed. Please check your email for details."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 2b) Server-side withdrawal date validation
        payout_config = getattr(enrollment, "payout_config", None)
        if payout_config:
            today = timezone.now().date()
            next_date = None

            if payout_config.custom_next_withdrawal_datetime:
                next_date = payout_config.custom_next_withdrawal_datetime.date()
            else:
                # Automatic cycle logic — mirrors _last_cycle_anchor / _compute_next_withdrawal_date
                last_payout = (
                    enrollment.payouts
                    .filter(status__in=["pending", "approved", "paid", "rejected"])
                    .order_by("-requested_at")
                    .first()
                )
                if last_payout:
                    cycle_days = payout_config.subsequent_cycle_days or 14
                    anchor = (
                        last_payout.paid_at
                        or last_payout.reviewed_at
                        or last_payout.requested_at
                    )
                    if anchor:
                        anchor_date = anchor.date() if hasattr(anchor, "date") else anchor
                        next_date = anchor_date + timedelta(days=cycle_days)
                else:
                    first_delay = payout_config.first_payout_delay_days or 0
                    start = payout_config.live_trading_start_date
                    if start:
                        next_date = start + timedelta(days=first_delay)

            if next_date and today < next_date:
                return Response(
                    {"detail": f"Payout not yet available. Next withdrawal window opens on {next_date.isoformat()}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 2c) Minimum trading days enforcement
        payout_config_td = getattr(enrollment, "payout_config", None)
        policy_td = getattr(enrollment.challenge, "payout_policy", None)
        min_td = 0

        if payout_config_td and payout_config_td.config_type == "custom" and payout_config_td.min_trading_days is not None:
            min_td = payout_config_td.min_trading_days
        elif policy_td and policy_td.min_trading_days:
            min_td = policy_td.min_trading_days

        if min_td > 0:
            trading_days_count = (
                MT5Trade.objects.filter(account_id=account_id)
                .values("open_time__date")
                .distinct()
                .count()
            )
            if trading_days_count < min_td:
                return Response(
                    {"detail": f"Minimum {min_td} trading days required before payout. You have {trading_days_count} trading day{'s' if trading_days_count != 1 else ''}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 3) Validate payment method
        try:
            pm = ClientPaymentMethod.objects.get(
                id=data["payment_method_id"],
                client=user
            )
        except ClientPaymentMethod.DoesNotExist:
            return Response(
                {"detail": "Invalid or unauthorized payment method."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4) Build method + details
        method = pm.payment_type
        if method == "paypal":
            method_details = {"paypal_email": pm.paypal_email}
        elif method == "bank":
            method_details = {
                "account_name": pm.bank_account_name,
                "account_number": pm.bank_account_number,
                "iban": pm.iban,
                "swift_code": pm.swift_code,
                "bank_name": pm.bank_name,
                "bank_branch": pm.bank_branch,
                "country": pm.bank_country,
                "currency": pm.bank_currency,
            }
        else:  # crypto
            method_details = {
                "crypto_type": pm.crypto_type,
                "wallet_address": pm.crypto_wallet_address
            }

        mt5 = MT5Client(api_url=settings.MT5_API_URL, api_key=settings.MT5_API_KEY)

        # 5) Block if any open trades exist
        open_trades = mt5.get_open_trades(account_id)
        if open_trades:
            return Response(
                {
                    "detail": "Please close all open trades before requesting a payout.",
                    "open_trades": open_trades
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 5b) Disable trading before payout
        disable_ok = mt5.disable_trading(account_id)
        if not disable_ok:
            return Response(
                {"detail": "Error Code:B5. Please contact support."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 6) Fetch updated balance
        bal_data = mt5.get_account_balance(account_id)
        if not bal_data or "balance" not in bal_data:
            return Response(
                {"detail": "Unable to retrieve account balance."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        balance = Decimal(str(bal_data["balance"]))

        # 7) Compute full profit
        account_size = Decimal(str(enrollment.account_size))
        profit = balance - account_size
        if profit <= 0:
            return Response(
                {"detail": "No withdrawable profit."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 8) Withdraw full profit from MT5
        wd = mt5.withdraw_profit(account_id, float(profit))
        if not wd.get("success"):
            return Response(
                {"detail": f"MT5 Withdrawal Error: {wd.get('error', 'Unknown')}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 9) Determine profit share %
        cfg = None
        try:
            cfg = PayoutConfiguration.objects.get(enrollment=enrollment, is_active=True)
            share_pct = cfg.profit_share_percent or Decimal("80.00")
        except PayoutConfiguration.DoesNotExist:
            # Fallback — use challenge's default payout policy
            if hasattr(enrollment.challenge, "payout_policy"):
                num_previous = enrollment.traderpayout_set.filter(status__in=["approved", "paid"]).count()
                share_pct = enrollment.challenge.payout_policy.get_share_for(num_previous + 1)
            else:
                share_pct = Decimal("80.00")

        # 9.5) If custom next withdrawal datetime is set, advance it according to payment cycle
        if cfg and cfg.custom_next_withdrawal_datetime:
            base_dt = cfg.custom_next_withdrawal_datetime
            now_dt = timezone.now()

            # ✅ Normalize: make both either aware or naive (match project behavior)
            if timezone.is_aware(now_dt):
                # project is using aware "now" => make base_dt aware too
                if timezone.is_naive(base_dt):
                    base_dt = timezone.make_aware(base_dt, timezone.get_current_timezone())
            else:
                # project is using naive "now" => make base_dt naive too
                if timezone.is_aware(base_dt):
                    base_dt = timezone.make_naive(base_dt, timezone.get_current_timezone())

            # never move backwards
            if base_dt < now_dt:
                base_dt = now_dt

            next_dt = compute_next_withdrawal_datetime(cfg, base_dt)
            cfg.custom_next_withdrawal_datetime = next_dt
            cfg.save(update_fields=["custom_next_withdrawal_datetime", "updated_at"])
    
            
        # 10) Calculate net payout & management fee
        net = (profit * share_pct) / Decimal("100")
        management_fee = profit - net
        
        gmt2 = now_gmt2_naive()

        currency = enrollment.currency

        if currency.upper() != "USD":
            profit_usd, rate = convert_to_usd(currency, profit)
            net_usd = (profit_usd * (share_pct / Decimal("100"))).quantize(Decimal("0.01"))

            conversion_meta = {
                "currency": currency,
                "exchange_rate_to_usd": str(rate),
                "profit_original": str(profit),
                "net_profit_original": str(net),
                "converted_at": timezone.now().isoformat(),
            }
        else:
            profit_usd = profit
            net_usd = net
            conversion_meta = None


        # 11) Record the payout
        payout = TraderPayout.objects.create(
            trader=user,
            challenge_enrollment=enrollment,
            profit=profit_usd,              # ALWAYS USD NOW
            net_profit=net_usd,             # ALWAYS USD NOW
            amount=net_usd,                 # ALWAYS USD NOW
            profit_share=share_pct,
            method=method,
            method_details=method_details,
            status="pending",
            requested_at=gmt2,
            conversion_metadata=conversion_meta,   # ⭐ NEW ⭐
        )

        
        payout_summary = {
        "trader_name": user.first_name,
        "trader_email": user.email,
        "account_id": account_id,
        "account_size": f"{account_size:.2f}",
        "gross_profit": f"{profit:.2f}",
        "profit_share_pct": f"{share_pct:.2f}%",
        "net_payout": f"{net:.2f}",
        "management_fee": f"{management_fee:.2f}",
        "method": method,
        "method_details": method_details,
        "requested_at": payout.requested_at.astimezone(ZoneInfo("Etc/GMT-2")).strftime("%Y-%m-%d %H:%M:%S"),
        "status": payout.status.capitalize(),
        "payout_id": str(payout.id),
        }
        
        # Send to trader
        subject_client = "WeFund | We've received your payout request"
        html_client = EmailService.render_template("emails/payout/payout_request.html", payout_summary)

        email_client = EmailMultiAlternatives(
            subject=subject_client,
            body="Please view this email in HTML format.",  # plain-text fallback
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        email_client.attach_alternative(html_client, "text/html")
        email_client.send()
        EmailService.log_email(subject_client, user.email, body_html=html_client,
                               category='payout', user=user)

        # 11b) Reset starting balance on today's snapshot
        today = gmt2.date()
        snapshot, created = MT5DailySnapshot.objects.get_or_create(
            enrollment=enrollment,
            account_id=account_id,
            date=today,
            defaults={
                "starting_balance": enrollment.account_size,
                "starting_equity": enrollment.account_size,  # optional: reset equity too
            }
        )

        if not created:
            snapshot.starting_balance = enrollment.account_size
            snapshot.starting_equity = enrollment.account_size  # optional
            snapshot.save(update_fields=["starting_balance", "starting_equity", "updated_at"])

        log_event(
            request=request,
            user=user,
            category="payout",
            event_type="payout_requested",
            metadata={
                "payout_id": str(payout.id),
                "enrollment_id": str(enrollment.id),
                "mt5_account_id": account_id,
                "account_size": str(account_size),
                "gross_profit": str(profit),
                "profit_share_percent": str(share_pct),
                "net_payout_amount": str(net),
                "method": method,
                "method_details": method_details,
            },
            description=f"Client ({user.email}) requested a payout for account {account_id}."
        )    

        # 12) Return response
        return Response({
            "detail": "Payout request submitted successfully.",
            "payout_id": str(payout.id),
            "gross_profit": f"{profit:.2f}",
            "profit_share_pct": f"{share_pct:.2f}%",
            "net_payout": f"{net:.2f}",
            "management_fee": f"{management_fee:.2f}"
        }, status=status.HTTP_201_CREATED)
        
class EAApprovalRequestView(generics.CreateAPIView):
    """
    Allows clients to submit an EA approval request with .mq5 file.
    Uploads file to BunnyCDN, then stores DB record.
    """
    serializer_class = EAApprovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        if not user.is_client():
            raise PermissionDenied("Only clients can submit EA requests.")

        enrollment_id = request.data.get("enrollment_id")
        mq5_file = request.FILES.get("mq5_file")

        if not enrollment_id:
            return Response({"error": "enrollment_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not mq5_file:
            return Response({"error": "mq5_file is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not mq5_file.name.endswith(".mq5"):
            return Response({"error": "Only .mq5 files are allowed"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            enrollment = ChallengeEnrollment.objects.get(id=enrollment_id, client=user.client_profile)
        except ChallengeEnrollment.DoesNotExist:
            return Response({"error": "Invalid enrollment for this client"}, status=status.HTTP_404_NOT_FOUND)

        # Upload to BunnyCDN
        filename = f"ea_requests/{user.id}/{mq5_file.name}"
        file_url = upload_to_bunnycdn(mq5_file, filename)

        # Save record
        ea_request = EATradingBotRequest.objects.create(
            client=user.client_profile,
            enrollment=enrollment,
            mq5_file_url=file_url
        )

        log_event(
            request=request,
            user=user,
            category="mt5",
            event_type="ea_approval_requested",
            metadata={
                "enrollment_id": str(enrollment.id),
                "mt5_account_id": enrollment.mt5_account_id,
                "ea_file": os.path.basename(file_url),
                "file_url": file_url,
            },
            description=f"User ({user.email}) submitted an EA approval request for MT5 account {enrollment.mt5_account_id}."
        )
        
        filename_only = os.path.basename(file_url)
        
        context = {
            "client_name": user.get_full_name(),
            "mt5_account_id": enrollment.mt5_account_id,
            "filename_only": filename_only,
        }
        
        subject_client = "WeFund | Your EA Approval Request Has Been Submitted"
        html_client = EmailService.render_template("emails/ea_submission/ea_request_submitted.html", context)

        email_client = EmailMultiAlternatives(
            subject=subject_client,
            body="Please view this email in HTML format.",  # plain-text fallback
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        email_client.attach_alternative(html_client, "text/html")
        email_client.send()
        EmailService.log_email(subject_client, user.email, body_html=html_client,
                               category='other', user=user)

        serializer = self.get_serializer(ea_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
class ClientActiveChallengesView(generics.ListAPIView):
    """
    Returns all active challenge enrollments for the logged-in client,
    excluding failed ones.
    """
    serializer_class = ChallengeEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_client():
            return ChallengeEnrollment.objects.none()

        return (
            ChallengeEnrollment.objects.filter(client__user=user)
            .exclude(status="failed")
            .select_related("challenge")
        )
        
class ClientChallengeEnrollmentListView(generics.ListAPIView):
    serializer_class = GridChallengeEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return the logged-in client's enrollments
        return ChallengeEnrollment.objects.filter(client=self.request.user.client_profile)
    
class PasswordResetRequestView(APIView):
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        request_email = serializer.validated_data["email"]
        ip = request.META.get("REMOTE_ADDR")
        ua = request.headers.get("User-Agent")

        # Case-insensitive lookup, client role only
        user = User.objects.filter(email__iexact=request_email, role="client").first()

        if not user:
            # Log failed attempt (email not found)
            log_event(
                request=request,
                user=None,
                category="security",
                event_type="password_reset_attempt_unknown_email",
                metadata={"email_input": request_email, "ip": ip, "ua": ua},
                description=f"Password reset requested for non-existing email: {request_email}"
            )
            # Always return success for security reasons
            return Response({"message": "Password reset link sent."}, status=status.HTTP_200_OK)

        # Generate token + encode uid
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"

        # Send email
        EmailService.send_password_reset(
            to_email=user.email,
            reset_link=reset_link,
            full_name=user.get_full_name() or user.username,
        )

        # Log success
        log_event(
            request=request,
            user=user,
            category="security",
            event_type="password_reset_requested",
            metadata={"ip": ip, "ua": ua},
            description=f"Password reset requested for {user.email}"
        )

        return Response({"message": "Password reset link sent."}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            # Token invalid / expired → Log attempt
            log_event(
                request=request,
                user=None,
                category="security",
                event_type="password_reset_invalid_token",
                metadata={
                    "uid": request.data.get("uid"),
                    "token": request.data.get("token"),
                    "ip": request.META.get("REMOTE_ADDR"),
                    "user_agent": request.headers.get("User-Agent")
                },
                description="Invalid or expired password reset token used."
            )
            raise

        # Reset password
        user = serializer.save()

        # Log successful reset
        log_event(
            request=request,
            user=user,
            category="security",
            event_type="password_reset_success",
            metadata={
                "ip": request.META.get("REMOTE_ADDR"),
                "user_agent": request.headers.get("User-Agent")
            },
            description=f"User ({user.email}) successfully reset their password."
        )

        # Send confirmation email
        EmailService.send_password_reset_confirmation(
            to_email=user.email,
            full_name=user.get_full_name() or user.username,
        )

        return Response({"message": "Password has been reset."}, status=status.HTTP_200_OK)
    
class ImpersonateExchangeView(APIView):
    """
    Exchange a one-time ticket for JWT tokens (client side).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ticket = request.data.get("ticket")
        if not ticket:
            return Response({"error": "ticket is required"}, status=400)

        user_id = cache.get(f"impersonate:{ticket}")
        if not user_id:
            return Response({"error": "Invalid or expired ticket"}, status=400)

        # Invalidate ticket (one-time use)
        cache.delete(f"impersonate:{ticket}")

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        refresh = RefreshToken.for_user(user)

        # Build metadata like ClientTokenObtainPairSerializer
        full_name = user.get_full_name() or "WeFund User"
        data = {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user_id": str(user.id),
            "username": user.username,
            "role": user.role,
            "full_name": full_name,
            "profile_picture": (
                user.profile_picture
                or "https://we-fund.b-cdn.net/img/default-avatar.svg"
            ),
            "created_at": user.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        }
        return Response(data, status=200)

class ClientRewardTasksView(generics.ListAPIView):
    """
    Returns reward tasks for logged-in client.
    - Expired tasks are visible (with expired flag)
    - Scheduled tasks are hidden
    - Adds submission_status + can_submit
    """
    serializer_class = RewardTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_client():
            return RewardTask.objects.none()

        now = timezone.now()

        return RewardTask.objects.filter(
            status__in=["active", "expired"]  # expired visible
        ).filter(
            Q(starts_at__isnull=True) | Q(starts_at__lte=now)  # hide future tasks
        ).order_by("-created_at")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        # Ensure expiration state is correct
        for task in queryset[:200]:
            if hasattr(task, "apply_expiration_if_needed"):
                task.apply_expiration_if_needed(save=True)

        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data

        user = request.user

        # Map submissions {task_id: status}
        user_submissions = RewardSubmission.objects.filter(user=user).values_list("task_id", "status")
        submission_map = {str(task_id): status for task_id, status in user_submissions}

        now = timezone.now()

        for task in data:
            task_id = str(task["id"])
            submission_status = submission_map.get(task_id)

            task["submission_status"] = submission_status

            # Detect expired via serializer field (already provided)
            is_expired = task.get("is_expired", False)

            # can_submit logic
            if is_expired:
                task["can_submit"] = False
                task["label"] = "expired"
            elif submission_status in [None, "declined"]:
                task["can_submit"] = True
            else:
                task["can_submit"] = False

        return Response(data)

class ClientRewardSubmissionCreateView(generics.CreateAPIView):
    """
    Allows a logged-in client to submit proof for a reward task.
    """
    serializer_class = ClientRewardSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Just for completeness; not directly used in CreateAPIView
        return RewardSubmission.objects.filter(user=self.request.user)

class ClientRewardSubmissionsView(generics.ListAPIView):
    """
    Returns all reward submissions made by the logged-in client.
    """
    serializer_class = RewardSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # Only clients can access their own submissions
        if not user.is_client():
            return RewardSubmission.objects.none()

        return (
            RewardSubmission.objects.filter(user=user)
            .select_related("task")
            .order_by("-created_at")
        )


class ClientRedeemItemListView(generics.ListAPIView):
    """
    Returns redeemable items for logged-in client.

    Rules:
    - Expired items are visible (with expired label)
    - Scheduled (future) items are hidden
    - Archived items are hidden
    - Expired items cannot be redeemed
    """
    serializer_class = ClientRedeemItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_client():
            return RedeemItem.objects.none()

        now = timezone.now()

        return RedeemItem.objects.filter(
            is_archived=False  # never show archived
        ).filter(
            Q(starts_at__isnull=True) | Q(starts_at__lte=now)  # hide future
        ).order_by("-created_at")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        # Ensure expiration is applied
        for item in queryset[:200]:
            if hasattr(item, "apply_expiration_if_needed"):
                item.apply_expiration_if_needed(save=True)

        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data

        now = timezone.now()

        for item in data:
            is_expired = item.get("is_expired", False)

            # Add label
            if is_expired:
                item["label"] = "expired"
                item["can_redeem"] = False
            else:
                # Active + not expired
                item["can_redeem"] = item.get("is_available", True)

        return Response(data)

class ClientRedeemItemRedeemView(generics.CreateAPIView):
    """
    Allows a logged-in client to redeem an active item using WeCoins.
    """
    serializer_class = ClientRedemptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Redemption.objects.filter(user=self.request.user)
    
class ClientRedemptionHistoryView(generics.ListAPIView):
    """
    Returns all redemption records for the logged-in client.
    """
    serializer_class = ClientRedemptionHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_client():
            return Redemption.objects.none()

        return (
            Redemption.objects.filter(user=user)
            .select_related('item')
            .order_by('-created_at')
        )

class ClientWeCoinWalletView(generics.RetrieveAPIView):
    """
    Returns the logged-in client's wallet info including balance and all transactions.
    """
    serializer_class = ClientWeCoinWalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user

        # Ensure only clients access their wallet
        if not user.is_client():
            return None

        wallet, _ = WeCoinWallet.objects.get_or_create(user=user)
        return wallet

def generate_wecoins_token(user):
    payload = {
        "sub": str(user.id),
        "feature": "wecoins",
        "exp": datetime.utcnow() + timedelta(days=30),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    
class WeCoinsAccessView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        # Only clients allowed 
        if getattr(user, "role", None) != "client":
            return Response(
                {"detail": "Only clients can access WeCoins"},
                status=status.HTTP_403_FORBIDDEN
            )

        feature = get_object_or_404(BetaFeature, code="wecoins")

        # ✅ If released → allow all clients automatically (NO BetaFeatureAccess)
        if feature.status.strip().lower() == "released":
            wallet, _ = WeCoinWallet.objects.get_or_create(user=user)
            token = generate_wecoins_token(user)
            serializer = ClientWeCoinWalletSerializer(wallet)

            return Response(
                {
                    "status": "released",
                    "token": token,
                    "wallet": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        # ------------------------------------------------------------
        # ❗ Only beta flow below (active, closed, draft)
        # ------------------------------------------------------------

        access, created = BetaFeatureAccess.objects.get_or_create(
            feature=feature,
            user=user,
            defaults={"status": "requested", "requested_at": timezone.now()},
        )

        if created:
            log_event(
                request=request,
                user=user,
                category="wecoins",
                event_type="wecoins_beta_requested",
                metadata={"feature": "wecoins"},
                description=f"User ({user.email}) requested access to WeCoins Beta."
            )

        status_label = access.status

        if status_label in ["declined", "revoked"]:
            return Response(
                {
                    "status": status_label,
                    "message": "Your WeCoins Beta access is not approved.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if status_label == "requested":
            return Response(
                {
                    "status": "requested",
                    "message": "Your WeCoins Beta request is pending approval",
                },
                status=status.HTTP_202_ACCEPTED,
            )

        # Approved: validate token or re-issue
        auth_header = request.headers.get("Authorization", "")
        token = None

        if auth_header.startswith("Bearer "):
            token = auth_header.split()[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                if payload.get("feature") != "wecoins" or payload.get("sub") != str(user.id):
                    token = None
            except Exception:
                token = None

        if not token:
            token = generate_wecoins_token(user)

        wallet, _ = WeCoinWallet.objects.get_or_create(user=user)
        serializer = ClientWeCoinWalletSerializer(wallet)

        return Response(
            {
                "status": "approved",
                "token": token,
                "wallet": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class ClientEligibleResetView(generics.ListAPIView):
    """List user's 1-step live enrollments eligible for reset token purchase."""
    serializer_class = EligibleEnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_client():
            return ChallengeEnrollment.objects.none()
        return ChallengeEnrollment.objects.filter(
            client__user=user,
            challenge__step_type='1-step',
            status='live_in_progress',
        ).select_related('challenge')


class ClientPurchaseResetTokenView(generics.CreateAPIView):
    """Purchase a reset token for a specific enrollment using WeCoins."""
    serializer_class = ClientResetTokenSerializer
    permission_classes = [permissions.IsAuthenticated]


class ClientResetTokenListView(generics.ListAPIView):
    """List user's own reset tokens."""
    serializer_class = ResetTokenReadSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_client():
            return ResetToken.objects.none()
        return ResetToken.objects.filter(user=user).select_related(
            'enrollment', 'enrollment__challenge'
        ).order_by('-created_at')


def generate_competitions_token(user):
    payload = {
        "sub": str(user.id),
        "feature": "competitions",
        "iat": int(timezone.now().timestamp()),
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    
class CompetitionsAccessView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        # ✅ Only clients allowed
        if getattr(user, "role", None) != "client":
            return Response(
                {"detail": "Only clients can access Competitions"},
                status=status.HTTP_403_FORBIDDEN
            )

        feature = get_object_or_404(BetaFeature, code="competitions")

        # ✅ If released → allow all clients automatically (NO BetaFeatureAccess)
        if feature.status.strip().lower() == "released":
            token = generate_competitions_token(user)

            return Response(
                {
                    "status": "released",
                    "token": token,
                    "message": "Competitions feature is fully released.",
                },
                status=status.HTTP_200_OK,
            )

        # ------------------------------------------------------------
        # ❗ Only beta flow below (active, closed, draft)
        # ------------------------------------------------------------

        access, created = BetaFeatureAccess.objects.get_or_create(
            feature=feature,
            user=user,
            defaults={"status": "requested", "requested_at": timezone.now()},
        )

        if created:
            log_event(
                request=request,
                user=user,
                category="competitions",
                event_type="competitions_beta_requested",
                metadata={"feature": "competitions"},
                description=f"User ({user.email}) requested access to Competitions Beta."
            )

        status_label = access.status

        if status_label in ["declined", "revoked"]:
            return Response(
                {
                    "status": status_label,
                    "message": "Your Competitions Beta access is not approved.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if status_label == "requested":
            return Response(
                {
                    "status": "requested",
                    "message": "Your Competitions Beta request is pending approval",
                },
                status=status.HTTP_202_ACCEPTED,
            )

        # ------------------------------------------------------------
        # ✅ Approved: validate token or re-issue
        # ------------------------------------------------------------

        auth_header = request.headers.get("Authorization", "")
        token = None

        if auth_header.startswith("Bearer "):
            token = auth_header.split()[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])

                if (
                    payload.get("feature") != "competitions"
                    or payload.get("sub") != str(user.id)
                ):
                    token = None

            except Exception:
                token = None

        if not token:
            token = generate_competitions_token(user)

        return Response(
            {
                "status": "approved",
                "token": token,
                "message": "Competitions Beta access approved.",
            },
            status=status.HTTP_200_OK,
        )    

class TraderCompetitionsHubView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tab = request.query_params.get("tab")  
        # ongoing | upcoming | my | ended

        qs = Competition.objects.annotate(
            participants=Count("registrations")
        )

        if tab == "ongoing":
            qs = qs.filter(status="ongoing")

        elif tab == "upcoming":
            qs = qs.filter(status="upcoming")

        elif tab == "ended":
            qs = qs.filter(status="ended")

        elif tab == "my":
            qs = qs.filter(
                registrations__user=request.user
            ).distinct()

        serializer = TraderCompetitionCardSerializer(
            qs.order_by("-start_at"),
            many=True,
            context={"request": request}
        )

        return Response(serializer.data)

class TraderCompetitionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, competition_id):
        try:
            competition = Competition.objects.annotate(
                participants=Count("registrations")
            ).get(id=competition_id)
        except Competition.DoesNotExist:
            return Response({"detail": "Competition not found"}, status=404)

        serializer = TraderCompetitionDetailSerializer(
            competition,
            context={"request": request}
        )

        return Response(serializer.data)

class TraderJoinCompetitionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, competition_id):
        user = request.user

        try:
            competition = Competition.objects.select_for_update().get(
                id=competition_id,
                status__in=["upcoming", "ongoing"]
            )
        except Competition.DoesNotExist:
            return Response(
                {"detail": "Competition not available"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ✅ Enforce single entry
        if competition.enforce_single_entry:
            if CompetitionRegistration.objects.filter(
                competition=competition,
                user=user
            ).exists():
                return Response(
                    {"detail": "Already joined"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # ✅ Create registration (NO MT5 here)
        registration = CompetitionRegistration.objects.create(
            competition=competition,
            user=user
        )

        # ✅ OPTIONAL: Create Challenge Enrollment if linked
        if competition.challenge:
            if not hasattr(user, "client_profile"):
                return Response(
                    {"detail": "Client profile not found"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            client_profile = user.client_profile

            enrollment = ChallengeEnrollment.objects.create(
                client=client_profile,
                challenge=competition.challenge,
                account_size=competition.initial_balance,
                currency="USD",
                status="live_in_progress"
            )

            # ✅ SECURE MT5 CREATION (from api/utils/competition_account.py)
            enrollment = create_mt5_for_challenge_enrollment(
                enrollment=enrollment,
                client_profile=client_profile
            )

            # ✅ Link enrollment to competition registration
            registration.challenge_enrollment = enrollment

        registration.save()

        def _send_email():
            EmailService.send_competition_registration_success(
                to_email=user.email,
                subject=f"Competition Registration Successful — {competition.title}",
                context={
                    "user": user,
                    "competition": competition,

                    # MT5 details (only if exists)
                    "mt5_login": getattr(enrollment, "mt5_account_id", None),
                    "mt5_password": getattr(enrollment, "mt5_password", None),
                    "mt5_investor_password": getattr(enrollment, "mt5_investor_password", None),

                    "mt5_server": getattr(settings, "MT5_SERVER_NAME", "Wefund Markets Ltd"),
                    "now": timezone.now(),
                    "brand_name": "WeFund",
                }
            )

        transaction.on_commit(_send_email)

        return Response(
            {
                "detail": "Successfully joined competition",
                "competition_mt5_login": None,  # ✅ Always None now
                "challenge_enrollment_id": (
                    registration.challenge_enrollment.id
                    if registration.challenge_enrollment else None
                ),
                "challenge_mt5_account": (
                    registration.challenge_enrollment.mt5_account_id
                    if registration.challenge_enrollment else None
                )
            },
            status=status.HTTP_201_CREATED
        )

class ClientCompetitionLeaderboardTableView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, competition_id):
        user = request.user
        search = request.query_params.get("search")

        try:
            competition = Competition.objects.get(
                id=competition_id,
                status__in=["ongoing", "ended"]
            )
        except Competition.DoesNotExist:
            return Response(
                {"detail": "Competition not available"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Base queryset
        qs = CompetitionRankingSnapshot.objects.filter(
            competition=competition,
            user__hidden_from_leaderboard=False,
        ).select_related("user").order_by("rank")

        # Search (name / username / email)
        if search:
            qs = qs.filter(
                Q(user__username__icontains=search) |
                Q(user__email__icontains=search) |
                Q(user__client_profile__address_info__first_name__icontains=search) |
                Q(user__client_profile__address_info__last_name__icontains=search)
            )

        # Find logged-in user's rank (for sticky badge)
        my_rank_obj = CompetitionRankingSnapshot.objects.filter(
            competition=competition,
            user=user
        ).first()

        my_rank = my_rank_obj.rank if my_rank_obj else None

        # Pagination
        paginator = PageNumberPagination()
        paginator.page_size = 25
        page = paginator.paginate_queryset(qs, request)

        serializer = ClientCompetitionLeaderboardTableSerializer(
            page,
            many=True,
            context={"request": request}
        )

        return paginator.get_paginated_response({
            "competition_id": str(competition.id),
            "competition_title": competition.title,
            "total_participants": qs.count(),

            # STICKY USER RANK FOR FRONTEND
            "my_rank": my_rank,

            # LEADERBOARD TABLE DATA
            "rows": serializer.data
        })                                    