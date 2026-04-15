import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { affiliateService } from '@/services/affiliateService';
import { AffiliateCommissionTier, CreateAffiliateCommissionTierData, UpdateAffiliateCommissionTierData } from '@/types/affiliate';
import { useToast } from '@/hooks/use-toast';

interface AffiliateTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: AffiliateCommissionTier | null;
}

const AffiliateTierDialog = ({ open, onOpenChange, tier }: AffiliateTierDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!tier;

  const form = useForm<CreateAffiliateCommissionTierData>({
    defaultValues: {
      name: tier?.name || '',
      min_referrals: tier?.min_referrals || 0,
      max_referrals: tier?.max_referrals || undefined,
      commission_rate: tier?.commission_rate || 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: affiliateService.createAffiliateTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-tiers'] });
      toast({
        title: 'Success',
        description: 'Affiliate tier created successfully',
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAffiliateCommissionTierData }) =>
      affiliateService.updateAffiliateTier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-tiers'] });
      toast({
        title: 'Success',
        description: 'Affiliate tier updated successfully',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CreateAffiliateCommissionTierData) => {
    if (isEdit && tier) {
      updateMutation.mutate({ id: tier.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Reset form when dialog opens/closes or tier changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        name: tier?.name || '',
        min_referrals: tier?.min_referrals || 0,
        max_referrals: tier?.max_referrals || undefined,
        commission_rate: tier?.commission_rate || 0,
      });
    }
  }, [open, tier, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Affiliate Tier' : 'Create Affiliate Tier'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the affiliate tier configuration'
              : 'Create a new affiliate commission tier based on referral volume'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tier Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bronze, Silver, Gold" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_referrals"
                rules={{
                  required: 'Minimum referrals is required',
                  min: { value: 0, message: 'Must be 0 or greater' }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Referrals</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_referrals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Referrals (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Leave blank for unlimited"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="commission_rate"
              rules={{
                required: 'Commission rate is required',
                min: { value: 0, message: 'Must be 0 or greater' },
                max: { value: 100, message: 'Must be 100 or less' }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="5.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : isEdit
                  ? 'Update Tier'
                  : 'Create Tier'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AffiliateTierDialog;