import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Settings, FileText, LogOut, PanelRightOpen,
  LayoutDashboard, Users, Wallet, BarChart, Tag, Award, Calculator, Calendar, Flame, GitCompare, ChartNoAxesColumnIncreasing, Book, Wrench
} from 'lucide-react';
import { FaUsers } from "react-icons/fa";
import { useAuth } from '@/contexts/AuthContext';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { LanguageSelector } from '@/components/shared/LanguageSelector';

interface HeaderProps {
  className?: string;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  isImpersonating?: boolean;
}

const NAV_ITEMS = [
  // Main
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Leaderboards', path: '/leaderboards' },
  { icon: Wallet, label: 'Withdrawal', path: '/withdrawl' },
  { icon: BarChart, label: 'My Stats', path: '/myStats' },
  { icon: Tag, label: 'My Offers', path: '/offers' },
  { icon: Award, label: 'Certificates', path: '/certificates' },
  // Tools
  { icon: Calculator, label: 'Lotsize Calculator', path: '/lotsize' },
  { icon: Calendar, label: 'Economic Calendar', path: '/economicCalendar' },
  { icon: Flame, label: 'Forex heatmap', path: '/forexHeatmap' },
  { icon: GitCompare, label: 'Challenge comparison', path: '/challengeComparison' },
  { icon: ChartNoAxesColumnIncreasing, label: 'Trading View', path: '/tradingView' },
  // Bottom
  { icon: FaUsers, label: 'Affiliate', path: '/affiliate' },
  { icon: Book, label: 'Rules & FAQ', path: '/rules' },
];

export const Header: React.FC<HeaderProps> = ({ className = '', onToggleSidebar, sidebarCollapsed, isImpersonating = false }) => {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    console.log('Logging out...');
    logout();
    navigate('/login');
  };

  // Find the current nav item
  const currentNav = NAV_ITEMS.find(item => location.pathname.startsWith(item.path));
  const CurrentIcon = currentNav?.icon;
  const currentLabel = currentNav?.label;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between w-full px-4 py-2.5 bg-gradient-to-r from-[#0A1114] to-[#16232B]">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" className="w-6 h-auto" />
          <span className="text-[#E4EEF5] font-semibold text-lg">{currentLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <NotificationDropdown />
          <button
            onClick={onToggleSidebar}
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-[#3AB3FF] bg-[#3AB3FF]/10 hover:bg-[#3AB3FF]/20 transition-colors"
            aria-label="Toggle sidebar"
          >
            {/* Hamburger icon (3 bars) */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect y="5" width="24" height="2.5" rx="1.25" fill="#E4EEF5"/>
              <rect y="11" width="24" height="2.5" rx="1.25" fill="#E4EEF5"/>
              <rect y="17" width="24" height="2.5" rx="1.25" fill="#E4EEF5"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Desktop Header */}
    <header className={`
        relative md:flex hidden w-full min-h-16 items-center justify-between px-4 py-2.5
      ${className}
    `}>
      <div className="self-stretch z-0 flex min-w-60 items-center gap-2 w-auto my-auto">
          {/* Logo - hidden on mobile */}
        <div className="self-stretch flex items-center w-[125px] my-auto">
          <div className="self-stretch flex w-[125px] items-stretch justify-center my-auto">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/8fd662e5c334cebaeec01369e2a29d236624bdb2?placeholderIfAbsent=true"
              alt="Company Logo"
              className="aspect-[5.68] object-contain w-[125px]"
            />
          </div>
        </div>
        <button
          onClick={onToggleSidebar}
          className="justify-center items-center shadow-[0px_-8px_32px_0px_rgba(58,179,255,0.06)_inset] flex min-h-8 flex-col overflow-hidden w-8 h-8 bg-[#3AB3FF]/10 my-auto rounded-lg border-solid hover:bg-[#3AB3FF]/20 transition-colors ml-12"
          aria-label="Toggle sidebar"
        >
          <PanelRightOpen className={`aspect-[1] object-contain w-6 h-6 text-[#85A8C3] transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
        </button>
        {/* Navigation icon and label, now directly after the toggle button */}
        <nav className="self-stretch flex items-center gap-1.5 my-auto ml-10">
          <div className="self-stretch flex items-center gap-1.5 my-auto">
            {CurrentIcon && <CurrentIcon className="w-5 h-5 text-[#85A8C3]" />}
            <span className="text-[#85A8C3] font-semibold self-stretch my-auto">
              {currentLabel}
            </span>
          </div>
        </nav>
      </div>

        {/* User dropdown and notifications - hidden on mobile */}
      <div className="flex items-center gap-3">
        <LanguageSelector />
        <NotificationDropdown />
        
        <div className="relative" ref={dropdownRef} style={{ zIndex: 9999 }}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="justify-center items-center border border-[#3AB3FF] shadow-[0px_-8px_32px_0px_rgba(58,179,255,0.06)_inset] self-stretch z-0 flex min-h-11 gap-2 text-sm text-[#E4EEF5] font-semibold bg-[#3AB3FF]/10 my-auto pl-4 pr-3 py-3 rounded-lg border-solid hover:bg-[#3AB3FF]/20 transition-colors"
          >
            <img
              src={user?.profile_picture || "https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/7a17caea54a669b88b7e0eec2dcf3a7bd28b6e95?placeholderIfAbsent=true"}
              alt="User"
              className="aspect-[1] object-contain w-5 h-5 rounded-full self-stretch shrink-0 my-auto"
            />
            <span className="text-[#E4EEF5] self-stretch my-auto">
              {user?.full_name || user?.username || 'User'}
            </span>
            <img
              src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/18d0144a19b54edd6452b11479efff18f28d5381?placeholderIfAbsent=true"
              alt="Dropdown"
              className={`aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div 
              className={`fixed ${isImpersonating ? 'top-[108px]' : 'top-[60px]'} right-4 w-[200px] bg-[#0A1114] border border-[#3AB3FF]/10 rounded-xl shadow-[0px_8px_32px_0px_rgba(0,0,0,0.3)] overflow-hidden`}
              style={{ zIndex: 9999 }}
            >
              <div className="py-2">
                <button
                  onClick={() => {
                    navigate('/settings');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[#E4EEF5] hover:bg-[#3AB3FF]/10 transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#3AB3FF]/10 flex items-center justify-center">
                    <Settings size={14} className="text-[#3AB3FF]" />
                  </div>
                  <span className="text-sm font-medium">{t('header.settings')}</span>
                </button>
                
                <button
                  onClick={() => {
                    window.open('https://we-fund.com/terms-and-conditions/', '_blank');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[#E4EEF5] hover:bg-[#3AB3FF]/10 transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#3AB3FF]/10 flex items-center justify-center">
                    <FileText size={14} className="text-[#3AB3FF]" />
                  </div>
                  <span className="text-sm font-medium">{t('header.legal')}</span>
                </button>
                
                {user?.role !== 'affiliate' && (
                  <button
                    onClick={() => {
                      navigate('/submit-ea');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[#E4EEF5] hover:bg-[#3AB3FF]/10 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#3AB3FF]/10 flex items-center justify-center">
                      <FileText size={14} className="text-[#3AB3FF]" />
                    </div>
                    <span className="text-sm font-medium">{t('header.submitEA')}</span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    handleLogout();
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[#E4EEF5] hover:bg-[#3AB3FF]/10 transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#3AB3FF]/10 flex items-center justify-center">
                    <LogOut size={14} className="text-[#3AB3FF]" />
                  </div>
                  <span className="text-sm font-medium">{t('header.logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
};
