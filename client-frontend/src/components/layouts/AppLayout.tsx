import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Sidebar } from '@/components/shared/Sidebar';
import { SupportWidget } from '@/components/shared/SupportWidget';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children?: React.ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isImpersonating } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  // Lock scroll when the mobile drawer is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      const originalOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.documentElement.style.overflow = originalOverflow;
      };
    }
  }, [mobileSidebarOpen]);

  const handleToggleSidebar = () => {
    // Desktop: toggle collapsed; Mobile: toggle drawer open
    if (window.matchMedia('(max-width: 767px)').matches) {
      setMobileSidebarOpen(prev => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-[#080808] ${isImpersonating ? 'pt-12' : ''}`}>
      <SupportWidget />
      <Header onToggleSidebar={handleToggleSidebar} sidebarCollapsed={sidebarCollapsed} isImpersonating={isImpersonating} />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:flex h-full overflow-y-auto">
          <Sidebar collapsed={sidebarCollapsed} />
        </div>

        {/* Mobile drawer sidebar */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[85%] max-w-[320px] translate-x-0 transition-transform bg-[#0A1114] overflow-y-auto">
              <Sidebar collapsed={false} />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto sidebar-scroll">
          {children || <Outlet />}
        </div>
      </div>
    </div>
  );
};

export default AppLayout; 