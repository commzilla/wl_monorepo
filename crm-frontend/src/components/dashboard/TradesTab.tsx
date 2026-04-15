import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatsCard from '@/components/dashboard/StatsCard';
import { dashboardService } from '@/services/dashboardService';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  chartGradientDefs,
  FuturisticTooltip,
  getGradientFill,
  GRID_PROPS,
  AXIS_TICK_STYLE,
  AXIS_LINE_STYLE,
} from './chartTheme';

const DIRECTION_NAMES: { [key: number]: string } = {
  0: 'BUY',
  1: 'SELL',
  2: 'BUY LIMIT',
  3: 'SELL LIMIT',
  4: 'BUY STOP',
  5: 'SELL STOP',
};

const TradesTab: React.FC = () => {
  const { data: tradeAnalytics, isLoading, error } = useQuery({
    queryKey: ['tradeAnalytics'],
    queryFn: dashboardService.getTradeAnalytics,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Live Trading Analytics</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        <p className="text-lg mb-2">Error Loading Trades Analytics</p>
        <p className="text-sm">Please try refreshing the page.</p>
      </div>
    );
  }

  if (!tradeAnalytics) {
    return null;
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatNumber = (num: number) => num.toLocaleString('en-US');

  const { funnel } = tradeAnalytics;

  const funnelData = funnel ? [
    { name: 'Total Enrollments', value: funnel.total_enrollments },
    { name: 'Failed Phase 1', value: funnel.failed_phase1 },
    { name: 'Failed Phase 2', value: funnel.failed_phase2 },
    { name: 'Reached Live', value: funnel.reached_live },
  ] : [];

  const directionData = tradeAnalytics.direction_breakdown.map((item) => ({
    name: DIRECTION_NAMES[item.cmd] || `CMD ${item.cmd}`,
    value: item.count,
  }));

  const symbolsData = tradeAnalytics.top_symbols.slice(0, 8).map((s) => ({
    name: s.symbol,
    trades: s.trade_count,
    profit: s.total_profit,
  }));

  const monthlyComparisonData = [
    {
      name: 'Trades',
      'Last Month': tradeAnalytics.last_month_trades,
      'Current Month': tradeAnalytics.current_month_trades,
    },
  ];

  const monthlyProfitData = [
    {
      name: 'Profit',
      'Last Month': tradeAnalytics.last_month_profit,
      'Current Month': tradeAnalytics.current_month_profit,
    },
  ];

  const topAccountsData = tradeAnalytics.top_accounts.slice(0, 10).map((a) => ({
    name: a.account_id,
    profit: a.total_profit,
    trades: a.trade_count,
  }));

  const liveConversionRate = funnel && funnel.total_enrollments > 0
    ? ((funnel.reached_live / funnel.total_enrollments) * 100).toFixed(1)
    : '0.0';

  const liveFailRate = funnel && funnel.reached_live > 0
    ? ((funnel.live_failed / funnel.reached_live) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Challenge Funnel */}
      {funnel && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Challenge Funnel</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <StatsCard
                title="Total Enrollments"
                value={formatNumber(funnel.total_enrollments)}
              />
              <StatsCard
                title="Failed Phase 1"
                value={formatNumber(funnel.failed_phase1)}
              />
              <StatsCard
                title="Failed Phase 2"
                value={formatNumber(funnel.failed_phase2)}
              />
              <StatsCard
                title="Reached Live"
                value={formatNumber(funnel.reached_live)}
              />
              <StatsCard
                title="Live Conversion"
                value={`${liveConversionRate}%`}
              />
              <StatsCard
                title="Avg Survival"
                value={tradeAnalytics.avg_live_survival_days != null ? `${tradeAnalytics.avg_live_survival_days} days` : 'N/A'}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="overflow-x-auto chart-container">
                <ResponsiveContainer width="100%" height={250} minWidth={300}>
                  <BarChart data={funnelData}>
                    {chartGradientDefs()}
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="name" tick={AXIS_TICK_STYLE} angle={-20} textAnchor="end" height={60} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                    <YAxis tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                    <Tooltip content={<FuturisticTooltip />} />
                    <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                      {funnelData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={getGradientFill(index)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center space-y-3">
                <div className="p-4 rounded-xl border border-primary/15 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Live Active</span>
                    <span className="text-lg font-bold text-primary">{formatNumber(funnel.live_active)}</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Live Failed (Breached)</span>
                    <span className="text-lg font-bold text-rose-600">{formatNumber(funnel.live_failed)}</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Live Fail Rate</span>
                    <span className="text-lg font-bold text-amber-600">{liveFailRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Core Metrics (Live Accounts Only) */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Live Account Metrics</p>
          <p className="text-xs text-muted-foreground mt-0.5">({formatNumber(tradeAnalytics.total_live_accounts)} live accounts)</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatsCard
              title="Total Trades"
              value={formatNumber(tradeAnalytics.total_trades)}
            />
            <StatsCard
              title="Total Profit"
              value={formatCurrency(tradeAnalytics.total_profit)}
            />
            <StatsCard
              title="Avg Profit/Trade"
              value={formatCurrency(tradeAnalytics.avg_profit_per_trade)}
            />
            <StatsCard
              title="Total Commission"
              value={formatCurrency(tradeAnalytics.total_commission)}
            />
            <StatsCard
              title="Total Storage"
              value={formatCurrency(tradeAnalytics.total_storage)}
            />
          </div>
        </div>
      </div>

      {/* Direction Breakdown (Pie) & Top Symbols (Bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Trade Directions</p>
          </div>
          <div className="overflow-x-auto chart-container p-5">
            <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <PieChart>
                {chartGradientDefs()}
                <Pie
                  data={directionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {directionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getGradientFill(index)} />
                  ))}
                </Pie>
                <Tooltip content={<FuturisticTooltip />} />
                <Legend
                  formatter={(value: string) => (
                    <span className="text-muted-foreground text-xs">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Top Symbols by Trade Count</p>
          </div>
          <div className="overflow-x-auto chart-container p-5">
            <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <BarChart data={symbolsData}>
                {chartGradientDefs()}
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="name" tick={AXIS_TICK_STYLE} angle={-30} textAnchor="end" height={60} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                <YAxis tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                <Tooltip content={<FuturisticTooltip />} />
                <Bar dataKey="trades" name="Trades" fill="url(#neonCyan)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Comparison Charts */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Monthly Comparison</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Last Month Trades"
              value={formatNumber(tradeAnalytics.last_month_trades)}
            />
            <StatsCard
              title="Last Month Profit"
              value={formatCurrency(tradeAnalytics.last_month_profit)}
            />
            <StatsCard
              title="Current Month Trades"
              value={formatNumber(tradeAnalytics.current_month_trades)}
            />
            <StatsCard
              title="Current Month Profit"
              value={formatCurrency(tradeAnalytics.current_month_profit)}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="overflow-x-auto chart-container">
              <ResponsiveContainer width="100%" height={250} minWidth={250}>
                <BarChart data={monthlyComparisonData}>
                  {chartGradientDefs()}
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="name" tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                  <YAxis tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                  <Tooltip content={<FuturisticTooltip />} />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-muted-foreground text-xs">{value}</span>
                    )}
                  />
                  <Bar dataKey="Last Month" fill="url(#neonPurple)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Current Month" fill="url(#neonCyan)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto chart-container">
              <ResponsiveContainer width="100%" height={250} minWidth={250}>
                <BarChart data={monthlyProfitData}>
                  {chartGradientDefs()}
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="name" tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                  <Tooltip content={<FuturisticTooltip />} />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-muted-foreground text-xs">{value}</span>
                    )}
                  />
                  <Bar dataKey="Last Month" fill="url(#neonPurple)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Current Month" fill="url(#neonGreen)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Top Accounts (Horizontal Bar) */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Top Live Accounts by Profit</p>
        </div>
        <div className="overflow-x-auto chart-container p-5">
          <ResponsiveContainer width="100%" height={Math.max(300, topAccountsData.length * 40)} minWidth={400}>
            <BarChart data={topAccountsData} layout="vertical" margin={{ left: 20 }}>
              {chartGradientDefs()}
              <CartesianGrid {...GRID_PROPS} />
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
              <Tooltip content={<FuturisticTooltip />} />
              <Bar dataKey="profit" name="Profit" fill={getGradientFill(2, true)} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Best & Worst Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Best Trades</p>
          </div>
          <div className="p-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tradeAnalytics.best_trades.slice(0, 5).map((trade, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{trade.order}</TableCell>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>{trade.volume.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-medium">
                      {formatCurrency(trade.profit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Worst Trades</p>
          </div>
          <div className="p-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead className="text-right">Loss</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tradeAnalytics.worst_trades.slice(0, 5).map((trade, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{trade.order}</TableCell>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>{trade.volume.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-rose-600 font-medium">
                      {formatCurrency(trade.profit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradesTab;
