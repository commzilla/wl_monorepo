
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar, { SidebarContent } from './AppSidebar';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminAIWidget } from '@/components/admin-ai/AdminAIWidget';
import { useAuth } from '@/contexts/AuthContext';
import WelcomeScreen from '@/components/welcome/WelcomeScreen';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import wefundLogoLight from '@/assets/wefund-logo-light.png';

const WELCOME_2_KEY = 'wefund_crm_2_welcome_seen';

interface AppLayoutProps {
  children?: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user?.id) {
      const key = `${WELCOME_2_KEY}_${user.id}`;
      if (!localStorage.getItem(key)) {
        setShowWelcome(true);
      }
    }
  }, [user?.id]);

  const handleWelcomeComplete = useCallback(() => {
    if (user?.id) {
      localStorage.setItem(`${WELCOME_2_KEY}_${user.id}`, 'true');
    }
    setShowWelcome(false);
  }, [user?.id]);

  // Allow Enter key to dismiss welcome screen
  useEffect(() => {
    if (!showWelcome) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleWelcomeComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWelcome, handleWelcomeComplete]);

  if (showWelcome) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Enhanced background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-to-tr from-primary/8 via-purple-500/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/4 h-1/4 bg-gradient-radial from-primary/5 to-transparent rounded-full blur-2xl"></div>
      </div>

      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-card/80 backdrop-blur-xl border-b border-border/30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(true)}
            className="text-foreground"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <img
            src={theme === 'dark' ? '/wefund-logo.svg' : wefundLogoLight}
            alt="WeFund"
            className="h-5 w-auto"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      )}

      {/* Mobile Navigation Sheet */}
      {isMobile && (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="p-0 w-72 bg-card/95 backdrop-blur-xl">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && <AppSidebar />}

      {/* Main content */}
      <main className={`flex-1 overflow-auto relative z-10 ${isMobile ? 'pt-14' : ''}`}>
        {/* Theme Toggle - Top Right (desktop only) */}
        {!isMobile && (
          <div className="absolute top-6 right-6 z-50">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}

        <div className="page-container">
          {children || <Outlet />}
        </div>
        <Toaster />
        <Sonner />
      </main>
      <AdminAIWidget />
    </div>
  );
};

export default AppLayout;
