from collections import defaultdict
from wefund.models import MT5Trade

def run(enrollment, account_id=None, start_time=None, end_time=None):
    """
    Daily Profit Limit:
    No single day's profit may exceed 30% of the total PnL for the payout period.
    Returns a list of soft breach dicts if any day exceeds the limit.
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

    # Aggregate profit per day
    daily_pnl = defaultdict(float)
    total_pnl = 0.0

    for trade in trades:
        day = trade.close_time.date()
        daily_pnl[day] += float(trade.profit)
        total_pnl += float(trade.profit)

    if total_pnl == 0:
        return []  # nothing to check

    limit_per_day = total_pnl * 0.30
    breaches = []

    for day, pnl in daily_pnl.items():
        if pnl > limit_per_day:
            breaches.append({
                "rule": "daily_profit_limit",
                "value": pnl - limit_per_day,
                "description": (
                    f"Daily profit ${pnl:.2f} exceeded 30% of total PnL (${limit_per_day:.2f}) "
                    f"on {day}. Excess amount excluded from payout."
                )
            })

    return breaches
