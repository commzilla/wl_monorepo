"""
Generic WordPress Plugin API Views.

This module provides universal API views that can be called from any WordPress plugin,
not just WooCommerce. It includes flexible authentication, order processing,
and comprehensive error handling for any WordPress plugin integration.

Classes:
    GenericWordPressAuthMixin: Universal authentication mixin for any WordPress plugin
    WordPressPluginAuthView: JWT authentication for any WordPress plugin
    GenericOrderProcessingView: Universal order processing endpoint
    PluginHealthCheckView: Health check for plugin connectivity
    
Functions:
    test_plugin_endpoint: Test endpoint for any plugin validation
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import JsonResponse, HttpResponseForbidden
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .serializers import WooOrderSerializer
from .services.mt5_client import MT5Client
from .utils.security import generate_mt5_compliant_password
from wefund.models import Order, ChallengeEnrollment, User, ClientProfile
from .services.email_service import EmailService
from .monitoring_views import APIMonitoringMixin

logger = logging.getLogger(__name__)
User = get_user_model()


class GenericWordPressAuthMixin:
    """Universal authentication mixin for any WordPress plugin."""
    
    @staticmethod
    def verify_plugin_signature(raw_body: bytes, signature: str, secret: str) -> bool:
        """
        Verify HMAC-SHA256 signature from any WordPress plugin.
        
        Args:
            raw_body (bytes): Raw request body as bytes
            signature (str): Signature from X-Plugin-Signature header
            secret (str): Shared secret key
            
        Returns:
            bool: True if signature is valid, False otherwise
        """
        try:
            expected = hmac.new(
                secret.encode('utf-8'), 
                raw_body, 
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(signature, expected)
        except Exception as e:
            logger.exception(f"Error verifying plugin signature: {e}")
            return False
    
    @staticmethod
    def generate_plugin_api_key() -> str:
        """Generate a secure API key for WordPress plugin authentication."""
        import secrets
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def log_plugin_request(request, endpoint: str, plugin_name: str, success: bool, error_msg: str = None):
        """Log plugin API request for monitoring."""
        log_data = {
            'endpoint': endpoint,
            'plugin_name': plugin_name,
            'method': request.method,
            'ip_address': request.META.get('REMOTE_ADDR'),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:500],
            'success': success,
            'timestamp': timezone.now().isoformat(),
        }
        
        if error_msg:
            log_data['error'] = error_msg
            
        if success:
            logger.info(f"WordPress Plugin API Request: {json.dumps(log_data)}")
        else:
            logger.error(f"WordPress Plugin API Request Failed: {json.dumps(log_data)}")


class JWTTokenGeneratorView(APIView, GenericWordPressAuthMixin):
    """
    JWT Token Generator for WordPress plugins.
    This endpoint is for the client to generate JWT tokens for their WordPress developers.
    """
    permission_classes = [AllowAny]  # Protected by API key
    
    def post(self, request, *args, **kwargs):
        """
        Generate JWT tokens for WordPress plugins.
        
        Expected payload:
        {
            "plugin_name": "your-plugin-name",
            "plugin_key": "your-plugin-api-key", 
            "plugin_version": "1.0.0",
            "site_url": "https://your-wordpress-site.com",
            "token_duration_hours": 24
        }
        """
        try:
            plugin_name = request.data.get('plugin_name', 'unknown-plugin')
            plugin_key = request.data.get('plugin_key')
            plugin_version = request.data.get('plugin_version')
            site_url = request.data.get('site_url')
            token_duration_hours = request.data.get('token_duration_hours', 24)
            
            # Validate required fields
            if not all([plugin_key, plugin_version, site_url]):
                self.log_plugin_request(request, 'plugin-auth', plugin_name, False, 'Missing required fields')
                return Response({
                    'error': 'Missing required fields',
                    'required': ['plugin_key', 'plugin_version', 'site_url'],
                    'received': list(request.data.keys())
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify plugin key
            expected_key = getattr(settings, 'WORDPRESS_PLUGIN_API_KEY', '')
            if not expected_key or not hmac.compare_digest(plugin_key, expected_key):
                self.log_plugin_request(request, 'plugin-auth', plugin_name, False, 'Invalid plugin key')
                return Response({
                    'error': 'Invalid plugin key'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Create or get system user for plugin integration
            username = f"plugin_{plugin_name.lower().replace('-', '_').replace(' ', '_')}"
            plugin_user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'{username}@system.local',
                    'is_active': True,
                    'role': 'system',
                    'first_name': plugin_name,
                    'last_name': 'Plugin'
                }
            )
            
            # Generate JWT tokens with custom duration
            refresh = RefreshToken.for_user(plugin_user)
            access_token = refresh.access_token
            
            # Set custom expiration if requested
            if token_duration_hours != 1:  # Default is 1 hour
                from datetime import timedelta
                access_token.set_exp(lifetime=timedelta(hours=token_duration_hours))
            
            access_token_str = str(access_token)
            refresh_token_str = str(refresh)
            
            # Log successful token generation
            logger.info(f"Generated JWT token for plugin '{plugin_name}' (duration: {token_duration_hours}h)")
            
            return Response({
                'jwt_token': access_token_str,
                'refresh_token': refresh_token_str,
                'expires_in_hours': token_duration_hours,
                'expires_in_seconds': token_duration_hours * 3600,
                'token_type': 'Bearer',
                'plugin_name': plugin_name,
                'plugin_version_supported': True,
                'api_version': '1.0',
                'usage_instructions': {
                    'include_in_payload': 'Include jwt_token in your order processing requests',
                    'endpoint': '/api/plugin/order/process/',
                    'payload_format': {
                        'jwt_token': 'Use the jwt_token from this response',
                        'plugin_name': 'Your plugin name',
                        'order_data': 'Your order data as JSON object (dictionary format)'
                    }
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.exception("WordPress plugin authentication error")
            self.log_plugin_request(request, 'plugin-auth', plugin_name, False, str(e))
            return Response({
                'error': 'Authentication failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class JWTTokenRefreshView(APIView, GenericWordPressAuthMixin):
    """
    JWT Token Refresh endpoint for WordPress plugins.
    Allows plugins to refresh their JWT tokens using refresh tokens.
    """
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        """
        Refresh JWT token using refresh token.
        
        Expected payload:
        {
            "refresh_token": "your-refresh-token-here",
            "plugin_name": "your-plugin-name"
        }
        """
        try:
            refresh_token = request.data.get('refresh_token')
            plugin_name = request.data.get('plugin_name', 'unknown-plugin')
            
            # Validate required fields
            if not refresh_token:
                return Response({
                    'error': 'Missing refresh_token in request payload',
                    'required_fields': ['refresh_token', 'plugin_name']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate and refresh the token
            try:
                refresh = RefreshToken(refresh_token)
                
                # Get user from refresh token
                user_id = refresh['user_id']
                user = User.objects.get(id=user_id)
                
                # Ensure user is still active
                if not user.is_active:
                    return Response({
                        'error': 'User account is inactive',
                        'plugin_name': plugin_name
                    }, status=status.HTTP_401_UNAUTHORIZED)
                
                # Generate new access token
                new_access_token = refresh.access_token
                
                # Optionally rotate refresh token (if configured)
                new_refresh_token = str(refresh)
                if getattr(settings, 'SIMPLE_JWT', {}).get('ROTATE_REFRESH_TOKENS', False):
                    # Create new refresh token
                    new_refresh = RefreshToken.for_user(user)
                    new_refresh_token = str(new_refresh)
                    # Blacklist old refresh token
                    refresh.blacklist()
                
                logger.info(f"JWT token refreshed for plugin '{plugin_name}' (user: {user.username})")
                
                return Response({
                    'jwt_token': str(new_access_token),
                    'refresh_token': new_refresh_token,
                    'expires_in_hours': settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds() / 3600,
                    'expires_in_seconds': settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
                    'token_type': 'Bearer',
                    'plugin_name': plugin_name,
                    'refreshed_at': timezone.now().isoformat(),
                    'usage_instructions': {
                        'include_in_payload': 'Include the new jwt_token in your order processing requests',
                        'store_securely': 'Store both jwt_token and refresh_token securely in WordPress'
                    }
                }, status=status.HTTP_200_OK)
                
            except (InvalidToken, TokenError) as e:
                logger.warning(f"Invalid refresh token for plugin '{plugin_name}': {str(e)}")
                return Response({
                    'error': 'Invalid or expired refresh token',
                    'plugin_name': plugin_name,
                    'action_required': 'Generate new tokens using /api/plugin/generate-token/'
                }, status=status.HTTP_401_UNAUTHORIZED)
                
            except User.DoesNotExist:
                logger.error(f"User not found for refresh token from plugin '{plugin_name}'")
                return Response({
                    'error': 'User associated with token not found',
                    'plugin_name': plugin_name
                }, status=status.HTTP_401_UNAUTHORIZED)
                
        except Exception as e:
            logger.exception(f"JWT token refresh error for plugin '{plugin_name}'")
            return Response({
                'error': 'Token refresh failed',
                'details': str(e),
                'plugin_name': plugin_name
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GenericOrderProcessingView(APIView, GenericWordPressAuthMixin, APIMonitoringMixin):
    """
    Universal order processing endpoint that can accept data from any WordPress plugin.
    JWT token validation is done from the request payload.
    """
    permission_classes = [AllowAny]  # We'll validate JWT from payload
    
    def post(self, request, *args, **kwargs):
        """
        Process order data from any WordPress plugin with JWT token in payload.
        
        Expected payload format:
        {
            "jwt_token": "your-jwt-token-here",
            "plugin_name": "your-plugin-name",
            "order_data": {
                "id": 12345,
                "status": "completed",
                "total": "99.00",
                "currency": "USD",
                "billing": {
                    "email": "customer@example.com",
                    "first_name": "John",
                    "last_name": "Doe",
                    "phone": "+1234567890",
                    "address_1": "123 Main St",
                    "city": "New York",
                    "state": "NY",
                    "postcode": "10001",
                    "country": "US"
                },
                "line_items": [
                    {
                        "name": "Challenge Account - $10,000",
                        "price": "99.00",
                        "quantity": 1,
                        "meta_data": [
                            {"key": "pa_account-size", "value": "10000"},
                            {"key": "pa_broker-type", "value": "mt5"}
                        ]
                    }
                ],
                "customer_ip_address": "192.168.1.1"
            },
            "processing_options": {
                "create_mt5_account": true,
                "send_email": true,
                "create_user": true
            }
        }
        """
        webhook_id = self.generate_webhook_id(request)
        
        try:
            # Extract and validate JWT token from payload
            jwt_token = request.data.get('jwt_token')
            if not jwt_token:
                return Response({
                    'error': 'Missing jwt_token in request payload',
                    'webhook_id': webhook_id,
                    'required_fields': ['jwt_token', 'plugin_name', 'order_data']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            plugin_name = request.data.get('plugin_name', 'unknown')
            
            # Validate JWT token (includes single-use check)
            user = self.validate_jwt_token(jwt_token, plugin_name, webhook_id)
            if not user:
                return Response({
                    'error': 'Invalid, expired, or already used JWT token',
                    'webhook_id': webhook_id
                }, status=status.HTTP_401_UNAUTHORIZED)
            order_data = request.data.get('order_data', {})
            processing_options = request.data.get('processing_options', {})
            
            # Handle case where order_data might be sent as JSON string
            if isinstance(order_data, str):
                try:
                    import json
                    order_data = json.loads(order_data)
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"Failed to parse order_data JSON string: {e}")
                    return Response({
                        'error': 'Invalid order_data format - must be valid JSON object',
                        'webhook_id': webhook_id,
                        'details': str(e)
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Handle case where processing_options might be sent as JSON string
            if isinstance(processing_options, str):
                try:
                    import json
                    processing_options = json.loads(processing_options)
                except (json.JSONDecodeError, ValueError):
                    processing_options = {}
            
            logger.info(f"Processing order from plugin '{plugin_name}' (webhook_id: {webhook_id}, user: {user.username})")
            
            # Validate basic structure
            if not order_data:
                return Response({
                    'error': 'Missing order_data',
                    'webhook_id': webhook_id
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Convert plugin data to WooCommerce format for existing serializer
            woo_format_data = self.convert_to_woo_format(order_data, plugin_name)
            
            # Validate converted data
            serializer = WooOrderSerializer(data=woo_format_data)
            if not serializer.is_valid():
                return Response({
                    'error': 'Invalid order data',
                    'details': serializer.errors,
                    'webhook_id': webhook_id
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check for duplicate processing
            order_id = order_data.get('order_id') or order_data.get('id')
            if self.is_duplicate_order(order_id, plugin_name):
                return Response({
                    'message': 'Order already processed',
                    'order_id': order_id,
                    'webhook_id': webhook_id
                }, status=status.HTTP_200_OK)
            
            # Process the order
            processing_result = self.process_generic_order(
                serializer, 
                woo_format_data, 
                processing_options,
                plugin_name,
                webhook_id
            )
            
            if processing_result['success']:
                return Response({
                    'message': 'Order processed successfully',
                    'webhook_id': webhook_id,
                    'order_id': processing_result['order_id'],
                    'mt5_account_id': processing_result.get('mt5_account_id'),
                    'user_credentials': processing_result.get('user_credentials', {}),
                    'processing_time_seconds': processing_result['processing_time'],
                    'plugin_name': plugin_name
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'error': 'Order processing failed',
                    'webhook_id': webhook_id,
                    'details': processing_result['error_message'],
                    'plugin_name': plugin_name
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            error_msg = f"Generic order processing error: {str(e)}"
            logger.exception(error_msg)
            
            return Response({
                'error': 'Internal server error',
                'webhook_id': webhook_id,
                'message': 'Please contact support if this persists'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def validate_jwt_token(self, token: str, plugin_name: str = None, webhook_id: str = None) -> Optional[User]:
        """
        Validate JWT token from request payload and return associated user.
        Implements single-use token functionality to prevent token reuse.
        
        Args:
            token (str): JWT token from request payload
            plugin_name (str): Name of the plugin using the token
            webhook_id (str): Webhook ID for tracking
            
        Returns:
            User: User object if token is valid and not used, None otherwise
        """
        try:
            # Validate the token
            UntypedToken(token)
            
            # Get user from token
            from rest_framework_simplejwt.tokens import AccessToken
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            jti = access_token.get('jti')  # JWT ID for uniqueness
            
            if not jti:
                logger.warning("JWT token missing jti (JWT ID)")
                return None
            
            # Import here to avoid circular imports
            from wefund.models import UsedJWTToken
            
            # Check if token has already been used
            if UsedJWTToken.is_token_used(jti):
                logger.warning(f"JWT token {jti} has already been used - rejecting reuse attempt")
                return None
            
            # Get user from database
            user = User.objects.get(id=user_id)
            
            # Additional validation - ensure user is active
            if not user.is_active:
                logger.warning(f"Inactive user attempted API access: {user.username}")
                return None
            
            # Mark token as used AFTER all validation passes
            UsedJWTToken.mark_token_used(
                jti=jti,
                plugin_name=plugin_name or 'unknown',
                user_id=str(user_id),
                webhook_id=webhook_id
            )
            
            # Log successful token validation
            logger.info(f"Valid JWT token for user: {user.username} (marked as used)")
            return user
            
        except (InvalidToken, TokenError, User.DoesNotExist) as e:
            logger.warning(f"JWT token validation failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error validating JWT token: {str(e)}")
            return None
    
    def convert_to_woo_format(self, order_data: Dict[str, Any], plugin_name: str) -> Dict[str, Any]:
        """
        Convert generic plugin order data to WooCommerce format for existing serializer.
        
        This allows any plugin to send data in a flexible format while still
        using the existing WooOrderSerializer.
        """
        # Handle different possible data structures from various plugins
        
        # Extract customer information
        customer = order_data.get('customer', {})
        billing = order_data.get('billing', customer)

        # Extract affiliate_code from root
        affiliate_code = order_data.get("affiliate_code")
        
        # Extract order details
        order_id = order_data.get('order_id') or order_data.get('id') or 0
        
        # Extract products/line items
        products = order_data.get('products', order_data.get('line_items', []))
        
        # Convert to WooCommerce format
        woo_data = {
            "id": order_id,
            "status": order_data.get('status', 'completed'),
            "total": str(order_data.get('total', order_data.get('amount', '0.00'))),
            "currency": order_data.get('currency', 'USD'),
            "billing": {
                "first_name": billing.get('first_name', billing.get('firstName', '')),
                "last_name": billing.get('last_name', billing.get('lastName', '')),
                "email": billing.get('email', ''),
                "phone": billing.get('phone', billing.get('telephone', '')),
                "company": billing.get('company', ''),
                "address_1": billing.get('address_1', billing.get('address', billing.get('street', ''))),
                "address_2": billing.get('address_2', billing.get('address_line_2', '')),
                "city": billing.get('city', ''),
                "state": billing.get('state', billing.get('region', '')),
                "postcode": billing.get('postcode', billing.get('zip', billing.get('postal_code', ''))),
                "country": billing.get('country', billing.get('country_code', 'US'))
            },
            "shipping": billing.copy(),  # Use billing as shipping if not provided
            "line_items": self.convert_products_to_line_items(products, plugin_name, affiliate_code=affiliate_code),
            "coupon_lines": order_data.get('coupons', order_data.get('discounts', [])),
            "customer_ip_address": order_data.get('customer_ip', order_data.get('ip_address')),
            "payment_method": order_data.get('payment_method', 'plugin_payment'),
            "customer_id": order_data.get('customer_id', order_data.get('user_id')),
            "order_key": order_data.get('order_key', f"plugin_order_{order_id}_{plugin_name}"),
            "number": str(order_id),
            "transaction_id": order_data.get('transaction_id', order_data.get('payment_id', '')),
            "date_created": order_data.get('date_created', datetime.now().isoformat()),
            "date_paid": order_data.get('date_paid', datetime.now().isoformat())
        }
        
        return woo_data
    
    def convert_products_to_line_items(
        self,
        products: List[Dict],
        plugin_name: str,
        affiliate_code: str = None
    ) -> List[Dict]:

        """Convert generic product data to WooCommerce line items format."""
        line_items = []

        for i, product in enumerate(products):
            meta_data = []

            # ✅ First try to extract from Woo variation attributes
            raw_account_size = None
            raw_broker_type = None
            if "meta_data" in product:
                for meta in product["meta_data"]:
                    if meta.get("key") in ("pa_account-size", "account-size"):
                        raw_account_size = meta.get("value")
                    elif meta.get("key") in ("pa_broker-type", "broker_type"):
                        raw_broker_type = meta.get("value")

            # ✅ Clean account size
            def parse_account_size(val):
                try:
                    return int(str(val).replace("$", "").replace(",", "").strip())
                except Exception:
                    return None

            account_size = (
                parse_account_size(raw_account_size)
                or product.get("account_size")
                or product.get("challenge_size")
                or product.get("trading_account_size")
                or product.get("size")
                or 10000  # Default
            )

            # ✅ Broker type with fallback
            broker_type = (
                raw_broker_type
                or product.get("broker_type")
                or product.get("platform")
                or "mt5"
            )

            # Challenge type fallback
            challenge_type = (
                product.get("challenge_type")
                or product.get("type")
                or product.get("phase")
                or "phase_1"
            )

            # ✅ Include affiliate_code if present at product or order level
            product_affiliate_code = (
                product.get("affiliate_code")
                or product.get("referral_code")
                or affiliate_code
            )

            # Build meta_data
            meta_data.extend([
                {
                    "id": 10000 + i,
                    "key": "pa_account-size",
                    "value": str(account_size),
                    "display_key": "Account Size",
                    "display_value": f"${int(account_size):,}"
                },
                {
                    "id": 20000 + i,
                    "key": "pa_broker-type",
                    "value": broker_type,
                    "display_key": "Broker Type",
                    "display_value": "MetaTrader 5" if broker_type == "mt5" else broker_type
                },
                {
                    "id": 30000 + i,
                    "key": "challenge_type",
                    "value": challenge_type,
                    "display_key": "Challenge Type",
                    "display_value": challenge_type.replace("_", " ").title()
                },
                {
                    "id": 40000 + i,
                    "key": "plugin_source",
                    "value": plugin_name,
                    "display_key": "Source Plugin",
                    "display_value": plugin_name
                }
            ])

            # ✅ Add affiliate_code if present
            if product_affiliate_code:
                meta_data.append({
                    "id": 50000 + i,
                    "key": "affiliate_code",
                    "value": product_affiliate_code,
                    "display_key": "Affiliate Code",
                    "display_value": product_affiliate_code,
                })

            # Append any other plugin-sent metadata
            plugin_metadata = product.get("metadata", {})
            if isinstance(plugin_metadata, dict):
                for key, value in plugin_metadata.items():
                    meta_data.append({
                        "id": 50000 + len(meta_data),
                        "key": key,
                        "value": str(value),
                        "display_key": key.replace("_", " ").title(),
                        "display_value": str(value)
                    })

            line_item = {
                "id": i + 1,
                "name": product.get("name", f"Challenge Account - ${int(account_size):,}"),
                "product_id": product.get("product_id", 1000 + i),
                "variation_id": product.get("variation_id", 0),
                "quantity": int(product.get("quantity", 1)),
                "tax_class": "",
                "subtotal": str(product.get("price", "99.00")),
                "subtotal_tax": "0.00",
                "total": str(product.get("price", "99.00")),
                "total_tax": "0.00",
                "price": float(product.get("price", 99.00)),
                "sku": product.get("sku", f"WEFUND-{account_size}"),
                "taxes": [],
                "meta_data": meta_data
            }

            line_items.append(line_item)

        return line_items
    
    def is_duplicate_order(self, order_id: int, plugin_name: str) -> bool:
        """Check if order has already been processed from this plugin."""
        if not order_id:
            return False
            
        # Check for existing order with same ID
        existing_orders = Order.objects.filter(
            woo_order_id=order_id
        )
        
        # Check if processed recently (within last hour)
        recent_cutoff = timezone.now() - timedelta(hours=1)
        recent_orders = existing_orders.filter(date_created__gt=recent_cutoff)
        
        return recent_orders.exists()
    
    def process_generic_order(
        self, 
        serializer, 
        woo_format_data: Dict[str, Any], 
        processing_options: Dict[str, Any],
        plugin_name: str,
        webhook_id: str
    ) -> Dict[str, Any]:
        """Process order with full WooCommerce-style functionality including Challenge Enrollments."""
        start_time = timezone.now()
        
        try:
            # Create the order using existing serializer (includes user creation and challenge enrollment)
            order = serializer.save()
            order.raw_data = woo_format_data
            order.save(update_fields=["raw_data"])
            
            result = {
                'success': True,
                'order_id': order.id,
                'user_id': order.user.id,
                'plugin_name': plugin_name,
                'webhook_id': webhook_id
            }
            
            # Optional MT5 account creation (includes password generation and MT5 API call)
            if processing_options.get('create_mt5_account', True):
                try:
                    mt5_result = self.create_mt5_account_for_order_with_enrollments(order)
                    result.update(mt5_result)
                    
                    # Update Challenge Enrollments with MT5 details (WooCommerce functionality)
                    self.update_challenge_enrollments_with_mt5(order, mt5_result)
                    
                except Exception as e:
                    logger.error(f"MT5 account creation failed for order {order.id}: {e}")
                    result['mt5_error'] = str(e)
            
            # Optional email notification
            if processing_options.get('send_email', True):
                try:
                    self.send_credentials_email(order, result.get('user_credentials', {}))
                    result['email_sent'] = True
                except Exception as e:
                    logger.error(f"Email notification failed for order {order.id}: {e}")
                    result['email_error'] = str(e)
            
            # Calculate processing time
            processing_time = (timezone.now() - start_time).total_seconds()
            result['processing_time'] = processing_time
            
            logger.info(f"Successfully processed order {order.id} from plugin '{plugin_name}' in {processing_time:.2f}s")
            
            return result
            
        except Exception as e:
            processing_time = (timezone.now() - start_time).total_seconds()
            error_msg = f"Order processing error: {str(e)}"
            logger.exception(error_msg)
            
            return {
                'success': False,
                'error_message': error_msg,
                'processing_time': processing_time,
                'plugin_name': plugin_name,
                'webhook_id': webhook_id
            }
    
    def create_mt5_account_for_order_with_enrollments(self, order: Order) -> Dict[str, Any]:
        """Create MT5 account with full WooCommerce-style functionality including group mapping."""
        # Generate secure passwords
        user_password = generate_mt5_compliant_password().strip()
        mt5_password = generate_mt5_compliant_password().strip()
        investor_password = generate_mt5_compliant_password().strip()
        
        logger.warning(f"Generated passwords -> User: {user_password}, MT5: {mt5_password}, Investor: {investor_password}")
        
        # Set user password
        user = order.user
        user.set_password(user_password)
        user.save(update_fields=["password"])
        
        # Get profile ID
        profile_id = ""
        try:
            profile_id = user.clientprofile.profile_id
        except (AttributeError, ClientProfile.DoesNotExist):
            logger.warning(f"No client profile found for user {user.id}")
        
        # Extract account size from order data with WooCommerce-style extraction
        account_size = self.get_account_size_from_line_items(order.raw_data.get('line_items', []))
        
        # Find the active enrollment linked to this order for group mapping
        from wefund.models import ChallengeEnrollment, ChallengePhase, ChallengePhaseGroupMapping
        enrollment = ChallengeEnrollment.objects.filter(order=order, is_active=True).first()
        mt5_group_name = settings.MT5_GROUP_NAME  # fallback
        
        if enrollment:
            current_phase_type = enrollment.get_current_phase_type()
            try:
                challenge_phase = ChallengePhase.objects.get(
                    challenge=enrollment.challenge,
                    phase_type=current_phase_type
                )
                mapping = challenge_phase.group_mapping
                mt5_group_name = mapping.mt5_group
                logger.info(f"Using MT5 group: {mt5_group_name} for challenge {enrollment.challenge} phase {current_phase_type}")
            except (ChallengePhase.DoesNotExist, ChallengePhaseGroupMapping.DoesNotExist):
                logger.warning(f"No group mapping found for {enrollment.challenge} - {current_phase_type}, using default")
        
        # Create MT5 account using existing MT5Client
        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        
        mt5_payload = [{
            "index": 0,
            "agentAccount": settings.MT5_AGENT_ACCOUNT,
            "canTrade": True,
            "comment": f"Created from {order.raw_data.get('plugin_name', 'WordPress plugin')} order {order.id}",
            "group": {"name": mt5_group_name},
            "hasSendReportEnabled": True,
            "isEnabled": True,
            "leverage": settings.MT5_LEVERAGE,
            "password": mt5_password,
            "investorPassword": investor_password,
            "enable_change_password": True,
            "password_phone": getattr(user, 'phone', '') or "",
            "id": profile_id,
            "status": "RE",
            "user_color": settings.MT5_USER_COLOR,
            "pltAccount": {
                "taxes": settings.MT5_TAX_RATE,
                "balance": account_size
            },
            "user": {
                "address": {
                    "address": order.billing_address.get("address_line_1", ""),
                    "city": order.billing_address.get("city", ""),
                    "state": order.billing_address.get("state", ""),
                    "zipcode": order.billing_address.get("postcode", ""),
                    "country": order.billing_address.get("country", "")
                },
                "name": order.customer_name,
                "email": order.customer_email,
                "phone": order.billing_address.get("phone", "")
            }
        }]
        
        # Log the MT5 payload before sending
        logger.debug("MT5 payload being sent: %s", mt5_payload)
        
        # Send to MT5 API
        mt5_response = mt5_client.add_user(mt5_payload)
        logger.info("MT5 AddUser response: %s", mt5_response)
        
        # Log failure clearly if MT5 creation fails
        if mt5_response.get("systemErrorStatus") or mt5_response.get("applicationStatus"):
            logger.error("MT5 account creation failed: %s", mt5_response)
        
        # Extract account ID
        elem = (mt5_response.get("array") or [{}])[0]
        mt5_account_id = elem.get("accountID")
        
        if not mt5_account_id:
            raise Exception("MT5 account ID not found in response")
        
        # Save all MT5 and user credentials to Order (WooCommerce style)
        order.mt5_payload_sent = mt5_payload
        order.mt5_response = mt5_response
        order.mt5_account_id = mt5_account_id
        order.mt5_password = mt5_password
        order.mt5_investor_password = investor_password
        order.plaintext_password = user_password
        order.save(update_fields=[
            "mt5_payload_sent",
            "mt5_response", 
            "mt5_account_id", 
            "mt5_password", 
            "mt5_investor_password", 
            "plaintext_password"
        ])
        
        return {
            'mt5_account_id': mt5_account_id,
            'mt5_password': mt5_password,
            'mt5_investor_password': investor_password,
            'user_credentials': {
                'username': user.username,
                'password': user_password,
                'mt5_login': mt5_account_id,
                'mt5_password': mt5_password,
                'mt5_investor_password': investor_password
            }
        }
    
    def update_challenge_enrollments_with_mt5(self, order: Order, mt5_result: Dict[str, Any]):
        """Update ChallengeEnrollments linked to this Order with MT5 details (WooCommerce functionality)."""
        try:
            from wefund.models import ChallengeEnrollment
            
            challenge_enrollments = ChallengeEnrollment.objects.filter(
                order=order, 
                is_active=True, 
                mt5_account_id__isnull=True
            )
            
            for enrollment in challenge_enrollments:
                enrollment.mt5_account_id = mt5_result['mt5_account_id']
                enrollment.mt5_password = mt5_result['mt5_password']
                enrollment.mt5_investor_password = mt5_result['mt5_investor_password']
                enrollment.broker_type = "mt5"
                enrollment.save(update_fields=[
                    "mt5_account_id",
                    "mt5_password",
                    "mt5_investor_password",
                    "broker_type",
                    "updated_at"
                ])
                logger.info(f"MT5 details stored for ChallengeEnrollment: {enrollment.id}")
                
        except Exception as e:
            logger.exception(f"Failed to update ChallengeEnrollment MT5 fields for order {order.id}: {str(e)}")
    
    def get_account_size_from_line_items(self, line_items: list) -> float:
        """Extract account size from WooCommerce-style line items."""
        for item in line_items:
            meta_data = item.get("meta_data", [])
            for meta in meta_data:
                if meta.get("key") == "pa_account-size":
                    raw_value = str(meta.get("value", "")).replace(",", "").replace("$", "").strip()
                    try:
                        account_size = float(raw_value)
                        logger.info(f"Extracted account size: {account_size}")
                        return account_size
                    except (ValueError, TypeError):
                        logger.warning(f"Could not parse account size value: {raw_value}")
                        return 10000.0
        logger.warning("pa_account-size not found in any line_items")
        return 10000.0

    def create_mt5_account_for_order(self, order: Order) -> Dict[str, Any]:
        """Create MT5 account using existing logic (kept for backward compatibility)."""
        # Generate secure passwords
        user_password = generate_mt5_compliant_password().strip()
        mt5_password = generate_mt5_compliant_password().strip()
        investor_password = generate_mt5_compliant_password().strip()
        
        # Set user password
        user = order.user
        user.set_password(user_password)
        user.save(update_fields=["password"])
        
        # Get profile ID
        profile_id = ""
        try:
            profile_id = user.clientprofile.profile_id
        except (AttributeError, ClientProfile.DoesNotExist):
            logger.warning(f"No client profile found for user {user.id}")
        
        # Extract account size from order data
        account_size = self.extract_account_size_from_order(order)
        
        # Create MT5 account using existing MT5Client
        mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        
        mt5_payload = [{
            "index": 0,
            "agentAccount": settings.MT5_AGENT_ACCOUNT,
            "canTrade": True,
            "comment": f"Created from {order.raw_data.get('plugin_name', 'WordPress plugin')} order {order.id}",
            "group": {"name": settings.MT5_GROUP_NAME},
            "hasSendReportEnabled": True,
            "isEnabled": True,
            "leverage": settings.MT5_LEVERAGE,
            "password": mt5_password,
            "investorPassword": investor_password,
            "enable_change_password": True,
            "password_phone": getattr(user, 'phone', '') or "",
            "id": profile_id,
            "status": "RE",
            "user_color": settings.MT5_USER_COLOR,
            "pltAccount": {
                "taxes": settings.MT5_TAX_RATE,
                "balance": account_size
            },
            "user": {
                "address": {
                    "address": order.billing_address.get("address_line_1", ""),
                    "city": order.billing_address.get("city", ""),
                    "state": order.billing_address.get("state", ""),
                    "zipcode": order.billing_address.get("postcode", ""),
                    "country": order.billing_address.get("country", "")
                },
                "name": order.customer_name,
                "email": order.customer_email,
                "phone": order.billing_address.get("phone", "")
            }
        }]
        
        # Send to MT5 API
        mt5_response = mt5_client.add_user(mt5_payload)
        
        # Extract account ID
        elem = (mt5_response.get("array") or [{}])[0]
        mt5_account_id = elem.get("accountID")
        
        if not mt5_account_id:
            raise Exception("MT5 account ID not found in response")
        
        # Update order with MT5 details
        order.mt5_account_id = mt5_account_id
        order.mt5_password = mt5_password
        order.mt5_investor_password = investor_password
        order.plaintext_password = user_password
        order.save(update_fields=[
            "mt5_account_id", "mt5_password", 
            "mt5_investor_password", "plaintext_password"
        ])
        
        return {
            'mt5_account_id': mt5_account_id,
            'user_credentials': {
                'username': user.username,
                'password': user_password,
                'mt5_login': mt5_account_id,
                'mt5_password': mt5_password,
                'mt5_investor_password': investor_password
            }
        }
    
    def extract_account_size_from_order(self, order: Order) -> float:
        """Extract account size from order data."""
        try:
            # Try to get from raw_data first
            line_items = order.raw_data.get('line_items', [])
            for item in line_items:
                meta_data = item.get('meta_data', [])
                for meta in meta_data:
                    if meta.get('key') == 'pa_account-size':
                        return float(meta.get('value', 10000))
            
            # Fallback to challenge_account_size field
            if hasattr(order, 'challenge_account_size') and order.challenge_account_size:
                return float(order.challenge_account_size)
            
            # Default
            return 10000.0
            
        except (ValueError, TypeError):
            logger.warning(f"Could not extract account size for order {order.id}, using default")
            return 10000.0
    
    def send_credentials_email(self, order: Order, credentials: Dict[str, str]):
        """Send credentials email to customer."""
        if not credentials:
            return
            
        EmailService.send_user_credentials(
            to_email=order.customer_email,
            subject="WeFund | Your Account & MT5 Login Details",
            context=credentials
        )


class PluginHealthCheckView(APIView):
    """Health check endpoint for any WordPress plugin."""
    
    permission_classes = [AllowAny]
    
    def get(self, request, *args, **kwargs):
        """Return API health status for plugin connectivity verification."""
        try:
            health_data = {
                'status': 'healthy',
                'timestamp': timezone.now().isoformat(),
                'api_version': '1.0',
                'plugin_support': {
                    'woocommerce': True,
                    'custom_plugins': True,
                    'generic_integration': True
                },
                'services': {
                    'database': self.check_database(),
                    'mt5_api': self.check_mt5_api(),
                    'email_service': self.check_email_service(),
                    'authentication': self.check_authentication()
                },
                'endpoints': {
                    'generate_token': '/api/plugin/generate-token/',
                    'refresh_token': '/api/plugin/refresh-token/',
                    'order_processing': '/api/plugin/order/process/',
                    'health_check': '/api/plugin/health/',
                    'test_endpoint': '/api/plugin/test/',
                    'documentation': '/api/plugin/docs/',
                    'postman_collection': '/api/plugin/postman-collection/'
                }
            }
            
            # Determine overall health
            all_services_healthy = all(health_data['services'].values())
            health_data['status'] = 'healthy' if all_services_healthy else 'degraded'
            
            status_code = status.HTTP_200_OK if all_services_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
            
            return Response(health_data, status=status_code)
            
        except Exception as e:
            logger.exception("Plugin health check error")
            return Response({
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    def check_database(self) -> bool:
        """Check database connectivity."""
        try:
            User.objects.first()
            return True
        except Exception:
            return False
    
    def check_mt5_api(self) -> bool:
        """Check MT5 API configuration."""
        return bool(settings.MT5_API_URL and settings.MT5_API_KEY)
    
    def check_email_service(self) -> bool:
        """Check email service configuration."""
        return bool(settings.EMAIL_BACKEND)
    
    def check_authentication(self) -> bool:
        """Check authentication configuration."""
        return bool(getattr(settings, 'WORDPRESS_PLUGIN_API_KEY', None))


@api_view(['POST'])
@permission_classes([AllowAny])
def test_plugin_endpoint(request):
    """Test endpoint for any WordPress plugin to validate integration."""
    try:
        plugin_name = request.data.get('plugin_name', 'unknown-plugin')
        
        logger.info(f"Test request from plugin: {plugin_name}")
        
        # Validate that it's a test request
        if not request.data.get('test_mode'):
            return Response({
                'error': 'This endpoint is for testing only',
                'required_field': 'test_mode: true'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Echo back received data with validation results
        response_data = {
            'message': 'Test request received successfully',
            'plugin_name': plugin_name,
            'received_data': request.data,
            'validation_results': {
                'content_type': request.content_type,
                'method': request.method,
                'body_size': len(request.body) if request.body else 0,
                'has_auth_header': bool(request.META.get('HTTP_AUTHORIZATION')),
                'timestamp': timezone.now().isoformat(),
                'supported_data_formats': [
                    'WooCommerce format',
                    'Generic order format', 
                    'Custom plugin format'
                ]
            },
            'next_steps': [
                'Authenticate using /api/plugin/auth/',
                'Send order data to /api/plugin/order/process/',
                'Monitor processing via response data'
            ]
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.exception("Test plugin endpoint error")
        return Response({
            'error': 'Test endpoint failed',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def plugin_documentation_view(request):
    """Provide comprehensive documentation for any WordPress plugin integration."""
    
    base_url = request.build_absolute_uri('/api/')
    
    documentation = {
        'api_info': {
            'name': 'WeFund Universal WordPress Plugin API',
            'version': '1.0',
            'description': 'Universal API for any WordPress plugin to integrate with WeFund',
            'base_url': base_url
        },
        'supported_plugins': [
            'WooCommerce',
            'Easy Digital Downloads',
            'Custom E-commerce plugins',
            'Membership plugins',
            'Any WordPress plugin that processes orders/payments'
        ],
        'authentication': {
            'token_generation': {
                'endpoint': '/api/plugin/generate-token/',
                'method': 'POST',
                'description': 'Generate JWT tokens for WordPress plugins (one-time setup)',
                'required_fields': {
                    'plugin_name': 'Name of your WordPress plugin',
                    'plugin_key': 'Your API key provided by WeFund',
                    'plugin_version': 'Version of your plugin',
                    'site_url': 'Your WordPress site URL'
                },
                'optional_fields': {
                    'token_duration_hours': 'Token validity duration (default: 24 hours)'
                },
                'response_fields': {
                    'jwt_token': 'JWT access token for API requests',
                    'refresh_token': 'Refresh token for renewing expired JWT tokens',
                    'expires_in_hours': 'Token expiration time in hours',
                    'expires_in_seconds': 'Token expiration time in seconds'
                }
            },
            'token_refresh': {
                'endpoint': '/api/plugin/refresh-token/',
                'method': 'POST',
                'description': 'Refresh expired JWT tokens using refresh token',
                'required_fields': {
                    'refresh_token': 'Refresh token obtained from token generation',
                    'plugin_name': 'Name of your WordPress plugin'
                },
                'response_fields': {
                    'jwt_token': 'New JWT access token',
                    'refresh_token': 'New refresh token (if rotation enabled)',
                    'expires_in_hours': 'New token expiration time in hours',
                    'refreshed_at': 'Timestamp when token was refreshed'
                },
                'usage_notes': [
                    'Call this endpoint when your JWT token expires',
                    'Store the new tokens securely in WordPress',
                    'Implement automatic refresh in your plugin for seamless operation'
                ]
            },
            'usage': 'Include jwt_token in your order processing request payload'
        },
        'order_processing': {
            'endpoint': '/api/plugin/order/process/',
            'method': 'POST',
            'authentication': 'Bearer JWT token',
            'description': 'Process order from any WordPress plugin',
            'flexible_format': {
                'description': 'Accepts various order data formats and converts them internally',
                'supported_formats': [
                    'WooCommerce order format',
                    'Generic order format with customer/products',
                    'Custom plugin format'
                ]
            },
            'required_fields': {
                'jwt_token': 'JWT token obtained from /api/plugin/generate-token/',
                'plugin_name': 'Name of the sending plugin',
                'order_data': 'Order information as JSON object/dictionary (not string)'
            },
            'order_data_fields': {
                'order_id': 'Unique order identifier',
                'customer': 'Customer information (billing details)',
                'products': 'Array of products/services purchased',
                'total': 'Order total amount',
                'status': 'Order status (completed/processing)'
            },
            'processing_options': {
                'create_mt5_account': 'boolean - Create MT5 trading account (default: true)',
                'send_email': 'boolean - Send credentials email (default: true)',
                'create_user': 'boolean - Create user account (default: true)'
            }
        },
        'endpoints': {
            '/api/plugin/generate-token/': 'Generate JWT token (one-time setup)',
            '/api/plugin/refresh-token/': 'Refresh expired JWT tokens',
            '/api/plugin/order/process/': 'Universal order processing',
            '/api/plugin/health/': 'API health check',
            '/api/plugin/test/': 'Test integration',
            '/api/plugin/docs/': 'This documentation',
            '/api/plugin/postman-collection/': 'Download Postman collection'
        },
        'examples': {
            'token_generation_example': {
                'endpoint': '/api/plugin/generate-token/',
                'request': {
                    'plugin_name': 'WooCommerce Integration',
                    'plugin_key': 'your-api-key-from-wefund',
                    'plugin_version': '1.0.0',
                    'site_url': 'https://your-wordpress-site.com',
                    'token_duration_hours': 168
                },
                'response': {
                    'jwt_token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU4Mjc3Nzg2fQ.example',
                    'refresh_token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc2MDc4MzM4Nn0.example',
                    'expires_in_hours': 168,
                    'expires_in_seconds': 604800
                }
            },
            'token_refresh_example': {
                'endpoint': '/api/plugin/refresh-token/',
                'request': {
                    'refresh_token': 'your-refresh-token-here',
                    'plugin_name': 'WooCommerce Integration'
                },
                'response': {
                    'jwt_token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU4Mjc3Nzg2fQ.refreshed',
                    'refresh_token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc2MDc4MzM4Nn0.refreshed',
                    'expires_in_hours': 1,
                    'refreshed_at': '2025-09-18T10:30:00Z'
                }
            },
            'woocommerce_order_example': {
                'endpoint': '/api/plugin/order/process/',
                'request': {
                    'jwt_token': 'your-jwt-token-here',
                    'plugin_name': 'WooCommerce Integration',
                    'order_data': {
                        'order_id': 12345,
                        'customer': {
                            'first_name': 'John',
                            'last_name': 'Doe',
                            'email': 'john@example.com'
                        },
                        'products': [
                            {
                                'name': 'Challenge Account - $100K',
                                'account_size': '100000',
                                'price': '399.00'
                            }
                        ],
                        'total': '399.00',
                        'status': 'completed'
                    },
                    'processing_options': {
                        'create_mt5_account': True,
                        'send_email': True
                    }
                }
            },
            'generic_format': {
                'plugin_name': 'Custom Trading Plugin',
                'order_data': {
                    'id': 67890,
                    'customer': {
                        'firstName': 'Jane',
                        'lastName': 'Smith', 
                        'email': 'jane@example.com',
                        'address': '123 Trading St'
                    },
                    'products': [
                        {
                            'title': 'Pro Trading Account',
                            'challenge_size': '50000',
                            'amount': '249.00',
                            'type': 'phase_1'
                        }
                    ],
                    'amount': '249.00',
                    'status': 'paid'
                },
                'processing_options': {
                    'create_mt5_account': True,
                    'send_email': True
                }
            }
        },
        'workflow': {
            'step_1_initial_setup': {
                'description': 'Generate JWT tokens for your plugin (one-time setup)',
                'endpoint': '/api/plugin/generate-token/',
                'example_request': {
                    'plugin_name': 'Your Plugin Name',
                    'plugin_key': 'your-api-key-from-wefund',
                    'plugin_version': '1.0.0',
                    'site_url': 'https://your-site.com',
                    'token_duration_hours': 168
                },
                'store_response': 'Store jwt_token and refresh_token securely in WordPress options'
            },
            'step_2_process_orders': {
                'description': 'Process orders by including JWT token in payload',
                'endpoint': '/api/plugin/order/process/',
                'example_request': {
                    'jwt_token': 'your-stored-jwt-token',
                    'plugin_name': 'Your Plugin Name',
                    'order_data': {'order_id': 123, 'customer': {'email': 'test@example.com'}, 'products': [{'name': 'Test Product', 'account_size': '10000'}]},
                    'processing_options': {
                        'create_mt5_account': True,
                        'send_email': True
                    }
                },
                'note': 'No Authorization header needed - JWT is in payload'
            },
            'step_3_refresh_tokens': {
                'description': 'Refresh JWT tokens when they expire',
                'endpoint': '/api/plugin/refresh-token/',
                'when_to_use': 'When you receive 401 Unauthorized response',
                'example_request': {
                    'refresh_token': 'your-stored-refresh-token',
                    'plugin_name': 'Your Plugin Name'
                },
                'automation_tip': 'Implement automatic refresh in your plugin error handling'
            }
        },
        'best_practices': {
            'token_management': [
                'Store JWT and refresh tokens securely in WordPress options',
                'Set appropriate token duration (recommended: 7 days)',
                'Each JWT token can only be used ONCE for order processing',
                'Generate new tokens for each order processing request',
                'Implement automatic token refresh on 401 errors',
                'Log token refresh events for monitoring'
            ],
            'error_handling': [
                'Always check response status codes',
                'Implement retry logic with token refresh',
                'Log API errors for debugging',
                'Provide user-friendly error messages'
            ],
            'security': [
                'Never expose JWT tokens in client-side code',
                'Use HTTPS for all API communication',
                'Validate order data before sending to API',
                'Implement rate limiting in your plugin if needed'
            ]
        }
    }
    
    return Response(documentation, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_universal_postman_collection(request):
    """
    Generate a Postman collection for universal WordPress plugin API testing.
    """
    
    base_url = request.build_absolute_uri('/api/')
    
    collection = {
        "info": {
            "name": "WeFund Universal WordPress Plugin API",
            "description": "Complete API collection for any WordPress plugin integration with WeFund",
            "version": "1.0.0",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "variable": [
            {
                "key": "base_url",
                "value": base_url,
                "type": "string"
            },
            {
                "key": "plugin_api_key",
                "value": "your-plugin-api-key",
                "type": "string"
            },
            {
                "key": "jwt_token",
                "value": "",
                "type": "string"
            },
            {
                "key": "refresh_token",
                "value": "",
                "type": "string"
            }
        ],
        "item": [
            {
                "name": "Plugin Authentication",
                "item": [
                    {
                        "name": "Generate JWT Token",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "plugin_name": "Your Plugin Name",
                                    "plugin_key": "{{plugin_api_key}}",
                                    "plugin_version": "1.0.0",
                                    "site_url": "https://your-wordpress-site.com",
                                    "token_duration_hours": 24
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}plugin/generate-token/",
                                "host": ["{{base_url}}"],
                                "path": ["plugin", "generate-token", ""]
                            }
                        },
                        "event": [
                            {
                                "listen": "test",
                                "script": {
                                    "exec": [
                                        "if (pm.response.code === 200) {",
                                        "    const response = pm.response.json();",
                                        "    pm.environment.set('jwt_token', response.jwt_token);",
                                        "    pm.environment.set('refresh_token', response.refresh_token);",
                                        "    console.log('JWT token saved:', response.jwt_token);",
                                        "    console.log('Refresh token saved:', response.refresh_token);",
                                        "}"
                                    ]
                                }
                            }
                        ]
                    },
                    {
                        "name": "Refresh JWT Token",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "refresh_token": "{{refresh_token}}",
                                    "plugin_name": "Your Plugin Name"
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}plugin/refresh-token/",
                                "host": ["{{base_url}}"],
                                "path": ["plugin", "refresh-token", ""]
                            }
                        },
                        "event": [
                            {
                                "listen": "test",
                                "script": {
                                    "exec": [
                                        "if (pm.response.code === 200) {",
                                        "    const response = pm.response.json();",
                                        "    pm.environment.set('jwt_token', response.jwt_token);",
                                        "    pm.environment.set('refresh_token', response.refresh_token);",
                                        "    console.log('Tokens refreshed successfully');",
                                        "}"
                                    ]
                                }
                            }
                        ]
                    }
                ]
            },
            {
                "name": "Order Processing",
                "item": [
                    {
                        "name": "Process WooCommerce Order",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "jwt_token": "{{jwt_token}}",
                                    "plugin_name": "WooCommerce Integration",
                                    "order_data": {
                                        "order_id": 12345,
                                        "customer": {
                                            "first_name": "John",
                                            "last_name": "Doe",
                                            "email": "john.doe@example.com",
                                            "phone": "+1234567890",
                                            "address_1": "123 Main St",
                                            "city": "New York",
                                            "state": "NY",
                                            "postcode": "10001",
                                            "country": "US"
                                        },
                                        "products": [
                                            {
                                                "name": "Challenge Account - $100K",
                                                "account_size": "100000",
                                                "broker_type": "mt5",
                                                "price": "399.00",
                                                "challenge_type": "phase_1"
                                            }
                                        ],
                                        "total": "399.00",
                                        "status": "completed",
                                        "payment_method": "stripe"
                                    },
                                    "processing_options": {
                                        "create_mt5_account": True,
                                        "send_email": True,
                                        "create_user": True
                                    }
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}plugin/order/process/",
                                "host": ["{{base_url}}"],
                                "path": ["plugin", "order", "process", ""]
                            }
                        }
                    },
                    {
                        "name": "Process EDD Order",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "jwt_token": "{{jwt_token}}",
                                    "plugin_name": "Easy Digital Downloads",
                                    "order_data": {
                                        "id": 67890,
                                        "customer": {
                                            "firstName": "Jane",
                                            "lastName": "Smith",
                                            "email": "jane@example.com",
                                            "telephone": "+1234567890",
                                            "street": "456 Trading Ave",
                                            "city": "Los Angeles",
                                            "region": "CA",
                                            "zip": "90210",
                                            "country_code": "US"
                                        },
                                        "products": [
                                            {
                                                "title": "Pro Trading Package",
                                                "challenge_size": "50000",
                                                "platform": "mt5",
                                                "amount": "249.00",
                                                "type": "phase_1"
                                            }
                                        ],
                                        "amount": "249.00",
                                        "status": "completed"
                                    },
                                    "processing_options": {
                                        "create_mt5_account": True,
                                        "send_email": True
                                    }
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}plugin/order/process/",
                                "host": ["{{base_url}}"],
                                "path": ["plugin", "order", "process", ""]
                            }
                        }
                    },
                    {
                        "name": "Process Custom Plugin Order",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "jwt_token": "{{jwt_token}}",
                                    "plugin_name": "Custom Trading Plugin",
                                    "order_data": {
                                        "order_id": 98765,
                                        "customer": {
                                            "name": "Mike Johnson",
                                            "email": "mike@example.com",
                                            "contact": "+1234567890",
                                            "location": {
                                                "address": "789 Finance St",
                                                "city": "Chicago",
                                                "state": "IL",
                                                "postal_code": "60601",
                                                "country": "US"
                                            }
                                        },
                                        "products": [
                                            {
                                                "name": "Premium Challenge",
                                                "trading_account_size": "200000",
                                                "broker": "mt5",
                                                "price": "649.00",
                                                "phase": "phase_1"
                                            }
                                        ],
                                        "total": "649.00",
                                        "status": "paid"
                                    }
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}plugin/order/process/",
                                "host": ["{{base_url}}"],
                                "path": ["plugin", "order", "process", ""]
                            }
                        }
                    }
                ]
            },
            {
                "name": "Health & Testing",
                "item": [
                    {
                        "name": "Plugin Health Check",
                        "request": {
                            "method": "GET",
                            "url": {
                                "raw": "{{base_url}}plugin/health/",
                                "host": ["{{base_url}}"],
                                "path": ["plugin", "health", ""]
                            }
                        }
                    },
                    {
                        "name": "Test Plugin Integration",
                        "request": {
                            "method": "POST",
                            "header": [
                                {
                                    "key": "Content-Type",
                                    "value": "application/json"
                                }
                            ],
                            "body": {
                                "mode": "raw",
                                "raw": json.dumps({
                                    "test_mode": True,
                                    "plugin_name": "Test Plugin",
                                    "test_data": {
                                        "message": "This is a test from Postman",
                                        "timestamp": datetime.now().isoformat()
                                    }
                                }, indent=2)
                            },
                            "url": {
                                "raw": "{{base_url}}plugin/test/",
                                "host": ["{{base_url}}"],
                                "path": ["plugin", "test", ""]
                            }
                        }
                    }
                ]
            },
            {
                "name": "Documentation",
                "item": [
                    {
                        "name": "Get API Documentation",
                        "request": {
                            "method": "GET",
                            "url": {
                                "raw": "{{base_url}}plugin/docs/",
                                "host": ["{{base_url}}"],
                                "path": ["plugin", "docs", ""]
                            }
                        }
                    }
                ]
            }
        ]
    }
    
    response = JsonResponse(collection)
    response['Content-Disposition'] = 'attachment; filename="WeFund-Universal-Plugin-API.postman_collection.json"'
    return response