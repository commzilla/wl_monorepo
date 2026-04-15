import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Trophy,
  Search,
  ChevronDown,
  ChevronRight,
  Target,
  ShieldAlert,
  Calendar,
  Edit,
  Trash2,
  Plus,
  Settings,
  ExternalLink,
  DollarSign,
  Server,
  Ban,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import EnrollmentDialog from './EnrollmentDialog';
import DeleteEnrollmentDialog from './DeleteEnrollmentDialog';
import DepositWithdrawalDialog from './DepositWithdrawalDialog';
import MT5AccountActionsDialog from './MT5AccountActionsDialog';
import BlockAccountDialog from './BlockAccountDialog';
import { ChallengeEnrollment } from '@/services/challengeService';

interface ChallengesTabProps {
  challenges: any[];
  onRefresh?: () => void;
  /** Trader email for pre-selecting client in create/edit dialogs */
  clientEmail?: string;
}

const STATUS_FILTERS = ['all', 'active', 'completed', 'failed', 'pending'] as const;

function getStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'active': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
    case 'completed': case 'passed': return 'bg-blue-500/10 text-blue-600 border-blue-200';
    case 'failed': case 'breached': return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-200';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

/** Map profile challenge data to ChallengeEnrollment for dialogs */
function mapToEnrollment(challenge: any): ChallengeEnrollment {
  const enrollment = challenge.enrollment || challenge;
  return {
    id: enrollment.id || '',
    client_id: enrollment.client_id || '',
    client_name: enrollment.client_name || '',
    client_email: enrollment.client_email || '',
    challenge: {
      name: enrollment.challenge_name || enrollment.product_name || '',
      step_type: enrollment.challenge_type?.toLowerCase()?.includes('2') ? '2-step' : '1-step',
      step_type_display: enrollment.challenge_type || '1-Step',
      ...(enrollment.challenge || {}),
    },
    order: enrollment.order || null,
    account_size: String(enrollment.account_size || ''),
    currency: enrollment.currency || 'USD',
    current_balance: enrollment.current_balance,
    status: enrollment.status || 'active',
    start_date: enrollment.start_date || enrollment.created_at || '',
    completed_date: enrollment.completed_date || null,
    live_start_date: enrollment.live_start_date || null,
    is_active: enrollment.is_active ?? true,
    notes: enrollment.notes || '',
    broker_type: enrollment.broker_type || 'mt5',
    mt5_account_id: enrollment.mt5_account_id || enrollment.account_id || null,
    mt5_password: enrollment.mt5_password || null,
    mt5_investor_password: enrollment.mt5_investor_password || null,
    created_at: enrollment.created_at || '',
    updated_at: enrollment.updated_at || '',
    latest_breach: enrollment.latest_breach || null,
  };
}

export default function ChallengesTab({ challenges, onRefresh, clientEmail }: ChallengesTabProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());
  const [editingEnrollment, setEditingEnrollment] = useState<ChallengeEnrollment | undefined>(undefined);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingEnrollment, setDeletingEnrollment] = useState<ChallengeEnrollment | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [fundsTarget, setFundsTarget] = useState<any>(null);
  const [mt5ActionsTarget, setMt5ActionsTarget] = useState<any>(null);
  const [blockTarget, setBlockTarget] = useState<any>(null);

  const filtered = useMemo(() => {
    return challenges.filter((c) => {
      const enrollment = c.enrollment || c;
      const status = (enrollment.status || '').toLowerCase();
      const name = enrollment.challenge_name || enrollment.product_name || '';
      const mt5 = enrollment.mt5_account_id || enrollment.account_id || '';

      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || String(mt5).includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [challenges, search, statusFilter]);

  // Summary stats
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    challenges.forEach((c) => {
      const s = (c.enrollment || c).status?.toLowerCase() || 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [challenges]);

  const activeCount = (statusCounts['active'] || 0);
  const passedCount = (statusCounts['completed'] || 0) + (statusCounts['passed'] || 0);
  const failedCount = (statusCounts['failed'] || 0) + (statusCounts['breached'] || 0);
  const successRate = challenges.length > 0 ? Math.round((passedCount / challenges.length) * 100) : 0;

  const toggleExpand = (id: string | number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleEdit = (challenge: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEnrollment(mapToEnrollment(challenge));
    setEditDialogOpen(true);
  };

  const handleDelete = (challenge: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingEnrollment(mapToEnrollment(challenge));
  };

  if (challenges.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <Trophy className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No challenge enrollments found</p>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create Enrollment
        </Button>
        <EnrollmentDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={onRefresh}
          defaultClientEmail={clientEmail}
          lockClient
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Challenges" value={String(challenges.length)} />
        <SummaryCard label="Active" value={String(activeCount)} accent="emerald" />
        <SummaryCard label="Passed" value={String(passedCount)} accent="blue" />
        <SummaryCard label="Success Rate" value={`${successRate}%`} />
      </div>

      {/* Filters & Create */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search challenges..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {s}{s !== 'all' && statusCounts[s] ? ` (${statusCounts[s]})` : ''}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create Enrollment
        </Button>
      </div>

      {/* Challenges List */}
      <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">No challenges match your filters</div>
        ) : (
          filtered.map((challenge, index) => {
            const enrollment = challenge.enrollment || challenge;
            const phaseDetails = challenge.phase_details;
            const phases = challenge.phases || [];
            const id = enrollment.id || index;
            const isExpanded = expandedIds.has(id);

            const name = enrollment.challenge_name || enrollment.product_name || 'Challenge';
            const type = enrollment.challenge_type || '1-Step';
            const accountSize = enrollment.account_size;
            const currency = enrollment.currency || 'USD';
            const status = enrollment.status || 'Unknown';
            const mt5Account = enrollment.mt5_account_id || enrollment.account_id;
            const startDate = enrollment.start_date || enrollment.created_at;

            // Current phase from phases array
            const currentPhase = phases.find((p: any) => p.is_current) || phaseDetails;
            // Progress calculation from current phase or phase details
            const profitTarget = currentPhase?.profit_target ? Number(currentPhase.profit_target) : null;

            return (
              <Collapsible key={id} open={isExpanded} onOpenChange={() => toggleExpand(id)}>
                {/* Main Row */}
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors">
                    <div className="text-muted-foreground">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{name}</span>
                        <span className="text-xs text-muted-foreground">{type}</span>
                      </div>
                      {mt5Account && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{mt5Account}</p>
                      )}
                    </div>

                    {accountSize && accountSize !== 'N/A' && (
                      <span className="hidden sm:block text-sm font-medium tabular-nums">
                        ${Number(accountSize).toLocaleString()} {currency}
                      </span>
                    )}

                    <div className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">
                      {startDate ? new Date(startDate).toLocaleDateString() : '—'}
                    </div>

                    <Badge className={`text-[11px] capitalize border ${getStatusStyle(status)}`} variant="outline">
                      {status}
                    </Badge>
                  </div>
                </CollapsibleTrigger>

                {/* Expanded Detail */}
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-1 pl-12 space-y-4 bg-muted/10">
                    {/* Actions */}
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/enrollment-review/${id}`); }}
                        className="text-xs"
                      >
                        <Settings className="h-3.5 w-3.5 mr-1.5" />
                        Manager
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); window.open(`/enrollment-review/${id}`, '_blank'); }}
                        className="h-8 w-8"
                        title="Open Manager in New Tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setFundsTarget({ enrollmentId: id, name, mt5Account, currency }); }}
                        className="text-xs"
                      >
                        <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                        Deposit/Withdraw
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setMt5ActionsTarget({ enrollmentId: id, name, mt5Account }); }}
                        className="text-xs"
                      >
                        <Server className="h-3.5 w-3.5 mr-1.5" />
                        MT5 Actions
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setBlockTarget({ enrollmentId: id, name, mt5Account, status }); }}
                        className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                      >
                        <Ban className="h-3.5 w-3.5 mr-1.5" />
                        Block
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleEdit(challenge, e)}
                        className="text-xs"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleDelete(challenge, e)}
                        className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>

                    {/* All Phases from API */}
                    {phases.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Phases ({phases.length})
                          </span>
                        </div>

                        <div className="space-y-2">
                          {phases.map((phase: any, pi: number) => {
                            const phaseName = String(phase.phase_type || '')
                              .replace(/[-_]/g, ' ')
                              .replace(/\b\w/g, (l: string) => l.toUpperCase()) || `Phase ${pi + 1}`;
                            return (
                              <div
                                key={pi}
                                className={`rounded-lg border p-3 space-y-2 ${phase.is_current ? 'border-primary/40 bg-primary/5' : 'border-border/40 bg-muted/20'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold">{phaseName}</span>
                                    {phase.is_current && (
                                      <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">Current</Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {phase.trading_period || 'Unlimited'} period
                                    {phase.min_trading_days && Number(phase.min_trading_days) > 0 && ` · ${phase.min_trading_days} min days`}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {phase.profit_target != null && (
                                    <RuleCard label="Profit Target" value={`${phase.profit_target}%`} color="emerald" />
                                  )}
                                  {phase.max_loss != null && (
                                    <RuleCard label="Max Total Loss" value={`${phase.max_loss}%`} color="red" />
                                  )}
                                  {phase.max_daily_loss != null && (
                                    <RuleCard label="Max Daily Loss" value={`${phase.max_daily_loss}%`} color="amber" />
                                  )}
                                </div>
                                {/* Balance/Equity from phase */}
                                {(phase.mt5_account_id || phase.balance != null) && (
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/30">
                                    {phase.mt5_account_id && (
                                      <span className="font-mono">MT5: {phase.mt5_account_id}</span>
                                    )}
                                    {phase.balance != null && (
                                      <span>Balance: <span className="font-medium text-foreground">${Number(phase.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                                    )}
                                    {phase.equity != null && (
                                      <span>Equity: <span className="font-medium text-foreground">${Number(phase.equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Fallback to old phase_details if no phases array */}
                    {phases.length === 0 && phaseDetails && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {phaseDetails.phase_type_display || phaseDetails.phase_type || 'Phase 1'} — {phaseDetails.trading_period || 'Unlimited'} period
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {profitTarget !== null && (
                            <RuleCard label="Profit Target" value={`${profitTarget}%`} color="emerald" />
                          )}
                          {phaseDetails.max_loss && (
                            <RuleCard label="Max Total Loss" value={`${phaseDetails.max_loss}%`} color="red" />
                          )}
                          {phaseDetails.max_daily_loss && (
                            <RuleCard label="Max Daily Loss" value={`${phaseDetails.max_daily_loss}%`} color="amber" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* MT5 Account Details */}
                    {mt5Account && (
                      <DetailSection icon={ShieldAlert} title="Trading Account">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <KV label="Account ID" value={String(mt5Account)} mono />
                          {enrollment.mt5_password && <KV label="Password" value={enrollment.mt5_password} mono />}
                          {enrollment.mt5_investor_password && <KV label="Investor" value={enrollment.mt5_investor_password} mono />}
                        </div>
                      </DetailSection>
                    )}

                    {/* Dates */}
                    <DetailSection icon={Calendar} title="Timeline">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <KV label="Created" value={enrollment.created_at ? new Date(enrollment.created_at).toLocaleDateString() : 'N/A'} />
                        <KV label="Start Date" value={startDate ? new Date(startDate).toLocaleDateString() : 'N/A'} />
                        <KV label="Live Start" value={enrollment.live_start_date ? new Date(enrollment.live_start_date).toLocaleDateString() : 'N/A'} />
                        <KV label="Active" value={enrollment.is_active ? 'Yes' : 'No'} />
                      </div>
                    </DetailSection>

                    {/* Footer */}
                    <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t border-border/30">
                      <span>Broker: {enrollment.broker_type?.toUpperCase() || 'MT5'}</span>
                      {enrollment.updated_at && <span>Updated: {new Date(enrollment.updated_at).toLocaleString()}</span>}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* Create Dialog */}
      <EnrollmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={onRefresh}
        defaultClientEmail={clientEmail}
        lockClient
      />

      {/* Edit Dialog */}
      <EnrollmentDialog
        enrollment={editingEnrollment}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={onRefresh}
        defaultClientEmail={clientEmail}
        lockClient
      />

      {/* Delete Dialog */}
      <DeleteEnrollmentDialog
        enrollment={deletingEnrollment}
        open={!!deletingEnrollment}
        onOpenChange={(open) => !open && setDeletingEnrollment(null)}
        onSuccess={onRefresh}
      />

      {/* Deposit/Withdrawal Dialog */}
      <DepositWithdrawalDialog
        open={!!fundsTarget}
        onOpenChange={(open) => !open && setFundsTarget(null)}
        enrollmentId={fundsTarget?.enrollmentId || ''}
        challengeName={fundsTarget?.name || ''}
        mt5AccountId={fundsTarget?.mt5Account}
        currency={fundsTarget?.currency}
        onSuccess={onRefresh}
      />

      {/* MT5 Account Actions Dialog */}
      <MT5AccountActionsDialog
        open={!!mt5ActionsTarget}
        onOpenChange={(open) => !open && setMt5ActionsTarget(null)}
        enrollmentId={mt5ActionsTarget?.enrollmentId || ''}
        challengeName={mt5ActionsTarget?.name || ''}
        mt5AccountId={mt5ActionsTarget?.mt5Account}
        onSuccess={onRefresh}
      />

      {/* Block Account Dialog */}
      <BlockAccountDialog
        open={!!blockTarget}
        onOpenChange={(open) => !open && setBlockTarget(null)}
        enrollmentId={blockTarget?.enrollmentId || ''}
        challengeName={blockTarget?.name || ''}
        mt5AccountId={blockTarget?.mt5Account}
        status={blockTarget?.status}
        onSuccess={onRefresh}
      />
    </div>
  );
}

/* ── Helpers ───────────────────────────── */

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-semibold mt-0.5 ${accent === 'emerald' ? 'text-emerald-600' : accent === 'blue' ? 'text-blue-600' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function RuleCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-500/5',
    red: 'border-destructive/20 bg-destructive/5',
    amber: 'border-amber-200 bg-amber-500/5',
  };
  const textMap: Record<string, string> = {
    emerald: 'text-emerald-600',
    red: 'text-destructive',
    amber: 'text-amber-600',
  };

  return (
    <div className={`rounded-lg border px-3 py-2 ${colorMap[color] || ''}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold ${textMap[color] || ''}`}>{value}</p>
    </div>
  );
}

function DetailSection({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium mt-0.5 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}
