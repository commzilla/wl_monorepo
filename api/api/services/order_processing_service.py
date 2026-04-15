"""
Optimized Order Processing Service for WordPress Integration.

This service provides a robust, optimized order processing pipeline with
comprehensive error handling, retry logic, and performance monitoring.

Classes:
    ProcessingStage: Enum defining order processing stages
    ProcessingStatus: Enum defining processing status for each stage
    ProcessingResult: Dataclass for order processing operation results
    OrderProcessingContext: Dataclass for order processing context
    OrderProcessingService: Main service class for processing WooCommerce orders

Constants:
    order_processing_service: Service instance for dependency injection
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass
from enum import Enum

from django.conf import settings
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.core.cache import cache

from ..serializers import WooOrderSerializer
from ..services.mt5_client import MT5Client
from ..services.email_service import EmailService
from ..utils.security import generate_mt5_compliant_password
from wefund.models import Order, ChallengeEnrollment, User, ClientProfile
from wefund.models import WebhookProcessingLog

logger = logging.getLogger(__name__)


class ProcessingStage(Enum):
    """Order processing stages for tracking and monitoring."""
    VALIDATION = "validation"
    ORDER_CREATION = "order_creation"
    USER_SETUP = "user_setup"
    MT5_ACCOUNT_CREATION = "mt5_account_creation"
    ENROLLMENT_UPDATE = "enrollment_update"
    EMAIL_NOTIFICATION = "email_notification"
    COMPLETION = "completion"


class ProcessingStatus(Enum):
    """Processing status for each stage."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    RETRY = "retry"


@dataclass
class ProcessingResult:
    """Result of order processing operation."""
    success: bool
    order_id: Optional[int] = None
    mt5_account_id: Optional[str] = None
    error_message: Optional[str] = None
    processing_time: Optional[float] = None
    stage_results: Dict[str, Any] = None


@dataclass
class OrderProcessingContext:
    """Context object for order processing."""
    webhook_id: str
    raw_data: Dict[str, Any]
    order: Optional[Order] = None
    user: Optional[User] = None
    mt5_credentials: Optional[Dict[str, str]] = None
    processing_start_time: Optional[datetime] = None
    current_stage: Optional[ProcessingStage] = None


class OrderProcessingService:
    """
    Optimized service for processing WooCommerce orders with comprehensive
    error handling, monitoring, and retry capabilities.
    """
    
    def __init__(self):
        self.mt5_client = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
        self.max_retries = getattr(settings, 'ORDER_PROCESSING_MAX_RETRIES', 3)
        self.retry_delay_base = getattr(settings, 'ORDER_PROCESSING_RETRY_DELAY', 2)
    
    def process_order(self, webhook_id: str, raw_data: Dict[str, Any]) -> ProcessingResult:
        """
        Main entry point for order processing with comprehensive error handling.
        """
        context = OrderProcessingContext(
            webhook_id=webhook_id,
            raw_data=raw_data,
            processing_start_time=timezone.now()
        )
        
        try:
            self._log_processing_stage(context, ProcessingStage.VALIDATION, ProcessingStatus.IN_PROGRESS)
            
            # Stage 1: Validate order data
            validation_result = self._validate_order_data(context)
            if not validation_result.success:
                return validation_result
            
            # Stage 2: Check for duplicates and create order
            order_creation_result = self._create_order_with_duplicate_check(context)
            if not order_creation_result.success:
                return order_creation_result
            
            # Stage 3: Setup user credentials
            user_setup_result = self._setup_user_credentials(context)
            if not user_setup_result.success:
                return user_setup_result
            
            # Stage 4: Create MT5 account with retry logic
            mt5_result = self._create_mt5_account_with_retry(context)
            if not mt5_result.success:
                return mt5_result
            
            # Stage 5: Update challenge enrollments
            enrollment_result = self._update_challenge_enrollments(context)
            if not enrollment_result.success:
                return enrollment_result
            
            # Stage 6: Send email notification (non-blocking)
            email_result = self._send_email_notification(context)
            # Don't fail the entire process if email fails
            
            # Stage 7: Complete processing
            self._complete_processing(context)
            
            processing_time = (timezone.now() - context.processing_start_time).total_seconds()
            
            return ProcessingResult(
                success=True,
                order_id=context.order.id,
                mt5_account_id=context.mt5_credentials.get('account_id'),
                processing_time=processing_time,
                stage_results={
                    'validation': True,
                    'order_creation': True,
                    'user_setup': True,
                    'mt5_creation': True,
                    'enrollment_update': True,
                    'email_sent': email_result.success
                }
            )
            
        except Exception as e:
            logger.exception(f"Unexpected error in order processing for webhook {webhook_id}")
            self._log_processing_stage(
                context, 
                context.current_stage or ProcessingStage.VALIDATION,
                ProcessingStatus.FAILED,
                error_message=str(e)
            )
            
            processing_time = (timezone.now() - context.processing_start_time).total_seconds()
            
            return ProcessingResult(
                success=False,
                order_id=getattr(context.order, 'id', None),
                error_message=f"Unexpected error: {str(e)}",
                processing_time=processing_time
            )
    
    def _validate_order_data(self, context: OrderProcessingContext) -> ProcessingResult:
        """Validate incoming order data."""
        context.current_stage = ProcessingStage.VALIDATION
        
        try:
            # Check if order data exists
            if not context.raw_data:
                error_msg = "Empty order data received"
                self._log_processing_stage(context, ProcessingStage.VALIDATION, ProcessingStatus.FAILED, error_msg)
                return ProcessingResult(success=False, error_message=error_msg)
            
            # Validate with serializer
            serializer = WooOrderSerializer(data=context.raw_data)
            if not serializer.is_valid():
                error_msg = f"Invalid order data: {serializer.errors}"
                self._log_processing_stage(context, ProcessingStage.VALIDATION, ProcessingStatus.FAILED, error_msg)
                return ProcessingResult(success=False, error_message=error_msg)
            
            # Check required fields
            required_fields = ['id', 'status', 'total', 'billing', 'line_items']
            missing_fields = [field for field in required_fields if not context.raw_data.get(field)]
            
            if missing_fields:
                error_msg = f"Missing required fields: {missing_fields}"
                self._log_processing_stage(context, ProcessingStage.VALIDATION, ProcessingStatus.FAILED, error_msg)
                return ProcessingResult(success=False, error_message=error_msg)
            
            # Validate order status
            valid_statuses = ['processing', 'completed']
            if context.raw_data.get('status') not in valid_statuses:
                error_msg = f"Invalid order status: {context.raw_data.get('status')}. Must be one of: {valid_statuses}"
                self._log_processing_stage(context, ProcessingStage.VALIDATION, ProcessingStatus.FAILED, error_msg)
                return ProcessingResult(success=False, error_message=error_msg)
            
            self._log_processing_stage(context, ProcessingStage.VALIDATION, ProcessingStatus.SUCCESS)
            return ProcessingResult(success=True)
            
        except Exception as e:
            error_msg = f"Validation error: {str(e)}"
            logger.exception(error_msg)
            self._log_processing_stage(context, ProcessingStage.VALIDATION, ProcessingStatus.FAILED, error_msg)
            return ProcessingResult(success=False, error_message=error_msg)
    
    def _create_order_with_duplicate_check(self, context: OrderProcessingContext) -> ProcessingResult:
        """Create order with duplicate detection and handling."""
        context.current_stage = ProcessingStage.ORDER_CREATION
        
        try:
            woo_order_id = context.raw_data.get('id')
            
            # Check for duplicate processing
            existing_order = Order.objects.filter(woo_order_id=woo_order_id).first()
            if existing_order:
                # Check if it's a recent duplicate (within last hour)
                if existing_order.date_created > timezone.now() - timedelta(hours=1):
                    logger.warning(f"Duplicate order processing attempt for WooCommerce order {woo_order_id}")
                    return ProcessingResult(
                        success=True,
                        order_id=existing_order.id,
                        error_message="Order already processed (duplicate)"
                    )
                else:
                    # Old order, might be legitimate update
                    logger.info(f"Processing update for existing order {woo_order_id}")
            
            # Use database transaction for atomicity
            with transaction.atomic():
                serializer = WooOrderSerializer(data=context.raw_data)
                if not serializer.is_valid():
                    error_msg = f"Serializer validation failed: {serializer.errors}"
                    self._log_processing_stage(context, ProcessingStage.ORDER_CREATION, ProcessingStatus.FAILED, error_msg)
                    return ProcessingResult(success=False, error_message=error_msg)
                
                # Create the order
                context.order = serializer.save()
                context.order.raw_data = context.raw_data
                context.order.save(update_fields=['raw_data'])
                context.user = context.order.user
                
                # Cache order for quick lookup
                cache.set(f"order_{context.order.id}", context.order, 3600)  # 1 hour
                
                self._log_processing_stage(
                    context, 
                    ProcessingStage.ORDER_CREATION, 
                    ProcessingStatus.SUCCESS,
                    details={'order_id': context.order.id, 'user_id': context.user.id}
                )
                
                return ProcessingResult(success=True, order_id=context.order.id)
                
        except IntegrityError as e:
            # Handle race condition for duplicate orders
            error_msg = f"Order creation integrity error (likely duplicate): {str(e)}"
            logger.warning(error_msg)
            self._log_processing_stage(context, ProcessingStage.ORDER_CREATION, ProcessingStatus.FAILED, error_msg)
            return ProcessingResult(success=False, error_message=error_msg)
            
        except Exception as e:
            error_msg = f"Order creation error: {str(e)}"
            logger.exception(error_msg)
            self._log_processing_stage(context, ProcessingStage.ORDER_CREATION, ProcessingStatus.FAILED, error_msg)
            return ProcessingResult(success=False, error_message=error_msg)
    
    def _setup_user_credentials(self, context: OrderProcessingContext) -> ProcessingResult:
        """Setup user credentials with secure password generation."""
        context.current_stage = ProcessingStage.USER_SETUP
        
        try:
            if not context.user:
                error_msg = "User not found in context"
                self._log_processing_stage(context, ProcessingStage.USER_SETUP, ProcessingStatus.FAILED, error_msg)
                return ProcessingResult(success=False, error_message=error_msg)
            
            # Generate secure passwords
            user_password = generate_mt5_compliant_password().strip()
            mt5_password = generate_mt5_compliant_password().strip()
            investor_password = generate_mt5_compliant_password().strip()
            
            # Set user password
            context.user.set_password(user_password)
            context.user.save(update_fields=['password'])
            
            # Store credentials in context
            context.mt5_credentials = {
                'user_password': user_password,
                'mt5_password': mt5_password,
                'investor_password': investor_password
            }
            
            self._log_processing_stage(
                context, 
                ProcessingStage.USER_SETUP, 
                ProcessingStatus.SUCCESS,
                details={'user_id': context.user.id}
            )
            
            return ProcessingResult(success=True)
            
        except Exception as e:
            error_msg = f"User setup error: {str(e)}"
            logger.exception(error_msg)
            self._log_processing_stage(context, ProcessingStage.USER_SETUP, ProcessingStatus.FAILED, error_msg)
            return ProcessingResult(success=False, error_message=error_msg)
    
    def _create_mt5_account_with_retry(self, context: OrderProcessingContext) -> ProcessingResult:
        """Create MT5 account with retry logic and comprehensive error handling."""
        context.current_stage = ProcessingStage.MT5_ACCOUNT_CREATION
        
        for attempt in range(self.max_retries):
            try:
                self._log_processing_stage(
                    context, 
                    ProcessingStage.MT5_ACCOUNT_CREATION, 
                    ProcessingStatus.IN_PROGRESS,
                    details={'attempt': attempt + 1, 'max_attempts': self.max_retries}
                )
                
                result = self._create_mt5_account(context)
                if result.success:
                    return result
                
                # If this is the last attempt, return the failure
                if attempt == self.max_retries - 1:
                    return result
                
                # Wait before retry with exponential backoff
                delay = self.retry_delay_base ** (attempt + 1)
                logger.warning(f"MT5 account creation attempt {attempt + 1} failed, retrying in {delay} seconds")
                time.sleep(delay)
                
            except Exception as e:
                error_msg = f"MT5 account creation attempt {attempt + 1} failed: {str(e)}"
                logger.exception(error_msg)
                
                if attempt == self.max_retries - 1:
                    self._log_processing_stage(context, ProcessingStage.MT5_ACCOUNT_CREATION, ProcessingStatus.FAILED, error_msg)
                    return ProcessingResult(success=False, error_message=error_msg)
        
        # Should not reach here
        return ProcessingResult(success=False, error_message="MT5 account creation failed after all retries")
    
    def _create_mt5_account(self, context: OrderProcessingContext) -> ProcessingResult:
        """Create MT5 account (single attempt)."""
        try:
            from wefund.models import ChallengePhase, ChallengePhaseGroupMapping
            
            # Get profile ID
            profile_id = ""
            try:
                profile_id = context.user.clientprofile.profile_id
            except (AttributeError, ClientProfile.DoesNotExist):
                logger.warning(f"No client profile found for user {context.user.id}")
            
            # Extract account size from line items
            account_size = self._extract_account_size(context.raw_data.get("line_items", []))
            
            # Determine MT5 group
            mt5_group_name = self._determine_mt5_group(context)
            
            # Prepare MT5 payload
            mt5_payload = [{
                "index": 0,
                "agentAccount": settings.MT5_AGENT_ACCOUNT,
                "canTrade": True,
                "comment": f"Created from WooCommerce order {context.order.id} via WordPress plugin",
                "group": {"name": mt5_group_name},
                "hasSendReportEnabled": True,
                "isEnabled": True,
                "leverage": settings.MT5_LEVERAGE,
                "password": context.mt5_credentials['mt5_password'],
                "investorPassword": context.mt5_credentials['investor_password'],
                "enable_change_password": True,
                "password_phone": getattr(context.user, 'phone', '') or "",
                "id": profile_id,
                "status": "RE",
                "user_color": settings.MT5_USER_COLOR,
                "pltAccount": {
                    "taxes": settings.MT5_TAX_RATE,
                    "balance": account_size
                },
                "user": {
                    "address": {
                        "address": context.order.billing_address.get("address_line_1", ""),
                        "city": context.order.billing_address.get("city", ""),
                        "state": context.order.billing_address.get("state", ""),
                        "zipcode": context.order.billing_address.get("postcode", ""),
                        "country": context.order.billing_address.get("country", "")
                    },
                    "name": context.order.customer_name,
                    "email": context.order.customer_email,
                    "phone": context.order.billing_address.get("phone", "")
                }
            }]
            
            # Log the MT5 payload (without passwords)
            safe_payload = self._sanitize_mt5_payload_for_logging(mt5_payload)
            logger.info(f"Sending MT5 account creation request for order {context.order.id}: {safe_payload}")
            
            # Send request to MT5
            mt5_response = self.mt5_client.add_user(mt5_payload)
            logger.info(f"MT5 API response for order {context.order.id}: {mt5_response}")
            
            # Check for MT5 API errors
            if mt5_response.get("systemErrorStatus") or mt5_response.get("applicationStatus"):
                error_msg = f"MT5 API returned error: {mt5_response}"
                logger.error(error_msg)
                return ProcessingResult(success=False, error_message=error_msg)
            
            # Extract account ID
            elem = (mt5_response.get("array") or [{}])[0]
            mt5_account_id = elem.get("accountID")
            
            if not mt5_account_id:
                error_msg = "MT5 account ID not found in response"
                logger.error(f"{error_msg}. Response: {mt5_response}")
                return ProcessingResult(success=False, error_message=error_msg)
            
            # Store MT5 credentials
            context.mt5_credentials['account_id'] = mt5_account_id
            
            # Update order with MT5 details
            context.order.mt5_payload_sent = mt5_payload
            context.order.mt5_response = mt5_response
            context.order.mt5_account_id = mt5_account_id
            context.order.mt5_password = context.mt5_credentials['mt5_password']
            context.order.mt5_investor_password = context.mt5_credentials['investor_password']
            context.order.plaintext_password = context.mt5_credentials['user_password']
            context.order.save(update_fields=[
                "mt5_payload_sent", "mt5_response", "mt5_account_id",
                "mt5_password", "mt5_investor_password", "plaintext_password"
            ])
            
            self._log_processing_stage(
                context, 
                ProcessingStage.MT5_ACCOUNT_CREATION, 
                ProcessingStatus.SUCCESS,
                details={
                    'mt5_account_id': mt5_account_id,
                    'account_size': account_size,
                    'mt5_group': mt5_group_name
                }
            )
            
            return ProcessingResult(success=True)
            
        except Exception as e:
            error_msg = f"MT5 account creation error: {str(e)}"
            logger.exception(error_msg)
            return ProcessingResult(success=False, error_message=error_msg)
    
    def _update_challenge_enrollments(self, context: OrderProcessingContext) -> ProcessingResult:
        """Update challenge enrollments with MT5 account details."""
        context.current_stage = ProcessingStage.ENROLLMENT_UPDATE
        
        try:
            challenge_enrollments = ChallengeEnrollment.objects.filter(
                order=context.order,
                is_active=True,
                mt5_account_id__isnull=True
            )
            
            updated_count = 0
            for enrollment in challenge_enrollments:
                enrollment.mt5_account_id = context.mt5_credentials['account_id']
                enrollment.mt5_password = context.mt5_credentials['mt5_password']
                enrollment.mt5_investor_password = context.mt5_credentials['investor_password']
                enrollment.broker_type = "mt5"
                enrollment.save(update_fields=[
                    "mt5_account_id", "mt5_password", "mt5_investor_password",
                    "broker_type", "updated_at"
                ])
                updated_count += 1
                logger.info(f"Updated ChallengeEnrollment {enrollment.id} with MT5 details")
            
            self._log_processing_stage(
                context, 
                ProcessingStage.ENROLLMENT_UPDATE, 
                ProcessingStatus.SUCCESS,
                details={'enrollments_updated': updated_count}
            )
            
            return ProcessingResult(success=True)
            
        except Exception as e:
            error_msg = f"Challenge enrollment update error: {str(e)}"
            logger.exception(error_msg)
            self._log_processing_stage(context, ProcessingStage.ENROLLMENT_UPDATE, ProcessingStatus.FAILED, error_msg)
            return ProcessingResult(success=False, error_message=error_msg)
    
    def _send_email_notification(self, context: OrderProcessingContext) -> ProcessingResult:
        """Send email notification with credentials."""
        context.current_stage = ProcessingStage.EMAIL_NOTIFICATION
        
        try:
            email_context = {
                'username': context.user.username,
                'password': context.mt5_credentials['user_password'],
                'mt5_login': context.mt5_credentials['account_id'],
                'mt5_password': context.mt5_credentials['mt5_password'],
            }
            
            EmailService.send_user_credentials(
                to_email=context.user.email,
                subject="WeFund | Your Account & MT5 Login Details",
                context=email_context
            )
            
            self._log_processing_stage(
                context, 
                ProcessingStage.EMAIL_NOTIFICATION, 
                ProcessingStatus.SUCCESS,
                details={'recipient': context.user.email}
            )
            
            logger.info(f"Credentials email sent successfully for order {context.order.id}")
            return ProcessingResult(success=True)
            
        except Exception as e:
            error_msg = f"Email notification error: {str(e)}"
            logger.error(error_msg)
            self._log_processing_stage(context, ProcessingStage.EMAIL_NOTIFICATION, ProcessingStatus.FAILED, error_msg)
            # Don't fail the entire process for email errors
            return ProcessingResult(success=False, error_message=error_msg)
    
    def _complete_processing(self, context: OrderProcessingContext):
        """Complete the processing and log final status."""
        context.current_stage = ProcessingStage.COMPLETION
        
        processing_time = (timezone.now() - context.processing_start_time).total_seconds()
        
        self._log_processing_stage(
            context, 
            ProcessingStage.COMPLETION, 
            ProcessingStatus.SUCCESS,
            details={
                'total_processing_time_seconds': processing_time,
                'order_id': context.order.id,
                'mt5_account_id': context.mt5_credentials['account_id']
            }
        )
        
        logger.info(f"Order processing completed successfully for order {context.order.id} in {processing_time:.2f}s")
    
    def _extract_account_size(self, line_items: List[Dict]) -> float:
        """Extract account size from WooCommerce line items."""
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
                        return 0.0
        
        logger.warning("pa_account-size not found in any line_items")
        return 0.0
    
    def _determine_mt5_group(self, context: OrderProcessingContext) -> str:
        """Determine appropriate MT5 group for the account."""
        from wefund.models import ChallengePhase, ChallengePhaseGroupMapping
        
        # Default group
        mt5_group_name = settings.MT5_GROUP_NAME
        
        try:
            # Find active enrollment linked to this order
            enrollment = ChallengeEnrollment.objects.filter(
                order=context.order, 
                is_active=True
            ).first()
            
            if enrollment:
                current_phase_type = enrollment.get_current_phase_type()
                try:
                    challenge_phase = ChallengePhase.objects.get(
                        challenge=enrollment.challenge,
                        phase_type=current_phase_type
                    )
                    mapping = challenge_phase.group_mapping
                    mt5_group_name = mapping.mt5_group
                    logger.info(f"Using MT5 group '{mt5_group_name}' for challenge {enrollment.challenge} phase {current_phase_type}")
                except (ChallengePhase.DoesNotExist, ChallengePhaseGroupMapping.DoesNotExist):
                    logger.warning(f"No group mapping found for {enrollment.challenge} - {current_phase_type}, using default")
        
        except Exception as e:
            logger.warning(f"Error determining MT5 group: {e}, using default")
        
        return mt5_group_name
    
    def _sanitize_mt5_payload_for_logging(self, payload: List[Dict]) -> List[Dict]:
        """Remove sensitive information from MT5 payload for logging."""
        safe_payload = []
        for item in payload:
            safe_item = item.copy()
            # Remove passwords
            safe_item.pop('password', None)
            safe_item.pop('investorPassword', None)
            safe_item.pop('password_phone', None)
            safe_payload.append(safe_item)
        return safe_payload
    
    def _log_processing_stage(
        self, 
        context: OrderProcessingContext, 
        stage: ProcessingStage, 
        status: ProcessingStatus,
        error_message: str = "",
        details: Dict[str, Any] = None
    ):
        """Log processing stage for monitoring and debugging."""
        try:
            processing_time_ms = None
            if context.processing_start_time:
                processing_time_ms = (timezone.now() - context.processing_start_time).total_seconds() * 1000
            
            WebhookProcessingLog.objects.create(
                webhook_id=context.webhook_id,
                order_id=getattr(context.order, 'id', None),
                processing_stage=stage.value,
                status=status.value,
                details=details or {},
                error_message=error_message,
                processing_time_ms=processing_time_ms
            )
        except Exception as e:
            logger.error(f"Failed to log processing stage: {e}")


# Service instance for dependency injection
ORDER_PROCESSING_SERVICE = OrderProcessingService()

