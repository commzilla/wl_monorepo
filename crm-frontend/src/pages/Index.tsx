
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { dashboardService } from '@/services/dashboardService';
import { challengeAnalyticsService } from '@/services/challengeAnalyticsService';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';
import {
  Users, TrendingUp, Activity, DollarSign, ShoppingBag, Award,
  FileSearch, ArrowUpRight, ArrowDownRight, AlertTriangle, Shield,
  Clock, Zap, Target, ChevronRight, Globe, BarChart2, CheckCircle,
  Settings, Bell, Network, Cog, BadgePercent, MessageCircle, Ticket, Tag,
} from 'lucide-react';
import {
  chartGradientDefs, FuturisticTooltip, getGradientFill,
  AXIS_TICK_STYLE, AXIS_LINE_STYLE,
} from '@/components/dashboard/chartTheme';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt$ = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}k`
  : `$${n.toFixed(0)}`;

const fmtN = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k`
  : n.toLocaleString();

function statusCls(s: string) {
  const l = s.toLowerCase();
  if (l.includes('progress') || l.includes('active')) return 'bg-blue-50 text-blue-600 border border-blue-100';
  if (l.includes('passed') || l.includes('live') || l.includes('paid') || l.includes('approved')) return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
  if (l.includes('failed') || l.includes('breach') || l.includes('declined') || l.includes('blocked')) return 'bg-rose-50 text-rose-600 border border-rose-100';
  return 'bg-amber-50 text-amber-600 border border-amber-100';
}

// ── Shared Components ─────────────────────────────────────────────────────────

/** Thin left-border section divider */
const H: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-[3px] h-8 rounded-full bg-primary flex-shrink-0" />
    <div>
      <p className="text-sm font-bold text-foreground leading-tight">{title}</p>
      <p className="text-xs text-muted-foreground leading-tight">{sub}</p>
    </div>
  </div>
);

/** KPI card matching Overview style */
interface KpiProps {
  label: string; value: string | number;
  icon: React.ElementType; iconBg: string; iconColor: string;
  trend?: number; loading?: boolean; onClick?: () => void;
}
const Kpi: React.FC<KpiProps> = ({ label, value, icon: Icon, iconBg, iconColor, trend, loading, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col gap-2 ${onClick ? 'cursor-pointer hover:border-primary/30 hover:shadow-md transition-all' : ''}`}
  >
    <div className="flex items-center justify-between">
      <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon className={iconColor} size={15} />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(trend)}%
        </span>
      )}
    </div>
    {loading
      ? <div className="h-7 w-16 bg-muted rounded animate-pulse" />
      : <p className="text-2xl font-bold text-foreground tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    }
    <p className="text-xs text-muted-foreground leading-none">{label}</p>
  </div>
);

/** Risk gauge bar */
const Gauge: React.FC<{ label: string; value: number; warn?: number; danger?: number; suffix?: string }> = ({
  label, value, warn = 10, danger = 25, suffix = '%',
}) => {
  const bar = value >= danger ? 'bg-rose-500' : value >= warn ? 'bg-amber-500' : 'bg-emerald-500';
  const txt = value >= danger ? 'text-rose-600' : value >= warn ? 'text-amber-600' : 'text-emerald-600';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${txt}`}>{value.toFixed(1)}{suffix}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
};

/** Funnel step row */
const FunnelRow: React.FC<{ label: string; sub: string; value: number; pct: number; bar: string }> = ({
  label, sub, value, pct, bar,
}) => (
  <div className="flex items-center gap-4">
    <div className="w-36 shrink-0">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
    <div className="flex-1 h-6 rounded-lg bg-muted/50 overflow-hidden">
      <div className={`h-full ${bar} rounded-lg`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
    <div className="w-24 shrink-0 text-right">
      <p className="text-sm font-bold text-foreground tabular-nums">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{pct.toFixed(1)}%</p>
    </div>
  </div>
);

/** Divider used between list rows */
const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`bg-card rounded-2xl border border-border shadow-sm ${className}`}>{children}</div>
);
const CardHead: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
    <p className="text-sm font-semibold text-foreground">{title}</p>
    {action}
  </div>
);

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, isAdmin, isSupport, isRisk, isDiscordManager, isContentCreator } = useAuth();

  const q = <T,>(key: string, fn: () => Promise<T>, enabled = true) =>
    useQuery<T>({ queryKey: [key], queryFn: fn, staleTime: 5 * 60 * 1000, enabled });

  const { data: dash,      isLoading: dL } = q('dash',      dashboardService.getDashboardData);
  const { data: challenge, isLoading: cL } = q('challenge',  challengeAnalyticsService.getChallengeAnalytics, hasPermission('dashboard.view_stats'));
  const { data: payouts,   isLoading: pL } = q('payouts',    () => dashboardService.getPayoutAnalytics(),     hasPermission('dashboard.view_stats'));
  const { data: trades,    isLoading: tL } = q('trades',     dashboardService.getTradeAnalytics,              hasPermission('dashboard.view_stats'));
  const { data: orders,    isLoading: oL } = q('orders',     dashboardService.getOrderAnalytics,              hasPermission('orders.view'));

  const ov     = dash?.overview;
  const funnel = trades?.funnel;

  // ── Limited view ─────────────────────────────────────────────────────────
  if (!hasPermission('dashboard.view_stats')) {
    const navCards = [
      { to: '/traders',           label: 'Traders',         icon: Users,         roles: ['admin','support','risk'] },
      { to: '/challenges',        label: 'Challenges',      icon: Activity,      roles: ['admin','support','risk'] },
      { to: '/trade-management',  label: 'Trades',          icon: TrendingUp,    roles: ['admin','support','risk'] },
      { to: '/payout-request',    label: 'Payouts',         icon: DollarSign,    roles: ['admin','support','risk','discord_manager'] },
      { to: '/order-history',     label: 'Orders',          icon: ShoppingBag,   roles: ['admin','support','risk'] },
      { to: '/offers',            label: 'Offers',          icon: Tag,           roles: ['admin','support','risk'] },
      { to: '/certificates',      label: 'Certificates',    icon: Award,         roles: ['admin','support','risk','discord_manager','content_creator'] },
      { to: '/kyc',               label: 'KYC',             icon: FileSearch,    roles: ['admin','support','risk'] },
      { to: '/affiliates',        label: 'Affiliates',      icon: BadgePercent,  roles: ['admin','support','risk','discord_manager'] },
      { to: '/support-dashboard', label: 'Live Chat',       icon: MessageCircle, roles: ['admin','support','risk'] },
      { to: '/tickets',           label: 'Tickets',         icon: Ticket,        roles: ['admin','support','risk'] },
      { to: '/notifications',     label: 'Notifications',   icon: Bell,          roles: ['admin','support','risk'] },
      { to: '/risk-management',   label: 'Risk',            icon: Shield,        roles: ['admin','support','risk'] },
      { to: '/ip-analysis',       label: 'IP Analysis',     icon: Network,       roles: ['admin','support','risk'] },
      { to: '/wecoins/tasks',     label: 'WeCoins',         icon: Cog,           roles: ['admin','support','risk','discord_manager'] },
      { to: '/settings',          label: 'Settings',        icon: Settings,      roles: ['admin','support','risk','discord_manager','content_creator'] },
    ].filter(c => {
      const m: Record<string, boolean> = { admin: isAdmin, support: isSupport, risk: isRisk, discord_manager: isDiscordManager, content_creator: isContentCreator };
      return c.roles.some(r => m[r]);
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
              className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Icon className="text-primary" size={18} />
              </div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Data prep ─────────────────────────────────────────────────────────────
  const enrolled = funnel?.total_enrollments ?? 0;
  const funnelSteps = [
    { label: 'Enrolled',       sub: 'All time',           value: enrolled,                    pct: 100, bar: 'bg-primary/70' },
    { label: 'Phase 2',        sub: 'Passed phase 1',     value: (enrolled - (funnel?.failed_phase1 ?? enrolled)), pct: enrolled > 0 ? ((enrolled - (funnel?.failed_phase1 ?? enrolled)) / enrolled) * 100 : 0, bar: 'bg-violet-400' },
    { label: 'Reached Live',   sub: 'All time',           value: funnel?.reached_live ?? 0,   pct: enrolled > 0 ? ((funnel?.reached_live ?? 0) / enrolled) * 100 : 0, bar: 'bg-blue-400' },
    { label: 'Active Live',    sub: 'Currently trading',  value: funnel?.live_active ?? 0,    pct: enrolled > 0 ? ((funnel?.live_active ?? 0) / enrolled) * 100 : 0, bar: 'bg-emerald-400' },
  ];

  const DIRECTION: Record<number, string> = { 0: 'Buy', 1: 'Sell', 2: 'Buy Limit', 3: 'Sell Limit', 4: 'Buy Stop', 5: 'Sell Stop' };
  const directionData = (trades?.direction_breakdown ?? []).map(d => ({ name: DIRECTION[d.cmd] ?? `CMD ${d.cmd}`, value: d.count }));
  const symbolsData   = (trades?.top_symbols ?? []).slice(0, 8).map(s => ({ name: s.symbol, trades: s.trade_count }));

  const liveFailRate  = (funnel && funnel.reached_live > 0) ? (funnel.live_failed / funnel.reached_live) * 100 : 0;

  const withdrawalCards = [
    { label: 'Pending',  value: payouts?.pending_withdrawals_value  ?? 0, icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100'  },
    { label: 'Approved', value: payouts?.approved_withdrawals_value ?? 0, icon: CheckCircle,   color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100'   },
    { label: 'Paid',     value: payouts?.paid_withdrawals_value     ?? 0, icon: TrendingUp,    color: 'text-emerald-600',bg: 'bg-emerald-50',border: 'border-emerald-100'},
    { label: 'Declined', value: payouts?.declined_withdrawals_value ?? 0, icon: AlertTriangle, color: 'text-rose-600',   bg: 'bg-rose-50',   border: 'border-rose-100'   },
  ];

  const reachRates = payouts ? [
    { name: '1st', rate: payouts.payout_reach_rates['1st'] },
    { name: '2nd', rate: payouts.payout_reach_rates['2nd'] },
    { name: '3rd', rate: payouts.payout_reach_rates['3rd'] },
    { name: '4th', rate: payouts.payout_reach_rates['4th'] },
  ] : [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10">

      {/* ══════════════════════════════════════════════════════════════════════
          1 · PLATFORM SNAPSHOT
          ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Kpi label="Total Traders"    value={ov?.total_users ?? 0}     icon={Users}      iconBg="bg-primary/10"  iconColor="text-primary"      loading={dL} onClick={() => navigate('/traders')} />
          <Kpi label="Live Accounts"    value={ov?.live_accounts ?? 0}   icon={Zap}        iconBg="bg-emerald-50"  iconColor="text-emerald-600"  loading={dL} onClick={() => navigate('/challenges')} />
          <Kpi label="Active Challenges"value={ov?.active_challenges ?? 0}icon={Activity}   iconBg="bg-blue-50"     iconColor="text-blue-600"     loading={dL} onClick={() => navigate('/challenges')} />
          <Kpi label="Pending Payouts"  value={ov?.pending_payouts ?? 0} icon={DollarSign} iconBg="bg-amber-50"    iconColor="text-amber-600"    loading={dL} onClick={() => navigate('/payout-request')} />
          <Kpi label="Pending KYC"      value={ov?.pending_kyc ?? 0}     icon={FileSearch} iconBg="bg-violet-50"   iconColor="text-violet-600"   loading={dL} onClick={() => navigate('/kyc')} />
          <Kpi label="Total Balance"    value={ov ? fmt$(ov.total_balance) : '—'} icon={BarChart2} iconBg="bg-rose-50" iconColor="text-rose-600" loading={dL} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          2 · TRADER PIPELINE
          ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <H title="Trader Pipeline" sub="Enrollment funnel & phase conversion" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {/* Funnel */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">Enrollment Funnel</p>
            {(cL || tL)
              ? <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-6 bg-muted rounded animate-pulse" />)}</div>
              : <div className="space-y-4">{funnelSteps.map((s, i) => <FunnelRow key={i} {...s} />)}</div>
            }
          </div>

          {/* Phase counts + conversion highlights */}
          <div className="space-y-4">
            <Kpi label="Phase 1 Active" value={challenge?.phase1_count ?? 0} icon={Activity} iconBg="bg-blue-50" iconColor="text-blue-600" loading={cL} />
            <Kpi label="Phase 2 Active" value={challenge?.phase2_count ?? 0} icon={Award}    iconBg="bg-violet-50" iconColor="text-violet-600" loading={cL} />
            <Kpi label="Live Traders"   value={challenge?.live_traders ?? 0} icon={Zap}      iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={cL} />
          </div>
        </div>

        {/* Step performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[
            { title: 'One-Step Performance', steps: challenge?.one_step_stats ?? [], accentBg: 'bg-primary/10', accentText: 'text-primary' },
            { title: 'Two-Step Performance', steps: challenge?.two_step_stats ?? [], accentBg: 'bg-violet-50',  accentText: 'text-violet-600' },
          ].map(({ title, steps, accentBg, accentText }) => (
            <Card key={title}>
              <CardHead title={title} />
              <div className="p-5 space-y-4">
                {cL
                  ? [...Array(2)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)
                  : steps.length === 0
                    ? <p className="text-xs text-muted-foreground text-center py-4">No data</p>
                    : steps.map((step, i) => {
                        const passRate = step.total > 0 ? (step.passes / step.total) * 100 : 0;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-lg ${accentBg} flex items-center justify-center flex-shrink-0`}>
                              <span className={`text-xs font-bold ${accentText}`}>{i + 1}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground truncate max-w-[140px]">{step.label}</span>
                                <span className="text-xs font-semibold text-emerald-600 ml-2">{passRate.toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${passRate}%` }} />
                              </div>
                            </div>
                            <div className="w-14 text-right shrink-0">
                              <p className="text-sm font-bold text-foreground tabular-nums">{step.passes.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">passed</p>
                            </div>
                          </div>
                        );
                      })
                }
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          3 · LIVE TRADING
          ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <H title="Live Trading" sub="Active account metrics and trading activity" />

        {/* Core trading KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
          <Kpi label="Total Trades"      value={trades ? fmtN(trades.total_trades) : '—'}          icon={BarChart2} iconBg="bg-primary/10"  iconColor="text-primary"      loading={tL} />
          <Kpi label="Total Profit"      value={trades ? fmt$(trades.total_profit) : '—'}           icon={TrendingUp}iconBg="bg-emerald-50"  iconColor="text-emerald-600"  loading={tL} />
          <Kpi label="Avg Profit/Trade"  value={trades ? fmt$(trades.avg_profit_per_trade) : '—'}   icon={Target}    iconBg="bg-blue-50"     iconColor="text-blue-600"     loading={tL} />
          <Kpi label="Commission Earned" value={trades ? fmt$(trades.total_commission) : '—'}       icon={DollarSign}iconBg="bg-violet-50"   iconColor="text-violet-600"   loading={tL} />
          <Kpi label="Avg Live Survival" value={trades?.avg_live_survival_days != null ? `${trades.avg_live_survival_days}d` : 'N/A'} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" loading={tL} />
        </div>

        {/* Direction breakdown + Top symbols */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <Card className="p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Trade Direction Breakdown</p>
            {tL
              ? <div className="h-48 bg-muted rounded animate-pulse" />
              : <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    {chartGradientDefs()}
                    <Pie data={directionData} cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={3} dataKey="value" nameKey="name" stroke="none"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: 'hsl(240 10% 55%)', strokeWidth: 1 }}>
                      {directionData.map((_, i) => <Cell key={i} fill={getGradientFill(i)} />)}
                    </Pie>
                    <Tooltip content={<FuturisticTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
            }
          </Card>

          <Card className="p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Top Symbols by Trade Count</p>
            {tL
              ? <div className="h-48 bg-muted rounded animate-pulse" />
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={symbolsData} barSize={18} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    {chartGradientDefs()}
                    <XAxis dataKey="name" tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} angle={-25} textAnchor="end" height={48} />
                    <YAxis tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                    <Tooltip content={<FuturisticTooltip />} />
                    <Bar dataKey="trades" name="Trades" radius={[6, 6, 0, 0]} fill={getGradientFill(0)} />
                  </BarChart>
                </ResponsiveContainer>
            }
          </Card>
        </div>

        {/* Monthly comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[
            { title: 'Trades This Month vs Last', last: trades?.last_month_trades ?? 0, curr: trades?.current_month_trades ?? 0, key: 'Trades', fmt: fmtN, fillL: 'url(#neonPurple)', fillC: 'url(#neonCyan)' },
            { title: 'Profit This Month vs Last',  last: trades?.last_month_profit  ?? 0, curr: trades?.current_month_profit  ?? 0, key: 'Profit',  fmt: fmt$, fillL: 'url(#neonPurple)', fillC: 'url(#neonGreen)' },
          ].map(({ title, last, curr, key, fmt, fillL, fillC }) => (
            <Card key={title} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />Last</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" />This</span>
                </div>
              </div>
              <div className="flex gap-6 mb-4">
                <div><p className="text-xs text-muted-foreground">Last month</p><p className="text-xl font-bold text-foreground">{fmt(last)}</p></div>
                <div><p className="text-xs text-muted-foreground">This month</p><p className="text-xl font-bold text-foreground">{fmt(curr)}</p></div>
              </div>
              {tL ? <div className="h-24 bg-muted rounded animate-pulse" /> :
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={[{ name: key, 'Last Month': last, 'This Month': curr }]} barSize={32} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    {chartGradientDefs()}
                    <XAxis dataKey="name" tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                    <YAxis tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} tickFormatter={v => fmt(v)} />
                    <Tooltip content={<FuturisticTooltip />} />
                    <Bar dataKey="Last Month"  fill={fillL} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="This Month"  fill={fillC} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              }
            </Card>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          4 · PAYOUTS & WITHDRAWALS
          ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <H title="Payouts & Withdrawals" sub="Withdrawal status, reach rates and key payout metrics" />

        {/* Status strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {withdrawalCards.map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`bg-card rounded-2xl shadow-sm p-4 border ${border}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={color} size={13} />
                </div>
              </div>
              {pL ? <div className="h-7 w-24 bg-muted rounded animate-pulse" />
                  : <p className={`text-xl font-bold ${color}`}>{fmt$(value)}</p>}
            </div>
          ))}
        </div>

        {/* Reach rates · Monthly chart · Key metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          <Card className="p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Payout Reach Rates</p>
            {pL ? <div className="h-32 bg-muted rounded animate-pulse" /> :
              <div className="space-y-3">
                {reachRates.map(({ name, rate }) => (
                  <div key={name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{name} Payout</span>
                      <span className="text-xs font-bold text-foreground tabular-nums">{rate.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(rate, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            }
          </Card>

          <Card className="p-5">
            <p className="text-sm font-semibold text-foreground mb-1">Monthly Payouts</p>
            <p className="text-xs text-muted-foreground mb-4">Last vs. current month</p>
            {pL ? <div className="h-32 bg-muted rounded animate-pulse" /> :
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={[
                  { name: 'Last Month',  value: payouts?.last_month_payouts    ?? 0 },
                  { name: 'This Month',  value: payouts?.current_month_payouts ?? 0 },
                ]} barSize={32} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  {chartGradientDefs()}
                  <XAxis dataKey="name" tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                  <YAxis tickFormatter={v => fmt$(v)} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                  <Tooltip content={<FuturisticTooltip />} />
                  <Bar dataKey="value" name="Payouts" radius={[6, 6, 0, 0]}>
                    {[0, 1].map(i => <Cell key={i} fill={getGradientFill(i)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            }
          </Card>

          <Card className="p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Key Metrics</p>
            <div className="space-y-4">
              {[
                { label: 'Total Payout Value',    value: payouts ? fmt$(payouts.total_payouts_value) : '—' },
                { label: 'Average Payout',         value: payouts ? fmt$(payouts.avg_payouts_value)   : '—' },
                { label: 'Total Funded Value',     value: payouts ? fmt$(payouts.total_funded_value)  : '—' },
                { label: 'Repeat Withdrawal Rate', value: payouts ? `${payouts.repeat_withdrawal_rate.toFixed(1)}%` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Top repeat withdrawers */}
        {(payouts?.top_repeat_withdrawers ?? []).length > 0 && (
          <Card>
            <CardHead title="Top Repeat Withdrawers" />
            <div className="divide-y divide-border">
              {payouts!.top_repeat_withdrawers.slice(0, 5).map((t, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.trader__first_name} {t.trader__last_name}</p>
                    <p className="text-xs text-muted-foreground">{t.withdrawal_count} withdrawals · Client share: {fmt$(t.total_client_share)}</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">{fmt$(t.total_net)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          5 · RISK & PLATFORM HEALTH
          ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <H title="Risk & Platform Health" sub="Breach indicators, account health and extreme trades" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {/* Health gauges */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-5">
            <p className="text-sm font-semibold text-foreground mb-5">Health Indicators</p>
            {cL || tL
              ? <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-5 bg-muted rounded animate-pulse" />)}</div>
              : <div className="space-y-5">
                  <Gauge label="Blocked Accounts"   value={challenge?.blocked_accounts_pct  ?? 0} warn={5}  danger={15} />
                  <Gauge label="Daily DD Breached"  value={challenge?.daily_dd_breached_pct ?? 0} warn={15} danger={35} />
                  <Gauge label="Max DD Breached"    value={challenge?.max_dd_breached_pct   ?? 0} warn={15} danger={35} />
                  <Gauge label="Live Fail Rate"     value={liveFailRate}                          warn={20} danger={45} />
                </div>
            }
          </div>

          {/* Timing + account metrics */}
          <div className="space-y-4">
            <Kpi label="Avg Pass Time"      value={challenge?.avg_pass_time    != null ? `${challenge.avg_pass_time} days`    : 'N/A'} icon={Clock}         iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={cL} />
            <Kpi label="Avg Breach Time"    value={challenge?.avg_breach_time  != null ? `${challenge.avg_breach_time} days`  : 'N/A'} icon={AlertTriangle}  iconBg="bg-rose-50"    iconColor="text-rose-600"    loading={cL} />
            <Kpi label="Accounts per User"  value={challenge?.avg_accounts_per_user ?? '—'}                                              icon={Users}          iconBg="bg-blue-50"    iconColor="text-blue-600"    loading={cL} />
          </div>
        </div>

        {/* Best & worst trades */}
        {trades && (trades.best_trades.length > 0 || trades.worst_trades.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHead title="Top Winning Trades" />
              <div className="divide-y divide-border">
                {trades.best_trades.slice(0, 5).map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-emerald-600">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{t.symbol} · Order #{t.order}</p>
                      <p className="text-xs text-muted-foreground">{t.volume.toFixed(2)} lots</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">+{fmt$(t.profit)}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardHead title="Worst Losing Trades" />
              <div className="divide-y divide-border">
                {trades.worst_trades.slice(0, 5).map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-rose-600">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{t.symbol} · Order #{t.order}</p>
                      <p className="text-xs text-muted-foreground">{t.volume.toFixed(2)} lots</p>
                    </div>
                    <p className="text-sm font-bold text-rose-600">{fmt$(t.profit)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          6 · REVENUE & ORDERS  (permission-gated)
          ══════════════════════════════════════════════════════════════════════ */}
      {hasPermission('orders.view') && (
        <section>
          <H title="Revenue & Orders" sub="Financial performance and customer analytics" />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <Kpi label="Total Revenue"     value={orders ? fmt$(orders.total_revenue)      : '—'} icon={DollarSign} iconBg="bg-emerald-50" iconColor="text-emerald-600" loading={oL} />
            <Kpi label="Total Orders"      value={orders?.total_orders ?? '—'}                    icon={ShoppingBag}iconBg="bg-blue-50"    iconColor="text-blue-600"    loading={oL} />
            <Kpi label="Avg Order Value"   value={orders ? fmt$(orders.avg_order_value)    : '—'} icon={Target}     iconBg="bg-violet-50" iconColor="text-violet-600"   loading={oL} />
            <Kpi label="Affiliate Revenue" value={orders ? fmt$(orders.affiliate_revenue)  : '—'} icon={Globe}      iconBg="bg-amber-50"  iconColor="text-amber-600"    loading={oL} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="p-5">
              <p className="text-sm font-semibold text-foreground mb-4">Revenue: This Month vs Last</p>
              <div className="flex gap-8 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold text-foreground">{orders ? fmt$(orders.current_month_revenue) : '—'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{orders?.current_month_orders ?? 0} orders</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Month</p>
                  <p className="text-2xl font-bold text-muted-foreground">{orders ? fmt$(orders.last_month_revenue) : '—'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{orders?.last_month_orders ?? 0} orders</p>
                </div>
              </div>
              {oL ? <div className="h-24 bg-muted rounded animate-pulse" /> :
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={[
                    { name: 'Last Month',  value: orders?.last_month_revenue    ?? 0 },
                    { name: 'This Month',  value: orders?.current_month_revenue ?? 0 },
                  ]} barSize={36} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    {chartGradientDefs()}
                    <XAxis dataKey="name" tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                    <YAxis tickFormatter={v => fmt$(v)} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                    <Tooltip content={<FuturisticTooltip />} />
                    <Bar dataKey="value" name="Revenue" radius={[6, 6, 0, 0]}>
                      {[0, 1].map(i => <Cell key={i} fill={getGradientFill(i)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              }
            </Card>

            <Card>
              <CardHead title="Top Customers by Revenue" action={<button onClick={() => navigate('/order-history')} className="text-xs text-primary flex items-center gap-1 hover:underline">View all <ChevronRight size={11} /></button>} />
              <div className="divide-y divide-border">
                {oL ? [...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                    <div className="w-7 h-7 rounded-full bg-muted" /><div className="flex-1 h-3 bg-muted rounded" /><div className="h-3 w-16 bg-muted rounded" />
                  </div>
                )) : (orders?.top_customers ?? []).slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.customer_name || c.customer_email}</p>
                      <p className="text-xs text-muted-foreground">{c.order_count} orders · avg {fmt$(c.avg_spent)}</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">{fmt$(c.total_spent)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          7 · RECENT ACTIVITY
          ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <H title="Recent Activity" sub="Latest enrollments and payout requests" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHead title="Recent Challenges" action={<button onClick={() => navigate('/challenges')} className="text-xs text-primary flex items-center gap-1 hover:underline">View all <ChevronRight size={11} /></button>} />
            <div className="divide-y divide-border">
              {dL ? [...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-1.5"><div className="h-3 w-28 bg-muted rounded" /><div className="h-2.5 w-20 bg-muted rounded" /></div>
                  <div className="h-5 w-16 bg-muted rounded-full" />
                </div>
              )) : (dash?.recent_challenges ?? []).map((c, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate('/challenges')}>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">{c.trader_name?.[0]?.toUpperCase() ?? '?'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.trader_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.challenge_name}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusCls(c.phase_status)}`}>{c.phase_status}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHead title="Recent Payout Requests" action={<button onClick={() => navigate('/payout-request')} className="text-xs text-primary flex items-center gap-1 hover:underline">View all <ChevronRight size={11} /></button>} />
            <div className="divide-y divide-border">
              {dL ? [...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-1.5"><div className="h-3 w-24 bg-muted rounded" /><div className="h-2.5 w-14 bg-muted rounded" /></div>
                  <div className="h-5 w-16 bg-muted rounded-full" />
                </div>
              )) : (dash?.recent_payouts ?? []).map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate('/payout-request')}>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-xs font-bold flex-shrink-0">{p.trader_name?.[0]?.toUpperCase() ?? '?'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.trader_name}</p>
                    <p className="text-xs text-muted-foreground">{p.time_ago}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-foreground">${p.amount.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls(p.status)}`}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

    </div>
  );
};

export default Dashboard;
