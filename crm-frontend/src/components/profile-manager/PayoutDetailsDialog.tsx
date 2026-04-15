import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TraderPayout } from '@/pages/PayoutRequest';

interface PayoutDetailsDialogProps {
  payout: TraderPayout | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (payoutId: string, status: string) => void;
}

const formatCurrency = (amount: string | number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid': return 'default';
    case 'approved': return 'secondary';
    case 'rejected': return 'destructive';
    default: return 'outline';
  }
}

export default function PayoutDetailsDialog({ payout, isOpen, onClose, onStatusUpdate }: PayoutDetailsDialogProps) {
  const navigate = useNavigate();
  const [adminNote, setAdminNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  if (!payout) return null;

  const handleStatusUpdate = () => {
    if (selectedStatus && selectedStatus !== payout.status) {
      onStatusUpdate(payout.id, selectedStatus);
      onClose();
    }
  };

  const reviewUrl = `/trading-activity/payout/${payout.id}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Payout Request Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Amount & Status Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums">{formatCurrency(payout.amount)}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{payout.trader_username}</p>
            </div>
            <Badge variant={getStatusVariant(payout.status)} className="capitalize text-xs">
              {payout.status}
            </Badge>
          </div>

          {/* Financial Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Gross Profit" value={formatCurrency(payout.profit)} />
            <MetricCard label="Profit Share" value={`${payout.profit_share}%`} />
            <MetricCard label="Net Profit" value={formatCurrency(payout.net_profit)} />
            <MetricCard label="Released Fund" value={formatCurrency(payout.released_fund)} />
          </div>

          {/* Payment Method */}
          <Section title="Payment Method">
            <div className="text-sm space-y-1.5">
              <KV label="Method" value={String(payout.method).toUpperCase()} />
              <MethodDetails method={payout.method} details={payout.method_details} />
            </div>
          </Section>

          {/* Timeline */}
          <Section title="Timeline">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KV label="Requested" value={formatDate(payout.requested_at)} />
              {payout.reviewed_at && <KV label="Reviewed" value={formatDate(payout.reviewed_at)} />}
              {payout.paid_at && <KV label="Paid" value={formatDate(payout.paid_at)} />}
            </div>
          </Section>

          {/* Admin Note */}
          {payout.admin_note && (
            <Section title="Admin Note">
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{payout.admin_note}</p>
            </Section>
          )}

          {/* Rejection Reason */}
          {payout.rejection_reason && (
            <Section title="Rejection Reason">
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                <div
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: payout.rejection_reason
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                      .replace(/\n\n/g, '<br/><br/>')
                  }}
                />
              </div>
            </Section>
          )}

          {/* Exclusions */}
          {(payout.exclude_amount || payout.exclude_reason) && (
            <Section title="Exclusions">
              <div className="grid grid-cols-2 gap-3">
                <KV label="Exclude Amount" value={payout.exclude_amount ? formatCurrency(payout.exclude_amount) : '$0.00'} />
                <KV label="Reason" value={payout.exclude_reason || 'N/A'} />
              </div>
            </Section>
          )}

          {/* Status Update */}
          <Section title="Update Status">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">New Status</Label>
                <Select value={selectedStatus || payout.status} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['pending', 'approved', 'rejected', 'paid', 'cancelled'].map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Admin Note</Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add a note about this status change..."
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          </Section>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleStatusUpdate}
              disabled={!selectedStatus || selectedStatus === payout.status}
              className="text-xs"
            >
              Update Status
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(reviewUrl)}
              className="text-xs"
            >
              <ArrowRight className="h-3.5 w-3.5 mr-1" />
              Review
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(reviewUrl, '_blank')}
              className="h-8 w-8"
              title="Open Review in New Tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Sub-components ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 pt-4 border-t border-border/40">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

function MethodDetails({ method, details }: { method: string; details: Record<string, any> }) {
  if (!details) return null;
  switch (method) {
    case 'paypal':
      return <KV label="PayPal Email" value={details.paypal_email || 'Not provided'} />;
    case 'bank':
      return (
        <div className="grid grid-cols-2 gap-3">
          <KV label="Bank Name" value={details.bank_name || 'N/A'} />
          <KV label="Account" value={details.bank_account ? `***${details.bank_account.slice(-4)}` : 'N/A'} />
          <KV label="Routing" value={details.routing_number || 'N/A'} />
        </div>
      );
    case 'crypto':
      return (
        <div className="space-y-1.5">
          <KV label="Crypto Type" value={details.crypto_type || 'BTC'} />
          <div>
            <p className="text-[11px] text-muted-foreground">Wallet Address</p>
            <p className="text-xs font-mono break-all mt-0.5">{details.crypto_wallet || 'N/A'}</p>
          </div>
        </div>
      );
    default:
      return null;
  }
}
