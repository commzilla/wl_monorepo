from datetime import timedelta
from calendar import monthrange

from django.utils import timezone
from dateutil.relativedelta import relativedelta


def _clamp_day(year: int, month: int, day: int) -> int:
    last = monthrange(year, month)[1]
    return min(day, last)


def compute_next_withdrawal_datetime(cfg, base_dt):
    """
    base_dt: datetime (aware preferred). We advance from this moment according to cfg.payment_cycle.
    Returns: datetime
    """
    if timezone.is_naive(base_dt):
        base_dt = timezone.make_aware(base_dt, timezone.get_current_timezone())

    cycle = cfg.payment_cycle

    if cycle == "biweekly":
        return base_dt + timedelta(days=14)

    if cycle == "custom_interval":
        days = cfg.custom_cycle_days or 14
        return base_dt + timedelta(days=days)

    if cycle == "monthly":
        return base_dt + relativedelta(months=1)

    if cycle == "custom_days":
        # Example: [5, 20] => next in same month if possible, otherwise next month
        days = sorted(set(cfg.custom_payout_days or []))
        if not days:
            # fallback if misconfigured
            return base_dt + relativedelta(months=1)

        y, m = base_dt.year, base_dt.month
        d = base_dt.day

        # find next day in current month strictly after current day
        next_day = next((x for x in days if x > d), None)

        if next_day is None:
            # move to next month and take the first configured day
            next_month_dt = base_dt + relativedelta(months=1)
            y, m = next_month_dt.year, next_month_dt.month
            next_day = days[0]

        next_day = _clamp_day(y, m, next_day)

        return base_dt.replace(year=y, month=m, day=next_day)

    # default fallback
    return base_dt + relativedelta(months=1)
