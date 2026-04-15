from wefund.models import Notification, BreachHistory, EnrollmentEvent
from django.utils import timezone
from wefund.risk.utils import disable_trading
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from wefund.mt5_controller.utils import fetch_user_balance
from api.services.mt5_client import MT5Client
from api.services.klaviyo_service import KlaviyoService
import logging
from wefund.event_logger import log_engine_event
from api.utils.time import now_gmt2_naive
from wefund.risk.evidence_capture import capture_breach_evidence

logger = logging.getLogger(__name__)

def handle_breach(enrollment, rule: str, reason: str):
    """
    Marks challenge as failed, closes open trades first,
    then disables account, logs breach history, and notifies user.
    """
    user = enrollment.client.user
    client = enrollment.client

    # --- Step 0: Capture previous state ---
    prev_state = {
        "status": enrollment.status,
        "is_active": enrollment.is_active,
        "notes": enrollment.notes,
    }

    try:
        # --- Step 1: Mark challenge as failed ---
        enrollment.status = "failed"
        enrollment.is_active = False
        enrollment.notes += f"\n[{timezone.now()}] Rule breached: {rule} - {reason}"
        enrollment.save(update_fields=["status", "is_active", "notes", "updated_at"])
    except Exception as e:
        logger.exception(f"[BREACH] Failed to update enrollment {enrollment.id}: {e}")
        return

    # --- Step 2: Fetch MT5 balance ---
    balance = None
    if enrollment.mt5_account_id:
        try:
            balance = fetch_user_balance(enrollment.mt5_account_id)
        except Exception as e:
            logger.warning(f"[BREACH] Could not fetch balance for {enrollment.mt5_account_id}: {e}")

    # --- Step 3: Log breach history ---
    breach_row = None
    try:
        breach_row = BreachHistory.objects.create(
            user=user,
            client=client,
            enrollment=enrollment,
            rule=rule,
            reason=reason,
            previous_state=prev_state,
            breached_at=now_gmt2_naive(),
        )
        logger.info(f"[BREACH] Logged breach history for enrollment {enrollment.id}")
    except Exception as e:
        logger.exception(f"[BREACH] Failed to create BreachHistory for enrollment {enrollment.id}: {e}")

    # ✅ Step 3.1: Capture Evidence (MUST be before closing trades)
    if breach_row:
        try:
            capture_breach_evidence(
                breach=breach_row,
                enrollment=enrollment,
                rule=rule,
                reason=reason,
            )
        except Exception:
            pass  

    # --- Step 4: Log enrollment event ---
    try:
        EnrollmentEvent.objects.create(
            enrollment=enrollment,
            event_type="breach",
            balance=balance,
            equity=balance,
            notes=f"{rule}: {reason}",
        )
    except Exception as e:
        logger.exception(f"[BREACH] Failed to create EnrollmentEvent: {e}")

    # --- Step 4.1: Engine Event Log (Risk Engine) ---
    try:
        log_engine_event(
            event_type="hard_breach_detected",
            engine="risk",
            user=user,
            challenge_enrollment=enrollment,
            metadata={
                "rule": rule,
                "reason": reason,
                "previous_status": prev_state,
                "mt5_account_id": enrollment.mt5_account_id,
                "balance_at_breach": str(balance) if balance is not None else None,
            },
            description=f"Hard breach detected — rule '{rule}' violated for {user.email}."
        )
        logger.info(f"[BREACH] EventLog recorded for enrollment {enrollment.id}")
    except Exception as e:
        logger.exception(f"[BREACH] Failed to write EventLog: {e}")

        

    # --- Step 5: Close all open trades first ---
    if enrollment.mt5_account_id:
        try:
            mt5 = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
            result = mt5.close_open_trades(enrollment.mt5_account_id)

            if result.get("success"):
                logger.info(f"[BREACH] Closed all open trades for account {enrollment.mt5_account_id}")
            else:
                logger.warning(
                    f"[BREACH] Failed to close open trades for {enrollment.mt5_account_id}: "
                    f"{result.get('error')} | SystemStatus: {result.get('systemErrorStatus')}"
                )
        except Exception as e:
            logger.exception(f"[BREACH] Exception while closing open trades for {enrollment.mt5_account_id}: {e}")

        # --- Step 6: Now disable trading ---
        try:
            success = disable_trading(enrollment.mt5_account_id)
            if not success:
                logger.error(f"[BREACH] disable_trading() returned False for {enrollment.mt5_account_id}")
        except Exception as e:
            logger.exception(f"[BREACH] Exception while disabling trading for {enrollment.mt5_account_id}: {e}")

    # --- Step 7: Notification ---
    try:
        Notification.objects.create(
            user=user,
            type="challenge",
            title=f"Challenge Breach: {rule}",
            message=reason,
        )
    except Exception as e:
        logger.exception(f"[BREACH] Failed to create Notification for user {user.id}: {e}")

    # --- Step 8: Email notification ---
    try:
        send_breach_email(user, enrollment, rule, reason)
    except Exception as e:
        logger.exception(f"[BREACH] Failed to send breach email to {user.email}: {e}")

    # --- Step 9: Klaviyo Failed Challenge Recovery event ---
    try:
        KlaviyoService.track_event("Challenge Failed", user.email, {
            "account_size": str(getattr(enrollment, "account_size", "")),
            "challenge_name": getattr(enrollment.challenge, "name", ""),
            "rule_violated": str(rule),
            "reason": reason,
            "mt5_account_id": str(enrollment.mt5_account_id or ""),
        })
    except Exception as e:
        logger.warning(f"[BREACH] Klaviyo challenge failed event error for {user.email}: {e}")


def send_breach_email(user, enrollment, rule: str, reason: str):
    """Send breach notification email to user."""
    email = user.email or getattr(getattr(user, "client_profile", None), "address_info", {}).get("email")
    if not email:
        logger.warning(f"[BREACH] No email found for user {user.id}, skipping breach email.")
        return

    context = {
        "client_name": user.get_full_name(),
        "account_size": getattr(enrollment, "account_size", None),
        "mt5_account_id": enrollment.mt5_account_id,
        "rule": rule,
        "reason": reason,
        "breach_time": timezone.now(),
    }

    subject = f"WeFund | Challenge Breach Detected for Account {enrollment.mt5_account_id}"
    html_content = render_to_string("emails/breach/hard_breach.html", context)

    msg = EmailMultiAlternatives(
        subject=subject,
        body="Please view this email in HTML format.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send()
