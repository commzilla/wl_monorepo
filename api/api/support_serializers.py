"""
Serializers for Support Chat Widget API.
"""
from rest_framework import serializers
from django.utils import timezone
from wefund.models import (
    SupportAIConfig,
    SupportConversation,
    SupportMessage,
    FAQCollection,
    FAQArticle,
    SupportAIFeedback,
    AgentShiftSchedule,
    AgentShiftOverride,
    EmailTemplate,
    Notification,
)


# ===================================================================
# MESSAGE SERIALIZERS
# ===================================================================

class MessageSerializer(serializers.ModelSerializer):
    """
    Serializer for individual support messages.
    """
    sender_display = serializers.SerializerMethodField()
    sender_id = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()
    conversation_id = serializers.UUIDField(source='conversation.id', read_only=True)
    email_meta = serializers.SerializerMethodField()

    class Meta:
        model = SupportMessage
        fields = [
            'id',
            'conversation',
            'conversation_id',
            'sender_type',
            'sender',
            'sender_id',
            'sender_name',
            'sender_display',
            'message_type',
            'content',
            'is_internal',
            'attachment_url',
            'attachment_name',
            'attachment_type',
            'attachment_scan_status',
            'emotional_context',
            'metadata',
            'email_meta',
            'created_at',
            'edited_at',
            'is_deleted',
        ]
        read_only_fields = ['id', 'created_at', 'emotional_context', 'metadata', 'edited_at', 'is_deleted']

    def get_email_meta(self, obj):
        """Return email-specific metadata for email messages."""
        if obj.message_type != 'email':
            return None
        meta = obj.metadata or {}
        return {
            'subject': meta.get('email_subject'),
            'from_email': meta.get('email_from'),
            'to_email': meta.get('email_to'),
        }

    def get_sender_id(self, obj):
        """Return sender's user ID as string."""
        return str(obj.sender.id) if obj.sender else None

    def get_sender_name(self, obj):
        """Return sender's display name."""
        if obj.sender_type == 'user':
            if obj.sender:
                return obj.sender.get_full_name() or obj.sender.email
            return "User"
        elif obj.sender_type == 'ai':
            return "AI Assistant"
        elif obj.sender_type == 'agent':
            if obj.sender:
                return obj.sender.get_full_name() or obj.sender.username or "Support Agent"
            return "Support Agent"
        return None

    def get_sender_display(self, obj):
        """Return human-readable sender name."""
        if obj.sender_type == 'user':
            if obj.sender:
                return obj.sender.get_full_name() or obj.sender.email
            return "User"
        elif obj.sender_type == 'ai':
            return "AI Assistant"
        elif obj.sender_type == 'agent':
            if obj.sender:
                return f"Agent: {obj.sender.get_full_name() or obj.sender.username}"
            return "Support Agent"
        return obj.sender_type


class MessageListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for message lists (excludes heavy fields).
    """
    sender_display = serializers.SerializerMethodField()
    sender_id = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()
    conversation_id = serializers.UUIDField(source='conversation.id', read_only=True)
    email_meta = serializers.SerializerMethodField()

    class Meta:
        model = SupportMessage
        fields = [
            'id',
            'conversation_id',
            'sender_type',
            'sender_id',
            'sender_name',
            'sender_display',
            'message_type',
            'content',
            'is_internal',
            'attachment_url',
            'attachment_name',
            'metadata',
            'email_meta',
            'created_at',
            'edited_at',
            'is_deleted',
        ]

    def get_email_meta(self, obj):
        if obj.message_type != 'email':
            return None
        meta = obj.metadata or {}
        return {
            'subject': meta.get('email_subject'),
            'from_email': meta.get('email_from'),
            'to_email': meta.get('email_to'),
        }

    def get_sender_id(self, obj):
        return str(obj.sender.id) if obj.sender else None

    def get_sender_name(self, obj):
        if obj.sender_type == 'user':
            if obj.sender:
                return obj.sender.get_full_name() or obj.sender.email
            # Guest user — try conversation guest_name
            return getattr(obj.conversation, 'guest_name', None) or "Guest"
        elif obj.sender_type == 'ai':
            return "AI Assistant"
        elif obj.sender_type == 'agent':
            if obj.sender:
                return obj.sender.get_full_name() or obj.sender.username or "Support Agent"
            return "Support Agent"
        return None

    def get_sender_display(self, obj):
        if obj.sender_type == 'user':
            if self.context.get('is_user_view'):
                return "You"
            if obj.sender:
                return obj.sender.get_full_name() or "User"
            return getattr(obj.conversation, 'guest_name', None) or "Guest"
        elif obj.sender_type == 'ai':
            return "AI Assistant"
        elif obj.sender_type == 'agent':
            return f"Agent: {obj.sender.get_full_name()}" if obj.sender else "Support Agent"
        return obj.sender_type


# ===================================================================
# CONVERSATION SERIALIZERS
# ===================================================================

class ConversationSerializer(serializers.ModelSerializer):
    """
    List view serializer for conversations.
    """
    last_message = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()
    assigned_agent_id = serializers.SerializerMethodField()
    assigned_agent_name = serializers.SerializerMethodField()
    is_guest = serializers.BooleanField(read_only=True)
    has_mention_for_me = serializers.SerializerMethodField()

    class Meta:
        model = SupportConversation
        fields = [
            'id',
            'user',
            'user_email',
            'user_name',
            'account_login',
            'status',
            'priority',
            'ai_enabled',
            'subject',
            'email_subject',
            'source',
            'needs_human_review',
            'assigned_agent',
            'assigned_agent_id',
            'assigned_agent_name',
            'created_at',
            'updated_at',
            'last_message_at',
            'last_message_sender_type',
            'last_message',
            'message_count',
            'is_archived',
            'is_guest',
            'guest_name',
            'guest_email',
            'has_mention_for_me',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_message_at', 'last_message_sender_type']

    def get_user_email(self, obj):
        return obj.get_display_email()

    def get_user_name(self, obj):
        if obj.user:
            name = obj.user.get_full_name()
            if name:
                return name
            if obj.user.username:
                return obj.user.username
            if obj.user.email:
                return obj.user.email.split('@')[0]
        return obj.guest_name or 'Guest'

    def get_last_message(self, obj):
        last_msg = obj.messages.filter(is_internal=False).last()
        if last_msg:
            return {
                'content': last_msg.content[:100] + ('...' if len(last_msg.content) > 100 else ''),
                'sender_type': last_msg.sender_type,
                'created_at': last_msg.created_at,
            }
        return None

    def get_message_count(self, obj):
        return obj.messages.filter(is_internal=False).count()

    def get_assigned_agent_id(self, obj):
        if obj.assigned_agent:
            return str(obj.assigned_agent.id)
        return None

    def get_assigned_agent_name(self, obj):
        if obj.assigned_agent:
            return obj.assigned_agent.get_full_name() or obj.assigned_agent.username
        return None

    def get_has_mention_for_me(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return Notification.objects.filter(
            user=request.user,
            type='mention',
            is_read=False,
            action_url__contains=str(obj.id),
        ).exists()


class ConversationDetailSerializer(serializers.ModelSerializer):
    """
    Detail view serializer with full message history.
    """
    messages = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    assigned_agent_id = serializers.SerializerMethodField()
    assigned_agent_name = serializers.SerializerMethodField()
    is_guest = serializers.BooleanField(read_only=True)

    class Meta:
        model = SupportConversation
        fields = [
            'id',
            'user',
            'user_email',
            'user_name',
            'account_login',
            'status',
            'priority',
            'ai_enabled',
            'attachments_enabled',
            'subject',
            'email_subject',
            'source',
            'external_channel_id',
            'escalation_reason',
            'deescalation_attempted',
            'needs_human_review',
            'assigned_agent',
            'assigned_agent_id',
            'assigned_agent_name',
            'metadata',
            'is_archived',
            'is_guest',
            'guest_name',
            'guest_email',
            'created_at',
            'updated_at',
            'last_message_at',
            'last_message_sender_type',
            'resolved_at',
            'first_response_at',
            'agent_takeover_at',
            'messages',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'last_message_at',
            'last_message_sender_type', 'first_response_at', 'agent_takeover_at'
        ]

    def get_user_email(self, obj):
        return obj.get_display_email()

    def get_user_name(self, obj):
        if obj.user:
            name = obj.user.get_full_name()
            if name:
                return name
            if obj.user.username:
                return obj.user.username
            if obj.user.email:
                return obj.user.email.split('@')[0]
        return obj.guest_name or 'Guest'

    def get_assigned_agent_id(self, obj):
        if obj.assigned_agent:
            return str(obj.assigned_agent.id)
        return None

    def get_assigned_agent_name(self, obj):
        if obj.assigned_agent:
            return obj.assigned_agent.get_full_name() or obj.assigned_agent.username
        return None

    def get_messages(self, obj):
        """
        Return messages filtered based on viewer's role.
        Users don't see internal notes; staff sees everything.
        """
        request = self.context.get('request')
        is_staff = request and request.user and request.user.is_staff

        queryset = obj.messages.all()
        if not is_staff:
            queryset = queryset.filter(is_internal=False)

        return MessageListSerializer(
            queryset,
            many=True,
            context={'is_user_view': not is_staff}
        ).data


class ConversationCreateSerializer(serializers.Serializer):
    """
    Serializer for starting a new conversation.
    """
    account_login = serializers.CharField(required=False, allow_blank=True)
    user_name = serializers.CharField(required=False, allow_blank=True)
    user_email = serializers.EmailField(required=False)


class SendMessageSerializer(serializers.Serializer):
    """
    Serializer for sending a message in a conversation.
    """
    conversation_id = serializers.UUIDField()
    message = serializers.CharField(min_length=1, max_length=10000)
    attachment = serializers.DictField(required=False, allow_null=True)

    def validate_attachment(self, value):
        if value:
            required_keys = ['url', 'name', 'type']
            for key in required_keys:
                if key not in value:
                    raise serializers.ValidationError(f"Attachment must include '{key}'")
        return value


# ===================================================================
# GUEST CHAT SERIALIZERS
# ===================================================================

class GuestConversationCreateSerializer(serializers.Serializer):
    """
    Serializer for starting a guest conversation (no auth required).
    """
    guest_name = serializers.CharField(max_length=200, required=True)
    guest_email = serializers.EmailField(required=True)


class GuestSendMessageSerializer(serializers.Serializer):
    """
    Serializer for sending a message in a guest conversation.
    """
    session_token = serializers.CharField(max_length=64, required=True)
    message = serializers.CharField(min_length=1, max_length=10000)
    attachment = serializers.DictField(required=False, allow_null=True)

    def validate_attachment(self, value):
        if value:
            required_keys = ['url', 'name', 'type']
            for key in required_keys:
                if key not in value:
                    raise serializers.ValidationError(f"Attachment must include '{key}'")
        return value


# ===================================================================
# FAQ SERIALIZERS
# ===================================================================

class FAQArticleSerializer(serializers.ModelSerializer):
    """
    Full article serializer with analytics.
    """
    collection_title = serializers.CharField(source='collection.title', read_only=True)
    helpfulness_ratio = serializers.ReadOnlyField()

    class Meta:
        model = FAQArticle
        fields = [
            'id',
            'collection',
            'collection_title',
            'title',
            'content',
            'search_keywords',
            'display_order',
            'is_active',
            'views_count',
            'helpful_count',
            'not_helpful_count',
            'helpfulness_ratio',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'views_count', 'helpful_count',
            'not_helpful_count', 'created_at', 'updated_at'
        ]


class FAQArticleListSerializer(serializers.ModelSerializer):
    """
    Lightweight article serializer for lists.
    """
    collection_title = serializers.CharField(source='collection.title', read_only=True)

    class Meta:
        model = FAQArticle
        fields = [
            'id',
            'collection_title',
            'title',
            'content',
            'display_order',
            'views_count',
            'helpful_count',
        ]


class FAQCollectionSerializer(serializers.ModelSerializer):
    """
    Collection serializer with article count.
    """
    article_count = serializers.ReadOnlyField()

    class Meta:
        model = FAQCollection
        fields = [
            'id',
            'title',
            'description',
            'icon',
            'display_order',
            'is_active',
            'article_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FAQCollectionDetailSerializer(serializers.ModelSerializer):
    """
    Collection with nested articles.
    """
    articles = FAQArticleListSerializer(many=True, read_only=True)
    article_count = serializers.ReadOnlyField()

    class Meta:
        model = FAQCollection
        fields = [
            'id',
            'title',
            'description',
            'icon',
            'display_order',
            'is_active',
            'article_count',
            'articles',
            'created_at',
            'updated_at',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Only include active articles
        data['articles'] = FAQArticleListSerializer(
            instance.articles.filter(is_active=True).order_by('display_order'),
            many=True
        ).data
        return data


class FAQSearchResultSerializer(serializers.ModelSerializer):
    """
    Search result with relevance score.
    """
    collection_title = serializers.CharField(source='collection.title', read_only=True)
    relevance_score = serializers.FloatField(read_only=True)

    class Meta:
        model = FAQArticle
        fields = [
            'id',
            'collection_title',
            'title',
            'content',
            'relevance_score',
        ]


# ===================================================================
# AI CONFIG SERIALIZER
# ===================================================================

class SupportAIConfigSerializer(serializers.ModelSerializer):
    """
    Admin-only serializer for AI configuration.
    """
    class Meta:
        model = SupportAIConfig
        fields = [
            'id',
            'ai_enabled',
            'ai_greeting',
            'ai_system_prompt',
            'simple_model',
            'complex_model',
            'complexity_threshold',
            'read_actions_enabled',
            'write_actions_enabled',
            'allowed_write_actions',
            'confidence_threshold',
            'escalation_keywords',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ===================================================================
# FEEDBACK SERIALIZER
# ===================================================================

class SupportAIFeedbackSerializer(serializers.ModelSerializer):
    """
    Serializer for AI feedback/training data.
    """
    agent_name = serializers.SerializerMethodField()

    class Meta:
        model = SupportAIFeedback
        fields = [
            'id',
            'conversation',
            'message',
            'agent',
            'agent_name',
            'feedback_type',
            'rating',
            'was_helpful',
            'needed_correction',
            'correction_made',
            'agent_notes',
            'should_be_training_example',
            'training_priority',
            'issue_categories',
            'created_at',
        ]
        read_only_fields = ['id', 'agent', 'agent_name', 'should_be_training_example', 'training_priority', 'needed_correction', 'created_at']

    def get_agent_name(self, obj):
        return obj.agent.get_full_name() or obj.agent.username


# ===================================================================
# ADMIN ACTION SERIALIZERS
# ===================================================================

class ConversationReplySerializer(serializers.Serializer):
    """
    Serializer for agent reply action.
    """
    content = serializers.CharField(min_length=1, max_length=10000)
    is_internal = serializers.BooleanField(default=False)
    attachment = serializers.DictField(required=False, allow_null=True)
    mentioned_user_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )

    def validate_attachment(self, value):
        if value:
            required_keys = ['url', 'name', 'type']
            for key in required_keys:
                if key not in value:
                    raise serializers.ValidationError(f"Attachment must include '{key}'")
        return value


class ConversationEscalateSerializer(serializers.Serializer):
    """
    Serializer for escalation action.
    """
    reason = serializers.CharField(required=True, min_length=5)
    priority = serializers.ChoiceField(
        choices=['normal', 'high', 'urgent'],
        default='high'
    )


class ConversationAssignSerializer(serializers.Serializer):
    """
    Serializer for agent assignment.
    """
    agent_id = serializers.UUIDField(required=False, allow_null=True)


class ConversationStatusSerializer(serializers.Serializer):
    """
    Serializer for status update.
    """
    status = serializers.ChoiceField(choices=['active', 'resolved', 'escalated'])


# ===================================================================
# EMAIL ACTION SERIALIZERS
# ===================================================================

class EmailReplySerializer(serializers.Serializer):
    """
    Serializer for sending an email reply in an existing conversation.
    """
    subject = serializers.CharField(max_length=500, required=False, allow_blank=True)
    body_html = serializers.CharField()
    body_text = serializers.CharField(required=False, allow_blank=True)
    template_id = serializers.IntegerField(required=False, allow_null=True)


class NewEmailConversationSerializer(serializers.Serializer):
    """
    Serializer for creating a new email conversation.
    """
    to_email = serializers.EmailField()
    subject = serializers.CharField(max_length=500)
    body_html = serializers.CharField()
    body_text = serializers.CharField(required=False, allow_blank=True)


class SupportEmailTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for email templates in the support category.
    """
    class Meta:
        model = EmailTemplate
        fields = ['id', 'name', 'subject', 'body_html', 'body_text', 'description']


# ===================================================================
# STATS SERIALIZER
# ===================================================================

class SupportStatsSerializer(serializers.Serializer):
    """
    Dashboard statistics serializer.
    """
    total_conversations = serializers.IntegerField()
    active_conversations = serializers.IntegerField()
    escalated_conversations = serializers.IntegerField()
    resolved_conversations = serializers.IntegerField()
    needs_review_count = serializers.IntegerField()
    avg_response_time_seconds = serializers.FloatField(allow_null=True)
    conversations_today = serializers.IntegerField()
    ai_response_rate = serializers.FloatField()


# ===================================================================
# SHIFT SCHEDULING SERIALIZERS
# ===================================================================

class AgentShiftScheduleSerializer(serializers.ModelSerializer):
    agent_name = serializers.SerializerMethodField()
    agent_email = serializers.EmailField(source='agent.email', read_only=True)

    class Meta:
        model = AgentShiftSchedule
        fields = [
            'id',
            'agent',
            'agent_name',
            'agent_email',
            'day_of_week',
            'start_time',
            'end_time',
            'timezone',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_agent_name(self, obj):
        return obj.agent.get_full_name() or obj.agent.email


class AgentShiftOverrideSerializer(serializers.ModelSerializer):
    agent_name = serializers.SerializerMethodField()
    agent_email = serializers.EmailField(source='agent.email', read_only=True)

    class Meta:
        model = AgentShiftOverride
        fields = [
            'id',
            'agent',
            'agent_name',
            'agent_email',
            'date',
            'is_blocked',
            'start_time',
            'end_time',
            'timezone',
            'reason',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_agent_name(self, obj):
        return obj.agent.get_full_name() or obj.agent.email

    def validate(self, data):
        if not data.get('is_blocked', True):
            if not data.get('start_time') or not data.get('end_time'):
                raise serializers.ValidationError(
                    "Custom hours require both start_time and end_time."
                )
        return data
