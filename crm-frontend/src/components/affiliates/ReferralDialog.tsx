import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AffiliateReferral } from '@/services/affiliateService';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referral?: AffiliateReferral | null;
  onSubmit: (data: Partial<AffiliateReferral>) => Promise<void>;
  isLoading?: boolean;
}

const ReferralDialog: React.FC<ReferralDialogProps> = ({
  open,
  onOpenChange,
  referral,
  onSubmit,
  isLoading = false
}) => {
  const { register, handleSubmit, setValue, watch, reset } = useForm<Partial<AffiliateReferral>>({
    defaultValues: {
      affiliate_id: '',
      affiliate_username: '',
      affiliate_email: '',
      referred_user_id: '',
      referred_username: '',
      referred_email: '',
      challenge_name: '',
      commission_amount: 0,
      commission_status: 'pending',
      note: ''
    }
  });

  React.useEffect(() => {
    if (referral) {
      setValue('affiliate_id', referral.affiliate_id);
      setValue('affiliate_username', referral.affiliate_username);
      setValue('affiliate_email', referral.affiliate_email);
      setValue('referred_user_id', referral.referred_user_id);
      setValue('referred_username', referral.referred_username);
      setValue('referred_email', referral.referred_email);
      setValue('challenge_name', referral.challenge_name);
      setValue('commission_amount', referral.commission_amount);
      setValue('commission_status', referral.commission_status);
      setValue('note', referral.note || '');
    } else {
      reset();
    }
  }, [referral, setValue, reset]);

  const commissionStatus = watch('commission_status');

  const handleFormSubmit = async (data: Partial<AffiliateReferral>) => {
    await onSubmit(data);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {referral ? 'Edit Referral' : 'Create New Referral'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="affiliate_username">Affiliate Username *</Label>
              <Input
                id="affiliate_username"
                {...register('affiliate_username', { required: true })}
                placeholder="Enter affiliate username"
              />
            </div>

            <div>
              <Label htmlFor="affiliate_email">Affiliate Email</Label>
              <Input
                id="affiliate_email"
                type="email"
                {...register('affiliate_email')}
                placeholder="Enter affiliate email"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="referred_username">Referred Username *</Label>
              <Input
                id="referred_username"
                {...register('referred_username', { required: true })}
                placeholder="Enter referred username"
              />
            </div>

            <div>
              <Label htmlFor="referred_email">Referred Email</Label>
              <Input
                id="referred_email"
                type="email"
                {...register('referred_email')}
                placeholder="Enter referred email"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="challenge_name">Challenge Name *</Label>
            <Input
              id="challenge_name"
              {...register('challenge_name', { required: true })}
              placeholder="Enter challenge name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="commission_amount">Commission Amount *</Label>
              <Input
                id="commission_amount"
                type="number"
                step="0.01"
                {...register('commission_amount', { required: true, min: 0 })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="commission_status">Commission Status</Label>
              <Select
                value={commissionStatus}
                onValueChange={(value) => setValue('commission_status', value as 'pending' | 'approved' | 'rejected')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="note">Notes</Label>
            <Textarea
              id="note"
              {...register('note')}
              placeholder="Optional notes about this referral"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {referral ? 'Update' : 'Create'} Referral
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReferralDialog;