import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { payoutHistoryService } from '@/services/payoutHistoryService';
import { Loader2 } from 'lucide-react';

interface ManualPayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
}

interface ManualPayoutFormData {
  total_profit: string;
  profit_share: string;
  method: 'crypto' | 'rise';
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  admin_note: string;
  method_details: Record<string, any>;
}

const ManualPayoutDialog: React.FC<ManualPayoutDialogProps> = ({
  open,
  onOpenChange,
  enrollmentId
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<ManualPayoutFormData>({
    total_profit: '',
    profit_share: '',
    method: 'rise',
    status: 'pending',
    admin_note: '',
    method_details: {}
  });

  const createMutation = useMutation({
    mutationFn: () => payoutHistoryService.createManualPayout(enrollmentId, {
      amount: parseFloat(formData.total_profit),
      profit: parseFloat(formData.total_profit),
      profit_share: parseFloat(formData.profit_share),
      method: formData.method,
      status: formData.status,
      admin_note: formData.admin_note,
      method_details: formData.method_details
    }),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Manual payout record created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['payout-history', enrollmentId] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create payout record',
        variant: 'destructive',
      });
    }
  });

  const resetForm = () => {
    setFormData({
      total_profit: '',
      profit_share: '',
      method: 'rise',
      status: 'pending',
      admin_note: '',
      method_details: {}
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.total_profit || !formData.profit_share || !formData.method) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (parseFloat(formData.total_profit) <= 0 || parseFloat(formData.profit_share) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Total profit and profit share must be positive numbers',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate();
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Manual Payout Record</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="total_profit">Total Profit (Excluding Profit Share) *</Label>
            <Input
              id="total_profit"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.total_profit}
              onChange={(e) => setFormData({ ...formData, total_profit: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profit_share">Profit Share (%) *</Label>
            <Input
              id="profit_share"
              type="number"
              step="0.01"
              placeholder="80"
              value={formData.profit_share}
              onChange={(e) => setFormData({ ...formData, profit_share: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method *</Label>
            <Select
              value={formData.method}
              onValueChange={(value: any) => setFormData({ ...formData, method: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rise">Rise</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value: any) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_note">Admin Note</Label>
            <Textarea
              id="admin_note"
              placeholder="Optional notes about this payout..."
              value={formData.admin_note}
              onChange={(e) => setFormData({ ...formData, admin_note: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Payout Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ManualPayoutDialog;
