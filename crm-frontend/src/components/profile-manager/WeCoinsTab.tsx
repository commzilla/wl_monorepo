import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Coins,
  Gift,
  ScrollText,
  Search,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { profileManagerWeCoinsService } from '@/services/profileManagerWeCoinsService';
import {
  WeCoinsOverviewResponse,
  WeCoinsTransactionOverview,
  WeCoinsRewardSubmissionOverview,
  WeCoinsRedemptionOverview,
} from '@/lib/types/weCoinsOverview';

interface WeCoinsTabProps {
  traderId: string;
}

type SectionId = 'all' | 'transactions' | 'submissions' | 'redemptions';

const SECTION_ITEMS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: Coins },
  { id: 'transactions', label: 'Transactions', icon: Wallet },
  { id: 'submissions', label: 'Submissions', icon: ScrollText },
  { id: 'redemptions', label: 'Redemptions', icon: Gift },
];

const STATUS_FILTERS = ['all', 'pending', 'approved', 'declined', 'fulfilled'] as const;

function getStatusConfig(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'approved':
    case 'active':
    case 'fulfilled':
      return { class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 };
    case 'earn':
      return { class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: ArrowUpRight };
    case 'declined':
    case 'rejected':
    case 'archived':
      return { class: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle };
    case 'spend':
      return { class: 'bg-destructive/10 text-destructive border-destructive/20', icon: ArrowDownRight };
    case 'pending':
      return { class: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock };
    case 'adjustment':
      return { class: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: RefreshCw };
    default:
      return { class: 'bg-muted text-muted-foreground border-border', icon: AlertCircle };
  }
}

function formatDateTimeSafe(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function filterData(data: WeCoinsOverviewResponse, search: string, statusFilter: string): WeCoinsOverviewResponse {
  const term = search.trim().toLowerCase();
  const matchText = (value: string) => !term || value.toLowerCase().includes(term);
  const matchStatus = (status?: string) =>
    statusFilter === 'all' || (status || '').toLowerCase() === statusFilter;

  return {
    ...data,
    transactions: data.transactions.filter((tx) => {
      const text = [tx.type, tx.description, tx.amount].filter(Boolean).join(' ');
      return matchText(text) && matchStatus(tx.type);
    }),
    reward_submissions: data.reward_submissions.filter((s) => {
      const text = [s.status, s.notes, s.admin_comment, s.task?.title, s.task?.status].filter(Boolean).join(' ');
      return matchText(text) && matchStatus(s.status);
    }),
    redemptions: data.redemptions.filter((r) => {
      const text = [r.status, r.admin_comment, r.item?.title, r.item?.category].filter(Boolean).join(' ');
      return matchText(text) && matchStatus(r.status);
    }),
  };
}

export default function WeCoinsTab({ traderId }: WeCoinsTabProps) {
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<SectionId>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    transactions: true,
    submissions: true,
    redemptions: true,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['profile-manager-wecoins', traderId],
    queryFn: () => profileManagerWeCoinsService.getUserOverview(traderId),
    enabled: !!traderId,
  });

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[260px]">
        <div className="text-center space-y-3">
          <div className="h-7 w-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading WeCoins overview…</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-16 rounded-xl border border-border/60 bg-card/50">
        <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-muted/50 mb-3">
          <Coins className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <p className="text-sm text-destructive font-medium">Failed to load WeCoins data</p>
        <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
      </div>
    );
  }

  const filtered = filterData(data, search, statusFilter);
  const walletBalance = Number(data.wallet?.balance || 0);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="rounded-xl border border-border/60 bg-card/70 shadow-sm">
        <div className="p-4 sm:p-5 space-y-4">
          {/* Title Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 border border-primary/20">
                <Coins className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">WeCoins Overview</h3>
                <p className="text-xs text-muted-foreground">Wallet, rewards & redemption activity</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              icon={<Wallet className="h-3.5 w-3.5 text-primary" />}
              label="Balance"
              value={walletBalance.toFixed(2)}
              highlight
            />
            <MetricCard
              icon={<ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />}
              label="Transactions"
              value={String(data.transactions.length)}
            />
            <MetricCard
              icon={<ScrollText className="h-3.5 w-3.5 text-blue-500" />}
              label="Submissions"
              value={String(data.reward_submissions.length)}
            />
            <MetricCard
              icon={<Gift className="h-3.5 w-3.5 text-amber-500" />}
              label="Redemptions"
              value={String(data.redemptions.length)}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search description, task, item, status…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-xs pl-8 rounded-lg"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto">
              {SECTION_ITEMS.map((item) => (
                <Button
                  key={item.id}
                  variant={section === item.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSection(item.id)}
                  className="h-8 text-xs shrink-0 gap-1.5 rounded-lg"
                >
                  <item.icon className="h-3 w-3" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Status Pills */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`
                  px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors border
                  ${statusFilter === status
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border/60 hover:bg-muted/50 hover:text-foreground'
                  }
                `}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Section */}
      {(section === 'all' || section === 'transactions') && (
        <CollapsibleSection
          icon={<Wallet className="h-4 w-4" />}
          title="Transactions"
          count={filtered.transactions.length}
          expanded={expandedSections.transactions}
          onToggle={() => toggleSection('transactions')}
        >
          {filtered.transactions.length === 0 ? (
            <EmptyState text="No transactions found" />
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Submissions Section */}
      {(section === 'all' || section === 'submissions') && (
        <CollapsibleSection
          icon={<ScrollText className="h-4 w-4" />}
          title="Reward Submissions"
          count={filtered.reward_submissions.length}
          expanded={expandedSections.submissions}
          onToggle={() => toggleSection('submissions')}
        >
          {filtered.reward_submissions.length === 0 ? (
            <EmptyState text="No reward submissions found" />
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.reward_submissions.map((s) => (
                <SubmissionRow key={s.id} submission={s} />
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Redemptions Section */}
      {(section === 'all' || section === 'redemptions') && (
        <CollapsibleSection
          icon={<Gift className="h-4 w-4" />}
          title="Redemptions"
          count={filtered.redemptions.length}
          expanded={expandedSections.redemptions}
          onToggle={() => toggleSection('redemptions')}
        >
          {filtered.redemptions.length === 0 ? (
            <EmptyState text="No redemptions found" />
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.redemptions.map((r) => (
                <RedemptionRow key={r.id} redemption={r} />
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function CollapsibleSection({
  icon,
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-muted/50 text-muted-foreground">
            {icon}
          </div>
          <span className="text-sm font-medium text-foreground">{title}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 h-5 tabular-nums">
            {count}
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && <div className="border-t border-border/40">{children}</div>}
    </div>
  );
}

function TransactionRow({ tx }: { tx: WeCoinsTransactionOverview }) {
  const config = getStatusConfig(tx.type);
  const StatusIcon = config.icon;
  const isPositive = tx.amount > 0;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex items-center justify-center h-8 w-8 rounded-lg border shrink-0 ${config.class}`}>
          <StatusIcon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{tx.description || 'Transaction'}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{formatDateTimeSafe(tx.created_at)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <Badge variant="outline" className={`capitalize border text-[10px] px-1.5 ${config.class}`}>
          {tx.type}
        </Badge>
        <span className={`text-sm font-semibold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-destructive'}`}>
          {isPositive ? '+' : ''}{tx.amount}
        </span>
      </div>
    </div>
  );
}

function SubmissionRow({ submission }: { submission: WeCoinsRewardSubmissionOverview }) {
  const config = getStatusConfig(submission.status);
  const StatusIcon = config.icon;

  return (
    <div className="px-4 py-3 hover:bg-muted/20 transition-colors space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center justify-center h-8 w-8 rounded-lg border shrink-0 ${config.class}`}>
            <StatusIcon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{submission.task?.title || 'Task Submission'}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{formatDateTimeSafe(submission.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`capitalize border text-[10px] px-1.5 ${config.class}`}>
            {submission.status}
          </Badge>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground ml-11">
        <span>Reward: <span className="text-foreground font-medium">{submission.reward_amount}</span></span>
        <span>Task: <span className="text-foreground capitalize">{submission.task?.status || 'N/A'}</span></span>
        {submission.proof_url && (
          <a href={submission.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            <ExternalLink className="h-3 w-3" />
            Proof
          </a>
        )}
        {submission.admin_comment && (
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {submission.admin_comment}
          </span>
        )}
      </div>
    </div>
  );
}

function RedemptionRow({ redemption }: { redemption: WeCoinsRedemptionOverview }) {
  const config = getStatusConfig(redemption.status);
  const StatusIcon = config.icon;

  return (
    <div className="px-4 py-3 hover:bg-muted/20 transition-colors space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center justify-center h-8 w-8 rounded-lg border shrink-0 ${config.class}`}>
            <StatusIcon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{redemption.item?.title || 'Redeem Item'}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{formatDateTimeSafe(redemption.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`capitalize border text-[10px] px-1.5 ${config.class}`}>
            {redemption.status}
          </Badge>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground ml-11">
        <span>Category: <span className="text-foreground capitalize">{redemption.item?.category || 'N/A'}</span></span>
        <span>Cost: <span className="text-foreground font-medium">{redemption.item?.required_wecoins || 0}</span></span>
        {redemption.admin_comment && (
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {redemption.admin_comment}
          </span>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3 flex items-center gap-3">
      <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 ${highlight ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className={`text-base font-semibold tabular-nums ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
