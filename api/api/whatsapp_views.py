from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from wefund.models import WhatsAppConversation, WhatsAppMessage, WhatsAppBotConfig
from api.permissions import HasPermission
from .whatsapp_serializers import (
    WhatsAppConversationListSerializer,
    WhatsAppConversationDetailSerializer,
    WhatsAppMessageSerializer,
    WhatsAppBotConfigSerializer,
)


class WhatsAppConversationViewSet(viewsets.ModelViewSet):
    """
    Admin endpoints for managing WhatsApp conversations.
    """
    permission_classes = [HasPermission]
    required_permissions = ['whatsapp.manage']
    http_method_names = ["get", "patch", "post"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return WhatsAppConversationDetailSerializer
        return WhatsAppConversationListSerializer

    def get_queryset(self):
        qs = WhatsAppConversation.objects.all()

        # Filters
        conv_status = self.request.query_params.get("status")
        if conv_status:
            qs = qs.filter(status=conv_status)

        lead_status = self.request.query_params.get("lead_status")
        if lead_status:
            qs = qs.filter(lead_status=lead_status)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(wa_id__icontains=search) |
                Q(profile_name__icontains=search) |
                Q(lead_data__name__icontains=search) |
                Q(lead_data__email__icontains=search)
            )

        assigned_to_me = self.request.query_params.get("assigned_to_me")
        if assigned_to_me and assigned_to_me.lower() == "true":
            qs = qs.filter(assigned_agent=self.request.user)

        needs_attention = self.request.query_params.get("needs_attention")
        if needs_attention and needs_attention.lower() == "true":
            qs = qs.filter(
                Q(status="human_handoff") | Q(status="active", ai_enabled=False)
            )

        return qs.order_by("-last_message_at")

    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        """Send an agent reply (or internal note) to a conversation."""
        from wefund.integrations.whatsapp.twilio_service import send_message

        conversation = self.get_object()
        content = request.data.get("content", "").strip()
        is_internal = request.data.get("is_internal", False)

        if not content:
            return Response({"error": "Content is required"}, status=status.HTTP_400_BAD_REQUEST)

        if is_internal:
            # Internal note — not sent via WhatsApp
            msg = WhatsAppMessage.objects.create(
                conversation=conversation,
                direction="outbound",
                sender_type="agent",
                content=content,
                agent=request.user,
                is_internal=True,
            )
        else:
            # Send via WhatsApp
            sid = send_message(conversation.wa_id, content)
            msg = WhatsAppMessage.objects.create(
                conversation=conversation,
                direction="outbound",
                sender_type="agent",
                content=content,
                agent=request.user,
                twilio_sid=sid,
                delivery_status="sent" if sid else "failed",
            )
            conversation.last_message_at = timezone.now()
            conversation.message_count += 1
            conversation.save(update_fields=["last_message_at", "message_count"])

        return Response(WhatsAppMessageSerializer(msg).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="toggle-ai")
    def toggle_ai(self, request, pk=None):
        """Toggle AI on/off for a conversation."""
        conversation = self.get_object()
        enabled = request.data.get("enabled")
        if enabled is None:
            enabled = not conversation.ai_enabled
        conversation.ai_enabled = bool(enabled)
        update_fields = ["ai_enabled"]
        # When re-enabling AI, also reset status from human_handoff back to active
        if conversation.ai_enabled and conversation.status == "human_handoff":
            conversation.status = "active"
            update_fields.append("status")
        conversation.save(update_fields=update_fields)
        return Response({"ai_enabled": conversation.ai_enabled, "status": conversation.status})

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Mark conversation as resolved."""
        conversation = self.get_object()
        conversation.status = "resolved"
        conversation.save(update_fields=["status"])

        # Add system message
        WhatsAppMessage.objects.create(
            conversation=conversation,
            direction="outbound",
            sender_type="system",
            content=f"Conversation resolved by {request.user.get_full_name() or request.user.username}",
            is_internal=True,
        )
        return Response({"status": "resolved"})

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        """Assign conversation to an agent."""
        conversation = self.get_object()
        agent_id = request.data.get("agent_id")

        if agent_id:
            from wefund.models import User
            try:
                agent = User.objects.get(id=agent_id, is_superuser=True)
                conversation.assigned_agent = agent
            except User.DoesNotExist:
                return Response({"error": "Agent not found"}, status=status.HTTP_404_NOT_FOUND)
        else:
            conversation.assigned_agent = None

        conversation.save(update_fields=["assigned_agent"])
        return Response(WhatsAppConversationListSerializer(conversation).data)

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        """Get messages for a conversation with optional internal note filter."""
        conversation = self.get_object()
        include_internal = request.query_params.get("include_internal", "true").lower() == "true"

        qs = conversation.messages.all()
        if not include_internal:
            qs = qs.filter(is_internal=False)

        serializer = WhatsAppMessageSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Dashboard statistics."""
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        total = WhatsAppConversation.objects.count()
        by_status = dict(
            WhatsAppConversation.objects.values_list("status").annotate(c=Count("id")).values_list("status", "c")
        )
        by_lead = dict(
            WhatsAppConversation.objects.values_list("lead_status").annotate(c=Count("id")).values_list("lead_status", "c")
        )
        today_messages = WhatsAppMessage.objects.filter(created_at__gte=today_start).count()
        today_conversations = WhatsAppConversation.objects.filter(created_at__gte=today_start).count()
        needs_attention = WhatsAppConversation.objects.filter(
            Q(status="human_handoff") | Q(status="active", ai_enabled=False)
        ).count()

        return Response({
            "total_conversations": total,
            "by_status": by_status,
            "by_lead_status": by_lead,
            "today_messages": today_messages,
            "today_new_conversations": today_conversations,
            "needs_attention": needs_attention,
        })


class WhatsAppBotConfigView(APIView):
    """Get and update WhatsApp bot configuration (singleton)."""
    permission_classes = [HasPermission]
    required_permissions = ['whatsapp.manage']

    def get(self, request):
        config = WhatsAppBotConfig.get_config()
        return Response(WhatsAppBotConfigSerializer(config).data)

    def patch(self, request):
        config = WhatsAppBotConfig.get_config()
        serializer = WhatsAppBotConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
