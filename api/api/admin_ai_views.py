"""
Admin AI Assistant — API Views.
SSE streaming via django.views.View + StreamingHttpResponse.
REST endpoints via DRF.
"""
import json
import logging

from django.http import StreamingHttpResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404

from rest_framework import viewsets, views, status, filters
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django_filters.rest_framework import DjangoFilterBackend

from api.permissions import HasPermission
from wefund.models import (
    AdminAIConfig,
    AdminAIConversation,
    AdminAIMessage,
    AdminAIFeedback,
    AdminAITrainingExample,
)
from api.admin_ai_serializers import (
    AdminAIConfigSerializer,
    AdminAIConversationSerializer,
    AdminAIConversationDetailSerializer,
    AdminAIMessageSerializer,
    AdminAIFeedbackSerializer,
    AdminAITrainingExampleSerializer,
    SendMessageSerializer,
    StartConversationSerializer,
    ConfirmActionSerializer,
)
from api.admin_ai_services import AdminAIChatService
from api.admin_ai_training import AdminAITrainingService

logger = logging.getLogger(__name__)


# ===================================================================
# SSE STREAMING VIEW (django.views.View — bypasses DRF renderer)
# ===================================================================

@method_decorator(csrf_exempt, name='dispatch')
class AdminAIChatStreamView(View):
    """
    SSE endpoint for streaming AI responses.
    Uses django.views.View to avoid DRF renderer negotiation issues.
    Manually authenticates JWT since this is not a DRF view.

    POST /api/admin/ai-assistant/chat/stream/
    Body: {"conversation_id": "...", "message": "...", "context_url": "..."}
    """

    def dispatch(self, request, *args, **kwargs):
        # Manually authenticate JWT for non-DRF view
        if not request.user.is_authenticated:
            try:
                jwt_auth = JWTAuthentication()
                auth_result = jwt_auth.authenticate(request)
                if auth_result:
                    request.user, request.auth = auth_result
            except (InvalidToken, TokenError):
                pass
            except Exception:
                pass

        if not request.user.is_authenticated or not (
            request.user.is_superuser or (request.user.is_staff and request.user.rbac_role)
        ):
            return StreamingHttpResponse(
                self._error_stream("Permission denied."),
                content_type="text/event-stream"
            )
        return super().dispatch(request, *args, **kwargs)

    def post(self, request):
        try:
            body = json.loads(request.body)
        except (ValueError, TypeError):
            return StreamingHttpResponse(
                self._error_stream("Invalid JSON body."),
                content_type="text/event-stream"
            )
        conversation_id = body.get('conversation_id')
        message = body.get('message', '')
        context_url = body.get('context_url', '')

        if not conversation_id or not message:
            return StreamingHttpResponse(
                self._error_stream("conversation_id and message are required."),
                content_type="text/event-stream"
            )

        # Enforce message length limit (matches SendMessageSerializer max_length)
        if len(message) > 10000:
            return StreamingHttpResponse(
                self._error_stream("Message too long. Maximum 10,000 characters."),
                content_type="text/event-stream"
            )

        try:
            conversation = AdminAIConversation.objects.get(
                id=conversation_id,
                admin_user=request.user,
            )
        except AdminAIConversation.DoesNotExist:
            return StreamingHttpResponse(
                self._error_stream("Conversation not found."),
                content_type="text/event-stream"
            )

        def generate():
            try:
                for event in AdminAIChatService.stream_message(
                    conversation=conversation,
                    message=message,
                    context_url=context_url,
                    admin_user=request.user,
                ):
                    yield event
            except Exception as e:
                logger.error(f"SSE stream error: {e}", exc_info=True)
                yield f"data: {json.dumps({'type': 'error', 'message': 'An internal error occurred. Please try again.'})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"

        response = StreamingHttpResponse(generate(), content_type="text/event-stream")
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response

    @staticmethod
    def _error_stream(message: str):
        yield f"data: {json.dumps({'type': 'error', 'message': message})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"


# ===================================================================
# REST API VIEWS
# ===================================================================

class AdminAIChatStartView(views.APIView):
    """
    Start a new AI conversation.
    POST /api/admin/ai-assistant/chat/start/
    """
    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    def post(self, request):
        serializer = StartConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        config = AdminAIConfig.get_config()

        conversation = AdminAIConversation.objects.create(
            admin_user=request.user,
            context_type=serializer.validated_data.get('context_type', 'general'),
            context_id=serializer.validated_data.get('context_id') or None,
            context_url=serializer.validated_data.get('context_url', ''),
        )

        # Create greeting message
        AdminAIMessage.objects.create(
            conversation=conversation,
            role='ai',
            content=config.ai_greeting,
            metadata={'auto_greeting': True},
        )

        return Response(
            AdminAIConversationDetailSerializer(conversation).data,
            status=status.HTTP_201_CREATED,
        )


class AdminAIChatConfirmView(views.APIView):
    """
    Confirm or cancel a pending write action.
    POST /api/admin/ai-assistant/chat/confirm/
    Only admin-role users can confirm write actions.
    """
    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    def post(self, request):
        serializer = ConfirmActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        conversation = get_object_or_404(
            AdminAIConversation,
            id=serializer.validated_data['conversation_id'],
            admin_user=request.user,
        )

        result = AdminAIChatService.process_confirmation(
            conversation=conversation,
            message_id=str(serializer.validated_data['message_id']),
            confirmed=serializer.validated_data['confirmed'],
            admin_user=request.user,
        )

        return Response(result)


class AdminAIConversationListView(views.APIView):
    """
    List admin's conversations.
    GET /api/admin/ai-assistant/chat/conversations/
    """
    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    def get(self, request):
        conversations = AdminAIConversation.objects.filter(
            admin_user=request.user,
            is_active=True,
        ).order_by('-last_message_at', '-created_at')

        serializer = AdminAIConversationSerializer(conversations, many=True)
        return Response(serializer.data)


class AdminAIConversationDetailView(views.APIView):
    """
    Get or delete a specific conversation.
    GET /api/admin/ai-assistant/chat/conversations/{id}/
    DELETE /api/admin/ai-assistant/chat/conversations/{id}/
    """
    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    def get(self, request, conversation_id):
        conversation = get_object_or_404(
            AdminAIConversation,
            id=conversation_id,
            admin_user=request.user,
        )
        serializer = AdminAIConversationDetailSerializer(conversation)
        return Response(serializer.data)

    def delete(self, request, conversation_id):
        conversation = get_object_or_404(
            AdminAIConversation,
            id=conversation_id,
            admin_user=request.user,
        )
        conversation.is_active = False
        conversation.save(update_fields=['is_active', 'updated_at'])
        return Response({'success': True, 'deleted': str(conversation.id)})


# ===================================================================
# CONFIG VIEW
# ===================================================================

class AdminAIConfigView(views.APIView):
    """
    Singleton config management.
    GET/PATCH /api/admin/ai-assistant/config/
    Admin-role only — support/risk cannot modify AI configuration.
    """
    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    def get(self, request):
        config = AdminAIConfig.get_config()
        serializer = AdminAIConfigSerializer(config)
        return Response(serializer.data)

    def patch(self, request):
        config = AdminAIConfig.get_config()

        # Capture before-state for audit logging
        before_state = AdminAIConfigSerializer(config).data

        serializer = AdminAIConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Audit log the config change
        try:
            from wefund.models import EventLog
            EventLog.objects.create(
                user=request.user,
                category='admin',
                event_type='admin_action',
                metadata={
                    'source': 'admin_ai',
                    'action': 'config_change',
                    'changed_fields': list(request.data.keys()),
                    'before': {k: before_state.get(k) for k in request.data.keys()},
                    'after': {k: serializer.data.get(k) for k in request.data.keys()},
                },
                description=f"Admin AI config modified by {request.user.email}: {', '.join(request.data.keys())}",
            )
        except Exception as e:
            logger.warning(f"Failed to log config change: {e}")

        return Response(serializer.data)


# ===================================================================
# FEEDBACK VIEWSET
# ===================================================================

class AdminAIFeedbackViewSet(viewsets.ModelViewSet):
    """
    CRUD for AI feedback.
    """
    serializer_class = AdminAIFeedbackSerializer
    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['conversation', 'message', 'is_positive', 'issue_type']
    ordering = ['-created_at']

    def get_queryset(self):
        return AdminAIFeedback.objects.filter(admin_user=self.request.user)

    def perform_create(self, serializer):
        instance = serializer.save(admin_user=self.request.user)

        # Auto-create training example ONLY from admin-role feedback with correction
        # Support/risk users can submit feedback but cannot influence training data
        if (
            not instance.is_positive
            and instance.correction_text
            and getattr(self.request.user, 'role', None) == 'admin'
        ):
            AdminAITrainingService.create_from_feedback(instance)


# ===================================================================
# TRAINING EXAMPLES VIEWSET
# ===================================================================

class AdminAITrainingExampleViewSet(viewsets.ModelViewSet):
    """
    CRUD for training examples.
    Requires config.manage_ai_rules permission.
    """
    queryset = AdminAITrainingExample.objects.all()
    serializer_class = AdminAITrainingExampleSerializer
    permission_classes = [HasPermission]
    required_permissions = ['config.manage_ai_rules']

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'issue_type']
    search_fields = ['question', 'ideal_response', 'tags']
    ordering = ['-weight', '-created_at']

    def perform_create(self, serializer):
        serializer.save()
        AdminAITrainingService.invalidate_cache()

    def perform_update(self, serializer):
        serializer.save()
        AdminAITrainingService.invalidate_cache()

    def perform_destroy(self, instance):
        instance.delete()
        AdminAITrainingService.invalidate_cache()
