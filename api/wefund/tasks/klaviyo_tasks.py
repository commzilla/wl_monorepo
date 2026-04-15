import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def check_abandoned_checkouts():
    """
    Runs periodically. Finds WebsiteOrders created >1 hour ago
    still in pending/awaiting_payment and sends an Abandoned Checkout
    event to Klaviyo.
    """
    from wefund.models import WebsiteOrder
    from api.services.klaviyo_service import KlaviyoService

    one_hour_ago = timezone.now() - timedelta(hours=1)

    abandoned_orders = WebsiteOrder.objects.filter(
        status__in=["pending", "awaiting_payment"],
        created_at__lte=one_hour_ago,
        klaviyo_abandoned_sent=False,
    ).select_related("variant", "variant__product")

    sent_count = 0
    for order in abandoned_orders:
        product_name = ""
        price = float(order.total)
        if order.variant and order.variant.product:
            product_name = order.variant.product.name

        success = KlaviyoService.track_event(
            "Abandoned Checkout",
            order.customer_email,
            {
                "order_id": str(order.id),
                "product_name": product_name,
                "value": price,
                "currency": order.currency,
                "first_name": order.customer_first_name,
                "last_name": order.customer_last_name,
                "checkout_url": f"{getattr(settings, 'WEBSITE_URL', 'https://www.we-fund.com')}/checkout",
            },
        )

        order.klaviyo_abandoned_sent = True
        order.save(update_fields=["klaviyo_abandoned_sent"])

        if success:
            sent_count += 1

    logger.info("[Klaviyo] Abandoned checkout task complete: %d events sent", sent_count)
