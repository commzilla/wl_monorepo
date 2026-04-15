import logging
from django.conf import settings
from django.core.mail import send_mail
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)


class EmailService:

    @staticmethod
    def render_template(template_path, context):
        """Load template from DB first, fall back to file."""
        try:
            from wefund.models import EmailTemplate
            tpl = EmailTemplate.objects.filter(
                template_path=template_path, is_active=True
            ).first()
            if tpl:
                from django.template import Template, Context
                return Template(tpl.body_html).render(Context(context))
        except Exception:
            logger.warning("DB template lookup failed for %s, using file", template_path)
        return render_to_string(template_path, context)

    @staticmethod
    def log_email(subject, to_email, body_html='', body_text='', category='other',
                  user=None, status='sent', error_message='', from_email=None):
        """Log an email send to the EmailLog table."""
        try:
            from wefund.models import EmailLog
            EmailLog.objects.create(
                user=user,
                category=category,
                subject=subject,
                to_email=to_email,
                from_email=from_email or settings.DEFAULT_FROM_EMAIL,
                body_text=body_text,
                body_html=body_html,
                status=status,
                error_message=str(error_message) if error_message else '',
                sent_at=timezone.now() if status == 'sent' else None,
            )
        except Exception as e:
            logger.exception("Failed to log email: %s", e)

    @staticmethod
    def send_user_credentials(to_email, subject, context):
        """
        Sends an email with both Django app credentials and MT5 login details.
        context should include: username, password, mt5_login, mt5_password
        """
        html_message = EmailService.render_template('emails/user_credentials.html', context)
        plain_message = EmailService.render_template('emails/user_credentials.txt', context)

        try:
            send_mail(
                subject,
                plain_message,
                settings.DEFAULT_FROM_EMAIL,
                [to_email],
                html_message=html_message,
            )
            logger.info("Sent credentials email to %s", to_email)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   body_text=plain_message, category='system')
        except Exception as e:
            logger.exception("Failed to send credentials email to %s: %s", to_email, e)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   body_text=plain_message, category='system',
                                   status='failed', error_message=e)

    @staticmethod
    def send_competition_registration_success(*, to_email, subject, context):
        """Sends Competition Registration Successful email with MT5 credentials (HTML only)."""
        if not to_email:
            return

        try:
            html_message = EmailService.render_template(
                "emails/competition/registration_success.html", context,
            )
            msg = EmailMultiAlternatives(
                subject=subject, body="",
                from_email=settings.DEFAULT_FROM_EMAIL, to=[to_email],
            )
            msg.attach_alternative(html_message, "text/html")
            msg.send()
            logger.info("Competition registration email sent to %s", to_email)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='other')
        except Exception as e:
            logger.exception("Failed to send competition registration email to %s: %s", to_email, e)
            EmailService.log_email(subject, to_email, category='other',
                                   status='failed', error_message=e)

    @staticmethod
    def send_competition_winner_email(*, to_email, subject, context):
        """HTML only. context: user, competition, rank, growth_percent, prize_text, now, brand_name"""
        if not to_email:
            return

        try:
            html_message = EmailService.render_template("emails/competition/competition_winner.html", context)
            msg = EmailMultiAlternatives(
                subject=subject, body="",
                from_email=settings.DEFAULT_FROM_EMAIL, to=[to_email],
            )
            msg.attach_alternative(html_message, "text/html")
            msg.send()
            logger.info("Competition winner email sent to %s", to_email)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='other')
        except Exception as e:
            logger.exception("Failed to send winner email to %s: %s", to_email, e)
            EmailService.log_email(subject, to_email, category='other',
                                   status='failed', error_message=e)

    @staticmethod
    def send_competition_loser_email(*, to_email, subject, context):
        """HTML only. context: user, competition, rank, growth_percent, now, brand_name"""
        if not to_email:
            return

        try:
            html_message = EmailService.render_template("emails/competition/competition_loser.html", context)
            msg = EmailMultiAlternatives(
                subject=subject, body="",
                from_email=settings.DEFAULT_FROM_EMAIL, to=[to_email],
            )
            msg.attach_alternative(html_message, "text/html")
            msg.send()
            logger.info("Competition loser email sent to %s", to_email)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='other')
        except Exception as e:
            logger.exception("Failed to send loser email to %s: %s", to_email, e)
            EmailService.log_email(subject, to_email, category='other',
                                   status='failed', error_message=e)

    @staticmethod
    def send_otp_email(to_email, otp_code, first_name=None):
        """Sends a 6-digit OTP email for verification using an HTML template only."""
        context = {
            "otp": otp_code,
            "expires_minutes": 10,
            "user_first_name": first_name or "WeFund Family",
            "product_name": "WeFund",
            "support_email": "support@we-fund.com",
            "logo_url": "https://cdn.we-fund.com/static/logo.png",
            "cta_url": "https://dashboard.we-fund.com/verify-email"
        }
        subject = "WeFund | Your WeFund verification code"
        html_message = EmailService.render_template("emails/otp_email.html", context)

        try:
            email = EmailMultiAlternatives(
                subject=subject, body="",
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "support@we-fund.com"),
                to=[to_email],
            )
            email.attach_alternative(html_message, "text/html")
            email.send(fail_silently=True)
            logger.info("OTP email sent successfully to %s", to_email)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='system')
        except Exception as e:
            logger.exception("Failed to send OTP email to %s: %s", to_email, e)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='system', status='failed', error_message=e)

    @staticmethod
    def send_migration_email(to_email, context):
        """Sends a migration notification email with app credentials."""
        subject = "WeFund | Important: Migration to Our New Platform"
        html_message = EmailService.render_template("emails/migration/user_credentials.html", context)

        msg = EmailMultiAlternatives(
            subject=subject, body="",
            from_email=settings.DEFAULT_FROM_EMAIL, to=[to_email],
        )
        msg.attach_alternative(html_message, "text/html")

        try:
            msg.send()
            logger.info("Migration email sent to %s", to_email)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='system')
        except Exception as e:
            logger.exception("Failed to send migration email to %s: %s", to_email, e)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='system', status='failed', error_message=e)

    @staticmethod
    def send_broker_migration_email(to_email, context):
        """Sends an email notifying trader about their broker migration and new MT5 credentials."""
        subject = "WeFund | Welcome to Your Upgraded Trading Experience"
        html_message = EmailService.render_template("emails/migration/broker_migration.html", context)

        msg = EmailMultiAlternatives(
            subject=subject, body="",
            from_email=settings.DEFAULT_FROM_EMAIL, to=[to_email],
        )
        msg.attach_alternative(html_message, "text/html")

        try:
            msg.send()
            logger.info("[EmailService] Broker migration email sent to %s", to_email)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='system')
        except Exception as e:
            logger.exception("[EmailService] Failed to send broker migration email to %s: %s", to_email, e)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='system', status='failed', error_message=e)

    @staticmethod
    def send_affiliate_credentials(to_email, subject, context):
        """Sends an email with Affiliate account credentials only."""
        html_message = EmailService.render_template("emails/affiliate_credentials.html", context)

        try:
            send_mail(
                subject, "",
                settings.DEFAULT_FROM_EMAIL, [to_email],
                html_message=html_message,
            )
            logger.info("Sent affiliate credentials email to %s", to_email)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='affiliate')
        except Exception as e:
            logger.exception("Failed to send affiliate credentials email to %s: %s", to_email, e)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='affiliate', status='failed', error_message=e)

    @staticmethod
    def send_challenge_notifications(to_email, subject, context, template_name="challenge/phase_passed.html"):
        """Sends an email using the specified template."""
        # template_name may or may not have the 'emails/' prefix
        full_path = template_name if template_name.startswith('emails/') else f'emails/{template_name}'
        body_html = EmailService.render_template(full_path, context)
        msg = EmailMultiAlternatives(
            subject=subject, body=body_html,
            from_email=settings.DEFAULT_FROM_EMAIL, to=[to_email],
        )
        msg.attach_alternative(body_html, "text/html")
        try:
            msg.send()
            EmailService.log_email(subject, to_email, body_html=body_html,
                                   category='challenge')
        except Exception as e:
            logger.exception("Failed to send challenge notification to %s: %s", to_email, e)
            EmailService.log_email(subject, to_email, body_html=body_html,
                                   category='challenge', status='failed', error_message=e)

    @staticmethod
    def send_password_reset(to_email, reset_link, full_name=""):
        subject = "WeFund | Password Reset Request"
        context = {"full_name": full_name, "reset_link": reset_link}
        html_message = EmailService.render_template("emails/password_reset.html", context)

        msg = EmailMultiAlternatives(
            subject=subject, body="",
            from_email=settings.DEFAULT_FROM_EMAIL, to=[to_email],
        )
        msg.attach_alternative(html_message, "text/html")

        try:
            msg.send()
            logger.info("Password reset email sent to %s", to_email)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='system')
        except Exception as e:
            logger.exception("Failed to send password reset email to %s: %s", to_email, e)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='system', status='failed', error_message=e)

    @staticmethod
    def send_password_reset_confirmation(to_email, full_name=""):
        subject = "WeFund | Your Password Has Been Changed"
        context = {"full_name": full_name}
        html_message = EmailService.render_template("emails/password_reset_confirmation.html", context)

        msg = EmailMultiAlternatives(
            subject=subject, body="",
            from_email=settings.DEFAULT_FROM_EMAIL, to=[to_email],
        )
        msg.attach_alternative(html_message, "text/html")

        try:
            msg.send()
            logger.info("Password reset confirmation email sent to %s", to_email)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='system')
        except Exception as e:
            logger.exception("Failed to send password reset confirmation email to %s: %s", to_email, e)
            EmailService.log_email(subject, to_email, body_html=html_message,
                                   category='system', status='failed', error_message=e)

    @staticmethod
    def send_extended_review_email(user, payout, days):
        """Sends an HTML email to notify trader that payout is under extended review."""
        full_name = None
        try:
            profile = getattr(user, "client_profile", None)
            if profile and profile.address_info:
                first = profile.address_info.get("first_name", "").strip()
                last = profile.address_info.get("last_name", "").strip()
                if first or last:
                    full_name = f"{first} {last}".strip()
        except Exception:
            pass

        if not full_name:
            first = (user.first_name or "").strip()
            last = (user.last_name or "").strip()
            if first or last:
                full_name = f"{first} {last}".strip()

        if not full_name:
            full_name = user.email or "Trader"

        context = {
            "full_name": full_name,
            "amount": payout.amount,
            "days": days,
            "extended_until": payout.extended_review_until.strftime("%Y-%m-%d"),
            "dashboard_url": "https://dashboard.we-fund.com/withdrawl",
        }

        subject = "WeFund | Your Payout Is Under Extended Review"
        template_name = "emails/payout/extended_review.html"

        try:
            html_message = EmailService.render_template(template_name, context)
            send_mail(
                subject, "",
                settings.DEFAULT_FROM_EMAIL, [user.email],
                html_message=html_message,
            )
            logger.info("Sent extended review email to %s for payout ID %s", user.email, payout.id)
            EmailService.log_email(subject, user.email, body_html=html_message,
                                   category='payout', user=user)
        except Exception as e:
            logger.exception("Failed to send payout extended review email to %s: %s", user.email, e)
            EmailService.log_email(subject, user.email, category='payout',
                                   user=user, status='failed', error_message=e)
