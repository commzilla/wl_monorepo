import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatsCard from '@/components/dashboard/StatsCard';
import { dashboardService } from '@/services/dashboardService';
import { Skeleton } from '@/components/ui/skeleton';
import { getCountryName } from '@/lib/utils/countryUtils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  chartGradientDefs,
  FuturisticTooltip,
  getGradientFill,
  GRID_PROPS,
  AXIS_TICK_STYLE,
  AXIS_LINE_STYLE,
} from './chartTheme';

const OrdersTab: React.FC = () => {
  const { data: orderAnalytics, isLoading, error } = useQuery({
    queryKey: ['orderAnalytics'],
    queryFn: dashboardService.getOrderAnalytics,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Orders Analytics</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
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
        <p className="text-lg mb-2">Error Loading Orders Analytics</p>
        <p className="text-sm">Please try refreshing the page.</p>
      </div>
    );
  }

  if (!orderAnalytics) {
    return null;
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const revenueCompositionData = [
    { name: 'Direct Revenue', value: Math.max(0, orderAnalytics.total_revenue - orderAnalytics.affiliate_revenue) },
    { name: 'Affiliate Revenue', value: orderAnalytics.affiliate_revenue },
    { name: 'Discounts', value: orderAnalytics.total_discounts },
    { name: 'Refunds', value: orderAnalytics.refunded_amount },
  ].filter(d => d.value > 0);

  const paymentStatusData = orderAnalytics.payment_status_breakdown
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: s.payment_status || 'Unknown',
      value: s.count,
    }));

  const monthlyComparisonData = [
    {
      name: 'Orders',
      'Last Month': orderAnalytics.last_month_orders,
      'Current Month': orderAnalytics.current_month_orders,
    },
  ];

  const monthlyRevenueData = [
    {
      name: 'Revenue',
      'Last Month': orderAnalytics.last_month_revenue,
      'Current Month': orderAnalytics.current_month_revenue,
    },
  ];

  const countriesData = orderAnalytics.orders_by_country.slice(0, 10).map((c) => ({
    name: getCountryName(c.country),
    revenue: c.revenue,
    orders: c.count,
  }));

  return (
    <div className="space-y-6">
      {/* Core Metrics */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Core Metrics</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Orders"
              value={orderAnalytics.total_orders}
            />
            <StatsCard
              title="Total Revenue"
              value={formatCurrency(orderAnalytics.total_revenue)}
            />
            <StatsCard
              title="Avg Order Value"
              value={formatCurrency(orderAnalytics.avg_order_value)}
            />
            <StatsCard
              title="Affiliate Orders"
              value={orderAnalytics.affiliate_orders}
            />
          </div>
        </div>
      </div>

      {/* Revenue Composition (Bar) & Payment Status (Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Revenue Composition</p>
          </div>
          <div className="overflow-x-auto chart-container p-5">
            <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <BarChart data={revenueCompositionData}>
                {chartGradientDefs()}
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="name" tick={AXIS_TICK_STYLE} angle={-20} textAnchor="end" height={60} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                <Tooltip content={<FuturisticTooltip />} />
                <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
                  {revenueCompositionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getGradientFill(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Payment Status</p>
          </div>
          <div className="overflow-x-auto chart-container p-5">
            <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <PieChart>
                {chartGradientDefs()}
                <Pie
                  data={paymentStatusData}
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
                  {paymentStatusData.map((_, index) => (
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
      </div>

      {/* Revenue & Discounts Cards */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Revenue & Discounts</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Discounts"
              value={formatCurrency(orderAnalytics.total_discounts)}
            />
            <StatsCard
              title="Coupon Usage"
              value={orderAnalytics.coupon_usage_count}
            />
            <StatsCard
              title="Affiliate Revenue"
              value={formatCurrency(orderAnalytics.affiliate_revenue)}
            />
            <StatsCard
              title="Refunded Amount"
              value={formatCurrency(orderAnalytics.refunded_amount)}
            />
          </div>
        </div>
      </div>

      {/* Monthly Comparison */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Monthly Comparison</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Last Month Orders"
              value={orderAnalytics.last_month_orders}
            />
            <StatsCard
              title="Last Month Revenue"
              value={formatCurrency(orderAnalytics.last_month_revenue)}
            />
            <StatsCard
              title="Current Month Orders"
              value={orderAnalytics.current_month_orders}
            />
            <StatsCard
              title="Current Month Revenue"
              value={formatCurrency(orderAnalytics.current_month_revenue)}
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
                <BarChart data={monthlyRevenueData}>
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
          </div>
        </div>
      </div>

      {/* Customer Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Top Customers</p>
          </div>
          <div className="p-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Avg Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderAnalytics.top_customers.slice(0, 5).map((customer, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{customer.customer_name || 'N/A'}</TableCell>
                    <TableCell>{customer.customer_email}</TableCell>
                    <TableCell className="text-right">{customer.order_count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.total_spent)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.avg_spent)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Repeating Customers */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Repeating Customers</p>
          </div>
          <div className="p-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Avg Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderAnalytics.repeating_customers?.slice(0, 5).map((customer, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{customer.customer_name || 'N/A'}</TableCell>
                    <TableCell>{customer.customer_email}</TableCell>
                    <TableCell className="text-right">{customer.order_count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.total_spent)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.avg_spent)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Orders by Country */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Top 10 Countries by Revenue</p>
        </div>
        <div className="overflow-x-auto chart-container p-5">
          <ResponsiveContainer width="100%" height={Math.max(300, countriesData.length * 40)} minWidth={400}>
            <BarChart data={countriesData} layout="vertical" margin={{ left: 30 }}>
              {chartGradientDefs()}
              <CartesianGrid {...GRID_PROPS} />
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
              <YAxis type="category" dataKey="name" width={120} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
              <Tooltip content={<FuturisticTooltip />} />
              <Bar dataKey="revenue" name="Revenue" fill={getGradientFill(0, true)} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default OrdersTab;
