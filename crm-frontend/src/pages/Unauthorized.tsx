
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { isLoading, rolesLoading } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // Wait for auth and roles to load before showing the unauthorized message
    if (!isLoading && !rolesLoading) {
      const timer = setTimeout(() => {
        setIsVerifying(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isLoading, rolesLoading]);

  if (isVerifying || isLoading || rolesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
          <h2 className="text-xl font-semibold">Verifying access...</h2>
          <p className="mt-2 text-muted-foreground text-sm">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <ShieldAlert className="h-16 w-16 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="mt-4 text-muted-foreground">
          You do not have permission to access this page. Please contact your administrator
          if you believe this is an error.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
          <Button onClick={() => navigate("/")} variant="default">
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
