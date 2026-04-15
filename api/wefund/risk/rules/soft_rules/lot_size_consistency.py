from decimal import Decimal
from django.db.models import Avg
from wefund.risk.rules.soft.base_rule import BaseSoftRule
from wefund.models import MT5Trade  # adjust import path if different


class LotSizeConsistencyRule(BaseSoftRule):
    """
    Rule: All trade lot sizes must be within 70% below to 100% above
    the average lot size for the payout period.
    
    Calculation:
        min_lot = average_lot * 0.30
        max_lot = average_lot * 2.00

    Trades outside this range are excluded from payout calculation but
    do not cause account breaches.
    """

    name = "Lot Size Consistency"
    description = (
        "Ensures that all trades in the payout period are consistent "
        "in lot size, avoiding extreme variations."
    )

    def check(self, payout_request):
        """
        :param payout_request: TraderPayout instance
        :return: dict with excluded trades and adjusted profit
        """
        enrollment = payout_request.challenge_enrollment
        if not enrollment:
            return self.result(
                passed=True,
                reason="No challenge enrollment linked to payout request.",
                excluded_trades=[]
            )

        # Get all trades for the account in the payout period
        trades_qs = MT5Trade.objects.filter(
            account_id=enrollment.mt5_account_id,
            close_time__lte=payout_request.requested_at
        )

        if not trades_qs.exists():
            return self.result(
                passed=True,
                reason="No trades found in payout period.",
                excluded_trades=[]
            )

        avg_lot = trades_qs.aggregate(avg=Avg("volume"))["avg"] or 0
        avg_lot = Decimal(str(avg_lot))

        min_lot = avg_lot * Decimal("0.30")
        max_lot = avg_lot * Decimal("2.00")

        excluded_trades = []
        excluded_profit = Decimal("0.00")

        for trade in trades_qs:
            if trade.volume < float(min_lot) or trade.volume > float(max_lot):
                excluded_trades.append(trade.order)
                excluded_profit += trade.profit

        passed = True  # Soft rule → always pass
        reason = (
            f"Excluded {len(excluded_trades)} trades due to lot size "
            f"inconsistency. Min allowed: {min_lot}, Max allowed: {max_lot}."
        )

        return self.result(
            passed=passed,
            reason=reason,
            excluded_trades=excluded_trades,
            excluded_profit=excluded_profit
        )
