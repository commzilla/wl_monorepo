import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileSearch,
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

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

// ── Nav link ──────────────────────────────────────────────────────────────────
const SidebarLink: React.FC<{
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
}> = ({ to, icon: Icon, label, collapsed, active, onNavigate }) => (
  <Link
    to={to}
    onClick={onNavigate}
    title={collapsed ? label : undefined}
    className={cn(
      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
      collapsed ? "justify-center px-2" : "",
      active
        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    )}
  >
    <Icon size={18} className="flex-shrink-0" />
    {!collapsed && <span>{label}</span>}
  </Link>
);

// ── Dropdown nav ──────────────────────────────────────────────────────────────
const SidebarDropdown: React.FC<{
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  items: { to: string; label: string; icon: React.ElementType }[];
  activeItems: boolean;
  onNavigate?: () => void;
}> = ({ icon: Icon, label, collapsed, items, activeItems, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(activeItems);
  const location = useLocation();

  React.useEffect(() => {
    if (activeItems) setIsOpen(true);
  }, [activeItems]);

  if (collapsed) {
    return (
      <div className="group relative">
        <div
          className={cn(
            "flex items-center justify-center rounded-xl px-2 py-2.5 text-sm transition-all duration-150 cursor-pointer",
            activeItems
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <Icon size={18} />
        </div>
        <div className="absolute left-full ml-2 top-0 invisible group-hover:visible bg-popover border border-border rounded-lg px-2 py-1 text-sm shadow-lg z-50 whitespace-nowrap text-foreground">
          {label}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
          activeItems
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon size={18} className="flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown size={14} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-sidebar-border pl-3">
          {items.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-150",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon size={14} className="flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Section label ─────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ label: string; collapsed: boolean }> = ({ label, collapsed }) => {
  if (collapsed) return <div className="border-t border-sidebar-border my-2" />;
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
      {label}
    </p>
  );
};

// ── Brand name helper ─────────────────────────────────────────────────────────
function getBrandName(): string {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  if (parts.length >= 2) {
    const raw = parts[parts.length - 2];
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return "Platform";
}

function getBrandInitials(name: string): string {
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2").split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── Nav sections data ─────────────────────────────────────────────────────────
function useNavSections(): NavSection[] {
  const { t } = useLanguage();

  return [
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
          to: "#risk", label: "Risk", icon: Shield,
          roles: ["admin", "support", "risk"], permissions: ["risk.view_dashboard"],
          isDropdown: true,
          dropdownItems: [
            { to: "/stoploss-history", label: "Stop Loss History", icon: Clock },
            { to: "/ip-analysis", label: "IP Analysis", icon: Network },
            { to: "/top-earning-traders", label: "Top Earning Traders", icon: TrendingUp },
            { to: "/copy-trading", label: "Copy Trading", icon: Copy },
            { to: "/hedging", label: "Hedging Detection", icon: ArrowLeftRight },
            { to: "/admin/expert-advisors", label: "EA Approval", icon: Bot },
            { to: "/payout-ai-analysis", label: "AI Risk", icon: Brain },
            { to: "/ai-learning", label: "AI Learning Center", icon: BookOpen },
          ],
        },
      ],
    },
    {
      label: "Engagement",
      items: [
        {
          to: "#wecoins", label: "WeCoins", icon: Coins,
          roles: ["admin", "support", "risk", "discord_manager"], permissions: ["wecoins.view_tasks"],
          isDropdown: true,
          dropdownItems: [
            { to: "/wecoins/tasks", label: "Tasks", icon: CheckSquare },
            { to: "/wecoins/auto-rules", label: "Auto Rules", icon: Rocket },
            { to: "/wecoins/submissions", label: "Submissions", icon: ScrollText },
            { to: "/wecoins/redemption", label: "Redemption", icon: PackageCheck },
            { to: "/wecoins/redeem-items", label: "Redeem Items", icon: Gift },
            { to: "/wecoins/ledger-book", label: "Ledger Book", icon: Receipt },
          ],
        },
        {
          to: "#competitions", label: "Competitions", icon: Trophy,
          roles: ["admin", "support", "risk"], permissions: ["competitions.view"],
          isDropdown: true,
          dropdownItems: [
            { to: "/competitions/campaign", label: "Campaign", icon: Megaphone },
            { to: "/competitions/registrations", label: "Registrations", icon: Users },
            { to: "/competitions/leaderboard", label: "Leaderboard", icon: Trophy },
          ],
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
          to: "#analytics", label: "Analytics", icon: BarChart3,
          roles: ["admin"], permissions: ["analytics.view_challenge_payouts"],
          isDropdown: true,
          dropdownItems: [
            { to: "/analytics/challenge-wise-payouts", label: "Challenge Payouts", icon: BarChart3 },
            { to: "/analytics/account-size-wise-payouts", label: "Account Size Payouts", icon: DollarSign },
            { to: "/analytics/country-wise-payouts", label: "Country Payouts", icon: Network },
            { to: "/analytics/unprofitable-countries", label: "Unprofitable Countries", icon: TrendingUp },
            { to: "/analytics/risk-core-metrics", label: "Risk Metrics", icon: Activity },
            { to: "/analytics/trends", label: "Trends", icon: TrendingUp },
            { to: "/analytics/trader-behavior", label: "Trader Behavior", icon: Users },
            { to: "/analytics/trader-journey", label: "Trader Journey", icon: TrendingUp },
          ],
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
}

// ── Shared sidebar content ────────────────────────────────────────────────────
export const SidebarContent: React.FC<{ collapsed?: boolean; onNavigate?: () => void }> = ({
  collapsed = false,
  onNavigate,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, user, isAdmin, isSupport, isRisk, isDiscordManager, isContentCreator, hasAnyPermission } = useAuth();
  const sections = useNavSections();
  const brandName = getBrandName();
  const brandInitials = getBrandInitials(brandName);

  const hasAccess = (item: { roles: string[]; permissions?: string[] }) => {
    if (item.permissions?.length && hasAnyPermission(item.permissions)) return true;
    const roleMap: Record<string, boolean> = { admin: isAdmin, support: isSupport, risk: isRisk, discord_manager: isDiscordManager, content_creator: isContentCreator };
    return item.roles.some((r) => roleMap[r]);
  };

  const getUserInitial = () => {
    if (profile?.first_name) return profile.first_name[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const getUserName = () => {
    if (profile?.first_name && profile?.last_name) return `${profile.first_name} ${profile.last_name}`;
    if (profile?.first_name) return profile.first_name;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  };

  const renderItem = (item: NavItem) => {
    if (!hasAccess(item)) return null;
    if (item.isDropdown && item.dropdownItems) {
      const isActiveDropdown = item.dropdownItems.some((d) => location.pathname === d.to);
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

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Brand header */}
      <div className={cn("flex items-center gap-3 border-b border-sidebar-border flex-shrink-0", collapsed ? "px-3 py-4 justify-center" : "px-5 py-4")}>
        <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-sm font-bold flex-shrink-0 shadow-sm">
          {brandInitials}
        </div>
        {!collapsed && (
          <span className="font-semibold text-foreground text-sm tracking-tight">{brandName}</span>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-3">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
            Control Panel
          </p>
        )}
        <div className="space-y-0.5">
          {sections.map((section, idx) => {
            const visibleItems = section.items.filter(hasAccess);
            if (!visibleItems.length) return null;
            return (
              <div key={section.label || `s-${idx}`}>
                {section.label && <SectionLabel label={section.label} collapsed={collapsed} />}
                <div className="space-y-0.5">
                  {section.items.map(renderItem)}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* User footer */}
      <div className={cn("border-t border-sidebar-border flex-shrink-0", collapsed ? "p-3" : "p-4")}>
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div
            onClick={() => { navigate("/settings"); onNavigate?.(); }}
            className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
          >
            {getUserInitial()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{getUserName()}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg flex-shrink-0"
            title="Log out"
          >
            <LogOut size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Desktop sidebar wrapper ───────────────────────────────────────────────────
const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "relative flex flex-col h-screen border-r border-sidebar-border transition-all duration-300 z-20 shadow-[1px_0_0_0_hsl(var(--sidebar-border))]",
        collapsed ? "w-[60px]" : "w-[220px]",
      )}
    >
      <SidebarContent collapsed={collapsed} />
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors z-30"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </div>
  );
};

export default AppSidebar;
