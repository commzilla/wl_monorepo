import os
import mimetypes
import requests
import logging
from datetime import datetime

from django.conf import settings

logger = logging.getLogger(__name__)

def send_payout_certificate_to_discord(first_name, payout_amount, certificate_url, pdf_url=None):
    """
    Send WeFund payout notification to Discord channel.
    Upload certificate image as attachment so preview always works
    even if CDN blocks Discord hotlinking.
    """
    webhook_url = getattr(settings, "DISCORD_PAYOUT_WEBHOOK_URL", None)
    if not webhook_url:
        logger.warning("DISCORD_PAYOUT_WEBHOOK_URL not set in settings.")
        return False

    # NOTE: your string says GMT+2 but you're using UTC.
    # If you want true GMT+2, use your now_gmt2_naive() or add +2h properly.
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    embed = {
        "title": f"🚀 Fresh WeFund payout confirmed: ${payout_amount:,.2f}",
        "description": (
            "A new verified blockchain payout has been successfully processed! <@&Verified>\n\n"
            "🔹 **Verified Transaction:**\n"
            "[View on Arbiscan](https://arbiscan.io/address/0xB3a371932142975EE482B2ce63f6e0c8FBb80798#tokentxns)\n\n"
            "———\n\n"
            f"📅 **Timestamp:**\n{now_str}\n\n"
            f"💰 **Amount:** ${payout_amount:,.2f}\n"
            "🏦 **Processor:** RISEPAY\n\n"
            "———\n\n"
            "🖼 **Payout Certificate Preview:**\n"
        ),
        "color": 0x2ECC71,
        "footer": {
            "text": "WeFund CRM • Empowering Traders Worldwide 🌍",
            "icon_url": "https://we-fund.com/wp-content/uploads/2025/02/cropped-1x-192x192.png",
        },
    }

    if pdf_url:
        embed["description"] += f"\n📄 **PDF:** [Open Certificate PDF]({pdf_url})\n"

    try:
        # 1) Download the certificate image from CDN
        img_resp = requests.get(certificate_url, timeout=20, stream=True)
        img_resp.raise_for_status()

        content_type = img_resp.headers.get("Content-Type", "").split(";")[0].strip()
        ext = mimetypes.guess_extension(content_type) or ".png"
        filename = f"payout_certificate{ext}"

        # 2) Point embed image to the attachment
        embed["image"] = {"url": f"attachment://{filename}"}

        payload = {
            "embeds": [embed],
            # Prevent accidental broad pings; allow role mention only if you want.
            # If you WANT the role ping, keep parse empty and mention role explicitly like you did.
            "allowed_mentions": {"parse": []},
        }

        # 3) Send multipart: payload_json + file
        files = {
            "file": (filename, img_resp.content, content_type or "application/octet-stream"),
        }
        data = {
            "payload_json": __import__("json").dumps(payload)
        }

        r = requests.post(webhook_url, data=data, files=files, timeout=20)

        # Discord success is typically 204
        if r.status_code not in (200, 204):
            logger.error("Discord webhook failed: %s %s", r.status_code, r.text[:1000])
            r.raise_for_status()

        logger.info("✅ Sent payout certificate to Discord for %s", first_name)
        return True

    except Exception as e:
        logger.exception("❌ Failed to send Discord payout notification: %s", e)
        return False
