import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { payoutHistoryService } from '@/services/payoutHistoryService';
import { DollarSign, Calendar, CreditCard, AlertCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import ManualPayoutDialog from './ManualPayoutDialog';

interface PayoutHistoryTabProps {
  enrollmentId: string;
}

const PayoutHistoryTab: React.FC<PayoutHistoryTabProps> = ({ enrollmentId }) => {
  const [isManualPayoutOpen, setIsManualPayoutOpen] = useState(false);
  
  const {
    data: payoutHistory,
    isLoading,
    error
  } = useQuery({
    queryKey: ['payout-history', enrollmentId],
    queryFn: () => payoutHistoryService.getPayoutHistory(enrollmentId),
    retry: false
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'paid':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'paypal':
        return <CreditCard className="h-4 w-4" />;
      case 'bank':
        return <DollarSign className="h-4 w-4" />;
      case 'crypto':
        return <DollarSign className="h-4 w-4" />;
      case 'rise':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Failed to load payout history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Payout History</h2>
        </div>
        <Button onClick={() => setIsManualPayoutOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Manual Payout
        </Button>
      </div>

      {payoutHistory && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Challenge:</span>
                <span className="text-sm font-medium">{payoutHistory.challenge_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Client:</span>
                <span className="text-sm font-medium">{payoutHistory.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Payouts:</span>
                <span className="text-sm font-medium">{payoutHistory.payouts.length}</span>
              </div>
            </CardContent>
          </Card>

          {payoutHistory.payouts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No payout history found for this enrollment</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Payout Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requested/Reviewed</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Share %</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Released</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutHistory.payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div>
                            <div className="text-sm">
                              {format(new Date(payout.requested_at), 'MMM dd, yyyy HH:mm')}
                            </div>
                            {payout.reviewed_at && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Reviewed: {format(new Date(payout.reviewed_at), 'MMM dd, yyyy HH:mm')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMethodIcon(payout.method)}
                            <span className="text-sm capitalize">{payout.method}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            ${payout.profit.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{payout.profit_share}%</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            ${payout.net_profit.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-semibold">
                            ${payout.released_fund.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(payout.status)}>
                            {payout.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ManualPayoutDialog
        open={isManualPayoutOpen}
        onOpenChange={setIsManualPayoutOpen}
        enrollmentId={enrollmentId}
      />
    </div>
  );
};

export default PayoutHistoryTab;