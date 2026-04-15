import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Trash2, Copy, Eye, EyeOff, UserPlus, Download } from 'lucide-react';
import { Order, orderService, OrderAffiliateDetails } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { getCountryNameSafe } from '@/lib/utils/countryUtils';
import { OrderAffiliateAssignDialog } from './OrderAffiliateAssignDialog';

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderDeleted?: () => void;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  order,
  open,
  onOpenChange,
  onOrderDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMT5Password, setShowMT5Password] = useState(false);
  const [showInvestorPassword, setShowInvestorPassword] = useState(false);
  const [affiliateDetails, setAffiliateDetails] = useState<OrderAffiliateDetails | null>(null);
  const [loadingAffiliate, setLoadingAffiliate] = useState(false);
  const [showAssignAffiliateDialog, setShowAssignAffiliateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (order && open) {
      fetchAffiliateDetails();
    }
  }, [order, open]);

  const fetchAffiliateDetails = async () => {
    if (!order) return;
    
    try {
      setLoadingAffiliate(true);
      const details = await orderService.getOrderAffiliate(order.id);
      setAffiliateDetails(details);
    } catch (error: any) {
      console.error('Failed to fetch affiliate details:', error);
      // Don't show error toast as affiliate might simply not be assigned
    } finally {
      setLoadingAffiliate(false);
    }
  };

  if (!order) return null;

  const handleDeleteOrder = async () => {
    try {
      setIsDeleting(true);
      await orderService.deleteOrder(order.id);
      
      toast({
        title: "Order deleted",
        description: `Order #${order.id} has been successfully deleted.`,
      });
      
      onOpenChange(false);
      onOrderDeleted?.();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    });
  };

  const exportOrderDetails = () => {
    // Create readable text format
    const lines = [
      "ORDER DETAILS",
      "=".repeat(80),
      "",
      "ORDER INFORMATION",
      `-${"".padEnd(78, "-")}`,
      `WooCommerce Order ID: ${order.woo_order_id || order.id}`,
      `Internal Order ID: ${order.id}`,
      `Date Created: ${format(new Date(order.date_created), "PPP")}`,
      `Status: ${order.status}`,
      `Payment Status: ${order.payment_status}`,
      `Payment Method: ${order.payment_method || 'Not specified'}`,
      `Currency: ${order.currency}`,
      order.transaction_id ? `Transaction ID: ${order.transaction_id}` : null,
      order.user ? `User ID: ${order.user}` : null,
      "",
      "CUSTOMER INFORMATION",
      `-${"".padEnd(78, "-")}`,
      `Name: ${order.customer_name}`,
      `Email: ${order.customer_email}`,
      `IP Address: ${order.customer_ip}`,
      "",
      "BILLING ADDRESS",
      `-${"".padEnd(78, "-")}`,
      `${order.billing_address.first_name} ${order.billing_address.last_name}`,
      order.billing_address.company ? order.billing_address.company : null,
      order.billing_address.address_line_1,
      order.billing_address.address_line_2 || null,
      `${order.billing_address.city}${order.billing_address.state ? `, ${order.billing_address.state}` : ''}${order.billing_address.postcode ? ` ${order.billing_address.postcode}` : ''}`,
      order.billing_address.country,
      order.billing_address.phone ? `Phone: ${order.billing_address.phone}` : null,
      `Email: ${order.billing_address.email}`,
      "",
      "PRODUCT DETAILS",
      `-${"".padEnd(78, "-")}`,
      `Product: ${order.product_name}`,
      `Quantity: ${order.quantity}`,
      `Unit Cost: $${order.cost}`,
      `Total: $${order.total_usd}`,
      "",
      "FINANCIAL BREAKDOWN",
      `-${"".padEnd(78, "-")}`,
      `Items Subtotal: $${order.items_subtotal_usd}`,
      order.coupons_discount_usd !== "0.00" ? `Discount: -$${order.coupons_discount_usd}` : null,
      `Order Total: $${order.order_total_usd}`,
      `Amount Paid: $${order.paid_usd}`,
      "",
      order.challenge_name || order.challenge_broker_type || order.challenge_account_size ? "CHALLENGE DETAILS" : null,
      order.challenge_name || order.challenge_broker_type || order.challenge_account_size ? `-${"".padEnd(78, "-")}` : null,
      order.challenge_name ? `Challenge Name: ${order.challenge_name}` : null,
      order.challenge_broker_type ? `Broker Type: ${order.challenge_broker_type.toUpperCase()}` : null,
      order.challenge_account_size ? `Account Size: $${Number(order.challenge_account_size).toLocaleString()}` : null,
      order.challenge_name || order.challenge_broker_type || order.challenge_account_size ? "" : null,
      order.mt5_account_id ? "MT5 ACCOUNT DETAILS" : null,
      order.mt5_account_id ? `-${"".padEnd(78, "-")}` : null,
      order.mt5_account_id ? `Account ID: ${order.mt5_account_id}` : null,
      order.mt5_password ? `Master Password: ${order.mt5_password}` : null,
      order.mt5_investor_password ? `Investor Password: ${order.mt5_investor_password}` : null,
      order.mt5_account_id ? "" : null,
      affiliateDetails?.affiliate_username ? "AFFILIATE INFORMATION" : null,
      affiliateDetails?.affiliate_username ? `-${"".padEnd(78, "-")}` : null,
      affiliateDetails?.affiliate_username ? `Affiliate User: ${affiliateDetails.affiliate_username}` : null,
      affiliateDetails?.referral_code ? `Referral Code: ${affiliateDetails.referral_code}` : null,
      affiliateDetails?.affiliate_username ? "" : null,
      order.coupon_codes && order.coupon_codes.length > 0 ? "COUPON CODES USED" : null,
      order.coupon_codes && order.coupon_codes.length > 0 ? `-${"".padEnd(78, "-")}` : null,
      order.coupon_codes && order.coupon_codes.length > 0 ? order.coupon_codes.join(", ") : null,
      order.coupon_codes && order.coupon_codes.length > 0 ? "" : null,
      "=".repeat(80),
      `Export generated on: ${format(new Date(), "PPP 'at' p")}`,
    ];

    // Filter out null values and join
    const content = lines.filter(line => line !== null).join("\n");

    // Download as text file
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `order_${order.woo_order_id || order.id}_${format(new Date(), "yyyy-MM-dd")}.txt`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Order exported",
      description: "Order details have been downloaded",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-blue-500 border-blue-500">Processing</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-500 border-amber-500">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'refunded':
        return <Badge className="bg-gray-500">Refunded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-500 border-amber-500">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-gray-500">Refunded</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Order Details - #{order.woo_order_id || order.id}</DialogTitle>
            <Button
              onClick={exportOrderDetails}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Order Information</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Date:</span> {format(new Date(order.date_created), 'PPP')}</div>
                <div><span className="font-medium">Status:</span> {getStatusBadge(order.status)}</div>
                <div><span className="font-medium">Payment Status:</span> {getPaymentStatusBadge(order.payment_status)}</div>
                <div><span className="font-medium">Payment Method:</span> <span className="capitalize">{order.payment_method || 'Not specified'}</span></div>
                <div><span className="font-medium">Currency:</span> {order.currency}</div>
                {order.transaction_id && (
                  <div><span className="font-medium">Transaction ID:</span> {order.transaction_id}</div>
                )}
                {order.user && (
                  <div><span className="font-medium">User ID:</span> <code className="text-xs bg-muted px-1 rounded">{order.user}</code></div>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Customer Information</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Name:</span> {order.customer_name}</div>
                <div><span className="font-medium">Email:</span> {order.customer_email}</div>
                <div><span className="font-medium">IP Address:</span> {order.customer_ip}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Product Information */}
          <div>
            <h3 className="font-semibold mb-2">Product Details</h3>
            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Product:</span> {order.product_name}</div>
                <div><span className="font-medium">Quantity:</span> {order.quantity}</div>
                <div><span className="font-medium">Unit Cost:</span> ${order.cost}</div>
                <div><span className="font-medium">Total:</span> ${order.total_usd}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* WooCommerce Integration Details */}
          {(order.woo_order_id || order.woo_order_number || order.woo_order_key || order.woo_customer_id) && (
            <>
              <div>
                <h3 className="font-semibold mb-2">WooCommerce Integration</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {order.woo_order_id && (
                      <div><span className="font-medium">WooCommerce Order ID:</span> {order.woo_order_id}</div>
                    )}
                    {order.woo_order_number && (
                      <div><span className="font-medium">Order Number:</span> {order.woo_order_number}</div>
                    )}
                    {order.woo_order_key && (
                      <div><span className="font-medium">Order Key:</span> <code className="text-xs bg-background px-1 rounded">{order.woo_order_key}</code></div>
                    )}
                    {order.woo_customer_id && (
                      <div><span className="font-medium">WooCommerce Customer ID:</span> {order.woo_customer_id}</div>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Challenge/Account Metadata */}
          {(order.challenge_name || order.challenge_broker_type || order.challenge_account_size) && (
            <>
              <div>
                <h3 className="font-semibold mb-2">Challenge Details</h3>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {order.challenge_name && (
                      <div><span className="font-medium">Challenge Name:</span> {order.challenge_name}</div>
                    )}
                    {order.challenge_broker_type && (
                      <div><span className="font-medium">Broker Type:</span> <span className="uppercase">{order.challenge_broker_type}</span></div>
                    )}
                    {order.challenge_account_size && (
                      <div><span className="font-medium">Account Size:</span> ${Number(order.challenge_account_size).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Complete Billing Address */}
          <div>
            <h3 className="font-semibold mb-2">Complete Billing Address</h3>
            <div className="bg-muted p-4 rounded-lg text-sm space-y-1">
              <div className="font-medium">{order.billing_address.first_name} {order.billing_address.last_name}</div>
              {order.billing_address.company && (
                <div className="text-muted-foreground">{order.billing_address.company}</div>
              )}
              <div>{order.billing_address.address_line_1}</div>
              {order.billing_address.address_line_2 && <div>{order.billing_address.address_line_2}</div>}
              <div>
                {order.billing_address.city}
                {order.billing_address.state && `, ${order.billing_address.state}`}
                {order.billing_address.postcode && ` ${order.billing_address.postcode}`}
              </div>
              <div className="font-medium">{getCountryNameSafe(order.billing_address.country)}</div>
              {order.billing_address.phone && (
                <div className="mt-2">
                  <span className="font-medium">Phone:</span> {order.billing_address.phone}
                </div>
              )}
              <div className="mt-2">
                <span className="font-medium">Email:</span> {order.billing_address.email}
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Details */}
          <div>
            <h3 className="font-semibold mb-2">Financial Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span>${order.items_subtotal_usd}</span>
              </div>
              {order.coupons_discount_usd !== "0.00" && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-${order.coupons_discount_usd}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Order Total:</span>
                <span>${order.order_total_usd}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span>${order.paid_usd}</span>
              </div>
            </div>
          </div>

          {/* Affiliate Information */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Affiliate Information</h3>
              {loadingAffiliate && (
                <div className="text-xs text-muted-foreground">Loading...</div>
              )}
            </div>
            <div className="bg-muted p-4 rounded-lg">
              {affiliateDetails?.affiliate_username ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Affiliate User:</span> {affiliateDetails.affiliate_username}
                  </div>
                  {affiliateDetails.referral_code && (
                    <div>
                      <span className="font-medium">Referral Code:</span>
                      <Badge variant="outline" className="ml-2">{affiliateDetails.referral_code}</Badge>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge className="ml-2 bg-green-500">Assigned</Badge>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Not Assigned</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowAssignAffiliateDialog(true)}
                    disabled={loadingAffiliate}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign Affiliate
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Coupon Codes */}
          {order.coupon_codes && order.coupon_codes.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Coupon Codes Used</h3>
                <div className="flex gap-2">
                  {order.coupon_codes.map((code, index) => (
                    <Badge key={index} variant="outline">{code}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tracking Metadata */}
          {order.tracking_metadata && Object.keys(order.tracking_metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg">
                    <h3 className="font-semibold">Tracking Metadata</h3>
                    <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="bg-muted p-4 rounded-lg mt-2">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(order.tracking_metadata, null, 2)}
                      </pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </>
          )}

          {/* MT5 Trading Account Details */}
          {(order.mt5_account_id || order.mt5_payload_sent || order.mt5_response) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">MT5 Trading Account</h3>
                <div className="space-y-4">
                  {order.mt5_account_id && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-3 text-green-600">Account Created Successfully</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Account ID:</span>
                          <div className="mt-1 p-2 bg-background rounded border font-mono text-primary flex items-center justify-between">
                            <span>{order.mt5_account_id}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(order.mt5_account_id || '', 'Account ID')}
                              className="ml-2"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {order.mt5_password && (
                          <div>
                            <span className="font-medium">Master Password:</span>
                            <div className="mt-1 p-2 bg-background rounded border font-mono flex items-center justify-between">
                              <span>{showMT5Password ? order.mt5_password : '••••••••'}</span>
                              <div className="flex gap-1 ml-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowMT5Password(!showMT5Password)}
                                >
                                  {showMT5Password ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(order.mt5_password || '', 'Master Password')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        {order.mt5_investor_password && (
                          <div className="md:col-span-2">
                            <span className="font-medium">Investor Password (Read-Only):</span>
                            <div className="mt-1 p-2 bg-background rounded border font-mono flex items-center justify-between">
                              <span>{showInvestorPassword ? order.mt5_investor_password : '••••••••'}</span>
                              <div className="flex gap-1 ml-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowInvestorPassword(!showInvestorPassword)}
                                >
                                  {showInvestorPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyToClipboard(order.mt5_investor_password || '', 'Investor Password')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {order.mt5_payload_sent && Object.keys(order.mt5_payload_sent).length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg">
                        <h4 className="font-medium">MT5 API Request Payload</h4>
                        <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="bg-muted p-4 rounded-lg mt-2">
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                            {JSON.stringify(order.mt5_payload_sent, null, 2)}
                          </pre>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  
                  {order.mt5_response && Object.keys(order.mt5_response).length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg">
                        <h4 className="font-medium">MT5 API Response</h4>
                        <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="bg-muted p-4 rounded-lg mt-2">
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                            {JSON.stringify(order.mt5_response, null, 2)}
                          </pre>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Raw Data */}
          {order.raw_data && (
            <>
              <Separator />
              <div>
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-lg">
                    <h3 className="font-semibold">Raw Order Data</h3>
                    <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="bg-muted p-4 rounded-lg mt-2">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(order.raw_data, null, 2)}
                      </pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter className="flex justify-between items-center">
          <div className="flex-1" />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete Order'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Order</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete order #{order.id}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteOrder}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Order
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>

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
