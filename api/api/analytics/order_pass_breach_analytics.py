from datetime import date, datetime, timedelta
from decimal import Decimal

from django.db.models import Count
from django.utils import timezone

from wefund.models import (
    Order,
    ChallengeEnrollment,
    TraderPayout,
    MT5Trade,
    BreachHistory,
)

# Only these rules are counted
BREACH_RULES = ["max_daily_loss", "max_total_loss", "Inactivity"]
PAID_PAYOUT_STATUSES = ["approved", "paid"]


# -------------------------------------------------------------------
# Date range helpers (quick_date + from/to)
# -------------------------------------------------------------------

def _parse_date(value):
    if not value:
        return None
    try:
        # Expecting YYYY-MM-DD
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def _get_date_range(request):
    """
    Returns (from_date, to_date) as datetime.date or (None, None)
    based on:
      - quick_date: last_7_days, last_30_days, last_90_days,
                    this_month, last_month, this_year
      - from_date, to_date: explicit override if provided
    """
    quick = request.GET.get("quick_date")
    from_str = request.GET.get("from_date")
    to_str = request.GET.get("to_date")

    today = timezone.now().date()
    date_from = date_to = None

    # Quick presets
    if quick:
        if quick == "last_7_days":
            date_from = today - timedelta(days=7)
            date_to = today
        elif quick == "last_30_days":
            date_from = today - timedelta(days=30)
            date_to = today
        elif quick == "last_90_days":
            date_from = today - timedelta(days=90)
            date_to = today
        elif quick == "this_month":
            date_from = today.replace(day=1)
            date_to = today
        elif quick == "last_month":
            first_this_month = today.replace(day=1)
            last_month_end = first_this_month - timedelta(days=1)
            date_from = last_month_end.replace(day=1)
            date_to = last_month_end
        elif quick == "this_year":
            date_from = date(today.year, 1, 1)
            date_to = today

    # Explicit overrides if provided
    explicit_from = _parse_date(from_str)
    explicit_to = _parse_date(to_str)

    if explicit_from:
        date_from = explicit_from
    if explicit_to:
        date_to = explicit_to

    return date_from, date_to


# -------------------------------------------------------------------
# Helper: apply dimension filters to enrollments
# -------------------------------------------------------------------

def _filter_enrollments_base(request):
    """
    Base queryset of enrollments with optional filters:
      - program: challenge name icontains
      - country: order.billing_address.country
      - account_size: exact match
      - date_from/to: created_at date
    """
    enrollments = ChallengeEnrollment.objects.all()

    program = request.GET.get("program")
    country = request.GET.get("country")
    account_size = request.GET.get("account_size")
    date_from, date_to = _get_date_range(request)

    if program:
        enrollments = enrollments.filter(challenge__name__icontains=program)

    if country:
        # Use order.billing_address.country as geo source
        enrollments = enrollments.filter(
            order__billing_address__country=country
        )

    if account_size:
        try:
            # account_size is DecimalField
            size_val = Decimal(account_size)
            enrollments = enrollments.filter(account_size=size_val)
        except Exception:
            # If parsing fails, no matches
            enrollments = enrollments.none()

    if date_from:
        enrollments = enrollments.filter(created_at__date__gte=date_from)
    if date_to:
        enrollments = enrollments.filter(created_at__date__lte=date_to)

    return enrollments, date_from, date_to


# -------------------------------------------------------------------
# Helper: compute "started" enrollments (trade_count > 0)
# -------------------------------------------------------------------

def _get_started_count(enrollments, request):
    """
    Start = enrollment has mt5_account_id AND that account has at least 1 trade.
    Trade date can be limited via:
      - trade_from / trade_to OR
      - quick_date / from_date / to_date (applied to close_time)
    """
    # Collect mt5_account_ids from enrollments
    raw_ids = enrollments.values_list("mt5_account_id", flat=True)
    mt5_ids_str = {str(x).strip() for x in raw_ids if x}

    if not mt5_ids_str:
        return 0

    # Convert to integers where possible for MT5Trade.account_id
    account_ids = []
    for s in mt5_ids_str:
        if s.isdigit():
            try:
                account_ids.append(int(s))
            except ValueError:
                continue

    if not account_ids:
        return 0

    trades = MT5Trade.objects.filter(account_id__in=account_ids)

    # Trade-level date filters
    trade_from_str = request.GET.get("trade_from")
    trade_to_str = request.GET.get("trade_to")
    date_from, date_to = _get_date_range(request)

    trade_from = _parse_date(trade_from_str) or date_from
    trade_to = _parse_date(trade_to_str) or date_to

    if trade_from:
        trades = trades.filter(close_time__date__gte=trade_from)
    if trade_to:
        trades = trades.filter(close_time__date__lte=trade_to)

    traded_accounts = set(
        trades.values_list("account_id", flat=True).distinct()
    )

    if not traded_accounts:
        return 0

    traded_ids_str = {str(a) for a in traded_accounts}

    started_enrollments = enrollments.filter(
        mt5_account_id__in=traded_ids_str
    ).count()

    return started_enrollments


# -------------------------------------------------------------------
# Helper: breach analytics (only 3 rules)
# -------------------------------------------------------------------

def _get_breach_analytics(enrollments, date_from, date_to):
    """
    Returns:
      - total breaches for these enrollments
      - breaches by rule (3 types only)
      - breaches by phase (from previous_state)
    """
    breach_qs = BreachHistory.objects.filter(
        rule__in=BREACH_RULES,
        enrollment__in=enrollments,
    )

    if date_from:
        breach_qs = breach_qs.filter(breached_at__date__gte=date_from)
    if date_to:
        breach_qs = breach_qs.filter(breached_at__date__lte=date_to)

    total_breaches = breach_qs.values("enrollment").distinct().count()

    # by rule
    breaches_by_rule = {
        rule: breach_qs.filter(rule=rule)
                       .values("enrollment").distinct().count()
        for rule in BREACH_RULES
    }

    # by phase from previous_state JSON
    # We expect something like previous_state["status"] or ["state"]
    phase_counts = {
        "phase_1_in_progress": 0,
        "phase_2_in_progress": 0,
        "live_in_progress": 0,
    }

    # For performance, we only inspect relevant breaches
    for b in breach_qs.values("previous_state"):
        state = b.get("previous_state") or {}
        status = (
            state.get("status")
            or state.get("state")
            or state.get("enrollment_status")
        )

        if status in phase_counts:
            phase_counts[status] += 1

    return total_breaches, breaches_by_rule, phase_counts


# -------------------------------------------------------------------
# Main analytics function
# -------------------------------------------------------------------

def get_order_pass_breach_analytics(request):
    """
    Core funnel + breach analytics:

    - How many buy (orders)
    - How many start (enrollment + trade)
    - How many pass Phase 1
    - How many pass Phase 2
    - How many reach Live
    - How many get a payout
    - How many get breached (only 3 rules)
    - Conversion rates between each step
    - Breach breakdown by rule + phase

    All of the above respect optional filters:
      - program
      - country
      - account_size
      - quick_date / from_date / to_date
      - trade_from / trade_to (for "start")
    """

    # 1) Dimension + date-filtered enrollments
    enrollments, date_from, date_to = _filter_enrollments_base(request)
    enrollment_ids = enrollments.values_list("id", flat=True)

    # 2) Orders (people who buy)
    #    Distinct orders backing these enrollments
    orders_qs = enrollments.exclude(order_id__isnull=True) \
                           .values("order_id").distinct()
    orders_count = orders_qs.count()

    # 3) Started (enrollment + at least 1 trade)
    started_count = _get_started_count(enrollments, request)

    # 4) Phase passes & live (within filtered enrollments)
    LOGICAL_PHASE1_PASS = [
    "phase_1_passed",
    "phase_2_in_progress",
    "phase_2_passed",
    "live_in_progress",
    "completed",
    ]

    LOGICAL_PHASE2_PASS = [
        "phase_2_passed",
        "live_in_progress",
        "completed",
    ]

    phase1_pass = enrollments.filter(status__in=LOGICAL_PHASE1_PASS).count()
    phase2_pass = enrollments.filter(status__in=LOGICAL_PHASE2_PASS).count()
    live_count = enrollments.filter(status="live_in_progress").count()


    # 5) Payout accounts (approved/paid payouts, limited to these enrollments)
    payout_accounts = (
        TraderPayout.objects.filter(
            challenge_enrollment_id__in=enrollment_ids,
            status__in=PAID_PAYOUT_STATUSES,
        )
        .values("challenge_enrollment_id")
        .distinct()
        .count()
    )

    # 6) Breach analytics (using BreachHistory)
    total_breached, breaches_by_rule, breaches_by_phase = _get_breach_analytics(
        enrollments, date_from, date_to
    )

    # 7) Conversion rates
    def pct(a, b):
        if not b or b == 0:
            return 0.0
        return round((a / b) * 100.0, 2)

    conversions = {
        "buy_to_start_pct": pct(started_count, orders_count),
        "start_to_phase1_pct": pct(phase1_pass, started_count),
        "phase1_to_phase2_pct": pct(phase2_pass, phase1_pass),
        "phase2_to_live_pct": pct(live_count, phase2_pass),
        "live_to_payout_pct": pct(payout_accounts, live_count),
        "start_to_breach_pct": pct(total_breached, started_count),
    }

    # 8) Final structured response
    return {
        "filters": {
            "program": request.GET.get("program"),
            "country": request.GET.get("country"),
            "account_size": request.GET.get("account_size"),
            "quick_date": request.GET.get("quick_date"),
            "from_date": request.GET.get("from_date"),
            "to_date": request.GET.get("to_date"),
            "trade_from": request.GET.get("trade_from"),
            "trade_to": request.GET.get("trade_to"),
        },
        "overview": {
            "orders": orders_count,
            "starts": started_count,
            "phase1_pass": phase1_pass,
            "phase2_pass": phase2_pass,
            "live": live_count,
            "payout_accounts": payout_accounts,
            "breached_accounts": total_breached,
        },
        "conversions": conversions,
        "breaches": {
            "total": total_breached,
            "by_rule": breaches_by_rule,
            "by_phase": breaches_by_phase,
        },
    }
