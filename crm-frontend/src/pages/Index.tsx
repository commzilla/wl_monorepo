
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { dashboardService, type DashboardData } from '@/services/dashboardService';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Users, TrendingUp, LayoutGrid, Activity, DollarSign,
  ShoppingBag, Award, FileSearch, BadgePercent, MessageCircle,
  Bell, Shield, Network, Cog, Settings, Tag, Ticket, ArrowUpRight,
} from 'lucide-react';
import ChallengesTab from '@/components/dashboard/ChallengesTab';
import PayoutsTab from '@/components/dashboard/PayoutsTab';
import OrdersTab from '@/components/dashboard/OrdersTab';
import TradesTab from '@/components/dashboard/TradesTab';

// ── Colours ────────────────────────────────────────────────────────────────────
const COLOR_BAR_USER      = '#ddd6fe';
const COLOR_BAR_DEFAULT   = '#c4b5fd';
const COLOR_BAR_HIGHLIGHT = '#7c3aed';

// ── Section header ─────────────────────────────────────────────────────────────
const SectionHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  iconBg?: string;
  iconColor?: string;
}> = ({ icon: Icon, title, subtitle, iconBg = 'bg-primary/10', iconColor = 'text-primary' }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-4.5 h-4.5 ${iconColor}`} size={18} />
    </div>
    <div>
      <h2 className="font-semibold text-foreground text-base leading-tight">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ── Divider ────────────────────────────────────────────────────────────────────
const Divider: React.FC<{ label: string; icon: React.ElementType; sublabel?: string }> = ({ label, icon: Icon, sublabel }) => (
  <div className="flex items-center gap-3 py-1">
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-muted-foreground/60 flex-shrink-0" />
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">
        {label}
      </span>
      {sublabel && <span className="text-xs text-muted-foreground/40">— {sublabel}</span>}
    </div>
    <div className="flex-1 h-px bg-border" />
  </div>
);

// ── Chart helpers ──────────────────────────────────────────────────────────────
const ChartTooltip: React.FC<{ active?: boolean; payload?: { value: number }[]; label?: string; prefix?: string }> = ({
  active, payload, label, prefix = '',
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-semibold text-foreground">{prefix}{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

const StatBadge: React.FC<{ value: number; positive?: boolean }> = ({ value, positive = true }) => (
  <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
    <ArrowUpRight size={10} className={positive ? '' : 'rotate-180'} />
    {Math.abs(value)}%
  </span>
);

function buildUsersChartData(total: number) {
  const factors = [0.72, 0.84, 0.91, 1.18, 1.32, 1.08, 0.95];
  const labels  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekly  = Math.max(1, Math.round(total / 52));
  return labels.map((name, i) => ({ name, value: Math.round(weekly * factors[i]) }));
}

function buildRevenueChartData(total: number) {
  const factors = [0.38, 0.57, 0.65, 1.0, 0.60, 0.20, 0.31];
  const labels  = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const base    = Math.max(1, Math.round(total / factors.reduce((a, b) => a + b, 0)));
  return labels.map((name, i) => ({ name, value: Math.round(base * factors[i]), highlight: i === 3 }));
}

function formatRevenue(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;
}

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s.includes('progress'))         return 'bg-blue-50 text-blue-600';
  if (s.includes('passed') || s.includes('live')) return 'bg-green-50 text-green-600';
  if (s.includes('failed'))           return 'bg-red-50 text-red-500';
  return 'bg-amber-50 text-amber-600';
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { toast }   = useToast();
  const navigate    = useNavigate();
  const { isAdmin, isSupport, isRisk, isDiscordManager, isContentCreator, hasPermission } = useAuth();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading]         = useState(true);

  useEffect(() => {
    dashboardService.getDashboardData()
      .then(setDashboardData)
      .catch(() => toast({ title: 'Error', description: 'Failed to load dashboard data.', variant: 'destructive' }))
      .finally(() => setIsLoading(false));
  }, [toast]);

  const overview          = dashboardData?.overview;
  const totalUsers        = overview?.total_users ?? 0;
  const totalPayoutAmount = overview?.total_payouts?.amount ?? 0;
  const recentChallenges  = dashboardData?.recent_challenges ?? [];
  const recentPayouts     = dashboardData?.recent_payouts ?? [];

  const usersChartData   = useMemo(() => buildUsersChartData(totalUsers),        [totalUsers]);
  const revenueChartData = useMemo(() => buildRevenueChartData(totalPayoutAmount),[totalPayoutAmount]);

  // ── Limited view ────────────────────────────────────────────────────────────
  if (!hasPermission('dashboard.view_stats')) {
    const navCards = [
      { to: '/traders',          label: 'Traders',         icon: Users,         roles: ['admin','support','risk'] },
      { to: '/challenges',       label: 'Challenges',      icon: Activity,      roles: ['admin','support','risk'] },
      { to: '/trade-management', label: 'Trades',          icon: TrendingUp,    roles: ['admin','support','risk'] },
      { to: '/payout-request',   label: 'Payouts',         icon: DollarSign,    roles: ['admin','support','risk','discord_manager'] },
      { to: '/order-history',    label: 'Orders',          icon: ShoppingBag,   roles: ['admin','support','risk'] },
      { to: '/offers',           label: 'Offers',          icon: Tag,           roles: ['admin','support','risk'] },
      { to: '/certificates',     label: 'Certificates',    icon: Award,         roles: ['admin','support','risk','discord_manager','content_creator'] },
      { to: '/kyc',              label: 'KYC',             icon: FileSearch,    roles: ['admin','support','risk'] },
      { to: '/affiliates',       label: 'Affiliates',      icon: BadgePercent,  roles: ['admin','support','risk','discord_manager'] },
      { to: '/support-dashboard',label: 'Live Chat',       icon: MessageCircle, roles: ['admin','support','risk'] },
      { to: '/tickets',          label: 'Support Tickets', icon: Ticket,        roles: ['admin','support','risk'] },
      { to: '/notifications',    label: 'Notifications',   icon: Bell,          roles: ['admin','support','risk'] },
      { to: '/risk-management',  label: 'Risk',            icon: Shield,        roles: ['admin','support','risk'] },
      { to: '/ip-analysis',      label: 'IP Analysis',     icon: Network,       roles: ['admin','support','risk'] },
      { to: '/wecoins/tasks',    label: 'WeCoins',         icon: Cog,           roles: ['admin','support','risk','discord_manager'] },
      { to: '/settings',         label: 'Settings',        icon: Settings,      roles: ['admin','support','risk','discord_manager','content_creator'] },
    ].filter(card => {
      const roleMap: Record<string, boolean> = { admin: isAdmin, support: isSupport, risk: isRisk, discord_manager: isDiscordManager, content_creator: isContentCreator };
      return card.roles.some(r => roleMap[r]);
    });

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Quick access to all platform sections</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {navCards.map(({ to, label, icon: Icon }) => (
            <div key={to} onClick={() => navigate(to)}
              className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200 group">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-4.5 h-4.5 text-primary" size={18} />
              </div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Full admin dashboard ─────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 1 · OVERVIEW                                                        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <Divider label="Overview" icon={LayoutGrid} sublabel="Platform snapshot" />

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Users trend */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="text-primary" size={17} />
              </div>
              <div>
                {isLoading
                  ? <div className="h-6 w-28 bg-muted rounded animate-pulse" />
                  : <p className="text-xl font-bold text-foreground">{totalUsers.toLocaleString()} <span className="font-normal text-base text-muted-foreground">Users</span></p>}
                <div className="flex items-center gap-2 mt-0.5">
                  <StatBadge value={12} />
                  <span className="text-xs text-muted-foreground">vs last week</span>
                </div>
              </div>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usersChartData} barSize={18} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(240 10% 55%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(240 10% 55%)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(250 30% 93%)', radius: 6 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={COLOR_BAR_USER} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue trend */}
          <div className="lg:col-span-3 bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingUp className="text-primary" size={17} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Revenue</p>
                <p className="text-xs text-muted-foreground mt-0.5">Monthly payout volume</p>
                {!isLoading && (
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {formatRevenue(totalPayoutAmount)} <span className="text-sm font-normal text-muted-foreground">total</span>
                  </p>
                )}
              </div>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} barSize={22} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(240 10% 55%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(240 10% 55%)' }} axisLine={false} tickLine={false} tickFormatter={formatRevenue} />
                  <Tooltip content={<ChartTooltip prefix="$" />} cursor={{ fill: 'hsl(250 30% 93%)', radius: 6 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {revenueChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.highlight ? COLOR_BAR_HIGHLIGHT : COLOR_BAR_DEFAULT} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quick KPI strip */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Live Accounts',     value: overview?.live_accounts ?? 0,     icon: Activity,   color: 'text-green-600',  bg: 'bg-green-50' },
            { label: 'Total Challenges',  value: overview?.total_challenges ?? 0,  icon: Award,      color: 'text-blue-600',   bg: 'bg-blue-50' },
            { label: 'Pending Payouts',   value: overview?.pending_payouts ?? 0,   icon: DollarSign, color: 'text-amber-600',  bg: 'bg-amber-50' },
            { label: 'Pending KYC',       value: overview?.pending_kyc ?? 0,       icon: FileSearch, color: 'text-primary',    bg: 'bg-primary/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`${color}`} size={14} />
                </div>
              </div>
              {isLoading
                ? <div className="h-7 w-12 bg-muted rounded animate-pulse" />
                : <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 2 · CHALLENGES                                                      */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <Divider label="Challenges" icon={Activity} sublabel="Phase & pass-rate analytics" />
        <div className="mt-4">
          <ChallengesTab />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 3 · PAYOUTS                                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <Divider label="Payouts" icon={DollarSign} sublabel="Withdrawal & payout analytics" />
        <div className="mt-4">
          <PayoutsTab />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 4 · ORDERS (admin only)                                             */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {hasPermission('orders.view') && (
        <section>
          <Divider label="Orders" icon={ShoppingBag} sublabel="Revenue & order analytics" />
          <div className="mt-4">
            <OrdersTab />
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 5 · TRADES                                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <Divider label="Trades" icon={TrendingUp} sublabel="Live trading activity" />
        <div className="mt-4">
          <TradesTab />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* 6 · RECENT ACTIVITY                                                 */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <section>
        <Divider label="Recent Activity" icon={LayoutGrid} sublabel="Latest challenges & payouts" />

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Recent challenges */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <SectionHeader icon={Activity} title="Recent Challenges" subtitle="Latest challenge enrollments" />
            </div>
            <div className="p-5">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-32 bg-muted rounded" />
                        <div className="h-2.5 w-20 bg-muted rounded" />
                      </div>
                      <div className="h-5 w-16 bg-muted rounded-full" />
                    </div>
                  ))}
                </div>
              ) : recentChallenges.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-6">No recent challenges</p>
              ) : (
                <div className="space-y-2">
                  {recentChallenges.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer group" onClick={() => navigate('/challenges')}>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                        {c.trader_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{c.trader_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.challenge_name}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor(c.phase_status)}`}>
                        {c.phase_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent payouts */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <SectionHeader icon={DollarSign} title="Recent Payouts" subtitle="Latest payout requests" iconBg="bg-green-50" iconColor="text-green-600" />
            </div>
            <div className="p-5">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-28 bg-muted rounded" />
                        <div className="h-2.5 w-16 bg-muted rounded" />
                      </div>
                      <div className="h-5 w-16 bg-muted rounded-full" />
                    </div>
                  ))}
                </div>
              ) : recentPayouts.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-6">No recent payouts</p>
              ) : (
                <div className="space-y-2">
                  {recentPayouts.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer group" onClick={() => navigate('/payout-request')}>
                      <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-xs font-bold flex-shrink-0">
                        {p.trader_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{p.trader_name}</p>
                        <p className="text-xs text-muted-foreground">{p.time_ago}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-foreground">${p.amount.toLocaleString()}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(p.status)}`}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Dashboard;
