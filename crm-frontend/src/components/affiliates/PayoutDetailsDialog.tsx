import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DollarSign, Clock, CheckCircle, FileText, Hash, User } from 'lucide-react';
import { AffiliatePayout } from '@/services/affiliateService';

interface PayoutDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout: AffiliatePayout | null;
}

export const PayoutDetailsDialog: React.FC<PayoutDetailsDialogProps> = ({
  open,
  onOpenChange,
  payout,
}) => {
  if (!payout) return null;

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">{status}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{status}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Payout Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Amount and Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Amount
                  </Label>
                  <div className="text-2xl font-bold text-green-600">
                    ${payout.amount.toLocaleString()}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(payout.status)}
                    {getStatusBadge(payout.status)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Affiliate and Type */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Affiliate ID
                  </Label>
                  <div className="font-medium">{payout.affiliate}</div>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Badge variant={payout.is_manual ? 'secondary' : 'outline'}>
                    {payout.is_manual ? 'Manual' : 'Automatic'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Requested At
                  </Label>
                  <div className="space-y-1">
                    <div>{new Date(payout.requested_at).toLocaleDateString()}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(payout.requested_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Processed At
                  </Label>
                  {payout.processed_at ? (
                    <div className="space-y-1">
                      <div>{new Date(payout.processed_at).toLocaleDateString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(payout.processed_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">Not processed yet</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction ID */}
          {payout.transaction_id && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Transaction ID
                  </Label>
                  <code className="bg-muted px-3 py-2 rounded text-sm block">
                    {payout.transaction_id}
                  </code>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {payout.notes && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </Label>
                  <div className="bg-muted p-3 rounded text-sm">
                    {payout.notes}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};