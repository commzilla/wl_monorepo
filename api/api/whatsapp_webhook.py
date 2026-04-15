import logging
import os

from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt

from wefund.integrations.whatsapp.twilio_service import (
    format_phone_number,
    verify_webhook_signature,
)
from wefund.tasks.whatsapp_tasks import (
    process_inbound_whatsapp_message,
    update_message_delivery_status,
)

# Dedicated logger
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
logger = logging.getLogger("whatsapp_webhook")
logger.setLevel(logging.INFO)
log_file = os.path.join(LOG_DIR, "whatsapp_webhook.log")
if not logger.handlers:
    file_handler = logging.FileHandler(log_file)
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)


def _build_webhook_url(request, path_suffix):
    """Build the full webhook URL for signature verification."""
    base = getattr(settings, "TWILIO_WEBHOOK_BASE_URL", "")
    if base:
        return f"{base.rstrip('/')}/{path_suffix.lstrip('/')}"
    # Fallback: build from request
    return request.build_absolute_uri()


@csrf_exempt
def whatsapp_inbound_webhook(request):
    """
    Handle inbound WhatsApp messages from Twilio.
    POST /api/webhooks/whatsapp/inbound/
    """
    if request.method != "POST":
        return HttpResponseBadRequest("Only POST allowed")

    # Verify Twilio signature
    signature = request.META.get("HTTP_X_TWILIO_SIGNATURE", "")
    url = _build_webhook_url(request, "webhooks/whatsapp/inbound/")
    params = request.POST.dict()

    if not verify_webhook_signature(url, params, signature):
        logger.warning("Invalid Twilio signature for inbound webhook")
        return HttpResponseForbidden("Invalid signature")

    # Extract message data
    from_number = request.POST.get("From", "")
    body = request.POST.get("Body", "")
    profile_name = request.POST.get("ProfileName", "")
    message_sid = request.POST.get("MessageSid", "")

    if not from_number or not body:
        logger.warning("Missing From or Body in webhook | From=%s", from_number)
        return HttpResponseBadRequest("Missing required fields")

    wa_id = format_phone_number(from_number)

    logger.info(
        "Inbound WhatsApp message | from=%s profile=%s sid=%s body_length=%d",
        wa_id, profile_name, message_sid, len(body),
    )

    # Dispatch to Celery for async processing
    process_inbound_whatsapp_message.delay(
        wa_id=wa_id,
        body=body,
        profile_name=profile_name,
        message_sid=message_sid,
    )

    # Return 200 immediately — Twilio expects fast response
    return HttpResponse(status=200)


@csrf_exempt
def whatsapp_voice_webhook(request):
    """
    Handle incoming WhatsApp voice calls from Twilio.
    POST /api/webhooks/whatsapp/voice/

    Returns TwiML instructing Twilio to open a ConversationRelay WebSocket.
    """
    if request.method != "POST":
        return HttpResponseBadRequest("Only POST allowed")

    # Verify Twilio signature
    signature = request.META.get("HTTP_X_TWILIO_SIGNATURE", "")
    url = _build_webhook_url(request, "webhooks/whatsapp/voice/")
    params = request.POST.dict()

    if not verify_webhook_signature(url, params, signature):
        logger.warning("Invalid Twilio signature for voice webhook")
        return HttpResponseForbidden("Invalid signature")

    call_sid = request.POST.get("CallSid", "")
    from_number = request.POST.get("From", "")

    logger.info("Voice call incoming | callSid=%s from=%s", call_sid, from_number)

    ws_base = getattr(settings, "VOICE_WS_BASE_URL", "wss://api.we-fund.com")
    ws_url = f"{ws_base}/ws/voice/"

    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        "<Connect>"
        f'<ConversationRelay url="{ws_url}" '
        'voice="Google.en-US-Journey-F" '
        'language="en-US" '
        'ttsProvider="google" '
        'transcriptionProvider="google" '
        'interruptible="true" '
        'dtmfDetection="true" />'
        "</Connect>"
        "</Response>"
    )

    return HttpResponse(twiml, content_type="text/xml")


@csrf_exempt
def whatsapp_status_webhook(request):
    """
    Handle message delivery status callbacks from Twilio.
    POST /api/webhooks/whatsapp/status/
    """
    if request.method != "POST":
        return HttpResponseBadRequest("Only POST allowed")

    # Verify Twilio signature
    signature = request.META.get("HTTP_X_TWILIO_SIGNATURE", "")
    url = _build_webhook_url(request, "webhooks/whatsapp/status/")
    params = request.POST.dict()

    if not verify_webhook_signature(url, params, signature):
        logger.warning("Invalid Twilio signature for status webhook")
        return HttpResponseForbidden("Invalid signature")

    message_sid = request.POST.get("MessageSid", "")
    message_status = request.POST.get("MessageStatus", "")

    if message_sid and message_status:
        logger.info("Status update | sid=%s status=%s", message_sid, message_status)
        update_message_delivery_status.delay(
            twilio_sid=message_sid,
            status=message_status,
        )

    return HttpResponse(status=200)
