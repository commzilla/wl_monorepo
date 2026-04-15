from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from wefund.models import Notification, ScheduledNotification

User = get_user_model()


@shared_task(bind=True)
def deliver_scheduled_notification(self, scheduled_id):
    try:
        sn = ScheduledNotification.objects.get(id=scheduled_id)
    except ScheduledNotification.DoesNotExist:
        return "[Scheduler] Scheduled notification not found."

    if sn.status != "pending":
        return f"[Scheduler] Notification not pending (status={sn.status})"

    # Deliver now
    if sn.user:
        Notification.objects.create(
            user=sn.user,
            title=sn.title,
            message=sn.message,
            type=sn.type,
            action_url=sn.action_url,
            image_url=sn.image_url,
            expires_at=sn.expires_at,
            is_custom=True,
        )
    else:
        users = User.objects.filter(is_active=True)
        Notification.objects.bulk_create([
            Notification(
                user=u,
                title=sn.title,
                message=sn.message,
                type=sn.type,
                action_url=sn.action_url,
                image_url=sn.image_url,
                expires_at=sn.expires_at,
                is_global=True,
            ) for u in users
        ])

    sn.status = "sent"
    sn.save(update_fields=["status"])
    return f"[Scheduler] Notification '{sn.title}' delivered successfully"
