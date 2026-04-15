import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileSearch,
  CreditCard,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  BadgePercent,
  Shield,
  Settings,
  LogOut,
  ShoppingBag,
  Cog,
  Tag,
  TrendingUp,
  DollarSign,
  Bell,
  Network,
  MessageCircle,
  Coins,
  CheckSquare,
  ScrollText,
  Gift,
  Receipt,
  UserCheck,
  PackageCheck,
  BarChart3,
  Brain,
  Trophy,
  Megaphone,
  Bot,
  Copy,
  BookOpen,
  ArrowLeftRight,
  Calendar,
  ClipboardList,
  HeartPulse,
  FileSpreadsheet,
  Rocket,
  Video,
  MessageSquareMore,
  Medal,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/contexts/ThemeContext";
import wefundLogoLight from "@/assets/wefund-logo-light.png";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  permissions?: string[];
  isDropdown?: boolean;
  dropdownItems?: { to: string; label: string; icon: React.ElementType }[];
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

interface SidebarLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
}

interface SidebarDropdownProps {
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  items: { to: string; label: string; icon: React.ElementType }[];
  activeItems: boolean;
  onNavigate?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon: Icon, label, collapsed, active, onNavigate }) => {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center rounded-xl px-3 py-3 text-muted-foreground transition-all duration-300 hover:text-primary hover:bg-primary/10 hover:backdrop-blur-sm border border-transparent hover:border-primary/20",
        collapsed ? "justify-center gap-0" : "gap-3",
        active && "bg-primary/15 text-primary border-primary/30 shadow-lg shadow-primary/10",
      )}
    >
      <Icon
        size={20}
        className={cn(
          "transition-all duration-300 group-hover:scale-110 flex-shrink-0",
          active && "text-primary drop-shadow-sm",
        )}
      />
      {!collapsed && (
        <span className={cn("transition-all duration-300 font-medium", active && "text-primary")}>{label}</span>
      )}
      {active && !collapsed && (
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-r-full" />
      )}
    </Link>
  );
};

const SidebarDropdown: React.FC<SidebarDropdownProps> = ({ icon: Icon, label, collapsed, items, activeItems, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(activeItems);
  const location = useLocation();

  React.useEffect(() => {
    if (activeItems && !isOpen) {
      setIsOpen(true);
    }
  }, [activeItems]);

  if (collapsed) {
    return (
      <div className="group relative">
        <div
          className={cn(
            "flex items-center justify-center rounded-xl px-3 py-3 text-muted-foreground transition-all duration-300 hover:text-primary hover:bg-primary/10 hover:backdrop-blur-sm border border-transparent hover:border-primary/20",
            activeItems && "bg-primary/15 text-primary border-primary/30 shadow-lg shadow-primary/10",
          )}
        >
          <Icon
            size={20}
            className={cn(
              "transition-all duration-300 group-hover:scale-110 flex-shrink-0",
              activeItems && "text-primary drop-shadow-sm",
            )}
          />
        </div>
        {/* Tooltip for collapsed state */}
        <div className="absolute left-full ml-2 top-0 invisible group-hover:visible bg-popover border rounded-md px-2 py-1 text-sm shadow-md z-50 whitespace-nowrap">
          {label}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "group w-full relative flex items-center rounded-xl px-3 py-3 text-muted-foreground transition-all duration-300 hover:text-primary hover:bg-primary/10 hover:backdrop-blur-sm border border-transparent hover:border-primary/20 gap-3",
          activeItems && "bg-primary/15 text-primary border-primary/30 shadow-lg shadow-primary/10",
        )}
      >
        <Icon
          size={20}
          className={cn(
            "transition-all duration-300 group-hover:scale-110 flex-shrink-0",
            activeItems && "text-primary drop-shadow-sm",
          )}
        />
        <span className={cn("transition-all duration-300 font-medium flex-1 text-left", activeItems && "text-primary")}>
          {label}
        </span>
        <ChevronDown size={16} className={cn("transition-transform duration-200", isOpen && "transform rotate-180")} />
        {activeItems && (
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-r-full" />
        )}
      </button>

      {isOpen && (
        <div className="ml-6 space-y-1">
          {items.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center rounded-xl px-3 py-2 text-muted-foreground transition-all duration-300 hover:text-primary hover:bg-primary/10 hover:backdrop-blur-sm border border-transparent hover:border-primary/20 gap-3 text-sm",
                  isActive && "bg-primary/15 text-primary border-primary/30 shadow-lg shadow-primary/10",
                )}
              >
                <item.icon
                  size={16}
                  className={cn(
                    "transition-all duration-300 group-hover:scale-110 flex-shrink-0",
                    isActive && "text-primary drop-shadow-sm",
                  )}
                />
                <span className={cn("transition-all duration-300 font-medium", isActive && "text-primary")}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-primary/50 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SidebarSectionLabel: React.FC<{ label: string; collapsed: boolean }> = ({ label, collapsed }) => {
  if (collapsed) return null;

  return (
    <div className="px-3 py-2 mt-4 first:mt-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
    </div>
  );
};

// Shared navigation sections hook
function useNavSections() {
  const { t } = useLanguage();

  const riskDropdownItems = [
    { to: "/stoploss-history", label: "Stop Loss History", icon: Clock },
    { to: "/ip-analysis", label: "IP Analysis", icon: Network },
    { to: "/top-earning-traders", label: "Top Earning Traders", icon: TrendingUp },
    { to: "/copy-trading", label: "Copy Trading", icon: Copy },
    { to: "/hedging", label: "Hedging Detection", icon: ArrowLeftRight },
    { to: "/admin/expert-advisors", label: "EA Approval", icon: Bot },
    { to: "/payout-ai-analysis", label: "AI Risk", icon: Brain },
    { to: "/ai-learning", label: "AI Learning Center", icon: BookOpen },
  ];

  const wecoinsDropdownItems = [
    { to: "/wecoins/tasks", label: "Tasks", icon: CheckSquare },
    { to: "/wecoins/auto-rules", label: "Auto Rules", icon: Rocket },
    { to: "/wecoins/submissions", label: "Submissions", icon: ScrollText },
    { to: "/wecoins/redemption", label: "Redemption", icon: PackageCheck },
    { to: "/wecoins/redeem-items", label: "Redeem Items", icon: Gift },
    { to: "/wecoins/ledger-book", label: "Ledger Book", icon: Receipt },
  ];

  const competitionsDropdownItems = [
    { to: "/competitions/campaign", label: "Campaign", icon: Megaphone },
    { to: "/competitions/registrations", label: "Registrations", icon: Users },
    { to: "/competitions/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  const analyticsDropdownItems = [
    { to: "/analytics/challenge-wise-payouts", label: "Challenge Wise Payouts", icon: BarChart3 },
    { to: "/analytics/account-size-wise-payouts", label: "Account Size Wise Payouts", icon: DollarSign },
    { to: "/analytics/country-wise-payouts", label: "Country Wise Payouts", icon: Network },
    { to: "/analytics/unprofitable-countries", label: "Unprofitable Countries", icon: TrendingUp },
    { to: "/analytics/risk-core-metrics", label: "Risk Core Metrics", icon: Activity },
    { to: "/analytics/trends", label: "Trends Analytics", icon: TrendingUp },
    { to: "/analytics/trader-behavior", label: "Trader Behavior", icon: Users },
    { to: "/analytics/trader-journey", label: "Trader Journey", icon: TrendingUp },
  ];

  const sections: NavSection[] = [
    {
      items: [
        { to: "/", label: t("dashboard"), icon: LayoutDashboard, roles: ["admin", "support", "risk", "discord_manager", "content_creator"], permissions: ["dashboard.view"] },
        { to: "/traders", label: t("traders"), icon: Users, roles: ["admin", "support", "risk", "discord_manager"], permissions: ["traders.view"] },
        { to: "/challenges", label: t("challenges"), icon: Activity, roles: ["admin", "support", "risk"], permissions: ["challenges.view"] },
        { to: "/trade-management", label: "Trades", icon: TrendingUp, roles: ["admin", "support", "risk"], permissions: ["trades.view"] },
      ],
    },
    {
      label: "Finance",
      items: [
        { to: "/payout-request", label: "Payouts", icon: DollarSign, roles: ["admin", "support", "risk", "discord_manager"], permissions: ["payouts.view"] },
        { to: "/website-orders", label: "Orders", icon: Receipt, roles: ["admin", "support", "risk"], permissions: ["website_orders.view"] },
        { to: "/order-history", label: "Legacy Orders", icon: ShoppingBag, roles: ["admin"], permissions: ["orders.view"] },
        { to: "/offers", label: "Offers", icon: Tag, roles: ["admin", "support", "risk"], permissions: ["orders.view"] },
        { to: "/affiliates", label: t("affiliates"), icon: BadgePercent, roles: ["admin", "support", "risk", "discord_manager"], permissions: ["affiliates.view"] },
      ],
    },
    {
      label: "Website",
      items: [
        { to: "/website-products", label: "Products", icon: ShoppingBag, roles: ["admin"], permissions: ["website_products.view"] },
        { to: "/discount-codes", label: "Discount Codes", icon: Tag, roles: ["admin"], permissions: ["discount_codes.view"] },
      ],
    },
    {
      label: "Compliance",
      items: [
        { to: "/kyc", label: t("kyc"), icon: FileSearch, roles: ["admin", "support", "risk"], permissions: ["kyc.view"] },
        {
          to: "#risk",
          label: "Risk",
          icon: Shield,
          roles: ["admin", "support", "risk"],
          permissions: ["risk.view_dashboard"],
          isDropdown: true,
          dropdownItems: riskDropdownItems,
        },
      ],
    },
    {
      label: "Engagement",
      items: [
        {
          to: "#wecoins",
          label: "WeCoins",
          icon: Coins,
          roles: ["admin", "support", "risk", "discord_manager"],
          permissions: ["wecoins.view_tasks"],
          isDropdown: true,
          dropdownItems: wecoinsDropdownItems,
        },
        {
          to: "#competitions",
          label: "Competitions",
          icon: Trophy,
          roles: ["admin", "support", "risk"],
          permissions: ["competitions.view"],
          isDropdown: true,
          dropdownItems: competitionsDropdownItems,
        },
      ],
    },
    {
      label: "Support",
      items: [
        { to: "/support-dashboard", label: "Live Chat", icon: MessageCircle, roles: ["admin", "support"], permissions: ["support.view"] },
        { to: "/meetings", label: "Meeting Room", icon: Video, roles: ["admin", "support"], permissions: ["meetings.view"] },
        { to: "/whatsapp", label: "WhatsApp", icon: MessageSquareMore, roles: ["admin", "support"], permissions: ["whatsapp.view"] },
        { to: "/notifications", label: "Notifications", icon: Bell, roles: ["admin", "support", "risk", "discord_manager", "content_creator"], permissions: ["notifications.view"] },
        { to: "/email", label: "Email", icon: Mail, roles: ["admin"], permissions: ["email.view"] },
      ],
    },
    {
      label: "Admin",
      items: [
        {
          to: "#analytics",
          label: "Analytics",
          icon: BarChart3,
          roles: ["admin"],
          permissions: ["analytics.view_challenge_payouts"],
          isDropdown: true,
          dropdownItems: analyticsDropdownItems,
        },
        { to: "/leaderboard-management", label: "Leaderboard", icon: Medal, roles: ["admin"], permissions: ["leaderboard.manage"] },
        { to: "/trading-reports", label: "Trading Reports", icon: ClipboardList, roles: ["admin", "support", "discord_manager"], permissions: ["trading_reports.view"] },
        { to: "/event-logs", label: "Event Logs", icon: ScrollText, roles: ["admin"], permissions: ["system.view_event_logs"] },
        { to: "/economic-calendar", label: "Economic Calendar", icon: Calendar, roles: ["admin"], permissions: ["economic_calendar.view"] },
        { to: "/configuration", label: "Configuration", icon: Cog, roles: ["admin"], permissions: ["config.view"] },
        { to: "/faq-management", label: "FAQ Management", icon: BookOpen, roles: ["admin"], permissions: ["faq.manage"] },
        { to: "/admin-ai-settings", label: "AI Assistant", icon: Bot, roles: ["admin"], permissions: ["config.manage_ai_rules"] },
        { to: "/system-health", label: "System Health", icon: HeartPulse, roles: ["admin"], permissions: ["system.view_health"] },
        { to: "/zoho-exports", label: "Accounting Exports", icon: FileSpreadsheet, roles: ["admin"], permissions: ["system.zoho_export"] },
        { to: "/releases", label: "Releases", icon: Rocket, roles: ["admin"], permissions: ["system.view_releases"] },
        { to: "/blog", label: "Blog", icon: BookOpen, roles: ["admin", "content_creator"], permissions: ["blog.view"] },
        { to: "/settings", label: t("settings"), icon: Settings, roles: ["admin", "support", "risk", "discord_manager", "content_creator"], permissions: ["dashboard.view"] },
      ],
    },
  ];

  return sections;
}

// Exported SidebarContent — used by both AppSidebar (desktop) and AppLayout (mobile Sheet)
export const SidebarContent: React.FC<{ collapsed?: boolean; onNavigate?: () => void }> = ({ collapsed = false, onNavigate }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user, isAdmin, isSupport, isRisk, isDiscordManager, isContentCreator, hasAnyPermission } = useAuth();
  const { theme } = useTheme();
  const sections = useNavSections();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hasAccess = (item: { roles: string[]; permissions?: string[] }) => {
    // Check RBAC permissions first
    if (item.permissions && item.permissions.length > 0) {
      if (hasAnyPermission(item.permissions)) return true;
    }
    // Fall back to legacy roles
    const roleChecks: Record<string, boolean> = {
      admin: isAdmin,
      support: isSupport,
      risk: isRisk,
      discord_manager: isDiscordManager,
      content_creator: isContentCreator,
    };
    return item.roles.some((role) => roleChecks[role]);
  };

  const handleLogout = () => {
    signOut();
  };

  const handleUserCardClick = () => {
    navigate("/settings");
    onNavigate?.();
  };

  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  const getUserInitial = () => {
    if (profile?.first_name) {
      return profile.first_name[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const renderNavItem = (item: NavItem) => {
    if (!hasAccess(item)) return null;

    if (item.isDropdown && item.dropdownItems) {
      const isActiveDropdown = item.dropdownItems.some((dropItem) => location.pathname === dropItem.to);
      return (
        <SidebarDropdown
          key={item.to}
          icon={item.icon}
          label={item.label}
          collapsed={collapsed}
          items={item.dropdownItems}
          activeItems={isActiveDropdown}
          onNavigate={onNavigate}
        />
      );
    }

    return (
      <SidebarLink
        key={item.to}
        to={item.to}
        icon={item.icon}
        label={item.label}
        collapsed={collapsed}
        active={location.pathname === item.to}
        onNavigate={onNavigate}
      />
    );
  };

  const sectionHasVisibleItems = (section: NavSection) => {
    return section.items.some((item) => hasAccess(item));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={cn(
          "flex items-center h-20 border-b border-border/30 bg-gradient-to-r from-card/60 to-card/40 transition-all duration-300 relative flex-shrink-0",
          collapsed ? "px-2 justify-center" : "px-6 justify-between",
        )}
      >
        <div className="flex-1 flex items-center relative">
          <div
            className={cn(
              "relative transition-all duration-300 ease-in-out",
              collapsed
                ? "opacity-0 scale-95 -translate-x-4 pointer-events-none"
                : "opacity-100 scale-100 translate-x-0",
            )}
          >
            <img
              src="/wefund-logo.svg"
              alt="WeFund Logo Dark"
              className={cn(
                "h-7 w-auto drop-shadow-lg transition-opacity duration-300 ease-in-out",
                theme === "dark" ? "opacity-100" : "opacity-0 absolute inset-0",
              )}
            />
            <img
              src={wefundLogoLight}
              alt="WeFund Logo Light"
              className={cn(
                "h-7 w-auto drop-shadow-lg transition-opacity duration-300 ease-in-out",
                theme === "light" ? "opacity-100" : "opacity-0 absolute inset-0",
              )}
            />
          </div>

          <img
            src="/wefund-icon.svg"
            alt="WeFund Icon"
            className={cn(
              "h-6 w-6 transition-all duration-300 ease-in-out absolute left-1/2 -translate-x-1/2",
              collapsed ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none",
            )}
          />
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-1">
          {sections.map((section, sectionIndex) => {
            if (!sectionHasVisibleItems(section)) return null;

            return (
              <div key={section.label || `section-${sectionIndex}`}>
                {section.label && (
                  <SidebarSectionLabel label={section.label} collapsed={collapsed} />
                )}
                <div className="space-y-1">
                  {section.items.map(renderNavItem)}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div
        className={cn(
          "border-t border-border/30 bg-gradient-to-r from-card/60 to-card/40 transition-all duration-300 flex-shrink-0",
          collapsed ? "p-2" : "p-4",
        )}
      >
        {/* Clock Display */}
        <div
          className={cn(
            "flex items-center justify-center gap-2 mb-3 py-2 rounded-lg bg-muted/50 border border-border/30",
            collapsed ? "flex-col gap-1" : "",
          )}
        >
          <Clock size={collapsed ? 14 : 16} className="text-primary" />
          <div className={cn("font-mono font-medium", collapsed ? "text-xs" : "text-sm")}>
            {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Helsinki' })}
          </div>
          {!collapsed && (
            <div className="text-xs text-muted-foreground">
              {currentTime.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Europe/Helsinki' })} (MT5)
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex items-center rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 transition-all duration-300",
            collapsed ? "flex-col space-y-2 p-2" : "p-3",
          )}
        >
          <div
            onClick={handleUserCardClick}
            className={cn(
              "flex items-center cursor-pointer hover:bg-primary/5 rounded-lg transition-all duration-300",
              collapsed ? "justify-center p-1" : "flex-1 p-1 -m-1",
            )}
            aria-label="Go to profile settings"
          >
            <div
              className={cn(
                "rounded-xl bg-gradient-wefund flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20 transition-transform duration-300 hover:scale-105",
                collapsed ? "w-8 h-8 text-xs" : "w-10 h-10",
              )}
            >
              {getUserInitial()}
            </div>
            {!collapsed && (
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-foreground">{getUserDisplayName()}</p>
                <p className="text-xs text-muted-foreground/80">{user?.email || "user@example.com"}</p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className={cn(
              "text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-300",
              collapsed ? "w-8 h-8 ml-0" : "ml-2",
            )}
            aria-label="Log out"
          >
            <LogOut size={collapsed ? 14 : 16} />
          </Button>
        </div>

        <div className={cn("mt-2 text-center text-xs text-muted-foreground/60 font-mono", collapsed && "text-[10px]")}>
          CRM v2.0
        </div>
      </div>
    </div>
  );
};

// Desktop sidebar wrapper — uses SidebarContent inside the <aside> shell
const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  React.useEffect(() => {
    const darkLogo = new Image();
    const lightLogo = new Image();
    const iconLogo = new Image();
    darkLogo.src = "/wefund-logo.svg";
    lightLogo.src = wefundLogoLight;
    iconLogo.src = "/wefund-icon.svg";
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-card/40 backdrop-blur-xl border-r border-border/20 transition-all duration-300 relative z-20 shadow-2xl",
        collapsed ? "w-20" : "w-72",
      )}
    >
      <SidebarContent collapsed={collapsed} />
      {/* Toggle Button overlaid at top-right of sidebar */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl border border-transparent hover:border-primary/20 transition-all duration-300",
          collapsed ? "top-6 left-1/2 -translate-x-1/2 w-8 h-8" : "top-6 right-4",
        )}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={18} />}
      </Button>
    </div>
  );
};

export default AppSidebar;
