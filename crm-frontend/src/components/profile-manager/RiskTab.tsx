import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronDown, ChevronRight, Eye, RotateCcw, Clock, AlertCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useQueries } from '@tanstack/react-query';
import { RiskService } from '@/services/riskService';
import RiskEvidenceDialog from '@/components/profile-manager/RiskEvidenceDialog';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';

interface RiskTabProps {
  riskBreaches: any[];
  challenges?: any[];
  riskByChallenge?: Array<{
    challenge_name: string;
    account_size: number;
    mt5_account_id: string;
    breaches: any[];
  }> | null;
}

interface GroupedBreaches {
  key: string;
  challengeName: string;
  mt5AccountId: string | null;
  accountSize?: string | null;
  breaches: any[];
}

const getBreachEvidence = (breach: any) => {
  return breach?.evidence || breach?.evidence_data || breach?.metadata?.evidence || null;
};

const getBreachSignature = (breach: any) => {
  return `${String(breach?.rule || '').toLowerCase()}|${String(breach?.breached_at || '')}`;
};

export default function RiskTab({ riskBreaches, challenges = [], riskByChallenge }: RiskTabProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [detailsBreach, setDetailsBreach] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [revertBreach, setRevertBreach] = useState<any>(null);
  const [revertOpen, setRevertOpen] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [evidenceBreach, setEvidenceBreach] = useState<any>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const enrollmentIds = useMemo(() => {
    return Array.from(
      new Set(
        challenges
          .map((c: any) => c?.enrollment?.id || c?.id)
          .filter(Boolean)
      )
    ) as string[];
  }, [challenges]);

  const breachHistoryQueries = useQueries({
    queries: enrollmentIds.map((enrollmentId) => ({
      queryKey: ['profile-manager-breach-history', enrollmentId],
      queryFn: () => enrollmentReviewService.getBreachHistory(enrollmentId),
      enabled: !!enrollmentId,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const evidenceMaps = useMemo(() => {
    const byId = new Map<string, any>();
    const bySignature = new Map<string, any>();

    breachHistoryQueries.forEach((query) => {
      const hardBreaches = query.data?.hard_breaches || [];
      hardBreaches.forEach((breach: any) => {
        const evidence = getBreachEvidence(breach);
        if (!evidence) return;

        if (breach?.id !== undefined && breach?.id !== null) {
          byId.set(String(breach.id), evidence);
        }

        const signature = getBreachSignature(breach);
        bySignature.set(signature, evidence);
      });
    });

    return { byId, bySignature };
  }, [breachHistoryQueries]);

  const enrichBreachEvidence = (breach: any) => {
    if (getBreachEvidence(breach)) return breach;

    const fromId = breach?.id !== undefined && breach?.id !== null
      ? evidenceMaps.byId.get(String(breach.id))
      : null;

    const fromSignature = evidenceMaps.bySignature.get(getBreachSignature(breach));
    const evidence = fromId || fromSignature || null;

    return evidence ? { ...breach, evidence } : breach;
  };

  // Use pre-grouped data from API when available, fallback to client-side grouping
  const groupedBreaches = useMemo(() => {
    if (riskByChallenge && riskByChallenge.length > 0) {
      return riskByChallenge.map((group) => ({
        key: group.mt5_account_id || group.challenge_name,
        challengeName: group.challenge_name,
        mt5AccountId: group.mt5_account_id || null,
        accountSize: group.account_size ? String(group.account_size) : null,
        breaches: (group.breaches || []).map(enrichBreachEvidence),
      }));
    }

    // Fallback: client-side grouping from flat risk_info
    const groups: Record<string, GroupedBreaches> = {};

    riskBreaches.forEach((breach: any) => {
      const meta = breach.metadata || {};
      const key = breach.challenge_enrollment || breach.enrollment_id || breach.enrollment || meta.enrollment_id || meta.challenge_enrollment || breach.account_id || breach.mt5_account_id || 'unknown';
      if (!groups[key]) {
        groups[key] = {
          key,
          challengeName: breach.challenge_name || breach.challenge_type || meta.challenge_name || `Account ${key !== 'unknown' ? key.toString().slice(0, 8) : 'Unknown'}`,
          mt5AccountId: breach.mt5_account_id || meta.mt5_account_id || meta.mt5_id || breach.account_id || null,
          breaches: [],
        };
      }
      groups[key].breaches.push(enrichBreachEvidence(breach));
    });

    return Object.values(groups);
  }, [riskBreaches, riskByChallenge, evidenceMaps]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleViewDetails = (breach: any) => {
    setDetailsBreach(breach);
    setDetailsOpen(true);
  };

  const handleRevertClick = (breach: any) => {
    setRevertBreach(breach);
    setRevertOpen(true);
  };

  const handleEvidenceClick = (breach: any) => {
    const evidence = getBreachEvidence(breach);
    if (!evidence) {
      toast({
        title: 'No Evidence',
        description: 'No evidence payload found for this breach record.',
        variant: 'destructive',
      });
      return;
    }
    setEvidenceBreach({ ...breach, evidence });
    setEvidenceOpen(true);
  };

  const confirmRevert = async () => {
    if (!revertBreach?.id) return;
    try {
      setReverting(true);
      const result = await RiskService.revertBreach(revertBreach.id);
      toast({
        title: 'Breach Reverted',
        description: `Enrollment ${result.enrollment_id} restored to ${result.new_status}`,
      });
      queryClient.invalidateQueries({ queryKey: ['trader-profile'] });
      setRevertOpen(false);
      setRevertBreach(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to revert breach',
        variant: 'destructive',
      });
    } finally {
      setReverting(false);
    }
  };

  if (riskBreaches.length === 0) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No risk breaches found</p>
      </div>
    );
  }

  // If only one group (or no grouping info), show flat list
  if (groupedBreaches.length === 1 && groupedBreaches[0].key === 'unknown') {
    return (
      <>
        <div className="space-y-3">
          {riskBreaches.map((breach: any, index: number) => (
            <BreachCard
              key={breach.id || index}
              breach={enrichBreachEvidence(breach)}
              onViewDetails={handleViewDetails}
              onRevert={handleRevertClick}
              onEvidence={handleEvidenceClick}
            />
          ))}
        </div>
        <BreachDetailsDialog breach={detailsBreach} open={detailsOpen} onOpenChange={setDetailsOpen} />
        <RiskEvidenceDialog breach={evidenceBreach} open={evidenceOpen} onOpenChange={setEvidenceOpen} />
        <RevertConfirmDialog
          breach={revertBreach}
          open={revertOpen}
          onOpenChange={setRevertOpen}
          onConfirm={confirmRevert}
          reverting={reverting}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {groupedBreaches.map((group) => {
          const isExpanded = expandedGroups.has(group.key);
          return (
            <div key={group.key} className="rounded-xl border border-border/60 bg-card overflow-hidden">
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                   <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{group.challengeName}</p>
                      {group.accountSize && (
                        <Badge variant="secondary" className="text-xs">
                          ${Number(group.accountSize).toLocaleString()}
                        </Badge>
                      )}
                      {group.mt5AccountId && (
                        <Badge variant="outline" className="text-xs font-mono">
                          MT5: {group.mt5AccountId}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {group.breaches.length} breach{group.breaches.length !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>
                <Badge variant="destructive" className="text-xs">
                  {group.breaches.length}
                </Badge>
              </button>

              {isExpanded && (
                <div className="border-t border-border/40 p-3 space-y-3">
                  {group.breaches.map((breach: any, index: number) => (
                    <BreachCard
                      key={breach.id || index}
                      breach={breach}
                      onViewDetails={handleViewDetails}
                      onRevert={handleRevertClick}
                      onEvidence={handleEvidenceClick}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <BreachDetailsDialog breach={detailsBreach} open={detailsOpen} onOpenChange={setDetailsOpen} />
      <RiskEvidenceDialog breach={evidenceBreach} open={evidenceOpen} onOpenChange={setEvidenceOpen} />
      <RevertConfirmDialog
        breach={revertBreach}
        open={revertOpen}
        onOpenChange={setRevertOpen}
        onConfirm={confirmRevert}
        reverting={reverting}
      />
    </>
  );
}

// ─── Breach Card ────────────────────────────────────────────────────────────

function BreachCard({
  breach,
  onViewDetails,
  onRevert,
  onEvidence,
}: {
  breach: any;
  onViewDetails: (b: any) => void;
  onRevert: (b: any) => void;
  onEvidence: (b: any) => void;
}) {
  const isReverted = breach.reverted || breach.rule?.toLowerCase().includes('reverted');

  return (
    <div className={`rounded-xl border ${isReverted ? 'border-border/40 opacity-60' : 'border-destructive/20'} bg-card overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-3 bg-destructive/5 border-b border-destructive/10">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <div>
            <span className="font-medium text-sm">{breach.rule || 'Risk Breach'}</span>
            {breach.breached_at && (
              <span className="text-xs text-muted-foreground ml-2">
                {new Date(breach.breached_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isReverted && (
            <Badge variant="secondary" className="text-xs">Reverted</Badge>
          )}
          <Badge variant="destructive" className="text-xs">Breach</Badge>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground border-l-2 border-destructive/40 pl-3">
          {breach.reason || 'No reason provided'}
        </p>

        {/* Max Daily Loss details */}
        {breach.rule === 'Max Daily Loss' && breach.reason?.includes('Start Balance') && (
          <div className="grid grid-cols-3 gap-3">
            {breach.reason.match(/Start Balance: \$([0-9,]+\.\d{2})/) && (
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Start Balance</p>
                <p className="text-sm font-semibold mt-0.5">${breach.reason.match(/Start Balance: \$([0-9,]+\.\d{2})/)?.[1]}</p>
              </div>
            )}
            {breach.reason.match(/Current Equity: \$([0-9,]+\.\d{2})/) && (
              <div className="rounded-lg bg-destructive/5 p-3 text-center">
                <p className="text-xs text-muted-foreground">Current Equity</p>
                <p className="text-sm font-semibold text-destructive mt-0.5">${breach.reason.match(/Current Equity: \$([0-9,]+\.\d{2})/)?.[1]}</p>
              </div>
            )}
            {breach.reason.match(/Threshold: \$([0-9,]+\.\d{2})/) && (
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Threshold</p>
                <p className="text-sm font-semibold mt-0.5">${breach.reason.match(/Threshold: \$([0-9,]+\.\d{2})/)?.[1]}</p>
              </div>
            )}
          </div>
        )}

        {/* Martingale details */}
        {breach.rule === 'Martingale' && breach.reason?.includes('Account ID') && (
          <div className="bg-muted/30 border border-border/40 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Warning:</strong> Volume doubling after loss detected — potential Martingale strategy.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => onViewDetails(breach)}>
            <Eye className="h-3.5 w-3.5 mr-1" />
            Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEvidence(breach)}
            disabled={!getBreachEvidence(breach)}
          >
            Evidence
          </Button>
          {!isReverted && breach.id && (
            <Button variant="outline" size="sm" onClick={() => onRevert(breach)} className="text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Revert
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Breach Details Dialog ──────────────────────────────────────────────────

function BreachDetailsDialog({ breach, open, onOpenChange }: { breach: any; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!breach) return null;

  const getRuleDisplayName = (rule: string): string => {
    const ruleMap: Record<string, string> = {
      max_daily_loss: 'Max Daily Loss',
      max_total_loss: 'Max Total Loss',
      inactivity: 'Inactivity',
      min_trading_days: 'Minimum Trading Days',
      max_lot_size: 'Max Lot Size',
      trading_hours: 'Trading Hours Violation',
      consistency: 'Consistency Rule',
    };
    return ruleMap[rule] || rule.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const parseBreachMetrics = (reason: string) => {
    const metrics: { label: string; value: string; highlight?: boolean }[] = [];
    const balanceMatch = reason.match(/Start Balance[:\s]+\$?([\d,]+\.?\d*)/i);
    if (balanceMatch) metrics.push({ label: 'Start Balance', value: `$${balanceMatch[1]}` });
    const equityMatch = reason.match(/(?:Current )?Equity[:\s]+\$?([\d,]+\.?\d*)/i);
    if (equityMatch) metrics.push({ label: 'Current Equity', value: `$${equityMatch[1]}`, highlight: true });
    const thresholdMatch = reason.match(/[Tt]hreshold[:\s]+\$?([\d,]+\.?\d*)/i);
    if (thresholdMatch) metrics.push({ label: 'Threshold', value: `$${thresholdMatch[1]}` });
    const maxLossMatch = reason.match(/(?:Max Loss|Allowed Max Drop)\s*\(?([\d.]+)%\)?/i);
    if (maxLossMatch) metrics.push({ label: 'Max Loss %', value: `${maxLossMatch[1]}%` });
    return metrics;
  };

  const formatPreviousState = (state: any) => {
    if (!state) return null;
    return Object.entries(state).map(([key, value]) => ({
      label: key.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: value === null || value === undefined ? 'N/A' : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value),
    }));
  };

  const metrics = parseBreachMetrics(breach.reason || '');
  const previousState = formatPreviousState(breach.previous_state);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw]">
        <DialogHeader className="space-y-3 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-lg">Breach Details</DialogTitle>
                {breach.user_name && (
                  <p className="text-sm text-muted-foreground mt-0.5">{breach.user_name}</p>
                )}
              </div>
            </div>
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {getRuleDisplayName(breach.rule || '')}
            </Badge>
          </div>
          {breach.breached_at && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {new Date(breach.breached_at).toLocaleString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Metrics table */}
          {metrics.length > 0 && (
            <div className="bg-muted/30 rounded-lg border border-border/50 overflow-hidden overflow-x-auto">
              <div className="px-4 py-2.5 bg-muted/50 border-b border-border/50">
                <h3 className="font-semibold text-sm">Account Overview</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="text-muted-foreground font-medium">Metric</TableHead>
                    <TableHead className="text-right text-muted-foreground font-medium">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((m, i) => (
                    <TableRow key={i} className={`border-border/50 ${m.highlight ? 'bg-destructive/5' : ''}`}>
                      <TableCell className="text-sm">{m.label}</TableCell>
                      <TableCell className={`text-right font-mono text-sm ${m.highlight ? 'text-destructive font-semibold' : ''}`}>
                        {m.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Reason */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Breach Explanation</h3>
            <div className="bg-muted/30 rounded-lg border border-border/50 p-4">
              <p className="text-sm leading-relaxed">{breach.reason || 'No reason provided'}</p>
            </div>
          </div>

          {/* Previous State */}
          {previousState && previousState.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Previous State</h3>
              <div className="space-y-1.5">
                {previousState.map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 px-3 rounded-md bg-muted/30">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MT5 / Account info */}
          {(breach.account_id || breach.mt5_account_id) && (
            <div className="flex gap-3 text-xs text-muted-foreground pt-2 border-t border-border/40">
              {breach.account_id && <span>Account: <span className="font-mono">{breach.account_id}</span></span>}
              {breach.mt5_account_id && <span>MT5: <span className="font-mono">{breach.mt5_account_id}</span></span>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Revert Confirmation Dialog ─────────────────────────────────────────────

function RevertConfirmDialog({
  breach,
  open,
  onOpenChange,
  onConfirm,
  reverting,
}: {
  breach: any;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => void;
  reverting: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Revert Breach
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will restore the enrollment to its previous state before this breach was applied. This action may re-enable the trading account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {breach && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
            <p className="text-sm font-medium">{breach.rule || 'Risk Breach'}</p>
            {breach.breached_at && (
              <p className="text-xs text-muted-foreground">
                Breached: {new Date(breach.breached_at).toLocaleString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground line-clamp-2">{breach.reason}</p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={reverting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={reverting}>
            {reverting ? 'Reverting...' : 'Revert Breach'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
