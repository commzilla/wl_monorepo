
import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "support" | "risk" | "content_creator" | "discord_manager"; // Optional role requirement
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, isLoading, isAdmin, isSupport, isRisk, isContentCreator, isDiscordManager, rolesLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to auth page if not authenticated
      navigate("/auth", { state: { from: location.pathname } });
    } else if (!isLoading && !rolesLoading && user && requiredRole) {
      // Check role-based access if a role is required - ONLY after roles have loaded
      const hasPermission = 
        (requiredRole === "admin" && isAdmin) ||
        (requiredRole === "support" && (isSupport || isAdmin)) ||  
        (requiredRole === "risk" && (isRisk || isAdmin)) ||
        (requiredRole === "content_creator" && (isContentCreator || isAdmin)) ||
        (requiredRole === "discord_manager" && (isDiscordManager || isAdmin));
      
      if (!hasPermission) {
        navigate("/unauthorized");
      }
    }
  }, [user, isLoading, rolesLoading, navigate, location.pathname, requiredRole, isAdmin, isSupport, isRisk, isContentCreator, isDiscordManager]);

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

  return user ? <>{children}</> : null;
};

export { ProtectedRoute };
export default ProtectedRoute;
