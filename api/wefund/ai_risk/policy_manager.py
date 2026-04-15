from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from wefund.models import AIRiskRule
from api.serializers import AIRiskRuleSerializer

class AIRiskRuleViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD for AI Risk Rules.
    Controls which strategies are injected into AI prompts.
    """

    queryset = AIRiskRule.objects.all()
    serializer_class = AIRiskRuleSerializer
    permission_classes = [IsAdminUser]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_fields = ["severity", "is_active"]
    search_fields = ["code", "name", "description"]
    ordering_fields = ["severity", "code", "version", "created_at"]
    ordering = ["severity", "code"]

    # --------------------------------------------------
    # CREATE
    # --------------------------------------------------
    def perform_create(self, serializer):
        serializer.save()

    # --------------------------------------------------
    # UPDATE (auto-bump version)
    # --------------------------------------------------
    def perform_update(self, serializer):
        instance = serializer.instance
        serializer.save(version=instance.version + 1)

    # --------------------------------------------------
    # ACTIVATE RULE
    # --------------------------------------------------
    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        rule = self.get_object()
        rule.is_active = True
        rule.save(update_fields=["is_active", "updated_at"])

        return Response(
            {"status": "activated", "code": rule.code},
            status=status.HTTP_200_OK
        )

    # --------------------------------------------------
    # DEACTIVATE RULE
    # --------------------------------------------------
    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        rule = self.get_object()
        rule.is_active = False
        rule.save(update_fields=["is_active", "updated_at"])

        return Response(
            {"status": "deactivated", "code": rule.code},
            status=status.HTTP_200_OK
        )
