import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { affiliateManagerService } from '@/services/affiliateManagerService';
import { DollarSign } from 'lucide-react';

interface AffiliateManagerPayoutsProps {
  userId: string;
}

export const AffiliateManagerPayouts: React.FC<AffiliateManagerPayoutsProps> = ({ userId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['affiliate-manager-payouts', userId],
    queryFn: () => affiliateManagerService.getPayouts(userId),
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payouts ({data?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No payouts found
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((payout: any) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-bold">
                      ${parseFloat(payout.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payout.payment_method_label || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{payout.payment_type || ''}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(payout.status)}>
                        {payout.status}
                      </Badge>
                      {payout.is_manual && (
                        <Badge variant="outline" className="ml-1">Manual</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(payout.requested_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {payout.processed_at ? new Date(payout.processed_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{payout.transaction_id || '-'}</code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payout.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
