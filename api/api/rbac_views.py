from collections import OrderedDict
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.permissions import HasPermission
from api.rbac_serializers import PermissionSerializer, RoleSerializer
from wefund.rbac_models import Permission, Role


class RoleListCreateView(generics.ListCreateAPIView):
    """
    GET  /admin/roles/       — list all roles (requires roles.view)
    POST /admin/roles/       — create a custom role (requires roles.create)
    """
    serializer_class = RoleSerializer
    permission_classes = [HasPermission]

    def get_required_permissions(self):
        if self.request.method == "POST":
            return ["roles.create"]
        return ["roles.view"]

    @property
    def required_permissions(self):
        return self.get_required_permissions()

    def get_queryset(self):
        return Role.objects.prefetch_related("permissions", "users").all()

    def perform_create(self, serializer):
        serializer.save(is_system=False)


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /admin/roles/<uuid>/  — role detail (requires roles.view)
    PATCH  /admin/roles/<uuid>/  — update role  (requires roles.edit)
    DELETE /admin/roles/<uuid>/  — delete role  (requires roles.delete)
    """
    serializer_class = RoleSerializer
    permission_classes = [HasPermission]
    lookup_field = "pk"

    def get_required_permissions(self):
        if self.request.method == "DELETE":
            return ["roles.delete"]
        if self.request.method in ("PATCH", "PUT"):
            return ["roles.edit"]
        return ["roles.view"]

    @property
    def required_permissions(self):
        return self.get_required_permissions()

    def get_queryset(self):
        return Role.objects.prefetch_related("permissions", "users").all()

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        if role.is_system:
            return Response(
                {"error": "System roles cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PermissionListView(APIView):
    """
    GET /admin/permissions/ — list all permissions grouped by category
    """
    permission_classes = [HasPermission]
    required_permissions = ["roles.view"]

    def get(self, request):
        permissions = Permission.objects.all().order_by("category", "codename")
        grouped = OrderedDict()
        for perm in permissions:
            if perm.category not in grouped:
                grouped[perm.category] = []
            grouped[perm.category].append(PermissionSerializer(perm).data)
        return Response(grouped)


class MyPermissionsView(APIView):
    """
    GET /auth/permissions/me/ — returns the current user's role + permissions
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.rbac_role

        # Superusers always get ALL permissions (safety net — owner never locked out)
        if user.is_superuser:
            permissions = list(
                Permission.objects.values_list("codename", flat=True)
            )
        elif role:
            permissions = user.get_all_permissions_list()
        else:
            permissions = []

        return Response({
            "role_id": str(role.id) if role else None,
            "role_name": role.name if role else None,
            "role_slug": role.slug if role else None,
            "permissions": permissions,
            "is_superuser": user.is_superuser,
        })
