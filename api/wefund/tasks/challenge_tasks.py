from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task
def run_challenge_engine():
    """
    Periodic task to run the Challenge Engine for all active enrollments.
    """
    logger.info("Starting scheduled challenge engine run...")

    # Import here to avoid issues with app loading
    from wefund.challenges.engine import evaluate_all_challenges

    try:
        evaluate_all_challenges()
        logger.info("Challenge engine run completed successfully.")
    except Exception as e:
        logger.exception(f"Challenge engine run failed: {e}")