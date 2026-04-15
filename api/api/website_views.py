"""
Website API Views.

Public-facing API endpoints for the marketing website:
- Product catalog
- Discount code validation
- Order creation
- Payment session creation (Paytiko/Confirmo/PayPal)
- Payment webhooks
- Order status
- Admin CRUD for CRM (with full filtering, pagination, export)
"""

import csv
import json
import logging
import uuid
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, F, Sum, Q
from django.http import StreamingHttpResponse
from django.utils import timezone

import django_filters
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from api.permissions import HasPermission
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend


class PayPalCaptureThrottle(AnonRateThrottle):
    rate = '10/min'


class PayPalWebhookThrottle(AnonRateThrottle):
    rate = '30/min'

from wefund.models import (
    WebsiteProduct,
    WebsiteProductVariant,
    WebsiteProductAddon,
    DiscountCode,
    WebsiteOrder,
    Order,
    ClientProfile,
    ChallengeEnrollment,
    Challenge,
    ChallengePhase,
    ChallengePhaseGroupMapping,
    PayoutConfiguration,
    AffiliateProfile,
    AffiliateReferral,
    WeCoinWallet,
)
from .website_serializers import (
    WebsiteProductCatalogSerializer,
    WebsiteProductAdminSerializer,
    WebsiteProductVariantSerializer,
    WebsiteProductVariantAdminSerializer,
    WebsiteProductAddonSerializer,
    WebsiteProductAddonAdminSerializer,
    DiscountCodeSerializer,
    DiscountCodeAdminSerializer,
    WebsiteOrderCreateSerializer,
    WebsiteOrderStatusSerializer,
    WebsiteOrderAdminSerializer,
    WebsiteOrderStatusUpdateSerializer,
)
from .services.mt5_client import MT5Client
from .services.email_service import EmailService
from .utils.security import generate_mt5_compliant_password

try:
    from .services.klaviyo_service import KlaviyoService
except ImportError:
    KlaviyoService = None

logger = logging.getLogger(__name__)
User = get_user_model()


# ==========================================
# Public Endpoints
# ==========================================

class WebsiteProductCatalogView(APIView):
    """
    GET /api/website/products/
    Returns active products with nested variants and addons, grouped by challenge_type.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        products = WebsiteProduct.objects.filter(is_active=True).prefetch_related(
            'variants', 'addons'
        )
        serializer = WebsiteProductCatalogSerializer(products, many=True)

        # Group by challenge_type
        grouped = {}
        for product_data in serializer.data:
            ct = product_data['challenge_type']
            if ct not in grouped:
                grouped[ct] = []
            grouped[ct].append(product_data)

        return Response({
            'products': serializer.data,
            'grouped': grouped,
        })


class ValidateDiscountView(APIView):
    """
    POST /api/website/validate-discount/
    Validates a discount code and returns the discount amount.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get('code', '').strip().upper()
        product_id = request.data.get('product_id')
        order_total = request.data.get('order_total', 0)

        if not code:
            return Response({'valid': False, 'error': 'Discount code is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order_total = Decimal(str(order_total))
        except (InvalidOperation, ValueError):
            return Response({'valid': False, 'error': 'Invalid order total'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            discount = DiscountCode.objects.get(code__iexact=code)
        except DiscountCode.DoesNotExist:
            return Response({'valid': False, 'error': 'Invalid discount code'})

        # Check active
        if not discount.is_active:
            return Response({'valid': False, 'error': 'This discount code is no longer active'})

        # Check date range
        now = timezone.now()
        if discount.valid_from and now < discount.valid_from:
            return Response({'valid': False, 'error': 'This discount code is not yet valid'})
        if discount.valid_until and now > discount.valid_until:
            return Response({'valid': False, 'error': 'This discount code has expired'})

        # Check max uses
        if discount.max_uses is not None and discount.current_uses >= discount.max_uses:
            return Response({'valid': False, 'error': 'This discount code has reached its usage limit'})

        # Check per-user usage limit
        customer_email = request.data.get('customer_email', '').strip().lower()
        if discount.usage_limit_per_user and customer_email:
            user_uses = WebsiteOrder.objects.filter(
                discount_code=discount,
                customer_email__iexact=customer_email,
                status__in=['paid', 'completed'],
            ).exclude(
                # Exclude PAP initial orders where discount was saved but not applied
                discount_amount=0,
            ).count()
            if user_uses >= discount.usage_limit_per_user:
                return Response({'valid': False, 'error': 'You have already used this discount code'})

        # Check min order amount
        if order_total < discount.min_order_amount:
            return Response({
                'valid': False,
                'error': f'Minimum order amount of ${discount.min_order_amount} required'
            })

        # Check product applicability
        if product_id and discount.applicable_products.exists():
            if not discount.applicable_products.filter(id=product_id).exists():
                return Response({'valid': False, 'error': 'This discount code does not apply to this product'})

        # Calculate discount amount
        if discount.discount_type == 'percentage':
            discount_amount = (order_total * discount.discount_value / 100).quantize(Decimal('0.01'))
        elif discount.discount_type == 'buy_one_get_one':
            # BOGO: apply additional percentage discount if set
            if discount.discount_value > 0:
                discount_amount = (order_total * discount.discount_value / 100).quantize(Decimal('0.01'))
            else:
                discount_amount = Decimal('0')
        else:
            discount_amount = min(discount.discount_value, order_total)

        response_data = {
            'valid': True,
            'discount_type': discount.discount_type,
            'discount_value': str(discount.discount_value),
            'discount_amount': str(discount_amount),
            'code': discount.code,
        }
        if discount.discount_type == 'buy_one_get_one':
            response_data['bogo_challenge_types'] = discount.bogo_challenge_types or []

        return Response(response_data)


class PAPCheckoutDetailsView(APIView):
    """
    GET /api/website/pap-checkout/<enrollment_id>/
    Returns pre-filled checkout data for a PAP completion order.
    Public endpoint — the UUID is unguessable and acts as the auth token.
    """
    permission_classes = [AllowAny]

    def get(self, request, enrollment_id):
        try:
            enrollment = ChallengeEnrollment.objects.select_related(
                'client__user', 'challenge'
            ).get(
                id=enrollment_id,
                status='awaiting_payment',
                payment_type='pay_after_pass',
            )
        except ChallengeEnrollment.DoesNotExist:
            return Response({'error': 'Enrollment not found'}, status=status.HTTP_404_NOT_FOUND)

        user = enrollment.client.user
        address_info = enrollment.client.address_info or {}

        # Use the email that order creation validates against
        email = user.email or user.username

        # Find the matching PAP product variant
        variant_data = None
        product = enrollment.challenge.website_products.filter(
            is_pay_after_pass=True, is_active=True
        ).first()
        if product:
            variant = product.variants.filter(
                account_size=int(enrollment.account_size),
                is_active=True,
            ).first()
            if variant:
                variant_data = {
                    'id': variant.id,
                    'account_size': variant.account_size,
                    'price': str(variant.price),
                    'currency': variant.currency,
                }

        # Carry over discount/referral from initial order
        discount_code = None
        referral_code = None
        try:
            initial_order = WebsiteOrder.objects.filter(
                variant__product__challenge=enrollment.challenge,
                customer_email__iexact=email,
                pap_enrollment__isnull=True,
                status__in=['completed', 'processing', 'paid'],
            ).order_by('-created_at').first()
            if initial_order:
                if initial_order.discount_code:
                    discount_code = initial_order.discount_code.code
                referral_code = initial_order.referral_code
        except Exception:
            pass

        return Response({
            'enrollment_id': str(enrollment.id),
            'email': email,
            'first_name': user.first_name or address_info.get('first_name', ''),
            'last_name': user.last_name or address_info.get('last_name', ''),
            'phone': address_info.get('phone', ''),
            'country': address_info.get('country', ''),
            'address': {
                'address_line_1': address_info.get('address_line_1', ''),
                'address_line_2': address_info.get('address_line_2', ''),
                'city': address_info.get('city', ''),
                'state': address_info.get('state', ''),
                'postcode': address_info.get('postcode', ''),
            },
            'challenge_type': f"{int(enrollment.account_size):,} – {enrollment.challenge.name}",
            'variant': variant_data,
            'discount_code': discount_code,
            'referral_code': referral_code,
        })


class WebsiteOrderCreateView(APIView):
    """
    POST /api/website/orders/create/
    Creates a website order with customer info, product variant, addons, and discount.
    Does NOT create MT5 account - that happens after payment confirmation.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = WebsiteOrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'error': 'Invalid order data', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        variant_id = data['variant_id']
        addon_ids = data.get('addon_ids', [])
        discount_code = data.get('discount_code', '').strip()

        # Get variant
        try:
            variant = WebsiteProductVariant.objects.select_related('product').get(id=variant_id, is_active=True)
        except WebsiteProductVariant.DoesNotExist:
            return Response({'error': 'Product variant not found or inactive'}, status=status.HTTP_400_BAD_REQUEST)

        product = variant.product
        is_pap = product.is_pay_after_pass
        enrollment_id = data.get('enrollment_id')
        pap_enrollment = None

        # PAP completion: validate the enrollment exists and is awaiting payment
        if enrollment_id:
            try:
                pap_enrollment = ChallengeEnrollment.objects.get(
                    id=enrollment_id,
                    status='awaiting_payment',
                    payment_type='pay_after_pass',
                )
            except ChallengeEnrollment.DoesNotExist:
                return Response({'error': 'Enrollment not found or not awaiting payment'}, status=status.HTTP_400_BAD_REQUEST)

            # Verify enrollment belongs to the user submitting the checkout
            enrollment_email = pap_enrollment.client.user.email or pap_enrollment.client.user.username
            if enrollment_email.lower() != data['email'].lower():
                logger.warning(f"PAP completion email mismatch: submitted={data['email']}, enrollment={enrollment_email}")
                return Response({'error': 'Enrollment not found or not awaiting payment'}, status=status.HTTP_400_BAD_REQUEST)

            # Validate the variant matches the enrollment's challenge and account size
            if pap_enrollment.challenge_id and product.challenge_id:
                if pap_enrollment.challenge_id != product.challenge_id:
                    return Response({'error': 'Product does not match the enrollment challenge'}, status=status.HTTP_400_BAD_REQUEST)
            if int(pap_enrollment.account_size) != variant.account_size:
                return Response({'error': 'Account size does not match the enrollment'}, status=status.HTTP_400_BAD_REQUEST)

            # Prevent duplicate PAP completion orders
            existing_pap_order = WebsiteOrder.objects.filter(
                pap_enrollment=pap_enrollment,
                status__in=['pending', 'awaiting_payment', 'paid', 'processing', 'completed'],
            ).exists()
            if existing_pap_order:
                return Response({'error': 'A payment for this enrollment is already in progress'}, status=status.HTTP_409_CONFLICT)

        # Calculate pricing
        # PAP initial purchase: use entry_fee; PAP completion: use full price
        if is_pap and not enrollment_id:
            # Initial PAP purchase — charge entry fee
            if not variant.entry_fee:
                return Response({'error': 'Entry fee not configured for this Pay After Pass product'}, status=status.HTTP_400_BAD_REQUEST)
            subtotal = variant.entry_fee
        else:
            # Standard purchase or PAP completion — charge full price
            subtotal = variant.price

        addon_total = Decimal('0')
        addons = []
        if pap_enrollment:
            # PAP completion: carry add-ons from the initial order and charge full price now
            initial_order = WebsiteOrder.objects.filter(
                variant__product=product,
                customer_email__iexact=data['email'],
                pap_enrollment__isnull=True,
                status__in=['completed', 'processing', 'paid'],
            ).prefetch_related('addons').order_by('-created_at').first()
            if initial_order:
                addons = list(initial_order.addons.all())
                for a in addons:
                    if a.price_type == 'fixed':
                        addon_total += a.price_value
                    elif a.price_type == 'percentage':
                        addon_total += (subtotal * a.price_value / Decimal('100')).quantize(Decimal('0.01'))
        elif addon_ids:
            addons = list(WebsiteProductAddon.objects.filter(id__in=addon_ids, is_active=True))
            if is_pap:
                # PAP initial: flat fee per add-on (full price charged on completion)
                addon_total = product.pap_addon_flat_fee * len(addons)
            else:
                for a in addons:
                    if a.price_type == 'fixed':
                        addon_total += a.price_value
                    elif a.price_type == 'percentage':
                        addon_total += (subtotal * a.price_value / Decimal('100')).quantize(Decimal('0.01'))

        order_total = subtotal + addon_total
        discount_amount = Decimal('0')
        discount_obj = None

        if discount_code:
            try:
                discount_obj = DiscountCode.objects.get(code__iexact=discount_code, is_active=True)
                now = timezone.now()
                skip_discount = False

                # Validate date range
                if discount_obj.valid_from and now < discount_obj.valid_from:
                    skip_discount = True
                if discount_obj.valid_until and now > discount_obj.valid_until:
                    skip_discount = True

                # Validate max uses
                if discount_obj.max_uses is not None and discount_obj.current_uses >= discount_obj.max_uses:
                    skip_discount = True

                # Validate per-user usage limit
                if discount_obj.usage_limit_per_user and data['email']:
                    user_uses = WebsiteOrder.objects.filter(
                        discount_code=discount_obj,
                        customer_email__iexact=data['email'],
                        status__in=['paid', 'completed'],
                    ).exclude(discount_amount=0).count()
                    if user_uses >= discount_obj.usage_limit_per_user:
                        skip_discount = True

                # Validate min order amount
                if order_total < discount_obj.min_order_amount:
                    skip_discount = True

                # Validate product applicability
                if discount_obj.applicable_products.exists():
                    if not discount_obj.applicable_products.filter(id=product.id).exists():
                        skip_discount = True

                if skip_discount:
                    discount_obj = None  # Don't save invalid code on the order
                else:
                    if discount_obj.discount_type == 'percentage':
                        discount_amount = (order_total * discount_obj.discount_value / 100).quantize(Decimal('0.01'))
                    elif discount_obj.discount_type == 'buy_one_get_one':
                        # BOGO: apply additional percentage discount if set
                        if discount_obj.discount_value > 0:
                            discount_amount = (order_total * discount_obj.discount_value / 100).quantize(Decimal('0.01'))
                    else:
                        discount_amount = min(discount_obj.discount_value, order_total)
            except DiscountCode.DoesNotExist:
                pass  # Invalid code, just skip discount

        total = max(order_total - discount_amount, Decimal('0'))

        # Create WebsiteOrder
        website_order = WebsiteOrder.objects.create(
            customer_email=data['email'],
            customer_first_name=data['first_name'],
            customer_last_name=data['last_name'],
            customer_country=data['country'],
            customer_phone=data.get('phone', ''),
            customer_address=data.get('address', {}),
            customer_ip=request.META.get('REMOTE_ADDR'),
            variant=variant,
            subtotal=subtotal,
            addon_total=addon_total,
            discount_amount=discount_amount,
            total=total,
            discount_code=discount_obj,
            payment_method=data.get('payment_method', ''),
            referral_code=data.get('referral_code', ''),
            pap_enrollment=pap_enrollment,
        )
        if addons:
            website_order.addons.set(addons)

        logger.info(f"Website order created: {website_order.id} for {data['email']} - ${total}" + (" (PAP completion)" if pap_enrollment else " (PAP initial)" if is_pap else ""))

        return Response({
            'order_id': str(website_order.id),
            'order_number': website_order.order_number,
            'total': str(total),
            'currency': 'USD',
            'is_pap_completion': bool(pap_enrollment),
        }, status=status.HTTP_201_CREATED)


class CreatePaymentView(APIView):
    """
    POST /api/website/payments/create/
    Creates a payment session with Paytiko (card) or Confirmo (crypto).
    Returns a payment URL for the frontend to redirect to.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        order_id = request.data.get('order_id')
        payment_method = request.data.get('payment_method', 'card')

        if not order_id:
            return Response({'error': 'order_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            website_order = WebsiteOrder.objects.select_related('variant__product').get(id=order_id)
        except (WebsiteOrder.DoesNotExist, ValueError):
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        if website_order.status not in ('pending', 'awaiting_payment'):
            return Response({'error': f'Order is already {website_order.status}'}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent creating duplicate payment sessions for the same order
        if website_order.payment_id and website_order.status == 'awaiting_payment':
            return Response(
                {'error': 'Payment session already exists for this order'},
                status=status.HTTP_409_CONFLICT,
            )

        website_order.payment_method = payment_method
        website_order.status = 'awaiting_payment'

        try:
            if payment_method == 'crypto':
                result = self._create_confirmo_payment(website_order)
            elif payment_method == 'paypal':
                result = self._create_paypal_payment(website_order)
            else:
                result = self._create_paytiko_payment(website_order)
        except Exception as e:
            logger.exception(f"Payment creation failed for order {order_id}")
            return Response({'error': 'Payment gateway error'}, status=status.HTTP_502_BAD_GATEWAY)

        website_order.payment_id = result.get('payment_id', '')
        website_order.payment_url = result.get('payment_url', '')
        website_order.save(update_fields=['payment_method', 'status', 'payment_id', 'payment_url', 'updated_at'])

        response_data = {
            'payment_url': result.get('payment_url', ''),
            'payment_id': result.get('payment_id', ''),
        }
        # Include session_token and cashier_url for Paytiko payments
        if result.get('session_token'):
            response_data['session_token'] = result['session_token']
            response_data['order_id'] = result.get('order_id', str(website_order.id))
            response_data['cashier_url'] = result.get('cashier_url', 'https://cashier.paytiko.com')

        return Response(response_data)

    def _create_paytiko_payment(self, order):
        import hashlib
        import time

        secret_key = getattr(settings, 'PAYTIKO_API_KEY', '')
        core_url = getattr(settings, 'PAYTIKO_API_URL', 'https://core.paytiko.com')

        if not secret_key:
            raise ValueError("Paytiko API key not configured")

        timestamp = str(int(time.time()))
        email = order.customer_email
        signature = hashlib.sha256(f"{email};{timestamp};{secret_key}".encode()).hexdigest()

        webhook_url = f"{settings.API_BASE_URL.removesuffix('/api')}/website/webhooks/paytiko/"

        payload = {
            'firstName': order.customer_first_name,
            'lastName': order.customer_last_name or order.customer_first_name,
            'email': email,
            'currency': order.currency,
            'countryCode': order.customer_country or 'FI',
            'orderId': str(order.id),
            'phone': order.customer_phone or '+000000000',
            'signature': signature,
            'timestamp': timestamp,
            'lockedAmount': float(order.total),
            'cashierDescription': f"WeFund Order #{order.order_number}",
            'callbackUrl': webhook_url,
            'notifyUrl': webhook_url,
            'webhookUrl': webhook_url,
        }

        # Add address fields if available
        if hasattr(order, 'customer_address') and order.customer_address:
            addr = order.customer_address if isinstance(order.customer_address, dict) else {}
            if addr.get('city'):
                payload['city'] = addr['city']
            if addr.get('address_line_1'):
                payload['street'] = addr['address_line_1']

        api_url = f"{core_url.rstrip('/')}/api/sdk/checkout"
        response = requests.post(
            api_url,
            json=payload,
            headers={
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': '*/*',
                'X-Merchant-Secret': secret_key,
                'User-Agent': 'SDK API',
            },
            timeout=30,
        )

        if not response.ok:
            logger.error(f"Paytiko API error: {response.status_code} {response.text}")
            raise ValueError(f"Paytiko API returned {response.status_code}: {response.text[:200]}")

        data = response.json()
        session_token = data.get('cashierSessionToken', '')
        if not session_token:
            raise ValueError(f"Paytiko did not return a session token: {data}")

        cashier_url = core_url.replace('core.paytiko.com', 'cashier.paytiko.com').rstrip('/')

        return {
            'payment_id': session_token,
            'session_token': session_token,
            'order_id': str(order.id),
            'payment_url': '',
            'cashier_url': cashier_url,
        }

    def _create_confirmo_payment(self, order):
        api_key = getattr(settings, 'CONFIRMO_API_KEY', '')
        api_url = getattr(settings, 'CONFIRMO_API_URL', 'https://confirmo.net/api/v3/invoices')

        if not api_key:
            raise ValueError("Confirmo API key not configured")

        website_base = getattr(settings, 'WEBSITE_URL', 'https://we-fund.com')
        callback_password = getattr(settings, 'CONFIRMO_CALLBACK_PASSWORD', '')

        payload = {
            'settlement': {'currency': 'USD'},
            'product': {
                'name': f"WeFund Order #{order.order_number}",
                'description': f"Challenge account purchase",
            },
            'invoice': {
                'currencyFrom': order.currency,
                'amount': float(order.total),
            },
            'returnUrl': f"{website_base}/thank-you?order_id={order.id}",
            'notifyUrl': f"{settings.API_BASE_URL.removesuffix('/api')}/website/webhooks/confirmo/",
            'reference': str(order.id),
        }

        if callback_password:
            payload['callbackPassword'] = callback_password

        response = requests.post(
            api_url,
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
            },
            timeout=30,
        )

        if not response.ok:
            logger.error(f"Confirmo API error: {response.status_code} {response.text}")
            raise ValueError(f"Confirmo API returned {response.status_code}")

        data = response.json()
        return {
            'payment_id': data.get('id', ''),
            'payment_url': data.get('url', ''),
        }

    def _create_paypal_payment(self, order):
        client_id = getattr(settings, 'PAYPAL_CLIENT_ID', '')
        secret_key = getattr(settings, 'PAYPAL_SECRET_KEY', '')
        api_url = getattr(settings, 'PAYPAL_API_URL', 'https://api-m.paypal.com')

        if not client_id or not secret_key:
            raise ValueError("PayPal credentials not configured")

        # Step 1: Get OAuth2 access token
        token_response = requests.post(
            f"{api_url}/v1/oauth2/token",
            data={'grant_type': 'client_credentials'},
            auth=(client_id, secret_key),
            headers={'Accept': 'application/json'},
            timeout=30,
        )
        if not token_response.ok:
            logger.error(f"PayPal token error: {token_response.status_code} {token_response.text}")
            raise ValueError(f"PayPal OAuth2 token request failed: {token_response.status_code}")

        access_token = token_response.json().get('access_token')

        # Step 2: Create order
        website_base = getattr(settings, 'WEBSITE_URL', 'https://we-fund.com')
        payload = {
            'intent': 'CAPTURE',
            'purchase_units': [{
                'reference_id': str(order.id),
                'amount': {
                    'currency_code': order.currency,
                    'value': str(order.total.quantize(Decimal('0.01'))),
                },
                'description': f"WeFund Order #{order.order_number}",
            }],
            'payment_source': {
                'paypal': {
                    'experience_context': {
                        'return_url': f"{website_base}/thank-you?order_id={order.id}",
                        'cancel_url': f"{website_base}/checkout?cancelled=true",
                    }
                }
            },
        }

        response = requests.post(
            f"{api_url}/v2/checkout/orders",
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {access_token}',
            },
            timeout=30,
        )

        if not response.ok:
            logger.error(f"PayPal create order error: {response.status_code} {response.text}")
            raise ValueError(f"PayPal API returned {response.status_code}")

        data = response.json()
        paypal_order_id = data.get('id', '')

        # Find approval URL from HATEOAS links
        approval_url = ''
        for link in data.get('links', []):
            if link.get('rel') == 'payer-action':
                approval_url = link['href']
                break

        if not approval_url:
            raise ValueError(f"PayPal did not return an approval URL: {data}")

        return {
            'payment_id': paypal_order_id,
            'payment_url': approval_url,
        }


class PaytikoWebhookView(APIView):
    """
    POST /api/website/webhooks/paytiko/
    Receives payment status updates from Paytiko.
    Paytiko sends: Action, TransactionStatus, OrderId, Signature (SHA256(secret:orderId)).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        import hashlib

        payload = request.data
        logger.info(f"Paytiko webhook received: {json.dumps(payload, default=str)}")

        # Extract order ID (support both Paytiko SDK format and generic)
        order_id = payload.get('OrderId') or payload.get('orderId')
        payment_id = payload.get('paymentId')

        if not order_id and not payment_id:
            return Response({'error': 'Missing order identifier'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify signature: SHA256(secret:orderId)
        secret_key = getattr(settings, 'PAYTIKO_API_KEY', '')
        received_sig = payload.get('Signature') or payload.get('signature')
        if secret_key and received_sig and order_id:
            expected_sig = hashlib.sha256(f"{secret_key}:{order_id}".encode()).hexdigest()
            if received_sig.lower() != expected_sig.lower():
                logger.warning(f"Paytiko webhook: signature mismatch for order {order_id}")
                return Response({'error': 'Invalid signature'}, status=status.HTTP_403_FORBIDDEN)

        # Find order
        try:
            if order_id:
                website_order = WebsiteOrder.objects.get(id=order_id)
            else:
                website_order = WebsiteOrder.objects.get(payment_id=payment_id)
        except (WebsiteOrder.DoesNotExist, ValueError):
            logger.error(f"Paytiko webhook: order not found (orderId={order_id}, paymentId={payment_id})")
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        # Map Paytiko TransactionStatus / event to internal status
        tx_status = (
            payload.get('TransactionStatus') or payload.get('event')
            or payload.get('status') or ''
        ).lower()
        status_map = {
            'approved': 'paid', 'completed': 'paid', 'success': 'paid', 'paid': 'paid',
            'payment.completed': 'paid', 'payment.success': 'paid',
            'declined': 'failed', 'failed': 'failed', 'error': 'failed', 'rejected': 'failed',
            'payment.failed': 'failed', 'payment.declined': 'failed',
            'cancelled': 'cancelled', 'voided': 'cancelled',
            'payment.cancelled': 'cancelled',
            'refunded': 'refunded', 'chargeback': 'refunded',
            'payment.refunded': 'refunded',
        }
        new_status = status_map.get(tx_status, website_order.status)

        # Store webhook payload
        previous_status = website_order.status
        website_order.webhook_payload = payload
        website_order.status = new_status
        update_fields = ['webhook_payload', 'status', 'updated_at']

        if new_status == 'paid' and not website_order.paid_at:
            website_order.paid_at = timezone.now()
            update_fields.append('paid_at')

        website_order.save(update_fields=update_fields)
        logger.info(f"Paytiko webhook: order {website_order.id} updated to {new_status} (was {previous_status})")

        # Trigger post-purchase flow only if newly paid (idempotency guard)
        if new_status == 'paid' and previous_status not in ('paid', 'processing', 'completed'):
            self._process_paid_order(website_order)
        elif new_status == 'paid':
            logger.info(f"Paytiko webhook: order {website_order.id} already in '{previous_status}' state, skipping duplicate processing")

        return Response({'success': True, 'status': new_status})

    def _process_paid_order(self, website_order):
        try:
            process_paid_website_order(website_order)
        except Exception as e:
            logger.exception(f"Post-purchase processing failed for order {website_order.id}: {e}")


class ConfirmoWebhookView(APIView):
    """
    POST /api/website/webhooks/confirmo/
    Receives payment status updates from Confirmo.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data
        logger.info(f"Confirmo webhook received: {json.dumps(payload, default=str)}")

        # Verify callback password if configured (check header and body)
        callback_password = getattr(settings, 'CONFIRMO_CALLBACK_PASSWORD', '')
        if callback_password:
            received_password = (
                request.headers.get('X-Callback-Password', '')
                or payload.get('callbackPassword', '')
            )
            if received_password != callback_password:
                logger.warning("Confirmo webhook: invalid callback password")
                return Response({'error': 'Invalid callback password'}, status=status.HTTP_403_FORBIDDEN)

        # Extract order reference
        order_id = payload.get('reference') or payload.get('orderId')
        if not order_id:
            return Response({'error': 'Missing order reference'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            website_order = WebsiteOrder.objects.get(id=order_id)
        except (WebsiteOrder.DoesNotExist, ValueError):
            logger.error(f"Confirmo webhook: order not found (reference={order_id})")
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        # Map Confirmo status
        confirmo_status = (payload.get('status') or '').lower()
        status_map = {
            'paid': 'paid', 'confirmed': 'paid', 'active': 'awaiting_payment',
            'expired': 'failed', 'error': 'failed',
        }
        new_status = status_map.get(confirmo_status, website_order.status)

        previous_status = website_order.status
        website_order.webhook_payload = payload
        website_order.status = new_status
        update_fields = ['webhook_payload', 'status', 'updated_at']

        if new_status == 'paid' and not website_order.paid_at:
            website_order.paid_at = timezone.now()
            update_fields.append('paid_at')

        website_order.save(update_fields=update_fields)
        logger.info(f"Confirmo webhook: order {website_order.id} updated to {new_status} (was {previous_status})")

        # Trigger post-purchase flow only if newly paid (idempotency guard)
        if new_status == 'paid' and previous_status not in ('paid', 'processing', 'completed'):
            try:
                process_paid_website_order(website_order)
            except Exception as e:
                logger.exception(f"Post-purchase processing failed for order {website_order.id}: {e}")
        elif new_status == 'paid':
            logger.info(f"Confirmo webhook: order {website_order.id} already in '{previous_status}' state, skipping duplicate processing")

        return Response({'success': True, 'status': new_status})


class PayPalCaptureView(APIView):
    """
    POST /api/website/payments/paypal/capture/
    Captures a PayPal payment after buyer approval.
    Called by the ThankYou page when the user returns from PayPal.
    """
    permission_classes = [AllowAny]
    throttle_classes = [PayPalCaptureThrottle]

    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({'error': 'order_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Lightweight pre-checks before acquiring lock
        try:
            website_order = WebsiteOrder.objects.get(id=order_id)
        except (WebsiteOrder.DoesNotExist, ValueError):
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        if website_order.payment_method != 'paypal':
            return Response({'error': 'Order is not a PayPal payment'}, status=status.HTTP_400_BAD_REQUEST)

        if website_order.status in ('paid', 'processing', 'completed'):
            return Response({'status': website_order.status, 'already_captured': True})

        # Validate configuration
        client_id = getattr(settings, 'PAYPAL_CLIENT_ID', '')
        secret_key = getattr(settings, 'PAYPAL_SECRET_KEY', '')
        api_url = getattr(settings, 'PAYPAL_API_URL', 'https://api-m.paypal.com')

        if not client_id or not secret_key:
            return Response({'error': 'PayPal not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # Get OAuth2 access token (outside lock — no DB state dependency)
            token_response = requests.post(
                f"{api_url}/v1/oauth2/token",
                data={'grant_type': 'client_credentials'},
                auth=(client_id, secret_key),
                headers={'Accept': 'application/json'},
                timeout=30,
            )
            if not token_response.ok:
                logger.error(f"PayPal token error during capture: {token_response.status_code} {token_response.text}")
                return Response({'error': 'PayPal authentication failed'}, status=status.HTTP_502_BAD_GATEWAY)

            access_token = token_response.json().get('access_token')

            # Lock row BEFORE calling PayPal capture to prevent double capture
            with transaction.atomic():
                website_order = WebsiteOrder.objects.select_for_update().get(id=order_id)

                # Re-check status after acquiring lock (concurrent request or webhook may have processed)
                if website_order.status in ('paid', 'processing', 'completed'):
                    return Response({'status': website_order.status, 'already_captured': True})

                paypal_order_id = website_order.payment_id
                if not paypal_order_id:
                    return Response({'error': 'No PayPal order ID on record'}, status=status.HTTP_400_BAD_REQUEST)

                # Capture the order (inside lock — only one request can reach PayPal)
                capture_response = requests.post(
                    f"{api_url}/v2/checkout/orders/{paypal_order_id}/capture",
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {access_token}',
                    },
                    timeout=30,
                )

                if not capture_response.ok:
                    logger.error(f"PayPal capture error: {capture_response.status_code} {capture_response.text}")
                    return Response({'error': 'PayPal capture failed'}, status=status.HTTP_502_BAD_GATEWAY)

                capture_data = capture_response.json()
                capture_status = capture_data.get('status', '').upper()

                if capture_status == 'COMPLETED':
                    # Extract and validate captured amount/currency
                    try:
                        capture_unit = capture_data['purchase_units'][0]['payments']['captures'][0]
                        captured_amount = Decimal(capture_unit['amount']['value']).quantize(Decimal('0.01'))
                        captured_currency = capture_unit['amount']['currency_code'].upper()
                    except (KeyError, IndexError, InvalidOperation) as e:
                        logger.error(f"PayPal capture: could not extract amount from response for order {order_id}: {e}")
                        return Response(
                            {'error': 'Could not verify captured amount'},
                            status=status.HTTP_502_BAD_GATEWAY,
                        )

                    expected_amount = website_order.total.quantize(Decimal('0.01'))
                    if captured_amount != expected_amount:
                        logger.error(
                            f"PayPal capture amount mismatch for order {website_order.id}: "
                            f"expected {expected_amount}, got {captured_amount}"
                        )
                        return Response(
                            {'error': 'Payment amount mismatch'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    if captured_currency != website_order.currency.upper():
                        logger.error(
                            f"PayPal capture currency mismatch for order {website_order.id}: "
                            f"expected {website_order.currency}, got {captured_currency}"
                        )
                        return Response(
                            {'error': 'Payment currency mismatch'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    previous_status = website_order.status
                    website_order.webhook_payload = capture_data
                    website_order.status = 'paid'
                    website_order.paid_at = timezone.now()
                    website_order.save(update_fields=['status', 'paid_at', 'webhook_payload', 'updated_at'])
                    logger.info(f"PayPal capture: order {website_order.id} captured successfully (amount={captured_amount} {captured_currency})")

                    if previous_status not in ('paid', 'processing', 'completed'):
                        try:
                            process_paid_website_order(website_order)
                        except Exception as e:
                            logger.exception(f"Post-purchase processing failed for order {website_order.id}: {e}")
                else:
                    website_order.webhook_payload = capture_data
                    website_order.save(update_fields=['webhook_payload', 'updated_at'])
                    logger.warning(f"PayPal capture: order {website_order.id} capture status={capture_status}")

            return Response({'status': website_order.status, 'paypal_status': capture_status})

        except requests.RequestException as e:
            logger.exception(f"PayPal capture request failed for order {order_id}: {e}")
            return Response({'error': 'PayPal request failed'}, status=status.HTTP_502_BAD_GATEWAY)


class PayPalWebhookView(APIView):
    """
    POST /api/website/webhooks/paypal/
    Backup webhook handler for PayPal payment events.
    Verifies webhook signature via PayPal's verification API.
    """
    permission_classes = [AllowAny]
    throttle_classes = [PayPalWebhookThrottle]

    def _verify_webhook_signature(self, request, payload):
        """Verify that the webhook actually came from PayPal."""
        webhook_id = getattr(settings, 'PAYPAL_WEBHOOK_ID', '')
        if not webhook_id:
            logger.warning("PayPal webhook: PAYPAL_WEBHOOK_ID not configured, rejecting webhook")
            return False

        client_id = getattr(settings, 'PAYPAL_CLIENT_ID', '')
        secret_key = getattr(settings, 'PAYPAL_SECRET_KEY', '')
        api_url = getattr(settings, 'PAYPAL_API_URL', 'https://api-m.paypal.com')

        if not client_id or not secret_key:
            logger.error("PayPal webhook: credentials not configured")
            return False

        # Extract PayPal signature headers
        transmission_id = request.headers.get('PAYPAL-TRANSMISSION-ID', '')
        transmission_time = request.headers.get('PAYPAL-TRANSMISSION-TIME', '')
        transmission_sig = request.headers.get('PAYPAL-TRANSMISSION-SIG', '')
        cert_url = request.headers.get('PAYPAL-CERT-URL', '')
        auth_algo = request.headers.get('PAYPAL-AUTH-ALGO', '')

        if not all([transmission_id, transmission_time, transmission_sig, cert_url]):
            logger.warning("PayPal webhook: missing signature headers")
            return False

        # Get OAuth2 token
        try:
            token_response = requests.post(
                f"{api_url}/v1/oauth2/token",
                data={'grant_type': 'client_credentials'},
                auth=(client_id, secret_key),
                headers={'Accept': 'application/json'},
                timeout=15,
            )
            if not token_response.ok:
                logger.error(f"PayPal webhook verification token error: {token_response.status_code}")
                return False

            access_token = token_response.json().get('access_token')

            # Call PayPal's verification endpoint
            verify_response = requests.post(
                f"{api_url}/v1/notifications/verify-webhook-signature",
                json={
                    'auth_algo': auth_algo,
                    'cert_url': cert_url,
                    'transmission_id': transmission_id,
                    'transmission_sig': transmission_sig,
                    'transmission_time': transmission_time,
                    'webhook_id': webhook_id,
                    'webhook_event': payload,
                },
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {access_token}',
                },
                timeout=15,
            )

            if not verify_response.ok:
                logger.error(f"PayPal webhook verification API error: {verify_response.status_code} {verify_response.text}")
                return False

            verification_status = verify_response.json().get('verification_status', '')
            if verification_status != 'SUCCESS':
                logger.warning(f"PayPal webhook: verification failed, status={verification_status}")
                return False

            return True

        except requests.RequestException as e:
            logger.exception(f"PayPal webhook verification request failed: {e}")
            return False

    def post(self, request):
        payload = request.data
        logger.info(f"PayPal webhook received: {json.dumps(payload, default=str)}")

        # Verify webhook signature
        if not self._verify_webhook_signature(request, payload):
            logger.warning("PayPal webhook: signature verification failed, rejecting")
            return Response({'error': 'Webhook verification failed'}, status=status.HTTP_403_FORBIDDEN)

        event_type = payload.get('event_type', '')
        resource = payload.get('resource', {})

        # Extract order identifiers depending on event type.
        # CHECKOUT.ORDER.* events: resource is the order object
        #   - resource.id = PayPal order ID (matches our payment_id)
        #   - purchase_units[0].reference_id = our Django order ID
        # PAYMENT.CAPTURE.* events: resource is the capture object
        #   - resource.id = capture ID (NOT useful for lookup)
        #   - supplementary_data.related_ids.order_id = PayPal order ID (matches our payment_id)
        our_order_id = None       # Our Django UUID (from reference_id)
        paypal_order_id = None    # PayPal's order ID (matches our payment_id field)

        is_capture_event = event_type.startswith('PAYMENT.CAPTURE.')

        if is_capture_event:
            # For capture events, extract PayPal order ID from supplementary_data
            supplementary = resource.get('supplementary_data', {})
            related = supplementary.get('related_ids', {})
            paypal_order_id = related.get('order_id')
        else:
            # For order events, resource IS the order
            purchase_units = resource.get('purchase_units', [])
            if purchase_units:
                our_order_id = purchase_units[0].get('reference_id')
            # resource.id is the PayPal order ID
            paypal_order_id = resource.get('id', '')

        if not our_order_id and not paypal_order_id:
            logger.warning(f"PayPal webhook: could not extract order reference from {event_type}")
            return Response({'error': 'Missing order reference'}, status=status.HTTP_400_BAD_REQUEST)

        # Map PayPal event types to internal status
        status_map = {
            'CHECKOUT.ORDER.COMPLETED': 'paid',
            'CHECKOUT.ORDER.APPROVED': 'awaiting_payment',
            'PAYMENT.CAPTURE.COMPLETED': 'paid',
            'PAYMENT.CAPTURE.DENIED': 'failed',
            'PAYMENT.CAPTURE.REFUNDED': 'refunded',
        }
        new_status = status_map.get(event_type, None)
        if new_status is None:
            logger.info(f"PayPal webhook: unhandled event type {event_type}, acknowledging")
            return Response({'success': True, 'ignored': True})

        # Use select_for_update to prevent race condition with capture endpoint
        with transaction.atomic():
            try:
                if our_order_id:
                    # Lookup by our Django order ID (from purchase_units reference_id)
                    website_order = WebsiteOrder.objects.select_for_update().get(id=our_order_id)
                else:
                    # Lookup by PayPal order ID stored in our payment_id field
                    website_order = WebsiteOrder.objects.select_for_update().get(payment_id=paypal_order_id)
            except (WebsiteOrder.DoesNotExist, WebsiteOrder.MultipleObjectsReturned, ValueError):
                logger.error(f"PayPal webhook: order not found or ambiguous (our_id={our_order_id}, paypal_order_id={paypal_order_id})")
                return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

            previous_status = website_order.status

            # Validate payment amount for events that mark as paid (defense-in-depth)
            if new_status == 'paid':
                try:
                    if is_capture_event:
                        # PAYMENT.CAPTURE.COMPLETED: amount is on the capture resource directly
                        webhook_amount = Decimal(resource['amount']['value']).quantize(Decimal('0.01'))
                        webhook_currency = resource['amount']['currency_code'].upper()
                    else:
                        # CHECKOUT.ORDER.COMPLETED: amount is in purchase_units
                        pu = resource['purchase_units'][0]['amount']
                        webhook_amount = Decimal(pu['value']).quantize(Decimal('0.01'))
                        webhook_currency = pu['currency_code'].upper()

                    expected_amount = website_order.total.quantize(Decimal('0.01'))
                    if webhook_amount != expected_amount:
                        logger.error(
                            f"PayPal webhook amount mismatch for order {website_order.id}: "
                            f"expected {expected_amount}, got {webhook_amount}"
                        )
                        return Response({'error': 'Amount mismatch'}, status=status.HTTP_400_BAD_REQUEST)

                    if webhook_currency != website_order.currency.upper():
                        logger.error(
                            f"PayPal webhook currency mismatch for order {website_order.id}: "
                            f"expected {website_order.currency}, got {webhook_currency}"
                        )
                        return Response({'error': 'Currency mismatch'}, status=status.HTTP_400_BAD_REQUEST)
                except (KeyError, IndexError, InvalidOperation) as e:
                    logger.error(f"PayPal webhook: could not extract amount for order {website_order.id}: {e}")
                    return Response({'error': 'Could not verify amount'}, status=status.HTTP_400_BAD_REQUEST)

            # Enforce forward-only status transitions
            # Only 'refunded' is allowed as a forward move from paid/completed
            ALLOWED_TRANSITIONS = {
                'pending': ('awaiting_payment', 'paid', 'failed', 'cancelled'),
                'awaiting_payment': ('paid', 'failed', 'cancelled'),
                'paid': ('processing', 'completed', 'refunded'),
                'processing': ('completed', 'refunded'),
                'completed': ('refunded',),
                'failed': ('awaiting_payment', 'paid'),
                'cancelled': (),
                'refunded': (),
            }
            allowed = ALLOWED_TRANSITIONS.get(previous_status, ())
            if new_status not in allowed:
                logger.warning(
                    f"PayPal webhook: refusing transition {previous_status} -> {new_status} "
                    f"for order {website_order.id} (allowed: {allowed})"
                )
                return Response({'success': True, 'ignored': True})

            website_order.webhook_payload = payload
            website_order.status = new_status
            update_fields = ['webhook_payload', 'status', 'updated_at']

            if new_status == 'paid' and not website_order.paid_at:
                website_order.paid_at = timezone.now()
                update_fields.append('paid_at')

            website_order.save(update_fields=update_fields)
            logger.info(f"PayPal webhook: order {website_order.id} updated to {new_status} (was {previous_status})")

            # Trigger post-purchase flow only if newly paid (idempotency guard)
            if new_status == 'paid' and previous_status not in ('paid', 'processing', 'completed'):
                try:
                    process_paid_website_order(website_order)
                except Exception as e:
                    logger.exception(f"Post-purchase processing failed for order {website_order.id}: {e}")
            elif new_status == 'paid':
                logger.info(f"PayPal webhook: order {website_order.id} already in '{previous_status}' state, skipping duplicate processing")

        return Response({'success': True, 'status': new_status})


class WebsiteOrderStatusView(APIView):
    """
    GET /api/website/orders/<uuid:order_id>/status/
    Returns order status for the thank-you page.
    """
    permission_classes = [AllowAny]

    def get(self, request, order_id):
        try:
            website_order = WebsiteOrder.objects.select_related('variant__product', 'discount_code').prefetch_related('addons').get(id=order_id)
        except (WebsiteOrder.DoesNotExist, ValueError):
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = WebsiteOrderStatusSerializer(website_order)
        return Response(serializer.data)


# ==========================================
# Admin Endpoints (for CRM)
# ==========================================

class WebsiteProductAdminViewSet(viewsets.ModelViewSet):
    """CRUD for website products (admin/CRM)."""
    queryset = WebsiteProduct.objects.prefetch_related('variants', 'addons').all()
    serializer_class = WebsiteProductAdminSerializer
    permission_classes = [HasPermission]
    required_permissions = ['website_products.create']

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()


class WebsiteProductVariantAdminViewSet(viewsets.ModelViewSet):
    """CRUD for website product variants (admin/CRM)."""
    queryset = WebsiteProductVariant.objects.select_related('product').all()
    serializer_class = WebsiteProductVariantAdminSerializer
    permission_classes = [HasPermission]
    required_permissions = ['website_products.create']

    def get_queryset(self):
        qs = super().get_queryset()
        product_id = self.request.query_params.get('product_id')
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs


class WebsiteProductAddonAdminViewSet(viewsets.ModelViewSet):
    """CRUD for website product addons (admin/CRM)."""
    queryset = WebsiteProductAddon.objects.prefetch_related('products').all()
    serializer_class = WebsiteProductAddonAdminSerializer
    permission_classes = [HasPermission]
    required_permissions = ['website_products.create']

    def get_queryset(self):
        qs = super().get_queryset()
        product_id = self.request.query_params.get('product_id')
        if product_id:
            qs = qs.filter(products__id=product_id)
        return qs


class DiscountCodeAdminViewSet(viewsets.ModelViewSet):
    """CRUD for discount codes (admin/CRM)."""
    queryset = DiscountCode.objects.all()
    serializer_class = DiscountCodeAdminSerializer
    permission_classes = [HasPermission]
    required_permissions = ['discount_codes.create']

    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        """Import discount codes from a CSV file upload."""
        import csv
        import io
        from datetime import datetime as dt

        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        if not csv_file.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content = csv_file.read().decode('utf-8-sig')
        except UnicodeDecodeError:
            return Response({'error': 'File must be UTF-8 encoded'}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(content))

        TYPE_MAP = {
            'percent': 'percentage',
            'fixed_cart': 'fixed',
            'fixed_product': 'fixed',
            'acfw_fixed_cashback': 'fixed',
        }

        def parse_date(s):
            if not s or not s.strip():
                return None
            for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%d'):
                try:
                    parsed = dt.strptime(s.strip(), fmt)
                    aware = timezone.make_aware(parsed, timezone.utc)
                    if aware.year == 1970:
                        return None
                    return aware
                except ValueError:
                    continue
            return None

        # Deduplicate: keep last occurrence, sum usage counts
        seen = {}
        deduped = []
        for row in reader:
            code = (row.get('coupon_code') or '').strip()
            if not code:
                continue

            try:
                discount_value = Decimal(row.get('coupon_amount', '0').strip() or '0')
            except Exception:
                discount_value = Decimal('0')

            try:
                current_uses = int(row.get('usage_count', '0').strip() or '0')
            except ValueError:
                current_uses = 0

            try:
                usage_limit = int(row.get('usage_limit', '0').strip() or '0')
            except ValueError:
                usage_limit = 0

            try:
                per_user = int(row.get('usage_limit_per_user', '0').strip() or '0')
            except ValueError:
                per_user = 0

            try:
                min_amount = Decimal(row.get('minimum_amount', '0').strip() or '0')
            except Exception:
                min_amount = Decimal('0')

            entry = {
                'code': code,
                'discount_type': TYPE_MAP.get(row.get('coupon_type', '').strip(), 'percentage'),
                'discount_value': discount_value,
                'current_uses': current_uses,
                'max_uses': usage_limit if usage_limit > 0 else None,
                'usage_limit_per_user': per_user if per_user > 0 else None,
                'min_order_amount': min_amount,
                'valid_until': parse_date(row.get('expiry_date', '')),
            }

            key = code.lower()
            if key in seen:
                idx = seen[key]
                prev_uses = deduped[idx]['current_uses']
                deduped[idx] = entry
                deduped[idx]['current_uses'] = prev_uses + entry['current_uses']
            else:
                seen[key] = len(deduped)
                deduped.append(entry)

        created = 0
        updated = 0
        errors = []

        for entry in deduped:
            try:
                existing = DiscountCode.objects.filter(code__iexact=entry['code']).first()
                if existing:
                    existing.discount_type = entry['discount_type']
                    existing.discount_value = entry['discount_value']
                    existing.max_uses = entry['max_uses']
                    existing.current_uses = entry['current_uses']
                    existing.usage_limit_per_user = entry['usage_limit_per_user']
                    existing.min_order_amount = entry['min_order_amount']
                    existing.valid_until = entry['valid_until']
                    existing.is_active = True
                    existing.save()
                    updated += 1
                else:
                    DiscountCode.objects.create(
                        code=entry['code'],
                        discount_type=entry['discount_type'],
                        discount_value=entry['discount_value'],
                        max_uses=entry['max_uses'],
                        current_uses=entry['current_uses'],
                        usage_limit_per_user=entry['usage_limit_per_user'],
                        min_order_amount=entry['min_order_amount'],
                        valid_until=entry['valid_until'],
                        is_active=True,
                    )
                    created += 1
            except Exception as e:
                errors.append(f'{entry["code"]}: {str(e)}')

        return Response({
            'created': created,
            'updated': updated,
            'errors': errors,
            'total': created + updated,
        })


# ==========================================
# Admin Pagination & Filtering for Website Orders
# ==========================================

class WebsiteOrderPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class WebsiteOrderFilter(django_filters.FilterSet):
    start_date = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    end_date = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    customer_country = django_filters.CharFilter(field_name='customer_country', lookup_expr='iexact')

    class Meta:
        model = WebsiteOrder
        fields = ['status', 'payment_method', 'customer_country', 'start_date', 'end_date']


class WebsiteOrderAdminViewSet(viewsets.ModelViewSet):
    """List/view/update website orders (admin/CRM) with pagination, filtering, search, and overview stats."""
    queryset = WebsiteOrder.objects.select_related(
        'variant__product', 'discount_code'
    ).prefetch_related('addons').all()
    serializer_class = WebsiteOrderAdminSerializer
    permission_classes = [HasPermission]
    required_permissions = ['website_orders.view']
    http_method_names = ['get', 'patch', 'post', 'head', 'options']
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = [
        'customer_email', 'customer_first_name', 'customer_last_name',
        'customer_country', 'payment_id', 'referral_code',
    ]
    ordering_fields = ['created_at', 'total', 'customer_last_name']
    ordering = ['-created_at']
    filterset_class = WebsiteOrderFilter
    pagination_class = WebsiteOrderPagination

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return WebsiteOrderStatusUpdateSerializer
        return WebsiteOrderAdminSerializer

    def list(self, request, *args, **kwargs):
        filtered_qs = self.filter_queryset(self.get_queryset())

        # Overview aggregates on filtered queryset
        overview = filtered_qs.aggregate(
            total_orders=Count('id'),
            total_revenue=Sum('total'),
            total_discounts=Sum('discount_amount'),
            completed_orders=Count('id', filter=Q(status='completed')),
            paid_orders=Count('id', filter=Q(status='paid')),
        )

        page = self.paginate_queryset(filtered_qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'overview': overview,
                'orders': serializer.data,
            })

        serializer = self.get_serializer(filtered_qs, many=True)
        return Response({
            'overview': overview,
            'orders': serializer.data,
        })

    @action(detail=True, methods=['post'], url_path='reprocess')
    def reprocess(self, request, pk=None):
        """Retrigger post-purchase processing for a stuck 'paid' order."""
        order = self.get_object()
        if order.status != 'paid':
            return Response(
                {'error': f'Can only reprocess orders with status "paid", current: "{order.status}"'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.order_id is not None:
            return Response(
                {'error': 'Order already has a linked Order record and cannot be reprocessed'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            process_paid_website_order(order)
            order.refresh_from_db()
            return Response({
                'success': True,
                'message': f'Order reprocessed successfully',
                'status': order.status,
                'order_id': str(order.order_id) if order.order_id else None,
            })
        except Exception as e:
            logger.exception(f"Reprocess failed for order {order.id}: {e}")
            return Response(
                {'error': f'Reprocess failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class WebsiteOrderExportCSVView(APIView):
    """
    GET /api/admin/website-orders/export.csv
    Streams a CSV export of website orders with optional filters.
    """
    permission_classes = [HasPermission]
    required_permissions = ['website_orders.export']

    def get(self, request):
        qs = WebsiteOrder.objects.select_related(
            'variant__product', 'discount_code'
        ).order_by('-created_at')

        # Apply filters
        status_filter = request.GET.get('status')
        payment_method = request.GET.get('payment_method')
        customer_email = request.GET.get('customer_email')
        customer_name = request.GET.get('customer_name')
        country = request.GET.get('country')
        referral_code = request.GET.get('referral_code')
        date_from = request.GET.get('date_from')
        date_to = request.GET.get('date_to')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if payment_method:
            qs = qs.filter(payment_method=payment_method)
        if customer_email:
            qs = qs.filter(customer_email__icontains=customer_email)
        if customer_name:
            qs = qs.filter(
                Q(customer_first_name__icontains=customer_name) |
                Q(customer_last_name__icontains=customer_name)
            )
        if country:
            qs = qs.filter(customer_country__iexact=country)
        if referral_code:
            qs = qs.filter(referral_code__iexact=referral_code)
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)

        def generate_csv():
            header = [
                'order_number', 'created_at', 'status',
                'customer_email', 'customer_first_name', 'customer_last_name',
                'customer_country', 'customer_phone',
                'product_name', 'account_size', 'challenge_type', 'broker_type',
                'subtotal', 'addon_total', 'discount_amount', 'discount_code', 'total',
                'currency', 'payment_method', 'payment_id',
                'referral_code', 'paid_at',
            ]
            yield ','.join(header) + '\n'

            for order in qs.iterator():
                product_name = ''
                account_size = ''
                challenge_type = ''
                broker_type = ''
                if order.variant:
                    account_size = str(order.variant.account_size)
                    broker_type = order.variant.broker_type or ''
                    if order.variant.product:
                        product_name = order.variant.product.name
                        challenge_type = order.variant.product.challenge_type or ''

                discount_code_text = order.discount_code.code if order.discount_code else ''

                row = [
                    order.order_number,
                    str(order.created_at),
                    order.status,
                    order.customer_email,
                    order.customer_first_name,
                    order.customer_last_name,
                    order.customer_country,
                    order.customer_phone,
                    product_name,
                    account_size,
                    challenge_type,
                    broker_type,
                    str(order.subtotal),
                    str(order.addon_total),
                    str(order.discount_amount),
                    discount_code_text,
                    str(order.total),
                    order.currency,
                    order.payment_method,
                    order.payment_id,
                    order.referral_code,
                    str(order.paid_at) if order.paid_at else '',
                ]
                # Escape fields that might contain commas
                yield ','.join(
                    '"' + str(v).replace('"', '""') + '"' for v in row
                ) + '\n'

        response = StreamingHttpResponse(generate_csv(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="website_orders_export.csv"'
        return response


# ==========================================
# Post-Purchase Processing
# ==========================================

def process_paid_website_order(website_order):
    """
    Post-purchase flow: creates user, client profile, Order, MT5 account,
    ChallengeEnrollment, processes affiliate, and sends credentials email.
    Reuses the pattern from WooCommerceOrderWebhookView.

    For PAP completion orders (pap_enrollment is set), transitions the enrollment
    from awaiting_payment to phase_1_passed, triggering KYC flow.
    """
    # Idempotency guard: skip if already processed (order record already created)
    if website_order.order_id is not None:
        logger.info(f"Website order {website_order.id} already processed (order_id={website_order.order_id}), skipping")
        return

    # PAP Completion: handle differently — no new enrollment, just transition existing one
    if website_order.pap_enrollment_id:
        _process_pap_completion_order(website_order)
        return

    logger.info(f"Processing paid website order: {website_order.id}")
    variant = website_order.variant
    if not variant:
        logger.error(f"No variant for website order {website_order.id}")
        return

    product = variant.product
    is_pap_initial = product.is_pay_after_pass
    is_instant_funding = product.challenge_type == 'instant-funding'
    email = website_order.customer_email
    first_name = website_order.customer_first_name
    last_name = website_order.customer_last_name

    with transaction.atomic():
        # 1. Create or get User
        user, created = User.objects.get_or_create(
            username=email,
            defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'phone': website_order.customer_phone,
                'role': 'client',
            }
        )
        if not created and not user.phone and website_order.customer_phone:
            user.phone = website_order.customer_phone
            user.save(update_fields=['phone'])

        # 2. Create or update ClientProfile
        address_dict = {
            'first_name': first_name,
            'last_name': last_name,
            'address_line_1': website_order.customer_address.get('address_line_1', ''),
            'address_line_2': website_order.customer_address.get('address_line_2', ''),
            'city': website_order.customer_address.get('city', ''),
            'state': website_order.customer_address.get('state', ''),
            'postcode': website_order.customer_address.get('postcode', ''),
            'country': website_order.customer_country,
            'email': email,
            'phone': website_order.customer_phone,
        }
        client_profile, _ = ClientProfile.objects.update_or_create(
            user=user,
            defaults={'address_info': address_dict}
        )

        # 2b. Create WeCoinWallet so the client appears in the CRM ledger immediately
        WeCoinWallet.objects.get_or_create(user=user)

        # 3. Create the main Order record
        coupon_codes = [website_order.discount_code.code] if website_order.discount_code else []
        order = Order.objects.create(
            user=user,
            date_created=timezone.now(),
            status='completed',
            payment_status='paid',
            customer_name=f"{first_name} {last_name}".strip(),
            customer_email=email,
            customer_ip=website_order.customer_ip,
            billing_address=address_dict,
            product_name=f"{product.name} - ${variant.account_size:,}",
            cost=variant.price,
            quantity=1,
            total_usd=website_order.total,
            items_subtotal_usd=website_order.subtotal,
            coupons_discount_usd=website_order.discount_amount,
            order_total_usd=website_order.total,
            paid_usd=website_order.total,
            coupon_codes=coupon_codes,
            payment_method=website_order.payment_method,
            currency=website_order.currency,
            transaction_id=website_order.payment_id,
            challenge_name=product.name,
            challenge_account_size=str(variant.account_size),
            challenge_broker_type=variant.broker_type,
            referral_code=website_order.referral_code,
        )

        # Link WebsiteOrder to Order
        website_order.order = order
        website_order.status = 'processing'
        website_order.save(update_fields=['order', 'status', 'updated_at'])

        # 4. Increment discount code usage (skip for PAP initial — discount applies on completion)
        if website_order.discount_code and not is_pap_initial:
            dc = website_order.discount_code
            DiscountCode.objects.filter(pk=dc.pk).update(current_uses=F('current_uses') + 1)

        # 5. Handle affiliate tracking (skip for PAP initial — commission assigned on completion)
        if website_order.referral_code and not is_pap_initial:
            try:
                affiliate_profile = AffiliateProfile.objects.get(
                    referral_code=website_order.referral_code, approved=True
                )
                order.affiliate = affiliate_profile
                order.save(update_fields=['affiliate'])

                if user.role == 'client':
                    existing_referral = AffiliateReferral.objects.filter(
                        affiliate=affiliate_profile,
                        referred_user=user,
                        challenge_name=product.name,
                    ).first()

                    if not existing_referral:
                        total_amount = website_order.total
                        commission_amount = Decimal('0.00')

                        custom = getattr(affiliate_profile, 'custom_commission', None)
                        if custom and custom.is_active:
                            if custom.fixed_amount_per_referral:
                                commission_amount = custom.fixed_amount_per_referral
                            elif custom.commission_rate:
                                commission_amount = (total_amount * Decimal(custom.commission_rate) / 100).quantize(Decimal('0.01'))
                            else:
                                tier_rate = affiliate_profile.current_tier.commission_rate if affiliate_profile.current_tier else 0
                                commission_amount = (total_amount * Decimal(tier_rate) / 100).quantize(Decimal('0.01'))
                        else:
                            tier_rate = affiliate_profile.current_tier.commission_rate if affiliate_profile.current_tier else 0
                            commission_amount = (total_amount * Decimal(tier_rate) / 100).quantize(Decimal('0.01'))

                        AffiliateReferral.objects.create(
                            affiliate=affiliate_profile,
                            referred_user=user,
                            challenge_name=product.name,
                            commission_amount=commission_amount,
                            commission_status='pending',
                        )
                        logger.info(f"Affiliate referral recorded: {affiliate_profile.user.username} -> {email}")
            except AffiliateProfile.DoesNotExist:
                logger.warning(f"Affiliate code '{website_order.referral_code}' not found or not approved")

        # 6. Create ChallengeEnrollment
        challenge = product.challenge
        enrollment = None
        if challenge:
            # Determine payment_type
            if is_instant_funding:
                payment_type = 'instant_funding'
            elif is_pap_initial:
                payment_type = 'pay_after_pass'
            else:
                payment_type = 'standard'

            # Determine initial status for instant funding
            if is_instant_funding:
                if client_profile.kyc_status == 'approved':
                    initial_status = 'live_in_progress'
                else:
                    initial_status = 'awaiting_kyc'
            else:
                initial_status = 'phase_1_in_progress'

            enrollment = ChallengeEnrollment.objects.create(
                client=client_profile,
                challenge=challenge,
                account_size=Decimal(str(variant.account_size)),
                currency=website_order.currency,
                order=order,
                payment_type=payment_type,
                status=initial_status,
                live_start_date=timezone.now().date() if initial_status == 'live_in_progress' else None,
            )
            label = " (Instant Funding)" if is_instant_funding else (" (PAP)" if is_pap_initial else "")
            logger.info(f"ChallengeEnrollment created: {enrollment.id} for {email}{label} [status={initial_status}]")

        # 6b. Apply addon effects (update or create PayoutConfiguration)
        # Uses update_or_create because the post_save signal on ChallengeEnrollment
        # may have already created a default PayoutConfiguration for live enrollments.
        if enrollment:
            addon_effects = website_order.addons.exclude(effect_type='none')
            if addon_effects.exists():
                update_kwargs = {
                    'client': user,
                    'config_type': 'custom',
                    'live_trading_start_date': timezone.now().date(),
                    'notes': 'Auto-created from checkout add-ons: ' + ', '.join(
                        a.name for a in addon_effects
                    ),
                }
                for addon in addon_effects:
                    if addon.effect_type == 'profit_split' and addon.effect_value:
                        update_kwargs['profit_share_percent'] = Decimal(addon.effect_value)
                        if addon.effect_from_payout:
                            update_kwargs['profit_split_from_payout'] = addon.effect_from_payout
                    elif addon.effect_type == 'accelerated_payout' and addon.effect_value:
                        update_kwargs['first_payout_delay_days'] = int(addon.effect_value)

                _, created = PayoutConfiguration.objects.update_or_create(
                    enrollment=enrollment,
                    defaults=update_kwargs,
                )
                action = "created" if created else "updated"
                logger.info(f"PayoutConfiguration {action} for enrollment {enrollment.id} with addon effects")

    # 7. MT5 Account Creation (outside transaction - external API call)
    # Instant funding awaiting KYC: create account with trading disabled
    can_trade = not (is_instant_funding and enrollment and enrollment.status == 'awaiting_kyc')
    try:
        _create_mt5_and_send_email(order, user, variant, website_order, can_trade=can_trade)
    except Exception as e:
        logger.exception(f"MT5 account creation failed for order {order.id}: {e}")

    # Mark order completed
    website_order.status = 'completed'
    website_order.save(update_fields=['status', 'updated_at'])
    order.status = 'completed'
    order.save(update_fields=['status'])

    # 8a. Auto-reward WeCoins milestone check
    try:
        from api.services.auto_reward_service import check_and_grant_auto_rewards
        check_and_grant_auto_rewards(user, 'purchase')
    except Exception:
        logger.exception(f"Auto reward check failed for user {user.email} after purchase")

    # 8. Klaviyo Post-Purchase event (only if KlaviyoService is available)
    if KlaviyoService is not None:
        try:
            KlaviyoService.identify_profile(email, {
                "$first_name": first_name,
                "$last_name": last_name,
                "country": website_order.customer_country,
            })
            KlaviyoService.track_event("Placed Order", email, {
                "order_id": str(website_order.id),
                "product_name": product.name,
                "account_size": str(variant.account_size),
                "value": float(website_order.total),
                "currency": "USD",
            })
        except Exception as e:
            logger.warning(f"Klaviyo post-purchase event failed for order {website_order.id}: {e}")

    logger.info(f"Website order {website_order.id} processing complete")


def _process_pap_completion_order(website_order):
    """
    Handle Pay After Pass completion: client has passed the challenge and paid the full price.
    Transition enrollment from awaiting_payment → phase_1_passed, which triggers KYC flow.
    """
    from wefund.challenges.phase_handler import handle_transition

    logger.info(f"Processing PAP completion order: {website_order.id}")

    enrollment = website_order.pap_enrollment
    if not enrollment:
        logger.error(f"PAP completion order {website_order.id} has no linked enrollment")
        return

    variant = website_order.variant
    product = variant.product if variant else None
    email = website_order.customer_email
    first_name = website_order.customer_first_name
    last_name = website_order.customer_last_name

    with transaction.atomic():
        # Lock the enrollment row to prevent concurrent webhook callbacks from double-processing
        enrollment = ChallengeEnrollment.objects.select_for_update().get(id=enrollment.id)
        if enrollment.status != 'awaiting_payment':
            logger.warning(f"PAP enrollment {enrollment.id} is not in awaiting_payment status (current: {enrollment.status}), skipping")
            return

        user = enrollment.client.user

        # Create the main Order record for the completion payment
        coupon_codes = [website_order.discount_code.code] if website_order.discount_code else []
        order = Order.objects.create(
            user=user,
            date_created=timezone.now(),
            status='completed',
            payment_status='paid',
            customer_name=f"{first_name} {last_name}".strip(),
            customer_email=email,
            customer_ip=website_order.customer_ip,
            billing_address={
                'first_name': first_name,
                'last_name': last_name,
                'country': website_order.customer_country,
                'email': email,
                'phone': website_order.customer_phone,
            },
            product_name=f"{product.name} - ${variant.account_size:,} (PAP Completion)" if product else "PAP Completion",
            cost=variant.price if variant else website_order.total,
            quantity=1,
            total_usd=website_order.total,
            items_subtotal_usd=website_order.subtotal,
            coupons_discount_usd=website_order.discount_amount,
            order_total_usd=website_order.total,
            paid_usd=website_order.total,
            coupon_codes=coupon_codes,
            payment_method=website_order.payment_method,
            currency=website_order.currency,
            transaction_id=website_order.payment_id,
            challenge_name=product.name if product else '',
            challenge_account_size=str(variant.account_size) if variant else '',
            challenge_broker_type=variant.broker_type if variant else '',
            referral_code=website_order.referral_code,
        )

        # Link WebsiteOrder to Order
        website_order.order = order
        website_order.status = 'processing'
        website_order.save(update_fields=['order', 'status', 'updated_at'])

        # Increment discount code usage
        if website_order.discount_code:
            dc = website_order.discount_code
            DiscountCode.objects.filter(pk=dc.pk).update(current_uses=F('current_uses') + 1)

        # Handle affiliate tracking (commissions assigned on completion, not initial purchase)
        if website_order.referral_code:
            try:
                affiliate_profile = AffiliateProfile.objects.get(
                    referral_code=website_order.referral_code, approved=True
                )
                order.affiliate = affiliate_profile
                order.save(update_fields=['affiliate'])

                if user.role == 'client':
                    existing_referral = AffiliateReferral.objects.filter(
                        affiliate=affiliate_profile,
                        referred_user=user,
                        challenge_name=product.name if product else '',
                    ).first()

                    if not existing_referral:
                        total_amount = website_order.total
                        commission_amount = Decimal('0.00')

                        custom = getattr(affiliate_profile, 'custom_commission', None)
                        if custom and custom.is_active:
                            if custom.fixed_amount_per_referral:
                                commission_amount = custom.fixed_amount_per_referral
                            elif custom.commission_rate:
                                commission_amount = (total_amount * Decimal(custom.commission_rate) / 100).quantize(Decimal('0.01'))
                            else:
                                tier_rate = affiliate_profile.current_tier.commission_rate if affiliate_profile.current_tier else 0
                                commission_amount = (total_amount * Decimal(tier_rate) / 100).quantize(Decimal('0.01'))
                        else:
                            tier_rate = affiliate_profile.current_tier.commission_rate if affiliate_profile.current_tier else 0
                            commission_amount = (total_amount * Decimal(tier_rate) / 100).quantize(Decimal('0.01'))

                        AffiliateReferral.objects.create(
                            affiliate=affiliate_profile,
                            referred_user=user,
                            challenge_name=product.name if product else '',
                            commission_amount=commission_amount,
                            commission_status='pending',
                        )
                        logger.info(f"PAP completion affiliate referral recorded: {affiliate_profile.user.username} -> {email}")
            except AffiliateProfile.DoesNotExist:
                logger.warning(f"Affiliate code '{website_order.referral_code}' not found or not approved")

        # Transition enrollment: awaiting_payment → phase_1_passed
        # This triggers the KYC signal (trigger_rise_invite_on_phase_passed)
        handle_transition(
            enrollment,
            from_status='awaiting_payment',
            to_status='phase_1_passed',
            phase_type='phase-1',
            reason='Pay After Pass: full payment received'
        )
        logger.info(f"PAP enrollment {enrollment.id} transitioned to phase_1_passed after payment")

        # Apply add-on effects carried from the initial PAP order
        # Uses update_or_create because the post_save signal on ChallengeEnrollment
        # may have already created a default PayoutConfiguration for live enrollments.
        addon_effects = website_order.addons.exclude(effect_type='none')
        if addon_effects.exists():
            update_kwargs = {
                'client': user,
                'config_type': 'custom',
                'live_trading_start_date': timezone.now().date(),
                'notes': 'Auto-created from PAP initial order add-ons: ' + ', '.join(
                    a.name for a in addon_effects
                ),
            }
            for addon in addon_effects:
                if addon.effect_type == 'profit_split' and addon.effect_value:
                    update_kwargs['profit_share_percent'] = Decimal(addon.effect_value)
                    if addon.effect_from_payout:
                        update_kwargs['profit_split_from_payout'] = addon.effect_from_payout
                elif addon.effect_type == 'accelerated_payout' and addon.effect_value:
                    update_kwargs['first_payout_delay_days'] = int(addon.effect_value)

            _, created = PayoutConfiguration.objects.update_or_create(
                enrollment=enrollment,
                defaults=update_kwargs,
            )
            action = "created" if created else "updated"
            logger.info(f"PayoutConfiguration {action} for PAP enrollment {enrollment.id} with add-on effects")

    # Mark order completed
    website_order.status = 'completed'
    website_order.save(update_fields=['status', 'updated_at'])
    order.status = 'completed'
    order.save(update_fields=['status'])

    # Auto-reward WeCoins milestone check
    try:
        from api.services.auto_reward_service import check_and_grant_auto_rewards
        check_and_grant_auto_rewards(user, 'purchase')
    except Exception:
        logger.exception(f"Auto reward check failed for user {user.email} after PAP completion")

    logger.info(f"PAP completion order {website_order.id} processing complete")


def _create_mt5_and_send_email(order, user, variant, website_order, can_trade=True):
    """Create MT5 account and send credentials email."""
    mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)

    user_password = generate_mt5_compliant_password().strip()
    mt5_password = generate_mt5_compliant_password().strip()
    investor_password = generate_mt5_compliant_password().strip()

    user.set_password(user_password)
    user.save(update_fields=['password'])

    try:
        profile_id = user.clientprofile.profile_id
    except (AttributeError, ClientProfile.DoesNotExist):
        profile_id = ""

    account_size = float(variant.account_size)

    # Determine MT5 group from enrollment
    enrollment = ChallengeEnrollment.objects.filter(order=order, is_active=True).first()
    mt5_group_name = settings.MT5_GROUP_NAME

    if enrollment:
        current_phase_type = enrollment.get_current_phase_type()
        try:
            challenge_phase = ChallengePhase.objects.get(
                challenge=enrollment.challenge,
                phase_type=current_phase_type
            )
            mapping = challenge_phase.group_mapping
            mt5_group_name = mapping.mt5_group
        except (ChallengePhase.DoesNotExist, ChallengePhaseGroupMapping.DoesNotExist):
            logger.warning(f"No group mapping found for enrollment {enrollment.id}, using default")

    mt5_payload = [{
        "index": 0,
        "agentAccount": settings.MT5_AGENT_ACCOUNT,
        "canTrade": can_trade,
        "comment": "Created from website order",
        "group": {"name": mt5_group_name},
        "hasSendReportEnabled": True,
        "isEnabled": True,
        "leverage": settings.MT5_LEVERAGE,
        "password": mt5_password,
        "investorPassword": investor_password,
        "enable_change_password": True,
        "password_phone": user.phone or "",
        "id": profile_id,
        "status": "RE",
        "user_color": settings.MT5_USER_COLOR,
        "pltAccount": {
            "taxes": settings.MT5_TAX_RATE,
            "balance": account_size,
        },
        "user": {
            "address": {
                "address": order.billing_address.get("address_line_1", ""),
                "city": order.billing_address.get("city", ""),
                "state": order.billing_address.get("state", ""),
                "zipcode": order.billing_address.get("postcode", ""),
                "country": order.billing_address.get("country", ""),
            },
            "name": order.customer_name,
            "email": order.customer_email,
            "phone": order.billing_address.get("phone", ""),
        }
    }]

    logger.debug("MT5 payload: %s", mt5_payload)
    mt5_response = mt5_client.add_user(mt5_payload)
    logger.info("MT5 AddUser response: %s", mt5_response)

    elem = (mt5_response.get("array") or [{}])[0]
    mt5_account_id = elem.get("accountID")

    # Save to Order
    order.mt5_payload_sent = mt5_payload
    order.mt5_response = mt5_response
    order.mt5_account_id = mt5_account_id
    order.mt5_password = mt5_password
    order.mt5_investor_password = investor_password
    order.plaintext_password = user_password
    order.save(update_fields=[
        "mt5_payload_sent", "mt5_response", "mt5_account_id",
        "mt5_password", "mt5_investor_password", "plaintext_password"
    ])

    # Update ChallengeEnrollments
    if mt5_account_id:
        enrollments = ChallengeEnrollment.objects.filter(order=order, is_active=True, mt5_account_id__isnull=True)
        for enr in enrollments:
            enr.mt5_account_id = mt5_account_id
            enr.mt5_password = mt5_password
            enr.mt5_investor_password = investor_password
            enr.broker_type = variant.broker_type
            enr.save(update_fields=[
                "mt5_account_id", "mt5_password", "mt5_investor_password", "broker_type", "updated_at"
            ])
            logger.info(f"MT5 details stored for ChallengeEnrollment: {enr.id}")

    # Send credentials email
    email_context = {
        'username': user.username,
        'password': user_password,
        'mt5_login': mt5_account_id,
        'mt5_password': mt5_password,
    }
    EmailService.send_user_credentials(
        to_email=user.email,
        subject="WeFund | Your Account & MT5 Login Details",
        context=email_context,
    )
    logger.info(f"Credentials email sent to {user.email}")

