import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { payoutPolicyService } from '@/services/payoutPolicyService';
import { challengeService } from '@/services/challengeService';
import type { PayoutPolicy, CreatePayoutPolicyData } from '@/lib/types/payoutPolicy';

const payoutPolicySchema = z.object({
  challenge: z.string().min(1, 'Challenge is required'),
  first_payout_delay_days: z.number().min(0, 'Must be 0 or greater'),
  subsequent_cycle_days: z.number().min(1, 'Must be at least 1 day'),
  min_net_amount: z.string().min(1, 'Minimum amount is required'),
  base_share_percent: z.string().min(1, 'Base share is required'),
  is_active: z.boolean(),
  max_payouts: z.number().min(0, 'Must be 0 or greater'),
  min_trading_days: z.number().min(0, 'Must be 0 or greater'),
});

type PayoutPolicyForm = z.infer<typeof payoutPolicySchema>;

interface PayoutPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: PayoutPolicy | null;
}

export const PayoutPolicyDialog: React.FC<PayoutPolicyDialogProps> = ({
  open,
  onOpenChange,
  policy,
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!policy;

  const form = useForm<PayoutPolicyForm>({
    resolver: zodResolver(payoutPolicySchema),
    defaultValues: {
      challenge: '',
      first_payout_delay_days: 14,
      subsequent_cycle_days: 14,
      min_net_amount: '50.00',
      base_share_percent: '80.00',
      is_active: true,
      max_payouts: 0,
      min_trading_days: 0,
    },
  });

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => challengeService.getChallenges(),
  });

  useEffect(() => {
    if (policy) {
      form.reset({
        challenge: policy.challenge?.toString(),
        first_payout_delay_days: policy.first_payout_delay_days,
        subsequent_cycle_days: policy.subsequent_cycle_days,
        min_net_amount: policy.min_net_amount,
        base_share_percent: policy.base_share_percent,
        is_active: policy.is_active,
        max_payouts: policy.max_payouts,
        min_trading_days: policy.min_trading_days,
      });
    } else {
      form.reset({
        challenge: '',
        first_payout_delay_days: 14,
        subsequent_cycle_days: 14,
        min_net_amount: '50.00',
        base_share_percent: '80.00',
        is_active: true,
        max_payouts: 0,
        min_trading_days: 0,
      });
    }
  }, [policy, form]);

  const createMutation = useMutation({
    mutationFn: (data: CreatePayoutPolicyData) => payoutPolicyService.createPayoutPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-policies'] });
      toast.success('Payout policy created successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to create payout policy: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CreatePayoutPolicyData) => 
      payoutPolicyService.updatePayoutPolicy(policy!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-policies'] });
      toast.success('Payout policy updated successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to update payout policy: ' + error.message);
    },
  });

  const onSubmit = (data: PayoutPolicyForm) => {
    const submitData = data as CreatePayoutPolicyData;
    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Payout Policy' : 'Create Payout Policy'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="challenge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Challenge</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a challenge" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-50 bg-background">
                      {challenges.map((challenge) => (
                        <SelectItem key={challenge.id} value={challenge.id.toString()}>
                          {challenge.name} ({challenge.step_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_payout_delay_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Payout Delay (Days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
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
                name="subsequent_cycle_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subsequent Cycle Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="max_payouts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Payouts (0 = Unlimited)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      Maximum paid payouts allowed per account. 0 means unlimited.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_trading_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Trading Days (0 = No Restriction)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      Minimum unique trading days required before payout. 0 means no restriction.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_net_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Net Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="base_share_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Share Percent (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable this payout policy
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                  ? 'Update Policy'
                  : 'Create Policy'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};