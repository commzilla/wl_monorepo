import json
import threading
import logging
from decimal import Decimal
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from api.services.mt5_client import MT5Client
from wefund.models import NotificationSettings
from wefund.models import ClientKYC, TraderPayout, ChallengeEnrollment, PayoutConfiguration, ClientPaymentMethod, Certificate, PayoutPolicy
from wefund.generate_ai_payout_analysis import generate_ai_payout_analysis
from wefund.compliance.engine import generate_compliance_analysis
from wefund.integrations.rise.engine import invite_user_via_rise
from django.template.loader import render_to_string
from api.services.email_service import EmailService
from wefund.risk.utils import disable_trading, activate_trading
from api.utils.certificate_generator import generate_and_upload_certificate
from wefund.event_logger import log_engine_event
from wefund.risk_v2.engine import attach_report_to_payout
from wefund.ai_analysis.orchestrator import run_payout_ai_analysis
from wefund.tasks.consistency_tasks import delayed_payout_auto_reject

logger = logging.getLogger(__name__)

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_notification_settings(sender, instance, created, **kwargs):
    if created and not hasattr(instance, 'notification_settings'):
        NotificationSettings.objects.create(user=instance)

def safe_close_and_disable_mt5(account_id: int):
    """
    Safely close all open trades and disable trading for an MT5 account.
    Runs in a separate thread and never raises exceptions.
    """
    try:
        mt5 = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
    except Exception as e:
        logger.error(f"[Signal] MT5Client init failed for account {account_id}: {e}")
        return

    # Step 1: Close all open trades
    try:
        res = mt5.close_open_trades(account_id)
        if res.get("success"):
            logger.info(f"[Signal] Successfully closed open trades for {account_id}")
        else:
            logger.warning(f"[Signal] CloseOpenTrades failed for {account_id}: {res}")
    except Exception as e:
        logger.error(f"[Signal] Exception closing trades for {account_id}: {e}")

    # Step 2: Disable trading
    try:
        disabled_ok = mt5.disable_trading(account_id)
        if disabled_ok:
            logger.info(f"[Signal] Trading disabled for account {account_id}")
        else:
            logger.warning(f"[Signal] Failed to disable trading for account {account_id}")
    except Exception as e:
        logger.error(f"[Signal] Exception disabling trading for {account_id}: {e}")


@receiver(post_save, sender=ChallengeEnrollment)
def close_and_disable_mt5_on_phase_pass(sender, instance: ChallengeEnrollment, created, **kwargs):
    """
    When a ChallengeEnrollment passes Phase 1 or Phase 2,
    automatically close all open positions and disable trading.
    """
    if created:
        return  # only for updates

    if instance.status not in ["phase_1_passed", "phase_2_passed", "awaiting_payment"]:
        return

    account_id = instance.mt5_account_id
    if not account_id:
        logger.warning(f"[Signal] No MT5 account ID found for enrollment {instance.id}")
        return

    if instance.status == "awaiting_payment":
        # PAP: only disable trading (keep account active, don't close positions)
        def _disable_trading_only(aid):
            try:
                mt5 = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
                if mt5.disable_trading(aid):
                    logger.info(f"[Signal] Trading disabled for PAP awaiting_payment account {aid}")
                else:
                    logger.warning(f"[Signal] Failed to disable trading for PAP account {aid}")
            except Exception as e:
                logger.error(f"[Signal] Exception disabling trading for PAP account {aid}: {e}")

        threading.Thread(target=_disable_trading_only, args=(int(account_id),), daemon=True).start()
        logger.info(f"[Signal] Started background task to disable trading for PAP enrollment {instance.id}")
        return

    # Run safely in a background thread (non-blocking)
    threading.Thread(
        target=safe_close_and_disable_mt5,
        args=(int(account_id),),
        daemon=True,
    ).start()
    logger.info(f"[Signal] Started background task to close+disable MT5 {account_id} for enrollment {instance.id}")        

def safe_run_risk_engine(payout, user, enrollment):
    """
    Safe wrapper for Risk Engine v2 execution.
    Saves the RiskScanReport row in DB.
    """
    try:
        report_obj = attach_report_to_payout(payout, admin_user=user)

        # Log event entry
        log_engine_event(
            event_type="risk_engine_v2_triggered",
            engine="risk_v2",
            user=user,
            challenge_enrollment=enrollment,
            metadata={
                "payout_id": str(payout.id),
                "risk_scan_report_id": str(report_obj.id)
            },
            description=f"Risk Engine v2 scan completed for payout {payout.id}."
        )

    except Exception as e:
        print(f"[Risk Engine v2 Error] Payout {payout.id}: {e}")

        log_engine_event(
            event_type="risk_engine_v2_error",
            engine="risk_v2",
            user=user,
            challenge_enrollment=enrollment,
            metadata={
                "payout_id": str(payout.id),
                "error": str(e)
            },
            description=f"Risk Engine v2 failed for payout {payout.id}."
        )

def safe_run_ai_functions(payout_id: str, user, enrollment):
    """
    Run both AI analysis functions safely in the background.
    """
    log_engine_event(
        event_type="payout_ai_triggered",
        engine="payout",
        user=user,
        challenge_enrollment=enrollment,
        metadata={"payout_id": payout_id},
        description=f"AI payout analysis triggered for payout {payout_id}."
    )

    payout = TraderPayout.objects.filter(id=payout_id).first()
    if not payout:
        print(f"[AI Trigger Error] Payout {payout_id} not found.")
        return

    try:
        generate_ai_payout_analysis(payout_id)
    except Exception as e:
        print(f"[AI Payout Analysis Error] Payout {payout_id}: {e}")

    try:
        generate_compliance_analysis(payout_id)
    except Exception as e:
        print(f"[Compliance Analysis Error] Payout {payout_id}: {e}")


    # --- 1) Claude AI Payout Analysis ---
    try:
        run_payout_ai_analysis(payout_id)
    except Exception as e:
        print(f"[Claude Payout Analysis Error] Payout {payout_id}: {e}")

        log_engine_event(
            event_type="payout_ai_error",
            engine="payout_ai_v2",
            user=user,
            challenge_enrollment=enrollment,
            metadata={"payout_id": payout_id, "error": str(e)},
            description=f"Claude AI analysis failed for payout {payout_id}."
        )    

    # ---- Risk Engine v2 ----
    try:
        safe_run_risk_engine(payout, user, enrollment)
    except Exception as e:
        print(f"[Risk Engine v2 Error] {payout_id}: {e}")    


@receiver(post_save, sender=TraderPayout)
def on_payout_created(sender, instance: TraderPayout, created, **kwargs):
    """
    Trigger AI analysis only when a payout is newly created.
    """
    if not created:
        return

    user = instance.trader  # User
    enrollment = instance.challenge_enrollment  # Enrollment reference

    threading.Thread(
        target=safe_run_ai_functions,
        args=(str(instance.id), user, enrollment),
        daemon=True
    ).start()

@receiver(post_save, sender=TraderPayout)
def schedule_auto_reject_for_payout(sender, instance: TraderPayout, created: bool, **kwargs):
    """
    Schedule auto rejection engine for 1-step challenge payouts
    after a 10-minute delay.
    """

    # 🚨 ONLY on creation
    if not created:
        return

    payout = instance

    # --- STATUS GUARD ---
    if payout.status != "pending":
        return

    enrollment = payout.challenge_enrollment
    if not enrollment or not enrollment.challenge:
        return

    # --- ✅ ONLY 1-STEP CHALLENGES ---
    if enrollment.challenge.step_type != "1-step":
        return

    # ⏱ Schedule delayed task
    delayed_payout_auto_reject.apply_async(
        args=[str(payout.id)],
        countdown=600  # 10 minutes
    )
        
@receiver(post_save, sender=ChallengeEnrollment)
def create_payout_config_on_live(sender, instance: ChallengeEnrollment, created, **kwargs):
    """
    Auto-create a PayoutConfiguration when an enrollment goes live (if not already exists).
    """
    if instance.status == "live_in_progress":
        # Avoid duplicate payout config
        if not hasattr(instance, "payout_config"):
            # Try to get payout policy for this challenge
            policy: PayoutPolicy | None = getattr(instance.challenge, "payout_policy", None)

            # Default values if no policy
            profit_share_percent = Decimal("80.00")
            first_payout_delay_days = 14
            subsequent_cycle_days = 14
            min_net_amount = Decimal("50.00")
            payment_cycle = "biweekly"

            if policy:
                profit_share_percent = policy.base_share_percent
                first_payout_delay_days = policy.first_payout_delay_days
                subsequent_cycle_days = policy.subsequent_cycle_days
                min_net_amount = policy.min_net_amount

            PayoutConfiguration.objects.create(
                client=instance.client.user,
                enrollment=instance,
                live_trading_start_date=instance.live_start_date or instance.updated_at.date(),
                profit_share_percent=profit_share_percent,
                payment_cycle=payment_cycle,
                first_payout_delay_days=first_payout_delay_days,
                subsequent_cycle_days=subsequent_cycle_days,
                min_net_amount=min_net_amount,
                is_active=True,
                notes=f"Auto-created from policy of challenge {instance.challenge.name}",
            )

            log_engine_event(
            event_type="payout_config_created",
            engine="challenge",
            user=instance.client.user,
            challenge_enrollment=instance,
            metadata={
                "enrollment_id": str(instance.id),
                "profit_share_percent": str(profit_share_percent),
                "payment_cycle": payment_cycle,
                "first_payout_delay_days": first_payout_delay_days,
                "subsequent_cycle_days": subsequent_cycle_days,
                "min_net_amount": str(min_net_amount),
            },
            description=f"Payout configuration created automatically for live enrollment."
        )
            
def safe_rise_invite(client_enrollment: ChallengeEnrollment):
    """
    Sends Rise invite and updates/creates ClientKYC record.
    Runs in background thread to avoid blocking signal.
    """
    client = client_enrollment.client
    user = client.user
    try:
        result = invite_user_via_rise([client.user.email])
    except Exception as e:
        # On failure, update ClientKYC record with error response
        kyc, _ = ClientKYC.objects.get_or_create(client=client)
        kyc.rise_api_response = {"error": str(e)}
        kyc.updated_at = timezone.now()
        kyc.save(update_fields=["rise_api_response", "updated_at"])
        return

    # Success → create/update ClientKYC
    kyc, _ = ClientKYC.objects.get_or_create(client=client)
    kyc.rise_invite_sent = True
    kyc.rise_invite_accepted = False  # will update later via webhook
    kyc.rise_api_response = result
    kyc.updated_at = timezone.now()
    kyc.save()
    
    rise_method, created = ClientPaymentMethod.objects.get_or_create(
        client=client.user,
        payment_type="rise",
        defaults={
            "rise_email": client.user.email,
            "label": "Rise Payout",
            "is_default": True,  # don’t override user’s default unless you want to
        },
    )

    if not created:
        # Ensure rise_email is kept in sync
        if rise_method.rise_email != client.user.email:
            rise_method.rise_email = client.user.email
            rise_method.save(update_fields=["rise_email"])

    # ✅ Log success (Engine Log)
    log_engine_event(
        event_type="rise_invite_sent",
        engine="kyc",
        user=user,
        challenge_enrollment=client_enrollment,
        metadata={
            "email": user.email,
            "enrollment_id": str(client_enrollment.id),
            "rise_response": result,
            "payment_method_created": created,
        },
        description=f"Rise invite sent to {user.email}. Payment method: {'created' if created else 'updated'}."
    )        


@receiver(post_save, sender=ChallengeEnrollment)
def trigger_rise_invite_on_phase_passed(sender, instance: ChallengeEnrollment, **kwargs):
    """
    Sends Rise KYC invite automatically based on enrollment status & challenge step_type.
    Only triggers if client KYC is still pending.
    """
    client_profile = instance.client  # FK to ClientProfile

    # ✅ Skip if KYC already approved or rejected
    if client_profile.kyc_status != "pending":
        return

    # ✅ Send invite only when passing the right phase
    if instance.status == "phase_1_passed" and instance.challenge.step_type == "1-step":
        threading.Thread(target=safe_rise_invite, args=(instance,), daemon=True).start()

    elif instance.status == "phase_2_passed" and instance.challenge.step_type == "2-step":
        threading.Thread(target=safe_rise_invite, args=(instance,), daemon=True).start()

    # Instant funding: send KYC invite when enrollment is created with awaiting_kyc status
    elif instance.status == "awaiting_kyc" and instance.payment_type == "instant_funding":
        threading.Thread(target=safe_rise_invite, args=(instance,), daemon=True).start()

@receiver(post_save, sender=Certificate)
def send_certificate_email(sender, instance: Certificate, created, **kwargs):
    """
    Send HTML email to user whenever a certificate is created.
    """
    if not created:
        return

    user = instance.user
    client_profile = getattr(user, "client_profile", None)

    full_name = user.get_full_name() or user.username

    # Safely extract first/last name from address_info
    if client_profile and client_profile.address_info:
        address_info = client_profile.address_info

        if isinstance(address_info, str):
            try:
                address_info = json.loads(address_info)
            except json.JSONDecodeError:
                address_info = {}

        if isinstance(address_info, dict):
            first_name = address_info.get("first_name", "")
            last_name = address_info.get("last_name", "")
            combined = f"{first_name} {last_name}".strip()
            if combined:
                full_name = combined

    # Enrollment details (optional)
    account_size, currency = None, None
    if instance.enrollment:
        account_size = instance.enrollment.account_size
        currency = instance.enrollment.currency

    # Render HTML body
    html_body = render_to_string(
        "emails/certificates/challenge_certificate.html",
        {
            "user": user,
            "full_name": full_name,
            "certificate": instance,
            "account_size": account_size,
            "currency": currency,
        },
    )

    subject = f"WeFund | Your New Certificate: {instance.title} is Ready"

    try:
        EmailService().send_email(
            to_email=user.email,
            subject=subject,
            html_content=html_body,
        )
        logger.info(
            f"[Certificate Email] Sent to {user.email} (Certificate {instance.id})"
        )
    except Exception as e:
        logger.error(f"[Certificate Email] Failed for {instance.id}: {e}")

def generate_certificate_for_enrollment(enrollment, template_key: str, title_prefix: str, metadata: dict):
    """
    Helper: Generate + save a certificate if it doesn't already exist.
    """
    try:
        user = enrollment.client.user

        # Skip duplicate
        already_exists = Certificate.objects.filter(
            user=user,
            enrollment=enrollment,
            certificate_type="phase_pass",
            metadata__template=template_key
        ).exists()

        if already_exists:
            logger.info(f"[Certificate] Skipped duplicate for {template_key} - Enrollment {enrollment.id}")
            return None

        # Build trader name
        client_profile = getattr(user, "client_profile", None)
        if client_profile and client_profile.address_info:
            first_name = client_profile.address_info.get("first_name") or user.first_name
            last_name = client_profile.address_info.get("last_name") or user.last_name
            trader_name = f"{first_name} {last_name}".strip()
        else:
            trader_name = user.get_full_name() or user.username

        # Generate & upload
        cert_data = generate_and_upload_certificate(
            template_key=template_key,
            trader_name=trader_name,
            issue_date=timezone.now()
        )

        # Save record
        cert = Certificate.objects.create(
            user=user,
            enrollment=enrollment,
            certificate_type="phase_pass",
            title=f"{title_prefix} - ${int(enrollment.account_size):,}",
            image_url=cert_data["image_url"],
            pdf_url=cert_data["pdf_url"],
            metadata={**metadata, "template": template_key, "enrollment_id": str(enrollment.id)},
        )

        logger.info(f"[Certificate] Generated {template_key} certificate for Enrollment {enrollment.id} ({trader_name})")

        # ✅ ENGINE EVENT LOG (Error Case)
        log_engine_event(
            event_type="certificate_generated",
            engine="challenge",
            user=user,
            challenge_enrollment=enrollment,
            metadata={
                "template_key": template_key,
                "certificate_id": str(cert.id),
                "image_url": cert_data.get("image_url"),
                "pdf_url": cert_data.get("pdf_url"),
            },
            description=f"Certificate generated for {trader_name} ({template_key})."
        )

        return cert

    except Exception as e:
        logger.exception(f"[Certificate] Failed to generate {template_key} for Enrollment {enrollment.id}: {e}")

        # ✅ ENGINE EVENT LOG (Error Case)
        log_engine_event(
            event_type="certificate_generation_failed",
            engine="challenge",
            user=user,
            challenge_enrollment=enrollment,
            metadata={
                "template_key": template_key,
                "error": str(e),
            },
            description=f"Certificate generation failed for {user.email} ({template_key})."
        )

        return None


@receiver(post_save, sender=ChallengeEnrollment)
def generate_certificates_on_status_change(sender, instance: ChallengeEnrollment, created, **kwargs):
    """
    Generate certificates based on ChallengeEnrollment status transitions.
    """
    if created:
        return  # only on updates

    status = instance.status

    if status == "phase_1_passed":
        generate_certificate_for_enrollment(
            enrollment=instance,
            template_key="phase_one",
            title_prefix="Phase 1 Certificate",
            metadata={"phase": "phase-1"}
        )

    elif status == "phase_2_passed":
        generate_certificate_for_enrollment(
            enrollment=instance,
            template_key="phase_two",
            title_prefix="Phase 2 Certificate",
            metadata={"phase": "phase-2"}
        )

    elif status == "live_in_progress":
        generate_certificate_for_enrollment(
            enrollment=instance,
            template_key="funded",
            title_prefix="Funded Trader Certificate",
            metadata={"phase": "funded"}
        )

    elif status == "completed":
        generate_certificate_for_enrollment(
            enrollment=instance,
            template_key="funded",
            title_prefix="Funded Trader Certificate",
            metadata={"phase": "funded"}
        )                                            