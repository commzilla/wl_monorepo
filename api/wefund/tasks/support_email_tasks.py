import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3},
    retry_backoff=True,
    time_limit=60,
    soft_time_limit=50,
)
def send_support_email_task(self, conversation_id, message_id, to_email,
                            subject, body_html, body_text=None, agent_id=None):
    """
    Async task to send a support email with retries and backoff.
    """
    from wefund.models import SupportConversation, SupportMessage
    from api.services.support_email_service import SupportEmailService

    try:
        conversation = SupportConversation.objects.get(id=conversation_id)
    except SupportConversation.DoesNotExist:
        logger.error("send_support_email_task: conversation %s not found", conversation_id)
        return

    try:
        message = SupportMessage.objects.get(id=message_id)
    except SupportMessage.DoesNotExist:
        logger.error("send_support_email_task: message %s not found", message_id)
        return

    # Resolve agent for email signature
    agent = None
    if agent_id:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        agent = User.objects.filter(id=agent_id).first()

    success, error = SupportEmailService.send_support_email(
        conversation=conversation,
        message=message,
        to_email=to_email,
        subject=subject,
        body_html=body_html,
        body_text=body_text,
        agent=agent,
    )

    if not success:
        logger.error(
            "Support email failed for conversation %s: %s",
            conversation_id, error,
        )
        raise Exception(f"Email send failed: {error}")

    logger.info(
        "Support email sent successfully for conversation %s to %s",
        conversation_id, to_email,
    )


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3},
    retry_backoff=True,
    time_limit=60,
    soft_time_limit=50,
)
def process_inbound_support_email(self, from_email, to_email, subject,
                                  body_text, body_html=None,
                                  in_reply_to=None, references=None,
                                  message_id=None):
    """
    Async task to process an inbound email reply into a support conversation.
    """
    from api.services.support_email_service import SupportEmailService

    conversation, message = SupportEmailService.process_inbound_email(
        from_email=from_email,
        to_address=to_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        in_reply_to=in_reply_to,
        references=references,
        message_id=message_id,
    )

    if conversation is None:
        logger.warning(
            "Inbound email from %s could not be matched to a conversation",
            from_email,
        )
        return

    logger.info(
        "Inbound email processed: conversation=%s message=%s",
        conversation.id, message.id,
    )
