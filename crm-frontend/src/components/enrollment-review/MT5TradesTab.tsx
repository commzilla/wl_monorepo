import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { Account } from '@/lib/types/enrollmentReview';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { ResyncTradesDialog } from './ResyncTradesDialog';

interface MT5TradesTabProps {
  accounts: Account[];
}

const MT5TradesTab: React.FC<MT5TradesTabProps> = ({ accounts }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts.find(acc => acc.status.includes('in_progress'))?.mt5_account_id || accounts[0]?.mt5_account_id || ''
  );
  const [method, setMethod] = useState<'equity' | 'mt5-api'>('equity');
  const [resyncDialogOpen, setResyncDialogOpen] = useState(false);

  const { data: trades, isLoading, refetch } = useQuery({
    queryKey: ['mt5-trades', selectedAccountId, method],
    queryFn: () => enrollmentReviewService.getMT5Trades(selectedAccountId, method),
    enabled: !!selectedAccountId,
  });

  const getPhaseDisplay = (phaseType: string) => {
    const phaseMap: Record<string, string> = {
      'phase-1': 'Phase 1',
      'phase-1-passed': 'Phase 1 (Passed)',
      'phase-2': 'Phase 2',
      'phase-2-passed': 'Phase 2 (Passed)',
      'live-trader': 'Live',
      'live_in_progress': 'Live (In Progress)',
      'archived': 'Archived'
    };
    return phaseMap[phaseType] || phaseType;
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return dateString;
    }
  };

  const getCmdDisplay = (cmd: number) => {
    return cmd === 0 ? 'BUY' : 'SELL';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalTrades = trades?.length || 0;
  const syncedCount = trades?.filter(t => t.sync_status === 'synced').length || 0;
  const unsyncedCount = trades?.filter(t => t.sync_status === 'not_synced').length || 0;

  const selectedAccount = accounts.find(acc => acc.mt5_account_id === selectedAccountId);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>MT5 Sync Status</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResyncDialogOpen(true)}
              disabled={!selectedAccountId}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Resync Trades
            </Button>
          </div>
          <CardDescription className="space-y-3">
          <div>All trades for selected MT5 account (showing synced and live trades)</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Select Account:</span>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-[300px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.mt5_account_id}>
                    {account.mt5_account_id} - {getPhaseDisplay(account.phase_type)} ({account.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Method:</span>
            <RadioGroup value={method} onValueChange={(value) => setMethod(value as 'equity' | 'mt5-api')} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="equity" id="equity" />
                <Label htmlFor="equity" className="cursor-pointer">Equity Controller</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mt5-api" id="mt5-api" />
                <Label htmlFor="mt5-api" className="cursor-pointer">MT5 JSON API (Closed Trades Only)</Label>
              </div>
            </RadioGroup>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{totalTrades}</div>
                <div className="text-sm text-muted-foreground">Total Trades</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{syncedCount}</div>
                <div className="text-sm text-muted-foreground">Synced Trades</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{unsyncedCount}</div>
                <div className="text-sm text-muted-foreground">Unsynced Trades</div>
              </div>
            </CardContent>
          </Card>
        </div>
        {!trades || trades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No trades found for this account
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Open Time</TableHead>
                  <TableHead>Open Price</TableHead>
                  <TableHead>Close Time</TableHead>
                  <TableHead>Close Price</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sync Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => (
                  <TableRow key={trade.order}>
                    <TableCell className="font-mono text-sm">{trade.order}</TableCell>
                    <TableCell className="font-semibold">{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={trade.cmd === 0 ? 'default' : 'secondary'}>
                        {getCmdDisplay(trade.cmd)}
                      </Badge>
                    </TableCell>
                    <TableCell>{trade.volume}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(trade.open_time)}</TableCell>
                    <TableCell className="font-mono text-sm">{trade.open_price}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(trade.close_time)}</TableCell>
                    <TableCell className="font-mono text-sm">{trade.close_price}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 font-semibold ${
                        parseFloat(trade.profit) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {parseFloat(trade.profit) >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        ${parseFloat(trade.profit).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">${parseFloat(trade.commission).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={trade.close_time ? 'outline' : 'default'}>
                        {trade.close_time ? 'Closed' : 'Open'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={trade.sync_status === 'synced' ? 'default' : 'secondary'}>
                        {trade.sync_status === 'synced' ? 'Synced' : 'Not Synced'}
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

    <ResyncTradesDialog
      open={resyncDialogOpen}
      onOpenChange={setResyncDialogOpen}
      mt5AccountId={selectedAccountId}
      onSuccess={() => refetch()}
    />
    </>
  );
};

export default MT5TradesTab;
