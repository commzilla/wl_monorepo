import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles?: ("admin" | "support" | "risk" | "content_creator" | "discord_manager")[];
  requiredPermissions?: string[];
  permissionMode?: "all" | "any";
}

const RoleBasedRoute = ({ children, allowedRoles, requiredPermissions, permissionMode = "any" }: RoleBasedRouteProps) => {
  const {
    user, isLoading, isAdmin, isSupport, isRisk, isContentCreator, isDiscordManager,
    rolesLoading, hasPermission, hasAnyPermission, hasAllPermissions,
  } = useAuth();

  if (isLoading || rolesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check RBAC permissions first (if specified)
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = permissionMode === "any"
      ? hasAnyPermission(requiredPermissions)
      : hasAllPermissions(requiredPermissions);

    if (hasAccess) {
      return <>{children}</>;
    }
  }

  // Fall back to legacy role check
  if (allowedRoles && allowedRoles.length > 0) {
    const roleMap: Record<string, boolean> = {
      admin: isAdmin,
      support: isSupport,
      risk: isRisk,
      content_creator: isContentCreator,
      discord_manager: isDiscordManager,
    };

    const hasRole = allowedRoles.some(role => roleMap[role]);
    if (hasRole) {
      return <>{children}</>;
    }
  }

  // If neither permissions nor roles were specified, allow access
  if (!requiredPermissions?.length && !allowedRoles?.length) {
    return <>{children}</>;
  }

  return <Navigate to="/unauthorized" replace />;
};

export default RoleBasedRoute;
