import logging
from django.utils import timezone
from django.conf import settings
from wefund.challenges.phase_handler import handle_transition

logger = logging.getLogger(__name__)

def run(enrollment):
    """
    Checks if the enrollment is ready to move to Live:
    - Phase 1 (1-step) or Phase 2 (2-step) is passed
    - KYC approved
    If both conditions are met, create Live MT5 account and update status.

    Also handles instant funding enrollments in awaiting_kyc status:
    - KYC approved → enable trading on existing MT5 account, transition to live_in_progress.
    """
    # --- Instant funding: awaiting_kyc → live_in_progress (no new account, just enable trading) ---
    if enrollment.status == 'awaiting_kyc' and enrollment.payment_type == 'instant_funding':
        if enrollment.client.kyc_status.lower() != 'approved':
            return False
        _activate_instant_funding(enrollment)
        return True

    # --- Standard / PAP flow (unchanged) ---
    if enrollment.status not in ['phase_1_passed', 'phase_2_passed']:
        return False

    # Check KYC
    if enrollment.client.kyc_status.lower() != 'approved':
        return False

    from_status = enrollment.status
    to_status = 'live_in_progress'
    phase_type = 'live-trader'
    handle_transition(enrollment, from_status, to_status, phase_type, reason="KYC approved, moving to Live account")
    return True


def _activate_instant_funding(enrollment):
    """
    Instant funding: KYC just approved. Enable trading on the existing MT5 account
    and transition to live_in_progress. No new account is created.
    """
    from api.services.mt5_client import MT5Client
    from wefund.models import EnrollmentTransitionLog
    from api.services.email_service import EmailService
    from wefund.event_logger import log_engine_event

    account_id = enrollment.mt5_account_id
    user = enrollment.client.user

    # Enable trading on existing MT5 account
    trading_enabled = False
    if account_id:
        try:
            mt5 = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
            trading_enabled = mt5.activate_trading(int(account_id))
            if trading_enabled:
                logger.info(f"[InstantFunding] Trading enabled for MT5 account {account_id}")
            else:
                logger.warning(f"[InstantFunding] Failed to enable trading for MT5 account {account_id}")
        except Exception as e:
            logger.error(f"[InstantFunding] Exception enabling trading for {account_id}: {e}")
    else:
        logger.warning(f"[InstantFunding] No MT5 account ID for enrollment {enrollment.id}")

    # Transition status
    enrollment.status = 'live_in_progress'
    if not enrollment.live_start_date:
        enrollment.live_start_date = timezone.now().date()
    enrollment.save(update_fields=['status', 'live_start_date', 'updated_at'])

    # Log transition
    EnrollmentTransitionLog.objects.create(
        enrollment=enrollment,
        from_status='awaiting_kyc',
        to_status='live_in_progress',
        reason="KYC approved, instant funding account activated",
        meta={
            "from_phase": "awaiting-kyc",
            "to_phase": "live-trader",
            "account_id": account_id,
            "trading_enabled": trading_enabled,
        }
    )

    log_engine_event(
        event_type="challenge_transition",
        engine="challenge",
        user=user,
        challenge_enrollment=enrollment,
        metadata={
            "enrollment_id": str(enrollment.id),
            "from_status": "awaiting_kyc",
            "to_status": "live_in_progress",
            "phase_type": "live-trader",
            "reason": "KYC approved, instant funding account activated",
            "account_id": account_id,
        },
        description=f"Instant funding: KYC approved, trading enabled on MT5 {account_id}."
    )

    # Send funded account email
    email_context = {
        "username": user.username,
        "full_name": f"{user.first_name} {user.last_name}",
        "phase_name": "Live Trader",
        "mt5_login": account_id,
        "status": "live_in_progress",
        "account_size": float(enrollment.account_size),
        "now": timezone.now(),
    }

    EmailService.send_challenge_notifications(
        to_email=user.email,
        subject="WeFund | Your Instant Funding Account is Now Active!",
        context=email_context,
        template_name="emails/challenge/funded_account_created.html"
    )

    logger.info(f"[InstantFunding] Enrollment {enrollment.id} activated for {user.email}")
