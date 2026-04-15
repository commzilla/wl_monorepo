from wefund.models import ChallengeEnrollment
from wefund.mt5_controller.utils import fetch_all_equities
from wefund.risk.rules import (
    max_total_loss,
    max_daily_loss,
    inactivity,
    hedging,
    martingale,
    all_in,
    pyramid,
    grid,
    account_management,
)

def evaluate_all_accounts():
    active_enrollments = list(
        ChallengeEnrollment.objects.filter(is_active=True, mt5_account_id__isnull=False)
    )

    # Batch-fetch all equities in one MySQL query
    account_ids = []
    for e in active_enrollments:
        if e.mt5_account_id:
            try:
                account_ids.append(int(e.mt5_account_id))
            except (ValueError, TypeError):
                pass
    equity_map = fetch_all_equities(account_ids)

    for enrollment in active_enrollments:
        if not enrollment.mt5_account_id:
            continue

        try:
            equity = equity_map.get(int(enrollment.mt5_account_id))
        except (ValueError, TypeError):
            equity = None

        # Run Max Total Loss check
        max_total_loss.run(enrollment, equity=equity)

        # Run Max Daily Loss check
        max_daily_loss.run(enrollment, equity=equity)

        # Run Inactivity check
        inactivity.run(enrollment)


def evaluate_enrollments(enrollment_ids):
    """
    Evaluate risk rules for a specific set of enrollment IDs.
    Used by the chunked parallel dispatcher for faster breach detection.
    """
    active_enrollments = list(
        ChallengeEnrollment.objects.filter(
            id__in=enrollment_ids, is_active=True, mt5_account_id__isnull=False
        )
    )

    # Batch-fetch equities for this chunk
    account_ids = []
    for e in active_enrollments:
        if e.mt5_account_id:
            try:
                account_ids.append(int(e.mt5_account_id))
            except (ValueError, TypeError):
                pass
    equity_map = fetch_all_equities(account_ids)

    for enrollment in active_enrollments:
        if not enrollment.mt5_account_id:
            continue

        try:
            equity = equity_map.get(int(enrollment.mt5_account_id))
        except (ValueError, TypeError):
            equity = None

        # Run Max Total Loss check
        max_total_loss.run(enrollment, equity=equity)

        # Run Max Daily Loss check
        max_daily_loss.run(enrollment, equity=equity)

        # Run Inactivity check
        inactivity.run(enrollment)
