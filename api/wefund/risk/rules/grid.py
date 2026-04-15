from collections import defaultdict
from decimal import Decimal
from wefund.risk.utils import get_open_trades
from wefund.risk.breach_handler import handle_breach
import logging

logger = logging.getLogger(__name__)

# Define the grid interval in pips (e.g., 20 pips = 0.0020 for 5-digit pairs)
# You may want to customize this per symbol or make configurable
GRID_INTERVAL_PIPS = Decimal('0.0020')
# Allowed tolerance for spacing (in pips)
TOLERANCE_PIPS = Decimal('0.0002')

# Pending order cmd codes in MT5
PENDING_ORDER_CMDS = {2, 3, 4, 5}

def run(enrollment):
    """
    Detect grid trading: evenly spaced pending orders (limit/stop) at approx fixed pip intervals.
    """
    if not enrollment.mt5_account_id:
        return

    account_id = enrollment.mt5_account_id
    trades = get_open_trades(account_id)

    if not trades:
        logger.info(f"[Grid] No open trades for account {account_id}")
        return

    # Group pending orders by symbol with their open_price
    pending_prices_by_symbol = defaultdict(list)

    for trade in trades:
        cmd = trade.get("cmd")
        if cmd in PENDING_ORDER_CMDS:
            symbol = trade.get("symbol")
            price = trade.get("open_price")
            if symbol and price is not None:
                pending_prices_by_symbol[symbol].append(Decimal(str(price)))

    # Analyze each symbol's pending order prices for grid pattern
    for symbol, prices in pending_prices_by_symbol.items():
        if len(prices) < 3:
            # Need at least 3 orders to detect a grid pattern
            continue

        prices.sort()

        # Calculate consecutive differences
        diffs = [prices[i+1] - prices[i] for i in range(len(prices)-1)]

        # Check if all diffs are close to GRID_INTERVAL_PIPS within tolerance
        grid_like = all(
            abs(diff - GRID_INTERVAL_PIPS) <= TOLERANCE_PIPS
            for diff in diffs
        )

        if grid_like:
            reason = (
                f"Grid trading breach detected on symbol {symbol}.\n"
                f"Pending orders at roughly {GRID_INTERVAL_PIPS * Decimal('10000')} pips intervals.\n"
                f"Account ID: {account_id}"
            )
            handle_breach(enrollment, rule="Grid Trading", reason=reason)
            break  # One symbol breach is enough
