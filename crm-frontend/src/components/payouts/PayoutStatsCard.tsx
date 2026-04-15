import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Users, Activity } from 'lucide-react';

export interface PayoutOverview {
  total_count: number;
  total_amount: number;
  total_profit: number;
  total_net_profit: number;
  total_profit_share: number;
  total_pending_payout: number;
  total_rejected_amount: number;
  total_approved_profit: number;
  total_approved_net_profit: number;
  status_counts: Record<string, number>;
}

export interface PayoutStatsCardProps {
  overview: PayoutOverview;
}

export const PayoutStatsCard: React.FC<PayoutStatsCardProps> = ({ overview }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Calculate the sum of all status counts to verify data integrity
  const totalStatusCounts = Object.values(overview.status_counts).reduce((sum, count) => sum + count, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'approved':
        return 'info';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Total Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.total_count}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(overview.status_counts).map(([status, count]) => (
              <Badge 
                key={status} 
                variant={getStatusColor(status) as any}
                className="text-xs"
              >
                {status}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending + Extended Review */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{formatCurrency(overview.total_pending_payout)}</div>
          <p className="text-xs text-muted-foreground">Pending + Extended Review</p>
        </CardContent>
      </Card>

      {/* Rejected Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rejected Amount</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{formatCurrency(overview.total_rejected_amount)}</div>
          <p className="text-xs text-muted-foreground">Total rejected payouts</p>
        </CardContent>
      </Card>

      {/* Approved Profit (before split) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approved Profit</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(overview.total_approved_profit)}</div>
          <p className="text-xs text-muted-foreground">Before profit split</p>
        </CardContent>
      </Card>

      {/* Approved Net Profit (after split) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approved Net Profit</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{formatCurrency(overview.total_approved_net_profit)}</div>
          <p className="text-xs text-muted-foreground">After profit split</p>
        </CardContent>
      </Card>
    </div>
  );
};