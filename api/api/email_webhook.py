import hashlib
import hmac
import json
import logging
import os
from email import policy
from email.parser import BytesParser

from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt

from wefund.tasks.support_email_tasks import process_inbound_support_email

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
logger = logging.getLogger("email_webhook")
logger.setLevel(logging.INFO)
log_file = os.path.join(LOG_DIR, "email_webhook.log")
if not logger.handlers:
    file_handler = logging.FileHandler(log_file)
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)


def _verify_webhook(request):
    """Verify inbound email webhook authenticity."""
    secret = getattr(settings, 'INBOUND_EMAIL_WEBHOOK_SECRET', '')
    if not secret:
        logger.warning("INBOUND_EMAIL_WEBHOOK_SECRET not configured — rejecting webhook")
        return False

    # Support multiple verification methods
    # 1. Basic token in query param
    token = request.GET.get('token', '')
    if token and hmac.compare_digest(token, secret):
        return True

    # 2. Authorization header
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if auth_header and hmac.compare_digest(auth_header, f"Bearer {secret}"):
        return True

    return False


@csrf_exempt
def inbound_email_webhook(request):
    """
    Handle inbound email webhooks from email providers.
    POST /api/webhooks/email/inbound/

    Supports SendGrid Inbound Parse and Mailgun Routes formats.
    """
    if request.method != "POST":
        return HttpResponseBadRequest("Only POST allowed")

    if not _verify_webhook(request):
        logger.warning("Invalid webhook authentication for inbound email")
        return HttpResponseForbidden("Invalid authentication")

    content_type = request.content_type or ''

    # Parse based on content type
    if 'application/json' in content_type:
        # JSON payload (custom or Mailgun)
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            logger.warning("Invalid JSON in inbound email webhook")
            return HttpResponseBadRequest("Invalid JSON")

        from_email = data.get('from', data.get('sender', ''))
        to_email = data.get('to', data.get('recipient', ''))
        subject = data.get('subject', '')
        body_text = data.get('text', data.get('body-plain', ''))
        body_html = data.get('html', data.get('body-html', ''))
        in_reply_to = data.get('In-Reply-To', data.get('in_reply_to', ''))
        references = data.get('References', data.get('references', ''))
        message_id = data.get('Message-Id', data.get('message_id', data.get('Message-ID', '')))

    elif 'multipart/form-data' in content_type or 'application/x-www-form-urlencoded' in content_type:
        # Form data (SendGrid Inbound Parse)
        from_email = request.POST.get('from', '')
        to_email = request.POST.get('to', '')
        subject = request.POST.get('subject', '')
        body_text = request.POST.get('text', '')
        body_html = request.POST.get('html', '')

        # SendGrid "Send raw" mode: full MIME message in 'email' field
        raw_email = request.POST.get('email', '')
        mime_msg = None
        if raw_email:
            try:
                mime_msg = BytesParser(policy=policy.default).parsebytes(
                    raw_email.encode('utf-8', errors='replace')
                )
            except Exception as e:
                logger.warning("Failed to parse raw MIME email: %s", e)

        if mime_msg and not body_text and not body_html:
            if not from_email:
                from_email = mime_msg.get('From', '')
            if not to_email:
                to_email = mime_msg.get('To', '')
            if not subject:
                subject = mime_msg.get('Subject', '')

            # Extract body parts
            body = mime_msg.get_body(preferencelist=('plain',))
            if body:
                body_text = body.get_content()
            html_body = mime_msg.get_body(preferencelist=('html',))
            if html_body:
                body_html = html_body.get_content()

        # Parse envelope if available (SendGrid)
        envelope_raw = request.POST.get('envelope', '')
        if envelope_raw and not to_email:
            try:
                envelope = json.loads(envelope_raw)
                to_addresses = envelope.get('to', [])
                if to_addresses:
                    to_email = to_addresses[0]
            except (json.JSONDecodeError, IndexError):
                pass

        # Headers may be in a separate field
        headers_raw = request.POST.get('headers', '')
        in_reply_to = ''
        references = ''
        message_id = ''
        if headers_raw:
            for line in headers_raw.split('\n'):
                line_lower = line.lower().strip()
                if line_lower.startswith('in-reply-to:'):
                    in_reply_to = line.split(':', 1)[1].strip()
                elif line_lower.startswith('references:'):
                    references = line.split(':', 1)[1].strip()
                elif line_lower.startswith('message-id:'):
                    message_id = line.split(':', 1)[1].strip()

        # Fallback: extract headers from raw MIME if not in form fields
        if mime_msg and not in_reply_to and not headers_raw:
            in_reply_to = mime_msg.get('In-Reply-To', '')
            references = mime_msg.get('References', '')
            message_id = mime_msg.get('Message-ID', '')
    else:
        logger.warning("Unsupported content type for inbound email: %s", content_type)
        return HttpResponseBadRequest("Unsupported content type")

    if not from_email or not to_email:
        logger.warning("Missing from or to in inbound email webhook")
        return HttpResponseBadRequest("Missing required fields")

    logger.info(
        "Inbound email received | from=%s to=%s subject=%s",
        from_email, to_email, subject,
    )

    # Dispatch to Celery for async processing
    process_inbound_support_email.delay(
        from_email=from_email,
        to_email=to_email,
        subject=subject,
        body_text=body_text,
        body_html=body_html,
        in_reply_to=in_reply_to,
        references=references,
        message_id=message_id,
    )

    return HttpResponse(status=200)
