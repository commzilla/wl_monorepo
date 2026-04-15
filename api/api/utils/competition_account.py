# wefund/mt5_controller/challenge_account.py

from django.conf import settings
from api.services.mt5_client import MT5Client
from api.utils.security import generate_mt5_compliant_password
from wefund.models import ChallengePhase, ChallengePhaseGroupMapping


def create_mt5_for_challenge_enrollment(enrollment, client_profile):
    """
    Secure MT5 account creation for Challenge Enrollment.
    Used by TraderJoinCompetitionView and CRM.
    """

    user = client_profile.user

    # Generate passwords
    mt5_password = generate_mt5_compliant_password()
    investor_password = generate_mt5_compliant_password()

    # Dynamic group mapping
    mt5_group_name = None
    current_phase_type = enrollment.get_current_phase_type()

    try:
        challenge_phase = ChallengePhase.objects.get(
            challenge=enrollment.challenge,
            phase_type=current_phase_type,
        )

        mapping = ChallengePhaseGroupMapping.objects.get(
            challenge_phase=challenge_phase,
            is_active=True
        )

        mt5_group_name = mapping.mt5_group.strip()

    except (ChallengePhase.DoesNotExist, ChallengePhaseGroupMapping.DoesNotExist):
        mt5_group_name = settings.MT5_GROUP_NAME.strip()

    if not mt5_group_name:
        raise Exception("MT5 group name resolved as empty")

    if "\\" not in mt5_group_name:
        raise Exception(f"Invalid MT5 group format: {mt5_group_name}")

    user_address = getattr(client_profile, "address_info", {}) or {}

    payload = [{
        "index": 0,
        "agentAccount": settings.MT5_AGENT_ACCOUNT,
        "canTrade": True,
        "comment": f"{enrollment.get_current_phase_type()} - Enrollment {enrollment.id}",
        "group": {"name": mt5_group_name},
        "hasSendReportEnabled": True,
        "isEnabled": True,
        "leverage": settings.MT5_LEVERAGE,
        "password": mt5_password,
        "investorPassword": investor_password,
        "enable_change_password": True,
        "password_phone": user.phone or "",
        "status": "RE",
        "pltAccount": {
            "taxes": settings.MT5_TAX_RATE,
            "balance": float(enrollment.account_size),
        },
        "user": {
            "address": {
                "address": user_address.get("address_line_1", ""),
                "city": user_address.get("city", ""),
                "state": user_address.get("state", ""),
                "zipcode": user_address.get("postcode", ""),
                "country": user_address.get("country", ""),
            },
            "name": f"{user.first_name} {user.last_name}",
            "email": user.email,
            "phone": user.phone or "",
        }
    }]

    mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
    response = mt5_client.add_user(payload)

    account_id = (response.get("array") or [{}])[0].get("accountID")

    if not account_id:
        raise Exception("MT5 challenge account creation failed")

    enrollment.mt5_account_id = account_id
    enrollment.mt5_password = mt5_password
    enrollment.mt5_investor_password = investor_password
    enrollment.broker_type = "mt5"

    enrollment.save(update_fields=[
        "mt5_account_id",
        "mt5_password",
        "mt5_investor_password",
        "broker_type"
    ])

    return enrollment
