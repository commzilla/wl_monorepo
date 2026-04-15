import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { OpenTrade } from '@/lib/types/enrollmentReview';
import { TrendingUp, TrendingDown, Clock, DollarSign, X } from 'lucide-react';
import CloseTradesDialog from './CloseTradesDialog';

interface OpenPositionsTabProps {
  enrollmentId: string;
}

const OpenPositionsTab: React.FC<OpenPositionsTabProps> = ({ enrollmentId }) => {
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const {
    data: openTradesData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['open-trades', enrollmentId],
    queryFn: () => enrollmentReviewService.getOpenTrades(enrollmentId),
    enabled: !!enrollmentId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const formatTradeType = (cmd: number): string => {
    return cmd === 0 ? 'Buy' : 'Sell';
  };

  const getTradeTypeColor = (cmd: number): string => {
    return cmd === 0 ? 'text-green-600' : 'text-red-600';
  };

  const getTradeTypeIcon = (cmd: number) => {
    return cmd === 0 ? TrendingUp : TrendingDown;
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const getTotalProfit = (trades: OpenTrade[]): number => {
    return trades.reduce((total, trade) => total + trade.profit, 0);
  };

  const getTotalSwap = (trades: OpenTrade[]): number => {
    return trades.reduce((total, trade) => total + trade.swap, 0);
  };

  const getTotalCommission = (trades: OpenTrade[]): number => {
    return trades.reduce((total, trade) => total + trade.commission, 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            Failed to load open positions data
          </div>
        </CardContent>
      </Card>
    );
  }

  const openTrades = openTradesData?.open_trades || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Open Positions</p>
                <p className="text-2xl font-bold">{openTrades.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${getTotalProfit(openTrades) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(getTotalProfit(openTrades))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Swap</p>
                <p className={`text-xl font-semibold ${getTotalSwap(openTrades) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(getTotalSwap(openTrades))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Commission</p>
                <p className="text-xl font-semibold text-red-600">
                  {formatCurrency(getTotalCommission(openTrades))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Open Positions
              <Badge variant="secondary" className="ml-2">
                {openTrades.length} Active
              </Badge>
            </div>
            {openTrades.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowCloseDialog(true)}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Close All Trades
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No open positions found for this account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Open Price</TableHead>
                    <TableHead>Open Time</TableHead>
                    <TableHead>SL</TableHead>
                    <TableHead>TP</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Swap</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openTrades.map((trade) => {
                    const TradeIcon = getTradeTypeIcon(trade.cmd);
                    return (
                      <TableRow key={trade.order}>
                        <TableCell className="font-mono">{trade.order}</TableCell>
                        <TableCell className="font-semibold">{trade.symbol}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${getTradeTypeColor(trade.cmd)}`}>
                            <TradeIcon className="h-4 w-4" />
                            {formatTradeType(trade.cmd)}
                          </div>
                        </TableCell>
                        <TableCell>{parseFloat(String(trade.volume)).toFixed(2)}</TableCell>
                        <TableCell>{trade.open_price.toFixed(5)}</TableCell>
                        <TableCell className="text-sm">{formatDateTime(trade.open_time)}</TableCell>
                        <TableCell>{trade.sl ? trade.sl.toFixed(5) : '-'}</TableCell>
                        <TableCell>{trade.tp ? trade.tp.toFixed(5) : '-'}</TableCell>
                        <TableCell className={trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(trade.profit)}
                        </TableCell>
                        <TableCell className={trade.swap >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(trade.swap)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {formatCurrency(trade.commission)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={trade.comment}>
                          {trade.comment || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CloseTradesDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        enrollmentId={enrollmentId}
        tradesCount={openTrades.length}
      />
    </div>
  );
};

export default OpenPositionsTab;