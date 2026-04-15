import { useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Download,
  Copy,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { Account, Trade } from '@/lib/types/enrollmentReview';
import ResyncTradesDialog from './ResyncTradesDialog';

interface TradesTabProps {
  challenges: any[];
}

export default function TradesTab({ challenges }: TradesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [expandedChallenges, setExpandedChallenges] = useState<Set<string>>(new Set());
  const [resyncAccount, setResyncAccount] = useState<string | null>(null);

  // Extract enrollment IDs from challenges
  const enrollmentIds = challenges
    .map((c) => (c.enrollment || c).id)
    .filter(Boolean);

  // Fetch enrollment review data for each challenge
  const enrollmentQueries = useQueries({
    queries: enrollmentIds.map((id) => ({
      queryKey: ['enrollment-review-trades', id],
      queryFn: () => enrollmentReviewService.getEnrollmentReview(id),
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = enrollmentQueries.some((q) => q.isLoading);
  const allLoaded = enrollmentQueries.every((q) => !q.isLoading);

  const toggleChallenge = (id: string) => {
    setExpandedChallenges((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAccount = (id: string) => {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'completed': case 'passed': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'failed': case 'breached': case 'closed': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'inactive': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatPhaseType = (type?: string | null, accountStatus?: string) => {
    // Try phase_type first, then fall back to account status
    const raw = type || accountStatus || '';
    if (!raw) return 'Unknown Phase';
    return String(raw)
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatTradeType = (cmd: number) => {
    const isBuy = cmd === 0;
    const Icon = isBuy ? TrendingUp : TrendingDown;
    const colorClass = isBuy ? 'text-green-600' : 'text-red-600';
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <Icon className="h-4 w-4" />
        {isBuy ? 'Buy' : 'Sell'}
      </div>
    );
  };

  const formatRRR = (trade: Trade) => {
    if (trade.rrr !== undefined && trade.rrr !== null) {
      const rrrValue = Math.abs(trade.rrr);
      const colorClass = trade.rrr >= 0 ? 'text-emerald-600' : 'text-destructive';
      return (
        <span className={`font-medium ${colorClass}`}>
          {trade.rrr >= 0 ? '' : '-'}1:{rrrValue.toFixed(2)}
        </span>
      );
    }
    return '-';
  };

  const handleExport = (account: Account) => {
    if (account.trades.length === 0) {
      toast({ title: 'No trades to export', variant: 'destructive' });
      return;
    }
    const headers = ['Order', 'Symbol', 'Type', 'Volume', 'Open Price', 'Close Price', 'SL', 'TP', 'RRR', 'Open Time', 'Close Time', 'Profit', 'Commission'];
    const rows = account.trades.map((t) => [
      t.order, t.symbol, t.cmd === 0 ? 'Buy' : 'Sell', t.volume,
      t.open_price.toFixed(5), t.close_price.toFixed(5),
      t.sl != null ? t.sl.toFixed(5) : '-', t.tp != null ? t.tp.toFixed(5) : '-',
      t.rrr != null ? `${t.rrr >= 0 ? '' : '-'}1:${Math.abs(t.rrr).toFixed(2)}` : '-',
      new Date(t.open_time).toLocaleString(), new Date(t.close_time).toLocaleString(),
      t.profit.toFixed(2), t.commission.toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_${account.mt5_account_id}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Exported successfully' });
  };

  const handleCopy = (account: Account) => {
    if (account.trades.length === 0) {
      toast({ title: 'No trades to copy', variant: 'destructive' });
      return;
    }
    const headers = ['Order', 'Symbol', 'Type', 'Volume', 'Open Price', 'Close Price', 'SL', 'TP', 'RRR', 'Open Time', 'Close Time', 'Profit', 'Commission'].join('\t');
    const rows = account.trades.map((t) => [
      t.order, t.symbol, t.cmd === 0 ? 'Buy' : 'Sell', t.volume,
      t.open_price.toFixed(5), t.close_price.toFixed(5),
      t.sl != null ? t.sl.toFixed(5) : '-', t.tp != null ? t.tp.toFixed(5) : '-',
      t.rrr != null ? `${t.rrr >= 0 ? '' : '-'}1:${Math.abs(t.rrr).toFixed(2)}` : '-',
      new Date(t.open_time).toLocaleString(), new Date(t.close_time).toLocaleString(),
      t.profit.toFixed(2), t.commission.toFixed(2),
    ].join('\t')).join('\n');
    navigator.clipboard.writeText(`${headers}\n${rows}`).then(() => {
      toast({ title: 'Copied to clipboard' });
    });
  };

  // Total trades count across all loaded enrollments
  const totalTrades = enrollmentQueries.reduce((total, q) => {
    if (q.data?.accounts) {
      return total + q.data.accounts.reduce((sum, acc) => sum + acc.trades.length, 0);
    }
    return total;
  }, 0);

  if (challenges.length === 0) {
    return (
      <div className="text-center py-16">
        <TrendingUp className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No trading data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm text-muted-foreground">{challenges.length} challenges</span>
        {allLoaded && (
          <Badge variant="secondary" className="text-xs">{totalTrades} total trades</Badge>
        )}
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading accounts...
          </div>
        )}
      </div>

      {/* Challenge Groups */}
      {challenges.map((challenge, index) => {
        const enrollment = challenge.enrollment || challenge;
        const enrollmentId = enrollment.id;
        const queryIndex = enrollmentIds.indexOf(enrollmentId);
        const query = queryIndex >= 0 ? enrollmentQueries[queryIndex] : null;
        const accounts = query?.data?.accounts || [];
        const challengeName = enrollment.challenge_name || enrollment.product_name || 'Challenge';
        const status = enrollment.status || 'Unknown';
        const accountSize = enrollment.account_size;
        const currency = enrollment.currency || 'USD';
        const isChallengeExpanded = expandedChallenges.has(enrollmentId || String(index));
        const challengeTotalTrades = accounts.reduce((sum, acc) => sum + acc.trades.length, 0);

        return (
          <div key={enrollmentId || index} className="rounded-xl border border-border/60 bg-card overflow-hidden">
            {/* Challenge Header */}
            <button
              onClick={() => toggleChallenge(enrollmentId || String(index))}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {isChallengeExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{challengeName}</span>
                    {accountSize && (
                      <span className="text-xs text-muted-foreground">
                        ${Number(accountSize).toLocaleString()} {currency}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                    {challengeTotalTrades > 0 && ` · ${challengeTotalTrades} trades`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {query?.isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                <Badge className={`text-[11px] capitalize border ${getStatusColor(status)}`} variant="outline">
                  {status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </button>

            {/* Accounts under this challenge */}
            {isChallengeExpanded && (
              <div className="border-t border-border/40">
                {query?.isLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading accounts & trades...
                  </div>
                ) : query?.isError ? (
                  <div className="text-center py-8 text-sm text-destructive">
                    Failed to load account data
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No accounts found
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {accounts.map((account) => {
                      const isAccountExpanded = expandedAccounts.has(account.id);

                      return (
                        <div key={account.id}>
                          {/* Account Header */}
                          <button
                            onClick={() => toggleAccount(account.id)}
                            className="w-full flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              {isAccountExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                  {formatPhaseType(account.phase_type, account.status)}
                                </span>
                                <span className="font-mono text-xs">{account.mt5_account_id}</span>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">
                                {account.trades.length} trades
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {account.balance !== undefined && account.balance !== null && (
                                <span className="text-sm font-medium">${account.balance.toLocaleString()}</span>
                              )}
                              <Badge className={`text-[10px] capitalize border ${getStatusColor(account.status)}`} variant="outline">
                                {account.status}
                              </Badge>
                              {account.mt5_account_id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setResyncAccount(account.mt5_account_id);
                                  }}
                                  title="Resync trades from MT5"
                                >
                                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                          </button>

                          {/* Trades Table */}
                          {isAccountExpanded && (
                            <div className="px-6 pb-4">
                              {account.trades.length > 0 && (
                                <div className="flex justify-end gap-2 mb-3">
                                  <Button variant="outline" size="sm" onClick={() => handleCopy(account)}>
                                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                                    Copy
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleExport(account)}>
                                    <Download className="h-3.5 w-3.5 mr-1.5" />
                                    Export CSV
                                  </Button>
                                </div>
                              )}

                              {account.trades.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-border/40">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Symbol</TableHead>
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
                                      {account.trades.map((trade, i) => (
                                        <TableRow key={`${trade.order}-${i}`}>
                                          <TableCell className="font-mono text-xs">{trade.order}</TableCell>
                                          <TableCell className="font-medium">{trade.symbol}</TableCell>
                                          <TableCell>{formatTradeType(trade.cmd)}</TableCell>
                                          <TableCell>{trade.volume}</TableCell>
                                          <TableCell>${trade.open_price.toFixed(5)}</TableCell>
                                          <TableCell>${trade.close_price.toFixed(5)}</TableCell>
                                          <TableCell>{trade.sl != null ? `$${trade.sl.toFixed(5)}` : '-'}</TableCell>
                                          <TableCell>{trade.tp != null ? `$${trade.tp.toFixed(5)}` : '-'}</TableCell>
                                          <TableCell>{formatRRR(trade)}</TableCell>
                                          <TableCell className="text-xs">{new Date(trade.open_time).toLocaleString()}</TableCell>
                                          <TableCell className="text-xs">{new Date(trade.close_time).toLocaleString()}</TableCell>
                                          <TableCell>
                                            <div className={`flex items-center gap-1 ${trade.profit >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                                              {trade.profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                              ${trade.profit.toFixed(2)}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-destructive">${trade.commission.toFixed(2)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-6">No trades for this account</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Resync Dialog */}
      {resyncAccount && (
        <ResyncTradesDialog
          open={!!resyncAccount}
          onOpenChange={(open) => !open && setResyncAccount(null)}
          mt5AccountId={resyncAccount}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['enrollment-review-trades'] });
          }}
        />
      )}
    </div>
  );
}
