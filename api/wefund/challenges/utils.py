from wefund.models import EnrollmentAccount
from wefund.mt5_controller.utils import fetch_user_balance
import logging
import uuid
from api.services.mt5_client import MT5Client
from api.utils.security import generate_mt5_compliant_password
from django.conf import settings
from wefund.models import ClientProfile, ChallengePhase, ChallengePhaseGroupMapping

logger = logging.getLogger(__name__)

def get_balance(mt5_account_id):
    """Returns current balance (or equity) for the account."""
    balance = fetch_user_balance(mt5_account_id)
    if balance is None:
        logger.warning(f"MT5 balance not found for account {mt5_account_id}")
        return 0.0
    return float(balance)

def get_equity(mt5_account_id):
    """Returns current equity for the account (same as balance if fetch_user_balance returns live value)."""
    return get_balance(mt5_account_id)

def get_mt5_group_for_enrollment(enrollment, phase_type_override=None):
    """
    Resolve MT5 group name for a given ChallengeEnrollment.
    By default uses enrollment.get_current_phase_type(),
    but can override with a target phase (e.g. during transition).
    """
    if not enrollment:
        return settings.MT5_GROUP_NAME

    # use override if provided
    phase_type = phase_type_override or enrollment.get_current_phase_type()

    try:
        challenge_phase = ChallengePhase.objects.get(
            challenge=enrollment.challenge,
            phase_type=phase_type
        )
        mapping = challenge_phase.group_mapping
        return mapping.mt5_group
    except (ChallengePhase.DoesNotExist, ChallengePhaseGroupMapping.DoesNotExist) as e:
        logger.warning(
            f"[MT5_GROUP_RESOLVE] No mapping for {enrollment.challenge} - {phase_type} ({e}), "
            f"using default {settings.MT5_GROUP_NAME}"
        )
        return settings.MT5_GROUP_NAME

def create_mt5_account_for_challenge(user, account_size, phase_name, order=None, enrollment=None, phase_type_override=None,):
    """
    Create an MT5 account for a given user and challenge phase.

    Args:
        user: User instance (client)
        account_size: float, initial balance
        phase_name: str, used in comment
        order: optional, Order instance if triggered from purchase

    Returns:
        dict with MT5 account credentials and raw response
    """
    mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)

    # Generate passwords
    user_password = generate_mt5_compliant_password().strip()
    mt5_password = generate_mt5_compliant_password().strip()
    investor_password = generate_mt5_compliant_password().strip()

    # Build comment dynamically
    comment = f"{phase_name} - Upgrade"
    if order:
        comment += f" | Order ID: {order.id}"

    try:
        address_info = user.client_profile.address_info
    except ClientProfile.DoesNotExist:
        address_info = {}

    # Ensure it's a dict
    if isinstance(address_info, str):
        address_info = {"address_line_1": address_info}

    mt5_group_name = (
        get_mt5_group_for_enrollment(enrollment, phase_type_override)
        if enrollment else settings.MT5_GROUP_NAME
    )
    
    payload = [{
        "index": 0,
        "agentAccount": settings.MT5_AGENT_ACCOUNT,
        "canTrade": True,
        "comment": comment,
        "group": {"name": mt5_group_name},
        "hasSendReportEnabled": True,
        "isEnabled": True,
        "leverage": settings.MT5_LEVERAGE,
        "password": mt5_password,
        "investorPassword": investor_password,
        "enable_change_password": True,
        "password_phone": user.phone or "",
        "id": getattr(user.client_profile, "profile_id", ""),
        "status": "RE",
        "user_color": settings.MT5_USER_COLOR,
        "pltAccount": {
            "taxes": settings.MT5_TAX_RATE,
            "balance": account_size
        },
        "user": {
            "address": {
                "address": address_info.get("address_line_1", ""),
                "city": address_info.get("city", ""),
                "state": address_info.get("state", ""),
                "zipcode": address_info.get("postcode", ""),
                "country": address_info.get("country", "")
            },
            "name": f"{user.first_name} {user.last_name}",
            "email": user.email,
            "phone": user.phone or ""
        }
    }]

    # Call MT5 API
    response = mt5_client.add_user(payload)
    account_id = (response.get("array") or [{}])[0].get("accountID")
    
    logger.info(f"Created MT5 account {account_id} for user {user.id}, phase {phase_name}")
    
    return {
        "account_id": account_id,
        "mt5_password": mt5_password,
        "investor_password": investor_password,
        "plaintext_password": user_password,
        "response": response
    }
