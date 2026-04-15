import logging

from celery import shared_task
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

RATE_LIMIT_KEY_PREFIX = "whatsapp_rate:"
RATE_LIMIT_MAX = 30
RATE_LIMIT_WINDOW = 3600  # 1 hour


def _check_rate_limit(conversation_id):
    """Check if conversation has exceeded AI message rate limit."""
    key = f"{RATE_LIMIT_KEY_PREFIX}{conversation_id}"
    current = cache.get(key, 0)
    if current >= RATE_LIMIT_MAX:
        return False
    cache.set(key, current + 1, RATE_LIMIT_WINDOW)
    return True


def _check_escalation_keywords(text, keywords):
    """Check if message text contains any escalation keywords."""
    if not keywords:
        return False
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in keywords)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3},
    retry_backoff=True,
    time_limit=60,
    soft_time_limit=50,
)
def process_inbound_whatsapp_message(self, wa_id, body, profile_name="", message_sid=""):
    """
    Process an inbound WhatsApp message:
    1. Get or create conversation
    2. Store inbound message
    3. Check AI/bot settings
    4. Check escalation keywords
    5. Generate AI response
    6. Send reply via Twilio
    7. Store outbound message
    """
    from wefund.models import WhatsAppConversation, WhatsAppMessage, WhatsAppBotConfig
    from wefund.integrations.whatsapp.twilio_service import send_message
    from wefund.integrations.whatsapp.sales_agent import generate_ai_response
    from wefund.event_logger import log_engine_event

    now = timezone.now()

    # 1. Get or create conversation
    conversation, created = WhatsAppConversation.objects.get_or_create(
        wa_id=wa_id,
        defaults={
            "profile_name": profile_name,
            "last_message_at": now,
        }
    )
    if not created:
        conversation.last_message_at = now
        update_fields = ["last_message_at"]
        if profile_name and profile_name != conversation.profile_name:
            conversation.profile_name = profile_name
            update_fields.append("profile_name")
        conversation.message_count += 1
        update_fields.append("message_count")
        conversation.save(update_fields=update_fields)
    else:
        conversation.message_count = 1
        conversation.save(update_fields=["message_count"])
        try:
            log_engine_event(
                category="whatsapp",
                event_type="whatsapp_conversation_started",
                engine="whatsapp",
                description=f"New WhatsApp conversation from {profile_name or wa_id}",
                metadata={"wa_id": wa_id, "profile_name": profile_name},
            )
        except Exception:
            pass

    # 2. Store inbound message
    inbound_msg = WhatsAppMessage.objects.create(
        conversation=conversation,
        direction="inbound",
        sender_type="user",
        content=body,
        twilio_sid=message_sid,
        delivery_status="delivered",
    )

    # Update lead status from new to engaged on second+ message
    if conversation.lead_status == "new" and conversation.message_count > 1:
        conversation.lead_status = "engaged"
        conversation.save(update_fields=["lead_status"])

    # 3. Check if AI is enabled
    config = WhatsAppBotConfig.get_config()
    if not config.bot_enabled:
        logger.info("WhatsApp bot globally disabled | wa_id=%s", wa_id)
        return {"status": "bot_disabled"}

    if not conversation.ai_enabled:
        logger.info("AI disabled for conversation | wa_id=%s", wa_id)
        return {"status": "ai_disabled"}

    if conversation.status == "resolved":
        # Reopen resolved conversations on new message
        conversation.status = "active"
        conversation.save(update_fields=["status"])

    if conversation.status == "human_handoff":
        logger.info("Conversation in human handoff | wa_id=%s", wa_id)
        return {"status": "human_handoff"}

    # 4. Check escalation keywords
    if _check_escalation_keywords(body, config.escalation_keywords):
        conversation.status = "human_handoff"
        conversation.ai_enabled = False
        conversation.save(update_fields=["status", "ai_enabled"])

        # Send handoff message
        handoff_text = config.handoff_message or "I'm connecting you with a human agent. Please hold on!"
        sid = send_message(wa_id, handoff_text)

        WhatsAppMessage.objects.create(
            conversation=conversation,
            direction="outbound",
            sender_type="system",
            content=handoff_text,
            twilio_sid=sid,
            delivery_status="sent" if sid else "failed",
        )

        try:
            log_engine_event(
                category="whatsapp",
                event_type="whatsapp_handoff_keyword",
                engine="whatsapp",
                description=f"Escalation keyword detected in message from {wa_id}",
                metadata={"wa_id": wa_id, "message": body[:200]},
            )
        except Exception:
            pass

        return {"status": "escalation_keyword", "handoff": True}

    # 5. Rate limit check
    if not _check_rate_limit(str(conversation.id)):
        logger.warning("Rate limit exceeded | wa_id=%s conversation=%s", wa_id, conversation.id)
        return {"status": "rate_limited"}

    # 6. Build conversation history for AI
    recent_messages = (
        WhatsAppMessage.objects
        .filter(conversation=conversation, is_internal=False)
        .order_by("created_at")
    )[:20]

    history = []
    for msg in recent_messages:
        if msg.direction == "inbound":
            history.append({"role": "user", "content": msg.content})
        else:
            history.append({"role": "assistant", "content": msg.content})

    # 7. Generate AI response
    config_overrides = {}
    if config.ai_model:
        config_overrides["ai_model"] = config.ai_model
    config_overrides["ai_temperature"] = config.ai_temperature
    config_overrides["ai_max_tokens"] = config.ai_max_tokens
    if config.system_prompt_override:
        config_overrides["system_prompt_override"] = config.system_prompt_override

    result = generate_ai_response(history, config_overrides)

    # 8. Process tool calls
    tool_calls = result.get("tool_calls", [])
    handoff_requested = False

    for tc in tool_calls:
        tool_name = tc.get("name", "")
        tool_input = tc.get("input", {})

        if tool_name == "capture_lead_info":
            lead_data = conversation.lead_data or {}
            for field in ["name", "email", "country", "trading_experience"]:
                if tool_input.get(field):
                    lead_data[field] = tool_input[field]
            if tool_input.get("interested_products"):
                existing = lead_data.get("interested_products", [])
                lead_data["interested_products"] = list(set(existing + tool_input["interested_products"]))
            conversation.lead_data = lead_data
            if conversation.lead_status in ("new", "engaged"):
                conversation.lead_status = "qualified"
            conversation.save(update_fields=["lead_data", "lead_status"])

            try:
                log_engine_event(
                    category="whatsapp",
                    event_type="whatsapp_lead_captured",
                    engine="whatsapp",
                    description=f"Lead info captured for {wa_id}",
                    metadata={"wa_id": wa_id, "lead_data": lead_data},
                )
            except Exception:
                pass

        elif tool_name == "recommend_product":
            metadata = conversation.metadata or {}
            recs = metadata.get("recommendations", [])
            recs.append({
                "challenge_type": tool_input.get("challenge_type"),
                "account_size": tool_input.get("account_size"),
                "reasoning": tool_input.get("reasoning"),
                "timestamp": now.isoformat(),
            })
            metadata["recommendations"] = recs
            conversation.metadata = metadata
            conversation.save(update_fields=["metadata"])

        elif tool_name == "request_handoff":
            handoff_requested = True
            conversation.status = "human_handoff"
            conversation.ai_enabled = False
            conversation.save(update_fields=["status", "ai_enabled"])

            try:
                log_engine_event(
                    category="whatsapp",
                    event_type="whatsapp_handoff_requested",
                    engine="whatsapp",
                    description=f"AI requested handoff for {wa_id}: {tool_input.get('reason', '')}",
                    metadata={"wa_id": wa_id, "reason": tool_input.get("reason", "")},
                )
            except Exception:
                pass

    # 9. Send reply
    reply_text = result["text"]
    sid = send_message(wa_id, reply_text)

    # 10. Store outbound message
    WhatsAppMessage.objects.create(
        conversation=conversation,
        direction="outbound",
        sender_type="ai",
        content=reply_text,
        twilio_sid=sid,
        delivery_status="sent" if sid else "failed",
        ai_model_used=result.get("model", ""),
        ai_tokens_used=result.get("tokens_used"),
        ai_tool_calls=tool_calls,
    )

    # Update AI message count
    conversation.ai_message_count += 1
    conversation.save(update_fields=["ai_message_count"])

    return {
        "status": "replied",
        "conversation_id": str(conversation.id),
        "handoff": handoff_requested,
        "tokens_used": result.get("tokens_used", 0),
    }


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 2, "countdown": 3},
    time_limit=15,
)
def update_message_delivery_status(self, twilio_sid, status):
    """
    Update WhatsAppMessage delivery_status by Twilio SID.
    Maps Twilio statuses to internal statuses.
    """
    from wefund.models import WhatsAppMessage

    if not twilio_sid:
        return {"status": "no_sid"}

    # Map Twilio statuses
    status_map = {
        "queued": "queued",
        "sent": "sent",
        "delivered": "delivered",
        "read": "read",
        "failed": "failed",
        "undelivered": "failed",
    }
    mapped_status = status_map.get(status, status)

    try:
        msg = WhatsAppMessage.objects.get(twilio_sid=twilio_sid)
        msg.delivery_status = mapped_status
        msg.save(update_fields=["delivery_status"])
        logger.info("Delivery status updated | sid=%s status=%s", twilio_sid, mapped_status)
        return {"status": "updated", "message_id": str(msg.id)}
    except WhatsAppMessage.DoesNotExist:
        logger.warning("Message not found for delivery status update | sid=%s", twilio_sid)
        return {"status": "not_found"}
