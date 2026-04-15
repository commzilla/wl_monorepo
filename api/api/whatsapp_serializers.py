from rest_framework import serializers

from wefund.models import WhatsAppConversation, WhatsAppMessage, WhatsAppBotConfig


class WhatsAppMessageSerializer(serializers.ModelSerializer):
    agent_name = serializers.SerializerMethodField()

    class Meta:
        model = WhatsAppMessage
        fields = [
            "id", "conversation", "direction", "sender_type", "content",
            "twilio_sid", "delivery_status", "agent", "agent_name",
            "ai_model_used", "ai_tokens_used", "ai_tool_calls",
            "is_internal", "created_at",
        ]
        read_only_fields = fields

    def get_agent_name(self, obj):
        if obj.agent:
            return obj.agent.get_full_name() or obj.agent.username
        return None


class WhatsAppConversationListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    assigned_agent_name = serializers.SerializerMethodField()

    class Meta:
        model = WhatsAppConversation
        fields = [
            "id", "wa_id", "profile_name", "user", "status", "ai_enabled",
            "assigned_agent", "assigned_agent_name", "lead_status", "lead_data",
            "last_message_at", "message_count", "ai_message_count",
            "metadata", "created_at", "updated_at", "last_message",
        ]
        read_only_fields = [
            "id", "wa_id", "profile_name", "user", "last_message_at",
            "message_count", "ai_message_count", "created_at", "updated_at",
            "last_message",
        ]

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if msg:
            return {
                "content": msg.content[:100],
                "sender_type": msg.sender_type,
                "direction": msg.direction,
                "created_at": msg.created_at.isoformat(),
            }
        return None

    def get_assigned_agent_name(self, obj):
        if obj.assigned_agent:
            return obj.assigned_agent.get_full_name() or obj.assigned_agent.username
        return None


class WhatsAppConversationDetailSerializer(WhatsAppConversationListSerializer):
    messages = WhatsAppMessageSerializer(many=True, read_only=True)

    class Meta(WhatsAppConversationListSerializer.Meta):
        fields = WhatsAppConversationListSerializer.Meta.fields + ["messages"]


class WhatsAppBotConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppBotConfig
        fields = [
            "bot_enabled", "ai_model", "ai_temperature", "ai_max_tokens",
            "system_prompt_override", "greeting_message", "handoff_message",
            "out_of_hours_message", "max_ai_messages_per_hour",
            "max_messages_per_conversation_per_day", "escalation_keywords",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]
