# wefund/risk_v2/rules/consistency/aggregated_trades.py

from __future__ import annotations
from typing import Dict, List, Sequence
from wefund.risk_v2.rules.base import BaseRule, RuleViolation
from wefund.risk_v2.utils.helpers import TradeRecord, group_by_account, group_by_symbol
from wefund.risk_v2.utils.math_utils import to_decimal
from wefund.risk_v2.utils.time_utils import seconds_between


class AggregatedTradesRule(BaseRule):
    code = "consistency.aggregated_trades"
    name = "Aggregated Trades (≤30 seconds = 1 Position)"
    category = "consistency"

    def __init__(self, window_seconds: int = 30, severity: int | None = 20):
        super().__init__(severity=severity)
        self.window_seconds = window_seconds

    def run(self, trades: Sequence[TradeRecord], context: Dict | None = None) -> List[RuleViolation]:
        violations: List[RuleViolation] = []

        by_account = group_by_account(trades)

        for account_id, acct_trades in by_account.items():

            volumes = [t.volume for t in acct_trades if t.volume > 0]
            avg_volume = sum(volumes) / len(volumes) if volumes else 0

            allowed_min = avg_volume * 0.3
            allowed_max = avg_volume * 2

            by_symbol = group_by_symbol(acct_trades)

            for symbol, symbol_trades in by_symbol.items():
                if not symbol_trades:
                    continue

                symbol_trades = sorted(symbol_trades, key=lambda t: t.open_time)
                cluster: List[TradeRecord] = [symbol_trades[0]]

                for i in range(1, len(symbol_trades)):
                    prev = symbol_trades[i - 1]
                    curr = symbol_trades[i]

                    if seconds_between(prev.open_time, curr.open_time) <= self.window_seconds:
                        cluster.append(curr)
                    else:
                        self._push_cluster(
                            cluster, account_id, symbol,
                            allowed_min, allowed_max, violations
                        )
                        cluster = [curr]

                self._push_cluster(
                    cluster, account_id, symbol,
                    allowed_min, allowed_max, violations
                )

        return violations

    def _push_cluster(
        self,
        cluster: List[TradeRecord],
        account_id: int,
        symbol: str,
        allowed_min: float,
        allowed_max: float,
        violations: List[RuleViolation],
    ):
        if len(cluster) < 2:
            return

        orders = [t.order for t in cluster]
        total_volume = sum(t.volume for t in cluster)
        total_pnl = sum((to_decimal(t.profit) for t in cluster), start=to_decimal("0"))

        # ✅ Only show cluster if it BREACHES the allowed range
        if allowed_min <= total_volume <= allowed_max:
            return  # Do NOT report — inside safe range

        # Formatting for description
        range_str = f"{allowed_min:.2f} → {allowed_max:.2f} lots"

        desc = (
            f"{len(cluster)} trades on {symbol} opened within {self.window_seconds}s "
            f"form an aggregated position of {total_volume} lots, which is OUTSIDE "
            f"the allowed range ({range_str}). Orders: {orders}"
        )

        representative = cluster[0]

        violations.append(
            RuleViolation(
                rule_code=self.code,
                rule_name=self.name,
                category=self.category,
                severity=self.default_severity,   # informational/soft
                account_id=account_id,
                order_id=representative.order,
                symbol=symbol,
                description=desc,
                affected_pnl=total_pnl,
                meta={
                    "cluster_orders": orders,
                    "cluster_size": len(cluster),
                    "total_volume": total_volume,
                    "total_pnl": total_pnl,
                    "allowed_min_volume": allowed_min,
                    "allowed_max_volume": allowed_max,
                    "window_seconds": self.window_seconds,
                    "cluster_start_time": cluster[0].open_time.isoformat(),
                    "cluster_end_time": cluster[-1].open_time.isoformat(),
                    "breach_type": (
                        "below_min" if total_volume < allowed_min else "above_max"
                    ),
                },
            )
        )