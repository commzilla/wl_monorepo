import logging
import re
import uuid
from email.utils import make_msgid

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)


class SupportEmailService:
    """
    Handles outbound and inbound email for the support ticketing system.
    Provides email threading via RFC 2822 headers and plus-addressing.
    """

    REPLY_DOMAIN = None  # lazy-loaded from settings

    @classmethod
    def _get_reply_domain(cls):
        if cls.REPLY_DOMAIN is None:
            cls.REPLY_DOMAIN = getattr(
                settings, 'SUPPORT_EMAIL_REPLY_DOMAIN', 'we-fund.com'
            )
        return cls.REPLY_DOMAIN

    @staticmethod
    def generate_reply_to_address(conversation_id):
        """Generate a plus-addressed Reply-To for threading: support+{uuid}@domain"""
        domain = SupportEmailService._get_reply_domain()
        return f"support+{conversation_id}@{domain}"

    @staticmethod
    def generate_message_id(conversation_id, message_id):
        """Generate an RFC 2822 Message-ID for a support email."""
        domain = SupportEmailService._get_reply_domain()
        return f"<support.{conversation_id}.{message_id}@{domain}>"

    @staticmethod
    def parse_inbound_reply_address(to_address):
        """
        Extract conversation UUID from a plus-addressed email.
        E.g., 'support+abc123-def456@we-fund.com' → 'abc123-def456'
        Returns None if the format doesn't match.
        """
        match = re.search(
            r'support\+([a-f0-9\-]{36})@',
            to_address.strip().lower(),
        )
        return match.group(1) if match else None

    @staticmethod
    def render_support_template(body_content, context=None):
        """Wrap agent content in the branded HTML template."""
        ctx = {'body_content': body_content}
        if context:
            ctx.update(context)

        try:
            from wefund.models import EmailTemplate
            tpl = EmailTemplate.objects.filter(
                template_path='emails/support/agent_reply.html',
                is_active=True,
            ).first()
            if tpl:
                from django.template import Template, Context
                return Template(tpl.body_html).render(Context(ctx))
        except Exception:
            logger.warning("DB template lookup failed for support reply, using file")

        return render_to_string('emails/support/agent_reply.html', ctx)

    @staticmethod
    def send_support_email(conversation, message, to_email, subject,
                           body_html, body_text=None, agent=None):
        """
        Send an outbound support email with proper threading headers.
        Logs to EmailLog and returns (success, error_message).
        """
        from wefund.models import EmailLog

        conv_id = str(conversation.id)
        msg_id = str(message.id)
        message_id_header = SupportEmailService.generate_message_id(conv_id, msg_id)
        reply_to = SupportEmailService.generate_reply_to_address(conv_id)

        # Resolve agent name for the email signature
        agent_name = ''
        if agent:
            agent_name = agent.get_full_name() or agent.email.split('@')[0]
        elif message.sender:
            agent_name = message.sender.get_full_name() or message.sender.email.split('@')[0]

        # Wrap in branded ticket template
        full_html = SupportEmailService.render_support_template(body_html, {
            'agent_name': agent_name,
            'ticket_id': conv_id[:8],
            'subject': subject,
        })

        # Build the email
        email = EmailMultiAlternatives(
            subject=subject,
            body=body_text or '',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
            reply_to=[reply_to],
        )
        email.attach_alternative(full_html, 'text/html')

        # Add threading headers
        email.extra_headers['Message-ID'] = message_id_header
        if conversation.email_message_id:
            email.extra_headers['In-Reply-To'] = conversation.email_message_id
            email.extra_headers['References'] = conversation.email_message_id

        try:
            email.send()
            logger.info(
                "Support email sent to %s for conversation %s",
                to_email, conv_id,
            )
            status = 'sent'
            error = ''
        except Exception as e:
            logger.exception(
                "Failed to send support email to %s: %s", to_email, e,
            )
            status = 'failed'
            error = str(e)

        # Log the email
        try:
            EmailLog.objects.create(
                user=conversation.user,
                category='support',
                subject=subject,
                to_email=to_email,
                from_email=settings.DEFAULT_FROM_EMAIL,
                body_text=body_text or '',
                body_html=full_html,
                status=status,
                error_message=error,
                sent_at=timezone.now() if status == 'sent' else None,
                support_conversation=conversation,
                support_message=message,
            )
        except Exception as e:
            logger.exception("Failed to log support email: %s", e)

        # Update conversation's email_message_id for threading
        if not conversation.email_message_id:
            conversation.email_message_id = message_id_header
            conversation.save(update_fields=['email_message_id'])

        return status == 'sent', error

    @staticmethod
    def process_inbound_email(from_email, to_address, subject,
                              body_text, body_html=None,
                              in_reply_to=None, references=None,
                              message_id=None):
        """
        Process an inbound email reply:
        1. Match to conversation via plus-address or In-Reply-To header
        2. Create a SupportMessage(sender_type='user', message_type='email')
        3. Reopen conversation if resolved
        Returns (conversation, message) or (None, None) if no match.
        """
        from wefund.models import SupportConversation, SupportMessage
        from django.contrib.auth import get_user_model
        User = get_user_model()

        conversation = None

        # Try to match via plus-addressing in the To field
        conv_id = SupportEmailService.parse_inbound_reply_address(to_address)
        if conv_id:
            try:
                conversation = SupportConversation.objects.get(id=conv_id)
            except SupportConversation.DoesNotExist:
                logger.warning(
                    "Inbound email to %s — conversation %s not found",
                    to_address, conv_id,
                )

        # Fallback: match via In-Reply-To header
        if not conversation and in_reply_to:
            conversation = SupportConversation.objects.filter(
                email_message_id=in_reply_to
            ).first()

        if not conversation:
            logger.warning(
                "Could not match inbound email from %s to any conversation",
                from_email,
            )
            return None, None

        # Try to match sender to an existing user
        sender_user = None
        clean_email = from_email.strip().lower()
        # Strip display name if present: "Name <email>" → email
        email_match = re.search(r'<([^>]+)>', clean_email)
        if email_match:
            clean_email = email_match.group(1)
        try:
            sender_user = User.objects.filter(email__iexact=clean_email).first()
        except Exception:
            pass

        # Prefer plain text; fall back to HTML-stripped content
        content = body_text.strip() if body_text and body_text.strip() else ''
        if not content and body_html:
            # Basic HTML tag stripping
            content = re.sub(r'<[^>]+>', '', body_html).strip()
        if not content:
            content = '(empty email)'

        # Strip quoted reply content and our own email template footer
        if content and content != '(empty email)':
            lines = content.split('\n')
            cleaned = []
            for line in lines:
                stripped = line.strip()
                # Stop at quote headers ("On ... wrote:", "From: ...")
                if re.match(r'^On .+ wrote:$', stripped):
                    break
                if re.match(r'^From:\s*"', stripped):
                    break
                # Stop at our own email template footer
                if re.match(r'^Ticket\s+#[a-f0-9]', stripped):
                    break
                if stripped == 'WeFund Support Team':
                    break
                if stripped == 'Simply reply to this email to continue the conversation.':
                    break
                # Skip quoted lines
                if stripped.startswith('>'):
                    continue
                cleaned.append(line)
            stripped_content = '\n'.join(cleaned).strip()
            if stripped_content:
                content = stripped_content

        # Create the message
        message = SupportMessage.objects.create(
            conversation=conversation,
            sender_type='user',
            sender=sender_user,
            message_type='email',
            content=content,
            metadata={
                'email_from': from_email,
                'email_subject': subject,
                'email_message_id': message_id or '',
            },
        )

        # Reopen conversation if resolved
        if conversation.status == 'resolved':
            conversation.status = 'active'
            conversation.resolved_at = None
            conversation.save(update_fields=['status', 'resolved_at', 'updated_at'])
            logger.info(
                "Conversation %s reopened by inbound email from %s",
                conversation.id, from_email,
            )

        # Store the inbound Message-ID for threading
        if message_id and not conversation.email_message_id:
            conversation.email_message_id = message_id
            conversation.save(update_fields=['email_message_id'])

        logger.info(
            "Inbound email from %s created message %s in conversation %s",
            from_email, message.id, conversation.id,
        )

        return conversation, message
