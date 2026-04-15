"""
Trading Reports — Top-5 leaderboard generation across 9 key metrics.

Metrics:
  1. Highest Payout
  2. Best Trade
  3. Best ROI %
  4. Most Profitable Trader
  5. Most Active Trader
  6. Fastest Phase Completion
  7. Most Traded Pairs
  8. Quickest 2-Step Challenge
  9. Fastest to Payout
"""

import logging
from datetime import datetime, time
from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Sum, Count, F, DecimalField, DateTimeField, ExpressionWrapper
from django.db.models.functions import Coalesce

from wefund.models import (
    TraderPayout,
    MT5Trade,
    ChallengeEnrollment,
    EnrollmentAccount,
    EnrollmentTransitionLog,
    TradingReport,
)

logger = logging.getLogger(__name__)

TOP_N = 5
PAYOUT_CONFIRMED_STATUSES = ["approved", "paid"]


def _user_display(user):
    """Return a dict with trader identification fields."""
    if user is None:
        return {"trader_username": "Unknown", "trader_email": ""}
    name = f"{user.first_name} {user.last_name}".strip() or user.email.split("@")[0]
    return {"trader_username": name, "trader_email": user.email}


def _enrollment_user(account_id):
    """Resolve an MT5 account_id → User via ChallengeEnrollment or EnrollmentAccount."""
    aid = str(account_id)
    # Try direct match on ChallengeEnrollment first
    enrollment = (
        ChallengeEnrollment.objects.filter(mt5_account_id=aid)
        .select_related("client__user")
        .first()
    )
    if enrollment and enrollment.client:
        return enrollment.client.user
    # Fallback: check per-phase EnrollmentAccount records
    ea = (
        EnrollmentAccount.objects.filter(mt5_account_id=aid)
        .select_related("enrollment__client__user")
        .first()
    )
    if ea and ea.enrollment and ea.enrollment.client:
        return ea.enrollment.client.user
    return None


# ── Metric helpers ────────────────────────────────────────────────

def highest_payouts(period_start, period_end):
    """Top 5 confirmed payouts by net_profit in the period."""
    qs = (
        TraderPayout.objects.filter(status__in=PAYOUT_CONFIRMED_STATUSES)
        .annotate(
            effective_date=Coalesce(
                "paid_at", "reviewed_at", "requested_at",
                output_field=DateTimeField(),
            )
        )
        .filter(
            effective_date__date__gte=period_start,
            effective_date__date__lte=period_end,
        )
        .select_related("trader", "challenge_enrollment")
        .order_by("-net_profit")[:TOP_N]
    )
    entries = []
    for rank, p in enumerate(qs, 1):
        user_info = _user_display(p.trader)
        entries.append({
            "rank": rank,
            **user_info,
            "value": float(p.net_profit or 0),
            "details": {
                "payout_id": str(p.id),
                "gross_profit": float(p.profit or 0),
                "account_size": float(p.challenge_enrollment.account_size) if p.challenge_enrollment else None,
            },
        })
    return entries


def best_trades(period_start, period_end):
    """Top 5 single closed trades by profit."""
    qs = (
        MT5Trade.objects.filter(
            is_closed=True,
            close_time__date__gte=period_start,
            close_time__date__lte=period_end,
        )
        .order_by("-profit")[:TOP_N]
    )
    entries = []
    for rank, t in enumerate(qs, 1):
        user = _enrollment_user(t.account_id)
        user_info = _user_display(user)
        entries.append({
            "rank": rank,
            **user_info,
            "value": float(t.profit),
            "details": {
                "symbol": t.symbol,
                "volume": float(t.volume),
                "account_id": t.account_id,
                "order": t.order,
            },
        })
    return entries


def best_roi(period_start, period_end):
    """Top 5 confirmed payouts by ROI % (net_profit / account_size * 100)."""
    qs = (
        TraderPayout.objects.filter(
            status__in=PAYOUT_CONFIRMED_STATUSES,
            challenge_enrollment__isnull=False,
            challenge_enrollment__account_size__gt=0,
        )
        .annotate(
            effective_date=Coalesce(
                "paid_at", "reviewed_at", "requested_at",
                output_field=DateTimeField(),
            )
        )
        .filter(
            effective_date__date__gte=period_start,
            effective_date__date__lte=period_end,
        )
        .select_related("trader", "challenge_enrollment")
        .annotate(
            roi=ExpressionWrapper(
                F("net_profit") * Decimal("100") / F("challenge_enrollment__account_size"),
                output_field=DecimalField(max_digits=10, decimal_places=2),
            )
        )
        .order_by("-roi")[:TOP_N]
    )
    entries = []
    for rank, p in enumerate(qs, 1):
        user_info = _user_display(p.trader)
        entries.append({
            "rank": rank,
            **user_info,
            "value": float(p.roi.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if isinstance(p.roi, Decimal) else round(p.roi, 2)),
            "details": {
                "net_profit": float(p.net_profit or 0),
                "account_size": float(p.challenge_enrollment.account_size),
            },
        })
    return entries


def _live_account_ids():
    """Return a set of MT5 account_id ints belonging to live-phase enrollments."""
    live_statuses = ["live_in_progress", "completed"]
    ids = set()
    # ChallengeEnrollment main account
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
    # Per-phase live accounts
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


def most_profitable_traders(period_start, period_end):
    """Top 5 traders by sum of closed-trade profit on live-phase accounts."""
    live_ids = _live_account_ids()
    if not live_ids:
        return []
    qs = (
        MT5Trade.objects.filter(
            is_closed=True,
            close_time__date__gte=period_start,
            close_time__date__lte=period_end,
            account_id__in=live_ids,
        )
        .values("account_id")
        .annotate(total_profit=Coalesce(Sum("profit"), Decimal("0")))
        .order_by("-total_profit")[:TOP_N]
    )
    entries = []
    for rank, row in enumerate(qs, 1):
        user = _enrollment_user(row["account_id"])
        user_info = _user_display(user)
        entries.append({
            "rank": rank,
            **user_info,
            "value": float(row["total_profit"]),
            "details": {"account_id": row["account_id"]},
        })
    return entries


def most_active_traders(period_start, period_end):
    """Top 5 traders by number of closed trades."""
    qs = (
        MT5Trade.objects.filter(
            is_closed=True,
            close_time__date__gte=period_start,
            close_time__date__lte=period_end,
        )
        .values("account_id")
        .annotate(trade_count=Count("id"))
        .order_by("-trade_count")[:TOP_N]
    )
    entries = []
    for rank, row in enumerate(qs, 1):
        user = _enrollment_user(row["account_id"])
        user_info = _user_display(user)
        entries.append({
            "rank": rank,
            **user_info,
            "value": row["trade_count"],
            "details": {"account_id": row["account_id"]},
        })
    return entries


def fastest_phase_completions(period_start, period_end):
    """Top 5 fastest challenge completions (fewest minutes from start to passed/completed).

    Uses EnrollmentTransitionLog timestamps for precision.  Starts from
    transition logs within the period to avoid loading all enrollments.
    """
    passed_statuses = [
        "phase_1_passed", "phase_2_passed", "live_in_progress", "completed",
    ]
    transitions = (
        EnrollmentTransitionLog.objects.filter(
            to_status__in=passed_statuses,
            created_at__date__gte=period_start,
            created_at__date__lte=period_end,
        )
        .select_related("enrollment__client__user", "enrollment__challenge")
        .order_by("enrollment", "created_at")
    )

    # Keep the transition matching the enrollment's current status (latest wins).
    # This measures time to reach the enrollment's final achieved status,
    # not just the first phase pass.
    seen_enrollments = {}
    for t in transitions:
        if t.to_status == t.enrollment.status:
            # Overwrite to keep the latest transition (ordered by created_at ASC)
            seen_enrollments[t.enrollment_id] = t

    scored = []
    for eid, t in seen_enrollments.items():
        enrollment = t.enrollment
        if not enrollment.start_date:
            continue
        start_dt = enrollment.created_at
        end_dt = t.created_at
        total_minutes = (end_dt - start_dt).total_seconds() / 60
        if total_minutes < 0:
            continue
        scored.append((total_minutes, enrollment, end_dt))

    scored.sort(key=lambda x: x[0])
    entries = []
    for rank, (minutes, e, end_dt) in enumerate(scored[:TOP_N], 1):
        user = e.client.user if e.client else None
        user_info = _user_display(user)
        entries.append({
            "rank": rank,
            **user_info,
            "value": round(minutes, 1),
            "details": {
                "enrollment_id": str(e.id),
                "challenge_name": str(e.challenge) if e.challenge else "",
                "account_size": float(e.account_size),
                "start_date": str(e.created_at),
                "completed_date": str(end_dt),
                "status": e.status,
            },
        })
    return entries


def most_traded_pairs(period_start, period_end):
    """Top 5 most traded symbols by trade count in the period."""
    qs = (
        MT5Trade.objects.filter(
            is_closed=True,
            close_time__date__gte=period_start,
            close_time__date__lte=period_end,
        )
        .values("symbol")
        .annotate(trade_count=Count("id"))
        .order_by("-trade_count")[:TOP_N]
    )
    entries = []
    for rank, row in enumerate(qs, 1):
        entries.append({
            "rank": rank,
            "trader_username": row["symbol"],
            "trader_email": "",
            "value": row["trade_count"],
            "details": {},
        })
    return entries


def quickest_2step_challenge(period_start, period_end):
    """Top 5 fastest 2-step challenge completions (fewest minutes from enrollment to passing).

    Measures duration from enrollment.created_at to the transition log entry
    where the enrollment reached a passed/live status.
    """
    passed_statuses = [
        "phase_2_passed", "live_in_progress", "completed",
    ]
    # Find transition logs within the period for 2-step enrollments
    transitions = (
        EnrollmentTransitionLog.objects.filter(
            to_status__in=passed_statuses,
            enrollment__challenge__step_type="2-step",
            created_at__date__gte=period_start,
            created_at__date__lte=period_end,
        )
        .select_related("enrollment__client__user", "enrollment__challenge")
        .order_by("enrollment", "created_at")
    )

    # Keep earliest qualifying transition per enrollment
    seen_enrollments = {}
    for t in transitions:
        eid = t.enrollment_id
        if eid not in seen_enrollments:
            seen_enrollments[eid] = t

    scored = []
    for eid, t in seen_enrollments.items():
        enrollment = t.enrollment
        start_dt = enrollment.created_at
        end_dt = t.created_at
        total_minutes = (end_dt - start_dt).total_seconds() / 60
        if total_minutes < 0:
            continue
        scored.append((total_minutes, enrollment, end_dt))

    scored.sort(key=lambda x: x[0])
    entries = []
    for rank, (minutes, enrollment, end_dt) in enumerate(scored[:TOP_N], 1):
        user = enrollment.client.user if enrollment.client else None
        user_info = _user_display(user)
        entries.append({
            "rank": rank,
            **user_info,
            "value": round(minutes, 1),
            "details": {
                "enrollment_id": str(enrollment.id),
                "challenge_name": str(enrollment.challenge) if enrollment.challenge else "",
                "account_size": float(enrollment.account_size),
                "start_date": str(enrollment.created_at),
                "completed_date": str(end_dt),
            },
        })
    return entries


def fastest_phase_to_payout(period_start, period_end):
    """Top 5 fastest times from phase completion (going live) to payout confirmation.

    Measures duration from the 'live_in_progress' transition timestamp
    to the payout's effective date (paid_at / reviewed_at / requested_at).
    Uses the same Coalesce date logic as highest_payouts / best_roi.
    """
    payouts = list(
        TraderPayout.objects.filter(
            status__in=PAYOUT_CONFIRMED_STATUSES,
            challenge_enrollment__isnull=False,
        )
        .annotate(
            effective_date=Coalesce(
                "paid_at", "reviewed_at", "requested_at",
                output_field=DateTimeField(),
            )
        )
        .filter(
            effective_date__date__gte=period_start,
            effective_date__date__lte=period_end,
        )
        .select_related("trader", "challenge_enrollment")
    )

    # Batch-fetch transition logs for all relevant enrollments (avoid N+1)
    enrollment_ids = [p.challenge_enrollment_id for p in payouts]
    transition_map = {}
    if enrollment_ids:
        for t in (
            EnrollmentTransitionLog.objects.filter(
                enrollment_id__in=enrollment_ids,
                to_status="live_in_progress",
            )
            .order_by("enrollment_id", "created_at")
        ):
            # Keep earliest transition per enrollment
            if t.enrollment_id not in transition_map:
                transition_map[t.enrollment_id] = t

    scored = []
    for p in payouts:
        enrollment = p.challenge_enrollment
        transition = transition_map.get(enrollment.id)
        if transition:
            phase_completion_dt = transition.created_at
        elif enrollment.live_start_date:
            # Fall back to live_start_date (DateField → naive datetime at midnight)
            phase_completion_dt = datetime.combine(enrollment.live_start_date, time.min)
        else:
            phase_completion_dt = enrollment.updated_at

        total_minutes = (p.effective_date - phase_completion_dt).total_seconds() / 60
        if total_minutes < 0:
            continue
        scored.append((total_minutes, p))

    scored.sort(key=lambda x: x[0])
    entries = []
    for rank, (minutes, p) in enumerate(scored[:TOP_N], 1):
        user_info = _user_display(p.trader)
        entries.append({
            "rank": rank,
            **user_info,
            "value": round(minutes, 1),
            "details": {
                "payout_id": str(p.id),
                "enrollment_id": str(p.challenge_enrollment_id),
                "payout_date": str(p.effective_date),
            },
        })
    return entries


# ── Main generator ────────────────────────────────────────────────

METRICS = [
    ("highest_payout", "Highest Payout", highest_payouts),
    ("best_trade", "Best Trade", best_trades),
    ("best_roi", "Best ROI %", best_roi),
    ("most_profitable_trader", "Most Profitable Trader", most_profitable_traders),
    ("most_active_trader", "Most Active Trader", most_active_traders),
    ("fastest_phase_completion", "Fastest Phase Completion", fastest_phase_completions),
    ("most_traded_pairs", "Most Traded Pairs", most_traded_pairs),
    ("quickest_2step", "Quickest 2-Step Challenge", quickest_2step_challenge),
    ("fastest_to_payout", "Fastest to Payout", fastest_phase_to_payout),
]


def generate_trading_report(period_start, period_end, period_type, user=None, is_auto=False):
    """
    Compute all 9 metrics and persist a TradingReport.
    Returns the created TradingReport instance.
    """
    logger.info(
        "Generating %s trading report: %s – %s (by=%s, auto=%s)",
        period_type, period_start, period_end,
        user.email if user else "system", is_auto,
    )

    metrics_data = []
    for metric_name, metric_label, compute_fn in METRICS:
        try:
            entries = compute_fn(period_start, period_end)
        except Exception:
            logger.exception("Error computing metric %s", metric_name)
            entries = []
        metrics_data.append({
            "metric_name": metric_name,
            "metric_label": metric_label,
            "entries": entries,
        })

    report = TradingReport.objects.create(
        period_type=period_type,
        period_start=period_start,
        period_end=period_end,
        generated_by=user,
        data={"metrics": metrics_data},
        is_auto_generated=is_auto,
    )
    logger.info("TradingReport %s created successfully.", report.id)
    return report



# Metrics where entries represent non-PII data (e.g. symbols) not traders.
_NON_TRADER_METRICS = {"most_traded_pairs"}


def anonymize_report_data(data):
    """Return a copy of report data with trader names/emails replaced."""
    import copy
    anon = copy.deepcopy(data)
    for metric in anon.get("metrics", []):
        if metric.get("metric_name") in _NON_TRADER_METRICS:
            continue
        for entry in metric.get("entries", []):
            entry["trader_username"] = f"Trader #{entry['rank']}"
            entry["trader_email"] = ""
    return anon
