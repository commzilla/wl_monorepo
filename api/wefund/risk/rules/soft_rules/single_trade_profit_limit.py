from decimal import Decimal
from django.db.models import Sum
from wefund.risk.base_rule import BaseRiskRule, BaseRuleResult
from wefund.models import MT5Trade


class SingleTradeProfitLimitRule(BaseRiskRule):
    """
    Soft Rule: No individual trade may exceed 30% of the total payout period PnL.
    If exceeded, the excess amount is excluded from payout calculation.
    """
    rule_name = "single_trade_profit_limit"
    description = "No single trade profit may exceed 30% of total period PnL"
    breach_type = "soft"

    def __init__(self, payout, period_start, period_end, limit_pct=Decimal("0.30")):
        """
        :param payout: TraderPayout instance
        :param period_start: datetime.date or datetime
        :param period_end: datetime.date or datetime
        :param limit_pct: Decimal percentage (default 0.30 = 30%)
        """
        self.payout = payout
        self.period_start = period_start
        self.period_end = period_end
        self.limit_pct = limit_pct

    def check(self) -> BaseRuleResult:
        # Fetch trades for the account within payout period
        trades = MT5Trade.objects.filter(
            account_id=self.payout.challenge_enrollment.mt5_account_id,
            close_time__date__gte=self.period_start,
            close_time__date__lte=self.period_end
        )

        # Calculate total PnL for the period
        total_pnl = trades.aggregate(total=Sum("profit"))["total"] or Decimal("0.00")

        if total_pnl <= 0:
            return BaseRuleResult(
                rule_name=self.rule_name,
                passed=True,
                breach_type=None,
                details={
                    "total_pnl": str(total_pnl),
                    "limit_per_trade": "0.00",
                    "breaches": []
                }
            )

        limit_per_trade = total_pnl * self.limit_pct
        breaches = []

        for trade in trades:
            if trade.profit > limit_per_trade:
                excess = trade.profit - limit_per_trade
                breaches.append({
                    "trade_id": trade.id,
                    "order": trade.order,
                    "symbol": trade.symbol,
                    "profit": str(trade.profit),
                    "excess_excluded": str(excess)
                })

        passed = len(breaches) == 0

        return BaseRuleResult(
            rule_name=self.rule_name,
            passed=passed,
            breach_type=self.breach_type if not passed else None,
            details={
                "total_pnl": str(total_pnl),
                "limit_per_trade": str(limit_per_trade),
                "breaches": breaches
            }
        )
