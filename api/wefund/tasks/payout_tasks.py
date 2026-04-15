import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from wefund.models import TraderPayout, Notification

logger = logging.getLogger(__name__)


@shared_task
def auto_revert_extended_reviews():
    """
    Revert payouts from extended_review back to pending once deadline passes.
    """
    now = timezone.now()
    qs = TraderPayout.objects.filter(status='extended_review', extended_review_until__isnull=False, extended_review_until__lte=now)
    count = 0
    for p in qs:
        p.status = 'pending'
        p.extended_review_until = None
        p.extended_review_days = None
        p.save(update_fields=['status', 'extended_review_until', 'extended_review_days'])
        count += 1
    return count


@shared_task
def auto_extend_pending_payouts():
    """
    Automatically put pending payouts into extended review (10 business days)
    if they haven't been approved or denied within 72 hours of the request.
    """
    from api.services.email_service import EmailService
    from wefund.event_logger import log_event

    cutoff = timezone.now() - timedelta(hours=72)
    qs = TraderPayout.objects.filter(
        status='pending',
        requested_at__lte=cutoff,
    )

    count = 0
    for payout in qs:
        days = 10
        payout.set_extended_review(business_days=days)
        payout.released_fund = 0
        payout.save(update_fields=[
            'status', 'released_fund',
            'extended_review_until', 'extended_review_days',
        ])

        # Notify the trader
        Notification.objects.create(
            user=payout.trader,
            title="Payout Under Extended Review",
            message=f"Your payout request of ${payout.amount:,.2f} has been placed under extended review for {days} business days.",
            type="payout",
            is_custom=True,
            action_url="/withdrawl",
        )

        # Send the extended review email
        try:
            EmailService.send_extended_review_email(payout.trader, payout, days)
        except Exception:
            logger.exception("Failed to send extended review email for payout %s", payout.id)

        # Log event
        log_event(
            event_type="payout_extended",
            user=payout.trader,
            category="payout",
            challenge_enrollment=payout.challenge_enrollment,
            metadata={
                "payout_id": str(payout.id),
                "amount": float(payout.amount),
                "days_extended": days,
                "extended_review_until": str(payout.extended_review_until) if payout.extended_review_until else None,
                "trigger": "auto_72h",
            },
            description=f"Payout automatically placed under extended review after 72 hours pending.",
        )

        count += 1
        logger.info("Auto-extended payout %s after 72h pending", payout.id)

    return count


