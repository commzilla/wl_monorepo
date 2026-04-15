import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginHeader } from '@/components/login/LoginHeader';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

const ForgotPasswordPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <LoginHeader />
      
      <main className="container mx-auto px-2 md:px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-2xl text-center mb-8 md:mb-12">
          <div className="relative inline-block">
            <div 
              className="absolute inset-0 bg-[#00A5E4] rounded-full" 
              style={{
                filter: 'blur(60px)',
                opacity: 0.5,
                transform: 'scale(1.1)'
              }}
            />
            <div className="relative z-10">
              <img
                src="/LogoWithName.svg"
                alt="Wefund Logo"
                className="h-10 md:h-16 mx-auto relative z-10"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(0, 165, 228, 0.6))',
                }}
              />
            </div>
          </div>
        </div>
        
        <ForgotPasswordForm />
      </main>
    </div>
  );
};

export default ForgotPasswordPage;