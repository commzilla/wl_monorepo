# wefund/risk_v2/rules/soft/hedging.py

from __future__ import annotations

from typing import Dict, List, Sequence, Tuple

from wefund.risk_v2.rules.base import BaseRule, RuleViolation
from wefund.risk_v2.utils.helpers import TradeRecord, group_by_account, group_by_symbol
from wefund.risk_v2.utils.math_utils import to_decimal


class HedgingRule(BaseRule):
    """
    Detects hedging: overlapping BUY and SELL positions on the same symbol
    within the same account.
    """

    code = "soft.hedging"
    name = "Hedging"
    category = "soft"

    def __init__(self, severity: int | None = 70) -> None:
        super().__init__(severity=severity)

    def run(self, trades: Sequence[TradeRecord], context: Dict | None = None) -> List[RuleViolation]:
        violations: List[RuleViolation] = []

        by_account: Dict[int, List[TradeRecord]] = group_by_account(trades)

        for account_id, acct_trades in by_account.items():
            by_symbol: Dict[str, List[TradeRecord]] = group_by_symbol(acct_trades)

            seen_pairs: set[Tuple[int, int]] = set()

            for symbol, symbol_trades in by_symbol.items():
                # symbol_trades already sorted by open_time
                n = len(symbol_trades)
                for i in range(n):
                    t1 = symbol_trades[i]
                    for j in range(i + 1, n):
                        t2 = symbol_trades[j]

                        # If the later trade opens after the earlier trade closes,
                        # they can no longer overlap.
                        if t2.open_time >= t1.close_time:
                            break

                        # We only care about opposite directions
                        if t1.cmd == t2.cmd:
                            continue

                        pair_key = tuple(sorted((t1.order, t2.order)))
                        if pair_key in seen_pairs:
                            continue

                        seen_pairs.add(pair_key)

                        desc = (
                            f"Hedging detected: {t1.direction_str} #{t1.order} "
                            f"and {t2.direction_str} #{t2.order} on {symbol} "
                            "overlap in time."
                        )

                        # Attach two RuleViolations (one per trade) for clarity
                        for t in (t1, t2):
                            violations.append(
                                RuleViolation(
                                    rule_code=self.code,
                                    rule_name=self.name,
                                    category=self.category,
                                    severity=self.default_severity,
                                    account_id=account_id,
                                    order_id=t.order,
                                    symbol=symbol,
                                    description=desc,
                                    affected_pnl=to_decimal(t.profit),
                                    meta={
                                        "paired_order_id": t2.order if t is t1 else t1.order,
                                        "direction": t.direction_str,
                                    },
                                )
                            )

        return violations
