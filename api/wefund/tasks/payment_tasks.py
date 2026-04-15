import logging
from decimal import Decimal, InvalidOperation

import requests
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def capture_approved_paypal_orders():
    """
    Periodically checks for PayPal orders stuck in 'awaiting_payment' and
    captures them if PayPal reports them as APPROVED.

    This handles the case where a customer approves payment on PayPal but
    never returns to the thank-you page to trigger the capture.
    """
    from wefund.models import WebsiteOrder
    from api.website_views import process_paid_website_order

    client_id = getattr(settings, 'PAYPAL_CLIENT_ID', '')
    secret_key = getattr(settings, 'PAYPAL_SECRET_KEY', '')
    api_url = getattr(settings, 'PAYPAL_API_URL', 'https://api-m.paypal.com')

    if not client_id or not secret_key:
        logger.warning("PayPal credentials not configured, skipping capture sweep")
        return

    # Find PayPal orders awaiting payment that are at least 5 minutes old
    # (give the normal thank-you page flow time to complete first)
    cutoff = timezone.now() - timezone.timedelta(minutes=5)
    pending_orders = WebsiteOrder.objects.filter(
        payment_method='paypal',
        status='awaiting_payment',
        payment_id__isnull=False,
        created_at__lte=cutoff,
    ).exclude(payment_id='')

    if not pending_orders.exists():
        return

    logger.info(f"PayPal capture sweep: found {pending_orders.count()} pending orders")

    # Get OAuth2 token once for all orders
    try:
        token_response = requests.post(
            f"{api_url}/v1/oauth2/token",
            data={'grant_type': 'client_credentials'},
            auth=(client_id, secret_key),
            headers={'Accept': 'application/json'},
            timeout=30,
        )
        if not token_response.ok:
            logger.error(f"PayPal capture sweep: token error {token_response.status_code}")
            return
        access_token = token_response.json().get('access_token')
    except requests.RequestException as e:
        logger.error(f"PayPal capture sweep: token request failed: {e}")
        return

    captured = 0
    skipped = 0
    failed = 0

    for order in pending_orders:
        try:
            # Check order status on PayPal
            check_response = requests.get(
                f"{api_url}/v2/checkout/orders/{order.payment_id}",
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=30,
            )

            if not check_response.ok:
                logger.warning(f"PayPal capture sweep: couldn't check order {order.id}: {check_response.status_code}")
                skipped += 1
                continue

            paypal_status = check_response.json().get('status', '').upper()

            if paypal_status != 'APPROVED':
                # Not approved (CREATED, VOIDED, COMPLETED, etc.) — skip
                if paypal_status in ('VOIDED', 'EXPIRED'):
                    order.status = 'failed'
                    order.save(update_fields=['status', 'updated_at'])
                    logger.info(f"PayPal capture sweep: order {order.id} marked failed (PayPal status: {paypal_status})")
                skipped += 1
                continue

            # Capture the payment
            with transaction.atomic():
                order = WebsiteOrder.objects.select_for_update().get(id=order.id)

                # Re-check status after lock
                if order.status in ('paid', 'processing', 'completed'):
                    skipped += 1
                    continue

                capture_response = requests.post(
                    f"{api_url}/v2/checkout/orders/{order.payment_id}/capture",
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {access_token}',
                    },
                    timeout=30,
                )

                if not capture_response.ok:
                    logger.error(f"PayPal capture sweep: capture failed for order {order.id}: {capture_response.status_code} {capture_response.text}")
                    failed += 1
                    continue

                capture_data = capture_response.json()
                capture_status = capture_data.get('status', '').upper()

                if capture_status == 'COMPLETED':
                    try:
                        capture_unit = capture_data['purchase_units'][0]['payments']['captures'][0]
                        captured_amount = Decimal(capture_unit['amount']['value']).quantize(Decimal('0.01'))
                        captured_currency = capture_unit['amount']['currency_code'].upper()
                    except (KeyError, IndexError, InvalidOperation) as e:
                        logger.error(f"PayPal capture sweep: couldn't extract amount for order {order.id}: {e}")
                        failed += 1
                        continue

                    expected_amount = order.total.quantize(Decimal('0.01'))
                    if captured_amount != expected_amount:
                        logger.error(
                            f"PayPal capture sweep: amount mismatch for order {order.id}: "
                            f"expected {expected_amount}, got {captured_amount}"
                        )
                        failed += 1
                        continue

                    previous_status = order.status
                    order.webhook_payload = capture_data
                    order.status = 'paid'
                    order.paid_at = timezone.now()
                    order.save(update_fields=['status', 'paid_at', 'webhook_payload', 'updated_at'])
                    logger.info(f"PayPal capture sweep: order {order.id} captured successfully ({captured_amount} {captured_currency})")

                    if previous_status not in ('paid', 'processing', 'completed'):
                        try:
                            process_paid_website_order(order)
                        except Exception as e:
                            logger.exception(f"PayPal capture sweep: post-purchase failed for order {order.id}: {e}")

                    captured += 1
                else:
                    order.webhook_payload = capture_data
                    order.save(update_fields=['webhook_payload', 'updated_at'])
                    logger.warning(f"PayPal capture sweep: order {order.id} capture status={capture_status}")
                    failed += 1

        except Exception as e:
            logger.exception(f"PayPal capture sweep: error processing order {order.id}: {e}")
            failed += 1

    logger.info(f"PayPal capture sweep complete: captured={captured}, skipped={skipped}, failed={failed}")


@shared_task
def check_confirmo_payments():
    """
    Periodically checks for Confirmo (crypto) orders stuck in 'awaiting_payment'
    and marks them as paid if Confirmo reports them as paid/confirmed.

    This handles the case where the Confirmo webhook failed to deliver.
    """
    from wefund.models import WebsiteOrder
    from api.website_views import process_paid_website_order

    api_key = getattr(settings, 'CONFIRMO_API_KEY', '')
    api_url = getattr(settings, 'CONFIRMO_API_URL', 'https://confirmo.net/api/v3/invoices')

    if not api_key:
        logger.warning("Confirmo API key not configured, skipping payment check")
        return

    cutoff = timezone.now() - timezone.timedelta(minutes=10)
    pending_orders = WebsiteOrder.objects.filter(
        payment_method='crypto',
        status='awaiting_payment',
        payment_id__isnull=False,
        created_at__lte=cutoff,
    ).exclude(payment_id='')

    if not pending_orders.exists():
        return

    logger.info(f"Confirmo sweep: found {pending_orders.count()} pending orders")

    recovered = 0
    expired = 0
    skipped = 0

    for order in pending_orders:
        try:
            response = requests.get(
                f"{api_url}/{order.payment_id}",
                headers={'Authorization': f'Bearer {api_key}'},
                timeout=15,
            )

            if not response.ok:
                logger.warning(f"Confirmo sweep: couldn't check order {order.id}: {response.status_code}")
                skipped += 1
                continue

            data = response.json()
            confirmo_status = (data.get('status') or '').lower()

            if confirmo_status in ('paid', 'confirmed'):
                with transaction.atomic():
                    order = WebsiteOrder.objects.select_for_update().get(id=order.id)
                    if order.status in ('paid', 'processing', 'completed'):
                        skipped += 1
                        continue

                    previous_status = order.status
                    order.webhook_payload = data
                    order.status = 'paid'
                    order.paid_at = timezone.now()
                    order.save(update_fields=['status', 'paid_at', 'webhook_payload', 'updated_at'])
                    logger.info(f"Confirmo sweep: order {order.id} recovered (confirmo status: {confirmo_status})")

                    if previous_status not in ('paid', 'processing', 'completed'):
                        try:
                            process_paid_website_order(order)
                        except Exception as e:
                            logger.exception(f"Confirmo sweep: post-purchase failed for order {order.id}: {e}")

                    recovered += 1

            elif confirmo_status in ('expired', 'error'):
                order.status = 'failed'
                order.save(update_fields=['status', 'updated_at'])
                logger.info(f"Confirmo sweep: order {order.id} marked failed (confirmo status: {confirmo_status})")
                expired += 1

            else:
                skipped += 1

        except Exception as e:
            logger.exception(f"Confirmo sweep: error processing order {order.id}: {e}")
            skipped += 1

    logger.info(f"Confirmo sweep complete: recovered={recovered}, expired={expired}, skipped={skipped}")


@shared_task
def expire_stale_card_orders():
    """
    Marks card (Paytiko) orders as failed if they've been stuck in
    'awaiting_payment' for over 2 hours.

    Paytiko has no status-check API, so we can only rely on webhooks.
    If a webhook never arrived after 2 hours, the customer almost certainly
    abandoned checkout.
    """
    from wefund.models import WebsiteOrder

    cutoff = timezone.now() - timezone.timedelta(hours=2)
    stale_orders = WebsiteOrder.objects.filter(
        payment_method='card',
        status='awaiting_payment',
        created_at__lte=cutoff,
    )

    count = stale_orders.count()
    if not count:
        return

    stale_orders.update(status='failed')
    logger.info(f"Card expiry sweep: marked {count} stale card orders as failed")


@shared_task
def retry_stuck_paid_orders():
    """
    Retries processing for orders stuck in 'paid' status without a linked Order record.

    This catches orders where the Paytiko/Confirmo/PayPal webhook successfully marked the
    order as 'paid' but the post-purchase processing (process_paid_website_order) failed.
    Only retries orders that are at least 15 minutes old to avoid interfering with
    in-progress processing.
    """
    from wefund.models import WebsiteOrder
    from api.website_views import process_paid_website_order

    cutoff = timezone.now() - timezone.timedelta(minutes=15)
    stuck_orders = WebsiteOrder.objects.filter(
        status='paid',
        order__isnull=True,
        paid_at__lte=cutoff,
    ).order_by('paid_at')[:20]

    if not stuck_orders:
        return

    recovered = 0
    failed = 0
    for order in stuck_orders:
        try:
            process_paid_website_order(order)
            recovered += 1
            logger.info(f"Stuck order retry: successfully processed {order.id} ({order.customer_email})")
        except Exception as e:
            failed += 1
            logger.exception(f"Stuck order retry: failed for {order.id} ({order.customer_email}): {e}")

    logger.info(f"Stuck order retry sweep: recovered={recovered}, failed={failed}")
