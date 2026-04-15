# wefund/notifications/telegram_notifier.py

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

def send_payout_certificate_to_telegram(first_name, payout_amount, certificate_url):
    """
    Sends a payout celebration message to Telegram channel or group.
    """
    try:
        bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
        chat_id = getattr(settings, "TELEGRAM_PAYOUT_CHAT_ID", None)

        if not bot_token or not chat_id:
            logger.warning("Telegram payout notifier not configured properly.")
            return False

        message = (
            f"💸 *Another Trader Gets Paid!*\n\n"
            f"Our one of the talented traders, *{first_name}*, just received a payout of "
            f"*${payout_amount:,.2f}* 🎉\n\n"
            "We love seeing our traders succeed and reach new milestones every week! 🚀"
        )

        # --- Send image with caption ---
        send_url = f"https://api.telegram.org/bot{bot_token}/sendPhoto"
        payload = {
            "chat_id": chat_id,
            "photo": certificate_url,
            "caption": message,
            "parse_mode": "Markdown",
        }

        response = requests.post(send_url, data=payload, timeout=10)
        response.raise_for_status()

        logger.info(f"✅ Sent payout message to Telegram for {first_name}")
        return True

    except Exception as e:
        logger.exception(f"❌ Failed to send Telegram payout message: {e}")
        return False
