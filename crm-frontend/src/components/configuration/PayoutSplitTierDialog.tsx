import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { payoutPolicyService } from '@/services/payoutPolicyService';
import type { PayoutSplitTier, CreatePayoutSplitTierData } from '@/lib/types/payoutPolicy';

const splitTierSchema = z.object({
  policy: z.string().min(1, 'Policy is required'),
  from_payout_number: z.number().min(1, 'Must be at least 1'),
  to_payout_number: z.number().nullable(),
  share_percent: z.string().min(1, 'Share percent is required'),
  is_unlimited: z.boolean().default(false),
});

type SplitTierForm = z.infer<typeof splitTierSchema>;

interface PayoutSplitTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: PayoutSplitTier | null;
}

export const PayoutSplitTierDialog: React.FC<PayoutSplitTierDialogProps> = ({
  open,
  onOpenChange,
  tier,
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!tier;

  const form = useForm<SplitTierForm>({
    resolver: zodResolver(splitTierSchema),
    defaultValues: {
      policy: '',
      from_payout_number: 1,
      to_payout_number: null,
      share_percent: '80.00',
      is_unlimited: false,
    },
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['payout-policies'],
    queryFn: () => payoutPolicyService.getPayoutPolicies(),
  });

  useEffect(() => {
    if (tier) {
      form.reset({
        policy: tier.policy.toString(),
        from_payout_number: tier.from_payout_number,
        to_payout_number: tier.to_payout_number,
        share_percent: tier.share_percent,
        is_unlimited: tier.to_payout_number === null,
      });
    } else {
      form.reset({
        policy: '',
        from_payout_number: 1,
        to_payout_number: null,
        share_percent: '80.00',
        is_unlimited: false,
      });
    }
  }, [tier, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreatePayoutSplitTierData) => payoutPolicyService.createPayoutSplitTier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-split-tiers'] });
      queryClient.invalidateQueries({ queryKey: ['payout-policies'] });
      toast.success('Split tier created successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to create split tier: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreatePayoutSplitTierData) => 
      payoutPolicyService.updatePayoutSplitTier(tier!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-split-tiers'] });
      queryClient.invalidateQueries({ queryKey: ['payout-policies'] });
      toast.success('Split tier updated successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to update split tier: ' + error.message);
    },
  });

  const onSubmit = (data: SplitTierForm) => {
    const submitData: CreatePayoutSplitTierData = {
      policy: data.policy,
      from_payout_number: data.from_payout_number,
      to_payout_number: data.is_unlimited ? null : data.to_payout_number,
      share_percent: data.share_percent,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isUnlimited = form.watch('is_unlimited');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Split Tier' : 'Create Split Tier'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="policy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payout Policy</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a policy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {policies.map((policy) => (
                        <SelectItem key={policy.id} value={policy.id.toString()}>
                          {policy.challenge_name} ({policy.step_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="from_payout_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Payout #</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="to_payout_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Payout #</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={isUnlimited}
                        placeholder={isUnlimited ? 'Unlimited' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_unlimited"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Unlimited upper range
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      This tier applies to all payouts from the starting number onwards
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="share_percent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Share Percent (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
                  : isEditing
                  ? 'Update Tier'
                  : 'Create Tier'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};