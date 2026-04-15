from django.db.models import Sum, F, When, Case, DecimalField
from decimal import Decimal
from wefund.models import Order, ChallengeEnrollment, TraderPayout

FUNDED_STATUSES = ['live_in_progress']
PAYOUT_STATUSES = ['approved', 'paid']


def get_unprofitable_countries_analytics():
    results = []

    # Get all countries with paid orders
    countries = (
        Order.objects.exclude(billing_address__country__isnull=True)
        .exclude(billing_address__country="")
        .values_list("billing_address__country", flat=True)
        .distinct()
    )

    for country in countries:
        # All paid orders for this country
        orders = Order.objects.filter(
            billing_address__country=country,
            payment_status="paid"
        )

        order_ids = orders.values_list("id", flat=True)

        # === Revenue ===
        total_revenue = (
            orders.aggregate(total=Sum("paid_usd"))["total"] or Decimal("0")
        )

        # === Enrollments from this country ===
        enrollments = ChallengeEnrollment.objects.filter(order_id__in=order_ids)
        enrollment_ids = enrollments.values_list("id", flat=True)

        # === Payouts for these enrollments ===
        payout_qs = TraderPayout.objects.filter(
            status__in=PAYOUT_STATUSES,
            challenge_enrollment__order_id__in=order_ids
        )

        total_payouts = (
            payout_qs.aggregate(
                total=Sum(
                    Case(
                        When(released_fund__gt=0, then=F("released_fund")),
                        default=F("net_profit"),
                        output_field=DecimalField(max_digits=12, decimal_places=2)
                    )
                )
            )["total"] or Decimal("0")
        )

        payout_count = payout_qs.count()

        # === Funded accounts ===
        funded_accounts_count = enrollments.filter(
            status__in=FUNDED_STATUSES
        ).count()

        # === Profit / Loss ===
        profit_value = total_revenue - total_payouts
        profit_percentage = (
            (profit_value / total_revenue) * 100
            if total_revenue > 0 else Decimal("0")
        )

        # ONLY include countries with loss (profit_value < 0)
        if profit_value < 0:
            total_loss = abs(profit_value)

            results.append({
                "country": country,

                "total_revenue": total_revenue,
                "total_payouts": total_payouts,

                "total_loss": total_loss,
                "profit_margin_value": profit_value,
                "profit_margin_percentage": round(profit_percentage, 2),

                "payout_count": payout_count,
                "funded_accounts_count": funded_accounts_count,
            })

    return results
