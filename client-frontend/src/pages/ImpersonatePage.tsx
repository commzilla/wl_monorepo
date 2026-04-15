import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ImpersonatePage() {
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticket = params.get("ticket");

    if (!ticket) {
      toast.error("Invalid impersonation link");
      navigate("/login");
      return;
    }

    const exchangeTicket = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/client/impersonate/exchange/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ticket }),
        });

        if (!response.ok) {
          throw new Error("Failed to exchange ticket");
        }

        const data = await response.json();
        
        // Use the auth context to handle the login with tokens
        await loginWithTokens({
          access_token: data.access,
          refresh_token: data.refresh,
          user: {
            id: data.user_id,
            username: data.username,
            role: data.role,
            full_name: data.full_name,
            profile_picture: data.profile_picture,
            created_at: data.created_at,
          },
          isImpersonating: true
        });

        // Clean URL (no ticket in history)
        window.history.replaceState(null, "", "/dashboard");
        
        // Redirect based on user role
        if (data.role === 'affiliate') {
          navigate("/affiliate");
        } else {
          navigate("/dashboard");
        }
        
        toast.success("Successfully logged in");
      } catch (error) {
        console.error("Impersonation failed:", error);
        toast.error("Failed to log in");
        navigate("/login");
      }
    };

    exchangeTicket();
  }, [navigate, loginWithTokens]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Logging you in...</p>
      </div>
    </div>
  );
}