import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { format } from 'date-fns';
import { CalendarDays, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface SnapshotTabProps {
  enrollmentId: string;
}

const SnapshotTab: React.FC<SnapshotTabProps> = ({ enrollmentId }) => {
  const {
    data: snapshotsData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['enrollment-snapshots', enrollmentId],
    queryFn: () => enrollmentReviewService.getSnapshots(enrollmentId),
    enabled: !!enrollmentId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !snapshotsData) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Failed to load snapshot data. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number | string | null) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  const formatPercentage = (value: number | null | undefined) => {
    const numValue = typeof value === 'number' ? value : 0;
    return `${numValue.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Daily Snapshots
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {snapshotsData.client_name} • {snapshotsData.challenge_name}
          </p>
        </CardHeader>
        <CardContent>
          {snapshotsData.snapshots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No snapshot data available for this enrollment.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account ID</TableHead>
                    <TableHead className="text-right">Starting Balance</TableHead>
                    <TableHead className="text-right">Starting Equity</TableHead>
                    <TableHead className="text-right">Ending Balance</TableHead>
                    <TableHead className="text-right">Ending Equity</TableHead>
                    <TableHead className="text-right">Today P&L</TableHead>
                    <TableHead className="text-right">Total P&L</TableHead>
                    <TableHead className="text-right">Daily Drawdown</TableHead>
                    <TableHead className="text-right">Total Drawdown</TableHead>
                    <TableHead className="text-right">Daily Loss Used</TableHead>
                    <TableHead className="text-right">Total Loss Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshotsData.snapshots.map((snapshot) => (
                    <TableRow key={snapshot.id}>
                      <TableCell className="font-medium">
                        {format(new Date(snapshot.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {snapshot.account_id}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(snapshot.starting_balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(snapshot.starting_equity)}
                      </TableCell>
                      <TableCell className="text-right">
                        {snapshot.ending_balance ? formatCurrency(snapshot.ending_balance) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {snapshot.ending_equity ? formatCurrency(snapshot.ending_equity) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {snapshot.today_profit >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-success" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-destructive" />
                          )}
                          <span className={snapshot.today_profit >= 0 ? 'text-success' : 'text-destructive'}>
                            {formatCurrency(snapshot.today_profit)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {snapshot.total_profit >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-success" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-destructive" />
                          )}
                          <span className={snapshot.total_profit >= 0 ? 'text-success' : 'text-destructive'}>
                            {formatCurrency(snapshot.total_profit)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={snapshot.today_max_drawdown > 50 ? 'destructive' : 'secondary'}>
                          {formatPercentage(snapshot.today_max_drawdown)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={snapshot.total_max_drawdown > 50 ? 'destructive' : 'secondary'}>
                          {formatPercentage(snapshot.total_max_drawdown)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={snapshot.daily_loss_used > 80 ? 'destructive' : 'secondary'}>
                          {formatPercentage(snapshot.daily_loss_used)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={snapshot.total_loss_used > 80 ? 'destructive' : 'secondary'}>
                          {formatPercentage(snapshot.total_loss_used)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SnapshotTab;