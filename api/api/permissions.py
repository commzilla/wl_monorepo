# offers/permissions.py
from rest_framework.permissions import BasePermission


class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class IsCRMStaff(BasePermission):
    """
    Allows access to CRM staff users.
    Adjust logic to your project's roles/groups model.
    """
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        # Simplest: treat Django staff as CRM staff
        return bool(user.is_staff or user.is_superuser)


class HasPermission(BasePermission):
    """
    RBAC permission check. Reads `required_permissions` and `permission_mode`
    from the view.

    Usage on a view:
        permission_classes = [HasPermission]
        required_permissions = ['traders.view']
        permission_mode = 'all'   # or 'any' (default: 'all')

    Superusers always pass (safety net so the owner never gets locked out).
    """

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        # Superuser bypass
        if user.is_superuser:
            return True

        # Staff must have RBAC role with matching permissions
        required = getattr(view, "required_permissions", None)
        if not required:
            # No specific permissions required — allow authenticated staff with RBAC role
            return bool(user.is_staff and user.rbac_role)

        mode = getattr(view, "permission_mode", "all")
        if mode == "any":
            return user.has_any_perm_code(required)
        else:
            return all(user.has_perm_code(code) for code in required)
