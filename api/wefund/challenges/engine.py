import logging
from wefund.models import ChallengeEnrollment
from wefund.challenges.rules import (
    phase_1_pass_check,
    phase_2_start,
    phase_2_pass_check,
    kyc_ready_for_live,
)
from wefund.challenges.phase_handler import handle_transition

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def evaluate_all_challenges():
    """
    Main engine loop to evaluate all active enrollments.
    """
    enrollments = ChallengeEnrollment.objects.filter(
        is_active=True
    ).exclude(status__in=['completed', 'failed', 'payout_limit_reached']).select_related(
        'client', 'client__user', 'challenge'
    )

    logger.info(f"Found {enrollments.count()} active enrollments")

    for enrollment in enrollments:
        logger.info(f"Running engine for enrollment {enrollment.id} ({enrollment.status})")
        try:
            run_enrollment(enrollment)
        except Exception as e:
            logger.error(f"  Error processing enrollment {enrollment.id}: {e}")

    logger.info("Engine run complete")


def run_enrollment(enrollment):
    """
    Run all rules sequentially for a single enrollment.
    Returns True if any transition was triggered.
    """
    # Phase 1 pass check
    if phase_1_pass_check.run(enrollment):
        logger.info(f"Enrollment {enrollment.id}: Phase 1 Passed")
        return True

    # Phase 2 start
    if phase_2_start.run(enrollment):
        logger.info(f"Enrollment {enrollment.id}: Phase 2 Started")
        return True

    # Phase 2 pass check
    if phase_2_pass_check.run(enrollment):
        logger.info(f"Enrollment {enrollment.id}: Phase 2 Passed")
        return True

    # KYC ready for live
    if kyc_ready_for_live.run(enrollment):
        logger.info(f"Enrollment {enrollment.id}: KYC Ready for Live")
        return True

    # No transitions triggered
    logger.info(f"Enrollment {enrollment.id}: No rule triggered")
    return False
