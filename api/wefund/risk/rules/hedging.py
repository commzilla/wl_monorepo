from collections import defaultdict
from wefund.risk.utils import get_open_trades
from wefund.risk.breach_handler import handle_breach

def run(enrollment):
    """
    Detects hedge trading: opposite (BUY & SELL) open trades on the same symbol.
    """
    if not enrollment.mt5_account_id:
        return

    account_id = enrollment.mt5_account_id
    open_trades = get_open_trades(account_id)

    symbol_sides = defaultdict(set)

    for trade in open_trades:
        symbol = trade.get("symbol")
        cmd = trade.get("cmd")  # 0 = BUY, 1 = SELL
        if symbol is not None and cmd in (0, 1):
            symbol_sides[symbol].add(cmd)

    for symbol, sides in symbol_sides.items():
        if 0 in sides and 1 in sides:
            reason = (
                f"Hedge trading breach: Detected both BUY and SELL on {symbol} simultaneously.\n"
                f"Account ID: {account_id}"
            )
            handle_breach(enrollment, rule="Hedge Trading", reason=reason)
            break  # One symbol breach is enough
