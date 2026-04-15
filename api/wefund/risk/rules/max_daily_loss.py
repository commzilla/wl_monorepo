import logging
from decimal import Decimal
from django.utils import timezone
from zoneinfo import ZoneInfo

from wefund.models import MT5DailySnapshot, BreachHistory
from wefund.risk.breach_handler import handle_breach
from wefund.mt5_controller.utils import fetch_user_equity

logger = logging.getLogger(__name__)

BROKER_TZ = ZoneInfo("Etc/GMT-2")


def _resolve_start_balance(enrollment, account_id, today):
    """
    Determine the correct daily starting balance for breach evaluation.

    Returns (start_balance, source) or (None, reason) if no reliable data.

    Lookup order:
      1. Today's snapshot starting_balance
      2. Yesterday's snapshot ending_balance (if not NULL)
      3. Yesterday's snapshot starting_balance (if ending_balance is NULL — end-of-day not yet written)
      4. account_size ONLY if zero snapshot history exists (brand-new account)

    If snapshots exist but all balance values are NULL, returns None — the caller
    must SKIP the account rather than breach on unreliable data.
    """
    # Tier 1: today's snapshot
    snapshot = MT5DailySnapshot.objects.filter(
        enrollment=enrollment,
        account_id=account_id,
        date=today,
    ).first()

    if snapshot and snapshot.starting_balance is not None:
        return Decimal(str(snapshot.starting_balance)), "today_snapshot"

    # Tier 2: most recent snapshot before today
    last_snapshot = MT5DailySnapshot.objects.filter(
        enrollment=enrollment,
        account_id=account_id,
        date__lt=today,
    ).order_by("-date").first()

    if last_snapshot:
        # Prefer ending_balance (yesterday's close = today's open)
        if last_snapshot.ending_balance is not None:
            return Decimal(str(last_snapshot.ending_balance)), "yesterday_ending"
        # ending_balance NULL means the end-of-day update hasn't run yet (race condition).
        # Fall back to yesterday's starting_balance — still much more accurate than account_size.
        if last_snapshot.starting_balance is not None:
            return Decimal(str(last_snapshot.starting_balance)), "yesterday_starting"
        # Snapshot exists but both values are NULL — data is unreliable
        return None, "snapshot_exists_but_null"

    # Tier 3: no snapshots at all — brand-new account, account_size is correct
    return Decimal(str(enrollment.account_size)), "account_size_no_history"


def run(enrollment, equity=None):
    """
    Max Daily Loss:
    Equity must not drop more than max_daily_loss % below today's starting balance
    for any account under this enrollment.
    """

    account_ids = [enrollment.mt5_account_id] if enrollment.mt5_account_id else []

    for account_id in account_ids:
        if not account_id:
            continue

        today = timezone.now().astimezone(BROKER_TZ).date()

        already_breached = BreachHistory.objects.filter(
            enrollment=enrollment,
            rule="max_daily_loss",
            breached_at__date=today
        ).exists()
        if already_breached:
            logger.info(f"[MaxDailyLoss] Skipping {account_id}, already breached today")
            continue

        try:
            phase_type = enrollment.get_current_phase_type()
            if not phase_type:
                continue
            phase = enrollment.challenge.phases.get(phase_type=phase_type)
            max_daily_loss_percent = phase.max_daily_loss
        except Exception as e:
            logger.error(f"[MaxDailyLoss] Error getting phase for enrollment {enrollment.id}: {e}")
            continue

        # --- Determine correct start balance (daily baseline) ---
        start_balance, source = _resolve_start_balance(enrollment, account_id, today)

        if start_balance is None:
            logger.warning(
                f"[MaxDailyLoss] SKIPPING account {account_id} — no reliable start balance "
                f"(reason: {source}). Will retry next cycle when snapshots are ready."
            )
            continue

        logger.info(f"[MaxDailyLoss] Account {account_id}: start_balance=${start_balance} (source={source})")

        # --- Fetch live equity ---
        current_equity = equity if equity is not None else fetch_user_equity(account_id)
        if current_equity is None or current_equity <= 0:
            logger.info(f"[MaxDailyLoss] Skipping account {account_id} (equity not available)")
            continue

        # --- Sanity check: detect stale/incorrect start balance ---
        # If start_balance is more than 20% away from current equity AND came from
        # account_size fallback, something is likely wrong — skip to be safe.
        if source == "account_size_no_history":
            deviation = abs(start_balance - current_equity) / start_balance
            if deviation > Decimal("0.20"):
                logger.warning(
                    f"[MaxDailyLoss] SKIPPING account {account_id} — start_balance "
                    f"${start_balance} (from account_size) deviates {deviation:.0%} from "
                    f"equity ${current_equity}. Likely stale data."
                )
                continue

        # --- Calculate threshold and evaluate ---
        max_loss_amount = (Decimal(max_daily_loss_percent) / Decimal("100")) * start_balance
        threshold = start_balance - max_loss_amount

        if current_equity < threshold:
            reason = (
                f"Equity dropped below permitted daily threshold.\n"
                f"Start Balance: ${start_balance:.2f}\n"
                f"Allowed Max Drop ({max_daily_loss_percent}%): -${max_loss_amount:.2f}\n"
                f"Current Equity: ${current_equity:.2f}\n"
                f"Threshold: ${threshold:.2f}"
            )
            handle_breach(enrollment, rule="max_daily_loss", reason=reason)
