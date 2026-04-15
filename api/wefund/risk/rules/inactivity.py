import datetime
from django.utils import timezone
from wefund.models import MT5Trade, BreachHistory, TraderPayout
from wefund.risk.utils import get_open_trades
from wefund.risk.breach_handler import handle_breach


def get_phase_start_date(enrollment):
    """
    Returns the correct phase start date depending on Phase 1, Phase 2, or Live.
    Ensures the returned value is ALWAYS a date object.
    """

    status = enrollment.status

    # ----- PHASE 1 -----
    if status == "phase_1_in_progress":
        return enrollment.start_date  # already a date

    # ----- PHASE 2 -----
    if status == "phase_2_in_progress":
        log = (
            enrollment.transition_logs
            .filter(from_status="phase_1_passed", to_status="phase_2_in_progress")
            .order_by("-created_at")
            .first()
        )
        if log:
            return log.created_at.date()  # correct phase 2 start
        return enrollment.start_date

    # ----- LIVE -----
    if status == "live_in_progress":
        if enrollment.live_start_date:
            return enrollment.live_start_date  # date

        # Check for transition to live from either phase_1_passed (1-step)
        # or phase_2_passed (2-step)
        log = (
            enrollment.transition_logs
            .filter(to_status="live_in_progress")
            .order_by("-created_at")
            .first()
        )
        if log:
            return log.created_at.date()
        return enrollment.start_date

    # FALLBACK
    return enrollment.start_date


def run(enrollment):
    """
    Inactivity Rule:
    - Breach only if 30+ days have passed since phase start
    - AND no open trades
    - AND no closed trades in the last 30 days
    """

    if not enrollment.mt5_account_id:
        return

    # Only check inactivity for accounts actively in a phase
    if enrollment.status not in ("phase_1_in_progress", "phase_2_in_progress", "live_in_progress"):
        return

    now = timezone.now()
    today = now.date()

    if BreachHistory.objects.filter(
        enrollment=enrollment,
        rule="Inactivity",
        breached_at__date=today
    ).exists():
        return
    
    inactivity_limit = now - datetime.timedelta(days=30)

    # Unified reference date
    reference_start_date = get_phase_start_date(enrollment)
    if not reference_start_date:
        return

    # Convert to DATE for consistent comparison
    inactivity_limit_date = inactivity_limit.date()

    # Skip if phase is less than 30 days old
    if reference_start_date >= inactivity_limit_date:
        return

    account_id = int(enrollment.mt5_account_id)

    # ACTIVE TRADES CHECK
    open_trades = get_open_trades(account_id)
    if open_trades:
        return

    # LAST CLOSED TRADE CHECK
    last_closed_trade = (
        MT5Trade.objects
        .filter(account_id=account_id, close_time__isnull=False)
        .order_by("-close_time")
        .first()
    )

    # NO TRADES ON THIS ACCOUNT → countdown hasn't started
    if not last_closed_trade:
        return

    # PAYOUT CHECK — pause clock while payout is pending, reset on approval
    active_payout = (
        TraderPayout.objects
        .filter(
            challenge_enrollment=enrollment,
            status__in=["pending", "extended_review"],
        )
        .exists()
    )
    if active_payout:
        return  # clock is paused while a payout decision is pending

    # Check if an approved/paid payout resets the clock
    latest_approved_payout = (
        TraderPayout.objects
        .filter(
            challenge_enrollment=enrollment,
            status__in=["approved", "paid"],
            reviewed_at__isnull=False,
        )
        .order_by("-reviewed_at")
        .first()
    )

    # Use the most recent event (last trade close OR payout approval) as baseline
    last_activity = last_closed_trade.close_time
    if latest_approved_payout and latest_approved_payout.reviewed_at > last_activity:
        last_activity = latest_approved_payout.reviewed_at

    # LAST ACTIVITY IS > 30 DAYS OLD
    if last_activity < inactivity_limit:
        days_inactive = (now - last_activity).days
        reason = (
            "No trading activity (open or closed) in the last 30 days.\n"
            f"Last Closed Trade: {last_closed_trade.close_time.strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"Days Inactive: {days_inactive} days."
        )
        if latest_approved_payout and latest_approved_payout.reviewed_at > last_closed_trade.close_time:
            reason += f"\nLast Payout Approved: {latest_approved_payout.reviewed_at.strftime('%Y-%m-%d %H:%M:%S')}"
        handle_breach(enrollment, rule="Inactivity", reason=reason)
