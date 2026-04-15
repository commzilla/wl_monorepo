import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  UserPlus,
  Download,
  ShoppingCart,
  CreditCard,
  MapPin,
  Trophy,
  Server,
  Users,
  Tag,
  FileText,
  Loader2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Order, orderService, OrderAffiliateDetails } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getCountryNameSafe } from '@/lib/utils/countryUtils';
import { OrderAffiliateAssignDialog } from '@/components/orders/OrderAffiliateAssignDialog';

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderDeleted?: () => void;
}

/* ── Section wrapper ──────────────────── */
const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="space-y-3">
    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
      {icon}
      {title}
    </h4>
    {children}
  </div>
);

/* ── Key-value row ────────────────────── */
const KV: React.FC<{ label: string; children: React.ReactNode; mono?: boolean }> = ({
  label,
  children,
  mono,
}) => (
  <div className="space-y-0.5">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <p className={`text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`}>{children}</p>
  </div>
);

/* ── Status helpers ───────────────────── */
function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    processing: 'bg-blue-500/10 text-blue-600 border-blue-200',
    pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
    cancelled: 'bg-muted text-muted-foreground border-border',
    refunded: 'bg-muted text-muted-foreground border-border',
    failed: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${map[status] || 'border-border text-muted-foreground'}`}>
      {status}
    </Badge>
  );
}

function getPaymentBadge(status: string) {
  const map: Record<string, string> = {
    paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
    failed: 'bg-destructive/10 text-destructive border-destructive/20',
    refunded: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${map[status] || 'border-border text-muted-foreground'}`}>
      {status}
    </Badge>
  );
}

/* ── Main component ───────────────────── */
const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  order,
  open,
  onOpenChange,
  onOrderDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showMT5Password, setShowMT5Password] = useState(false);
  const [showInvestorPassword, setShowInvestorPassword] = useState(false);
  const [affiliateDetails, setAffiliateDetails] = useState<OrderAffiliateDetails | null>(null);
  const [loadingAffiliate, setLoadingAffiliate] = useState(false);
  const [showAssignAffiliateDialog, setShowAssignAffiliateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (order && open) {
      fetchAffiliateDetails();
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  }, [order, open]);

  const fetchAffiliateDetails = async () => {
    if (!order) return;
    try {
      setLoadingAffiliate(true);
      const details = await orderService.getOrderAffiliate(order.id);
      setAffiliateDetails(details);
    } catch {
      // affiliate might not be assigned
    } finally {
      setLoadingAffiliate(false);
    }
  };

  if (!order) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  const handleDeleteOrder = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    try {
      setIsDeleting(true);
      await orderService.deleteOrder(order.id);
      toast({ title: 'Order Deleted', description: `Order #${order.woo_order_id || order.id} has been deleted.` });
      onOpenChange(false);
      onOrderDeleted?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const exportOrderDetails = () => {
    const lines = [
      'ORDER DETAILS',
      '='.repeat(80),
      '',
      `Order ID: ${order.woo_order_id || order.id}`,
      `Date: ${format(new Date(order.date_created), 'PPP')}`,
      `Status: ${order.status}`,
      `Payment: ${order.payment_status}`,
      `Customer: ${order.customer_name} (${order.customer_email})`,
      `Product: ${order.product_name}`,
      `Total: $${order.order_total_usd}`,
      `Paid: $${order.paid_usd}`,
      '',
      `Export generated: ${format(new Date(), "PPP 'at' p")}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `order_${order.woo_order_id || order.id}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    link.click();
    toast({ title: 'Exported', description: 'Order details downloaded' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-xl border-border/50">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart size={18} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Order #{order.woo_order_id || order.id}
                </h2>
                <p className="text-xs text-muted-foreground font-normal mt-0.5 flex items-center gap-2">
                  {format(new Date(order.date_created), 'PPP')}
                  <span className="inline-flex gap-1.5">
                    {getStatusBadge(order.status)}
                    {getPaymentBadge(order.payment_status)}
                  </span>
                </p>
              </div>
            </div>
            <Button onClick={exportOrderDetails} variant="outline" size="sm" className="h-8 text-xs">
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* Order & Customer Info */}
          <div className="grid grid-cols-2 gap-6">
            <Section icon={<ShoppingCart size={12} />} title="Order Information">
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3 grid grid-cols-2 gap-3">
                <KV label="Payment Method">
                  <span className="capitalize">{order.payment_method || 'N/A'}</span>
                </KV>
                <KV label="Currency">{order.currency}</KV>
                {order.transaction_id && <KV label="Transaction ID" mono>{order.transaction_id}</KV>}
                {order.user && <KV label="User ID" mono>{String(order.user).slice(0, 8)}…</KV>}
              </div>
            </Section>

            <Section icon={<Users size={12} />} title="Customer">
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3 space-y-2">
                <KV label="Name">{order.customer_name}</KV>
                <KV label="Email">{order.customer_email}</KV>
                <KV label="IP Address" mono>{order.customer_ip || 'N/A'}</KV>
              </div>
            </Section>
          </div>

          {/* Product & Financial */}
          <Section icon={<CreditCard size={12} />} title="Product & Financials">
            <div className="rounded-lg bg-muted/30 border border-border/50 divide-y divide-border/50">
              <div className="p-3 grid grid-cols-4 gap-3">
                <KV label="Product">{order.product_name}</KV>
                <KV label="Qty">{order.quantity}</KV>
                <KV label="Unit Cost">${order.cost}</KV>
                <KV label="Total">${order.total_usd}</KV>
              </div>
              <div className="p-3 grid grid-cols-3 gap-3">
                <KV label="Subtotal">${order.items_subtotal_usd}</KV>
                {order.coupons_discount_usd !== '0.00' && (
                  <KV label="Discount">
                    <span className="text-emerald-600">-${order.coupons_discount_usd}</span>
                  </KV>
                )}
                <KV label="Order Total">
                  <span className="text-primary font-semibold">${order.order_total_usd}</span>
                </KV>
              </div>
              <div className="p-3">
                <KV label="Amount Paid">
                  <span className="text-primary font-semibold">${order.paid_usd}</span>
                </KV>
              </div>
            </div>
          </Section>

          {/* Challenge Details */}
          {(order.challenge_name || order.challenge_broker_type || order.challenge_account_size) && (
            <Section icon={<Trophy size={12} />} title="Challenge Details">
              <div className="rounded-lg bg-muted/30 border border-border/50 p-3 grid grid-cols-3 gap-3">
                {order.challenge_name && <KV label="Challenge">{order.challenge_name}</KV>}
                {order.challenge_broker_type && (
                  <KV label="Broker">
                    <span className="uppercase">{order.challenge_broker_type}</span>
                  </KV>
                )}
                {order.challenge_account_size && (
                  <KV label="Account Size">${Number(order.challenge_account_size).toLocaleString()}</KV>
                )}
              </div>
            </Section>
          )}

          {/* Billing Address */}
          <Section icon={<MapPin size={12} />} title="Billing Address">
            <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-sm space-y-0.5">
              <p className="font-medium text-foreground">
                {order.billing_address.first_name} {order.billing_address.last_name}
              </p>
              {order.billing_address.company && (
                <p className="text-muted-foreground">{order.billing_address.company}</p>
              )}
              <p className="text-muted-foreground">{order.billing_address.address_line_1}</p>
              {order.billing_address.address_line_2 && (
                <p className="text-muted-foreground">{order.billing_address.address_line_2}</p>
              )}
              <p className="text-muted-foreground">
                {order.billing_address.city}
                {order.billing_address.state && `, ${order.billing_address.state}`}
                {order.billing_address.postcode && ` ${order.billing_address.postcode}`}
              </p>
              <p className="font-medium text-foreground">
                {getCountryNameSafe(order.billing_address.country)}
              </p>
              {order.billing_address.phone && (
                <p className="text-muted-foreground pt-1">Phone: {order.billing_address.phone}</p>
              )}
            </div>
          </Section>

          {/* Affiliate */}
          <Section icon={<UserPlus size={12} />} title="Affiliate">
            <div className="rounded-lg bg-muted/30 border border-border/50 p-3">
              {loadingAffiliate ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : affiliateDetails?.affiliate_username ? (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <KV label="Affiliate">{affiliateDetails.affiliate_username}</KV>
                    {affiliateDetails.referral_code && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">Referral Code:</span>
                        <Badge variant="outline" className="text-xs">{affiliateDetails.referral_code}</Badge>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">
                    Assigned
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Not assigned</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setShowAssignAffiliateDialog(true)}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Assign
                  </Button>
                </div>
              )}
            </div>
          </Section>

          {/* Coupon Codes */}
          {order.coupon_codes && order.coupon_codes.length > 0 && (
            <Section icon={<Tag size={12} />} title="Coupons">
              <div className="flex gap-1.5 flex-wrap">
                {order.coupon_codes.map((code, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {code}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {/* MT5 Account */}
          {(order.mt5_account_id || order.mt5_payload_sent || order.mt5_response) && (
            <Section icon={<Server size={12} />} title="MT5 Account">
              {order.mt5_account_id && (
                <div className="rounded-lg bg-muted/30 border border-border/50 p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Account ID */}
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-muted-foreground">Account ID</span>
                      <div className="flex items-center gap-1.5 p-2 bg-background rounded-md border border-border/50 font-mono text-sm">
                        <span className="flex-1 text-primary">{order.mt5_account_id}</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(order.mt5_account_id || '', 'Account ID')}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {/* Master Password */}
                    {order.mt5_password && (
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-muted-foreground">Master Password</span>
                        <div className="flex items-center gap-1.5 p-2 bg-background rounded-md border border-border/50 font-mono text-sm">
                          <span className="flex-1">{showMT5Password ? order.mt5_password : '••••••••'}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowMT5Password(!showMT5Password)}>
                            {showMT5Password ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(order.mt5_password || '', 'Password')}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Investor Password */}
                    {order.mt5_investor_password && (
                      <div className="space-y-0.5 md:col-span-2">
                        <span className="text-[11px] text-muted-foreground">Investor Password</span>
                        <div className="flex items-center gap-1.5 p-2 bg-background rounded-md border border-border/50 font-mono text-sm">
                          <span className="flex-1">{showInvestorPassword ? order.mt5_investor_password : '••••••••'}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowInvestorPassword(!showInvestorPassword)}>
                            {showInvestorPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(order.mt5_investor_password || '', 'Investor Password')}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MT5 Payloads */}
              {order.mt5_payload_sent && Object.keys(order.mt5_payload_sent).length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 hover:bg-muted/50 rounded-lg text-sm">
                    <span className="font-medium text-muted-foreground">MT5 API Request</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="text-xs bg-muted/30 border border-border/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
                      {JSON.stringify(order.mt5_payload_sent, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}
              {order.mt5_response && Object.keys(order.mt5_response).length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 hover:bg-muted/50 rounded-lg text-sm">
                    <span className="font-medium text-muted-foreground">MT5 API Response</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="text-xs bg-muted/30 border border-border/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
                      {JSON.stringify(order.mt5_response, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </Section>
          )}

          {/* WooCommerce */}
          {(order.woo_order_id || order.woo_order_number || order.woo_order_key || order.woo_customer_id) && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 hover:bg-muted/50 rounded-lg text-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <FileText size={12} />
                  WooCommerce Integration
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="rounded-lg bg-muted/30 border border-border/50 p-3 grid grid-cols-2 gap-3 mt-1">
                  {order.woo_order_id && <KV label="WC Order ID" mono>{order.woo_order_id}</KV>}
                  {order.woo_order_number && <KV label="Order Number">{order.woo_order_number}</KV>}
                  {order.woo_order_key && <KV label="Order Key" mono>{order.woo_order_key}</KV>}
                  {order.woo_customer_id && <KV label="WC Customer ID">{order.woo_customer_id}</KV>}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Tracking Metadata */}
          {order.tracking_metadata && Object.keys(order.tracking_metadata).length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 hover:bg-muted/50 rounded-lg text-sm">
                <span className="font-medium text-muted-foreground">Tracking Metadata</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="text-xs bg-muted/30 border border-border/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(order.tracking_metadata, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Raw Data */}
          {order.raw_data && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2.5 hover:bg-muted/50 rounded-lg text-sm">
                <span className="font-medium text-muted-foreground">Raw Order Data</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="text-xs bg-muted/30 border border-border/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                  {JSON.stringify(order.raw_data, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Delete Section */}
          {!showDeleteConfirm ? (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 border-destructive/30 h-8 text-xs"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete Order
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
              <div className="flex gap-2">
                <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Delete Order #{order.woo_order_id || order.id}?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">This action is permanent and cannot be undone.</p>
                </div>
              </div>
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
                  className="h-8 text-sm bg-background border-border/50 font-mono"
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                  onClick={handleDeleteOrder}
                >
                  {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                  {isDeleting ? 'Deleting…' : 'Delete Order'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Affiliate Assignment Dialog */}
        <OrderAffiliateAssignDialog
          orderId={order.id}
          open={showAssignAffiliateDialog}
          onOpenChange={setShowAssignAffiliateDialog}
          onAffiliateAssigned={fetchAffiliateDetails}
        />
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
