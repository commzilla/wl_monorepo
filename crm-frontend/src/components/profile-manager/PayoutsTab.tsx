import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CreditCard, ChevronDown, ChevronRight, Eye, ExternalLink, Plus, Pencil, Trash2, AlertTriangle, ShieldAlert, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import PayoutDetailsDialog from '@/components/profile-manager/PayoutDetailsDialog';
import PayoutRequestDialog from '@/components/payouts/PayoutRequestDialog';
import PaymentMethodDialog, { type PaymentMethodFormData } from '@/components/profile-manager/PaymentMethodDialog';
import { apiService } from '@/services/apiService';
import { useToast } from '@/hooks/use-toast';
import type { TraderPayout } from '@/pages/PayoutRequest';

interface PayoutsTabProps {
  traderId: string;
  payoutMethods: any[];
  payouts: any[];
  payoutConfig: any;
  userInfo?: any;
}

interface GroupedPayouts {
  enrollmentId: string;
  challengeName: string;
  mt5AccountId: string | null;
  payouts: any[];
  totalAmount: number;
  totalProfit: number;
}

export default function PayoutsTab({ traderId, payoutMethods, payouts, payoutConfig, userInfo }: PayoutsTabProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedPayout, setSelectedPayout] = useState<TraderPayout | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Payment method CRUD state
  const [isMethodDialogOpen, setIsMethodDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  const [deletingMethod, setDeletingMethod] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingMethod, setIsDeletingMethod] = useState(false);

  const handleAddMethod = () => {
    setEditingMethod(null);
    setIsMethodDialogOpen(true);
  };

  const handleEditMethod = (method: any) => {
    setEditingMethod(method);
    setIsMethodDialogOpen(true);
  };

  const handleMethodSubmit = async (data: PaymentMethodFormData) => {
    try {
      if (editingMethod) {
        const res = await apiService.put(`/admin/traders/payment-methods/${traderId}/${editingMethod.id}/`, data);
        if (res.error) throw new Error(res.error);
        toast({ title: 'Success', description: 'Payment method updated' });
      } else {
        const res = await apiService.post(`/admin/traders/payment-methods/${traderId}/`, data);
        if (res.error) throw new Error(res.error);
        toast({ title: 'Success', description: 'Payment method added' });
      }
      setIsMethodDialogOpen(false);
      setEditingMethod(null);
      queryClient.invalidateQueries({ queryKey: ['trader-full-profile'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save payment method', variant: 'destructive' });
      throw err;
    }
  };

  const handleDeleteMethod = async () => {
    if (!deletingMethod || deleteConfirmText !== 'DELETE') return;
    setIsDeletingMethod(true);
    try {
      const res = await apiService.delete(`/admin/traders/payment-methods/${traderId}/${deletingMethod.id}/`);
      if (res.error) throw new Error(res.error);
      toast({ title: 'Success', description: 'Payment method deleted' });
      queryClient.invalidateQueries({ queryKey: ['trader-full-profile'] });
      setDeletingMethod(null);
      setDeleteConfirmText('');
    } catch {
      toast({ title: 'Error', description: 'Failed to delete payment method', variant: 'destructive' });
    } finally {
      setIsDeletingMethod(false);
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    if (!open) {
      setDeletingMethod(null);
      setDeleteConfirmText('');
    }
  };
  const groupedPayouts = useMemo(() => {
    const groups: Record<string, GroupedPayouts> = {};
    
    payouts.forEach((payout: any) => {
      const key = payout.challenge_enrollment || payout.enrollment_id || 'unknown';
      if (!groups[key]) {
        groups[key] = {
          enrollmentId: key,
          challengeName: payout.challenge_name || payout.challenge_type || `Account ${key.slice(0, 8)}`,
          mt5AccountId: payout.mt5_account_id || payout.mt5_id || null,
          payouts: [],
          totalAmount: 0,
          totalProfit: 0,
        };
      }
      groups[key].payouts.push(payout);
      groups[key].totalAmount += Number(payout.amount || 0);
      groups[key].totalProfit += Number(payout.profit || 0);
    });

    return Object.values(groups);
  }, [payouts]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleViewDetails = (payout: any) => {
    // Map to TraderPayout shape expected by PayoutDetailsDialog
    const mapped: TraderPayout = {
      id: payout.id,
      trader: payout.trader || '',
      trader_username: payout.trader_username || '',
      trader_email: payout.trader_email || '',
      challenge_name: payout.challenge_name || '',
      mt5_account_id: payout.mt5_account_id || '',
      account_size: String(payout.account_size || '0'),
      amount: String(payout.amount || '0'),
      profit: String(payout.profit || '0'),
      profit_share: String(payout.profit_share || '0'),
      net_profit: String(payout.net_profit || '0'),
      released_fund: String(payout.released_fund || '0'),
      method: payout.method || 'paypal',
      method_details: payout.method_details || {},
      status: payout.status || 'pending',
      admin_note: payout.admin_note,
      rejection_reason: payout.rejection_reason,
      exclude_amount: payout.exclude_amount ? String(payout.exclude_amount) : undefined,
      exclude_reason: payout.exclude_reason,
      requested_at: payout.requested_at || '',
      reviewed_at: payout.reviewed_at,
      paid_at: payout.paid_at,
      challenge_enrollment: payout.challenge_enrollment ? { id: payout.challenge_enrollment } : undefined,
    };
    setSelectedPayout(mapped);
    setIsDetailsOpen(true);
  };

  const handleStatusUpdate = async (payoutId: string, newStatus: string) => {
    try {
      const response = await apiService.put(`/payouts/${payoutId}/`, { status: newStatus });
      if (response.error) throw new Error(response.error);
      toast({ title: 'Success', description: 'Payout status updated' });
      queryClient.invalidateQueries({ queryKey: ['trader-full-profile'] });
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    queryClient.invalidateQueries({ queryKey: ['trader-full-profile'] });
  };

  return (
    <div className="space-y-8">
      {/* Payout Config Summary */}
      {payoutConfig && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Profit Share" value={`${payoutConfig.profit_share_percent}%`} />
          <MetricCard label="Payment Cycle" value={payoutConfig.payment_cycle} className="capitalize" />
          <MetricCard label="Status" value={payoutConfig.is_active ? 'Active' : 'Inactive'} />
          <MetricCard label="Live Since" value={payoutConfig.live_trading_start_date ? new Date(payoutConfig.live_trading_start_date).toLocaleDateString() : 'N/A'} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Methods */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Payment Methods ({payoutMethods.length})
            </h3>
            <Button size="sm" variant="outline" onClick={handleAddMethod}>
              <Plus className="h-4 w-4 mr-1" />
              Add Method
            </Button>
          </div>
          {payoutMethods.length > 0 ? (
            <div className="space-y-3">
              {payoutMethods.map((method: any, index: number) => (
                <div key={method.id || index} className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{method.label || `${method.payment_type?.toUpperCase()} Method`}</span>
                      <Badge variant="outline" className="text-xs capitalize">{method.payment_type}</Badge>
                      {method.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditMethod(method)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingMethod(method)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {method.paypal_email && <p className="font-mono text-xs">{method.paypal_email}</p>}
                    {method.rise_email && <p className="font-mono text-xs">{method.rise_email}</p>}
                    {method.bank_account_name && <p>{method.bank_account_name}</p>}
                    {method.iban && <p className="font-mono text-xs">{method.iban}</p>}
                    {method.swift_code && <p className="font-mono text-xs">SWIFT: {method.swift_code}</p>}
                    {method.bank_name && <p>{method.bank_name}</p>}
                    {method.crypto_type && <p>{method.crypto_type}</p>}
                    {method.crypto_wallet_address && <p className="font-mono text-xs break-all">{method.crypto_wallet_address}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground rounded-xl border border-dashed border-border/60">
              No payment methods configured
            </div>
          )}
        </section>

        {/* Payout History - Grouped by Challenge */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Payout History ({payouts.length})
            </h3>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Payout Request
            </Button>
          </div>
          {groupedPayouts.length > 0 ? (
            <div className="space-y-3">
              {groupedPayouts.map((group) => {
                const isExpanded = expandedGroups.has(group.enrollmentId);
                return (
                  <div key={group.enrollmentId} className="rounded-xl border border-border/60 bg-card overflow-hidden">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.enrollmentId)}
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
                            {group.mt5AccountId && (
                              <Badge variant="outline" className="text-xs font-mono">
                                MT5: {group.mt5AccountId}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {group.payouts.length} payout{group.payouts.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">${group.totalAmount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Total Amount</p>
                      </div>
                    </button>

                    {/* Expanded Payouts */}
                    {isExpanded && (
                      <div className="border-t border-border/40 divide-y divide-border/30">
                        {group.payouts.map((payout: any, index: number) => (
                          <div key={payout.id || index} className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-lg font-semibold">${Number(payout.amount || 0).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">{payout.trader_username}</p>
                              </div>
                              <Badge variant={
                                payout.status === 'paid' ? 'default' :
                                payout.status === 'rejected' ? 'destructive' : 'secondary'
                              } className="text-xs capitalize">
                                {payout.status || 'Unknown'}
                              </Badge>
                            </div>
                            <div className="flex gap-6 text-sm">
                              <div>
                                <span className="text-muted-foreground">Gross:</span>
                                <span className="ml-1 font-medium">${Number(payout.profit || 0).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Share:</span>
                                <span className="ml-1 font-medium">{payout.profit_share}%</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Method:</span>
                                <span className="ml-1 capitalize">{payout.method}</span>
                              </div>
                            </div>
                            {payout.admin_note && (
                              <div className="bg-muted/30 rounded-lg p-2.5 text-sm">
                                <span className="text-muted-foreground">Note:</span>
                                <span className="ml-1">{payout.admin_note}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-border/40">
                              <div className="text-xs text-muted-foreground">
                                Requested: {payout.requested_at ? new Date(payout.requested_at).toLocaleString() : 'N/A'}
                                {payout.paid_at && <span className="ml-3">Paid: {new Date(payout.paid_at).toLocaleString()}</span>}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(payout)}
                                  className="text-xs"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  View
                                </Button>
                                {(payout.challenge_enrollment || payout.enrollment_id) && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigate(`/trading-activity/payout/${payout.id}`)}
                                      className="text-xs"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                      Review
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => window.open(`/trading-activity/payout/${payout.id}`, '_blank')}
                                      className="h-8 w-8"
                                      title="Open Review in New Tab"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground rounded-xl border border-dashed border-border/60">
              <CreditCard className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              No payouts found
            </div>
          )}
        </section>
      </div>

      {/* Dialogs */}
      <PayoutDetailsDialog
        payout={selectedPayout}
        isOpen={isDetailsOpen}
        onClose={() => { setSelectedPayout(null); setIsDetailsOpen(false); }}
        onStatusUpdate={handleStatusUpdate}
      />

      <PayoutRequestDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
        preSelectedClient={userInfo ? {
          id: traderId,
          full_name: `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || userInfo.email,
          email: userInfo.email,
        } : undefined}
      />

      <PaymentMethodDialog
        isOpen={isMethodDialogOpen}
        onClose={() => { setIsMethodDialogOpen(false); setEditingMethod(null); }}
        onSubmit={handleMethodSubmit}
        method={editingMethod}
      />

      {/* Delete Payment Method — fintech style */}
      <Dialog open={!!deletingMethod} onOpenChange={handleDeleteDialogChange}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 rounded-xl border-destructive/20">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Trash2 size={18} className="text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Delete Payment Method</h2>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  This action is permanent and irreversible
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            {/* Warning Banner */}
            <div className="flex gap-3 p-3.5 rounded-lg bg-destructive/5 border border-destructive/15">
              <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-sm">
                <p className="font-medium text-foreground">
                  You are about to permanently delete this payment method.
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Any pending payouts using this method may be affected. This cannot be undone.
                </p>
              </div>
            </div>

            {/* Method Info Card */}
            {deletingMethod && (
              <div className="rounded-lg bg-muted/30 border border-border/50 divide-y divide-border/50">
                <div className="flex items-center gap-3 p-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CreditCard size={16} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {deletingMethod.label || `${deletingMethod.payment_type?.toUpperCase()} Method`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate capitalize">
                      {deletingMethod.payment_type}
                      {deletingMethod.is_default && ' · Default'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-xs">
                  {deletingMethod.paypal_email && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">PayPal</span>
                      <p className="font-medium text-foreground font-mono text-xs">{deletingMethod.paypal_email}</p>
                    </div>
                  )}
                  {deletingMethod.rise_email && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Rise</span>
                      <p className="font-medium text-foreground font-mono text-xs">{deletingMethod.rise_email}</p>
                    </div>
                  )}
                  {deletingMethod.bank_name && (
                    <div>
                      <span className="text-muted-foreground">Bank</span>
                      <p className="font-medium text-foreground">{deletingMethod.bank_name}</p>
                    </div>
                  )}
                  {deletingMethod.bank_account_name && (
                    <div>
                      <span className="text-muted-foreground">Account</span>
                      <p className="font-medium text-foreground">{deletingMethod.bank_account_name}</p>
                    </div>
                  )}
                  {deletingMethod.crypto_type && (
                    <div>
                      <span className="text-muted-foreground">Crypto</span>
                      <p className="font-medium text-foreground">{deletingMethod.crypto_type}</p>
                    </div>
                  )}
                  {deletingMethod.crypto_wallet_address && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Wallet</span>
                      <p className="font-medium text-foreground font-mono text-xs break-all">{deletingMethod.crypto_wallet_address}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Confirmation Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <ShieldAlert size={12} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Type <span className="font-mono font-semibold text-destructive">DELETE</span> to confirm
                </p>
              </div>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background font-mono"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDeleteDialogChange(false)}
              disabled={isDeletingMethod}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deleteConfirmText !== 'DELETE' || isDeletingMethod}
              onClick={handleDeleteMethod}
              className="h-9 min-w-[140px]"
            >
              {isDeletingMethod ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete Method
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold mt-1 ${className}`}>{value}</p>
    </div>
  );
}
