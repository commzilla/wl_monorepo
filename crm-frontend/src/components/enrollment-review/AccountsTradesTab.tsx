import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Account } from '@/lib/types/enrollmentReview';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Download, Copy, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { payoutHistoryService } from '@/services/payoutHistoryService';

interface AccountsTradesTabProps {
  accounts: Account[];
  enrollmentId: string;
  latestBreach?: {
    rule: string;
    reason: string;
    previous_state: any;
    breached_at: string;
  };
}

const AccountsTradesTab: React.FC<AccountsTradesTabProps> = ({ accounts, enrollmentId, latestBreach }) => {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Fetch payout history
  const { data: payoutHistory } = useQuery({
    queryKey: ['payout-history', enrollmentId],
    queryFn: () => payoutHistoryService.getPayoutHistory(enrollmentId),
    enabled: !!enrollmentId,
  });

  const toggleAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'inactive': return 'bg-muted';
      case 'closed': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const formatPhaseType = (type?: string | null, status?: string) => {
    // If status is failed and we have breach data with previous_state, show both
    if (status === 'failed' && latestBreach?.previous_state?.status) {
      const prevStatus = latestBreach.previous_state.status;
      const formattedPrevStatus = prevStatus.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      return `${formattedPrevStatus} - Failed`;
    }
    
    if (!type) {
      return status === 'failed' ? 'Failed' : 'Unknown Phase';
    }
    return String(type).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatTradeType = (cmd: number) => {
    const isBuy = cmd === 0;
    const TradeIcon = isBuy ? TrendingUp : TrendingDown;
    const colorClass = isBuy ? 'text-green-600' : 'text-red-600';
    const text = isBuy ? 'Buy' : 'Sell';
    
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <TradeIcon className="h-4 w-4" />
        {text}
      </div>
    );
  };

  const formatRRR = (trade: any) => {
    // Check if RRR is provided by the API
    if (trade.rrr !== undefined && trade.rrr !== null) {
      const rrrValue = Math.abs(trade.rrr);
      const colorClass = trade.rrr >= 0 ? 'text-success' : 'text-destructive';
      
      return (
        <span className={`font-medium ${colorClass}`}>
          {trade.rrr >= 0 ? '' : '-'}1:{rrrValue.toFixed(2)}
        </span>
      );
    }
    
    return '-';
  };

  const handleExportTradeHistory = (account: Account) => {
    if (account.trades.length === 0) {
      toast({
        title: "No trades to export",
        description: "This account has no trading history.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      'Order',
      'Symbol',
      'Type',
      'Volume',
      'Open Price',
      'Close Price',
      'SL',
      'TP',
      'RRR',
      'Open Time',
      'Close Time',
      'Profit',
      'Commission'
    ];

    const rows = account.trades.map(trade => [
      trade.order,
      trade.symbol,
      trade.cmd === 0 ? 'Buy' : 'Sell',
      trade.volume,
      trade.open_price.toFixed(5),
      trade.close_price.toFixed(5),
      trade.sl != null ? trade.sl.toFixed(5) : '-',
      trade.tp != null ? trade.tp.toFixed(5) : '-',
      trade.rrr !== undefined && trade.rrr !== null ? `${trade.rrr >= 0 ? '' : '-'}1:${Math.abs(trade.rrr).toFixed(2)}` : '-',
      new Date(trade.open_time).toLocaleString(),
      new Date(trade.close_time).toLocaleString(),
      trade.profit.toFixed(2),
      trade.commission.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade_history_${account.mt5_account_id}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Trade history has been exported to CSV.",
    });
  };

  const handleCopyTradeHistory = (account: Account) => {
    if (account.trades.length === 0) {
      toast({
        title: "No trades to copy",
        description: "This account has no trading history.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      'Order',
      'Symbol',
      'Type',
      'Volume',
      'Open Price',
      'Close Price',
      'SL',
      'TP',
      'RRR',
      'Open Time',
      'Close Time',
      'Profit',
      'Commission'
    ].join('\t');

    const rows = account.trades.map(trade => [
      trade.order,
      trade.symbol,
      trade.cmd === 0 ? 'Buy' : 'Sell',
      trade.volume,
      trade.open_price.toFixed(5),
      trade.close_price.toFixed(5),
      trade.sl != null ? trade.sl.toFixed(5) : '-',
      trade.tp != null ? trade.tp.toFixed(5) : '-',
      trade.rrr !== undefined && trade.rrr !== null ? `${trade.rrr >= 0 ? '' : '-'}1:${Math.abs(trade.rrr).toFixed(2)}` : '-',
      new Date(trade.open_time).toLocaleString(),
      new Date(trade.close_time).toLocaleString(),
      trade.profit.toFixed(2),
      trade.commission.toFixed(2)
    ].join('\t')).join('\n');

    const textContent = `${headers}\n${rows}`;

    navigator.clipboard.writeText(textContent).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Trade history has been copied to your clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Failed to copy",
        description: "Could not copy trade history to clipboard.",
        variant: "destructive",
      });
    });
  };

  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No accounts data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Accounts Overview with Accordion */}
      {accounts.map((account) => (
        <Card key={account.id} className="overflow-hidden">
          <CardHeader 
            className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleAccount(account.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {expandedAccounts.has(account.id) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <CardTitle className="text-sm font-medium">
                  {formatPhaseType(account.phase_type, account.status)}
                </CardTitle>
              </div>
              <Badge className={getAccountStatusColor(account.status)}>
                {account.status}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Account Summary Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">MT5 Account</p>
                  <p className="font-mono text-sm">{account.mt5_account_id}</p>
                </div>
                
                {account.balance && (
                  <div>
                    <p className="text-xs text-muted-foreground">Current Balance</p>
                    <p className="text-lg font-bold">${account.balance.toLocaleString()}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-xs text-muted-foreground">Total Trades</p>
                  <p className="text-sm font-medium">{account.trades.length}</p>
                </div>
              </div>

              {/* Expandable Trading History */}
              {expandedAccounts.has(account.id) && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      <h4 className="font-medium">Trading History</h4>
                      {payoutHistory && payoutHistory.payouts.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {payoutHistory.payouts.length} {payoutHistory.payouts.length === 1 ? 'Payout' : 'Payouts'}
                        </Badge>
                      )}
                    </div>
                    {account.trades.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyTradeHistory(account)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportTradeHistory(account)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {(() => {
                    // Merge trades and payouts into a single timeline
                    const timeline: Array<{ type: 'trade' | 'payout'; data: any; timestamp: Date }> = [];
                    
                    // Add trades
                    account.trades.forEach((trade) => {
                      timeline.push({
                        type: 'trade',
                        data: trade,
                        timestamp: new Date(trade.close_time)
                      });
                    });
                    
                    // Add payouts if available
                    if (payoutHistory?.payouts) {
                      payoutHistory.payouts.forEach((payout) => {
                        timeline.push({
                          type: 'payout',
                          data: payout,
                          timestamp: new Date(payout.requested_at)
                        });
                      });
                    }
                    
                    // Sort by timestamp descending (most recent first)
                    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                    
                    return timeline.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order/Type</TableHead>
                              <TableHead>Symbol/Method</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Volume</TableHead>
                              <TableHead>Open Price</TableHead>
                              <TableHead>Close Price</TableHead>
                              <TableHead>SL</TableHead>
                              <TableHead>TP</TableHead>
                              <TableHead>RRR</TableHead>
                              <TableHead>Open Time</TableHead>
                              <TableHead>Close Time</TableHead>
                              <TableHead>Profit</TableHead>
                              <TableHead>Commission</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {timeline.map((item, index) => {
                              if (item.type === 'payout') {
                                const payout = item.data;
                                return (
                                  <TableRow key={`payout-${index}`} className="bg-primary/5 hover:bg-primary/10">
                                    <TableCell colSpan={13} className="py-3">
                                      <div className="flex items-center gap-4 flex-wrap">
                                        <div className="flex items-center gap-2">
                                          <Wallet className="h-4 w-4 text-primary" />
                                          <span className="font-semibold text-primary">PAYOUT REQUEST</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          <span className="text-muted-foreground">Requested:</span>
                                          <span className="font-medium">{new Date(payout.requested_at).toLocaleString()}</span>
                                        </div>
                                        {payout.reviewed_at && (
                                          <div className="flex items-center gap-1 text-xs">
                                            <span className="text-muted-foreground">Reviewed:</span>
                                            <span className="font-medium">{new Date(payout.reviewed_at).toLocaleString()}</span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-1 text-xs">
                                          <span className="text-muted-foreground">Method:</span>
                                          <Badge variant="outline" className="capitalize text-xs">
                                            {payout.method}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          <span className="text-muted-foreground">Profit:</span>
                                          <span className="font-mono font-medium">${Number(payout.profit).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          <span className="text-muted-foreground">Share:</span>
                                          <span className="font-medium">{Number(payout.profit_share).toFixed(0)}%</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          <span className="text-muted-foreground">Net:</span>
                                          <span className="font-semibold">${Number(payout.net_profit).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                          <span className="text-muted-foreground">Released:</span>
                                          <span className={`font-medium ${
                                            Number(payout.released_fund) > 0 ? 'text-success' : 'text-muted-foreground'
                                          }`}>
                                            ${Number(payout.released_fund).toFixed(2)}
                                          </span>
                                        </div>
                                        <Badge 
                                          variant={
                                            payout.status === 'paid' ? 'default' : 
                                            payout.status === 'approved' ? 'secondary' : 
                                            payout.status === 'pending' ? 'warning' : 
                                            'destructive'
                                          }
                                          className="capitalize"
                                        >
                                          {payout.status}
                                        </Badge>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              } else {
                                const trade = item.data;
                                return (
                                  <TableRow key={`trade-${index}`}>
                                    <TableCell className="font-mono text-xs">{trade.order}</TableCell>
                                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                                    <TableCell>
                                      {formatTradeType(trade.cmd)}
                                    </TableCell>
                                    <TableCell>{trade.volume}</TableCell>
                                    <TableCell>${trade.open_price.toFixed(5)}</TableCell>
                                    <TableCell>${trade.close_price.toFixed(5)}</TableCell>
                                    <TableCell>
                                      {trade.sl != null ? `$${trade.sl.toFixed(5)}` : '-'}
                                    </TableCell>
                                    <TableCell>
                                      {trade.tp != null ? `$${trade.tp.toFixed(5)}` : '-'}
                                    </TableCell>
                                    <TableCell>
                                      {formatRRR(trade)}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {new Date(trade.open_time).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {new Date(trade.close_time).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                      <div className={`flex items-center gap-1 ${
                                        trade.profit >= 0 ? 'text-success' : 'text-destructive'
                                      }`}>
                                        {trade.profit >= 0 ? (
                                          <TrendingUp className="h-3 w-3" />
                                        ) : (
                                          <TrendingDown className="h-3 w-3" />
                                        )}
                                        ${trade.profit.toFixed(2)}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-destructive">
                                      ${trade.commission.toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                );
                              }
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No trading history or payouts found for this account</p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AccountsTradesTab;