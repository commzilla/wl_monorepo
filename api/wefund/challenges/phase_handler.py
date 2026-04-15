import logging
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from zoneinfo import ZoneInfo
from wefund.models import (
    EnrollmentAccount,
    EnrollmentTransitionLog,
    ChallengeEnrollment,
    EnrollmentEvent,
    Certificate,
    MT5DailySnapshot,
)
from wefund.challenges.utils import create_mt5_account_for_challenge
from api.services.email_service import EmailService
from wefund.mt5_controller.utils import fetch_user_balance, fetch_user_equity
from wefund.risk.utils import disable_account
from api.utils.certificate_generator import generate_and_upload_certificate
from django.conf import settings
from api.services.mt5_client import MT5Client
from wefund.event_logger import log_engine_event

logger = logging.getLogger(__name__)

BROKER_TZ = ZoneInfo("Etc/GMT-2")

def _safe_close_positions_and_disable(account_id: int) -> bool:
    """
    Best-effort: close all open trades and then disable trading for an MT5 account.
    Never raises; returns True if disable step succeeds (close step is tolerated if it returns either success or a known benign code).
    """
    try:
        mt5 = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
    except Exception as e:
        logger.error(f"[Transition] MT5Client init failed for {account_id}: {e}")
        return False

    # Step 1: Close open trades
    try:
        close_res = mt5.close_open_trades(account_id)
        if not close_res.get("success"):
            logger.warning(f"[Transition] CloseOpenTrades failed for {account_id}: {close_res}")
        else:
            logger.info(f"[Transition] CloseOpenTrades success for {account_id}")
    except Exception as e:
        logger.error(f"[Transition] Exception in CloseOpenTrades for {account_id}: {e}")

    # Step 2: Disable trading
    try:
        disabled_ok = mt5.disable_trading(int(account_id))
        if disabled_ok:
            logger.info(f"[Transition] Trading disabled for {account_id}")
            return True
        else:
            logger.warning(f"[Transition] disable_trading returned False for {account_id}")
            return False
    except Exception as e:
        logger.error(f"[Transition] Exception in disable_trading for {account_id}: {e}")
        return False


def handle_transition(
    enrollment: ChallengeEnrollment,
    from_status: str,
    to_status: str,
    phase_type: str,
    reason: str = None,
    account_size: float = None
):
    """
    Handles moving enrollment to a new phase:
    - Archives current MT5 account into EnrollmentAccount (only when creating a new one)
    - Creates a new MT5 account ONLY when entering Phase 2 or Live
    - Updates ChallengeEnrollment + logs + notifications
    """
    account_size = account_size or float(enrollment.account_size)
    logger.info(f"[Transition] Starting transition for enrollment {enrollment.id}")
    logger.debug(f"[Transition] From: {from_status}, To: {to_status}, Phase: {phase_type}, Account Size: {account_size}")

    # Keep a copy of the current account before we potentially replace it
    old_account_id = enrollment.mt5_account_id

    # Create-new-account should only happen when ENTERING a phase
    creating_new_account = (
        (phase_type == "phase-2" and to_status == "phase_2_in_progress") or
        (phase_type == "live-trader" and to_status == "live_in_progress")
    )

    mt5_account_instance = None     # sanitized (for logging / email context)
    mt5_account_full = None         # full dict from MT5 create (do NOT log passwords)
    archive_phase = None

    with transaction.atomic():
        if creating_new_account:
            # Archive & disable the old account (if any) BEFORE creating a new one
            if old_account_id:
                already_archived = EnrollmentAccount.objects.filter(
                    enrollment=enrollment,
                    mt5_account_id=old_account_id
                ).exists()

                if not already_archived:
                    archive_phase = from_status.replace("_", "-")
                    logger.info(f"[Transition] Archiving and disabling old MT5 account {old_account_id}")
                    EnrollmentAccount.objects.create(
                        enrollment=enrollment,
                        phase_type=archive_phase,
                        broker_type=enrollment.broker_type or "mt5",
                        mt5_account_id=old_account_id,
                        mt5_password=enrollment.mt5_password,
                        mt5_investor_password=enrollment.mt5_investor_password,
                        status="archived",
                        archived_at=timezone.now(),
                    )

                    # Close open positions first, then disable trading via MT5Client.
                    # Keep existing disable_account() as a fallback to preserve legacy behavior.
                    try:
                        step_ok = _safe_close_positions_and_disable(int(old_account_id))
                        if not step_ok:
                            logger.warning(f"[Transition] Primary disable flow returned False for {old_account_id}; falling back to disable_account()")
                            disabled = disable_account(old_account_id)  # legacy fallback
                            if disabled:
                                logger.info(f"[Transition] Fallback disable_account() succeeded for {old_account_id}")
                            else:
                                logger.warning(f"[Transition] Fallback disable_account() also failed for {old_account_id}")
                    except Exception as e:
                        logger.error(f"[Transition] Exception during close+disable for {old_account_id}: {e}")


            # Create the new MT5 account for the phase we're entering
            logger.info(f"[Transition] Creating new MT5 account for phase {phase_type}")
            mt5_account_full = create_mt5_account_for_challenge(
                user=enrollment.client.user,
                account_size=account_size,
                phase_name=phase_type.replace("-", " ").title(),
                enrollment=enrollment,
                phase_type_override=phase_type
            )

            # Sanitize logs (avoid passwords)
            logger.debug(f"[Transition] MT5 account created: {{'account_id': {mt5_account_full.get('account_id')}}}")

            # Set the new active credentials on the enrollment
            enrollment.broker_type = "mt5"
            enrollment.mt5_account_id = mt5_account_full["account_id"]
            enrollment.mt5_password = mt5_account_full["mt5_password"]
            enrollment.mt5_investor_password = mt5_account_full["investor_password"]

            # For email context only
            mt5_account_instance = {
                "account_id": mt5_account_full["account_id"],
                "mt5_password": mt5_account_full["mt5_password"],
                "investor_password": mt5_account_full["investor_password"],
            }

        # Update status (plus creds only if we created a new account)
        logger.info(f"[Transition] Updating enrollment status to {to_status}")
        enrollment.status = to_status

        # Set live_start_date when entering live phase
        if to_status == "live_in_progress" and not enrollment.live_start_date:
            enrollment.live_start_date = timezone.now().date()

        update_fields = ["status", "updated_at"]
        if creating_new_account:
            update_fields += ["broker_type", "mt5_account_id", "mt5_password", "mt5_investor_password"]
        if to_status == "live_in_progress":
            update_fields.append("live_start_date")

        enrollment.save(update_fields=update_fields)

    # ✅ Capture first daily snapshot if we just created a new account
        if creating_new_account and mt5_account_instance:
            account_id = mt5_account_instance["account_id"]
            today = timezone.now().astimezone(BROKER_TZ).date()

            # avoid duplicates if already created today
            if not MT5DailySnapshot.objects.filter(enrollment=enrollment, account_id=account_id, date=today).exists():
                try:
                    start_balance = fetch_user_balance(account_id) or Decimal(account_size)
                    start_equity = fetch_user_equity(account_id) or Decimal(account_size)
                    MT5DailySnapshot.objects.create(
                        enrollment=enrollment,
                        account_id=account_id,
                        date=today,
                        starting_balance=start_balance,
                        starting_equity=start_equity,
                        total_profit=start_balance - Decimal(account_size),
                        today_max_drawdown=Decimal(0),
                        total_max_drawdown=Decimal(0),
                    )
                    logger.info(f"[Transition] Created initial daily snapshot for new MT5 account {account_id}")
                except Exception as e:
                    logger.warning(f"[Transition] Failed to create initial snapshot for account {account_id}: {e}")    

    # Transition log with correct archived/new IDs
    logger.info(f"[Transition] Logging transition for enrollment {enrollment.id}")
    EnrollmentTransitionLog.objects.create(
        enrollment=enrollment,
        from_status=from_status,
        to_status=to_status,
        reason=reason,
        meta={
            "from_phase": archive_phase,
            "to_phase": phase_type,
            "archived_account_id": old_account_id if archive_phase else None,
            "new_account_id": mt5_account_instance["account_id"] if mt5_account_instance else None,
        }
    )

    # Phase pass event
    if to_status in ["phase_1_passed", "phase_2_passed", "completed"]:
        balance = None
        equity = None
        if enrollment.mt5_account_id:
            try:
                balance = fetch_user_balance(enrollment.mt5_account_id)
            except Exception as e:
                logger.warning(f"[Transition] Could not fetch balance for account {enrollment.mt5_account_id}: {e}")

        EnrollmentEvent.objects.create(
            enrollment=enrollment,
            event_type="phase_pass",
            balance=balance,
            equity=equity,
            notes=f"Phase passed: {phase_type} | Reason: {reason or 'N/A'}"
        )

    # Email (only include creds when we just created a new account)
    email_context = {
        "username": enrollment.client.user.username,
        "full_name": f"{enrollment.client.user.first_name} {enrollment.client.user.last_name}",
        "phase_name": phase_type.replace("-", " ").title(),
        "mt5_login": mt5_account_instance["account_id"] if mt5_account_instance else None,
        "mt5_password": mt5_account_instance["mt5_password"] if mt5_account_instance else None,
        "investor_password": mt5_account_instance["investor_password"] if mt5_account_instance else None,
        "status": to_status,
        "account_size": account_size,
        "now": timezone.now(),
    }

    template_map = {
        "phase_1_passed": "emails/challenge/phase_passed.html",
        "awaiting_payment": "emails/challenge/awaiting_payment.html",
        "phase_2_in_progress": "emails/challenge/phase2_started.html",
        "phase_2_passed": "emails/challenge/phase_passed.html",
        "live_in_progress": "emails/challenge/funded_account_created.html",
        "completed": "emails/challenge/challenge_completed.html",
        "failed": "emails/challenge/challenge_failed.html",
    }

    # -----------------------
    # EVENT LOGS
    # -----------------------

    # 1) Challenge Phase Transition
    log_engine_event(
        event_type="challenge_transition",
        engine="challenge",
        user=enrollment.client.user,
        challenge_enrollment=enrollment,
        metadata={
            "enrollment_id": str(enrollment.id),
            "from_status": from_status,
            "to_status": to_status,
            "phase_type": phase_type,
            "reason": reason,
            "old_account_id": old_account_id,
            "new_account_id": mt5_account_instance["account_id"] if mt5_account_instance else None,
        },
        description=f"Challenge phase transitioned from {from_status} → {to_status} ({phase_type})."
    )

    # 2) MT5 Account Created (only when a new account is created)
    if creating_new_account and mt5_account_instance:
        log_engine_event(
            event_type="mt5_account_created",
            engine="challenge",
            user=enrollment.client.user,
            challenge_enrollment=enrollment,
            metadata={
                "enrollment_id": str(enrollment.id),
                "account_id": mt5_account_instance["account_id"],
                "phase_type": phase_type,
                "account_size": account_size,
            },
            description=f"New MT5 account {mt5_account_instance['account_id']} created for {phase_type}."
        )

    # 3) Challenge Completed → Certificate Event
    if to_status == "completed":
        log_engine_event(
            event_type="certificate_generated",
            engine="challenge",
            user=enrollment.client.user,
            challenge_enrollment=enrollment,
            metadata={
                "enrollment_id": str(enrollment.id),
            },
            description=f"Challenge completed and certificate generated."
        )

    template_name = template_map.get(to_status)
    if template_name:
        if to_status == "awaiting_payment":
            email_subject = "WeFund | Congratulations! Complete Your Payment to Get Your Live Account"
        else:
            email_subject = f"WeFund | Challenge Update: {phase_type.replace('-', ' ').title()}"

        logger.info(f"[Transition] Sending notification email to {enrollment.client.user.email} using template {template_name}")
        EmailService.send_challenge_notifications(
            to_email=enrollment.client.user.email,
            subject=email_subject,
            context=email_context,
            template_name=template_name
        )

    logger.info(f"[Transition] Completed transition for enrollment {enrollment.id}")
    return mt5_account_instance
