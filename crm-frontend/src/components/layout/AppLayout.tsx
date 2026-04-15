
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar, { SidebarContent } from './AppSidebar';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun, Menu, Search, Bell, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminAIWidget } from '@/components/admin-ai/AdminAIWidget';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getBrandName(): string {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const raw = parts[parts.length - 2];
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return 'Platform';
}

interface AppLayoutProps {
  children?: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { profile, user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const isMobile = useIsMobile();

  const brandName = getBrandName();

  const getUserInitial = () => {
    if (profile?.first_name) return profile.first_name[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  };

  const getUserName = () => {
    if (profile?.first_name && profile?.last_name) return `${profile.first_name} ${profile.last_name}`;
    if (profile?.first_name) return profile.first_name;
    if (user?.email) return user.email.split('@')[0];
    return brandName;
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">

      {/* Mobile Navigation Sheet */}
      {isMobile && (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="p-0 w-[220px] bg-sidebar border-r border-sidebar-border">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && <AppSidebar />}

      {/* Main content column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top header */}
        <header className="flex items-center gap-4 px-6 py-3 bg-card border-b border-border flex-shrink-0">
          {/* Mobile menu toggle */}
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)} className="text-muted-foreground">
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Greeting */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-sm flex-shrink-0">
              {getUserInitial()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-tight">Hello {getUserName()}</p>
              <p className="text-xs text-muted-foreground leading-tight">{getFormattedDate()}</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-xs mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-muted rounded-full text-sm text-foreground placeholder:text-muted-foreground border-0 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-8 h-8 text-muted-foreground hover:text-foreground rounded-full"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-muted-foreground hover:text-foreground rounded-full"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-muted-foreground hover:text-foreground rounded-full"
              title="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="page-container">
            {children || <Outlet />}
          </div>
          <Toaster />
          <Sonner />
        </main>
      </div>

      <AdminAIWidget />
    </div>
  );
};

export default AppLayout;
