import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { affiliateManagerService } from '@/services/affiliateManagerService';
import { useToast } from '@/hooks/use-toast';
import { Wallet, TrendingUp, TrendingDown, History } from 'lucide-react';

interface AffiliateManagerWalletProps {
  userId: string;
}

export const AffiliateManagerWallet: React.FC<AffiliateManagerWalletProps> = ({ userId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['affiliate-manager-wallet', userId],
    queryFn: () => affiliateManagerService.getWallet(userId),
  });

  const adjustMutation = useMutation({
    mutationFn: () => affiliateManagerService.adjustWallet(userId, parseFloat(adjustAmount), adjustNote),
    onSuccess: (response) => {
      toast({
        title: 'Success',
        description: response.detail,
      });
      setAdjustAmount('');
      setAdjustNote('');
      queryClient.invalidateQueries({ queryKey: ['affiliate-manager-wallet', userId] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-manager-overview', userId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to adjust wallet',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!data) return null;

  const handleAdjust = () => {
    if (!adjustAmount || parseFloat(adjustAmount) === 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }
    adjustMutation.mutate();
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes('earn') || type.includes('commission')) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Wallet Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Current Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">${parseFloat(data.wallet.balance).toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {new Date(data.wallet.last_updated).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">${parseFloat(data.wallet.total_earned).toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-2">
              All-time earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Adjust Wallet */}
      <Card>
        <CardHeader>
          <CardTitle>Adjust Wallet Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (use negative for deduction)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Example: 100 to add, -50 to deduct
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Reason for adjustment"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <Button
            onClick={handleAdjust}
            disabled={adjustMutation.isPending}
          >
            {adjustMutation.isPending ? 'Processing...' : 'Apply Adjustment'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data.recent_transactions || data.recent_transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent_transactions.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(tx.transaction_type)}
                          <span className="text-sm">{tx.transaction_type_display}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">
                        <span className={parseFloat(tx.amount) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {parseFloat(tx.amount) >= 0 ? '+' : ''}${parseFloat(tx.amount).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'approved' ? 'default' : 'secondary'}>
                          {tx.status_display}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.note || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(tx.created_at).toLocaleString()}
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
