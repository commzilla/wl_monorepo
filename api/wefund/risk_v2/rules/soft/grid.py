# wefund/risk_v2/rules/soft/grid.py

from __future__ import annotations

from typing import Dict, List, Sequence

from wefund.risk_v2.rules.base import BaseRule, RuleViolation
from wefund.risk_v2.utils.helpers import TradeRecord, group_by_account, group_by_symbol
from wefund.risk_v2.utils.math_utils import to_decimal
from wefund.risk_v2.utils.time_utils import seconds_between


class GridRule(BaseRule):
    """
    Detects grid trading patterns: multiple trades on same symbol, same account,
    with similar volume opened in a relatively tight time window.

    Heuristic:
      - Group by account & symbol.
      - Within each group, look for sequences of >= min_trades_in_grid trades where:
          * Time between first and last trade <= grid_time_window_seconds
          * Volumes are within volume_tolerance_ratio (e.g. ±20%)
    """

    code = "soft.grid"
    name = "Grid Trading"
    category = "soft"

    def __init__(
        self,
        grid_time_window_seconds: int = 15 * 60,  # 15 minutes
        min_trades_in_grid: int = 3,
        volume_tolerance_ratio: float = 0.2,
        severity: int | None = 75,
    ) -> None:
        super().__init__(severity=severity)
        self.grid_time_window_seconds = grid_time_window_seconds
        self.min_trades_in_grid = min_trades_in_grid
        self.volume_tolerance_ratio = volume_tolerance_ratio

    def _volumes_close(self, v: float, ref: float) -> bool:
        if ref == 0:
            return False
        diff_ratio = abs(v - ref) / ref
        return diff_ratio <= self.volume_tolerance_ratio

    def run(self, trades: Sequence[TradeRecord], context: Dict | None = None) -> List[RuleViolation]:
        violations: List[RuleViolation] = []

        by_account: Dict[int, List[TradeRecord]] = group_by_account(trades)

        for account_id, acct_trades in by_account.items():
            by_symbol: Dict[str, List[TradeRecord]] = group_by_symbol(acct_trades)

            for symbol, symbol_trades in by_symbol.items():
                n = len(symbol_trades)
                if n < self.min_trades_in_grid:
                    continue

                start_idx = 0
                while start_idx < n:
                    base = symbol_trades[start_idx]
                    cluster = [base]

                    for j in range(start_idx + 1, n):
                        candidate = symbol_trades[j]
                        time_diff = seconds_between(base.open_time, candidate.open_time)
                        if time_diff > self.grid_time_window_seconds:
                            # cluster window closed
                            break

                        if self._volumes_close(candidate.volume, base.volume):
                            cluster.append(candidate)

                    if len(cluster) >= self.min_trades_in_grid:
                        order_ids = [t.order for t in cluster]
                        desc = (
                            f"Grid pattern on {symbol}: {len(cluster)} trades "
                            f"within {self.grid_time_window_seconds}s with "
                            f"similar volumes around {base.volume:.2f} lots. "
                            f"Orders: {order_ids}"
                        )

                        for t in cluster:
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
                                        "cluster_orders": order_ids,
                                        "cluster_size": len(cluster),
                                        "base_volume": base.volume,
                                        "volume_tolerance_ratio": self.volume_tolerance_ratio,
                                    },
                                )
                            )

                        # move start index past this cluster
                        start_idx += len(cluster)
                    else:
                        start_idx += 1

        return violations
