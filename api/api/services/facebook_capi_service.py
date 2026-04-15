import hashlib
import json
import logging
import threading
import time

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v21.0"


class FacebookCAPIService:
    """Sends server-side events to Facebook Conversions API for deduplication with pixel events."""

    @staticmethod
    def _get_config():
        pixel_id = getattr(settings, "FACEBOOK_PIXEL_ID", "")
        access_token = getattr(settings, "FACEBOOK_CAPI_ACCESS_TOKEN", "")
        if not pixel_id or not access_token:
            logger.debug("Facebook CAPI not configured, skipping.")
            return None
        return {"pixel_id": pixel_id, "access_token": access_token}

    @staticmethod
    def _hash(value):
        """SHA-256 hash a value for Facebook's user data matching."""
        if not value:
            return None
        return hashlib.sha256(str(value).strip().lower().encode()).hexdigest()

    @staticmethod
    def _send(events):
        config = FacebookCAPIService._get_config()
        if not config:
            return False

        url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{config['pixel_id']}/events"

        form_data = {
            "data": json.dumps(events),
            "access_token": config["access_token"],
        }

        test_code = getattr(settings, "FACEBOOK_CAPI_TEST_CODE", "")
        if test_code:
            form_data["test_event_code"] = test_code

        try:
            response = requests.post(url, data=form_data, timeout=10)
            if response.status_code == 200:
                logger.info("Facebook CAPI event sent successfully: %s", [e["event_name"] for e in events])
                return True
            else:
                logger.warning(
                    "Facebook CAPI request failed (status=%s): %s",
                    response.status_code,
                    response.text[:500],
                )
                return False
        except Exception:
            logger.exception("Facebook CAPI request raised an exception")
            return False

    @staticmethod
    def _send_async(events):
        """Fire-and-forget: send events in a background thread so the caller isn't blocked."""
        config = FacebookCAPIService._get_config()
        if not config:
            return
        thread = threading.Thread(target=FacebookCAPIService._send, args=(events,), daemon=True)
        thread.start()

    @staticmethod
    def send_purchase_event(website_order):
        """Fire a Purchase event after payment confirmation."""
        tracking = website_order.tracking_data or {}
        event = {
            "event_name": "Purchase",
            "event_time": int(time.time()),
            "event_id": f"pur_{website_order.id}",
            "event_source_url": "https://we-fund.com/thank-you",
            "action_source": "website",
            "user_data": FacebookCAPIService._build_user_data(website_order, tracking),
            "custom_data": {
                "content_name": str(website_order.variant) if website_order.variant else "",
                "value": float(website_order.total),
                "currency": website_order.currency or "USD",
            },
        }
        return FacebookCAPIService._send([event])

    @staticmethod
    def send_initiate_checkout_event(website_order):
        """Fire an InitiateCheckout event when an order is created (non-blocking)."""
        tracking = website_order.tracking_data or {}
        event = {
            "event_name": "InitiateCheckout",
            "event_time": int(time.time()),
            "event_id": f"ic_{website_order.id}",
            "event_source_url": "https://we-fund.com/checkout",
            "action_source": "website",
            "user_data": FacebookCAPIService._build_user_data(website_order, tracking),
            "custom_data": {
                "content_name": str(website_order.variant) if website_order.variant else "",
                "value": float(website_order.total),
                "currency": website_order.currency or "USD",
            },
        }
        FacebookCAPIService._send_async([event])

    @staticmethod
    def _build_user_data(website_order, tracking):
        data = {}
        em = FacebookCAPIService._hash(website_order.customer_email)
        if em:
            data["em"] = em
        fn = FacebookCAPIService._hash(website_order.customer_first_name)
        if fn:
            data["fn"] = fn
        ln = FacebookCAPIService._hash(website_order.customer_last_name)
        if ln:
            data["ln"] = ln
        country = FacebookCAPIService._hash(website_order.customer_country)
        if country:
            data["country"] = country
        ph = FacebookCAPIService._hash(website_order.customer_phone)
        if ph:
            data["ph"] = ph

        if website_order.customer_ip:
            data["client_ip_address"] = website_order.customer_ip
        if tracking.get("user_agent"):
            data["client_user_agent"] = tracking["user_agent"]
        if tracking.get("fbp"):
            data["fbp"] = tracking["fbp"]
        if tracking.get("fbc"):
            data["fbc"] = tracking["fbc"]

        return data
