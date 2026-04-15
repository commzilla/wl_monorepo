from datetime import timedelta
from django.db.models import Sum, Count, Case, When, F, DecimalField
from django.utils import timezone
from decimal import Decimal

from wefund.models import Order, TraderPayout, ChallengeEnrollment


PAYOUT_STATUSES = ["approved", "paid"]


def _last_days(days=30):
    now = timezone.now()
    start = now - timedelta(days=days)
    return start.date(), now.date()


def _last_weeks(weeks=12):
    now = timezone.now()
    start = now - timedelta(weeks=weeks)
    return start.date(), now.date()


def _last_months(months=12):
    now = timezone.now()
    start = now.replace(year=now.year, month=max(1, now.month - months))
    return start.date(), now.date()


def _daterange(start_date, end_date):
    for n in range((end_date - start_date).days + 1):
        yield start_date + timedelta(n)


# -------------------------------------------------------------
# COMMON HELPERS
# -------------------------------------------------------------

def _safe_payout_value_qs():
    return Case(
        When(released_fund__gt=0, then=F("released_fund")),
        default=F("net_profit"),
        output_field=DecimalField(max_digits=12, decimal_places=2)
    )


# -------------------------------------------------------------
# DAILY TREND (30 days)
# -------------------------------------------------------------

def get_daily_trends():
    start, end = _last_days(30)

    # Base QuerySets
    orders = Order.objects.filter(
        payment_status="paid",
        date_created__date__gte=start
    )

    payouts = TraderPayout.objects.filter(
        status__in=PAYOUT_STATUSES,
        requested_at__date__gte=start
    )

    enrollments = ChallengeEnrollment.objects.filter(
        created_at__date__gte=start
    )

    daily_data = []

    for day in _daterange(start, end):
        # Revenue
        revenue = (
            orders.filter(date_created__date=day)
                  .aggregate(total=Sum("paid_usd"))["total"] or Decimal("0")
        )

        # Payouts
        payout_val = (
            payouts.filter(requested_at__date=day)
                   .aggregate(total=Sum(_safe_payout_value_qs()))["total"] or Decimal("0")
        )

        # Profit
        profit = revenue - payout_val

        # Challenges Sold
        challenges_sold = enrollments.filter(created_at__date=day).count()

        daily_data.append({
            "date": str(day),
            "revenue": revenue,
            "payouts": payout_val,
            "profit": profit,
            "challenges_sold": challenges_sold,
        })

    return daily_data


# -------------------------------------------------------------
# WEEKLY TREND (12 weeks)
# -------------------------------------------------------------

def get_weekly_trends():
    start, end = _last_weeks(12)
    now = timezone.now()

    trends = []

    for i in range(12):
        week_start = (now - timedelta(weeks=i+1)).date()
        week_end = (now - timedelta(weeks=i)).date()

        # Revenue
        revenue = (
            Order.objects.filter(
                payment_status="paid",
                date_created__date__range=[week_start, week_end]
            ).aggregate(total=Sum("paid_usd"))["total"] or Decimal("0")
        )

        payouts = (
            TraderPayout.objects.filter(
                status__in=PAYOUT_STATUSES,
                requested_at__date__range=[week_start, week_end]
            ).aggregate(total=Sum(_safe_payout_value_qs()))["total"] or Decimal("0")
        )

        profit = revenue - payouts

        challenges_sold = ChallengeEnrollment.objects.filter(
            created_at__date__range=[week_start, week_end]
        ).count()

        trends.append({
            "week": f"{week_start} → {week_end}",
            "revenue": revenue,
            "payouts": payouts,
            "profit": profit,
            "challenges_sold": challenges_sold,
        })

    return trends


# -------------------------------------------------------------
# MONTHLY TREND (last 12 months)
# -------------------------------------------------------------

def get_monthly_trends():
    now = timezone.now()
    trends = []

    for i in range(12):
        month = (now.month - i - 1) % 12 + 1
        year = now.year - ((now.month - i - 1) // 12)

        start_date = timezone.datetime(year, month, 1).date()

        # Next month
        if month == 12:
            end_date = timezone.datetime(year + 1, 1, 1).date() - timedelta(days=1)
        else:
            end_date = timezone.datetime(year, month + 1, 1).date() - timedelta(days=1)

        revenue = (
            Order.objects.filter(
                payment_status="paid",
                date_created__date__range=[start_date, end_date]
            ).aggregate(total=Sum("paid_usd"))["total"] or Decimal("0")
        )

        payouts = (
            TraderPayout.objects.filter(
                status__in=PAYOUT_STATUSES,
                requested_at__date__range=[start_date, end_date]
            ).aggregate(total=Sum(_safe_payout_value_qs()))["total"] or Decimal("0")
        )

        profit = revenue - payouts

        challenges_sold = ChallengeEnrollment.objects.filter(
            created_at__date__range=[start_date, end_date]
        ).count()

        trends.append({
            "month": f"{year}-{month:02d}",
            "revenue": revenue,
            "payouts": payouts,
            "profit": profit,
            "challenges_sold": challenges_sold,
        })

    return trends


# -------------------------------------------------------------
# MAIN EXPORT FUNCTION
# -------------------------------------------------------------

def get_trends_analytics():
    return {
        "daily": get_daily_trends(),
        "weekly": get_weekly_trends(),
        "monthly": get_monthly_trends(),
    }
