import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, Activity, AlertTriangle } from 'lucide-react';
import { riskCoreMetricsService } from '@/services/riskCoreMetricsService';
import { RiskCoreMetricsFilters } from '@/lib/types/riskCoreMetrics';

const RiskCoreMetrics = () => {
  const [filters, setFilters] = useState<RiskCoreMetricsFilters>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['riskCoreMetrics', filters],
    queryFn: () => riskCoreMetricsService.getRiskCoreMetrics(filters),
  });

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handleFilterChange = (key: keyof RiskCoreMetricsFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Risk Core Metrics"
          subtitle="Comprehensive risk analytics and trading behavior insights"
        />
        <div className="text-center py-12">Loading metrics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader
        title="Risk Core Metrics"
        subtitle="Comprehensive risk analytics and trading behavior insights"
      />

      {/* Filters */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
          <CardDescription>Filter metrics by program, country, or account size</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Select
              value={filters.program || 'all'}
              onValueChange={(value) => handleFilterChange('program', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {data?.available_programs?.map((program) => (
                  <SelectItem key={program} value={program}>
                    {program}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.country || 'all'}
              onValueChange={(value) => handleFilterChange('country', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.account_size || 'all'}
              onValueChange={(value) => handleFilterChange('account_size', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Account Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                <SelectItem value="5000">$5,000</SelectItem>
                <SelectItem value="10000">$10,000</SelectItem>
                <SelectItem value="25000">$25,000</SelectItem>
                <SelectItem value="50000">$50,000</SelectItem>
                <SelectItem value="100000">$100,000</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payout Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Payouts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{data?.payout_metrics.payouts_daily || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Payouts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{data?.payout_metrics.payouts_weekly || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payouts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{data?.payout_metrics.payouts_monthly || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{data?.payout_metrics.payout_approval_rate || 0}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        {/* Average Payout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <DollarSign className="h-5 w-5" />
              Average Payout Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {formatCurrency(data?.payout_metrics.average_payout_amount || '0')}
            </div>
          </CardContent>
        </Card>

        {/* Revenue vs Payout Ratio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle className="h-5 w-5" />
              Revenue vs Payout Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {data?.revenue_metrics.revenue_vs_payout_ratio.toFixed(2) || '0.00'}x
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Daily Revenue</div>
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(data?.revenue_metrics.revenue_daily || '0')}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Weekly Revenue</div>
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(data?.revenue_metrics.revenue_weekly || '0')}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Monthly Revenue</div>
              <div className="text-xl sm:text-2xl font-bold">{formatCurrency(data?.revenue_metrics.revenue_monthly || '0')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Behavior */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Instruments</CardTitle>
            <CardDescription>Most traded symbols</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.trading_behavior.top_instruments.map((instrument, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{instrument.symbol}</span>
                  <span className="text-muted-foreground">{instrument.total} trades</span>
                </div>
              ))}
              {(!data?.trading_behavior.top_instruments || data.trading_behavior.top_instruments.length === 0) && (
                <div className="text-center text-muted-foreground py-4">No trading data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Stop Loss Usage Rate</div>
                <div className="text-2xl font-bold">{data?.trading_behavior.stop_loss_usage_rate.toFixed(2) || '0.00'}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Avg Payout vs Avg Volume</div>
                <div className="text-2xl font-bold">{data?.trading_behavior.avg_payout_vs_avg_volume.toFixed(3) || '0.000'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RiskCoreMetrics;
