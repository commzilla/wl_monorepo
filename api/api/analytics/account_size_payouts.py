from django.db.models import Sum, Count, Q
from decimal import Decimal
from wefund.models import ChallengeEnrollment, Order, TraderPayout

FUNDED_STATUSES = ['live_in_progress']
PAID_PAYOUT_STATUSES = ['approved', 'paid']


def get_account_size_payout_analytics():
    results = []
    
    # Get unique account sizes
    account_sizes = (
        ChallengeEnrollment.objects
        .values_list("account_size", flat=True)
        .distinct()
    )

    for size in account_sizes:
        enrollments = ChallengeEnrollment.objects.filter(account_size=size)
        enrollment_ids = enrollments.values_list("id", flat=True)
        order_ids = enrollments.values_list("order_id", flat=True)

        # === Revenue ===
        total_revenue = (
            Order.objects.filter(
                id__in=order_ids,
                payment_status="paid"
            ).aggregate(total=Sum("paid_usd"))["total"] or Decimal("0")
        )

        # === Payouts ===
        payout_qs = TraderPayout.objects.filter(
            challenge_enrollment__in=enrollment_ids,
            status__in=PAID_PAYOUT_STATUSES
        )

        total_payouts = payout_qs.aggregate(
            total=Sum("released_fund")
        )["total"] or Decimal("0")

        payout_count = payout_qs.count()

        # === Funded Accounts ===
        funded_accounts = enrollments.filter(
            status__in=FUNDED_STATUSES
        ).count()

        # === Totals ===
        profit_value = total_revenue - total_payouts
        profit_percentage = (
            (profit_value / total_revenue) * 100
            if total_revenue > 0 else Decimal("0")
        )

        total_enrollments = enrollments.count()
        payout_percentage = (
            (payout_count / total_enrollments) * 100
            if total_enrollments > 0 else 0
        )

        results.append({
            "account_size": size,

            "total_revenue": total_revenue,
            "total_payouts": total_payouts,

            "profit_margin_value": profit_value,
            "profit_margin_percentage": round(profit_percentage, 2),

            "payout_count": payout_count,
            "payout_percentage": round(payout_percentage, 2),

            "funded_accounts_count": funded_accounts,
            "total_enrollments": total_enrollments,
        })

    return results
