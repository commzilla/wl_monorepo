# wefund/risk_v2/rules/consistency/concurrent_trades_limit.py

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Sequence, Set

from wefund.risk_v2.rules.base import BaseRule, RuleViolation
from wefund.risk_v2.utils.helpers import TradeRecord, group_by_account, group_by_symbol
from wefund.risk_v2.utils.math_utils import to_decimal


class ConcurrentTradesLimitRule(BaseRule):
    """
    WeFund rule:
    - No more than 5 trades can be open simultaneously for a single symbol.
    - Index symbols (DE40.e, ES35.e, etc.) allow up to 10 concurrent trades.
    - Trades are evaluated per symbol independently.
    - Only trades BEYOND the limit (6th+ or 11th+) are excluded.
    - First N trades (within limit) are always protected.
    """

    code = "consistency.concurrent_trades_limit"
    name = "Concurrent Trades Exceeded Limit"
    category = "consistency"

    # Index symbols that have a higher limit (10 instead of 5)
    INDEX_SYMBOLS: Set[str] = {
        "DE40.e",   # DAX
        "ES35.e",   # Euro Stoxx 35
        "EU50.e",   # Euro Stoxx 50
        "FR40.e",   # CAC 40
        "AU200.e",  # ASX 200
        "HK50.e",   # Hang Seng
        "UT100.e",  # MICEX RTS
        "JP225.e",  # Nikkei 225
        "UK100.e",  # FTSE 100
        "US30.e",   # Dow Jones
        "US500.e",  # S&P 500
    }

    def __init__(self, severity: int | None = 70):
        super().__init__(severity=severity)

    def get_limit_for_symbol(self, symbol: str) -> int:
        """
        Determine concurrent trade limit for a symbol.
        Returns 10 for index symbols, 5 for all others.
        """
        return 10 if symbol.upper() in self.INDEX_SYMBOLS else 5

    def find_concurrent_at_time(
        self, trades: List[TradeRecord], moment: datetime
    ) -> List[TradeRecord]:
        """
        Find all trades that are open at a specific moment in time.
        A trade is considered open if: open_time <= moment <= close_time
        Returns trades sorted by open_time (chronologically).
        """
        concurrent = [
            t for t in trades
            if t.open_time <= moment <= t.close_time
        ]
        return sorted(concurrent, key=lambda t: t.open_time)

    def run(self, trades: Sequence[TradeRecord], context: Dict | None = None) -> List[RuleViolation]:
        violations: List[RuleViolation] = []

        # Early return for empty inputs - prevent crashes
        if not trades:
            return violations

        # Group trades by account
        by_account = group_by_account(trades)

        for account_id, account_trades in by_account.items():
            # Group by symbol - each symbol is checked independently
            by_symbol = group_by_symbol(account_trades)

            for symbol, symbol_trades in by_symbol.items():
                # Get limit for this symbol
                limit = self.get_limit_for_symbol(symbol)

                # Collect all unique time points for this symbol
                # (every open_time and close_time creates a potential overlap check)
                time_points: Set[datetime] = set()
                for t in symbol_trades:
                    time_points.add(t.open_time)
                    time_points.add(t.close_time)

                # Track which trades have already been flagged to avoid duplicates
                flagged_trades: Set[int] = set()

                # Check concurrent trades at each time point
                for check_time in sorted(time_points):
                    concurrent = self.find_concurrent_at_time(symbol_trades, check_time)

                    # If concurrent count exceeds limit, flag excess trades
                    if len(concurrent) > limit:
                        # Excess trades are those beyond position 'limit'
                        # (first 'limit' trades are safe, rest are violations)
                        excess_trades = concurrent[limit:]

                        for excess_trade in excess_trades:
                            # Only flag this trade once (at its first violation moment)
                            if excess_trade.order not in flagged_trades:
                                flagged_trades.add(excess_trade.order)
                                violations.append(
                                    RuleViolation(
                                        rule_code=self.code,
                                        rule_name=self.name,
                                        category=self.category,
                                        severity=self.default_severity,
                                        account_id=account_id,
                                        order_id=excess_trade.order,
                                        symbol=symbol,
                                        description=(
                                            f"Trade #{excess_trade.order} on {symbol} exceeded concurrent limit. "
                                            f"{len(concurrent)} trades running simultaneously (limit: {limit})."
                                        ),
                                        affected_pnl=to_decimal(excess_trade.profit),
                                        meta={
                                            "concurrent_count": len(concurrent),
                                            "limit": limit,
                                            "is_index_symbol": symbol.upper() in self.INDEX_SYMBOLS,
                                            "overlap_moment": check_time.isoformat(),
                                            "concurrent_order_ids": [t.order for t in concurrent],
                                            "affected_order_ids": [t.order for t in excess_trades],
                                            "position_in_overlap": concurrent.index(excess_trade) + 1,
                                        },
                                    )
                                )

        return violations
