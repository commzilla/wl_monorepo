# wefund/risk_v2/rules/soft/pyramid.py

from __future__ import annotations

from typing import Dict, List, Sequence

from wefund.risk_v2.rules.base import BaseRule, RuleViolation
from wefund.risk_v2.utils.helpers import TradeRecord, group_by_account, sort_by_open_time
from wefund.risk_v2.utils.math_utils import to_decimal


class PyramidRule(BaseRule):
    """
    Detects pyramid trading: increasing lot size after winning trades.

    Heuristic:
      - For each account, sort trades by open_time.
      - If a trade has positive profit and the next trade's volume is
        >= pyramid_multiplier * previous volume, flag the next trade.
    """

    code = "soft.pyramid"
    name = "Pyramid Trading"
    category = "soft"

    def __init__(self, pyramid_multiplier: float = 1.5, severity: int | None = 70):
        super().__init__(severity=severity)
        self.pyramid_multiplier = pyramid_multiplier

    def run(self, trades: Sequence[TradeRecord], context: Dict | None = None) -> List[RuleViolation]:
        violations: List[RuleViolation] = []

        by_account: Dict[int, List[TradeRecord]] = group_by_account(trades)

        for account_id, acct_trades in by_account.items():
            ordered = sort_by_open_time(acct_trades)
            for prev, curr in zip(ordered, ordered[1:]):
                if prev.profit <= 0:
                    continue

                if curr.volume >= self.pyramid_multiplier * prev.volume:
                    desc = (
                        f"Pyramid pattern: previous winning trade #{prev.order} "
                        f"(P&L {prev.profit}) with volume {prev.volume:.2f} lots, "
                        f"followed by trade #{curr.order} with volume "
                        f"{curr.volume:.2f} ≥ {self.pyramid_multiplier:.1f}×."
                    )
                    violations.append(
                        RuleViolation(
                            rule_code=self.code,
                            rule_name=self.name,
                            category=self.category,
                            severity=self.default_severity,
                            account_id=account_id,
                            order_id=curr.order,
                            symbol=curr.symbol,
                            description=desc,
                            affected_pnl=to_decimal(curr.profit),
                            meta={
                                "prev_order_id": prev.order,
                                "prev_profit": to_decimal(prev.profit),
                                "prev_volume": prev.volume,
                                "current_volume": curr.volume,
                                "multiplier": self.pyramid_multiplier,
                            },
                        )
                    )

        return violations
