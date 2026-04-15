import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  Wallet,
  BarChart,
  Tag,
  BookOpen,
  Award,
  Calculator,
  Calendar,
  Flame,
  GitCompare,
  ChartNoAxesColumnIncreasing ,
  ClipboardList,
  Book,
  Wrench,
  ChevronDown,
  Settings,
  Coins,
  Trophy,
  Clock,
} from 'lucide-react';
import { FaUsers } from "react-icons/fa";
import { Separator } from "@radix-ui/react-separator";
import { useAuth } from '@/contexts/AuthContext';

interface MenuItem {
  id: string;
  icon?: React.ElementType;
  label: string;
  path: string;
  subItems?: MenuItem[];
}

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '', collapsed = false }) => {
  const { t } = useTranslation();
  const [isToolsExpanded, setIsToolsExpanded] = useState(true);
  const location = useLocation();
  const { user } = useAuth();

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const localTime = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const mt5Time = new Date(now.getTime() + (now.getTimezoneOffset() + 120) * 60000)
    .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  // Different menu items based on user role
  const affiliateMenuItems: MenuItem[] = [
    {
      id: 'affiliate-dashboard',
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      path: "/affiliate"
    },
  ];

  const clientMenuItems: MenuItem[] = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      path: "/dashboard"
    },
    {
      id: 'leaderboards',
      icon: Users,
      label: t('nav.leaderboards'),
      path: "/leaderboards"
    },
    {
      id: 'withdrawal',
      icon: Wallet,
      label: t('nav.withdrawal'),
      path: "/withdrawl"
    },
    {
      id: 'stats',
      icon: BarChart,
      label: t('nav.myStats'),
      path: "/myStats"
    },
    {
      id: 'journal',
      icon: BookOpen,
      label: t('nav.journal', 'Trade Journal'),
      path: "/journal"
    },
    {
      id: 'offers',
      icon: Tag,
      label: t('nav.myOffers'),
      path: "/offers"
    },
    {
      id: 'wecoins',
      icon: Coins,
      label: "WeCoins",
      path: "/wecoins"
    },
    {
      id: 'competitions',
      icon: Trophy,
      label: "Competitions",
      path: "/competitions"
    },
    {
      id: 'certificates',
      icon: Award,
      label: t('nav.certificates'),
      path: "/certificates"
    },
  ];

  const mainMenuItems = user?.role === 'affiliate' ? affiliateMenuItems : clientMenuItems;

  const toolsSubItems: MenuItem[] = [
    {
      id: 'lotsize',
      icon: Calculator,
      label: t('nav.lotsizeCalculator'),
      path: "/lotsize"
    },
    {
      id: 'calendar',
      icon: Calendar,
      label: t('nav.economicCalendar'),
      path: "/economicCalendar"
    },
    {
      id: 'heatmap',
      icon: Flame,
      label: t('nav.forexHeatmap'),
      path: "/forexHeatmap"
    },
{
      id: 'tradingview',
      icon: ChartNoAxesColumnIncreasing ,
      label: t('nav.tradingView'),
      path: "/tradingView"
    },
  ];

  const affiliateBottomMenuItems: MenuItem[] = [
    {
      id: 'help-center',
      icon: Book,
      label: "Help Center",
      path: "https://support.we-fund.com/en/"
    },
  ];

  const clientBottomMenuItems: MenuItem[] = [
    {
      id: 'affiliate',
      icon: FaUsers,
      label: t('nav.affiliate'),
      path: "/affiliate"
    },
    {
      id: 'rules',
      icon: Book,
      label: t('nav.rulesFAQ'),
      path: "https://support.we-fund.com/en/"
    },
  ];

  const bottomMenuItems = user?.role === 'affiliate' ? affiliateBottomMenuItems : clientBottomMenuItems;

  // Shared classes for label text that animates on collapse/expand
  const labelClasses = `overflow-hidden whitespace-nowrap transition-all duration-300 ${
    collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
  }`;

  return (
    <aside className={`
      overflow-y-auto overflow-x-hidden sidebar-scroll text-sm shrink transition-all duration-300 ease-in-out
      ${collapsed ? 'w-20 min-w-[5rem] px-2' : 'min-w-60 w-72 2xl:w-[15vw] px-4'}
      pt-4 pb-2 h-full
      bg-[#3AB3FF]/10 shadow-[0_0_30px_rgba(58,179,255,0.08)]
      ${className}
    `}>
      <div className="w-full">
        <a
          href="https://we-fund.com/#objectives"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full block"
        >
          <button className="text-[#E4EEF5] self-stretch bg-[color:var(--border-primary-color,#3AB3FF)] shadow-[0px_3px_1px_0px_rgba(255,255,255,0.35)_inset] min-h-12 w-full gap-2 font-semibold px-5 py-4 rounded-lg border-solid hover:bg-[rgba(58,179,255,0.1)] transition-colors overflow-hidden whitespace-nowrap">
            {collapsed ? <span className="flex justify-center"><span className="sr-only">{t('dashboard.browseAvailableChallenges')}</span>+</span> : t('dashboard.browseAvailableChallenges')}
          </button>
        </a>

        <nav className="w-full text-[#85A8C3] font-medium mt-8">
          <div className="w-full">
            {mainMenuItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '-');
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`
                    flex min-h-[52px] w-full items-center gap-3 px-4 py-3.5 rounded-lg
                    ${isActive
                      ? 'border border-[#3AB3FF] shadow-[0_0_30px_rgba(58,179,255,0.1)] hover:shadow-[0_0_40px_rgba(58,179,255,0.15)] bg-[#3AB3FF]/10 text-[#E4EEF5] font-semibold'
                      : 'hover:bg-[#3AB3FF]/10 hover:shadow-[0_0_20px_rgba(58,179,255,0.1)] transition-all duration-300 cursor-pointer'
                    }
                  `}
                >
                  {IconComponent && (
                    <IconComponent className="w-6 h-6 shrink-0" />
                  )}
                  {!IconComponent && (
                    <div className="w-6 h-6 shrink-0" />
                  )}
                  <span className={`
                    ${labelClasses}
                    ${isActive ? 'text-[#E4EEF5]' : 'text-[#85A8C3]'}
                  `}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
            {/* Only show Tools section for non-affiliate users */}
            {user?.role !== 'affiliate' && (
              <div className="w-full rounded-lg">
                <button
                  onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                  className="flex min-h-[52px] w-full items-center justify-between px-4 py-3.5 rounded-lg hover:bg-[#3AB3FF]/10 hover:shadow-[0_0_20px_rgba(58,179,255,0.1)] transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <Wrench className="w-6 h-6 shrink-0" />
                    <span className={`
                      ${labelClasses}
                      text-[#85A8C3]
                    `}>
                      {t('common.tools', 'Tools')}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-all duration-300 ${isToolsExpanded ? 'rotate-180' : ''} ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}
                  />
                </button>
                {isToolsExpanded && (
                  <div className="w-full">
                    {toolsSubItems.map((item) => {
                      const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '-');
                      const IconComponent = item.icon;
                      return (
                        <Link
                          key={item.id}
                          to={item.path}
                          className={`
                            flex min-h-[52px] w-full items-center gap-3 px-4 py-3.5 rounded-lg
                            ${isActive
                              ? 'border border-[#3AB3FF] shadow-[0_0_30px_rgba(58,179,255,0.1)] hover:shadow-[0_0_40px_rgba(58,179,255,0.15)] bg-[#3AB3FF]/10 text-[#E4EEF5] font-semibold'
                              : 'hover:bg-[#3AB3FF]/10 hover:shadow-[0_0_20px_rgba(58,179,255,0.1)] transition-all duration-300 cursor-pointer'
                            }
                          `}
                        >
                          <IconComponent className="w-6 h-6 shrink-0" />
                          <span className={`
                            ${labelClasses}
                            ${isActive ? 'text-[#E4EEF5]' : 'text-[#85A8C3]'}
                          `}>
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>
      <Separator className="my-4 h-px bg-white/20" />
      <nav className="w-full text-[#85A8C3] font-medium mt-6">
        <div className="w-full">
          {bottomMenuItems.map((item) => {
            const isExternal = item.path.startsWith('http');
            const isActive = !isExternal && (location.pathname === item.path || location.pathname.startsWith(item.path + '-'));
            const IconComponent = item.icon;
            if (isExternal) {
              return (
                <a
                  key={item.id}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    flex min-h-[52px] w-full items-center gap-3 pl-4 pr-3.5 py-3.5 rounded-lg
                    hover:bg-[#3AB3FF]/10 hover:shadow-[0_0_20px_rgba(58,179,255,0.1)] transition-all duration-300 cursor-pointer
                  `}
                >
                  <IconComponent className="w-6 h-6 shrink-0" />
                  <span className={`${labelClasses} text-[#85A8C3]`}>
                    {item.label}
                  </span>
                </a>
              );
            }
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`
                  flex min-h-[52px] w-full items-center gap-3 pl-4 pr-3.5 py-3.5 rounded-lg
                  ${isActive
                    ? 'border border-[#3AB3FF] shadow-[0_0_30px_rgba(58,179,255,0.1)] hover:shadow-[0_0_40px_rgba(58,179,255,0.15)] bg-[#3AB3FF]/10 text-[#E4EEF5] font-semibold'
                    : 'hover:bg-[#3AB3FF]/10 hover:shadow-[0_0_20px_rgba(58,179,255,0.1)] transition-all duration-300 cursor-pointer'
                  }
                `}
              >
                <IconComponent className="w-6 h-6 shrink-0" />
                <span className={`
                  ${labelClasses}
                  ${isActive ? 'text-[#E4EEF5]' : 'text-[#85A8C3]'}
                `}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Separator className="my-4 h-px bg-white/20" />
      <div className={`w-full pb-3 ${collapsed ? 'px-1' : 'px-3'} space-y-2`}>
        <div className={`rounded-lg border border-[#3AB3FF]/20 bg-[#3AB3FF]/5 ${collapsed ? 'p-2 flex justify-center' : 'px-3 py-2.5'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#3AB3FF]/15 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-[#3AB3FF]" />
            </div>
            <div className={labelClasses}>
              <span className="text-[10px] uppercase tracking-wider text-[#506882] block leading-none mb-1">Your Time</span>
              <span className="text-sm font-mono font-semibold text-[#E4EEF5] tracking-wide">{localTime}</span>
            </div>
          </div>
        </div>
        <div className={`rounded-lg border border-[#3AB3FF]/20 bg-[#3AB3FF]/5 ${collapsed ? 'p-2 flex justify-center' : 'px-3 py-2.5'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#3AB3FF]/15 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-[#3AB3FF]" />
            </div>
            <div className={labelClasses}>
              <span className="text-[10px] uppercase tracking-wider text-[#506882] block leading-none mb-1">MT5 Server <span className="text-[#3AB3FF]">GMT+2</span></span>
              <span className="text-sm font-mono font-semibold text-[#E4EEF5] tracking-wide">{mt5Time}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
