# wefund/risk_v2/rules/soft/all_in.py

from __future__ import annotations

from decimal import Decimal
from typing import Dict, List, Sequence

from wefund.risk_v2.rules.base import BaseRule, RuleViolation
from wefund.risk_v2.utils.helpers import TradeRecord, group_by_account
from wefund.risk_v2.utils.math_utils import safe_median, to_decimal


class AllInRule(BaseRule):
    """
    Detects 'all-in' style trades where position size is abnormally large
    relative to the trader's usual size on that account.

    Heuristic:
      - For each account, compute median volume across all trades.
      - Flag trades where:
          volume >= volume_spike_multiplier * median_volume
        AND
          volume >= min_absolute_volume (e.g. 1 lot)
    """

    code = "soft.all_in"
    name = "All-In Trading"
    category = "soft"

    def __init__(
        self,
        volume_spike_multiplier: float = 3.0,
        min_absolute_volume: float = 1.0,
        severity: int | None = 85,
    ) -> None:
        super().__init__(severity=severity)
        self.volume_spike_multiplier = volume_spike_multiplier
        self.min_absolute_volume = min_absolute_volume

    def run(self, trades: Sequence[TradeRecord], context: Dict | None = None) -> List[RuleViolation]:  
        violations: List[RuleViolation] = []

        by_account: Dict[int, List[TradeRecord]] = group_by_account(trades)

        for account_id, acct_trades in by_account.items():
            volumes = [t.volume for t in acct_trades]
            median_vol = safe_median(volumes)

            if median_vol <= 0:
                # Not enough data / all identical zero volumes → skip
                continue

            threshold = max(
                self.volume_spike_multiplier * median_vol,
                self.min_absolute_volume,
            )

            for t in acct_trades:
                if t.volume >= threshold:
                    desc = (
                        f"Volume {t.volume:.2f} lots is ≥ "
                        f"{self.volume_spike_multiplier:.1f}× median volume "
                        f"({median_vol:.2f}) on this account."
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
                                "volume": t.volume,
                                "median_volume": median_vol,
                                "threshold_volume": threshold,
                                "direction": t.direction_str,
                            },
                        )
                    )

        return violations
