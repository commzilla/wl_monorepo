import React from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HardBreach } from '@/lib/types/djangoRisk';

interface HardBreachEvidenceDialogProps {
  breach: HardBreach | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const parseAmount = (value: string | number | null | undefined): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);

const formatDateTimeSafe = (value?: string | null): string => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return format(date, 'MMM dd, yyyy HH:mm:ss');
};

const getRuleDisplayName = (rule: string): string => {
  const ruleMap: Record<string, string> = {
    max_daily_loss: 'Max Daily Loss',
    max_total_loss: 'Max Total Loss',
    consistency_rule: 'Consistency Rule',
    minimum_trading_days: 'Minimum Trading Days',
  };
  return ruleMap[rule] || rule.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

export const HardBreachEvidenceDialog: React.FC<HardBreachEvidenceDialogProps> = ({
  breach,
  open,
  onOpenChange,
}) => {
  if (!breach || !breach.evidence) return null;

  const evidence = breach.evidence;
  const positions = evidence.positions || [];

  const startBalance = parseAmount(evidence.start_balance);
  const threshold = parseAmount(evidence.threshold);
  const lossLimit = parseAmount(evidence.max_loss_amount);
  const maxLossPercent = parseAmount(evidence.max_loss_percent);
  const currentEquity = parseAmount(evidence.equity);
  const currentBalance = parseAmount(evidence.balance);
  const currentMargin = parseAmount(evidence.margin);
  const currentFreeMargin = parseAmount(evidence.free_margin);
  const exceededBy =
    currentEquity !== undefined && threshold !== undefined ? threshold - currentEquity : undefined;
  const evidenceAccountId = evidence.account_id ?? breach.account_id ?? null;
  const evidenceCreatedAt = evidence.created_at || evidence.captured_at || breach.breached_at || null;
  const actorLabel = breach.user_name?.trim() || (evidenceAccountId ? `Account ${evidenceAccountId}` : 'Breach Record');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader className="space-y-4 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Hard Breach Evidence</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {actorLabel}
                  {breach.user_name && evidenceAccountId ? ` - Account ${evidenceAccountId}` : ''}
                </p>
              </div>
            </div>
            <Badge variant="destructive" className="text-sm px-3 py-1 mr-8">
              {getRuleDisplayName(breach.rule)}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2">
              <div className="text-muted-foreground">Evidence Account</div>
              <div className="font-mono font-medium">{evidenceAccountId ?? 'N/A'}</div>
            </div>
            <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2">
              <div className="text-muted-foreground flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                Captured At
              </div>
              <div className="font-medium">{formatDateTimeSafe(evidence.captured_at)}</div>
            </div>
            <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2">
              <div className="text-muted-foreground">Broker Time</div>
              <div className="font-medium">{formatDateTimeSafe(evidence.broker_time)}</div>
            </div>
            <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2">
              <div className="text-muted-foreground">Open Positions</div>
              <div className="font-medium">{evidence.positions_count ?? positions.length}</div>
            </div>
            <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2">
              <div className="text-muted-foreground">Evidence Created</div>
              <div className="font-medium">{formatDateTimeSafe(evidenceCreatedAt)}</div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div className="bg-muted/30 rounded-lg border border-border/50 overflow-hidden">
            <div className="px-4 py-3 bg-muted/50 border-b border-border/50">
              <h3 className="font-semibold text-sm text-foreground">Account Overview</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-muted-foreground font-medium">Metric</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {startBalance !== undefined && (
                  <TableRow className="border-border/50">
                    <TableCell className="text-sm">Daily Start Balance</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(startBalance)}</TableCell>
                  </TableRow>
                )}
                {lossLimit !== undefined && (
                  <TableRow className="border-border/50">
                    <TableCell className="text-sm">
                      Allowed Max Drop {maxLossPercent !== undefined && `(${maxLossPercent}%)`}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-destructive">
                      -{formatCurrency(lossLimit)}
                    </TableCell>
                  </TableRow>
                )}
                {threshold !== undefined && (
                  <TableRow className="border-border/50">
                    <TableCell className="text-sm">Daily Loss Threshold</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(threshold)}</TableCell>
                  </TableRow>
                )}
                {currentEquity !== undefined && (
                  <TableRow className="border-border/50">
                    <TableCell className="text-sm">Current Equity</TableCell>
                    <TableCell className="text-right font-mono text-sm text-destructive font-semibold">
                      {formatCurrency(currentEquity)}
                    </TableCell>
                  </TableRow>
                )}
                {currentBalance !== undefined && (
                  <TableRow className="border-border/50">
                    <TableCell className="text-sm">Current Balance</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(currentBalance)}</TableCell>
                  </TableRow>
                )}
                {currentMargin !== undefined && (
                  <TableRow className="border-border/50">
                    <TableCell className="text-sm">Current Margin</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(currentMargin)}</TableCell>
                  </TableRow>
                )}
                {currentFreeMargin !== undefined && (
                  <TableRow className="border-border/50">
                    <TableCell className="text-sm">Current Free Margin</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(currentFreeMargin)}</TableCell>
                  </TableRow>
                )}
                {exceededBy !== undefined && (
                  <TableRow className="border-border/50 bg-destructive/5">
                    <TableCell className="text-sm font-semibold">Exceeded By</TableCell>
                    <TableCell className="text-right font-mono text-sm text-destructive font-bold">
                      {formatCurrency(exceededBy)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {positions.length > 0 && (
            <div className="bg-muted/20 rounded-lg border border-border/50 overflow-hidden">
              <div className="px-4 py-3 bg-muted/40 border-b border-border/50">
                <h3 className="font-semibold text-sm text-foreground">Open Positions at Breach</h3>
              </div>
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead>Ticket</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((position) => (
                      <TableRow key={position.id} className="border-border/50">
                        <TableCell className="font-mono text-xs">{position.ticket}</TableCell>
                        <TableCell className="text-sm font-medium">{position.symbol}</TableCell>
                        <TableCell className="text-xs uppercase">{position.side}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{position.volume}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{position.open_price || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{position.current_price || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{position.profit || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {evidence.equity_payload && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Raw Equity Payload</h3>
              <pre className="text-xs bg-muted/20 border border-border/50 rounded-lg p-4 overflow-auto max-h-[220px]">
                {JSON.stringify(evidence.equity_payload, null, 2)}
              </pre>
            </div>
          )}

          {evidence.positions_payload && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Raw Positions Payload</h3>
              <pre className="text-xs bg-muted/20 border border-border/50 rounded-lg p-4 overflow-auto max-h-[220px]">
                {JSON.stringify(evidence.positions_payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
