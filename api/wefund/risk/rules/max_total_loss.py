from decimal import Decimal
import logging
from django.utils import timezone
from wefund.models import ChallengeEnrollment, BreachHistory
from wefund.risk.breach_handler import handle_breach
from wefund.mt5_controller.utils import fetch_user_equity  # ✅ use the new function

logger = logging.getLogger(__name__)


def run(enrollment: ChallengeEnrollment, equity=None):
    """
    Breaches if current equity < (account_size - max_loss % of account_size).
    """

    today = timezone.now().date()

    # SKIP if already breached today
    if BreachHistory.objects.filter(
        enrollment=enrollment,
        rule="max_total_loss",
        breached_at__date=today
    ).exists():
        logger.info(
            f"[MaxTotalLoss Rule] Skipping {enrollment.id} — already breached today"
        )
        return

    if enrollment.status == "failed":
        logger.info(
            f"[MaxTotalLoss Rule] Skipping failed enrollment {enrollment.id} "
            f"account {enrollment.mt5_account_id}"
        )
        return

    try:
        # Get challenge phase details
        phase = enrollment.challenge.phases.get(
            phase_type=enrollment.get_current_phase_type()
        )
        initial_balance = enrollment.account_size
        max_loss_percent = phase.max_loss

        # Use pre-fetched equity, fall back to individual fetch
        if equity is None:
            equity = fetch_user_equity(enrollment.mt5_account_id)

        if equity is None or equity <= 0:
            logger.info(
                f"[MaxTotalLoss Rule] Skipping {enrollment.id} account {enrollment.mt5_account_id} "
                f"(equity not available or still 0.00)"
            )
            return

        # Calculate allowed loss
        max_loss_amount = (Decimal(max_loss_percent) / Decimal("100.00")) * initial_balance
        threshold_equity = initial_balance - max_loss_amount

        if equity < threshold_equity:
            reason = (
                f"Max Total Loss breached: Equity ${equity:.2f} fell below threshold "
                f"${threshold_equity:.2f} (Max Loss {max_loss_percent}%)"
            )
            handle_breach(enrollment, rule="max_total_loss", reason=reason)

    except Exception as e:
        logger.error(
            f"[MaxTotalLoss Rule] Error for enrollment {enrollment.id} "
            f"account {enrollment.mt5_account_id}: {e}",
            exc_info=True,
        )
