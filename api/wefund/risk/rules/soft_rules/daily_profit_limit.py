from datetime import date
from decimal import Decimal
from collections import defaultdict

from wefund.risk.base_rule import BaseRuleResult, BaseRiskRule
from wefund.models import MT5Trade


class DailyProfitLimitRule(BaseRiskRule):
    """
    Soft breach:
    No single day's profit may exceed 30% of total PnL for payout period.
    Excess is excluded from payout, account remains valid.
    """

    rule_name = "Daily Profit Limit"
    description = "No single day's profit may exceed 30% of total PnL for the payout period."
    breach_type = "soft"

    def __init__(self, payout, percentage=Decimal("0.30")):
        """
        :param payout: TraderPayout instance (with challenge_enrollment)
        :param percentage: Allowed max daily profit percentage of total PnL
        """
        self.payout = payout
        self.percentage = Decimal(str(percentage))

    def check(self):
        ce = self.payout.challenge_enrollment
        if not ce or not ce.mt5_account_id:
            return BaseRuleResult(self.rule_name, passed=True, details="No MT5 account linked.")

        trades = MT5Trade.objects.filter(
            account_id=ce.mt5_account_id,
            close_time__date__gte=self.payout.requested_at.date().replace(day=1),  # adjust if payout period stored
            close_time__date__lte=self.payout.requested_at.date()
        )

        if not trades.exists():
            return BaseRuleResult(self.rule_name, passed=True, details="No trades in payout period.")

        # Aggregate profit by day
        daily_pnls = defaultdict(Decimal)
        total_pnl = Decimal("0.00")

        for t in trades:
            daily_key = t.close_time.date()
            daily_pnls[daily_key] += t.profit
            total_pnl += t.profit

        if total_pnl <= 0:
            return BaseRuleResult(self.rule_name, passed=True, details="Total PnL <= 0, rule not applicable.")

        limit_per_day = total_pnl * self.percentage
        breaches = []

        for trade_day, pnl in daily_pnls.items():
            if pnl > limit_per_day:
                excess = pnl - limit_per_day
                breaches.append({
                    "date": str(trade_day),
                    "daily_pnl": str(round(pnl, 2)),
                    "limit": str(round(limit_per_day, 2)),
                    "excess": str(round(excess, 2))
                })

        if breaches:
            return BaseRuleResult(
                self.rule_name,
                passed=False,
                breach_type=self.breach_type,
                details={
                    "total_pnl": str(round(total_pnl, 2)),
                    "limit_per_day": str(round(limit_per_day, 2)),
                    "breaches": breaches,
                    "action": "Exclude excess from payout; account remains valid."
                }
            )

        return BaseRuleResult(self.rule_name, passed=True, details="All daily profits within limit.")
