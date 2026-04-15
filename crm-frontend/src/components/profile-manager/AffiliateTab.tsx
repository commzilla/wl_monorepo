import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Plus,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Globe,
  Percent,
  FileText,
  CreditCard,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { affiliateService } from '@/services/affiliateService';
import CreateAffiliateProfileDialog from './CreateAffiliateProfileDialog';
import AffiliateAssignReferralCodeDialog from './AffiliateAssignReferralCodeDialog';
import AffiliateAssignTierDialog from './AffiliateAssignTierDialog';
import AffiliateEditDialog from './AffiliateEditDialog';
import AffiliateConfirmDialog from './AffiliateConfirmDialog';
import AffiliateDeleteDialog from './AffiliateDeleteDialog';
import AffiliateTabHeader from './AffiliateTabHeader';

interface AffiliateTabProps {
  affiliateInfo: any;
  traderId?: string;
  userInfo?: any;
  onRefresh?: () => void;
}

export default function AffiliateTab({ affiliateInfo, traderId, userInfo, onRefresh }: AffiliateTabProps) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignReferralCode, setShowAssignReferralCode] = useState(false);
  const [showAssignTier, setShowAssignTier] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    transactions: true,
    payouts: true,
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: 'default' | 'destructive' | 'warning';
    onConfirm: () => void;
    isLoading: boolean;
  }>({
    open: false,
    title: '',
    description: '',
    confirmText: '',
    variant: 'default',
    onConfirm: () => {},
    isLoading: false,
  });

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Approve
  const approveMutation = useMutation({
    mutationFn: () => affiliateService.approveAffiliate(traderId!),
    onSuccess: (data) => {
      toast({ title: 'Approved', description: data.detail || 'Affiliate approved successfully' });
      setConfirmDialog(prev => ({ ...prev, open: false }));
      onRefresh?.();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Disapprove
  const disapproveMutation = useMutation({
    mutationFn: () => affiliateService.disapproveAffiliate(traderId!),
    onSuccess: (data) => {
      toast({ title: 'Disapproved', description: data.detail || 'Affiliate disapproved' });
      setConfirmDialog(prev => ({ ...prev, open: false }));
      onRefresh?.();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: () => affiliateService.deleteAffiliateUser(traderId!),
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Affiliate profile deleted' });
      setShowDeleteDialog(false);
      onRefresh?.();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openConfirm = (
    title: string,
    description: string,
    confirmText: string,
    variant: 'default' | 'destructive' | 'warning',
    onConfirm: () => void
  ) => {
    setConfirmDialog({ open: true, title, description, confirmText, variant, onConfirm, isLoading: false });
  };

  const handleCopyReferralUrl = (code: string) => {
    navigator.clipboard.writeText(`https://we-fund.com/register?ref=${code}`);
    toast({ title: 'Copied!', description: 'Referral URL copied to clipboard' });
  };

  const isApproved = affiliateInfo?.profile?.approved;
  const userName = userInfo
    ? `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || userInfo.email
    : 'this user';

  if (!affiliateInfo) {
    return (
      <>
        <div className="text-center py-16 rounded-xl border border-border/60 bg-card/50">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 mx-auto mb-3">
            <Users className="h-6 w-6 text-primary/60" />
          </div>
          <p className="text-sm font-medium text-foreground">No Affiliate Profile</p>
          <p className="text-xs text-muted-foreground mt-1">This trader doesn't have an affiliate profile yet.</p>
          {traderId && (
            <Button size="sm" onClick={() => setShowCreateDialog(true)} className="mt-4 gap-1.5 rounded-lg">
              <Plus className="h-3.5 w-3.5" />
              Create Affiliate Profile
            </Button>
          )}
        </div>
        {traderId && (
          <CreateAffiliateProfileDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            traderId={traderId}
            onSuccess={() => onRefresh?.()}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <AffiliateTabHeader
        isApproved={!!isApproved}
        referralCode={affiliateInfo.profile?.referral_code}
        userName={userName}
        onApprove={() =>
          openConfirm(
            'Approve Affiliate',
            `Approve ${userName} as an affiliate? They will be able to earn commissions.`,
            'Approve',
            'default',
            () => approveMutation.mutate()
          )
        }
        onDisapprove={() =>
          openConfirm(
            'Disapprove Affiliate',
            `Disapprove ${userName}? They will stop earning commissions until re-approved.`,
            'Disapprove',
            'warning',
            () => disapproveMutation.mutate()
          )
        }
        onAssignReferralCode={() => setShowAssignReferralCode(true)}
        onAssignTier={() => setShowAssignTier(true)}
        onEdit={() => setShowEditDialog(true)}
        onDelete={() => setShowDeleteDialog(true)}
        onCopyReferralUrl={handleCopyReferralUrl}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={<Users className="h-3.5 w-3.5 text-primary" />}
          label="Referral Code"
          value={affiliateInfo.profile?.referral_code || 'N/A'}
          mono
        />
        <MetricCard
          icon={<TrendingUp className="h-3.5 w-3.5 text-blue-500" />}
          label="Total Referrals"
          value={String(affiliateInfo.profile?.total_referrals || affiliateInfo.profile?.referral_count || 0)}
        />
        <MetricCard
          icon={<ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />}
          label="Active Referrals"
          value={String(affiliateInfo.profile?.active_referrals || 0)}
        />
        <MetricCard
          icon={<Wallet className="h-3.5 w-3.5 text-primary" />}
          label="Balance"
          value={`$${Number(affiliateInfo.wallet?.balance || 0).toFixed(2)}`}
          highlight
        />
      </div>

      {/* Profile Details & Earnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profile Details */}
        <div className="rounded-xl border border-border/60 bg-card/70 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40">
            <div className="flex items-center justify-center h-7 w-7 rounded-md bg-muted/50 text-muted-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-foreground">Profile Details</span>
          </div>
          <div className="p-4 space-y-3">
            <DetailRow label="Status">
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 h-5 border ${
                  isApproved
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                }`}
              >
                {isApproved ? 'Approved' : 'Pending'}
              </Badge>
            </DetailRow>
            <DetailRow label="Conversion Rate">
              <span className="text-sm font-medium text-foreground flex items-center gap-1">
                <Percent className="h-3 w-3 text-muted-foreground" />
                {affiliateInfo.profile?.conversion_rate
                  ? `${(affiliateInfo.profile.conversion_rate * 100).toFixed(1)}%`
                  : '0%'}
              </span>
            </DetailRow>
            {affiliateInfo.profile?.website_url && (
              <DetailRow label="Website">
                <span className="text-xs font-mono text-muted-foreground truncate max-w-[180px] flex items-center gap-1">
                  <Globe className="h-3 w-3 shrink-0" />
                  {affiliateInfo.profile.website_url}
                </span>
              </DetailRow>
            )}
            {affiliateInfo.profile?.promotion_strategy && (
              <div className="pt-2 border-t border-border/40">
                <p className="text-[11px] text-muted-foreground mb-1">Promotion Strategy</p>
                <p className="text-sm text-foreground">{affiliateInfo.profile.promotion_strategy}</p>
              </div>
            )}
          </div>
        </div>

        {/* Earnings Breakdown */}
        <div className="rounded-xl border border-border/60 bg-card/70 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40">
            <div className="flex items-center justify-center h-7 w-7 rounded-md bg-muted/50 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-foreground">Earnings Breakdown</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <EarningPill icon={<CheckCircle2 className="h-3 w-3" />} label="Approved" value={affiliateInfo.profile?.approved_earnings} className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20" />
              <EarningPill icon={<Clock className="h-3 w-3" />} label="Pending" value={affiliateInfo.profile?.pending_earnings} className="bg-amber-500/10 text-amber-600 border-amber-500/20" />
              <EarningPill icon={<ArrowUpRight className="h-3 w-3" />} label="Processing" value={affiliateInfo.profile?.processing_earnings} className="bg-blue-500/10 text-blue-600 border-blue-500/20" />
              <EarningPill icon={<XCircle className="h-3 w-3" />} label="Rejected" value={affiliateInfo.profile?.rejected_earnings} className="bg-destructive/10 text-destructive border-destructive/20" />
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
              <p className="text-[11px] text-muted-foreground">Total Earnings</p>
              <p className="text-lg font-bold text-primary tabular-nums mt-0.5">
                ${Number(affiliateInfo.profile?.total_earnings || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <CollapsibleSection
        icon={<ArrowUpRight className="h-4 w-4" />}
        title="Recent Transactions"
        count={affiliateInfo.transactions?.length || 0}
        expanded={expandedSections.transactions}
        onToggle={() => toggleSection('transactions')}
      >
        {(affiliateInfo.transactions?.length || 0) === 0 ? (
          <EmptyState text="No transactions" />
        ) : (
          <div className="divide-y divide-border/40">
            {affiliateInfo.transactions.slice(0, 10).map((tx: any, i: number) => {
              const isPositive = Number(tx.amount || 0) >= 0;
              return (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex items-center justify-center h-8 w-8 rounded-lg border shrink-0 ${
                      isPositive
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tx.description || 'Transaction'}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {tx.status && (
                      <Badge variant="outline" className="text-[10px] px-1.5 h-5 capitalize">{tx.status}</Badge>
                    )}
                    <span className={`text-sm font-semibold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-destructive'}`}>
                      {isPositive ? '+' : ''}${Number(tx.amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Payouts */}
      <CollapsibleSection
        icon={<CreditCard className="h-4 w-4" />}
        title="Affiliate Payouts"
        count={affiliateInfo.payouts?.length || 0}
        expanded={expandedSections.payouts}
        onToggle={() => toggleSection('payouts')}
      >
        {(affiliateInfo.payouts?.length || 0) === 0 ? (
          <EmptyState text="No payouts" />
        ) : (
          <div className="divide-y divide-border/40">
            {affiliateInfo.payouts.slice(0, 10).map((p: any, i: number) => {
              const isPaid = p.status === 'paid';
              return (
                <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex items-center justify-center h-8 w-8 rounded-lg border shrink-0 ${
                      isPaid
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`}>
                      {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground tabular-nums">${Number(p.amount || 0).toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 h-5 capitalize border ${
                      isPaid
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`}
                  >
                    {p.status || 'Unknown'}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Dialogs */}
      {traderId && (
        <>
          <AffiliateAssignReferralCodeDialog
            open={showAssignReferralCode}
            onOpenChange={setShowAssignReferralCode}
            traderId={traderId}
            currentCode={affiliateInfo.profile?.referral_code}
            userName={userName}
            onSuccess={() => onRefresh?.()}
          />
          <AffiliateAssignTierDialog
            open={showAssignTier}
            onOpenChange={setShowAssignTier}
            traderId={traderId}
            currentTierInfo={affiliateInfo.profile?.manual_tier_override || affiliateInfo.profile?.current_tier}
            userName={userName}
            onSuccess={() => onRefresh?.()}
          />
          <AffiliateEditDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            traderId={traderId}
            affiliateProfile={affiliateInfo.profile}
            customCommission={affiliateInfo.profile?.custom_commission_info}
            userName={userName}
            onSuccess={() => onRefresh?.()}
          />
          <AffiliateDeleteDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onConfirm={() => deleteMutation.mutate()}
            isLoading={deleteMutation.isPending}
            userName={userName}
          />
          <AffiliateConfirmDialog
            open={confirmDialog.open}
            onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
            title={confirmDialog.title}
            description={confirmDialog.description}
            confirmText={confirmDialog.confirmText}
            variant={confirmDialog.variant}
            onConfirm={confirmDialog.onConfirm}
            isLoading={approveMutation.isPending || disapproveMutation.isPending}
          />
        </>
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

function MetricCard({
  icon,
  label,
  value,
  mono = false,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3 flex items-center gap-3">
      <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 ${highlight ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className={`text-base font-semibold tabular-nums truncate ${mono ? 'font-mono text-sm' : ''} ${highlight ? 'text-primary' : 'text-foreground'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function EarningPill({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 flex items-center gap-2.5 ${className}`}>
      <div className="flex items-center justify-center h-6 w-6 rounded-md bg-background/50 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] opacity-70">{label}</p>
        <p className="text-sm font-semibold tabular-nums">${Number(value || 0).toFixed(2)}</p>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
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
