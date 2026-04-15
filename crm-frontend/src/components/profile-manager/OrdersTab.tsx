import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShoppingCart,
  Search,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Package,
  Server,
  ExternalLink,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import OrderDetailsDialog from './OrderDetailsDialog';
import { Order } from '@/services/orderService';

interface OrdersTabProps {
  orders: any[];
}

const STATUS_FILTERS = ['all', 'completed', 'processing', 'pending', 'cancelled', 'refunded', 'failed'] as const;

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'completed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
    case 'processing': return 'bg-blue-500/10 text-blue-600 border-blue-200';
    case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-200';
    case 'cancelled': case 'refunded': return 'bg-muted text-muted-foreground border-border';
    case 'failed': return 'bg-destructive/10 text-destructive border-destructive/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function getPaymentColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'paid': return 'bg-emerald-500/10 text-emerald-600';
    case 'pending': return 'bg-amber-500/10 text-amber-600';
    default: return 'bg-muted text-muted-foreground';
  }
}

/** Map profile order data to the Order interface expected by OrderDetailsDialog */
function mapToOrder(order: any): Order {
  return {
    id: order.id,
    date_created: order.date_created,
    status: order.status || '',
    payment_status: order.payment_status || '',
    customer_name: order.customer_name || order.raw_data?.billing?.first_name
      ? `${order.raw_data?.billing?.first_name || ''} ${order.raw_data?.billing?.last_name || ''}`.trim()
      : '',
    customer_email: order.customer_email || order.raw_data?.billing?.email || '',
    customer_ip: order.customer_ip || order.raw_data?.customer_ip_address || order.raw_data?.ip_address || '',
    billing_address: {
      first_name: order.raw_data?.billing?.first_name || '',
      last_name: order.raw_data?.billing?.last_name || '',
      company: order.raw_data?.billing?.company || '',
      address_line_1: order.raw_data?.billing?.address_1 || '',
      address_line_2: order.raw_data?.billing?.address_2 || '',
      city: order.raw_data?.billing?.city || '',
      state: order.raw_data?.billing?.state || '',
      postcode: order.raw_data?.billing?.postcode || '',
      country: order.raw_data?.billing?.country || '',
      phone: order.raw_data?.billing?.phone || '',
      email: order.raw_data?.billing?.email || '',
    },
    product_name: order.product_name || '',
    cost: order.cost || order.total_usd || '0',
    quantity: order.quantity || 1,
    total_usd: order.total_usd || '0',
    items_subtotal_usd: order.items_subtotal_usd || '0',
    coupons_discount_usd: order.coupons_discount_usd || '0.00',
    order_total_usd: order.order_total_usd || order.total_usd || '0',
    paid_usd: order.paid_usd || order.total_usd || '0',
    coupon_codes: order.coupon_codes || [],
    payment_method: order.payment_method || '',
    raw_data: order.raw_data || null,
    user: order.user || '',
    mt5_payload_sent: order.mt5_payload_sent,
    mt5_response: order.mt5_response,
    mt5_account_id: order.mt5_account_id,
    mt5_password: order.mt5_password,
    mt5_investor_password: order.mt5_investor_password,
    woo_order_id: order.woo_order_id || order.raw_data?.id,
    woo_order_number: order.woo_order_number || order.raw_data?.number || '',
    woo_order_key: order.woo_order_key || order.raw_data?.order_key || '',
    woo_customer_id: order.woo_customer_id || order.raw_data?.customer_id,
    tracking_metadata: order.tracking_metadata || {},
    currency: order.currency || 'USD',
    transaction_id: order.transaction_id || '',
    challenge_name: order.challenge_name || '',
    challenge_broker_type: order.challenge_broker_type || '',
    challenge_account_size: order.challenge_account_size || '',
    referral_code: order.referral_code,
    affiliate: order.affiliate,
  };
}

export default function OrdersTab({ orders }: OrdersTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === 'all' || o.status?.toLowerCase() === statusFilter;
      const matchesSearch =
        !search ||
        String(o.id).includes(search) ||
        o.product_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.payment_method?.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  // Summary stats
  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + (Number(o.total_usd) || 0), 0), [orders]);
  const paidCount = useMemo(() => orders.filter((o) => o.payment_status === 'paid').length, [orders]);
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => { counts[o.status?.toLowerCase() || 'unknown'] = (counts[o.status?.toLowerCase() || 'unknown'] || 0) + 1; });
    return counts;
  }, [orders]);

  const toggleExpand = (id: string | number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openDetails = (order: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrder(mapToOrder(order));
    setDetailsOpen(true);
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingCart className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No orders found</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Orders" value={String(orders.length)} />
        <SummaryCard label="Total Revenue" value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <SummaryCard label="Paid" value={`${paidCount} / ${orders.length}`} />
        <SummaryCard label="Completed" value={String(statusCounts['completed'] || 0)} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
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

      {/* Orders List */}
      <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">No orders match your filters</div>
        ) : (
          filtered.map((order, index) => {
            const id = order.id || index;
            const isExpanded = expandedIds.has(id);

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
                        <span className="text-sm font-medium">#{order.id}</span>
                        {order.raw_data?.number && (
                          <span className="text-xs text-muted-foreground">WC #{order.raw_data.number}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{order.product_name}</p>
                    </div>

                    <div className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(order.date_created).toLocaleDateString()}
                    </div>

                    <Badge className={`text-[11px] border ${getPaymentColor(order.payment_status)}`} variant="outline">
                      {order.payment_status}
                    </Badge>

                    <Badge className={`text-[11px] capitalize border ${getStatusColor(order.status)}`} variant="outline">
                      {order.status}
                    </Badge>

                    <span className="text-sm font-semibold tabular-nums min-w-[70px] text-right">
                      ${order.total_usd}
                    </span>
                  </div>
                </CollapsibleTrigger>

                {/* Expanded Detail */}
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-1 pl-12 space-y-4 bg-muted/10">
                    {/* View Full Details button */}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => openDetails(order, e)}
                        className="text-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        View Full Details
                      </Button>
                    </div>

                    {/* Pricing breakdown */}
                    <DetailSection icon={CreditCard} title="Payment">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <KV label="Subtotal" value={`$${order.items_subtotal_usd}`} />
                        {Number(order.coupons_discount_usd) > 0 && (
                          <KV label="Discount" value={`-$${order.coupons_discount_usd}`} className="text-emerald-600" />
                        )}
                        <KV label="Total" value={`$${order.total_usd}`} bold />
                        {order.payment_method && <KV label="Method" value={order.payment_method} />}
                      </div>
                      {order.coupon_codes?.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {order.coupon_codes.map((c: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      )}
                    </DetailSection>

                    {/* Product details */}
                    {order.raw_data?.line_items?.length > 0 && (
                      <DetailSection icon={Package} title="Product">
                        {order.raw_data.line_items.map((item: any, i: number) => (
                          <div key={i}>
                            <p className="text-sm font-medium">{item.name}</p>
                            {item.meta_data?.length > 0 && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                {item.meta_data.map((meta: any, j: number) => (
                                  <span key={j} className="text-xs text-muted-foreground">
                                    {meta.display_key}: <span className="text-foreground font-medium">{meta.display_value}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </DetailSection>
                    )}

                    {/* MT5 */}
                    {(order.mt5_account_id || order.mt5_payload_sent) && (
                      <DetailSection icon={Server} title="MT5 Account">
                        <div className="flex flex-wrap gap-4 text-sm">
                          {order.mt5_account_id && <KV label="Account" value={order.mt5_account_id} mono />}
                          {order.currency && <KV label="Currency" value={order.currency} />}
                          {order.mt5_response?.arraySize && <span className="text-xs text-emerald-600">✓ Created</span>}
                        </div>
                      </DetailSection>
                    )}

                    {/* Footer meta */}
                    <div className="flex flex-wrap gap-3 pt-2 border-t border-border/30 text-xs text-muted-foreground">
                      <span>Created: {new Date(order.date_created).toLocaleString()}</span>
                      {order.customer_ip && <span className="font-mono">IP: {order.customer_ip}</span>}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}

/* ── Helpers ───────────────────────────── */

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
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

function KV({ label, value, bold, mono, className }: { label: string; value: string; bold?: boolean; mono?: boolean; className?: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-sm mt-0.5 ${bold ? 'font-semibold' : 'font-medium'} ${mono ? 'font-mono text-xs' : ''} ${className || ''}`}>
        {value}
      </p>
    </div>
  );
}
