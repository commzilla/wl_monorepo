
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AuthForm from "@/components/auth/AuthForm";
import { Toaster } from "@/components/ui/toaster";

const Auth = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isLoading) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Enhanced background elements */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-2/3 h-2/3 bg-gradient-to-tl from-primary/10 via-purple-500/8 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/4 w-1/3 h-1/3 bg-gradient-radial from-primary/8 to-transparent rounded-full blur-2xl"></div>
      </div>
      
      <div className="container relative z-10 px-6 flex flex-col items-center max-w-md">
        {/* Logo section */}
        <div className="mb-8 p-4 rounded-2xl bg-card/40 backdrop-blur-sm border border-white/10 shadow-xl">
          <img 
            src="/wefund-logo.svg" 
            alt="WeFund Logo" 
            className="h-12 drop-shadow-lg"
          />
        </div>
        
        {/* Auth form container */}
        <div className="w-full glass-card rounded-2xl p-8 shadow-2xl border border-white/10">
          <AuthForm />
        </div>
        
        <p className="text-center mt-8 text-muted-foreground/80 text-sm leading-relaxed">
          Empowering traders with next-generation funding solutions
        </p>
      </div>
      
      <Toaster />
    </div>
  );
};

export default Auth;
