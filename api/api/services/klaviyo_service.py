import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

KLAVIYO_API_BASE = "https://a.klaviyo.com/api"
KLAVIYO_API_REVISION = "2024-10-15"


class KlaviyoService:
    """Sends events to Klaviyo Track API. Emails are designed/sent from Klaviyo's flow builder."""

    @staticmethod
    def _get_api_key():
        key = getattr(settings, "KLAVIYO_PRIVATE_API_KEY", "")
        if not key:
            logger.debug("KLAVIYO_PRIVATE_API_KEY not configured, skipping Klaviyo request.")
            return None
        return key

    @staticmethod
    def _make_request(endpoint, payload):
        api_key = KlaviyoService._get_api_key()
        if not api_key:
            return False

        url = f"{KLAVIYO_API_BASE}/{endpoint}"
        headers = {
            "Authorization": f"Klaviyo-API-Key {api_key}",
            "Content-Type": "application/json",
            "revision": KLAVIYO_API_REVISION,
            "Accept": "application/json",
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            if response.status_code in (200, 201, 202):
                logger.info("Klaviyo %s request succeeded (status=%s)", endpoint, response.status_code)
                return True
            else:
                logger.warning(
                    "Klaviyo %s request failed (status=%s): %s",
                    endpoint,
                    response.status_code,
                    response.text[:500],
                )
                return False
        except Exception:
            logger.exception("Klaviyo %s request raised an exception", endpoint)
            return False

    @staticmethod
    def identify_profile(email, properties=None):
        """Creates or updates a Klaviyo profile with user properties."""
        if not email:
            return False

        attributes = {"email": email}
        if properties:
            attributes.update(properties)

        payload = {
            "data": {
                "type": "profile",
                "attributes": attributes,
            }
        }
        return KlaviyoService._make_request("profiles", payload)

    @staticmethod
    def track_event(event_name, email, properties=None):
        """Sends a metric/event to Klaviyo."""
        if not email:
            return False

        payload = {
            "data": {
                "type": "event",
                "attributes": {
                    "metric": {
                        "data": {
                            "type": "metric",
                            "attributes": {"name": event_name},
                        }
                    },
                    "profile": {
                        "data": {
                            "type": "profile",
                            "attributes": {"email": email},
                        }
                    },
                    "properties": properties or {},
                },
            }
        }
        return KlaviyoService._make_request("events", payload)
