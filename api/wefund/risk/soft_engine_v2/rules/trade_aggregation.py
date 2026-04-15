from wefund.models import MT5Trade
from collections import defaultdict
from datetime import timedelta

def run(enrollment, account_id=None, start_time=None, end_time=None):
    """
    Trade Aggregation Rule (30-second window):
    Groups trades opened within 30 seconds per symbol for consistency checks.
    Returns a list of soft breach-like dicts describing grouped trades.
    """

    if not account_id or not start_time or not end_time:
        return []

    # Fetch trades for this account within payout period
    trades = MT5Trade.objects.filter(
        account_id=account_id,
        open_time__gte=start_time,
        open_time__lte=end_time
    ).order_by('open_time')

    if not trades.exists():
        return []

    grouped_trades = []

    # Group trades by symbol
    symbol_trades = defaultdict(list)
    for trade in trades:
        symbol_trades[trade.symbol].append(trade)

    for symbol, t_list in symbol_trades.items():
        t_list.sort(key=lambda x: x.open_time)
        group = []
        last_open = None

        for trade in t_list:
            if not last_open or (trade.open_time - last_open) > timedelta(seconds=30):
                if group:
                    grouped_trades.append(group)
                group = [trade]
            else:
                group.append(trade)
            last_open = trade.open_time

        if group:
            grouped_trades.append(group)

    # Convert grouped trades into "soft breach-like" dicts for engine
    breaches = []
    for idx, group in enumerate(grouped_trades, start=1):
        total_lot = sum(float(t.volume) for t in group)
        total_profit = sum(float(t.profit) for t in group)
        trade_ids = [t.order for t in group]

        breaches.append({
            "rule": "trade_aggregation",
            "value": total_lot,
            "description": (
                f"Grouped {len(group)} trades (IDs: {trade_ids}) for symbol '{group[0].symbol}' "
                f"opened within 30 seconds. Total lot: {total_lot:.2f}, total profit: {total_profit:.2f}."
            )
        })

    return breaches
