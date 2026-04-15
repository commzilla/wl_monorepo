from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from wefund.models import (
    User, ActivityLog, TraderPayout, ChallengeEnrollment, 
    BreachHistory, SoftBreach, PayoutConfiguration, 
    InternalNote, EnrollmentTransitionLog
)


# Helper function to create activity logs
def create_activity_log(actor, action_type, content_object, details=None):
    """
    Helper function to create activity logs consistently across different signals.
    """
    if details is None:
        details = {}
    
    ActivityLog.objects.create(
        actor=actor,
        action_type=action_type,
        content_object=content_object,
        details=details
    )


@receiver(pre_save, sender=User)
def log_user_administrative_changes(sender, instance: User, **kwargs):
    """
    Logs administrative changes (role, status, 2FA) to the User model on update.
    """
    # Only proceed for updates (existing records)
    if not instance.pk:
        return

    details = {}
    action_type = 'data_updated'

    try:
        old_instance = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    # Role Change
    if old_instance.role != instance.role:
        details['role_change'] = (old_instance.role, instance.role)
        action_type = 'status_change'

    # Status Change (Active/Suspended/Deleted)
    if old_instance.status != instance.status:
        details['status_change'] = (old_instance.status, instance.status)
        action_type = 'status_change'
        if instance.status == 'suspended':
            action_type = 'account_blocked'

    # 2FA Toggle/Method Change
    if old_instance.two_factor_enabled != instance.two_factor_enabled:
        details['two_factor_toggle'] = instance.two_factor_enabled
        action_type = 'data_updated'

    if old_instance.two_factor_method != instance.two_factor_method:
        details['two_factor_method_change'] = (old_instance.two_factor_method, instance.two_factor_method)
        action_type = 'data_updated'

    if not details:
        return

    # Actor is unknown in signals context; default to None (system) unless set by explicit service
    create_activity_log(None, action_type, instance, details)


@receiver(post_save, sender=User)
def log_user_creation(sender, instance: User, created, **kwargs):
    """
    Logs user creation in post_save to ensure PK exists.
    """
    if not created:
        return
    details = {
        "message": f"User account created with initial role: {instance.role}",
        "username": instance.username,
        "email": instance.email,
    }
    create_activity_log(None, 'note_added', instance, details)


@receiver(pre_save, sender=TraderPayout)
def log_payout_changes(sender, instance: TraderPayout, **kwargs):
    """
    Logs payout approvals, rejections, payments and field changes on update.
    Handles missing currency gracefully.
    """
    # Skip logging for new records
    if not instance.pk:
        return

    details = {}
    action_type = 'data_updated'

    try:
        old_instance = TraderPayout.objects.get(pk=instance.pk)
    except TraderPayout.DoesNotExist:
        return

    # --- Get currency safely ---
    currency = getattr(instance, "currency", None)
    if not currency and instance.challenge_enrollment:
        currency = getattr(instance.challenge_enrollment, "currency", None)
    if not currency:
        currency = "USD"

    # --- Status changes ---
    if old_instance.status != instance.status:
        details['status_change'] = (old_instance.status, instance.status)

        if instance.status == 'approved':
            action_type = 'payout_approved'
            details['message'] = f"Payout of {instance.amount} {currency} approved"
            if instance.reviewed_at:
                details['reviewed_at'] = instance.reviewed_at.isoformat()

        elif instance.status == 'paid':
            action_type = 'payout_paid'
            details['message'] = f"Payout of {instance.amount} {currency} marked as paid"
            if instance.paid_at:
                details['paid_at'] = instance.paid_at.isoformat()

        elif instance.status == 'rejected':
            action_type = 'status_change'
            details['message'] = f"Payout of {instance.amount} {currency} rejected"
            if instance.rejection_reason:
                details['rejection_reason'] = instance.rejection_reason

        else:
            action_type = 'status_change'
            details['message'] = f"Payout status changed to {instance.status}"

    # --- Profit share changes ---
    if old_instance.profit_share != instance.profit_share:
        if 'message' not in details:
            details['message'] = "Payout details updated"
        details['profit_share_change'] = (
            str(old_instance.profit_share),
            str(instance.profit_share)
        )
        action_type = 'data_updated'

    # --- Released fund changes ---
    if old_instance.released_fund != instance.released_fund:
        if 'message' not in details:
            details['message'] = "Payout details updated"
        details['released_fund_change'] = (
            str(old_instance.released_fund),
            str(instance.released_fund)
        )
        action_type = 'data_updated'

    # --- Timestamps updates ---
    if old_instance.paid_at != instance.paid_at and instance.paid_at:
        details['paid_at'] = instance.paid_at.isoformat()
        action_type = 'payout_paid'

    if old_instance.reviewed_at != instance.reviewed_at and instance.reviewed_at:
        details['reviewed_at'] = instance.reviewed_at.isoformat()

    if not details:
        return

    content_object = (
        instance.challenge_enrollment
        if getattr(instance, 'challenge_enrollment', None)
        else instance
    )
    create_activity_log(None, action_type, content_object, details)


@receiver(post_save, sender=TraderPayout)
def log_payout_creation(sender, instance: TraderPayout, created, **kwargs):
    """Log new payout creation events."""
    if not created:
        return

    # Get currency from related enrollment or fallback
    currency = "USD"
    if instance.challenge_enrollment:
        currency = getattr(instance.challenge_enrollment, "currency", "USD")

    details = {
        "message": f"Payout request created for {instance.amount} {currency}",
        "amount": str(instance.amount),
        "currency": currency,
    }

    content_object = (
        instance.challenge_enrollment
        if getattr(instance, 'challenge_enrollment', None)
        else instance
    )

    create_activity_log(None, 'note_added', content_object, details)


@receiver(pre_save, sender=ChallengeEnrollment)
def log_enrollment_changes(sender, instance: ChallengeEnrollment, **kwargs):
    """
    Logs changes to challenge enrollments, including status changes, on update.
    """
    if not instance.pk:
        return
    try:
        old_instance = ChallengeEnrollment.objects.get(pk=instance.pk)
    except ChallengeEnrollment.DoesNotExist:
        return

    details = {}
    action_type = 'status_change'

    if old_instance.status != instance.status:
        details['status_change'] = (old_instance.status, instance.status)
        details['message'] = f"Challenge status changed from {old_instance.status} to {instance.status}"

    if not details:
        return

    create_activity_log(None, action_type, instance, details)


@receiver(post_save, sender=ChallengeEnrollment)
def log_enrollment_creation(sender, instance: ChallengeEnrollment, created, **kwargs):
    if not created:
        return
    details = {
        "message": f"Challenge enrollment created with account size: {instance.account_size} {instance.currency}",
        "account_size": str(instance.account_size),
        "currency": instance.currency,
    }
    create_activity_log(None, 'note_added', instance, details)


@receiver(post_save, sender=BreachHistory)
def log_breach_events(sender, instance, created, **kwargs):
    """
    Logs all breach detections automatically to ActivityLog whenever a BreachHistory record is created.
    """
    if not created:
        return

    try:
        ActivityLog.objects.create(
            user=instance.user,
            client=instance.client,
            enrollment=instance.enrollment,
            action_type='breach_detected',
            details={
                "rule": instance.rule,          # e.g. 'Max Total Loss', 'Martingale'
                "reason": instance.reason,      # detailed reason/explanation
                "breached_at": instance.breached_at.isoformat(),
            }
        )
    except Exception as e:
        # prevent breaking signal chain if ActivityLog creation fails
        print(f"[Signal: log_breach_events] Failed to log breach: {e}")


@receiver(post_save, sender=SoftBreach)
def log_soft_breach_events(sender, instance: SoftBreach, created, **kwargs):
    """
    Logs soft breach events as system-triggered events.
    """
    if created:  # Only log when a soft breach is created
        details = {
            "message": f"System detected soft breach: {instance.rule}",
            "rule": instance.rule,
            "account_id": instance.account_id,
            "detected_at": instance.detected_at.isoformat(),
        }
        
        # Get the enrollment if available
        content_object = instance.enrollment if hasattr(instance, 'enrollment') and instance.enrollment else instance
        create_activity_log(None, 'system_breach', content_object, details)


@receiver(pre_save, sender=PayoutConfiguration)
def log_payout_configuration_changes(sender, instance: PayoutConfiguration, **kwargs):
    """
    Logs changes to payout configurations on update.
    """
    if not instance.pk:
        return

    try:
        old_instance = PayoutConfiguration.objects.get(pk=instance.pk)
    except PayoutConfiguration.DoesNotExist:
        return

    details = {}
    action_type = 'data_updated'

    # Base share percent changes
    if old_instance.base_share_percent != instance.base_share_percent:
        details['base_share_percent_change'] = (old_instance.base_share_percent, instance.base_share_percent)
        details['message'] = f"Payout share percent changed from {old_instance.base_share_percent}% to {instance.base_share_percent}%"

    # Profit share override changes (if using custom config)
    if getattr(old_instance, 'profit_share_percent', None) != getattr(instance, 'profit_share_percent', None):
        if 'message' not in details:
            details['message'] = "Payout configuration updated"
        details['profit_share_percent_change'] = (
            getattr(old_instance, 'profit_share_percent', None),
            getattr(instance, 'profit_share_percent', None),
        )

    # First payout delay changes
    if getattr(old_instance, 'first_payout_delay_minutes', None) != getattr(instance, 'first_payout_delay_minutes', None):
        if 'message' not in details:
            details['message'] = "Payout configuration updated"
        details['first_payout_delay_change'] = (
            getattr(old_instance, 'first_payout_delay_minutes', None),
            getattr(instance, 'first_payout_delay_minutes', None),
        )

    if not details:
        return

    # Get the enrollment or client if available
    if getattr(instance, 'enrollment', None):
        content_object = instance.enrollment
    elif getattr(instance, 'client', None):
        content_object = instance.client
    else:
        content_object = instance

    create_activity_log(None, action_type, content_object, details)


@receiver(post_save, sender=PayoutConfiguration)
def log_payout_configuration_creation(sender, instance: PayoutConfiguration, created, **kwargs):
    if not created:
        return
    details = {
        "message": f"Payout configuration created with base share percent: {instance.base_share_percent}%",
        "base_share_percent": instance.base_share_percent,
    }
    if getattr(instance, 'enrollment', None):
        content_object = instance.enrollment
    elif getattr(instance, 'client', None):
        content_object = instance.client
    else:
        content_object = instance
    create_activity_log(None, 'note_added', content_object, details)


@receiver(post_save, sender=InternalNote)
def log_internal_note_changes(sender, instance: InternalNote, created, **kwargs):
    """
    Logs when internal notes are added or updated.
    """
    actor = kwargs.pop('actor', None)
    
    if created:
        details = {
            "message": "Internal note added",
            "note_content": instance.note[:100] + ("..." if len(instance.note) > 100 else ""),
        }
        action_type = 'note_added'
    else:
        details = {
            "message": "Internal note updated",
            "note_content": instance.note[:100] + ("..." if len(instance.note) > 100 else ""),
        }
        action_type = 'note_added'
    
    # Get the related object if available
    if hasattr(instance, 'content_object') and instance.content_object:
        content_object = instance.content_object
    else:
        content_object = instance
        
    create_activity_log(actor, action_type, content_object, details)


@receiver(post_save, sender=EnrollmentTransitionLog)
def log_enrollment_transitions(sender, instance: EnrollmentTransitionLog, created, **kwargs):
    """
    Logs enrollment transitions as activity logs.
    """
    if created:  # Only log when a transition is created
        details = {
            "message": f"Enrollment transitioned from {instance.from_status} to {instance.to_status}",
            "from_status": instance.from_status,
            "to_status": instance.to_status,
            "reason": instance.reason or "Not specified",
        }
        
        # Add any metadata if available
        if instance.meta:
            details["meta"] = instance.meta
            
        # Determine action type based on transition
        if "breach" in instance.reason.lower() if instance.reason else False:
            action_type = 'system_breach'
        elif "reset" in instance.reason.lower() if instance.reason else False:
            action_type = 'system_reset'
        else:
            action_type = 'status_change'
            
        create_activity_log(None, action_type, instance.enrollment, details)
