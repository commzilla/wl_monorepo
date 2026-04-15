from django.db.models import (
    Sum, Count, Avg, Case, When, F, DecimalField, Q
)
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from wefund.models import (
    ChallengeEnrollment,
    Challenge,
    Order,
    TraderPayout,
    MT5Trade,
    StopLossChange,
)


PAYOUT_STATUSES = ["approved", "paid"]


# ------------------------------------------------------------------------------
# FILTERS
# ------------------------------------------------------------------------------

def apply_filters(enrollments, request):
    """
    Apply filters for:
    - program: 1-step, 2-step, 10x
    - country: billing_address.country
    - account_size: numeric amount
    """
    program = request.GET.get("program")
    country = request.GET.get("country")
    account_size = request.GET.get("account_size")

    if program:
        enrollments = enrollments.filter(challenge__name__iexact=program)


    if country:
        enrollments = enrollments.filter(order__billing_address__country=country)

    if account_size:
        enrollments = enrollments.filter(account_size=account_size)

    return enrollments


# ------------------------------------------------------------------------------
# PAYOUT METRICS
# ------------------------------------------------------------------------------

def payout_trends(payouts):
    """
    Returns: (daily, weekly, monthly) payout counts.
    """
    now = timezone.now()

    daily = payouts.filter(requested_at__date=now.date()).count()
    weekly = payouts.filter(requested_at__gte=now - timedelta(days=7)).count()
    monthly = payouts.filter(requested_at__gte=now - timedelta(days=30)).count()

    return daily, weekly, monthly


def payout_approval_rate(payouts):
    total = payouts.count()
    approved = payouts.filter(status="approved").count()

    return (approved / total * 100) if total > 0 else 0


def average_payout(payouts):
    """
    We use released_fund if > 0, else fallback to net_profit.
    """
    total_amount = (
        payouts.aggregate(
            total=Sum(
                Case(
                    When(released_fund__gt=0, then=F("released_fund")),
                    default=F("net_profit"),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                )
            )
        )["total"] or Decimal("0")
    )

    count = payouts.count()
    return total_amount / count if count > 0 else Decimal("0")


# ------------------------------------------------------------------------------
# REVENUE METRICS
# ------------------------------------------------------------------------------

def revenue_trends(orders):
    now = timezone.now()

    daily = orders.filter(date_created__date=now.date()) \
                  .aggregate(total=Sum("paid_usd"))["total"] or Decimal(0)

    weekly = orders.filter(date_created__gte=now - timedelta(days=7)) \
                   .aggregate(total=Sum("paid_usd"))["total"] or Decimal(0)

    monthly = orders.filter(date_created__gte=now - timedelta(days=30)) \
                    .aggregate(total=Sum("paid_usd"))["total"] or Decimal(0)

    return daily, weekly, monthly


# ------------------------------------------------------------------------------
# TRADING BEHAVIOR METRICS
# ------------------------------------------------------------------------------

def top_instruments(trades):
    """
    Finds top traded symbols for payout accounts.
    """
    return list(
        trades.values("symbol")
              .annotate(total=Count("symbol"))
              .order_by("-total")[:10]
    )


def stop_loss_usage_rate(trades, sl_changes):
    """
    SL usage = trades with SL set OR trades with SL modified
    """
    total_trades = trades.count()
    if total_trades == 0:
        return 0

    trades_with_sl = trades.exclude(sl=0).count()
    trades_with_sl_changes = sl_changes.values("position_id").distinct().count()

    used_sl = trades_with_sl + trades_with_sl_changes
    return (used_sl / total_trades) * 100


def avg_payout_vs_avg_volume(payouts, trades):
    avg_payout = average_payout(payouts)
    avg_volume = trades.aggregate(avg=Avg("volume"))["avg"] or 0

    return float(avg_payout) / float(avg_volume) if avg_volume > 0 else 0


# ------------------------------------------------------------------------------
# MAIN AGGREGATION FUNCTION
# ------------------------------------------------------------------------------

def get_risk_core_metrics(request):
    """
    Generates full risk analytics response based on:
    - payouts
    - revenue
    - trading behavior
    - SL usage
    - top instruments
    """

    # Base queryset of all enrollments
    enrollments = ChallengeEnrollment.objects.filter(is_active=True)
    enrollments = apply_filters(enrollments, request)

    enrollment_ids = enrollments.values_list("id", flat=True)
    order_ids = enrollments.values_list("order_id", flat=True)

    # FIX: mt5_account_id is a CharField → convert to int for MT5Trade queries
    raw_ids = enrollments.values_list("mt5_account_id", flat=True)
    account_ids = [
        int(x) for x in raw_ids 
        if x and str(x).isdigit()
    ]


    # FILTERED QUERIES
    orders = Order.objects.filter(id__in=order_ids, payment_status="paid")

    payouts = TraderPayout.objects.filter(
        challenge_enrollment_id__in=enrollment_ids,
        status__in=PAYOUT_STATUSES
    )

    trades = MT5Trade.objects.filter(account_id__in=account_ids)
    sl_changes = StopLossChange.objects.filter(login__in=account_ids)

    # PAYOUT METRICS
    payout_daily, payout_weekly, payout_monthly = payout_trends(payouts)
    approval_rate = payout_approval_rate(payouts)
    avg_payout_amount = average_payout(payouts)

    # REVENUE METRICS
    rev_daily, rev_weekly, rev_monthly = revenue_trends(orders)

    # TRADING METRICS
    instruments = top_instruments(trades)
    sl_usage = stop_loss_usage_rate(trades, sl_changes)
    payout_vs_volume = avg_payout_vs_avg_volume(payouts, trades)

    # FINAL RESPONSE
    return {
    "available_programs": list(
        Challenge.objects.filter(is_active=True)
        .values_list("name", flat=True)
    ),

    "filters": {
        "program": request.GET.get("program"),
        "country": request.GET.get("country"),
        "account_size": request.GET.get("account_size"),
    },

    "payout_metrics": {
        "payouts_daily": payout_daily,
        "payouts_weekly": payout_weekly,
        "payouts_monthly": payout_monthly,
        "payout_approval_rate": round(approval_rate, 2),
        "average_payout_amount": str(avg_payout_amount),
    },

    "revenue_metrics": {
        "revenue_daily": str(rev_daily),
        "revenue_weekly": str(rev_weekly),
        "revenue_monthly": str(rev_monthly),
        "revenue_vs_payout_ratio":
            float(rev_monthly) / payout_monthly if payout_monthly else 0,
    },

    "trading_behavior": {
        "top_instruments": instruments,
        "stop_loss_usage_rate": round(sl_usage, 2),
        "avg_payout_vs_avg_volume": round(payout_vs_volume, 3),
    }
}

