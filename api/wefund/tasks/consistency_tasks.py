from celery import shared_task
from uuid import UUID

from wefund.models import TraderPayout
from wefund.payouts.automation import auto_reject_payout_if_needed


@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={"max_retries": 3, "countdown": 60})
def delayed_payout_auto_reject(self, payout_id: str):
    """
    Runs auto rejection logic after delay.
    Applies ONLY to 1-step challenges.
    """

    try:
        payout = TraderPayout.objects.select_related(
            "challenge_enrollment",
            "challenge_enrollment__challenge",
            "trader",
        ).get(id=UUID(payout_id))
    except TraderPayout.DoesNotExist:
        return "Payout not found"

    # --- STATUS GUARD ---
    if payout.status != "pending":
        return f"Skipped: payout status is {payout.status}"

    enrollment = payout.challenge_enrollment
    if not enrollment or not enrollment.challenge:
        return "Skipped: missing challenge enrollment"

    # --- ✅ 1-STEP ONLY ---
    if enrollment.challenge.step_type != "1-step":
        return f"Skipped: challenge is {enrollment.challenge.step_type}"

    # --- RUN ENGINE ---
    result = auto_reject_payout_if_needed(payout=payout)
    return f"Auto reject executed: {result}"
