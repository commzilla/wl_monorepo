import React from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { HardBreach } from '@/lib/types/djangoRisk';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface HardBreachDetailsDialogProps {
  breach: HardBreach | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedBreachData {
  dailyStartBalance?: number;
  dailyLossLimit?: number;
  dailyLossThreshold?: number;
  currentEquity?: number;
  exceededBy?: number;
  lossPercentage?: number;
}

const parseBreachReason = (reason: string): ParsedBreachData => {
  const data: ParsedBreachData = {};

  const balanceMatch = reason.match(/Start Balance[:\s]+\$?([\d,]+\.?\d*)/i);
  if (balanceMatch) data.dailyStartBalance = parseFloat(balanceMatch[1].replace(/,/g, ''));

  const equityMatch = reason.match(/(?:Current )?Equity[:\s]+\$?([\d,]+\.?\d*)/i);
  if (equityMatch) data.currentEquity = parseFloat(equityMatch[1].replace(/,/g, ''));

  const thresholdMatch = reason.match(/[Tt]hreshold[:\s]+\$?([\d,]+\.?\d*)/i);
  if (thresholdMatch) data.dailyLossThreshold = parseFloat(thresholdMatch[1].replace(/,/g, ''));

  const maxLossMatch = reason.match(/(?:Max Loss|Allowed Max Drop)\s*\(?([\d.]+)%\)?/i);
  if (maxLossMatch) data.lossPercentage = parseFloat(maxLossMatch[1]);

  const maxDropAmountMatch = reason.match(/Allowed Max Drop\s*\([\d.]+%\):\s*-?\$?([\d,]+\.?\d*)/i);
  if (maxDropAmountMatch) {
    data.dailyLossLimit = Math.abs(parseFloat(maxDropAmountMatch[1].replace(/,/g, '')));
  }

  if (!data.dailyLossLimit && data.dailyStartBalance && data.lossPercentage) {
    data.dailyLossLimit = (data.dailyStartBalance * data.lossPercentage) / 100;
  }

  return data;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
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

export const HardBreachDetailsDialog: React.FC<HardBreachDetailsDialogProps> = ({
  breach,
  open,
  onOpenChange,
}) => {
  if (!breach) return null;
  
  const parsedData = parseBreachReason(breach.reason);

  if (parsedData.currentEquity !== undefined && parsedData.dailyLossThreshold !== undefined) {
    parsedData.exceededBy = parsedData.dailyLossThreshold - parsedData.currentEquity;
  }
  const hasMetrics = Object.keys(parsedData).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] bg-card border-border">
        <DialogHeader className="space-y-4 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Hard Breach Summary</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {breach.user_name} {breach.account_id ? `- Account ${breach.account_id}` : ''}
                </p>
              </div>
            </div>
            <Badge variant="destructive" className="text-sm px-3 py-1 mr-8">
              {getRuleDisplayName(breach.rule)}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Breach Date:</span>{' '}
            {format(new Date(breach.breached_at), 'MMM dd, yyyy HH:mm:ss')}
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {hasMetrics && (
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
                  {parsedData.dailyStartBalance !== undefined && (
                    <TableRow className="border-border/50">
                      <TableCell className="text-sm">Daily Start Balance</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(parsedData.dailyStartBalance)}</TableCell>
                    </TableRow>
                  )}
                  {parsedData.dailyLossLimit !== undefined && (
                    <TableRow className="border-border/50">
                      <TableCell className="text-sm">
                        Allowed Max Drop {parsedData.lossPercentage !== undefined && `(${parsedData.lossPercentage}%)`}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-destructive">
                        -{formatCurrency(parsedData.dailyLossLimit)}
                      </TableCell>
                    </TableRow>
                  )}
                  {parsedData.dailyLossThreshold !== undefined && (
                    <TableRow className="border-border/50">
                      <TableCell className="text-sm">Daily Loss Threshold</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(parsedData.dailyLossThreshold)}</TableCell>
                    </TableRow>
                  )}
                  {parsedData.currentEquity !== undefined && (
                    <TableRow className="border-border/50">
                      <TableCell className="text-sm">Current Equity</TableCell>
                      <TableCell className="text-right font-mono text-sm text-destructive font-semibold">
                        {formatCurrency(parsedData.currentEquity)}
                      </TableCell>
                    </TableRow>
                  )}
                  {parsedData.exceededBy !== undefined && (
                    <TableRow className="border-border/50 bg-destructive/5">
                      <TableCell className="text-sm font-semibold">Exceeded By</TableCell>
                      <TableCell className="text-right font-mono text-sm text-destructive font-bold">
                        {formatCurrency(parsedData.exceededBy)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Breach Explanation</h3>
              <div className="bg-muted/30 rounded-lg border border-border/50 p-4">
                <p className="text-sm text-foreground/90 leading-relaxed">{breach.reason}</p>
              </div>
            </div>

            {hasMetrics && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-foreground/80 leading-relaxed">
                  The account equity fell below the {breach.rule === 'max_total_loss' ? 'total' : 'daily'} threshold, triggering a Hard Breach due to{' '}
                  <span className="font-semibold text-destructive">{getRuleDisplayName(breach.rule)}</span>.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
