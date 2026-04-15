"""
Admin AI Assistant — Serializers.
"""
from rest_framework import serializers
from wefund.models import (
    AdminAIConfig,
    AdminAIConversation,
    AdminAIMessage,
    AdminAIFeedback,
    AdminAITrainingExample,
)


# ===================================================================
# CONFIG SERIALIZER
# ===================================================================

class AdminAIConfigSerializer(serializers.ModelSerializer):
    """Admin AI configuration serializer."""

    class Meta:
        model = AdminAIConfig
        fields = [
            'id',
            'ai_enabled',
            'ai_greeting',
            'ai_system_prompt',
            'simple_model',
            'standard_model',
            'pro_model',
            'complexity_threshold_standard',
            'complexity_threshold_pro',
            'read_actions_enabled',
            'write_actions_enabled',
            'allowed_read_actions',
            'allowed_write_actions',
            'confirmation_required_actions',
            'max_tokens',
            'temperature',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ===================================================================
# CONVERSATION SERIALIZERS
# ===================================================================

class AdminAIConversationSerializer(serializers.ModelSerializer):
    """List view serializer for conversations."""
    admin_email = serializers.EmailField(source='admin_user.email', read_only=True)
    admin_name = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = AdminAIConversation
        fields = [
            'id',
            'admin_user',
            'admin_email',
            'admin_name',
            'context_type',
            'context_id',
            'context_url',
            'is_active',
            'last_message_at',
            'message_count',
            'last_message_preview',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'last_message_at']

    def get_admin_name(self, obj):
        if obj.admin_user:
            return obj.admin_user.get_full_name() or obj.admin_user.email
        return 'Unknown'

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_last_message_preview(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if last:
            return {
                'role': last.role,
                'content': (last.content or '')[:100] + ('...' if len(last.content or '') > 100 else ''),
                'created_at': last.created_at,
            }
        return None


class AdminAIConversationDetailSerializer(serializers.ModelSerializer):
    """Detail view serializer with full message history."""
    admin_email = serializers.EmailField(source='admin_user.email', read_only=True)
    admin_name = serializers.SerializerMethodField()
    messages = serializers.SerializerMethodField()

    class Meta:
        model = AdminAIConversation
        fields = [
            'id',
            'admin_user',
            'admin_email',
            'admin_name',
            'context_type',
            'context_id',
            'context_url',
            'is_active',
            'last_message_at',
            'metadata',
            'created_at',
            'updated_at',
            'messages',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_message_at']

    def get_admin_name(self, obj):
        if obj.admin_user:
            return obj.admin_user.get_full_name() or obj.admin_user.email
        return 'Unknown'

    def get_messages(self, obj):
        messages = obj.messages.all().order_by('created_at')
        return AdminAIMessageSerializer(messages, many=True).data


# ===================================================================
# MESSAGE SERIALIZER
# ===================================================================

class AdminAIMessageSerializer(serializers.ModelSerializer):
    """Individual message serializer."""
    action_params = serializers.SerializerMethodField()

    class Meta:
        model = AdminAIMessage
        fields = [
            'id',
            'conversation',
            'role',
            'content',
            'model_used',
            'complexity_score',
            'action_executed',
            'action_params',
            'action_result',
            'action_status',
            'metadata',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    # Defense-in-depth: never expose raw passwords via the API
    SENSITIVE_PARAM_KEYS = {'new_password', 'password', 'investor_password', 'main_password'}

    def get_action_params(self, obj):
        params = obj.action_params
        if not params or not isinstance(params, dict):
            return params
        redacted = dict(params)
        for key in self.SENSITIVE_PARAM_KEYS:
            if key in redacted:
                redacted[key] = '***REDACTED***'
        return redacted


# ===================================================================
# FEEDBACK SERIALIZER
# ===================================================================

class AdminAIFeedbackSerializer(serializers.ModelSerializer):
    """Feedback serializer."""
    admin_email = serializers.SerializerMethodField()

    class Meta:
        model = AdminAIFeedback
        fields = [
            'id',
            'conversation',
            'message',
            'admin_user',
            'admin_email',
            'is_positive',
            'issue_type',
            'correction_text',
            'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'admin_user', 'created_at']

    def get_admin_email(self, obj):
        return obj.admin_user.email if obj.admin_user else None


# ===================================================================
# TRAINING EXAMPLE SERIALIZER
# ===================================================================

class AdminAITrainingExampleSerializer(serializers.ModelSerializer):
    """Training example serializer."""

    class Meta:
        model = AdminAITrainingExample
        fields = [
            'id',
            'question',
            'ideal_response',
            'source_feedback',
            'weight',
            'issue_type',
            'tags',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ===================================================================
# ACTION SERIALIZERS
# ===================================================================

class SendMessageSerializer(serializers.Serializer):
    """Serializer for sending a message to the AI assistant."""
    conversation_id = serializers.UUIDField()
    message = serializers.CharField(min_length=1, max_length=10000)
    context_url = serializers.CharField(required=False, allow_blank=True, default='')


class StartConversationSerializer(serializers.Serializer):
    """Serializer for starting a new conversation."""
    context_type = serializers.ChoiceField(
        choices=['general', 'enrollment', 'trader', 'payout', 'order'],
        default='general'
    )
    context_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    context_url = serializers.CharField(required=False, allow_blank=True, default='')


class ConfirmActionSerializer(serializers.Serializer):
    """Serializer for confirming or cancelling a pending action."""
    conversation_id = serializers.UUIDField()
    message_id = serializers.UUIDField()
    confirmed = serializers.BooleanField()
