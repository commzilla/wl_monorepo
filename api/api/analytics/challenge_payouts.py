from django.db.models import Sum, Count, Q, F
from decimal import Decimal
from wefund.models import Challenge, Order, TraderPayout, ChallengeEnrollment

FUNDED_STATUSES = ['live_in_progress']
PAID_PAYOUT_STATUSES = ['approved', 'paid']


def get_challenge_payout_analytics():
    results = []

    challenges = Challenge.objects.all()

    for challenge in challenges:
        # All enrollments for this challenge
        enrollments = ChallengeEnrollment.objects.filter(challenge=challenge)

        enrollment_ids = enrollments.values_list("id", flat=True)
        order_ids = enrollments.values_list("order_id", flat=True)

        # === Revenue ===
        total_revenue = (
            Order.objects.filter(
                id__in=order_ids,
                payment_status="paid"
            ).aggregate(total=Sum("paid_usd"))["total"] or Decimal("0")
        )

        # === Payouts (approved + paid) ===
        payout_qs = TraderPayout.objects.filter(
            challenge_enrollment__in=enrollment_ids,
            status__in=PAID_PAYOUT_STATUSES
        )

        total_payouts = payout_qs.aggregate(
            total=Sum("released_fund")
        )["total"] or Decimal("0")

        payout_count = payout_qs.count()

        # === Funded Accounts ===
        funded_accounts_count = enrollments.filter(
            status__in=FUNDED_STATUSES
        ).count()

        # === Totals ===
        profit_value = total_revenue - total_payouts
        profit_percentage = (
            (profit_value / total_revenue) * 100
            if total_revenue > 0 else Decimal("0")
        )

        # === Payout Percentage ===
        total_enrollments = enrollments.count()
        payout_percentage = (
            (payout_count / total_enrollments) * 100
            if total_enrollments > 0 else 0
        )

        results.append({
            "challenge_id": challenge.id,
            "challenge_name": challenge.name,
            "step_type": challenge.step_type,

            "total_revenue": total_revenue,
            "total_payouts": total_payouts,

            "profit_margin_value": profit_value,
            "profit_margin_percentage": round(profit_percentage, 2),

            "payout_count": payout_count,
            "payout_percentage": round(payout_percentage, 2),

            "funded_accounts_count": funded_accounts_count,
            "total_enrollments": total_enrollments,
        })

    return results
