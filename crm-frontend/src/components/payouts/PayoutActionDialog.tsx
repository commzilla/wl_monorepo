import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { payoutService, PayoutActionData } from '@/services/payoutService';
import { ComplianceAnalysis } from '@/lib/types/complianceAnalysis';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useInternalNotes } from '@/hooks/useInternalNotes';

interface PayoutActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  payoutId: string;
  traderName: string;
  complianceAnalysis?: ComplianceAnalysis | null;
  traderId?: number;
}

export const PayoutActionDialog: React.FC<PayoutActionDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  payoutId,
  traderName,
  complianceAnalysis,
  traderId,
}) => {
  const [action, setAction] = useState<'approved' | 'rejected'>('approved');
  const [notesReviewed, setNotesReviewed] = useState(false);
  const { summary: notesSummary } = useInternalNotes(traderId);
  const [adminNote, setAdminNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [excludeAmount, setExcludeAmount] = useState<number | ''>('');
  const [excludeReason, setExcludeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Get AI recommended amount from compliance analysis
  const aiRecommendedAmount = complianceAnalysis?.payout_adjustments?.reduced_amount || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (action === 'rejected' && !rejectionReason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Rejection reason is required when rejecting a payout.',
        variant: 'destructive',
      });
      return;
    }

    if (isCustomAmount && !excludeAmount) {
      toast({
        title: 'Validation Error',
        description: 'Exclude amount is required when custom amount is enabled.',
        variant: 'destructive',
      });
      return;
    }

    if (isCustomAmount && !excludeReason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Exclude reason is required when custom amount is enabled.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const data: PayoutActionData = {
        status: action,
        admin_note: adminNote.trim() || undefined,
        rejection_reason: action === 'rejected' ? rejectionReason.trim() : undefined,
        is_custom_amount: isCustomAmount,
        exclude_amount: isCustomAmount ? Number(excludeAmount) : undefined,
        exclude_reason: isCustomAmount ? excludeReason.trim() : undefined,
      };

      await payoutService.updatePayoutAction(payoutId, data);

      toast({
        title: `Payout ${action === 'approved' ? 'Approved' : 'Rejected'}`,
        description: `Payout for ${traderName} has been ${action === 'approved' ? 'approved' : 'rejected'}.`,
        variant: action === 'approved' ? 'default' : 'destructive',
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payout status',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAction('approved');
    setAdminNote('');
    setRejectionReason('');
    setIsCustomAmount(false);
    setExcludeAmount('');
    setExcludeReason('');
    setNotesReviewed(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Payout Action</DialogTitle>
          <DialogDescription>
            Review and take action on the payout request for {traderName}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto px-6">
          <form id="payout-action-form" onSubmit={handleSubmit} className="space-y-6 py-6 pb-4">
            <div className="space-y-4">
              {/* AI Recommendation */}
              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <Label className="text-sm font-medium text-blue-700">AI Risk Engine Recommendation</Label>
                </div>
                <p className="text-lg font-semibold text-blue-900 mt-1">
                  ${aiRecommendedAmount.toFixed(2)} {aiRecommendedAmount > 0 ? 'reduction recommended' : 'no adjustment needed'}
                </p>
              </div>

              <div>
                <Label>Action</Label>
                <RadioGroup value={action} onValueChange={(value: 'approved' | 'rejected') => setAction(value)} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="approved" id="approved" />
                    <Label htmlFor="approved">Approve Payout</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rejected" id="rejected" />
                    <Label htmlFor="rejected">Reject Payout</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="admin_note">Admin Note (Optional)</Label>
                <Textarea
                  id="admin_note"
                  placeholder="Add any additional notes about this decision..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              {action === 'rejected' && (
                <div>
                  <Label htmlFor="rejection_reason">Rejection Reason *</Label>
                  <RichTextEditor
                    id="rejection_reason"
                    value={rejectionReason}
                    onChange={setRejectionReason}
                    placeholder="Please provide a detailed reason for rejecting this payout..."
                    required
                    className="mt-1"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_custom_amount"
                  checked={isCustomAmount}
                  onCheckedChange={setIsCustomAmount}
                />
                <Label htmlFor="is_custom_amount">Custom Amount</Label>
              </div>

              {isCustomAmount && (
                <>
                  <div>
                    <Label htmlFor="exclude_amount">Exclude Amount *</Label>
                    <Input
                      id="exclude_amount"
                      type="number"
                      step="0.01"
                      placeholder="Enter amount to exclude..."
                      value={excludeAmount}
                      onChange={(e) => setExcludeAmount(e.target.value ? parseFloat(e.target.value) : '')}
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="exclude_reason">Exclude Reason *</Label>
                    <Textarea
                      id="exclude_reason"
                      placeholder="Please provide a reason for the custom amount..."
                      value={excludeReason}
                      onChange={(e) => setExcludeReason(e.target.value)}
                      className="mt-1"
                      rows={3}
                      required
                    />
                  </div>
                </>
              )}
            </div>

            {notesSummary && notesSummary.total_count > 0 && (
              <div className="p-4 border rounded-lg bg-amber-50 border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <Label className="text-sm font-medium text-amber-800">
                    Active Notes Review Required ({notesSummary.total_count})
                  </Label>
                </div>
                {notesSummary.has_high_risk && (
                  <Badge variant="destructive" className="text-xs">Contains High Risk Notes</Badge>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notes-reviewed-action"
                    checked={notesReviewed}
                    onCheckedChange={(checked) => setNotesReviewed(checked === true)}
                  />
                  <Label htmlFor="notes-reviewed-action" className="text-sm">
                    I have reviewed all active notes
                  </Label>
                </div>
              </div>
            )}
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="payout-action-form"
            variant={action === 'approved' ? 'default' : 'destructive'}
            disabled={isSubmitting || (!!notesSummary && notesSummary.total_count > 0 && !notesReviewed)}
          >
            {isSubmitting ? 'Processing...' : `${action === 'approved' ? 'Approve' : 'Reject'} Payout`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};