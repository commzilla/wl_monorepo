import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import StatsCard from '@/components/dashboard/StatsCard';
import { dashboardService } from '@/services/dashboardService';
import { PayoutAnalyticsData, QuickDateFilter, PayoutDateFilterParams } from '@/lib/types/payoutAnalytics';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Filter, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  chartGradientDefs,
  FuturisticTooltip,
  getGradientFill,
  GRID_PROPS,
  AXIS_TICK_STYLE,
  AXIS_LINE_STYLE,
} from './chartTheme';

const QUICK_FILTERS: { value: QuickDateFilter; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];

const PayoutsTab: React.FC = () => {
  const [analytics, setAnalytics] = useState<PayoutAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState<QuickDateFilter>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const fetchAnalytics = useCallback(async (filters?: PayoutDateFilterParams) => {
    try {
      setLoading(true);
      const data = await dashboardService.getPayoutAnalytics(filters);
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching payout analytics:', error);
      toast.error('Failed to load payout analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleQuickFilter = (value: QuickDateFilter) => {
    setQuickFilter(value);
    if (value === 'custom') return;
    setDateFrom(undefined);
    setDateTo(undefined);
    if (value === 'all') {
      fetchAnalytics();
    } else {
      fetchAnalytics({ quick: value });
    }
  };

  const handleApplyCustomRange = () => {
    if (!dateFrom && !dateTo) return;
    const filters: PayoutDateFilterParams = { quick: 'custom' };
    if (dateFrom) filters.date_from = format(dateFrom, 'yyyy-MM-dd');
    if (dateTo) filters.date_to = format(dateTo, 'yyyy-MM-dd');
    fetchAnalytics(filters);
  };

  const handleClearFilters = () => {
    setQuickFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    fetchAnalytics();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrend = (current: number, trendPct: number) => {
    if (!analytics?.date_filter_applied) return undefined;
    return {
      value: Math.round(trendPct * 10) / 10,
      positive: trendPct >= 0,
      label: 'vs previous period',
    };
  };

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Payouts Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No payout data available</p>
      </div>
    );
  }

  const withdrawalStatusData = [
    { name: 'Approved', value: analytics.approved_withdrawals_value },
    { name: 'Paid', value: analytics.paid_withdrawals_value },
    { name: 'Pending', value: analytics.pending_withdrawals_value },
    { name: 'Declined', value: analytics.declined_withdrawals_value },
  ].filter(d => d.value > 0);

  const accountSizeData = (analytics.account_size_breakdown || []).map((row) => ({
    name: `$${row.account_size.toLocaleString()}`,
    value: row.total_value,
    count: row.count,
  }));

  const reachRatesData = [
    { name: '1st Payout', rate: analytics.payout_reach_rates['1st'] },
    { name: '2nd Payout', rate: analytics.payout_reach_rates['2nd'] },
    { name: '3rd Payout', rate: analytics.payout_reach_rates['3rd'] },
    { name: '4th Payout', rate: analytics.payout_reach_rates['4th'] },
  ];

  const monthlyComparisonData = [
    {
      name: 'Payout Value',
      'Last Month': analytics.last_month_payouts,
      'Current Month': analytics.current_month_payouts,
    },
  ];

  const countriesData = analytics.payouts_by_country.slice(0, 10).map((c) => ({
    name: c.trader__profile__country,
    value: c.total,
    count: c.count,
  }));

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <Card className="chart-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Date Filter
            </CardTitle>
            {quickFilter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_FILTERS.map((f) => (
              <Badge
                key={f.value}
                variant={quickFilter === f.value ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer px-3 py-1.5 text-sm transition-colors',
                  quickFilter === f.value
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'hover:bg-muted'
                )}
                onClick={() => handleQuickFilter(f.value)}
              >
                {f.label}
              </Badge>
            ))}
          </div>

          {quickFilter === 'custom' && (
            <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-border/40">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[180px] justify-start text-left font-normal',
                        !dateFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'PP') : 'Start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[180px] justify-start text-left font-normal',
                        !dateTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'PP') : 'End date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <Button onClick={handleApplyCustomRange} disabled={!dateFrom && !dateTo}>
                Apply
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Payout Stats */}
      <Card className="chart-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center">
            <span className="chart-title-accent" />
            Payouts Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Payouts"
              value={analytics.num_payouts}
              trend={getTrend(analytics.num_payouts, analytics.trends?.num_payouts ?? 0)}
            />
            <StatsCard
              title="Total Payout Value"
              value={formatCurrency(analytics.total_payouts_value)}
              trend={getTrend(analytics.total_payouts_value, analytics.trends?.total_payouts_value ?? 0)}
            />
            <StatsCard
              title="Average Payout"
              value={formatCurrency(analytics.avg_payouts_value)}
              trend={getTrend(analytics.avg_payouts_value, analytics.trends?.avg_payouts_value ?? 0)}
            />
            <StatsCard
              title="Repeat Withdrawal Rate"
              value={formatPercentage(analytics.repeat_withdrawal_rate)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Status Cards + Donut Chart */}
      <Card className="chart-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center">
            <span className="chart-title-accent" />
            Withdrawals by Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Approved"
              value={formatCurrency(analytics.approved_withdrawals_value)}
            />
            <StatsCard
              title="Paid"
              value={formatCurrency(analytics.paid_withdrawals_value)}
            />
            <StatsCard
              title="Pending"
              value={formatCurrency(analytics.pending_withdrawals_value)}
            />
            <StatsCard
              title="Declined"
              value={formatCurrency(analytics.declined_withdrawals_value)}
            />
          </div>
          {withdrawalStatusData.length > 0 && (
            <div className="overflow-x-auto chart-container">
              <ResponsiveContainer width="100%" height={300} minWidth={300}>
                <PieChart>
                  {chartGradientDefs()}
                  <Pie
                    data={withdrawalStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {withdrawalStatusData.map((_, index) => (
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
          )}
        </CardContent>
      </Card>

      {/* Step Type Breakdown */}
      {analytics.step_type_breakdown && analytics.step_type_breakdown.length > 0 && (
        <Card className="chart-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center">
              <span className="chart-title-accent" />
              Payouts by Challenge Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Challenge Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead className="text-right">Avg Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.step_type_breakdown.map((row) => (
                  <TableRow key={row.challenge__step_type}>
                    <TableCell className="font-medium">{row.challenge__step_type}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_value)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.avg_value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Account Size Breakdown */}
      {accountSizeData.length > 0 && (
        <Card className="chart-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center">
              <span className="chart-title-accent" />
              Payouts by Account Size
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto chart-container">
            <ResponsiveContainer width="100%" height={300} minWidth={400}>
              <BarChart data={accountSizeData} layout="vertical" margin={{ left: 20 }}>
                {chartGradientDefs()}
                <CartesianGrid {...GRID_PROPS} />
                <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                <Tooltip content={<FuturisticTooltip />} />
                <Bar dataKey="value" name="Total Value" fill={getGradientFill(0, true)} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Payout Reach Rates */}
      <Card className="chart-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center">
            <span className="chart-title-accent" />
            Payout Reach Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="1st Payout Rate"
              value={formatPercentage(analytics.payout_reach_rates["1st"])}
            />
            <StatsCard
              title="2nd Payout Rate"
              value={formatPercentage(analytics.payout_reach_rates["2nd"])}
            />
            <StatsCard
              title="3rd Payout Rate"
              value={formatPercentage(analytics.payout_reach_rates["3rd"])}
            />
            <StatsCard
              title="4th Payout Rate"
              value={formatPercentage(analytics.payout_reach_rates["4th"])}
            />
          </div>
          <div className="overflow-x-auto chart-container">
            <ResponsiveContainer width="100%" height={250} minWidth={300}>
              <BarChart data={reachRatesData}>
                {chartGradientDefs()}
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="name" tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 'auto']} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                <Tooltip content={<FuturisticTooltip />} />
                <Bar dataKey="rate" name="Reach Rate %" radius={[6, 6, 0, 0]}>
                  {reachRatesData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getGradientFill(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Comparison */}
      <Card className="chart-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center">
            <span className="chart-title-accent" />
            Monthly Comparison
            {analytics.date_filter_applied && (
              <span className="text-xs font-normal text-muted-foreground ml-2">(calendar months, unaffected by filter)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Current Month"
              value={formatCurrency(analytics.current_month_payouts)}
            />
            <StatsCard
              title="Last Month"
              value={formatCurrency(analytics.last_month_payouts)}
            />
            <StatsCard
              title="Total Funded Value"
              value={formatCurrency(analytics.total_funded_value)}
            />
            <StatsCard
              title="Avg Profit Split"
              value={formatPercentage(analytics.avg_profit_split)}
            />
          </div>
          <div className="overflow-x-auto chart-container">
            <ResponsiveContainer width="100%" height={250} minWidth={300}>
              <BarChart data={monthlyComparisonData}>
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
                <Bar dataKey="Current Month" fill="url(#neonCyan)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Repeat Withdrawers */}
      <Card className="chart-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center">
            <span className="chart-title-accent" />
            Top Repeat Withdrawers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trader</TableHead>
                <TableHead>Withdrawals</TableHead>
                <TableHead>Total Net</TableHead>
                <TableHead>Client Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.top_repeat_withdrawers.map((trader) => (
                <TableRow key={trader.trader__id}>
                  <TableCell>
                    {trader.trader__first_name} {trader.trader__last_name}
                  </TableCell>
                  <TableCell>{trader.withdrawal_count}</TableCell>
                  <TableCell>{formatCurrency(trader.total_net)}</TableCell>
                  <TableCell>{formatCurrency(trader.total_client_share)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payouts by Country */}
      {countriesData.length > 0 && (
        <Card className="chart-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center">
              <span className="chart-title-accent" />
              Payouts by Country (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto chart-container">
            <ResponsiveContainer width="100%" height={Math.max(300, countriesData.length * 40)} minWidth={400}>
              <BarChart data={countriesData} layout="vertical" margin={{ left: 20 }}>
                {chartGradientDefs()}
                <CartesianGrid {...GRID_PROPS} />
                <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                <Tooltip content={<FuturisticTooltip />} />
                <Bar dataKey="value" name="Total Value" fill={getGradientFill(3, true)} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayoutsTab;
