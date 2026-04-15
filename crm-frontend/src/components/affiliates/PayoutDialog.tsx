import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AffiliatePayout, CreateAffiliatePayoutData, UpdateAffiliatePayoutData } from '@/services/affiliateService';

const payoutSchema = z.object({
  affiliate: z.string().min(1, 'Affiliate is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  status: z.enum(['pending', 'approved', 'paid', 'rejected']),
  transaction_id: z.string().optional(),
  is_manual: z.boolean(),
  notes: z.string().optional(),
  processed_at: z.string().optional(),
});

type PayoutFormData = z.infer<typeof payoutSchema>;

interface PayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout?: AffiliatePayout;
  onSubmit: (data: CreateAffiliatePayoutData | UpdateAffiliatePayoutData) => Promise<void>;
  isLoading?: boolean;
}

export const PayoutDialog: React.FC<PayoutDialogProps> = ({
  open,
  onOpenChange,
  payout,
  onSubmit,
  isLoading = false,
}) => {
  const isEdit = !!payout;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PayoutFormData>({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      affiliate: payout?.affiliate || '',
      amount: typeof payout?.amount === 'string' ? parseFloat(payout.amount) : (payout?.amount || 0),
      status: (payout?.status as any) || 'pending',
      transaction_id: payout?.transaction_id || '',
      is_manual: payout?.is_manual || false,
      notes: payout?.notes || '',
      processed_at: payout?.processed_at || '',
    },
  });

  React.useEffect(() => {
    if (payout) {
      reset({
        affiliate: payout.affiliate,
        amount: typeof payout.amount === 'string' ? parseFloat(payout.amount) : payout.amount,
        status: payout.status as any,
        transaction_id: payout.transaction_id || '',
        is_manual: payout.is_manual,
        notes: payout.notes || '',
        processed_at: payout.processed_at || '',
      });
    } else {
      reset({
        affiliate: '',
        amount: 0,
        status: 'pending',
        transaction_id: '',
        is_manual: false,
        notes: '',
        processed_at: '',
      });
    }
  }, [payout, reset]);

  const handleFormSubmit = async (data: PayoutFormData) => {
    const submitData = {
      ...data,
      processed_at: data.processed_at || undefined,
      transaction_id: data.transaction_id || undefined,
      notes: data.notes || undefined,
    };
    
    await onSubmit(submitData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Payout' : 'Create New Payout'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="affiliate">Affiliate ID</Label>
            <Input
              id="affiliate"
              {...register('affiliate')}
              placeholder="Enter affiliate ID"
            />
            {errors.affiliate && (
              <p className="text-sm text-destructive">{errors.affiliate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(value) => setValue('status', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction_id">Transaction ID (Optional)</Label>
            <Input
              id="transaction_id"
              {...register('transaction_id')}
              placeholder="Enter transaction ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="processed_at">Processed Date (Optional)</Label>
            <Input
              id="processed_at"
              type="datetime-local"
              {...register('processed_at')}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_manual"
              checked={watch('is_manual')}
              onCheckedChange={(checked) => setValue('is_manual', checked)}
            />
            <Label htmlFor="is_manual">Manual Payout</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Add any notes about this payout"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEdit ? 'Update Payout' : 'Create Payout'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};