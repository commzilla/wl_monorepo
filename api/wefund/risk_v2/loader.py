# wefund/risk_v2/loader.py
from __future__ import annotations

from typing import List

from .rules.base import BaseRule

# Soft rules
from .rules.soft.all_in import AllInRule
from .rules.soft.grid import GridRule
from .rules.soft.hedging import HedgingRule
from .rules.soft.martingale import MartingaleRule
from .rules.soft.pyramid import PyramidRule

# Consistency rules
from .rules.consistency.aggregated_trades import AggregatedTradesRule
from .rules.consistency.close_under_60s import CloseUnder60sRule
from .rules.consistency.concurrent_trades_limit import ConcurrentTradesLimitRule
from .rules.consistency.daily_profit_limit import DailyProfitLimitRule
from .rules.consistency.lot_size_consistency import LotSizeConsistencyRule
from .rules.consistency.profit_spike import ProfitSpikeRule


def get_soft_rules() -> List[BaseRule]:
    return [
        AllInRule(),
        GridRule(),
        HedgingRule(),
        MartingaleRule(),
        PyramidRule(),
    ]


def get_consistency_rules() -> List[BaseRule]:
    return [
        DailyProfitLimitRule(),
        LotSizeConsistencyRule(),
        CloseUnder60sRule(),
        ProfitSpikeRule(),
        AggregatedTradesRule(),
        # ConcurrentTradesLimitRule(),  # Temporarily disabled
    ]


def get_all_rules(
    include_soft: bool = True,
    include_consistency: bool = True,
) -> List[BaseRule]:
    rules: List[BaseRule] = []
    if include_soft:
        rules.extend(get_soft_rules())
    if include_consistency:
        rules.extend(get_consistency_rules())
    return rules
