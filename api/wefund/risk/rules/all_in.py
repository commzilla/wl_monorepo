from wefund.risk.utils import get_open_trades, get_equity_for_account, get_leverage_for_account
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

def estimate_margin(trade, leverage, contract_size=100000):
    lots = Decimal(trade["volume"]) / Decimal("100.0")
    price = Decimal(str(trade["open_price"]))
    return (lots * contract_size * price) / Decimal(leverage)

def run(enrollment):
    account_id = enrollment.mt5_account_id

    # Fetch leverage using new utility
    leverage = get_leverage_for_account(account_id)
    if leverage is None:
        logger.warning(f"[All-In] Could not fetch leverage for {account_id}, defaulting to 100")
        leverage = Decimal("100")

    equity = get_equity_for_account(account_id)
    if equity is None or equity == 0:
        logger.warning(f"[All-In] No equity or zero equity for {account_id}")
        return

    trades = get_open_trades(account_id)
    if not trades:
        logger.info(f"[All-In] No open trades for {account_id}")
        return

    total_margin = Decimal("0")
    for trade in trades:
        margin = estimate_margin(trade, leverage)
        total_margin += margin

    margin_usage_ratio = total_margin / equity

    logger.info(f"[All-In] Account {account_id} using {margin_usage_ratio:.2%} margin")

    if margin_usage_ratio > Decimal("0.9"):
        logger.warning(f"[All-In] BREACH: Margin usage > 90% for {account_id}")
        enrollment.mark_breached("All-In Trading: Margin usage exceeds 90% of equity.")
