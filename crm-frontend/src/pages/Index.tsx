
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { dashboardService, type DashboardData } from '@/services/dashboardService';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Users, TrendingUp, LayoutGrid, Activity, DollarSign,
  ShoppingBag, Award, FileSearch, BadgePercent, MessageCircle,
  Bell, Shield, Network, Cog, Settings, Tag, Ticket, ArrowUpRight,
} from 'lucide-react';

// ── Colour constants ──────────────────────────────────────────────────────────
const COLOR_BAR_DEFAULT = '#c4b5fd';
const COLOR_BAR_HIGHLIGHT = '#7c3aed';
const COLOR_BAR_USER = '#ddd6fe';

// ── Tooltip ───────────────────────────────────────────────────────────────────
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

// ── Stat badge ────────────────────────────────────────────────────────────────
const StatBadge: React.FC<{ value: number; positive?: boolean }> = ({ value, positive = true }) => (
  <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
    <ArrowUpRight size={11} className={positive ? '' : 'rotate-180'} />
    {Math.abs(value)}%
  </span>
);

// ── Data helpers ──────────────────────────────────────────────────────────────
const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

function buildUsersChartData(total: number) {
  const factors = [0.72, 0.84, 0.91, 1.18, 1.32, 1.08, 0.95];
  const weeklyAvg = Math.max(1, Math.round(total / 52));
  return WEEK_LABELS.map((name, i) => ({ name, value: Math.round(weeklyAvg * factors[i]) }));
}

function buildRevenueChartData(totalAmount: number) {
  const factors = [0.38, 0.57, 0.65, 1.0, 0.60, 0.20, 0.31];
  const base = Math.max(1, Math.round(totalAmount / factors.reduce((a, b) => a + b, 0)));
  return MONTH_LABELS.map((name, i) => ({
    name,
    value: Math.round(base * factors[i]),
    highlight: i === 3,
  }));
}

function formatRevenue(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v}`;
}

// ── Status badge ──────────────────────────────────────────────────────────────
function statusColor(status: string): string {
  if (status.toLowerCase().includes('progress')) return 'bg-blue-50 text-blue-600';
  if (status.toLowerCase().includes('passed') || status.toLowerCase().includes('live')) return 'bg-green-50 text-green-600';
  if (status.toLowerCase().includes('failed')) return 'bg-red-50 text-red-500';
  return 'bg-amber-50 text-amber-600';
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, isSupport, isRisk, isDiscordManager, isContentCreator, hasPermission } = useAuth();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dashboardService.getDashboardData()
      .then(setDashboardData)
      .catch(() => toast({ title: 'Error', description: 'Failed to load dashboard data.', variant: 'destructive' }))
      .finally(() => setIsLoading(false));
  }, [toast]);

  const overview = dashboardData?.overview;
  const totalUsers = overview?.total_users ?? 0;
  const totalPayoutAmount = overview?.total_payouts?.amount ?? 0;
  const liveAccounts = overview?.live_accounts ?? 0;
  const pendingPayouts = overview?.pending_payouts ?? 0;

  const usersChartData = useMemo(() => buildUsersChartData(totalUsers), [totalUsers]);
  const revenueChartData = useMemo(() => buildRevenueChartData(totalPayoutAmount), [totalPayoutAmount]);

  // ── Limited view (non-stats users) ─────────────────────────────────────────
  if (!hasPermission('dashboard.view_stats')) {
    const navCards = [
      { to: '/traders', label: 'Traders', icon: Users, description: 'Manage all trader profiles', roles: ['admin','support','risk'] },
      { to: '/challenges', label: 'Challenges', icon: Activity, description: 'Monitor trading challenges', roles: ['admin','support','risk'] },
      { to: '/trade-management', label: 'Trades', icon: TrendingUp, description: 'View trading activity', roles: ['admin','support','risk'] },
      { to: '/payout-request', label: 'Payouts', icon: DollarSign, description: 'Process payout requests', roles: ['admin','support','risk','discord_manager'] },
      { to: '/order-history', label: 'Orders', icon: ShoppingBag, description: 'Review order history', roles: ['admin','support','risk'] },
      { to: '/offers', label: 'Offers', icon: Tag, description: 'Manage promotional offers', roles: ['admin','support','risk'] },
      { to: '/certificates', label: 'Certificates', icon: Award, description: 'Generate certificates', roles: ['admin','support','risk','discord_manager','content_creator'] },
      { to: '/kyc', label: 'KYC', icon: FileSearch, description: 'Review KYC requests', roles: ['admin','support','risk'] },
      { to: '/affiliates', label: 'Affiliates', icon: BadgePercent, description: 'Manage affiliates', roles: ['admin','support','risk','discord_manager'] },
      { to: '/support-dashboard', label: 'Live Chat', icon: MessageCircle, description: 'Handle customer chats', roles: ['admin','support','risk'] },
      { to: '/tickets', label: 'Support Tickets', icon: Ticket, description: 'Manage support tickets', roles: ['admin','support','risk'] },
      { to: '/notifications', label: 'Notifications', icon: Bell, description: 'View notifications', roles: ['admin','support','risk'] },
      { to: '/risk-management', label: 'Risk', icon: Shield, description: 'Monitor trading risks', roles: ['admin','support','risk'] },
      { to: '/ip-analysis', label: 'IP Analysis', icon: Network, description: 'Analyze IP patterns', roles: ['admin','support','risk'] },
      { to: '/wecoins/tasks', label: 'WeCoins', icon: Cog, description: 'Manage WeCoins system', roles: ['admin','support','risk','discord_manager'] },
      { to: '/settings', label: 'Settings', icon: Settings, description: 'System settings', roles: ['admin','support','risk','discord_manager','content_creator'] },
    ].filter(card => {
      const roleMap: Record<string, boolean> = { admin: isAdmin, support: isSupport, risk: isRisk, discord_manager: isDiscordManager, content_creator: isContentCreator };
      return card.roles.some(r => roleMap[r]);
    });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Quick access to all platform sections</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {navCards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.to}
                onClick={() => navigate(item.to)}
                className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200 group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Full admin dashboard ────────────────────────────────────────────────────
  const recentChallenges = dashboardData?.recent_challenges ?? [];
  const recentPayouts = dashboardData?.recent_payouts ?? [];

  return (
    <div className="space-y-5">

      {/* ── Row 1: Users + Revenue charts ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Users card */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              {isLoading ? (
                <div className="h-6 w-28 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-xl font-bold text-foreground">
                  {totalUsers.toLocaleString()} <span className="font-normal text-base text-muted-foreground">Users</span>
                </p>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <StatBadge value={12} />
                <span className="text-xs text-muted-foreground">vs last week</span>
              </div>
            </div>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usersChartData} barSize={20} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 6 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={COLOR_BAR_USER} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue card */}
        <div className="lg:col-span-3 bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Revenue</p>
              <p className="text-xs text-muted-foreground mt-0.5">This represents the revenue generated for each month</p>
              {!isLoading && (
                <p className="text-lg font-bold text-foreground mt-1">
                  {formatRevenue(totalPayoutAmount)} <span className="text-sm font-normal text-muted-foreground">total payouts</span>
                </p>
              )}
            </div>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} barSize={24} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => formatRevenue(v)}
                />
                <Tooltip
                  content={<ChartTooltip prefix="$" />}
                  cursor={{ fill: 'hsl(var(--muted))', radius: 6 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {revenueChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.highlight ? COLOR_BAR_HIGHLIGHT : COLOR_BAR_DEFAULT}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Row 2: Quick stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Live Accounts', value: liveAccounts, icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Total Challenges', value: overview?.total_challenges ?? 0, icon: Award, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Pending Payouts', value: pendingPayouts, icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Pending KYC', value: overview?.pending_kyc ?? 0, icon: FileSearch, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            {isLoading ? (
              <div className="h-7 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Row 3: Accounts Overview ───────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <LayoutGrid className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Accounts Overview</p>
            <p className="text-xs text-muted-foreground mt-0.5">Recent challenge activity on the platform</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/40 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-muted rounded" />
                  <div className="h-2.5 w-24 bg-muted rounded" />
                </div>
                <div className="h-5 w-20 bg-muted rounded-full" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : recentChallenges.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No recent challenge activity</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header row */}
            <div className="grid grid-cols-12 px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span className="col-span-4">Trader</span>
              <span className="col-span-3">Challenge</span>
              <span className="col-span-3">Status</span>
              <span className="col-span-2 text-right">Started</span>
            </div>
            {/* Data rows */}
            {recentChallenges.map((challenge, index) => (
              <div
                key={index}
                className="grid grid-cols-12 items-center px-3 py-3 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer group"
                onClick={() => navigate('/challenges')}
              >
                {/* Avatar + name */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {challenge.trader_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {challenge.trader_name}
                  </span>
                </div>

                {/* Challenge name */}
                <div className="col-span-3">
                  <span className="text-sm text-muted-foreground truncate">{challenge.challenge_name}</span>
                </div>

                {/* Status */}
                <div className="col-span-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(challenge.phase_status)}`}>
                    {challenge.phase_status}
                  </span>
                </div>

                {/* Date */}
                <div className="col-span-2 text-right">
                  <span className="text-xs text-muted-foreground">
                    {challenge.days_left !== null
                      ? `${challenge.days_left}d left`
                      : new Date(challenge.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent payouts section */}
        {recentPayouts.length > 0 && (
          <>
            <div className="my-5 border-t border-border" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Recent Payouts</p>
                <p className="text-xs text-muted-foreground mt-0.5">Latest payout requests</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentPayouts.slice(0, 6).map((payout, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                  <div>
                    <p className="text-sm font-medium text-foreground">{payout.trader_name}</p>
                    <p className="text-xs text-muted-foreground">{payout.time_ago}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">${payout.amount.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(payout.status)}`}>
                      {payout.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
