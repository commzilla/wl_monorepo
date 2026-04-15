# wefund/risk_v2/rules/consistency/profit_spike.py
from __future__ import annotations

from decimal import Decimal
from typing import Dict, List, Sequence

from wefund.risk_v2.rules.base import BaseRule, RuleViolation
from wefund.risk_v2.utils.helpers import TradeRecord
from wefund.risk_v2.utils.math_utils import to_decimal


class ProfitSpikeRule(BaseRule):
    """
    WeFund Single-Trade Profit Limit Rule:
    - No individual trade may exceed X% of the total payout-cycle profit.
    - Default X = 30%.
    - Any trade above this limit is excluded as a soft breach.

    (This rule REPLACES the old avg-profit-based profit_spike logic.)
    """

    code = "consistency.single_trade_profit_limit"
    name = "Single Trade Profit Above Limit"
    category = "consistency"

    def __init__(self, pct_limit: Decimal | str = Decimal("30"), severity: int | None = 75):
        super().__init__(severity=severity)
        self.pct_limit = to_decimal(pct_limit)

    def run(self, trades: Sequence[TradeRecord], context: Dict | None = None) -> List[RuleViolation]:

        if not context:
            return []

        violations: List[RuleViolation] = []

        # 1️⃣ Get total payout-cycle profit from context (same as daily_profit_limit)
        total_cycle_profit = to_decimal(context["payout"].profit)
        if total_cycle_profit <= 0:
            return []  # Can't exceed limit if no profit

        # 2️⃣ Compute threshold (e.g. 30% of cycle profit)
        threshold = (total_cycle_profit * self.pct_limit) / Decimal("100")

        # 3️⃣ Check each trade (skip negative trades per WeFund policy)
        for t in trades:
            pnl = to_decimal(t.profit)

            # Skip negative trades completely
            if pnl <= 0:
                continue

            if pnl > threshold:
                desc = (
                    f"Trade #{t.order} profit {pnl} exceeds the allowed limit of "
                    f"{self.pct_limit}% of total-cycle profit ({threshold}). "
                    f"Entire trade excluded."
                )

                violations.append(
                    RuleViolation(
                        rule_code=self.code,
                        rule_name=self.name,
                        category=self.category,
                        severity=self.default_severity,
                        account_id=t.account_id,
                        order_id=t.order,
                        symbol=t.symbol,
                        description=desc,
                        affected_pnl=pnl,  # Entire trade profit is excluded
                        meta={
                            "trade_profit": pnl,
                            "threshold": threshold,
                            "exceeded_by": pnl - threshold,
                            "total_cycle_profit": total_cycle_profit,
                            "pct_limit": self.pct_limit,
                        },
                    )
                )

        return violations
