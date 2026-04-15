# wefund/rise/views.py
import json
import hashlib
import os
import logging
from eth_utils import keccak
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from eth_account.messages import encode_defunct
from eth_account.account import Account
from wefund.models import ClientKYC, ClientProfile
from eth_utils import decode_hex
from wefund.event_logger import log_engine_event


RISE_PUBLIC_SIGNER = os.getenv("RISE_PUBLIC_SIGNER", "")

# --- Setup dedicated Rise webhook logger ---
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
logger = logging.getLogger("rise_webhook")
logger.setLevel(logging.INFO)
log_file = os.path.join(LOG_DIR, "rise_webhook.log")
if not logger.handlers:
    file_handler = logging.FileHandler(log_file)
    formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    
def calculate_rise_hash_from_raw(raw_body: bytes) -> str:
    """
    Compute keccak256 over the exact raw request body bytes.
    This matches ethers.id(JSON.stringify(body)) on the sender side.
    """
    return keccak(raw_body).hex()

def verify_rise_webhook(raw_body: bytes, hash_header: str, signature: str, public_signer: str) -> bool:
    try:
        # Normalize the header hash to lowercase and ensure it has 0x prefix for the text
        header_text = hash_header.lower()
        if not header_text.startswith("0x"):
            header_text = "0x" + header_text

        # 1) Compute keccak256 over raw body
        body_hash = calculate_rise_hash_from_raw(raw_body)

        # Compare without 0x for equality
        if body_hash != header_text.removeprefix("0x"):
            logger.warning(f"Hash mismatch. Calculated: {body_hash}, Header: {header_text.removeprefix('0x')}")
            return False

        # 2) Verify signature over the *text* of the hash (including 0x), like ethers.verifyMessage(hash, sig)
        eth_message = encode_defunct(text=header_text)  # IMPORTANT: text=..., not hexstr=...
        recovered_address = Account.recover_message(eth_message, signature=signature)

        if recovered_address.lower() != public_signer.lower():
            logger.warning(f"Signature mismatch. Recovered: {recovered_address}, Expected: {public_signer}")
            return False

        return True
    except Exception as e:
        logger.error(f"Verification error: {e}", exc_info=True)
        return False


@csrf_exempt
def rise_webhook_view(request):
    if request.method != "POST":
        return HttpResponseBadRequest("Only POST allowed")

    raw_body = request.body  # bytes

    # Extract headers
    hash_header = request.headers.get("x-rise-hash")
    signature = request.headers.get("x-rise-signature")
    if not hash_header or not signature:
        logger.warning("Missing verification headers")
        return HttpResponseForbidden("Missing verification headers")

    # Verify with raw body
    if not verify_rise_webhook(raw_body, hash_header, signature, RISE_PUBLIC_SIGNER):
        return HttpResponseForbidden("Invalid hash or signature")

    # Parse JSON only after verification
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        return HttpResponseBadRequest("Invalid JSON payload")

    logger.info(f"Incoming webhook payload: {json.dumps(payload)}")

    # --- Your existing business logic below (unchanged) ---
    invite = payload.get("invite", {})
    invite_id = invite.get("uuid")
    email = invite.get("email")
    status = payload.get("type", "").split(".")[-1]  # e.g., "invite_accepted"

    if not email or not invite_id:
        logger.warning(f"Missing email or invite_id in payload: {payload}")
        return HttpResponseBadRequest("Missing email or invite_id")

    try:
        client_profile = ClientProfile.objects.get(user__email=email)
        kyc_session, _ = ClientKYC.objects.get_or_create(client=client_profile)
    except ClientProfile.DoesNotExist:
        logger.warning(f"No client profile found for {email}")
        return JsonResponse({"error": f"No client profile found for {email}"}, status=404)

    updated = False
    if not kyc_session.rise_invite_id:
        kyc_session.rise_invite_id = str(invite_id)
        updated = True

    kyc_session.rise_webhook_response = payload

    if status == "invite_accepted" and not kyc_session.rise_invite_accepted:
        kyc_session.rise_invite_accepted = True
        kyc_session.rise_invite_sent = True
        kyc_session.status = "approved"
        client_profile.kyc_status = "approved"
        client_profile.save(update_fields=["kyc_status"])
        updated = True

        # ENGINE EVENT LOG
        log_engine_event(
            event_type="rise_kyc_approved",
            engine="kyc",
            user=client_profile.user,
            challenge_enrollment=None,
            metadata={
                "email": email,
                "invite_id": invite_id,
            },
            description=f"Rise KYC approved for {email}"
        )

        logger.info(f"KYC approved for {email}")

    elif status == "invite_rejected":
        kyc_session.status = "rejected"
        kyc_session.rise_invite_accepted = False
        client_profile.kyc_status = "rejected"
        client_profile.save(update_fields=["kyc_status"])
        updated = True

        log_engine_event(
            event_type="rise_kyc_rejected",
            engine="kyc",
            user=client_profile.user,
            metadata={
                "email": email,
                "invite_id": invite_id,
            },
            description=f"Rise KYC rejected for {email}"
        )

        logger.info(f"KYC rejected for {email}")

    if updated:
        kyc_session.save()

    logger.info(f"Webhook processed successfully for {email}, invite status: {status}")
    return JsonResponse({"success": True, "invite_status": status})