import logging
import time

import requests
from django.conf import settings
from django.core.cache import cache

from api.zoho_export_views import (
    AED_USD_RATE,
    COUNTRY_NAMES,
    extract_payment_details,
    get_addr_field,
    get_item_tax,
    get_place_of_supply,
    get_vat_treatment,
)

logger = logging.getLogger(__name__)

ZOHO_BOOKS_API_BASE = "https://www.zohoapis.com/books/v3"
ZOHO_OAUTH_URL = "https://accounts.zoho.com/oauth/v2/token"
REDIS_TOKEN_KEY = "zoho_books_access_token"
REDIS_RATE_KEY = "zoho_books_rate_counter"
TOKEN_CACHE_TTL = 55 * 60  # 55 minutes (tokens expire in 60)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_THRESHOLD = 80  # pause at 80 of 100 allowed per minute


class ZohoBooksSyncError(Exception):
    """Non-retryable error (400, 404, validation failures)."""
    pass


class ZohoBooksRateLimitError(Exception):
    """Retryable error (429, 401 expired token, 5xx, network errors)."""
    pass


class ZohoBooksService:
    """Client for Zoho Books API with OAuth token caching and rate limiting."""

    def __init__(self):
        self.org_id = getattr(settings, "ZOHO_BOOKS_ORGANIZATION_ID", "")

    # ── Authentication ──────────────────────────────────────────────

    def _get_access_token(self):
        token = cache.get(REDIS_TOKEN_KEY)
        if token:
            return token

        client_id = getattr(settings, "ZOHO_BOOKS_CLIENT_ID", "")
        client_secret = getattr(settings, "ZOHO_BOOKS_CLIENT_SECRET", "")
        refresh_token = getattr(settings, "ZOHO_BOOKS_REFRESH_TOKEN", "")

        if not all([client_id, client_secret, refresh_token]):
            raise ZohoBooksSyncError("Zoho Books credentials not configured")

        try:
            resp = requests.post(ZOHO_OAUTH_URL, data={
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "refresh_token",
            }, timeout=15)
        except requests.RequestException as e:
            raise ZohoBooksRateLimitError(f"OAuth token refresh failed: {e}")

        if resp.status_code != 200:
            raise ZohoBooksRateLimitError(f"OAuth refresh returned {resp.status_code}: {resp.text[:300]}")

        data = resp.json()
        access_token = data.get("access_token")
        if not access_token:
            raise ZohoBooksSyncError(f"No access_token in OAuth response: {data}")

        cache.set(REDIS_TOKEN_KEY, access_token, TOKEN_CACHE_TTL)
        return access_token

    # ── Rate Limiting ───────────────────────────────────────────────

    def _check_rate_limit(self):
        count = cache.get(REDIS_RATE_KEY)
        if count is not None and int(count) >= RATE_LIMIT_THRESHOLD:
            ttl = cache.ttl(REDIS_RATE_KEY) if hasattr(cache, 'ttl') else RATE_LIMIT_WINDOW
            sleep_time = max(ttl, 5)
            logger.warning("Zoho rate limit approaching (%s/%s), sleeping %ss", count, RATE_LIMIT_THRESHOLD, sleep_time)
            time.sleep(sleep_time)

    def _increment_rate_counter(self):
        count = cache.get(REDIS_RATE_KEY)
        if count is None:
            cache.set(REDIS_RATE_KEY, 1, RATE_LIMIT_WINDOW)
        else:
            try:
                cache.incr(REDIS_RATE_KEY)
            except ValueError:
                cache.set(REDIS_RATE_KEY, 1, RATE_LIMIT_WINDOW)

    # ── HTTP ────────────────────────────────────────────────────────

    def _request(self, method, endpoint, json_data=None, params=None):
        self._check_rate_limit()
        token = self._get_access_token()

        url = f"{ZOHO_BOOKS_API_BASE}/{endpoint}"
        headers = {
            "Authorization": f"Zoho-oauthtoken {token}",
            "Content-Type": "application/json",
        }
        base_params = {"organization_id": self.org_id}
        if params:
            base_params.update(params)

        try:
            resp = requests.request(
                method, url, json=json_data, params=base_params,
                headers=headers, timeout=30,
            )
            self._increment_rate_counter()
        except requests.RequestException as e:
            raise ZohoBooksRateLimitError(f"Network error calling {endpoint}: {e}")

        if resp.status_code == 429:
            raise ZohoBooksRateLimitError("Rate limited by Zoho Books API")

        if resp.status_code == 401:
            cache.delete(REDIS_TOKEN_KEY)
            raise ZohoBooksRateLimitError("Zoho token expired, cleared cache for retry")

        if resp.status_code >= 500:
            raise ZohoBooksRateLimitError(f"Zoho server error {resp.status_code}: {resp.text[:300]}")

        data = resp.json()
        if resp.status_code >= 400:
            raise ZohoBooksSyncError(f"Zoho API error {resp.status_code}: {data.get('message', resp.text[:300])}")

        return data

    # ── Contacts ────────────────────────────────────────────────────

    def find_contact_by_email(self, email):
        data = self._request("GET", "contacts", params={"email": email})
        contacts = data.get("contacts", [])
        if contacts:
            return contacts[0]["contact_id"]
        return None

    def create_contact(self, order):
        country_name = COUNTRY_NAMES.get(order.customer_country, order.customer_country)
        payload = {
            "contact_name": f"{order.customer_first_name} {order.customer_last_name}",
            "contact_type": "customer",
            "email": order.customer_email,
            "phone": order.customer_phone,
            "billing_address": {
                "address": get_addr_field(order, "address_line_1"),
                "city": get_addr_field(order, "city"),
                "state": get_addr_field(order, "state"),
                "zip": get_addr_field(order, "postcode"),
                "country": country_name,
            },
            "vat_treatment": get_vat_treatment(order.customer_country),
        }
        data = self._request("POST", "contacts", json_data=payload)
        return data["contact"]["contact_id"]

    def find_or_create_contact(self, order):
        existing = self.find_contact_by_email(order.customer_email)
        if existing:
            return existing, False
        new_id = self.create_contact(order)
        return new_id, True

    # ── Invoices ────────────────────────────────────────────────────

    def find_invoice_by_reference(self, reference_number):
        data = self._request("GET", "invoices", params={"reference_number": reference_number})
        invoices = data.get("invoices", [])
        if invoices:
            return invoices[0]["invoice_id"]
        return None

    def create_invoice(self, order, contact_id):
        tax_name, tax_pct = get_item_tax(order.customer_country)
        item_name = order.variant.product.name if order.variant and order.variant.product else "Challenge"
        item_rate = float(order.variant.price) if order.variant else float(order.total)
        discount_amount = float(order.discount_amount)

        invoice_number = str(order.zoho_invoice_number) if order.zoho_invoice_number else ""

        payload = {
            "customer_id": contact_id,
            "invoice_number": invoice_number,
            "reference_number": invoice_number,
            "date": order.created_at.strftime("%Y-%m-%d"),
            "exchange_rate": AED_USD_RATE,
            "vat_treatment": get_vat_treatment(order.customer_country),
            "place_of_supply": get_place_of_supply(order),
            "is_discount_before_tax": True,
            "discount_type": "item_level",
            "is_inclusive_tax": True,
            "line_items": [
                {
                    "name": item_name,
                    "rate": item_rate,
                    "quantity": 1,
                    "discount": discount_amount,
                    "tax_name": tax_name,
                    "tax_percentage": tax_pct,
                    "tax_type": "tax",
                }
            ],
        }
        data = self._request("POST", "invoices", json_data=payload)
        return data["invoice"]["invoice_id"]

    def find_or_create_invoice(self, order, contact_id):
        if order.zoho_invoice_number:
            ref = str(order.zoho_invoice_number)
            existing = self.find_invoice_by_reference(ref)
            if existing:
                return existing, False
        new_id = self.create_invoice(order, contact_id)
        return new_id, True

    # ── Payments ────────────────────────────────────────────────────

    def create_customer_payment(self, order, contact_id, invoice_id):
        payment_type, fee, fee_vat = extract_payment_details(order)
        total = float(order.total)
        bank_charges = fee + fee_vat

        payment_mode = "paytiko" if order.payment_method == "card" else (
            "confirmo" if order.payment_method == "crypto" else order.payment_method
        )

        payload = {
            "customer_id": contact_id,
            "payment_mode": payment_mode,
            "amount": total,
            "date": order.paid_at.strftime("%Y-%m-%d") if order.paid_at else order.created_at.strftime("%Y-%m-%d"),
            "reference_number": order.payment_id or "",
            "exchange_rate": AED_USD_RATE,
            "bank_charges": bank_charges,
            "tax_account_name": "Exempt",
            "invoices": [
                {
                    "invoice_id": invoice_id,
                    "amount_applied": total,
                }
            ],
        }
        data = self._request("POST", "customerpayments", json_data=payload)
        return data["payment"]["payment_id"]
