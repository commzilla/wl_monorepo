# collectors.py
from datetime import datetime, timedelta
from django.utils import timezone
from django.utils.timezone import make_aware

from wefund.models import MT5Trade, TraderPayout, EnrollmentAccount


def get_mt5_account_for_payout(payout):
    enrollment = payout.challenge_enrollment
    if not enrollment:
        return None

    acct = (
        EnrollmentAccount.objects.filter(
            enrollment=enrollment,
            status="active",
            phase_type="live-trader",
        )
        .order_by("-created_at")
        .first()
    )

    if acct and acct.mt5_account_id:
        return acct.mt5_account_id

    return enrollment.mt5_account_id


def safe_make_aware(date_obj):
    """Safely converts a date->datetime into timezone-aware datetime."""
    dt = datetime.combine(date_obj, datetime.min.time())
    return timezone.make_aware(dt) if timezone.is_naive(dt) else dt


def get_payout_period(payout):
    end_dt = payout.requested_at or timezone.now()

    previous = (
        TraderPayout.objects.filter(
            trader=payout.trader,
            challenge_enrollment=payout.challenge_enrollment,
            requested_at__lt=end_dt
        )
        .order_by("-requested_at")
        .first()
    )

    if previous:
        start_dt = previous.requested_at
    else:
        enrollment = payout.challenge_enrollment
        if enrollment and enrollment.live_start_date:
            start_dt = safe_make_aware(enrollment.live_start_date)
        else:
            start_dt = end_dt - timedelta(days=30)

    return start_dt, end_dt


def get_trades_for_payout(payout):
    account_id = get_mt5_account_for_payout(payout)
    if not account_id:
        return None, None

    start_dt, end_dt = get_payout_period(payout)

    trades = MT5Trade.objects.filter(
        account_id=account_id,
        close_time__gte=start_dt,
        close_time__lte=end_dt,
        is_closed=True,
    ).order_by("close_time")

    return trades, account_id
