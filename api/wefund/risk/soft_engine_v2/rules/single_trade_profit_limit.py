from wefund.models import MT5Trade

def run(enrollment, account_id=None, start_time=None, end_time=None):
    """
    Single Trade Profit Limit:
    No individual trade may exceed 30% of total PnL for the payout period.
    Returns a list of soft breach dicts for trades exceeding the limit.
    """

    if not account_id or not start_time or not end_time:
        return []

    # Fetch trades for this account within payout period
    trades = MT5Trade.objects.filter(
        account_id=account_id,
        close_time__gte=start_time,
        close_time__lte=end_time
    ).order_by('close_time')

    if not trades.exists():
        return []

    # Compute total PnL across all trades in the period
    total_pnl = sum(float(trade.profit) for trade in trades)
    if total_pnl == 0:
        return []

    limit_per_trade = total_pnl * 0.30
    breaches = []

    for trade in trades:
        trade_profit = float(trade.profit)
        if trade_profit > limit_per_trade:
            breaches.append({
                "rule": "single_trade_profit_limit",
                "value": trade_profit - limit_per_trade,
                "description": (
                    f"Trade #{trade.order} profit ${trade_profit:.2f} exceeded "
                    f"30% of total PnL (${limit_per_trade:.2f}). Excess excluded from payout."
                )
            })

    return breaches
