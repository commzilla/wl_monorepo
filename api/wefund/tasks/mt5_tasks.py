from decimal import Decimal
from celery import shared_task
import logging
from datetime import datetime

from wefund.models import ChallengeEnrollment, MT5Trade
from wefund.mt5_controller.utils import fetch_user_closed_trades

logger = logging.getLogger(__name__)


def make_naive(dt):
    """Accept either datetime or unix timestamp; return naive datetime or None."""
    if dt is None:
        return None
    if isinstance(dt, (int, float)):  # UNIX timestamp
        return datetime.utcfromtimestamp(dt)
    return dt.replace(tzinfo=None)


@shared_task
def fetch_and_store_mt5_trades():
    """
    Fetch closed trades for each active MT5 account (via MySQL `deals`),
    and store them in MT5Trade exactly as MT5 provides (naive datetimes).
    Runs every 1 minute via Celery Beat.
    """
    logger.info("[FETCH_MT5_TRADES][MYSQL] Running")

    enrollments = ChallengeEnrollment.objects.filter(
        is_active=True,
        broker_type="mt5",
        mt5_account_id__isnull=False,
    )

    for enrollment in enrollments:
        account_id = int(enrollment.mt5_account_id)
        try:
            trades = fetch_user_closed_trades(account_id, limit=500)

            for trade in trades:
                order_id = trade.get("deal_id") or trade["position_id"]

                existing = MT5Trade.objects.filter(account_id=account_id, order=order_id).first()

                # ✅ Skip if already marked fully closed
                if existing and existing.is_closed:
                    continue

                obj, created = MT5Trade.objects.update_or_create(
                    account_id=account_id,
                    order=order_id,
                    defaults={
                        "timestamp": make_naive(trade["close_time"]),
                        "symbol": trade["symbol"],
                        "digits": 5,  # default if precision unknown

                        # Buy=0, Sell=1
                        "cmd": 0 if trade["side"] == "BUY" else 1,
                        "volume": float(trade["volume"]),

                        # Store exact MT5 timestamps as naive
                        "open_time": make_naive(trade["open_time"]),
                        "open_price": Decimal(str(trade["open_price"] or 0)),
                        "close_time": make_naive(trade["close_time"]) or (existing.close_time if existing else None),
                        "close_price": Decimal(str(trade["close_price"] or 0)) if trade.get("close_price") else (existing.close_price if existing else Decimal("0")),


                        "sl": Decimal(str(trade["sl"] or 0)),
                        "tp": Decimal(str(trade["tp"] or 0)),

                        "commission": Decimal(str(trade.get("commission", 0))),
                        "commission_agent": Decimal("0.00"),
                        "storage": Decimal("0.00"),
                        "profit": Decimal(str(trade.get("profit", 0))),
                        "taxes": Decimal("0.00"),

                        "value_date": 0,
                        "expiration": 0,
                        "conv_reserv": 0,
                        "open_conv_rate": Decimal("0"),
                        "close_conv_rate": Decimal("0"),
                        "magic": 0,
                        "comment": trade.get("comment", "synced"),
                        "spread": Decimal("0"),
                        "margin_rate": Decimal("0"),

                        # ✅ Mark closed/partial based on volume check
                        "is_closed": trade.get("is_closed", False),
                    },
                )

                if created:
                    logger.info(
                        f"[FETCH_MT5_TRADES] Created trade {order_id} for account {account_id}"
                    )
                else:
                    logger.info(
                        f"[FETCH_MT5_TRADES] Updated trade {order_id} (closed={trade.get('is_closed')}) for account {account_id}"
                    )

        except Exception as e:
            logger.exception(f"[FETCH_MT5_TRADES][MYSQL] Failed for account {account_id}: {e}")
