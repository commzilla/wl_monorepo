import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { toast } from 'sonner';
import { ArrowUpDown, Loader2 } from 'lucide-react';

interface ManualUpgradeDialogProps {
  enrollmentId: string;
  currentStatus: string;
}

const STATUS_OPTIONS = [
  { value: 'phase_1_in_progress', label: 'Phase 1 - In Progress' },
  { value: 'phase_1_passed', label: 'Phase 1 - Passed' },
  { value: 'phase_2_in_progress', label: 'Phase 2 - In Progress' },
  { value: 'phase_2_passed', label: 'Phase 2 - Passed' },
  { value: 'live_in_progress', label: 'Live - In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'payout_limit_reached', label: 'Payout Limit Reached' },
];

const ManualUpgradeDialog: React.FC<ManualUpgradeDialogProps> = ({
  enrollmentId,
  currentStatus,
}) => {
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      enrollmentReviewService.manualUpgrade(enrollmentId, {
        new_status: newStatus,
        reason: reason || 'Admin override',
      }),
    onSuccess: (data) => {
      toast.success('Status updated successfully', {
        description: `Changed from ${data.from_status} to ${data.to_status}`,
      });
      queryClient.invalidateQueries({ queryKey: ['enrollment-review', enrollmentId] });
      setOpen(false);
      setNewStatus('');
      setReason('');
    },
    onError: (error: any) => {
      toast.error('Failed to update status', {
        description: error.message || 'An error occurred',
      });
    },
  });

  const handleSubmit = () => {
    if (!newStatus) {
      toast.error('Please select a new status');
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          Manual Upgrade
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manual Status Upgrade</DialogTitle>
          <DialogDescription>
            Manually change the enrollment status. This will trigger the appropriate transitions and log the change.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Status</Label>
            <div className="px-3 py-2 bg-muted rounded-md text-sm">
              {STATUS_OPTIONS.find(opt => opt.value === currentStatus)?.label || currentStatus}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-status">New Status *</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger id="new-status">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.value === currentStatus}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for status change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualUpgradeDialog;
