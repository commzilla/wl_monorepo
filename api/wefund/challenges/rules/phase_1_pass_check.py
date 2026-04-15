from decimal import Decimal
import logging
from wefund.challenges.phase_handler import handle_transition
from wefund.challenges.utils import get_balance, get_equity
from wefund.models import MT5Trade

logger = logging.getLogger(__name__)

def run(enrollment):
    # ✅ Only run if currently "Phase 1 - In Progress"
    if enrollment.status != "phase_1_in_progress":
        return False

    phase_type = enrollment.get_current_phase_type()

    if not enrollment.mt5_account_id:
        logger.info(f"[Phase 1 Check] No active {phase_type} MT5 account for enrollment {enrollment.id}")
        return False

    balance = Decimal(get_balance(enrollment.mt5_account_id))
    equity = Decimal(get_equity(enrollment.mt5_account_id))

    phase = enrollment.challenge.phases.get(phase_type="phase-1")
    target_percentage = Decimal(phase.profit_target or 0)

    # Convert percentage to absolute using Decimal
    target_absolute = enrollment.account_size * (target_percentage / Decimal(100))

    # 🔥 NEW — Count unique trading days based on open_time
    trading_days = (
        MT5Trade.objects.filter(account_id=enrollment.mt5_account_id)
        .values("open_time__date")
        .distinct()
        .count()
    )

    # 🔥 NEW — Parse minimum trading days from ChallengePhase
    min_days_raw = str(phase.min_trading_days).strip().lower()
    if min_days_raw != "unlimited":
        min_trading_days = int(min_days_raw)
    else:
        min_trading_days = 0  # Unlimited means no restriction

    logger.info(
        f"[Phase 1 Check] Enrollment {enrollment.id} "
        f"balance={balance} equity={equity} "
        f"target%={target_percentage} target_abs={target_absolute}"
    )

    # 🔥 NEW — Enforce minimum trading days requirement
    if trading_days < min_trading_days:
        logger.info(
            f"[Phase 1 Check] Enrollment {enrollment.id} blocked — "
            f"{trading_days}/{min_trading_days} trading days completed"
        )
        return False

    # ✅ Transition only when in-progress AND target reached
    if balance >= enrollment.account_size + target_absolute:
        from_status = enrollment.status

        # Pay After Pass: redirect to awaiting_payment instead of phase_1_passed
        if enrollment.payment_type == "pay_after_pass":
            to_status = "awaiting_payment"
            handle_transition(enrollment, from_status, to_status, "phase-1", reason="Pay After Pass: Phase 1 profit target reached, awaiting full payment")
            logger.info(f"[Phase 1 Check] PAP Enrollment {enrollment.id} transitioned to {to_status}")
        else:
            to_status = "phase_1_passed"
            handle_transition(enrollment, from_status, to_status, "phase-1", reason="Phase 1 profit target reached")
            logger.info(f"[Phase 1 Check] Enrollment {enrollment.id} transitioned from {from_status} to {to_status}")

        return True

    return False
