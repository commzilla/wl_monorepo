from wefund.models import MT5Trade
from datetime import timedelta

def run(enrollment, account_id=None, start_time=None, end_time=None):
    """
    Minimum Trade Duration Rule (60 seconds):
    Any trade closed in less than 60 seconds is excluded from payout.
    Returns a list of soft breach dicts for such trades.
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

    breaches = []

    for trade in trades:
        duration = trade.close_time - trade.open_time
        if duration < timedelta(seconds=60):
            breaches.append({
                "rule": "min_trade_duration",
                "value": duration.total_seconds(),
                "description": (
                    f"Trade #{trade.order} closed in {duration.total_seconds():.1f} seconds "
                    f"(less than 60s). Profit excluded from payout."
                )
            })

    return breaches
