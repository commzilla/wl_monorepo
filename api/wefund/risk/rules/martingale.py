from wefund.models import MT5Trade
from wefund.risk.utils import get_open_trades
from wefund.risk.breach_handler import handle_breach
from decimal import Decimal

MARTINGALE_VOLUME_FACTOR = Decimal('1.9')

def run(enrollment):
    """
    Detects Martingale strategy: if trader doubles lot size after consecutive losses.
    """
    if not enrollment.mt5_account_id:
        return

    account_id = enrollment.mt5_account_id

    # 1. Fetch recent closed trades (last 5)
    closed_trades = (
        MT5Trade.objects.filter(account_id=account_id, close_price__gt=0)
        .order_by("-close_time")[:5]
    )
    if len(closed_trades) < 2:
        return  # Not enough trades to analyze

    # 2. Reverse for chronological order (oldest to newest)
    trades = list(closed_trades)[::-1]

    # 3. Loop through trades to find loss + volume doubling
    for i in range(1, len(trades)):
        prev = trades[i - 1]
        curr = trades[i]

        prev_profit = Decimal(prev.profit)
        curr_volume = Decimal(curr.volume)
        prev_volume = Decimal(prev.volume)

        # If previous trade was a loss, and current volume ≈ double previous
        if prev_profit < 0 and curr_volume >= prev_volume * MARTINGALE_VOLUME_FACTOR:
            reason = (
                f"Martingale strategy detected: Trade volume doubled after a loss.\n"
                f"Previous Trade → Loss: ${prev_profit}, Volume: {prev_volume}\n"
                f"Current Trade → Volume: {curr_volume} (≥ 2x previous)\n"
                f"Account ID: {account_id}"
            )
            handle_breach(enrollment, rule="Martingale", reason=reason)
            return

    # 4. Also check open trades after a recent loss
    last_trade = trades[-1]
    if Decimal(last_trade.profit) < 0:
        last_volume = Decimal(last_trade.volume)
        open_trades = get_open_trades(account_id)

        for trade in open_trades:
            open_volume = Decimal(trade.get("volume", 0))
            if open_volume >= last_volume * MARTINGALE_VOLUME_FACTOR:
                reason = (
                    f"Martingale strategy detected: Open trade volume doubled after last loss.\n"
                    f"Last Closed Trade → Loss: ${last_trade.profit}, Volume: {last_volume}\n"
                    f"Open Trade → Volume: {open_volume} (≥ 2x last)\n"
                    f"Account ID: {account_id}"
                )
                handle_breach(enrollment, rule="Martingale", reason=reason)
                return
