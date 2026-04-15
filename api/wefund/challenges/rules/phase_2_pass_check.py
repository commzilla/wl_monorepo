from decimal import Decimal
import logging
from wefund.challenges.phase_handler import handle_transition
from wefund.challenges.utils import get_balance, get_equity
from wefund.models import MT5Trade

logger = logging.getLogger(__name__)

def run(enrollment):
    """
    Checks if Phase 2 profit target is reached and moves enrollment to Phase 2 Passed.
    Only applies to enrollments in phase_2_in_progress.
    """
    # Only run if currently "Phase 2 - In Progress"
    if enrollment.status != "phase_2_in_progress":
        return False

    # Use the current MT5 account stored on the enrollment
    if not enrollment.mt5_account_id:
        logger.info(f"[Phase 2 Check] No active phase-2 MT5 account for enrollment {enrollment.id}")
        return False

    # Fetch balance & equity (safely coerce to Decimal)
    bal_val = get_balance(enrollment.mt5_account_id)
    eq_val = get_equity(enrollment.mt5_account_id)

    try:
        balance = Decimal(str(bal_val)) if bal_val is not None else Decimal(enrollment.account_size)
    except Exception:
        balance = Decimal(enrollment.account_size)

    try:
        equity = Decimal(str(eq_val)) if eq_val is not None else balance
    except Exception:
        equity = balance

    # Profit target: percentage -> absolute
    phase = enrollment.challenge.phases.get(phase_type="phase-2")
    target_pct = Decimal(phase.profit_target or 0)
    target_abs = Decimal(enrollment.account_size) * (target_pct / Decimal(100))

    # ---------------------------
    # 🔥 NEW — Count unique trading days
    # ---------------------------
    trading_days = (
        MT5Trade.objects.filter(account_id=enrollment.mt5_account_id)
        .values("open_time__date")
        .distinct()
        .count()
    )

    # ---------------------------
    # 🔥 NEW — Parse minimum trading days
    # ---------------------------
    min_days_raw = str(phase.min_trading_days).strip().lower()
    if min_days_raw != "unlimited":
        min_trading_days = int(min_days_raw)
    else:
        min_trading_days = 0  # No restriction

    logger.info(
        f"[Phase 2 Check] Enrollment {enrollment.id} "
        f"balance={balance} equity={equity} target%={target_pct} target_abs={target_abs}"
    )

    # ---------------------------
    # 🔥 NEW — Block if minimum trading days not completed
    # ---------------------------
    if trading_days < min_trading_days:
        logger.info(
            f"[Phase 2 Check] Enrollment {enrollment.id} blocked — "
            f"{trading_days}/{min_trading_days} required trading days completed"
        )
        return False

    # Transition when target reached
    if balance >= Decimal(enrollment.account_size) + target_abs:
        from_status = enrollment.status
        to_status = "phase_2_passed"
        handle_transition(enrollment, from_status, to_status, "phase-2", reason="Phase 2 profit target reached")
        logger.info(f"[Phase 2 Check] Enrollment {enrollment.id} transitioned from {from_status} to {to_status}")
        return True

    return False
