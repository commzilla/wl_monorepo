import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ChevronDown, Loader2, RefreshCw, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { websiteOrderService, type WebsiteOrder } from '@/services/websiteOrderService';

interface WebsiteOrderDetailsDialogProps {
  order: WebsiteOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderUpdated?: () => void;
}

const statusOptions = [
  'pending',
  'awaiting_payment',
  'paid',
  'processing',
  'completed',
  'cancelled',
  'refunded',
  'failed',
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-500">Completed</Badge>;
    case 'paid':
      return <Badge className="bg-emerald-500">Paid</Badge>;
    case 'processing':
      return <Badge variant="outline" className="text-blue-500 border-blue-500">Processing</Badge>;
    case 'pending':
      return <Badge variant="outline" className="text-amber-500 border-amber-500">Pending</Badge>;
    case 'awaiting_payment':
      return <Badge variant="outline" className="text-orange-500 border-orange-500">Awaiting Payment</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'refunded':
      return <Badge className="bg-gray-500">Refunded</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const WebsiteOrderDetailsDialog: React.FC<WebsiteOrderDetailsDialogProps> = ({
  order,
  open,
  onOpenChange,
  onOrderUpdated,
}) => {
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  if (!order) return null;

  const canReprocess = order.status === 'paid' && !order.linked_order_id;

  const handleReprocess = async () => {
    try {
      setIsReprocessing(true);
      const result = await websiteOrderService.reprocessOrder(order.id);
      toast({
        title: 'Order reprocessed',
        description: result.message,
      });
      onOrderUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Reprocess failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === order.status) return;
    try {
      setIsSaving(true);
      await websiteOrderService.updateOrderStatus(order.id, newStatus);
      toast({
        title: 'Status updated',
        description: `Order status changed to ${newStatus.replace(/_/g, ' ')}`,
      });
      onOrderUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details {order.order_number ? `- #${order.order_number}` : `- ${order.id.slice(0, 8).toUpperCase()}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info + Status Update */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Order Information</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Order Number:</span> {order.order_number ? `#${order.order_number}` : 'Not assigned (pending completion)'}</div>
                <div><span className="font-medium">UUID:</span> <code className="text-xs bg-muted px-1 rounded">{order.id}</code></div>
                <div><span className="font-medium">Created:</span> {format(new Date(order.created_at), 'PPP p')}</div>
                {order.paid_at && (
                  <div><span className="font-medium">Paid At:</span> {format(new Date(order.paid_at), 'PPP p')}</div>
                )}
                <div><span className="font-medium">Status:</span> {getStatusBadge(order.status)}</div>
                <div><span className="font-medium">Payment Method:</span> <span className="capitalize">{order.payment_method || 'Not specified'}</span></div>
                {order.payment_id && (
                  <div><span className="font-medium">Payment ID:</span> <code className="text-xs bg-muted px-1 rounded">{order.payment_id}</code></div>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Update Status</h3>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select value={newStatus || order.status} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={handleStatusUpdate}
                  disabled={isSaving || !newStatus || newStatus === order.status}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
          </div>

          {/* Reprocess Banner for stuck paid orders */}
          {canReprocess && (
            <div className="flex items-center justify-between gap-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">Stuck Order</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    This order was paid but never processed. The customer has not received their account.
                  </p>
                </div>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={handleReprocess}
                disabled={isReprocessing}
                className="shrink-0"
              >
                {isReprocessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Reprocess
              </Button>
            </div>
          )}

          <Separator />

          {/* Customer Info */}
          <div>
            <h3 className="font-semibold mb-2">Customer Information</h3>
            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Name:</span> {order.customer_first_name} {order.customer_last_name}</div>
                <div><span className="font-medium">Email:</span> {order.customer_email}</div>
                <div><span className="font-medium">Country:</span> {order.customer_country}</div>
                {order.customer_phone && (
                  <div><span className="font-medium">Phone:</span> {order.customer_phone}</div>
                )}
                {order.customer_ip && (
                  <div><span className="font-medium">IP Address:</span> {order.customer_ip}</div>
                )}
                {order.customer_address && Object.keys(order.customer_address).length > 0 && (
                  <div className="col-span-2">
                    <span className="font-medium">Address:</span>{' '}
                    {[
                      order.customer_address.address_line_1,
                      order.customer_address.address_line_2,
                      order.customer_address.city,
                      order.customer_address.state,
                      order.customer_address.postcode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Product Details */}
          <div>
            <h3 className="font-semibold mb-2">Product Details</h3>
            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Product:</span> {order.product_name || 'N/A'}</div>
                {order.account_size && (
                  <div><span className="font-medium">Account Size:</span> ${Number(order.account_size).toLocaleString()}</div>
                )}
                {order.challenge_type && (
                  <div><span className="font-medium">Challenge Type:</span> {order.challenge_type}</div>
                )}
                {order.broker_type && (
                  <div><span className="font-medium">Broker Type:</span> <span className="uppercase">{order.broker_type}</span></div>
                )}
              </div>
            </div>
          </div>

          {/* Addons */}
          {order.addons_list && order.addons_list.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Addons</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="space-y-2 text-sm">
                    {order.addons_list.map((addon) => (
                      <div key={addon.id} className="flex justify-between">
                        <span>{addon.name}</span>
                        <span className="font-medium">
                          {addon.price_type === 'percentage' ? `${addon.price}%` : addon.price_type === 'free' ? 'Free' : `$${addon.price}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Financial Breakdown */}
          <div>
            <h3 className="font-semibold mb-2">Financial Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${order.subtotal}</span>
              </div>
              {parseFloat(order.addon_total) > 0 && (
                <div className="flex justify-between">
                  <span>Addons Total:</span>
                  <span>${order.addon_total}</span>
                </div>
              )}
              {parseFloat(order.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>
                    Discount
                    {order.discount_code_text && (
                      <Badge variant="outline" className="ml-2 text-xs">{order.discount_code_text}</Badge>
                    )}
                  </span>
                  <span>-${order.discount_amount}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total:</span>
                <span>${order.total} {order.currency}</span>
              </div>
            </div>
          </div>

          {/* Referral */}
          {order.referral_code && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Referral</h3>
                <div className="text-sm">
                  <span className="font-medium">Referral Code:</span>{' '}
                  <Badge variant="outline">{order.referral_code}</Badge>
                </div>
              </div>
            </>
          )}


          {/* Webhook Payload */}
          {order.webhook_payload && Object.keys(order.webhook_payload).length > 0 && (
            <>
              <Separator />
              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg">
                  <h3 className="font-semibold">Webhook Payload</h3>
                  <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="bg-muted p-4 rounded-lg mt-2">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                      {JSON.stringify(order.webhook_payload, null, 2)}
                    </pre>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WebsiteOrderDetailsDialog;
