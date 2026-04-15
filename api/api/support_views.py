"""
Support Chat Widget API Views.
Includes widget endpoints (client-facing) and admin endpoints (CRM).
"""
import logging
import secrets
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Avg, Q, F
from django.db.models.functions import Now

from rest_framework import viewsets, status, views, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import AnonRateThrottle
from django_filters.rest_framework import DjangoFilterBackend

from wefund.models import (
    SupportAIConfig,
    SupportConversation,
    SupportMessage,
    FAQCollection,
    FAQArticle,
    SupportAIFeedback,
    AgentShiftSchedule,
    AgentShiftOverride,
    Notification,
)
from api.support_serializers import (
    ConversationSerializer,
    ConversationDetailSerializer,
    ConversationCreateSerializer,
    SendMessageSerializer,
    MessageSerializer,
    FAQCollectionSerializer,
    FAQCollectionDetailSerializer,
    FAQArticleSerializer,
    FAQSearchResultSerializer,
    SupportAIConfigSerializer,
    SupportAIFeedbackSerializer,
    ConversationReplySerializer,
    ConversationEscalateSerializer,
    ConversationAssignSerializer,
    ConversationStatusSerializer,
    SupportStatsSerializer,
    AgentShiftScheduleSerializer,
    AgentShiftOverrideSerializer,
    GuestConversationCreateSerializer,
    GuestSendMessageSerializer,
    EmailReplySerializer,
    NewEmailConversationSerializer,
)
from api.support_services import SupportChatService, FAQSearchService, get_on_shift_agents
from api.permissions import HasPermission

try:
    from api.utils.event_logger import log_event
except ImportError:
    def log_event(*args, **kwargs):
        pass

logger = logging.getLogger(__name__)


# ===================================================================
# WIDGET VIEWSETS (CLIENT-FACING)
# ===================================================================

class SupportChatViewSet(viewsets.ViewSet):
    """
    Widget endpoint for chat functionality.
    Action-based API matching Supabase implementation.

    Endpoints:
    - POST /api/support/chat/start-conversation/
    - POST /api/support/chat/send-message/
    - POST /api/support/chat/get-conversation/
    - POST /api/support/chat/list-conversations/
    - POST /api/support/chat/export-conversation/
    - POST /api/support/chat/delete-conversation/
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='start-conversation')
    def start_conversation(self, request):
        """
        Start a new support conversation.

        Request:
        {
            "account_login": "123456",  // optional
            "user_name": "John"  // optional
        }

        Response:
        {
            "conversation": {...},
            "greeting": "Hey there! ..."
        }
        """
        serializer = ConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        account_login = serializer.validated_data.get('account_login')

        # Get AI config for greeting
        config = SupportAIConfig.get_config()

        # Enforce max one OPEN widget conversation per user.
        # "active" and "escalated" are treated as open.
        existing_conversation = SupportConversation.objects.filter(
            user=user,
            source='widget',
            status__in=['active', 'escalated'],
            is_archived=False
        ).order_by('-last_message_at', '-created_at').first()

        if existing_conversation:
            greeting = existing_conversation.messages.filter(
                sender_type='ai',
                metadata__auto_greeting=True
            ).order_by('created_at').values_list('content', flat=True).first() or config.ai_greeting

            conv_serializer = ConversationDetailSerializer(
                existing_conversation, context={'request': request}
            )
            return Response({
                'conversation': conv_serializer.data,
                'greeting': greeting,
            }, status=status.HTTP_200_OK)

        # Create conversation
        conversation = SupportConversation.objects.create(
            user=user,
            account_login=account_login or None,
            source='widget',
            ai_enabled=config.ai_enabled,
            attachments_enabled=False,
        )

        # Create greeting message
        greeting = config.ai_greeting
        SupportMessage.objects.create(
            conversation=conversation,
            sender_type='ai',
            content=greeting,
            metadata={'auto_greeting': True}
        )

        # Log event
        log_event(
            request=request,
            user=user,
            category='support',
            event_type='conversation_started',
            metadata={
                'conversation_id': str(conversation.id),
                'source': 'widget',
                'account_login': account_login,
            },
            description="User started support conversation"
        )

        conv_serializer = ConversationDetailSerializer(
            conversation, context={'request': request}
        )
        return Response({
            'conversation': conv_serializer.data,
            'greeting': greeting,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='send-message')
    def send_message(self, request):
        """
        Send a message in a conversation.

        Request:
        {
            "conversation_id": "uuid",
            "message": "How do I withdraw?",
            "attachment": {  // optional
                "url": "https://...",
                "name": "screenshot.png",
                "type": "image/png",
                "scan_status": "clean"
            }
        }

        Response:
        {
            "user_message": {...},
            "ai_response": {...} or null,
            "escalated": false,
            "emotional_level": "calm"
        }
        """
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        conversation_id = serializer.validated_data['conversation_id']
        message = serializer.validated_data['message']
        attachment = serializer.validated_data.get('attachment')

        # Get conversation (ownership check)
        conversation = get_object_or_404(
            SupportConversation,
            id=conversation_id,
            user=request.user,
            source='widget',
            is_archived=False
        )

        # Reopen resolved conversations when client sends a new message
        if conversation.status == 'resolved':
            conversation.status = 'active'
            conversation.resolved_at = None
            conversation.ai_enabled = True
            conversation.save(update_fields=[
                'status', 'resolved_at', 'ai_enabled', 'updated_at'
            ])

        # Process message and generate AI response
        result = SupportChatService.process_user_message(
            conversation=conversation,
            user_message=message,
            attachment=attachment,
            request=request,
        )

        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='get-conversation')
    def get_conversation(self, request):
        """
        Get conversation with messages.

        Request: {"conversation_id": "uuid"}

        Response:
        {
            "conversation": {...},
            "messages": [...]  // excludes internal notes
        }
        """
        conversation_id = request.data.get('conversation_id')
        if not conversation_id:
            return Response(
                {'error': 'conversation_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        conversation = get_object_or_404(
            SupportConversation,
            id=conversation_id,
            user=request.user,
            is_archived=False
        )

        serializer = ConversationDetailSerializer(
            conversation, context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='list-conversations')
    def list_conversations(self, request):
        """
        List user's conversations.

        Response: Array of conversations with last message
        """
        conversations = SupportConversation.objects.filter(
            user=request.user,
            source='widget',
            is_archived=False
        ).prefetch_related('messages').order_by('-last_message_at', '-created_at')

        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='export-conversation')
    def export_conversation(self, request):
        """
        Export conversation as text file.

        Request: {"conversation_id": "uuid"}

        Response:
        {
            "text": "...",
            "filename": "conversation-uuid.txt"
        }
        """
        conversation_id = request.data.get('conversation_id')
        if not conversation_id:
            return Response(
                {'error': 'conversation_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        conversation = get_object_or_404(
            SupportConversation,
            id=conversation_id,
            user=request.user
        )

        export_text = SupportChatService.export_conversation_text(conversation)

        return Response({
            'text': export_text,
            'filename': f'conversation-{conversation.id}.txt'
        })

    @action(detail=False, methods=['post'], url_path='delete-conversation')
    def delete_conversation(self, request):
        """
        Soft delete (archive) a conversation.

        Request: {"conversation_id": "uuid"}

        Response: {"success": true, "archived": "uuid"}
        """
        conversation_id = request.data.get('conversation_id')
        if not conversation_id:
            return Response(
                {'error': 'conversation_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        conversation = get_object_or_404(
            SupportConversation,
            id=conversation_id,
            user=request.user
        )

        conversation.is_archived = True
        conversation.save(update_fields=['is_archived', 'updated_at'])

        log_event(
            request=request,
            user=request.user,
            category='support',
            event_type='conversation_archived',
            metadata={'conversation_id': str(conversation.id)},
            description="User archived conversation"
        )

        return Response({
            'success': True,
            'archived': str(conversation.id)
        })


class SupportFAQViewSet(viewsets.ViewSet):
    """
    FAQ endpoints for help center.

    Endpoints:
    - POST /api/support/faq/list-collections/
    - POST /api/support/faq/get-collection/
    - POST /api/support/faq/search/
    - POST /api/support/faq/track-view/
    - POST /api/support/faq/track-helpful/
    """
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'], url_path='list-collections')
    def list_collections(self, request):
        """
        List all active FAQ collections.

        Response: Array of collections with article counts
        """
        collections = FAQCollection.objects.filter(
            is_active=True
        ).order_by('display_order')

        serializer = FAQCollectionSerializer(collections, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='get-collection')
    def get_collection(self, request):
        """
        Get collection with its articles.

        Request: {"collection_id": "uuid"}

        Response: Collection with articles array
        """
        collection_id = request.data.get('collection_id')
        if not collection_id:
            return Response(
                {'error': 'collection_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        collection = get_object_or_404(
            FAQCollection,
            id=collection_id,
            is_active=True
        )

        serializer = FAQCollectionDetailSerializer(collection)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='search')
    def search(self, request):
        """
        Search FAQ articles.

        Request: {"query": "daily drawdown"}

        Response: Array of articles with relevance scores
        """
        query = request.data.get('query', '')
        if len(query) < 2:
            return Response([])

        results = FAQSearchService.search_articles(query, limit=20)
        return Response(results)

    @action(detail=False, methods=['post'], url_path='track-view')
    def track_view(self, request):
        """
        Track article view.

        Request: {"article_id": "uuid"}

        Response: {"success": true}
        """
        article_id = request.data.get('article_id')
        if not article_id:
            return Response(
                {'error': 'article_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        success = FAQSearchService.track_article_view(article_id)
        return Response({'success': success})

    @action(detail=False, methods=['post'], url_path='track-helpful')
    def track_helpful(self, request):
        """
        Track article helpfulness feedback.

        Request: {"article_id": "uuid", "helpful": true}

        Response: {"success": true}
        """
        article_id = request.data.get('article_id')
        helpful = request.data.get('helpful')

        if not article_id:
            return Response(
                {'error': 'article_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if helpful is None:
            return Response(
                {'error': 'helpful is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        success = FAQSearchService.track_article_helpful(article_id, helpful)
        return Response({'success': success})


# ===================================================================
# ADMIN VIEWSETS (CRM)
# ===================================================================

class AdminSupportConversationViewSet(viewsets.ModelViewSet):
    """
    Admin CRM endpoints for managing conversations.

    Endpoints:
    - GET /api/admin/support/conversations/
    - GET /api/admin/support/conversations/{id}/
    - PATCH /api/admin/support/conversations/{id}/
    - POST /api/admin/support/conversations/{id}/reply/
    - POST /api/admin/support/conversations/{id}/escalate/
    - POST /api/admin/support/conversations/{id}/resolve/
    - POST /api/admin/support/conversations/{id}/assign/
    - GET /api/admin/support/conversations/stats/
    """
    queryset = SupportConversation.objects.all()
    permission_classes = [HasPermission]
    required_permissions = ['support.manage']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'needs_human_review', 'assigned_agent', 'source']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'subject', 'account_login', 'guest_name', 'guest_email']
    ordering_fields = ['created_at', 'last_message_at', 'priority']
    ordering = ['-last_message_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return ConversationSerializer
        return ConversationDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        # Exclude archived by default unless explicitly requested
        show_archived = self.request.query_params.get('show_archived', 'false')
        if show_archived.lower() != 'true':
            qs = qs.filter(is_archived=False)

        return qs.select_related('user', 'assigned_agent').prefetch_related('messages')

    @action(detail=True, methods=['post'], url_path='reply')
    def reply(self, request, pk=None):
        """
        Send an agent reply.

        Request:
        {
            "content": "Hello, I can help with that...",
            "is_internal": false  // true for internal notes
        }
        """
        conversation = self.get_object()
        serializer = ConversationReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        content = serializer.validated_data['content']
        is_internal = serializer.validated_data.get('is_internal', False)
        attachment = serializer.validated_data.get('attachment')

        # Messages with @mentions are always internal notes
        mentioned_user_ids = serializer.validated_data.get('mentioned_user_ids', [])
        if mentioned_user_ids:
            is_internal = True

        # Create agent message
        message = SupportMessage.objects.create(
            conversation=conversation,
            sender_type='agent',
            sender=request.user,
            content=content,
            is_internal=is_internal,
            attachment_url=attachment.get('url') if attachment else None,
            attachment_name=attachment.get('name') if attachment else None,
            attachment_type=attachment.get('type') if attachment else None,
            attachment_scan_status='clean' if attachment else 'pending',
        )

        # Translate agent reply to client's language
        if not is_internal:
            try:
                from api.support_translation import TranslationService
                conv_meta = conversation.metadata or {}
                client_lang = conv_meta.get('detected_language')
                if client_lang and client_lang.lower() != 'english':
                    result = TranslationService.translate_to_language(content, client_lang)
                    if result.get('translated_content'):
                        message.metadata = message.metadata or {}
                        message.metadata['original_content'] = content
                        message.metadata['translated_content'] = result['translated_content']
                        message.metadata['target_language'] = client_lang
                        message.save(update_fields=['metadata'])
            except Exception:
                pass  # Never block agent reply

        # Process @mentions — create notifications for mentioned agents
        if mentioned_user_ids:
            message.metadata = message.metadata or {}
            message.metadata['mentioned_user_ids'] = [str(uid) for uid in mentioned_user_ids]
            message.save(update_fields=['metadata'])

            from django.contrib.auth import get_user_model
            User = get_user_model()
            sender_name = request.user.get_full_name() or request.user.email
            conv_subject = conversation.subject or conversation.email_subject or 'a conversation'

            for uid in mentioned_user_ids:
                if str(uid) == str(request.user.id):
                    continue  # Don't notify yourself
                mentioned_user = User.objects.filter(id=uid).first()
                if mentioned_user:
                    Notification.objects.create(
                        user=mentioned_user,
                        type='mention',
                        title=f'{sender_name} mentioned you',
                        message=f'{sender_name} mentioned you in "{conv_subject}": {content[:100]}',
                        action_url=f'/support?conversation={conversation.id}',
                    )

        # Track first human response / takeover + auto-assign
        if not is_internal:
            update_fields = ['ai_enabled', 'updated_at']

            if not conversation.agent_takeover_at:
                conversation.agent_takeover_at = timezone.now()
                update_fields.append('agent_takeover_at')

            # Auto-assign to the responding agent if not already assigned
            if not conversation.assigned_agent:
                conversation.assigned_agent = request.user
                update_fields.append('assigned_agent')

            # Disable AI for this conversation after agent takeover
            conversation.ai_enabled = False
            conversation.save(update_fields=update_fields)

        log_event(
            request=request,
            user=conversation.user,
            category='support',
            event_type='agent_reply',
            metadata={
                'conversation_id': str(conversation.id),
                'agent_id': str(request.user.id),
                'is_internal': is_internal,
            },
            description=f"Agent {request.user.email} replied to conversation"
        )

        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='edit-message/(?P<message_id>[^/.]+)')
    def edit_message(self, request, pk=None, message_id=None):
        """
        Edit an agent message.

        Request:
        {
            "content": "Updated message text"
        }
        """
        conversation = self.get_object()
        message = get_object_or_404(
            SupportMessage,
            id=message_id,
            conversation=conversation,
            sender_type='agent',
        )

        # Only the sender can edit their own messages
        if message.sender != request.user:
            return Response(
                {'error': 'You can only edit your own messages.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        content = request.data.get('content', '').strip()
        if not content:
            return Response(
                {'error': 'Content cannot be empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message.content = content
        message.edited_at = timezone.now()
        message.save(update_fields=['content', 'edited_at'])

        return Response(MessageSerializer(message).data)

    @action(detail=True, methods=['delete'], url_path='delete-message/(?P<message_id>[^/.]+)')
    def delete_message(self, request, pk=None, message_id=None):
        """
        Soft-delete an agent message.
        """
        conversation = self.get_object()
        message = get_object_or_404(
            SupportMessage,
            id=message_id,
            conversation=conversation,
            sender_type='agent',
        )

        # Only the sender can delete their own messages
        if message.sender != request.user:
            return Response(
                {'error': 'You can only delete your own messages.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        message.is_deleted = True
        message.content = ''
        message.save(update_fields=['is_deleted', 'content'])

        return Response(MessageSerializer(message).data)

    @action(detail=True, methods=['get'], url_path='messages')
    def messages(self, request, pk=None):
        """
        Get all messages for a conversation.

        Query params:
        - include_internal: true/false (default: true for admin)
        """
        conversation = self.get_object()
        include_internal = request.query_params.get('include_internal', 'true').lower() == 'true'

        queryset = conversation.messages.all().order_by('created_at')
        if not include_internal:
            queryset = queryset.filter(is_internal=False)

        serializer = MessageSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='escalate')
    def escalate(self, request, pk=None):
        """
        Escalate conversation.

        Request:
        {
            "reason": "Customer threatening chargeback",
            "priority": "urgent"
        }
        """
        conversation = self.get_object()
        serializer = ConversationEscalateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data['reason']
        priority = serializer.validated_data.get('priority', 'high')

        conversation.status = 'escalated'
        conversation.escalation_reason = reason
        conversation.priority = priority
        conversation.needs_human_review = True
        conversation.save(update_fields=[
            'status', 'escalation_reason', 'priority', 'needs_human_review', 'updated_at'
        ])

        log_event(
            request=request,
            user=conversation.user,
            category='support',
            event_type='conversation_escalated_admin',
            metadata={
                'conversation_id': str(conversation.id),
                'reason': reason,
                'priority': priority,
            },
            description=f"Conversation escalated by {request.user.email}"
        )

        return Response({'success': True, 'status': 'escalated'})

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve(self, request, pk=None):
        """
        Mark conversation as resolved.
        """
        conversation = self.get_object()

        conversation.status = 'resolved'
        conversation.resolved_at = timezone.now()
        conversation.needs_human_review = False
        conversation.save(update_fields=[
            'status', 'resolved_at', 'needs_human_review', 'updated_at'
        ])

        log_event(
            request=request,
            user=conversation.user,
            category='support',
            event_type='conversation_resolved',
            metadata={
                'conversation_id': str(conversation.id),
                'resolved_by': str(request.user.id),
            },
            description=f"Conversation resolved by {request.user.email}"
        )

        return Response({'success': True, 'status': 'resolved'})

    @action(detail=True, methods=['post'], url_path='assign')
    def assign(self, request, pk=None):
        """
        Assign conversation to an agent.

        Request: {"agent_id": "uuid"} or {"agent_id": null} to unassign
        """
        conversation = self.get_object()
        serializer = ConversationAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agent_id = serializer.validated_data.get('agent_id')

        if agent_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            agent = get_object_or_404(User, id=agent_id)
            conversation.assigned_agent = agent
        else:
            conversation.assigned_agent = None

        conversation.save(update_fields=['assigned_agent', 'updated_at'])

        log_event(
            request=request,
            user=conversation.user,
            category='support',
            event_type='conversation_assigned',
            metadata={
                'conversation_id': str(conversation.id),
                'assigned_to': str(agent_id) if agent_id else None,
            },
            description=f"Conversation assigned by {request.user.email}"
        )

        return Response({
            'success': True,
            'assigned_agent': str(conversation.assigned_agent.id) if conversation.assigned_agent else None
        })

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Get support dashboard statistics.
        """
        total = SupportConversation.objects.filter(is_archived=False).count()
        active = SupportConversation.objects.filter(status='active', is_archived=False).count()
        escalated = SupportConversation.objects.filter(status='escalated', is_archived=False).count()
        resolved = SupportConversation.objects.filter(status='resolved', is_archived=False).count()
        needs_review = SupportConversation.objects.filter(needs_human_review=True, is_archived=False).count()

        today = timezone.now().date()
        conversations_today = SupportConversation.objects.filter(
            created_at__date=today
        ).count()

        # Calculate average response time (first AI response)
        conversations_with_response = SupportConversation.objects.filter(
            first_response_at__isnull=False
        ).annotate(
            response_time=F('first_response_at') - F('created_at')
        )

        avg_response = None
        if conversations_with_response.exists():
            from django.db.models import Avg
            from datetime import timedelta
            result = conversations_with_response.aggregate(Avg('response_time'))
            avg_delta = result.get('response_time__avg')
            if avg_delta:
                avg_response = avg_delta.total_seconds()

        # AI response rate (conversations where AI responded)
        total_messages = SupportMessage.objects.filter(
            conversation__is_archived=False
        ).count()
        ai_messages = SupportMessage.objects.filter(
            conversation__is_archived=False,
            sender_type='ai'
        ).count()
        ai_response_rate = (ai_messages / total_messages * 100) if total_messages > 0 else 0

        stats = {
            'total_conversations': total,
            'active_conversations': active,
            'escalated_conversations': escalated,
            'resolved_conversations': resolved,
            'needs_review_count': needs_review,
            'avg_response_time_seconds': avg_response,
            'conversations_today': conversations_today,
            'ai_response_rate': round(ai_response_rate, 2),
        }

        return Response(stats)

    @action(detail=True, methods=['post'], url_path='send-email')
    def send_email(self, request, pk=None):
        """
        Send an email reply in an existing conversation.

        Request:
        {
            "body_html": "<p>Hello...</p>",
            "subject": "Re: Your question",  // optional
            "body_text": "Hello...",          // optional
            "template_id": 1                  // optional
        }
        """
        from api.support_serializers import EmailReplySerializer
        from wefund.tasks.support_email_tasks import send_support_email_task

        conversation = self.get_object()
        serializer = EmailReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        body_html = serializer.validated_data['body_html']
        body_text = serializer.validated_data.get('body_text', '')
        subject = serializer.validated_data.get('subject', '')

        # Determine recipient email
        to_email = conversation.get_display_email()
        if not to_email:
            return Response(
                {'error': 'No email address found for this conversation'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use conversation email_subject or conversation subject as fallback
        if not subject:
            subject = conversation.email_subject or conversation.subject or 'WeFund Support'
            if not subject.lower().startswith('re:'):
                subject = f"Re: {subject}"

        # Create the email message record
        message = SupportMessage.objects.create(
            conversation=conversation,
            sender_type='agent',
            sender=request.user,
            message_type='email',
            content=body_html,
            metadata={
                'email_subject': subject,
                'email_to': to_email,
            },
        )

        # Update conversation email_subject if not set
        if not conversation.email_subject:
            conversation.email_subject = subject
            conversation.save(update_fields=['email_subject', 'updated_at'])

        # Track agent takeover
        if not conversation.agent_takeover_at:
            conversation.agent_takeover_at = timezone.now()
            conversation.ai_enabled = False
            conversation.save(update_fields=['agent_takeover_at', 'ai_enabled', 'updated_at'])

        # Dispatch async email send
        send_support_email_task.delay(
            conversation_id=str(conversation.id),
            message_id=str(message.id),
            to_email=to_email,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            agent_id=str(request.user.id),
        )

        log_event(
            request=request,
            user=conversation.user,
            category='support',
            event_type='support_email_sent',
            metadata={
                'conversation_id': str(conversation.id),
                'agent_id': str(request.user.id),
                'to_email': to_email,
                'subject': subject,
            },
            description=f"Agent {request.user.email} sent email to {to_email}"
        )

        return Response(
            MessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['post'], url_path='new-email')
    def new_email_conversation(self, request):
        """
        Create a new email conversation and send the first email.

        Request:
        {
            "to_email": "user@example.com",
            "subject": "Regarding your account",
            "body_html": "<p>Hello...</p>",
            "body_text": "Hello..."  // optional
        }
        """
        from api.support_serializers import NewEmailConversationSerializer
        from wefund.tasks.support_email_tasks import send_support_email_task
        from django.contrib.auth import get_user_model
        User = get_user_model()

        serializer = NewEmailConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        to_email = serializer.validated_data['to_email']
        subject = serializer.validated_data['subject']
        body_html = serializer.validated_data['body_html']
        body_text = serializer.validated_data.get('body_text', '')

        # Try to match email to an existing user
        matched_user = User.objects.filter(email__iexact=to_email).first()

        # Create the conversation
        conversation = SupportConversation.objects.create(
            user=matched_user,
            guest_email=to_email if not matched_user else None,
            guest_name=to_email.split('@')[0] if not matched_user else None,
            status='active',
            source='email',
            ai_enabled=False,
            email_subject=subject,
            subject=subject,
            assigned_agent=request.user,
            agent_takeover_at=timezone.now(),
        )

        # Create the first email message
        message = SupportMessage.objects.create(
            conversation=conversation,
            sender_type='agent',
            sender=request.user,
            message_type='email',
            content=body_html,
            metadata={
                'email_subject': subject,
                'email_to': to_email,
            },
        )

        # Dispatch async email send
        send_support_email_task.delay(
            conversation_id=str(conversation.id),
            message_id=str(message.id),
            to_email=to_email,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            agent_id=str(request.user.id),
        )

        log_event(
            request=request,
            user=matched_user,
            category='support',
            event_type='new_email_conversation',
            metadata={
                'conversation_id': str(conversation.id),
                'agent_id': str(request.user.id),
                'to_email': to_email,
                'subject': subject,
            },
            description=f"Agent {request.user.email} created email conversation to {to_email}"
        )

        return Response(
            ConversationSerializer(conversation).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'], url_path='email-templates')
    def email_templates(self, request):
        """
        Get available email templates for support category.
        """
        from api.support_serializers import SupportEmailTemplateSerializer
        from wefund.models import EmailTemplate

        templates = EmailTemplate.objects.filter(
            category='support', is_active=True
        ).order_by('name')

        return Response(
            SupportEmailTemplateSerializer(templates, many=True).data
        )

    @action(detail=True, methods=['post'], url_path='convert-to-email')
    def convert_to_email(self, request, pk=None):
        """
        Convert a live chat conversation into an email ticket.

        Sets source to 'email', disables AI, and optionally sets email_subject.
        Requires the user to have an email address on file.

        Request (all fields optional):
        {
            "subject": "Custom subject"  // defaults to conversation subject
        }
        """
        # Validate subject length upfront
        email_subject = request.data.get('subject', '').strip()
        if len(email_subject) > 500:
            return Response(
                {'error': 'Subject must be 500 characters or fewer'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Lock the row to prevent race conditions
            conversation = SupportConversation.objects.select_for_update().get(pk=pk)

            if conversation.source == 'email':
                return Response(
                    {'error': 'Conversation is already an email ticket'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Ensure there's a recipient email
            to_email = conversation.get_display_email()
            if not to_email:
                return Response(
                    {'error': 'No email address on file for this conversation'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not email_subject:
                email_subject = conversation.subject or f"Support conversation #{str(conversation.id)[:8]}"

            conversation.source = 'email'
            conversation.ai_enabled = False
            conversation.email_subject = email_subject
            if not conversation.assigned_agent:
                conversation.assigned_agent = request.user
            if not conversation.agent_takeover_at:
                conversation.agent_takeover_at = timezone.now()
            conversation.save(update_fields=[
                'source', 'ai_enabled', 'email_subject',
                'assigned_agent', 'agent_takeover_at', 'updated_at',
            ])

            # Add system message noting the conversion
            SupportMessage.objects.create(
                conversation=conversation,
                sender_type='agent',
                sender=request.user,
                message_type='system',
                content=f'Conversation converted to email ticket by {request.user.get_full_name() or request.user.email}',
                is_internal=True,
                metadata={'event_type': 'converted_to_email'},
            )

        # Log outside the transaction — non-critical, should not block response
        try:
            log_event(
                request=request,
                user=conversation.user,
                category='support',
                event_type='conversation_converted_to_email',
                metadata={
                    'conversation_id': str(conversation.id),
                    'agent_id': str(request.user.id),
                    'email_subject': email_subject,
                },
                description=f"Agent {request.user.email} converted conversation to email ticket"
            )
        except Exception:
            logging.getLogger(__name__).exception("Failed to log convert_to_email event")

        return Response(ConversationSerializer(conversation).data)


class AdminSupportAIConfigView(views.APIView):
    """
    Singleton AI configuration management.

    Endpoints:
    - GET /api/admin/support/ai-config/
    - PATCH /api/admin/support/ai-config/
    """
    permission_classes = [HasPermission]
    required_permissions = ['support.manage_config']

    def get(self, request):
        """Get AI configuration."""
        config = SupportAIConfig.get_config()
        serializer = SupportAIConfigSerializer(config)
        return Response(serializer.data)

    def patch(self, request):
        """Update AI configuration."""
        config = SupportAIConfig.get_config()
        serializer = SupportAIConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        log_event(
            request=request,
            user=request.user,
            category='support',
            event_type='ai_config_updated',
            metadata={'changes': request.data},
            description=f"AI config updated by {request.user.email}"
        )

        return Response(serializer.data)


class AdminSupportAgentsView(views.APIView):
    """
    Get list of users who can be assigned as support agents.
    Returns users with 'admin' or 'support' roles.

    GET /api/admin/support/agents/
    """
    permission_classes = [HasPermission]
    required_permissions = ['support.manage']

    def get(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        agents = User.objects.filter(
            role__in=['admin', 'support'],
            is_active=True
        ).values('id', 'first_name', 'last_name', 'email', 'role').order_by('first_name', 'last_name')

        return Response(list(agents))


class AdminMentionNotificationsView(views.APIView):
    """
    Get mention notifications for the current user.

    GET /api/admin/support/mentions/
    Query params:
    - all=true: include read notifications (default: unread only)
    """
    permission_classes = [HasPermission]
    required_permissions = ['support.manage']

    def get(self, request):
        qs = Notification.objects.filter(
            user=request.user,
            type='mention',
        ).order_by('-created_at')

        if request.query_params.get('all', '').lower() != 'true':
            qs = qs.filter(is_read=False)

        unread_count = Notification.objects.filter(
            user=request.user,
            type='mention',
            is_read=False,
        ).count()

        notifications = []
        for n in qs[:50]:
            notifications.append({
                'id': str(n.id),
                'title': n.title,
                'message': n.message,
                'action_url': n.action_url,
                'is_read': n.is_read,
                'created_at': n.created_at.isoformat() if n.created_at else None,
            })

        return Response({
            'notifications': notifications,
            'unread_count': unread_count,
        })


class AdminMarkMentionReadView(views.APIView):
    """
    Mark mention notifications as read.

    POST /api/admin/support/mentions/mark-read/
    Request:
    - {"notification_ids": ["uuid1", "uuid2"]}  — mark specific
    - {"mark_all": true}                         — mark all unread
    """
    permission_classes = [HasPermission]
    required_permissions = ['support.manage']

    def post(self, request):
        mark_all = request.data.get('mark_all', False)
        notification_ids = request.data.get('notification_ids', [])

        now = timezone.now()
        qs = Notification.objects.filter(
            user=request.user,
            type='mention',
            is_read=False,
        )

        if mark_all:
            updated = qs.update(is_read=True, read_at=now)
        elif notification_ids:
            updated = qs.filter(id__in=notification_ids).update(is_read=True, read_at=now)
        else:
            return Response({'error': 'Provide notification_ids or mark_all'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': True, 'marked_read': updated})


# ===================================================================
# SHIFT SCHEDULING VIEWS (ADMIN)
# ===================================================================

class AdminShiftScheduleView(views.APIView):
    """
    List and create weekly shift schedules.

    GET  /api/admin/support/shifts/           → list all schedules (filterable by ?agent=<uuid>)
    POST /api/admin/support/shifts/           → create a new schedule
    """
    permission_classes = [HasPermission]
    required_permissions = ['support.manage_config']

    def get(self, request):
        schedules = AgentShiftSchedule.objects.select_related('agent').all()
        agent_id = request.query_params.get('agent')
        if agent_id:
            schedules = schedules.filter(agent_id=agent_id)
        serializer = AgentShiftScheduleSerializer(schedules, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AgentShiftScheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminShiftScheduleDetailView(views.APIView):
    """
    Update or delete a specific shift schedule.

    PATCH  /api/admin/support/shifts/<uuid:id>/  → update
    DELETE /api/admin/support/shifts/<uuid:id>/  → delete
    """
    permission_classes = [HasPermission]
    required_permissions = ['support.manage_config']

    def patch(self, request, id):
        schedule = get_object_or_404(AgentShiftSchedule, id=id)
        serializer = AgentShiftScheduleSerializer(schedule, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, id):
        schedule = get_object_or_404(AgentShiftSchedule, id=id)
        schedule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminShiftOverrideView(views.APIView):
    """
    List and create date-specific shift overrides.

    GET  /api/admin/support/shifts/overrides/  → list overrides (future only by default, ?all=true for all)
    POST /api/admin/support/shifts/overrides/  → create an override
    """
    permission_classes = [HasPermission]
    required_permissions = ['support.manage_config']

    def get(self, request):
        overrides = AgentShiftOverride.objects.select_related('agent').all()
        agent_id = request.query_params.get('agent')
        if agent_id:
            overrides = overrides.filter(agent_id=agent_id)
        if not request.query_params.get('all'):
            from django.utils import timezone as tz
            overrides = overrides.filter(date__gte=tz.now().date())
        serializer = AgentShiftOverrideSerializer(overrides, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AgentShiftOverrideSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminShiftOverrideDetailView(views.APIView):
    """
    Delete a specific shift override.

    DELETE /api/admin/support/shifts/overrides/<uuid:id>/
    """
    permission_classes = [HasPermission]
    required_permissions = ['support.manage_config']

    def delete(self, request, id):
        override = get_object_or_404(AgentShiftOverride, id=id)
        override.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminOnDutyView(views.APIView):
    """
    Check which agents are currently on shift.

    GET /api/admin/support/shifts/on-duty/
    """
    permission_classes = [HasPermission]
    required_permissions = ['support.view']

    def get(self, request):
        agents = get_on_shift_agents()
        agent_list = agents.values('id', 'first_name', 'last_name', 'email', 'role')
        has_schedules = AgentShiftSchedule.objects.exists()
        return Response({
            'has_schedules': has_schedules,
            'agents': list(agent_list),
        })


class AdminFAQCollectionViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD for FAQ collections.
    """
    queryset = FAQCollection.objects.all()
    serializer_class = FAQCollectionSerializer
    permission_classes = [HasPermission]
    required_permissions = ['faq.manage']
    ordering = ['display_order', 'title']


class AdminFAQArticleViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD for FAQ articles.
    """
    queryset = FAQArticle.objects.all()
    serializer_class = FAQArticleSerializer
    permission_classes = [HasPermission]
    required_permissions = ['faq.manage']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['collection', 'is_active']
    search_fields = ['title', 'content', 'search_keywords']
    ordering = ['collection__display_order', 'display_order', 'title']


class AdminFAQImportView(views.APIView):
    """
    Import FAQ collections and articles from markdown.

    POST /api/admin/support/faq/import/
    """
    permission_classes = [HasPermission]
    required_permissions = ['faq.manage']

    def post(self, request):
        """
        Import FAQ data from markdown content.

        Expected format:
        {
            "markdown": "# WeFund FAQ Data Export\n...",
            "clear": true
        }
        """
        import re
        import json

        data = request.data
        markdown_content = data.get('markdown', '')
        clear_existing = data.get('clear', False)

        if not markdown_content:
            return Response(
                {'error': 'No markdown content provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Parse markdown to extract JSON blocks
            json_pattern = r'```json\s*\n([\s\S]*?)\n\s*```'
            matches = re.findall(json_pattern, markdown_content)

            if len(matches) < 2:
                return Response(
                    {'error': f'Expected at least 2 JSON blocks, found {len(matches)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # First block is collections
            collections_json = '\n'.join(line.strip() for line in matches[0].split('\n'))
            collections_data = json.loads(collections_json)

            # Remaining blocks are articles for each collection (in order)
            articles_data = {}
            for i, articles_json in enumerate(matches[1:]):
                if i >= len(collections_data):
                    break
                collection_title = collections_data[i]['title']
                cleaned_json = '\n'.join(line.strip() for line in articles_json.split('\n'))
                articles_data[collection_title] = json.loads(cleaned_json)

            # Clear existing data if requested
            if clear_existing:
                FAQArticle.objects.all().delete()
                FAQCollection.objects.all().delete()

            # Create collections
            collection_map = {}
            collections_created = 0

            for coll_data in collections_data:
                collection, created = FAQCollection.objects.update_or_create(
                    title=coll_data['title'],
                    defaults={
                        'description': coll_data.get('description', ''),
                        'icon': coll_data.get('icon', ''),
                        'display_order': coll_data.get('display_order', 0),
                        'is_active': coll_data.get('is_active', True),
                    }
                )
                collection_map[coll_data['title']] = collection
                if created:
                    collections_created += 1

            # Create articles
            articles_created = 0

            for collection_title, articles_list in articles_data.items():
                collection = collection_map.get(collection_title)
                if not collection:
                    continue

                for art_data in articles_list:
                    article, created = FAQArticle.objects.update_or_create(
                        collection=collection,
                        title=art_data['title'],
                        defaults={
                            'content': art_data.get('content', ''),
                            'search_keywords': art_data.get('search_keywords', []),
                            'display_order': art_data.get('display_order', 0),
                            'is_active': art_data.get('is_active', True),
                        }
                    )
                    if created:
                        articles_created += 1

            return Response({
                'success': True,
                'collections_created': collections_created,
                'articles_created': articles_created,
                'total_collections': len(collections_data),
                'total_articles': sum(len(a) for a in articles_data.values()),
            })

        except json.JSONDecodeError as e:
            return Response(
                {'error': f'Invalid JSON in markdown: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupportAttachmentUploadView(views.APIView):
    """
    File attachment upload endpoint.

    POST /api/support/upload-attachment/
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    # Allowed file types and max size
    ALLOWED_TYPES = {
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
        'application/pdf',
    }
    MAX_SIZE = 25 * 1024 * 1024  # 25MB

    def post(self, request):
        """
        Upload attachment for a conversation.

        Request (multipart/form-data):
        - conversation_id: UUID
        - file: File

        Response:
        {
            "url": "https://cdn.../...",
            "name": "filename.png",
            "type": "image/png",
            "scan_status": "clean"
        }
        """
        conversation_id = request.data.get('conversation_id')
        file = request.FILES.get('file')

        if not conversation_id:
            return Response(
                {'error': 'conversation_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not file:
            return Response(
                {'error': 'file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify conversation ownership (staff can upload to any conversation)
        if request.user.is_staff:
            conversation = get_object_or_404(SupportConversation, id=conversation_id)
        else:
            conversation = get_object_or_404(
                SupportConversation,
                id=conversation_id,
                user=request.user
            )

        # Check if attachments are enabled (staff can always upload)
        if not request.user.is_staff and not conversation.attachments_enabled:
            return Response(
                {'error': 'Attachments are not enabled for this conversation'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validate file type
        if file.content_type not in self.ALLOWED_TYPES:
            return Response(
                {'error': f'File type {file.content_type} not allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size
        if file.size > self.MAX_SIZE:
            return Response(
                {'error': f'File size exceeds maximum of {self.MAX_SIZE // (1024*1024)}MB'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate filename and upload
        import uuid
        ext = file.name.split('.')[-1] if '.' in file.name else 'bin'
        filename = f"chat_attachments/{request.user.id}/{uuid.uuid4().hex}.{ext}"

        try:
            from api.utils.bunnycdn import upload_to_bunnycdn
            cdn_url = upload_to_bunnycdn(file, filename)

            return Response({
                'url': cdn_url,
                'name': file.name,
                'type': file.content_type,
                'scan_status': 'clean',  # Placeholder - implement actual scanning
            })

        except Exception as e:
            logger.error(f"File upload error: {e}")
            return Response(
                {'error': 'Failed to upload file'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupportWidgetScriptView(views.APIView):
    """
    Serve the support widget JavaScript file.

    GET /api/support/widget.js
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        import os
        from django.http import HttpResponse

        # Get the widget JS file path
        widget_path = os.path.join(
            os.path.dirname(__file__),
            'widget',
            'support-widget.js'
        )

        try:
            with open(widget_path, 'r') as f:
                content = f.read()

            response = HttpResponse(content, content_type='application/javascript')
            response['Cache-Control'] = 'public, max-age=3600'  # Cache for 1 hour
            return response

        except FileNotFoundError:
            return HttpResponse(
                '// Widget file not found',
                content_type='application/javascript',
                status=404
            )


class AdminWidgetConfigurationView(views.APIView):
    """
    Widget configuration and embed code generator for CRM.

    GET /api/admin/support/widget-config/
    Returns embed codes, integration guides, and customization options.
    """
    permission_classes = [HasPermission]
    required_permissions = ['support.manage_config']

    def get(self, request):
        """Get widget configuration and embed codes."""
        from django.conf import settings

        # Get AI config for widget settings
        config = SupportAIConfig.get_config()

        # Determine API base URL from request
        # api_base_url is for API calls (e.g., https://api.we-fund.com)
        # widget_base_url is for the widget script (same domain, no /api prefix)
        api_base_url = request.build_absolute_uri('/').rstrip('/')
        widget_base_url = api_base_url  # Widget is served at root, not under /api
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://dashboard.we-fund.com')

        # Build embed code snippets
        embed_code = self._generate_embed_code(api_base_url, widget_base_url)
        react_code = self._generate_react_code(api_base_url, widget_base_url)
        nextjs_code = self._generate_nextjs_code(api_base_url, widget_base_url)

        return Response({
            'widget_settings': {
                'ai_enabled': config.ai_enabled,
                'greeting_message': config.ai_greeting,
                'attachments_enabled': True,
                'max_attachment_size_mb': 10,
                'allowed_file_types': [
                    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                    'application/pdf', 'text/plain'
                ],
            },
            'api_endpoints': {
                'base_url': api_base_url,
                'start_conversation': f'{api_base_url}/support/chat/start_conversation/',
                'send_message': f'{api_base_url}/support/chat/send_message/',
                'get_conversation': f'{api_base_url}/support/chat/get_conversation/',
                'list_conversations': f'{api_base_url}/support/chat/list_conversations/',
                'upload_attachment': f'{api_base_url}/support/upload-attachment/',
                'faq_search': f'{api_base_url}/support/faq/search/',
            },
            'embed_codes': {
                'html_script': embed_code,
                'react_component': react_code,
                'nextjs_component': nextjs_code,
            },
            'customization': {
                'primary_color': '#6366f1',
                'position': 'bottom-right',
                'greeting_delay_ms': 3000,
                'sound_enabled': True,
            },
            'integration_instructions': self._get_integration_instructions(frontend_url),
            'important_notes': [
                'Each conversation is isolated per user and optionally per account.',
                'The AI assistant has access to account details for the specified user/account only.',
                'Chat history is persistent and can be exported by users.',
                'Agents can view and respond to chats from the Support Dashboard in the CRM.',
                'Messages are automatically analyzed for emotional content and escalated when needed.',
            ],
        })

    def _generate_embed_code(self, api_base_url: str, widget_base_url: str) -> str:
        """Generate HTML embed code snippet."""
        return f'''<!-- WeFund Support Widget -->
<script>
  window.WeFundSupport = {{
    // Required: User identification (get from your auth system)
    userId: 'USER_UUID_HERE',
    userEmail: 'user@example.com',
    userName: 'John',

    // Optional: Link to specific MT5 account
    accountLogin: 'MT5_ACCOUNT_LOGIN',

    // API endpoint (do not change)
    apiBaseUrl: '{api_base_url}',

    // Widget customization
    position: 'bottom-right',  // 'bottom-right' or 'bottom-left'
    primaryColor: '#6366f1',
    greeting: 'Hi! How can I help you today?',
  }};
</script>
<script src="{widget_base_url}/support/widget.js" async></script>'''

    def _generate_react_code(self, api_base_url: str, widget_base_url: str) -> str:
        """Generate React component code snippet."""
        return f'''// SupportWidget.tsx
import {{ useEffect }} from 'react';
import {{ useAuth }} from './your-auth-hook'; // Your auth hook

declare global {{
  interface Window {{
    WeFundSupport?: {{
      userId: string;
      userEmail: string;
      userName: string;
      accountLogin?: string;
      apiBaseUrl: string;
      position?: 'bottom-right' | 'bottom-left';
      primaryColor?: string;
      greeting?: string;
    }};
  }}
}}

export function SupportWidget() {{
  const {{ user }} = useAuth();

  useEffect(() => {{
    if (!user) return;

    // Configure widget
    window.WeFundSupport = {{
      userId: user.id,
      userEmail: user.email,
      userName: user.firstName || user.email.split('@')[0],
      accountLogin: user.activeAccountLogin, // Optional
      apiBaseUrl: '{api_base_url}',
      position: 'bottom-right',
      primaryColor: '#6366f1',
    }};

    // Load widget script
    const script = document.createElement('script');
    script.src = '{widget_base_url}/support/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {{
      document.body.removeChild(script);
      delete window.WeFundSupport;
    }};
  }}, [user]);

  return null;
}}

// Usage in your App.tsx or layout:
// <SupportWidget />'''

    def _generate_nextjs_code(self, api_base_url: str, widget_base_url: str) -> str:
        """Generate Next.js component code snippet."""
        return f'''// components/SupportWidget.tsx
'use client';

import {{ useEffect }} from 'react';
import {{ useSession }} from 'next-auth/react'; // Or your auth provider
import Script from 'next/script';

export function SupportWidget() {{
  const {{ data: session }} = useSession();

  useEffect(() => {{
    if (!session?.user) return;

    window.WeFundSupport = {{
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name || session.user.email.split('@')[0],
      apiBaseUrl: '{api_base_url}',
      position: 'bottom-right',
      primaryColor: '#6366f1',
    }};
  }}, [session]);

  if (!session?.user) return null;

  return (
    <Script
      src="{widget_base_url}/support/widget.js"
      strategy="lazyOnload"
    />
  );
}}

// Usage in app/layout.tsx:
// import {{ SupportWidget }} from '@/components/SupportWidget';
// <SupportWidget />'''

    def _get_integration_instructions(self, frontend_url: str) -> list:
        """Get integration instructions."""
        return [
            {
                'step': 1,
                'title': 'User Authentication',
                'description': f'Replace USER_UUID_HERE with the actual user ID from your authentication system. This must be the same UUID stored in the WeFund database.',
            },
            {
                'step': 2,
                'title': 'Account Context (Optional)',
                'description': 'If you want the chat to be specific to an MT5 account, set accountLogin to the account\'s login number. This enables the AI to provide account-specific support.',
            },
            {
                'step': 3,
                'title': 'User Info',
                'description': 'Set userEmail and userName for personalization and agent context. The AI uses this to provide a personalized experience.',
            },
            {
                'step': 4,
                'title': 'Placement',
                'description': 'Add the script tag just before </body> for best performance. For React/Next.js, use the provided component in your root layout.',
            },
            {
                'step': 5,
                'title': 'Authentication Token',
                'description': 'The widget automatically uses the user\'s existing authentication token (stored in localStorage as "client_token"). Ensure your auth system stores the JWT there.',
            },
        ]


class AdminWidgetCustomizationView(views.APIView):
    """
    Save widget customization settings.

    PATCH /api/admin/support/widget-customization/
    """
    permission_classes = [HasPermission]
    required_permissions = ['support.manage_config']

    def patch(self, request):
        """Update widget customization."""
        config = SupportAIConfig.get_config()

        # Update allowed fields
        allowed_fields = [
            'ai_greeting', 'ai_enabled', 'complexity_threshold',
            'confidence_threshold', 'escalation_keywords'
        ]

        updated = {}
        for field in allowed_fields:
            if field in request.data:
                setattr(config, field, request.data[field])
                updated[field] = request.data[field]

        if updated:
            config.save()
            log_event(
                request=request,
                user=request.user,
                category='support',
                event_type='widget_customization_updated',
                metadata={'changes': updated},
                description=f"Widget customization updated by {request.user.email}"
            )

        return Response({
            'success': True,
            'updated': updated,
        })


class AdminSupportAIFeedbackViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD for AI feedback on support messages.

    Endpoints:
    - GET /api/admin/support/feedback/ - List all feedback
    - POST /api/admin/support/feedback/ - Submit feedback
    - GET /api/admin/support/feedback/{id}/ - Get feedback
    - PATCH /api/admin/support/feedback/{id}/ - Update feedback
    - DELETE /api/admin/support/feedback/{id}/ - Delete feedback
    - GET /api/admin/support/feedback/stats/ - Get feedback stats
    - GET /api/admin/support/feedback/training-examples/ - Get training examples
    """
    queryset = SupportAIFeedback.objects.all()
    serializer_class = SupportAIFeedbackSerializer
    permission_classes = [HasPermission]
    required_permissions = ['support.manage']
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['conversation', 'message', 'feedback_type', 'should_be_training_example']
    ordering_fields = ['created_at', 'rating', 'training_priority']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()

        # Filter by conversation_id if provided
        conversation_id = self.request.query_params.get('conversation_id')
        if conversation_id:
            qs = qs.filter(conversation_id=conversation_id)

        # Filter by message_id if provided
        message_id = self.request.query_params.get('message_id')
        if message_id:
            qs = qs.filter(message_id=message_id)

        return qs.select_related('conversation', 'message', 'agent')

    def perform_create(self, serializer):
        """
        Auto-assign agent from request user and set training flags based on feedback quality.

        Training Priority Logic:
        - Rating 5 (excellent): priority=10, training=True
        - Rating 4 (good): priority=5, training=True
        - Correction provided: priority=8, training=True
        - Rating < 4 without correction: priority=0, training=False
        """
        from api.support_training import TrainingExampleService

        rating = serializer.validated_data.get('rating')
        correction_made = serializer.validated_data.get('correction_made', '')
        feedback_type = serializer.validated_data.get('feedback_type')

        # Determine training eligibility and priority
        should_train = False
        priority = 0

        if rating and rating >= 5:
            should_train = True
            priority = 10
        elif rating and rating >= 4:
            should_train = True
            priority = 5
        elif correction_made and correction_made.strip():
            should_train = True
            priority = 8  # Corrections are very valuable
        elif feedback_type == 'helpful':
            should_train = True
            priority = 5

        # Save with computed training flags
        instance = serializer.save(
            agent=self.request.user,
            should_be_training_example=should_train,
            training_priority=priority,
            needed_correction=bool(correction_made and correction_made.strip()),
        )

        # Invalidate cache so next query uses new training data
        if should_train:
            TrainingExampleService.invalidate_cache()
            logger.info(f"New training example created: feedback_id={instance.id}, priority={priority}")

    def perform_update(self, serializer):
        """
        Handle updates to feedback - recalculate training flags and invalidate cache.
        """
        from api.support_training import TrainingExampleService

        instance = serializer.instance
        rating = serializer.validated_data.get('rating', instance.rating)
        correction_made = serializer.validated_data.get('correction_made', instance.correction_made)
        feedback_type = serializer.validated_data.get('feedback_type', instance.feedback_type)

        # Recalculate training eligibility and priority
        should_train = False
        priority = 0

        if rating and rating >= 5:
            should_train = True
            priority = 10
        elif rating and rating >= 4:
            should_train = True
            priority = 5
        elif correction_made and correction_made.strip():
            should_train = True
            priority = 8
        elif feedback_type == 'helpful':
            should_train = True
            priority = 5

        # Check if training status changed
        was_training = instance.should_be_training_example
        training_changed = was_training != should_train

        # Save with updated training flags
        serializer.save(
            should_be_training_example=should_train,
            training_priority=priority,
            needed_correction=bool(correction_made and str(correction_made).strip()),
        )

        # Invalidate cache if training status changed or if it was/is a training example
        if training_changed or should_train or was_training:
            TrainingExampleService.invalidate_cache()
            logger.info(f"Training example updated: feedback_id={instance.id}, priority={priority}")

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Get AI feedback statistics.
        """
        from django.db.models import Avg

        total = SupportAIFeedback.objects.count()
        avg_rating = SupportAIFeedback.objects.aggregate(Avg('rating'))['rating__avg'] or 0

        helpful = SupportAIFeedback.objects.filter(feedback_type='helpful').count()
        not_helpful = SupportAIFeedback.objects.filter(
            feedback_type__in=['not_helpful', 'wrong_info', 'inappropriate']
        ).count()
        training_examples = SupportAIFeedback.objects.filter(
            should_be_training_example=True
        ).count()

        return Response({
            'total_feedback': total,
            'average_rating': round(avg_rating, 2),
            'helpful_count': helpful,
            'not_helpful_count': not_helpful,
            'training_examples_count': training_examples,
        })

    @action(detail=False, methods=['get'], url_path='training-examples')
    def training_examples(self, request):
        """
        Get feedback marked as training examples.
        """
        examples = SupportAIFeedback.objects.filter(
            should_be_training_example=True
        ).order_by('-training_priority', '-created_at')

        serializer = self.get_serializer(examples, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by-message/(?P<message_id>[^/.]+)')
    def by_message(self, request, message_id=None):
        """
        Get feedback for a specific message.
        """
        feedback = SupportAIFeedback.objects.filter(message_id=message_id).first()
        if not feedback:
            return Response(None)
        serializer = self.get_serializer(feedback)
        return Response(serializer.data)


# ===================================================================
# GUEST CHAT (UNAUTHENTICATED WEBSITE VISITORS)
# ===================================================================

class GuestChatStartThrottle(AnonRateThrottle):
    rate = '5/hour'


class GuestChatMessageThrottle(AnonRateThrottle):
    rate = '30/hour'


class GuestChatPollThrottle(AnonRateThrottle):
    rate = '120/hour'


class GuestSupportChatViewSet(viewsets.ViewSet):
    """
    Guest (unauthenticated) chat endpoints for website visitors.

    All endpoints use AllowAny permission with rate limiting.
    Uses session_token for conversation continuity instead of JWT auth.

    Endpoints:
    - POST /api/support/guest-chat/start-conversation/
    - POST /api/support/guest-chat/send-message/
    - POST /api/support/guest-chat/get-messages/
    - POST /api/support/guest-chat/end-conversation/
    """
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'], url_path='start-conversation',
            throttle_classes=[GuestChatStartThrottle])
    def start_conversation(self, request):
        """
        Start a new guest conversation.

        Request: {"guest_name": "John", "guest_email": "john@example.com"}
        Response: {"conversation_id": "...", "session_token": "...", "greeting": "..."}
        """
        serializer = GuestConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        guest_name = serializer.validated_data['guest_name']
        guest_email = serializer.validated_data['guest_email']

        config = SupportAIConfig.get_config()

        # Always create a new conversation.
        # Session resume is handled client-side via localStorage + get-messages.
        # We do NOT resume by email server-side to prevent session token leakage
        # (anyone who knows an email could hijack another visitor's conversation).
        session_token = secrets.token_hex(32)

        conversation = SupportConversation.objects.create(
            user=None,
            guest_name=guest_name,
            guest_email=guest_email,
            session_token=session_token,
            source='website',
            ai_enabled=config.ai_enabled,
            attachments_enabled=False,
        )

        # Create greeting message
        greeting = config.ai_greeting
        SupportMessage.objects.create(
            conversation=conversation,
            sender_type='ai',
            content=greeting,
            metadata={'auto_greeting': True}
        )

        return Response({
            'conversation_id': str(conversation.id),
            'session_token': session_token,
            'greeting': greeting,
            'messages': [{
                'id': str(conversation.messages.first().id),
                'sender_type': 'ai',
                'content': greeting,
                'created_at': conversation.messages.first().created_at.isoformat(),
            }],
            'resumed': False,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='send-message',
            throttle_classes=[GuestChatMessageThrottle])
    def send_message(self, request):
        """
        Send a message in a guest conversation.

        Request: {"session_token": "...", "message": "Hello!"}
        Response: {"user_message": {...}, "ai_response": {...}, ...}
        """
        serializer = GuestSendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_token = serializer.validated_data['session_token']
        message = serializer.validated_data['message']
        attachment = serializer.validated_data.get('attachment')

        conversation = SupportConversation.objects.filter(
            session_token=session_token,
            source='website',
        ).first()

        if not conversation:
            return Response(
                {'error': 'Invalid session token'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Reopen resolved conversations when client sends a new message
        if conversation.status == 'resolved':
            conversation.status = 'active'
            conversation.resolved_at = None
            conversation.ai_enabled = True

        # Update last_message_at
        conversation.last_message_at = timezone.now()
        conversation.save(update_fields=[
            'status', 'resolved_at', 'ai_enabled',
            'last_message_at', 'updated_at'
        ])

        # Process through guest message handler
        result = SupportChatService.process_guest_message(
            conversation=conversation,
            user_message=message,
            attachment=attachment,
        )

        return Response(result)

    @action(detail=False, methods=['post'], url_path='get-messages',
            throttle_classes=[GuestChatPollThrottle])
    def get_messages(self, request):
        """
        Poll for new messages (agent replies) in a guest conversation.

        Request: {"session_token": "...", "after": "2026-01-01T00:00:00Z"}
        Response: {"messages": [...]}
        """
        session_token = request.data.get('session_token')
        if not session_token:
            return Response(
                {'error': 'session_token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        conversation = SupportConversation.objects.filter(
            session_token=session_token,
            source='website',
        ).first()

        if not conversation:
            return Response(
                {'error': 'Invalid session token'},
                status=status.HTTP_404_NOT_FOUND
            )

        messages_qs = conversation.messages.filter(is_internal=False).order_by('created_at')

        # Filter by timestamp if provided
        after = request.data.get('after')
        if after:
            from django.utils.dateparse import parse_datetime
            after_dt = parse_datetime(after)
            if after_dt:
                messages_qs = messages_qs.filter(created_at__gt=after_dt)

        messages = [
            {
                'id': str(m.id),
                'sender_type': m.sender_type,
                'content': m.content,
                'metadata': m.metadata or {},
                'attachment_url': m.attachment_url,
                'attachment_name': m.attachment_name,
                'attachment_type': m.attachment_type,
                'created_at': m.created_at.isoformat(),
            }
            for m in messages_qs
        ]

        return Response({
            'messages': messages,
            'conversation_status': conversation.status,
            'attachments_enabled': conversation.attachments_enabled,
        })

    @action(detail=False, methods=['post'], url_path='end-conversation',
            throttle_classes=[GuestChatMessageThrottle])
    def end_conversation(self, request):
        """
        End/resolve a guest conversation.

        Request: {"session_token": "..."}
        Response: {"status": "resolved"}
        """
        session_token = request.data.get('session_token')
        if not session_token:
            return Response(
                {'error': 'session_token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        conversation = SupportConversation.objects.filter(
            session_token=session_token,
            source='website',
        ).first()

        if not conversation:
            return Response(
                {'error': 'Invalid session token'},
                status=status.HTTP_404_NOT_FOUND
            )

        conversation.status = 'resolved'
        conversation.resolved_at = timezone.now()
        conversation.session_token = None  # Invalidate token
        conversation.save(update_fields=['status', 'resolved_at', 'session_token', 'updated_at'])

        return Response({'status': 'resolved'})

    @action(detail=False, methods=['post'], url_path='upload-attachment',
            throttle_classes=[GuestChatMessageThrottle])
    def upload_attachment(self, request):
        """
        Upload an attachment for a guest conversation.

        Request (multipart/form-data):
        - session_token: str
        - file: File

        Response: {"url": "...", "name": "...", "type": "...", "scan_status": "clean"}
        """
        session_token = request.data.get('session_token')
        file = request.FILES.get('file')

        if not session_token:
            return Response(
                {'error': 'session_token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not file:
            return Response(
                {'error': 'file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        conversation = SupportConversation.objects.filter(
            session_token=session_token,
            source='website',
        ).first()

        if not conversation:
            return Response(
                {'error': 'Invalid session token'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not conversation.attachments_enabled:
            return Response(
                {'error': 'Attachments are not enabled for this conversation'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Reuse same validation constants as SupportAttachmentUploadView
        ALLOWED_TYPES = {
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/quicktime',
            'application/pdf',
        }
        MAX_SIZE = 25 * 1024 * 1024  # 25MB

        if file.content_type not in ALLOWED_TYPES:
            return Response(
                {'error': f'File type {file.content_type} not allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if file.size > MAX_SIZE:
            return Response(
                {'error': f'File size exceeds maximum of {MAX_SIZE // (1024*1024)}MB'},
                status=status.HTTP_400_BAD_REQUEST
            )

        import uuid as uuid_lib
        ext = file.name.split('.')[-1] if '.' in file.name else 'bin'
        filename = f"chat_attachments/guest/{uuid_lib.uuid4().hex}.{ext}"

        try:
            from api.utils.bunnycdn import upload_to_bunnycdn
            cdn_url = upload_to_bunnycdn(file, filename)

            return Response({
                'url': cdn_url,
                'name': file.name,
                'type': file.content_type,
                'scan_status': 'clean',
            })

        except Exception as e:
            logger.error(f"Guest file upload error: {e}")
            return Response(
                {'error': 'Failed to upload file'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # Override parser_classes for the upload action
    def get_parsers(self):
        if getattr(self, 'action', None) == 'upload_attachment':
            return [MultiPartParser(), FormParser()]
        return super().get_parsers()


class GuestWidgetScriptView(views.APIView):
    """
    Serve the guest chat widget JavaScript file.

    GET /api/support/guest-widget.js
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        import os
        from django.http import HttpResponse

        widget_path = os.path.join(
            os.path.dirname(__file__),
            'widget',
            'guest-widget.js'
        )

        try:
            with open(widget_path, 'r') as f:
                content = f.read()

            response = HttpResponse(content, content_type='application/javascript')
            response['Cache-Control'] = 'public, max-age=3600'
            return response

        except FileNotFoundError:
            return HttpResponse(
                '// Guest widget file not found',
                content_type='application/javascript',
                status=404
            )
