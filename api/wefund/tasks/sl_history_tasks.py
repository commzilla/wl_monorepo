import logging
from decimal import Decimal
from celery import shared_task
from django.db import transaction

from wefund.models import PositionSLState, StopLossChange
from wefund.mt5_controller.utils import fetch_all_open_positions, normalize_position_row

logger = logging.getLogger(__name__)


@shared_task(name="sl_history.track_stoploss_changes")
def track_stoploss_changes():
    """
    Poll MT5 positions and record any Stop-Loss modifications while trades remain open.
    Idempotent: compares with PositionSLState to only log true changes.
    """
    try:
        rows = fetch_all_open_positions(limit=5000)
    except Exception as e:
        logger.exception(f"[SL_TRACKER] Failed to load positions: {e}")
        return

    # Fast path if none
    if not rows:
        logger.info("[SL_TRACKER] No open positions found.")
        return

    changes = 0
    states_upserts = 0

    for raw in rows:
        pos = normalize_position_row(raw)

        # Note: some brokers use 0 for "no SL"; treat Decimal("0") as valid value.
        new_sl = pos["sl"]
        position_id = pos["position_id"]

        # Upsert state and detect change atomically per position
        with transaction.atomic():
            state, created = PositionSLState.objects.select_for_update().get_or_create(
                position_id=position_id,
                defaults={
                    "login": pos["login"],
                    "symbol": pos["symbol"],
                    "side": pos["side"],
                    "last_sl": new_sl,
                    "last_seen_update_ts": pos["changed_at_ts"] or 0,
                    "is_open": True,
                },
            )

            if created:
                states_upserts += 1
                continue  # first sighting; no "change" to record yet

            # refresh ancillary fields
            updated_meta = False
            if state.login != pos["login"] or state.symbol != pos["symbol"] or state.side != pos["side"]:
                state.login = pos["login"]
                state.symbol = pos["symbol"]
                state.side = pos["side"]
                updated_meta = True

            # Detect actual SL modification (exact Decimal compare to avoid float noise)
            if new_sl != state.last_sl:
                # Insert history row
                StopLossChange.objects.create(
                    position_id=position_id,
                    login=pos["login"],
                    symbol=pos["symbol"],
                    side=pos["side"],
                    old_sl=state.last_sl,
                    new_sl=new_sl,
                    digits=pos["digits"],
                    price_open=pos["open_price"],
                    price_current=pos["current_price"],
                    tp=pos["tp"],
                    profit=pos["profit"],
                    storage=pos["storage"],
                    changed_at=pos["changed_at"] or None,
                    dealer=pos["dealer"],
                    expert_id=pos["expert_id"],
                    comment=pos["comment"][:120] if pos["comment"] else "",
                )
                # Update state snapshot
                state.last_sl = new_sl
                state.last_seen_update_ts = pos["changed_at_ts"] or 0
                state.is_open = True
                state.save(update_fields=["last_sl", "last_seen_update_ts", "is_open"])
                changes += 1
            else:
                # No SL change; only bump last_seen_update_ts/meta if needed
                next_ts = pos["changed_at_ts"] or 0
                if (next_ts and next_ts != state.last_seen_update_ts) or updated_meta or not state.is_open:
                    state.last_seen_update_ts = next_ts or state.last_seen_update_ts
                    state.is_open = True
                    if updated_meta:
                        state.save(update_fields=["login", "symbol", "side", "last_seen_update_ts", "is_open"])
                    else:
                        state.save(update_fields=["last_seen_update_ts", "is_open"])

    logger.info(f"[SL_TRACKER] SL changes logged: {changes} | states upserted: {states_upserts}")
