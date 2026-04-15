from decimal import Decimal
import requests
from django.conf import settings


def convert_to_usd(currency: str, amount: Decimal):
    """
    Convert any currency amount to USD.
    Returns (converted_amount, rate).
    If currency is already USD → rate = 1, same amount.
    """
    if not currency:
        return amount, Decimal("1.0")

    currency = currency.upper()

    if currency == "USD":
        return amount, Decimal("1.0")

    api_key = settings.EXCHANGE_RATE_API_KEY
    url = f"https://v6.exchangerate-api.com/v6/{api_key}/pair/{currency}/USD"

    try:
        resp = requests.get(url, timeout=5).json()
        if resp.get("result") != "success":
            return amount, Decimal("1.0")

        rate = Decimal(str(resp["conversion_rate"]))
        amount_usd = (amount * rate).quantize(Decimal("0.01"))
        return amount_usd, rate

    except Exception:
        return amount, Decimal("1.0")
