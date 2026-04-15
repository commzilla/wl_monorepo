from django.utils import timezone
from wefund.models import EventLog
from uuid import UUID
from decimal import Decimal


def _safe_metadata(meta):
    """
    Recursively converts metadata values to JSON-serializable types.
    """
    if meta is None:
        return {}

    if isinstance(meta, (str, int, float, bool)):
        return meta

    if isinstance(meta, (UUID, Decimal)):
        return str(meta)

    if isinstance(meta, list):
        return [_safe_metadata(item) for item in meta]

    if isinstance(meta, dict):
        return {k: _safe_metadata(v) for k, v in meta.items()}

    # Fallback for unknown objects
    return str(meta)


def log_event(
    *,
    event_type: str,
    user=None,
    request=None,
    category=None,
    challenge_enrollment=None,
    metadata=None,
    description: str = ""
):
    ip_address = None

    if request:
        # Extract user safely
        if getattr(request, "user", None) and request.user.is_authenticated:
            user = request.user

        # Real IP extraction behind proxies
        ip_address = request.META.get("HTTP_X_FORWARDED_FOR")
        if ip_address:
            ip_address = ip_address.split(",")[0].strip()
        else:
            ip_address = request.META.get("REMOTE_ADDR")

    EventLog.objects.create(
        user=user,
        category=category,
        event_type=event_type,
        challenge_enrollment=challenge_enrollment,
        ip_address=ip_address,
        metadata=_safe_metadata(metadata),
        description=description,
    )

def log_engine_event(
    *,
    event_type: str,
    engine: str,
    user=None,
    challenge_enrollment=None,
    metadata=None,
    description: str = ""
):
    """
    Used by internal background engines (Challenge Engine, Risk Engine,
    KYC Engine, Order Engine, WeCoins Engine, etc.)
    No request → No IP lookup.
    """
    EventLog.objects.create(
        user=user,  # can be None
        category=engine,  # reuses category for grouping in UI filters
        event_type=event_type,
        engine=engine,
        challenge_enrollment=challenge_enrollment,
        metadata=_safe_metadata(metadata),
        description=description,
    )
