import uuid
from celery import shared_task
import logging

logger = logging.getLogger(__name__)

CHUNK_SIZE = 100


@shared_task
def run_risk_evaluation():
    """
    Dispatcher: fetches active enrollment IDs, splits into chunks,
    and dispatches each chunk as a separate task for parallel evaluation.

    This replaces the old sequential approach where a single task
    iterated through all ~700 enrollments in ~30 seconds. Now each
    chunk of ~100 enrollments runs as an independent task (~4 seconds),
    and multiple chunks execute concurrently across workers.
    """
    logger.info("Running scheduled risk evaluation...")

    from wefund.models import ChallengeEnrollment

    enrollment_ids = list(
        ChallengeEnrollment.objects.filter(
            is_active=True, mt5_account_id__isnull=False
        ).values_list("id", flat=True)
    )

    if not enrollment_ids:
        logger.info("No active enrollments to evaluate.")
        return

    chunks = [
        enrollment_ids[i:i + CHUNK_SIZE]
        for i in range(0, len(enrollment_ids), CHUNK_SIZE)
    ]

    dispatch_id = uuid.uuid4().hex[:8]

    for idx, chunk_ids in enumerate(chunks):
        # Convert UUIDs to strings for Celery JSON serialization
        evaluate_risk_chunk.delay(
            [str(eid) for eid in chunk_ids], dispatch_id, idx
        )

    logger.info(
        f"[{dispatch_id}] Risk evaluation dispatched {len(chunks)} chunks "
        f"({len(enrollment_ids)} enrollments)"
    )


@shared_task
def evaluate_risk_chunk(enrollment_ids, dispatch_id="?", chunk_idx=0):
    """Evaluate risk rules for a specific chunk of enrollments."""
    tag = f"[{dispatch_id}][chunk {chunk_idx}]"
    logger.info(f"{tag} Evaluating {len(enrollment_ids)} enrollments...")

    try:
        from wefund.risk.engine import evaluate_enrollments
        evaluate_enrollments(enrollment_ids)
    except Exception:
        logger.exception(f"{tag} Risk chunk FAILED")
        return

    logger.info(f"{tag} Risk chunk completed ({len(enrollment_ids)} enrollments).")
