from __future__ import annotations

from typing import Dict, List, Sequence

from wefund.risk_v2.rules.base import BaseRule, RuleViolation
from wefund.risk_v2.utils.helpers import TradeRecord, group_by_account
from wefund.risk_v2.utils.math_utils import safe_mean, to_decimal


class LotSizeConsistencyRule(BaseRule):
    """
    WeFund Rule:
    - Lot size must remain within a ratio based on trader’s average:
        MIN = avg_volume * 0.3     (70% below avg)
        MAX = avg_volume * 2       (100% above avg)
    - Trades outside this range:
        ✔ WINNING trades → excluded (soft breach)
        ✔ LOSING trades → allowed (not excluded)
    """

    code = "consistency.lot_size_consistency"
    name = "Lot Size Consistency"
    category = "consistency"

    def __init__(self, severity: int | None = 65):
        super().__init__(severity=severity)
        # No deviation_ratio anymore → rule uses fixed WeFund ratios.

    def run(self, trades: Sequence[TradeRecord], context: Dict | None = None) -> List[RuleViolation]:
        violations: List[RuleViolation] = []

        by_account: Dict[int, List[TradeRecord]] = group_by_account(trades)

        for account_id, acct_trades in by_account.items():
            volumes = [t.volume for t in acct_trades]
            avg_volume = safe_mean(volumes)

            # Ignore accounts with too small or inconsistent volume
            if avg_volume <= 0:
                continue

            min_allowed = avg_volume * 0.3   # 70% below average
            max_allowed = avg_volume * 2     # 100% above average

            for t in acct_trades:

                # LOSING trades are always allowed even if outside range
                if to_decimal(t.profit) <= 0:
                    continue

                vol = t.volume

                if vol < min_allowed or vol > max_allowed:

                    desc = (
                        f"Lot size {vol:.2f} is outside the allowed range "
                        f"{min_allowed:.2f} – {max_allowed:.2f} based on "
                        f"average lot size {avg_volume:.2f}. "
                        "Winning trades outside this range are excluded."
                    )

                    violations.append(
                        RuleViolation(
                            rule_code=self.code,
                            rule_name=self.name,
                            category=self.category,
                            severity=self.default_severity,
                            account_id=account_id,
                            order_id=t.order,
                            symbol=t.symbol,
                            description=desc,
                            affected_pnl=to_decimal(t.profit),
                            meta={
                                "avg_volume": avg_volume,
                                "min_allowed": min_allowed,
                                "max_allowed": max_allowed,
                                "trade_volume": vol,
                                "profit": to_decimal(t.profit),
                                "note": "Winning trade excluded; losing trades are allowed",
                            },
                        )
                    )

        return violations
