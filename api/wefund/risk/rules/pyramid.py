from decimal import Decimal
from collections import defaultdict
from wefund.risk.utils import get_open_trades
from wefund.risk.breach_handler import handle_breach
from wefund.models import MT5Trade
from django.utils.timezone import now
import logging

logger = logging.getLogger(__name__)

def run(enrollment):
    """
    Pyramid Trading detection combining closed and open trades:
    Detect if trade sizes increase as profit grows within a symbol cluster.
    """
    if not enrollment.mt5_account_id:
        return

    account_id = enrollment.mt5_account_id

    # Fetch closed trades from DB, ordered by close_time ascending
    closed_trades = list(
        MT5Trade.objects.filter(account_id=account_id)
        .order_by("close_time")
        .values("symbol", "profit", "volume", "close_time")
    )

    # Fetch open trades from MT5 API
    open_trades = get_open_trades(account_id)

    # Normalize closed trades format to match open trades keys & unify timestamps
    closed_normalized = []
    for ct in closed_trades:
        closed_normalized.append({
            "symbol": ct["symbol"],
            "profit": Decimal(ct["profit"]),
            "volume": Decimal(ct["volume"]),
            "open_time": ct["close_time"].timestamp() if hasattr(ct["close_time"], "timestamp") else ct["close_time"],
            # Use close_time as a proxy timestamp for closed trade order
        })

    # Combine and sort all trades by open_time
    combined_trades = closed_normalized + open_trades
    combined_trades.sort(key=lambda t: t.get("open_time", 0))

    # Group trades by symbol
    trades_by_symbol = defaultdict(list)
    for trade in combined_trades:
        symbol = trade.get("symbol")
        if symbol:
            trades_by_symbol[symbol].append(trade)

    # Check pyramiding per symbol
    for symbol, trades in trades_by_symbol.items():
        prev_profit = None
        prev_lots = None
        pyramiding_detected = False

        for trade in trades:
            try:
                profit = Decimal(str(trade.get("profit", 0)))
                lots = trade.get("volume") / Decimal("100")  # volume units to lots
            except Exception as e:
                logger.warning(f"[Pyramid] Skipping trade due to error: {e}")
                continue

            if prev_profit is not None and prev_lots is not None:
                if profit >= prev_profit and lots > prev_lots:
                    pyramiding_detected = True
                    break

            prev_profit = profit
            prev_lots = lots

        if pyramiding_detected:
            reason = (
                f"Pyramid trading breach detected on symbol {symbol}.\n"
                f"Account ID: {account_id} has increasing lots with growing profit streak."
            )
            handle_breach(enrollment, rule="Pyramid Trading", reason=reason)
            break
