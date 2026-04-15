import { format } from 'date-fns';
import { AlertTriangle, Clock3, FileJson } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RiskEvidenceDialogProps {
  breach: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const parseAmount = (value: string | number | null | undefined): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatCurrency = (value?: number): string => {
  if (value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatDateTimeSafe = (value?: string | null): string => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return format(date, 'MMM dd, yyyy HH:mm:ss');
};

const safeStringify = (payload: unknown): string => {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return 'Unable to render payload';
  }
};

const getRuleDisplayName = (rule: string): string => {
  const map: Record<string, string> = {
    max_daily_loss: 'Max Daily Loss',
    max_total_loss: 'Max Total Loss',
    consistency_rule: 'Consistency Rule',
    minimum_trading_days: 'Minimum Trading Days',
  };
  return map[rule] || rule?.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Risk Breach';
};

export default function RiskEvidenceDialog({ breach, open, onOpenChange }: RiskEvidenceDialogProps) {
  const evidence = breach?.evidence || breach?.evidence_data || breach?.metadata?.evidence;
  if (!evidence) return null;

  const positions = Array.isArray(evidence.positions) ? evidence.positions : [];
  const evidenceAccountId = evidence.account_id ?? breach.account_id ?? null;
  const evidenceCreatedAt = evidence.created_at || evidence.captured_at || breach.breached_at || null;
  const actorLabel = breach.user_name?.trim() || (evidenceAccountId ? `Account ${evidenceAccountId}` : 'Breach Record');

  const startBalance = parseAmount(evidence.start_balance);
  const threshold = parseAmount(evidence.threshold);
  const maxLossAmount = parseAmount(evidence.max_loss_amount);
  const maxLossPercent = parseAmount(evidence.max_loss_percent);
  const equity = parseAmount(evidence.equity);
  const balance = parseAmount(evidence.balance);
  const margin = parseAmount(evidence.margin);
  const freeMargin = parseAmount(evidence.free_margin);
  const exceededBy = equity !== undefined && threshold !== undefined ? threshold - equity : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-lg">Hard Breach Evidence</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {actorLabel}
                  {breach.user_name && evidenceAccountId ? ` - Account ${evidenceAccountId}` : ''}
                </p>
              </div>
            </div>
            <Badge variant="destructive" className="text-xs">
              {getRuleDisplayName(breach.rule || '')}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <MetaCard label="Evidence Account" value={evidenceAccountId ? String(evidenceAccountId) : 'N/A'} mono />
            <MetaCard label="Captured At" value={formatDateTimeSafe(evidence.captured_at)} icon={<Clock3 className="h-3 w-3" />} />
            <MetaCard label="Broker Time" value={formatDateTimeSafe(evidence.broker_time)} />
            <MetaCard label="Evidence Created" value={formatDateTimeSafe(evidenceCreatedAt)} />
            <MetaCard label="Open Positions" value={String(evidence.positions_count ?? positions.length)} />
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <section className="rounded-xl border border-border/60 overflow-hidden bg-card/60">
            <div className="px-4 py-2.5 bg-muted/30 border-b border-border/50">
              <h3 className="text-sm font-semibold">Account Overview</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <MetricRow label="Daily Start Balance" value={formatCurrency(startBalance)} />
                <MetricRow label={`Allowed Max Drop${maxLossPercent !== undefined ? ` (${maxLossPercent}%)` : ''}`} value={formatCurrency(maxLossAmount)} />
                <MetricRow label="Daily Loss Threshold" value={formatCurrency(threshold)} />
                <MetricRow label="Current Equity" value={formatCurrency(equity)} highlight />
                <MetricRow label="Current Balance" value={formatCurrency(balance)} />
                <MetricRow label="Current Margin" value={formatCurrency(margin)} />
                <MetricRow label="Current Free Margin" value={formatCurrency(freeMargin)} />
                {exceededBy !== undefined && (
                  <MetricRow label="Exceeded By" value={formatCurrency(exceededBy)} highlight />
                )}
              </TableBody>
            </Table>
          </section>

          {positions.length > 0 && (
            <section className="rounded-xl border border-border/60 overflow-hidden bg-card/60">
              <div className="px-4 py-2.5 bg-muted/30 border-b border-border/50">
                <h3 className="text-sm font-semibold">Open Positions at Breach</h3>
              </div>
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
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
                    {positions.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.ticket}</TableCell>
                        <TableCell className="text-sm font-medium">{p.symbol}</TableCell>
                        <TableCell className="text-xs uppercase">{p.side}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{p.volume}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{p.open_price || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{p.current_price || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{p.profit || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          {evidence.equity_payload && (
            <PayloadBlock title="Raw Equity Payload" payload={evidence.equity_payload} />
          )}

          {evidence.positions_payload && (
            <PayloadBlock title="Raw Positions Payload" payload={evidence.positions_payload} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetaCard({ label, value, mono = false, icon }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
      <div className="text-[11px] text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className={`text-xs font-medium mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function MetricRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  if (value === 'N/A') return null;
  return (
    <TableRow className={highlight ? 'bg-destructive/5' : ''}>
      <TableCell className="text-sm">{label}</TableCell>
      <TableCell className={`text-right font-mono text-sm ${highlight ? 'text-destructive font-semibold' : ''}`}>
        {value}
      </TableCell>
    </TableRow>
  );
}

function PayloadBlock({ title, payload }: { title: string; payload: unknown }) {
  return (
    <section className="rounded-xl border border-border/60 overflow-hidden bg-card/60">
      <div className="px-4 py-2.5 bg-muted/30 border-b border-border/50 flex items-center gap-1.5">
        <FileJson className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <pre className="text-xs p-4 overflow-auto max-h-[220px]">{safeStringify(payload)}</pre>
    </section>
  );
}
