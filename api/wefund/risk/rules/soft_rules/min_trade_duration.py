# wefund/risk/rules/min_trade_duration.py

from collections import defaultdict
from datetime import timedelta
from .base_rule import BaseRule
from django.utils.timezone import make_aware


class MinTradeDurationRule(BaseRule):
    """
    Aggregates trades opened within a 30-second window by symbol,
    then applies checks on the combined volume and profit.
    Prevents traders from splitting large positions into small ones to bypass rules.
    """

    RULE_NAME = "min_trade_duration"
    WINDOW_SECONDS = 30

    def check(self, trades):
        """
        :param trades: QuerySet or list of MT5Trade objects for the account.
        :return: list of breach dicts if violations are found.
        """
        breaches = []

        grouped_trades = self._group_trades(trades)

        for symbol, grouped_list in grouped_trades.items():
            total_volume = sum(t.volume for t in grouped_list)
            total_profit = sum(float(t.profit) for t in grouped_list)

            # Example: violation if total volume exceeds allowed limit
            if total_volume > self.params.get("max_volume", 5.0):  # 5 lots default
                breaches.append({
                    "symbol": symbol,
                    "total_volume": total_volume,
                    "total_profit": total_profit,
                    "reason": f"Aggregated volume {total_volume} lots in {self.WINDOW_SECONDS}s exceeds limit."
                })

        return breaches

    def _group_trades(self, trades):
        """
        Groups trades by symbol within a 30-second window from first trade open_time.
        """
        grouped = defaultdict(list)

        # Sort trades by open_time
        trades_sorted = sorted(trades, key=lambda t: t.open_time)

        for trade in trades_sorted:
            symbol = trade.symbol
            added = False

            # Try to fit trade into an existing group
            for key, trade_list in grouped.items():
                if key[0] == symbol:
                    first_trade_time = trade_list[0].open_time
                    if abs((trade.open_time - first_trade_time).total_seconds()) <= self.WINDOW_SECONDS:
                        trade_list.append(trade)
                        added = True
                        break

            if not added:
                # Create a new group key = (symbol, index)
                group_key = (symbol, len([g for g in grouped.keys() if g[0] == symbol]))
                grouped[group_key].append(trade)

        # Convert keys from tuple to just symbol for easier handling
        simplified = defaultdict(list)
        for (symbol, _), trades_list in grouped.items():
            simplified[symbol].extend(trades_list)

        return simplified
