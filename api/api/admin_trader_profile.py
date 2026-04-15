# views/admin_trader_profile.py
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from .permissions import HasPermission
from .serializers import (
    UserSerializer, ClientProfileSerializer, OrderSerializer, ChallengeEnrollmentWithPhaseSerializer,
    MT5TradeSerializer, PayoutConfigurationSerializer, TraderPayoutSerializer, BreachHistorySerializer,
    CertificateSerializer, NotificationSerializer,
    AffiliateProfileSerializer, AffiliateWalletSerializer,
    AffiliatePayoutSerializer, AffiliateWalletTransactionSerializer
)
from wefund.models import (
    User, ClientProfile, Order, ChallengePhase, ChallengeEnrollment, MT5Trade, ClientPaymentMethod,
    TraderPayout, BreachHistory, Certificate, Notification,
    AffiliateProfile, AffiliateWallet, AffiliatePayout, AffiliateWalletTransaction
)
import json
import logging
from rest_framework.renderers import JSONRenderer
from wefund.mt5_controller.utils import fetch_user_balance, fetch_user_equity

logger = logging.getLogger(__name__)

def safe_serialize(serializer_class, queryset_or_instance, many=False):
    try:
        return serializer_class(queryset_or_instance, many=many).data
    except Exception as e:
        return {"error": str(e)}
    
def build_phases_with_balances(enrollment):
    """
    Returns ALL phases for the enrollment's challenge,
    and for each phase attaches the MT5 account (current/past) + balance/equity.
    """
    phases_out = []

    current_phase_type = enrollment.get_current_phase_type()
    all_phases = (
        ChallengePhase.objects
        .filter(challenge=enrollment.challenge)
        .order_by("phase_type")
    )

    # helper to find account id for a given phase
    def get_account_for_phase(phase_type: str):
        # current phase account
        if phase_type == current_phase_type:
            return enrollment.mt5_account_id, enrollment.status

        # past phases from EnrollmentAccount relation (if you have it)
        acc = (
            enrollment.accounts
            .filter(phase_type=phase_type)
            .order_by("-created_at")
            .first()
        )
        if acc and acc.mt5_account_id:
            return acc.mt5_account_id, getattr(acc, "status", None)

        return None, None

    for phase in all_phases:
        mt5_account_id, phase_status = get_account_for_phase(phase.phase_type)

        balance = None
        equity = None

        if mt5_account_id:
            try:
                b = fetch_user_balance(mt5_account_id)
                e = fetch_user_equity(mt5_account_id)
                balance = float(b) if b is not None else None
                equity = float(e) if e is not None else None
            except Exception as ex:
                logger.warning(
                    f"[trader_full_profile] balance/equity fetch failed "
                    f"(enrollment={enrollment.id}, acc={mt5_account_id}): {ex}"
                )

        phases_out.append({
            # phase config
            "phase_type": phase.phase_type,
            "trading_period": phase.trading_period,
            "min_trading_days": phase.min_trading_days,
            "max_daily_loss": float(phase.max_daily_loss) if phase.max_daily_loss is not None else None,
            "max_loss": float(phase.max_loss) if phase.max_loss is not None else None,
            "profit_target": float(phase.profit_target) if phase.profit_target is not None else None,

            # phase state
            "is_current": (phase.phase_type == current_phase_type),
            "status": phase_status,

            # account info
            "mt5_account_id": mt5_account_id,
            "balance": balance,
            "equity": equity,
        })

    return phases_out    

@api_view(["GET"])
@permission_classes([HasPermission])
def trader_full_profile(request, trader_id):
    user = get_object_or_404(User, id=trader_id)

    data = {
        "profile_info": None,
        "orders_info": [],
        "challenge_info": [],
        "trades_info": [],
        "payout_info": {"methods": [], "payouts": [], "config": None},
        "risk_info": [],
        "certificate_info": [],
        "risk_by_challenge": [],
        "certificates_by_challenge": [],
        "notifications": [],
        "affiliate_info": None
    }

    # --- Profile ---
    data["profile_info"] = {
        "user": safe_serialize(UserSerializer, user),
        "client_profile": safe_serialize(ClientProfileSerializer, getattr(user, "client_profile", None))
    }
    
    orders = Order.objects.filter(user=user)
    data["orders_info"] = safe_serialize(OrderSerializer, orders, many=True)

    # --- Challenge Enrollments ---
    enrollments = (
        ChallengeEnrollment.objects
        .filter(client__user=user)
        .select_related("challenge")
        .prefetch_related("accounts")  # important (EnrollmentAccount relation)
    )
    
    enrollment_map = {str(e.id): e for e in enrollments}

    challenge_rows = []
    for en in enrollments:
        row = safe_serialize(ChallengeEnrollmentWithPhaseSerializer, en, many=False)
        row["phases"] = build_phases_with_balances(en)
        challenge_rows.append(row)

    data["challenge_info"] = challenge_rows


    # --- Trades ---
    account_ids = [str(en.mt5_account_id) for en in enrollments if en.mt5_account_id]

    trades_info = {}
    if account_ids:
        for acc_id in account_ids:
            acc_trades = (
                MT5Trade.objects
                .filter(account_id=acc_id)
                .order_by("-open_time")   # ⬅ ensures newest trades first
            )
            trades_info[acc_id] = safe_serialize(MT5TradeSerializer, acc_trades, many=True)

    data["trades_info"] = trades_info

    # --- Payouts ---
    payout_methods = ClientPaymentMethod.objects.filter(client=user).values()
    payouts = user.payouts.all() if hasattr(user, "payouts") else []

    data["payout_info"]["methods"] = list(payout_methods)
    data["payout_info"]["payouts"] = safe_serialize(TraderPayoutSerializer, payouts, many=True)

    # Serialize payout configuration
    if hasattr(user, "payout_config") and user.payout_config:
        data["payout_info"]["config"] = PayoutConfigurationSerializer(user.payout_config).data
    else:
        data["payout_info"]["config"] = None


    # --- Risk breaches ---
    breaches = (
        BreachHistory.objects
        .filter(user=user)
        .select_related("enrollment__challenge")
    )

    data["risk_info"] = safe_serialize(BreachHistorySerializer, breaches, many=True)

    # --- Grouped breaches by enrollment ---
    breach_groups = {}

    for b in breaches:
        en = b.enrollment
        if not en:
            continue

        key = str(en.id)
        if key not in breach_groups:
            breach_groups[key] = {
                "enrollment_id": key,
                "challenge_name": en.challenge.name if en.challenge else None,
                "step_type": en.challenge.step_type if en.challenge else None,
                "account_size": float(en.account_size),
                "currency": en.currency,
                "mt5_account_id": en.mt5_account_id,  # current account on enrollment
                # Optional: include all phase accounts if you want
                "accounts": [
                    {
                        "phase_type": acc.phase_type,
                        "status": acc.status,
                        "mt5_account_id": acc.mt5_account_id,
                    }
                    for acc in getattr(en, "accounts", []).all()
                ] if hasattr(en, "accounts") else [],
                "breaches": []
            }

        breach_groups[key]["breaches"].append({
            "id": str(b.id) if hasattr(b, "id") else None,
            "rule": b.rule,
            "reason": b.reason,
            "previous_state": b.previous_state,
            "breached_at": b.breached_at.isoformat() if b.breached_at else None,
        })

    data["risk_by_challenge"] = list(breach_groups.values())

    # --- Certificates ---
    certs = (
        Certificate.objects
        .filter(user=user)
        .select_related("enrollment__challenge")
    )

    data["certificate_info"] = safe_serialize(CertificateSerializer, certs, many=True)

    # --- Grouped certificates by enrollment ---
    cert_groups = {}

    for c in certs:
        en = c.enrollment
        # If certificate is not tied to a challenge enrollment (e.g., payout-only), skip or group separately
        if not en:
            continue

        key = str(en.id)
        if key not in cert_groups:
            cert_groups[key] = {
                "enrollment_id": key,
                "challenge_name": en.challenge.name if en.challenge else None,
                "step_type": en.challenge.step_type if en.challenge else None,
                "account_size": float(en.account_size),
                "currency": en.currency,
                "mt5_account_id": en.mt5_account_id,
                "certificates": []
            }

        cert_groups[key]["certificates"].append({
            "id": str(c.id),
            "certificate_type": c.certificate_type,
            "title": c.title,
            "image_url": c.image_url,
            "pdf_url": c.pdf_url,
            "issued_date": c.issued_date.isoformat() if c.issued_date else None,
            "expiry_date": c.expiry_date.isoformat() if c.expiry_date else None,
            "metadata": c.metadata,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    data["certificates_by_challenge"] = list(cert_groups.values())


    # --- Notifications ---
    notifications = Notification.objects.filter(user=user)
    data["notifications"] = safe_serialize(NotificationSerializer, notifications, many=True)

    # --- Affiliate info ---
    if hasattr(user, "affiliate_profile"):
        wallet = getattr(user, "affiliate_wallet", None)
        transactions = AffiliateWalletTransaction.objects.filter(wallet=wallet) if wallet else []
        affiliate_data = {
            "profile": safe_serialize(AffiliateProfileSerializer, user.affiliate_profile),
            "wallet": safe_serialize(AffiliateWalletSerializer, wallet),
            "payouts": safe_serialize(AffiliatePayoutSerializer, user.affiliate_payouts.all(), many=True),
            "transactions": safe_serialize(AffiliateWalletTransactionSerializer, transactions, many=True)
        }
        data["affiliate_info"] = affiliate_data

    return Response(data, status=status.HTTP_200_OK)


trader_full_profile.cls.required_permissions = ['traders.view_detail']
