import logging
import re

from django.conf import settings
from twilio.rest import Client
from twilio.request_validator import RequestValidator

logger = logging.getLogger(__name__)

# Lazy-initialized singleton
_client = None
_validator = None


def _get_client():
    global _client
    if _client is None:
        sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
        token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
        if not sid or not token:
            raise ValueError("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set")
        _client = Client(sid, token)
    return _client


def _get_validator():
    global _validator
    if _validator is None:
        token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
        if not token:
            raise ValueError("TWILIO_AUTH_TOKEN must be set")
        _validator = RequestValidator(token)
    return _validator


def verify_webhook_signature(url, params, signature):
    """
    Verify a Twilio webhook signature.
    Twilio signs form POST params (not raw body), so we use
    RequestValidator.validate(url, params, signature).
    """
    try:
        validator = _get_validator()
        return validator.validate(url, params, signature)
    except Exception as e:
        logger.error("Twilio signature verification error: %s", e)
        return False


def send_message(to, body):
    """
    Send a WhatsApp message via Twilio.
    Truncates at 1600 chars to stay within WhatsApp limits.
    Returns the Twilio message SID on success, None on failure.
    """
    from_number = getattr(settings, "TWILIO_WHATSAPP_NUMBER", "")
    if not from_number:
        logger.error("TWILIO_WHATSAPP_NUMBER not set")
        return None

    # Ensure whatsapp: prefix
    if not to.startswith("whatsapp:"):
        to = f"whatsapp:{to}"
    if not from_number.startswith("whatsapp:"):
        from_number = f"whatsapp:{from_number}"

    # Truncate message
    if len(body) > 1600:
        body = body[:1597] + "..."

    try:
        client = _get_client()
        message = client.messages.create(
            from_=from_number,
            to=to,
            body=body,
        )
        logger.info("WhatsApp message sent | sid=%s to=%s", message.sid, to)
        return message.sid
    except Exception as e:
        logger.exception("Failed to send WhatsApp message | to=%s error=%s", to, e)
        return None


def format_phone_number(raw):
    """
    Normalize phone number: strip 'whatsapp:' prefix, ensure E.164 format.
    """
    if not raw:
        return ""
    # Strip whatsapp: prefix
    phone = raw.replace("whatsapp:", "").strip()
    # Remove any non-digit characters except leading +
    if phone.startswith("+"):
        phone = "+" + re.sub(r"[^\d]", "", phone[1:])
    else:
        phone = re.sub(r"[^\d]", "", phone)
        if phone and not phone.startswith("+"):
            phone = "+" + phone
    return phone
