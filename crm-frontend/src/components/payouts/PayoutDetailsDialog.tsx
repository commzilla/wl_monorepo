
import React, { useState } from 'react';
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
import { TraderPayout } from '@/pages/PayoutRequest';

interface PayoutDetailsDialogProps {
  payout: TraderPayout | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (payoutId: string, status: string) => void;
}

const PayoutDetailsDialog: React.FC<PayoutDetailsDialogProps> = ({
  payout,
  isOpen,
  onClose,
  onStatusUpdate,
}) => {
  const [adminNote, setAdminNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  if (!payout) return null;

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "info" | "warning" | "success" => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'approved':
        return 'info';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      case 'pending':
      default:
        return 'warning';
    }
  };

  const renderMethodDetails = () => {
    const details = payout.method_details;
    
    switch (payout.method) {
      case 'paypal':
        return (
          <div className="space-y-2">
            <span className="font-medium">PayPal Email:</span>
            <p className="text-muted-foreground">{details.paypal_email || 'Not provided'}</p>
          </div>
        );
      
      case 'bank':
        return (
          <div className="space-y-3">
            <div>
              <span className="font-medium">Bank Name:</span>
              <p className="text-muted-foreground">{details.bank_name || 'Not provided'}</p>
            </div>
            <div>
              <span className="font-medium">Account Number:</span>
              <p className="text-muted-foreground">
                {details.bank_account ? `***${details.bank_account.slice(-4)}` : 'Not provided'}
              </p>
            </div>
            <div>
              <span className="font-medium">Routing Number:</span>
              <p className="text-muted-foreground">{details.routing_number || 'Not provided'}</p>
            </div>
          </div>
        );
      
      case 'crypto':
        return (
          <div className="space-y-3">
            <div>
              <span className="font-medium">Cryptocurrency:</span>
              <p className="text-muted-foreground">{details.crypto_type || 'BTC'}</p>
            </div>
            <div>
              <span className="font-medium">Wallet Address:</span>
              <p className="text-muted-foreground break-all text-sm">
                {details.crypto_wallet || 'Not provided'}
              </p>
            </div>
          </div>
        );
      
      default:
        return <p className="text-muted-foreground">No payment details available</p>;
    }
  };

  const handleStatusUpdate = () => {
    if (selectedStatus && selectedStatus !== payout.status) {
      onStatusUpdate(payout.id, selectedStatus);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payout Request Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <span className="font-medium">Trader:</span>
                <p className="text-muted-foreground">{payout.trader_username}</p>
              </div>
              
              <div>
                <span className="font-medium">Status:</span>
                <div className="mt-1">
                  <Badge variant={getStatusVariant(payout.status)}>
                    {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                  </Badge>
                </div>
              </div>
              
              <div>
                <span className="font-medium">Requested Amount:</span>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(payout.amount)}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="font-medium">Total Profit:</span>
                <p className="text-muted-foreground">{formatCurrency(payout.profit)}</p>
              </div>
              
              <div>
                <span className="font-medium">Profit Share:</span>
                <p className="text-muted-foreground">{payout.profit_share}%</p>
              </div>
              
              <div>
                <span className="font-medium">Net Profit:</span>
                <p className="text-muted-foreground">{formatCurrency(payout.net_profit)}</p>
              </div>
              
              <div>
                <span className="font-medium">Released Fund:</span>
                <p className="text-muted-foreground">{formatCurrency(payout.released_fund)}</p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
            <div className="space-y-4">
              <div>
                <span className="font-medium">Method:</span>
                <p className="text-muted-foreground capitalize">{payout.method}</p>
              </div>
              {renderMethodDetails()}
            </div>
          </div>

          {/* Timestamps */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Timeline</h3>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Requested:</span>
                <p className="text-muted-foreground">{formatDate(payout.requested_at)}</p>
              </div>
              
              {payout.reviewed_at && (
                <div>
                  <span className="font-medium">Reviewed:</span>
                  <p className="text-muted-foreground">{formatDate(payout.reviewed_at)}</p>
                </div>
              )}
              
              {payout.paid_at && (
                <div>
                  <span className="font-medium">Paid:</span>
                  <p className="text-muted-foreground">{formatDate(payout.paid_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Note */}
          {payout.admin_note && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Admin Note</h3>
              <p className="text-muted-foreground bg-muted p-3 rounded-md">
                {payout.admin_note}
              </p>
            </div>
          )}

          {/* Rejection Reason */}
          {payout.rejection_reason && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Rejection Reason</h3>
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-md">
                <div 
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: payout.rejection_reason
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                      .replace(/^• (.+)$/gm, '<li class="ml-4">$1</li>')
                      .replace(/\n\n/g, '</p><p class="mt-3">')
                      .replace(/^(.+)$/gm, (match) => match.startsWith('<li') || match.startsWith('<strong') ? match : `<p>${match}</p>`)
                      .replace(/<\/p><p class="mt-3"><li/g, '<ul class="list-disc ml-4 space-y-1"><li')
                      .replace(/<\/li><\/p>/g, '</li></ul>')
                  }}
                />
              </div>
            </div>
          )}

          {/* Exclude Amount & Reason */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Exclusions</h3>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Exclude Amount:</span>
                <p className="text-muted-foreground">
                  {payout.exclude_amount ? formatCurrency(payout.exclude_amount) : '$0.00'}
                </p>
              </div>
              <div>
                <span className="font-medium">Exclude Reason:</span>
                <p className="text-muted-foreground bg-muted p-3 rounded-md">
                  {payout.exclude_reason || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Status Update Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Update Status</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select 
                  value={selectedStatus || payout.status} 
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Admin Note</Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add a note about this status change..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={!selectedStatus || selectedStatus === payout.status}
              className="flex-1"
            >
              Update Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayoutDetailsDialog;
