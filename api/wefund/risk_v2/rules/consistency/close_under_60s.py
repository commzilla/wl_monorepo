# wefund/risk_v2/rules/consistency/close_under_60s.py

from __future__ import annotations

from typing import List, Sequence

from wefund.risk_v2.rules.base import BaseRule, RuleViolation
from wefund.risk_v2.utils.helpers import TradeRecord
from wefund.risk_v2.utils.math_utils import to_decimal


class CloseUnder60sRule(BaseRule):
    """
    Detects trades closed in <= max_duration_seconds (default 60s).
    Indicates scalping / ultra-short-term trading.
    """

    code = "consistency.close_under_60s"
    name = "Trades Closed Within 60 Seconds"
    category = "consistency"

    def __init__(self, max_duration_seconds: int = 60, severity: int | None = 60):
        super().__init__(severity=severity)
        self.max_duration_seconds = max_duration_seconds

    def run(self, trades: Sequence[TradeRecord], context: Dict | None = None) -> List[RuleViolation]:
        violations: List[RuleViolation] = []

        for t in trades:
            dur = t.duration_seconds
            if dur <= self.max_duration_seconds:
                desc = (
                    f"Trade closed in {dur:.1f}s (≤ {self.max_duration_seconds}s), "
                    "indicating very short-term/scalping behavior."
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
                        affected_pnl=to_decimal(t.profit),
                        meta={
                            "duration_seconds": dur,
                            "max_duration_seconds": self.max_duration_seconds,
                        },
                    )
                )

        return violations
