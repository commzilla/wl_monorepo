from django.db.models import Sum, Q
from decimal import Decimal
from wefund.models import Order, ChallengeEnrollment, TraderPayout

FUNDED_STATUSES = ['live_in_progress']
PAID_PAYOUT_STATUSES = ['approved', 'paid']


def get_country_wise_payout_analytics():
    results = []

    # Extract unique countries from orders
    countries = (
        Order.objects.exclude(billing_address__country__isnull=True)
        .exclude(billing_address__country="")
        .values_list("billing_address__country", flat=True)
        .distinct()
    )

    for country in countries:
        # Orders for this country
        orders = Order.objects.filter(
            billing_address__country=country,
            payment_status="paid"
        )

        order_ids = orders.values_list("id", flat=True)

        # Revenue
        total_revenue = (
            orders.aggregate(total=Sum("paid_usd"))["total"]
            or Decimal("0")
        )

        # Enrollments tied to these orders
        enrollments = ChallengeEnrollment.objects.filter(order_id__in=order_ids)
        enrollment_ids = enrollments.values_list("id", flat=True)

        # Payouts belonging to this group
        payout_qs = TraderPayout.objects.filter(
            challenge_enrollment_id__in=enrollment_ids,
            status__in=PAID_PAYOUT_STATUSES
        )

        total_payouts = (
            payout_qs.aggregate(total=Sum("released_fund"))["total"]
            or Decimal("0")
        )

        payout_count = payout_qs.count()

        # Average payout
        avg_payout = (
            total_payouts / payout_count
            if payout_count > 0 else Decimal("0")
        )

        # Funded accounts
        funded_accounts = enrollments.filter(
            status__in=FUNDED_STATUSES
        ).count()

        # Profit margin
        profit_value = total_revenue - total_payouts
        profit_percentage = (
            (profit_value / total_revenue) * 100
            if total_revenue > 0 else Decimal("0")
        )

        results.append({
            "country": country,

            "total_revenue": total_revenue,
            "total_payouts": total_payouts,

            "profit_margin_value": profit_value,
            "profit_margin_percentage": round(profit_percentage, 2),

            "payout_count": payout_count,
            "average_payout_value": avg_payout,

            "funded_accounts_count": funded_accounts,
        })

    return results
