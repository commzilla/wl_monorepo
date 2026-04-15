# wefund/risk_v2/rules/consistency/daily_profit_limit.py
from __future__ import annotations

from decimal import Decimal
from typing import Dict, List, Sequence

from wefund.risk_v2.rules.base import BaseRule, RuleViolation
from wefund.risk_v2.utils.helpers import TradeRecord
from wefund.risk_v2.utils.math_utils import to_decimal
from wefund.risk_v2.utils.time_utils import group_trades_by_broker_day


class DailyProfitLimitRule(BaseRule):
    """
    WeFund rule:
    - A single day cannot generate more than X% of the total profit of the payout cycle.
    - Default X = 30%
    - If a day's total P&L (positive + negative trades combined) exceeds the limit,
      the ENTIRE day's net P&L is excluded from profits.
    """

    code = "consistency.daily_profit_limit"
    name = "Daily Profit Above Cycle Limit"
    category = "consistency"

    def __init__(self, pct_limit: Decimal | str = Decimal("30"), severity: int | None = 80):
        super().__init__(severity=severity)
        self.pct_limit = to_decimal(pct_limit)

    def run(self, trades: Sequence[TradeRecord], context: Dict | None = None) -> List[RuleViolation]:

        if not context:
            return []

        violations: List[RuleViolation] = []

        # Total profit of payout cycle
        total_cycle_profit = to_decimal(context["payout"].profit)
        if total_cycle_profit <= 0:
            return []   # Cannot exceed limit if no profit

        # Daily limit = X% of total-cycle-profit
        daily_limit = (total_cycle_profit * self.pct_limit) / Decimal("100")

        # Group trades per day
        grouped = group_trades_by_broker_day(trades)

        for (account_id, day), day_trades in grouped.items():

            # Sort chronologically
            day_trades = sorted(day_trades, key=lambda t: t.open_time)

            # Calculate total day P&L including both positive and negative trades
            total_day_pnl = Decimal("0")
            for t in day_trades:
                total_day_pnl += to_decimal(t.profit)

            # If day's net P&L exceeds limit, exclude the ENTIRE day's P&L
            if total_day_pnl > daily_limit:
                # Collect ALL order IDs from this day (both positive and negative trades)
                all_order_ids = [t.order for t in day_trades]

                # Use first trade as representative
                first_trade = day_trades[0]

                desc = (
                    f"Daily P&L on {day} exceeded {self.pct_limit}% of total-cycle profit. "
                    f"Limit: {daily_limit}, Day total: {total_day_pnl}. "
                    f"Entire day's P&L excluded."
                )

                violations.append(
                    RuleViolation(
                        rule_code=self.code,
                        rule_name=self.name,
                        category=self.category,
                        severity=self.default_severity,
                        account_id=account_id,
                        order_id=first_trade.order,
                        symbol=first_trade.symbol,
                        description=desc,
                        affected_pnl=total_day_pnl,  # Entire day's net P&L is excluded
                        meta={
                            "day": day.isoformat(),
                            "total_cycle_profit": total_cycle_profit,
                            "daily_limit": daily_limit,
                            "total_day_pnl": total_day_pnl,
                            "exceeded_by": total_day_pnl - daily_limit,
                            "excluded_order_ids": all_order_ids,
                            "excluded_trade_count": len(all_order_ids),
                        },
                    )
                )

        return violations
