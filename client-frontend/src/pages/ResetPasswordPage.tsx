import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginHeader } from '@/components/login/LoginHeader';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

const ResetPasswordPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isValidToken, setIsValidToken] = useState(true);

  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
      return;
    }

    // Check if uid and token are present
    if (!uid || !token) {
      setIsValidToken(false);
    }
  }, [user, navigate, uid, token]);

  if (user) {
    return null;
  }

  if (!isValidToken || !uid || !token) {
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
          
          <Card className="w-full max-w-md mx-auto bg-[#0A1114] border-[#23353E]">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-white">Invalid reset link</CardTitle>
              <CardDescription className="text-[#85A8C3]">
                This password reset link is invalid or has expired. Please request a new one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/forgot-password')} 
                className="w-full mb-2"
              >
                Request new reset link
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/login')} 
                className="w-full border-[#23353E] text-[#85A8C3] hover:bg-[#0A1016]"
              >
                Back to login
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
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
        
        <ResetPasswordForm uid={uid} token={token} />
      </main>
    </div>
  );
};

export default ResetPasswordPage;