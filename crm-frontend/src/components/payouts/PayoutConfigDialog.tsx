
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';

const payoutConfigSchema = z.object({
  enrollment: z.string().min(1, 'Enrollment is required'),
  config_type: z.enum(['default', 'custom']),
  live_trading_start_date: z.string().min(1, 'Start date is required'),
  profit_share_percent: z.string().optional(),
  payment_cycle: z.enum(['monthly', 'biweekly', 'custom_days', 'custom_interval']),
  custom_cycle_days: z.number().optional(),
  custom_payout_days: z.array(z.number()).optional(),
  first_payout_delay_days: z.number().optional(),
  subsequent_cycle_days: z.number().optional(),
  min_net_amount: z.string().optional(),
  base_share_percent: z.string().optional(),
  is_active: z.boolean(),
  notes: z.string().optional(),
});

type PayoutConfigForm = z.infer<typeof payoutConfigSchema>;

interface PayoutConfiguration {
  id: string;
  enrollment: string;
  client_name: string;
  client_email: string;
  challenge_name: string;
  mt5_account_id: string;
  account_size: number;
  config_type: 'default' | 'custom';
  live_trading_start_date: string;
  profit_share_percent: string | null;
  payment_cycle: 'monthly' | 'biweekly' | 'custom_days' | 'custom_interval';
  custom_cycle_days: number | null;
  custom_payout_days: number[] | null;
  first_payout_delay_days: number | null;
  subsequent_cycle_days: number | null;
  min_net_amount: string | null;
  base_share_percent: string | null;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  trader_share_percent: number | null;
}

interface User {
  id: string;
  user_id?: string; // UUID field for payout config
  username: string;
  email: string;
  role: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
}

interface PayoutConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: PayoutConfiguration | null;
}

const PayoutConfigDialog: React.FC<PayoutConfigDialogProps> = ({
  open,
  onOpenChange,
  config,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!config;

  const form = useForm<PayoutConfigForm>({
    resolver: zodResolver(payoutConfigSchema),
    defaultValues: {
      enrollment: '',
      config_type: 'default',
      live_trading_start_date: '',
      profit_share_percent: '',
      payment_cycle: 'monthly',
      custom_cycle_days: undefined,
      custom_payout_days: undefined,
      first_payout_delay_days: undefined,
      subsequent_cycle_days: undefined,
      min_net_amount: '',
      base_share_percent: '',
      is_active: true,
      notes: '',
    },
  });

  // Fetch clients for dropdown selection
  const { data: users = [] } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: async () => {
      const response = await apiService.get<User[]>('/admin/clients-dropdown/');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (config) {
      form.reset({
        enrollment: config.enrollment,
        config_type: config.config_type,
        live_trading_start_date: config.live_trading_start_date,
        profit_share_percent: config.profit_share_percent || '',
        payment_cycle: config.payment_cycle,
        custom_cycle_days: config.custom_cycle_days || undefined,
        custom_payout_days: config.custom_payout_days || undefined,
        first_payout_delay_days: config.first_payout_delay_days || undefined,
        subsequent_cycle_days: config.subsequent_cycle_days || undefined,
        min_net_amount: config.min_net_amount || '',
        base_share_percent: config.base_share_percent || '',
        is_active: config.is_active,
        notes: config.notes || '',
      });
    } else {
      form.reset({
        enrollment: '',
        config_type: 'default',
        live_trading_start_date: '',
        profit_share_percent: '',
        payment_cycle: 'monthly',
        custom_cycle_days: undefined,
        custom_payout_days: undefined,
        first_payout_delay_days: undefined,
        subsequent_cycle_days: undefined,
        min_net_amount: '',
        base_share_percent: '',
        is_active: true,
        notes: '',
      });
    }
  }, [config, form]);

  const createMutation = useMutation({
    mutationFn: async (data: PayoutConfigForm) => {
      const payload = {
        ...data,
        profit_share_percent: data.profit_share_percent ? parseFloat(data.profit_share_percent) : null,
        min_net_amount: data.min_net_amount ? parseFloat(data.min_net_amount) : null,
        base_share_percent: data.base_share_percent ? parseFloat(data.base_share_percent) : null,
      };
      const response = await apiService.post('/payout-configs/', payload);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-configs'] });
      toast({
        title: "Success",
        description: "Payout configuration created successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PayoutConfigForm) => {
      const payload = {
        ...data,
        profit_share_percent: data.profit_share_percent ? parseFloat(data.profit_share_percent) : null,
        min_net_amount: data.min_net_amount ? parseFloat(data.min_net_amount) : null,
        base_share_percent: data.base_share_percent ? parseFloat(data.base_share_percent) : null,
      };
      const response = await apiService.put(`/payout-configs/${config!.id}/`, payload);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-configs'] });
      toast({
        title: "Success",
        description: "Payout configuration updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PayoutConfigForm) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const profitShareValue = form.watch('profit_share_percent');
  const configType = form.watch('config_type');
  const paymentCycle = form.watch('payment_cycle');
  const exampleShare = profitShareValue ? (1000 * parseFloat(profitShareValue)) / 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Payout Configuration' : 'Create Payout Configuration'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="enrollment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enrollment / Trader</FormLabel>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input value={`${config?.client_name} - ${config?.mt5_account_id}`} readOnly disabled />
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Email: {config?.client_email}</div>
                          <div>Challenge: {config?.challenge_name}</div>
                          <div>This cannot be changed when editing.</div>
                        </div>
                      </div>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an enrollment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-50 bg-background border shadow-lg">
                          {users.map((user) => (
                            <SelectItem key={user.id} value={String(user.id)}>
                              {user.full_name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="config_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Configuration Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select configuration type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-50 bg-background border shadow-lg">
                        <SelectItem value="default">Default (Policy Driven)</SelectItem>
                        <SelectItem value="custom">Custom (Client Override)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="live_trading_start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Live Trading Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {configType === 'custom' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="profit_share_percent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profit Share Percentage</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            max="100" 
                            placeholder="80.00"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          {profitShareValue ? `Example: On $1000 profit, trader gets $${exampleShare.toFixed(2)}` : 'Leave blank to use policy rules'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="base_share_percent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Share Percentage</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            max="100" 
                            placeholder="80.00"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Base share percent for custom configuration
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_payout_delay_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Payout Delay (Days)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            placeholder="30"
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Days until first payout is allowed
                        </FormDescription>
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
                            min="0" 
                            placeholder="30"
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Days between subsequent payouts
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="min_net_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Net Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="100.00"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum net amount after split for payout eligibility
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payment_cycle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Cycle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment cycle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-50 bg-background border shadow-lg">
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="biweekly">Biweekly</SelectItem>
                        <SelectItem value="custom_days">Custom Days in Month</SelectItem>
                        <SelectItem value="custom_interval">Custom Interval</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {paymentCycle === 'custom_interval' && (
                <FormField
                  control={form.control}
                  name="custom_cycle_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Cycle Days</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          placeholder="30"
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of days between payouts
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Configuration</FormLabel>
                    <FormDescription>
                      Enable this payout configuration for the trader
                    </FormDescription>
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional notes or admin remarks..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : isEditing
                  ? 'Update Configuration'
                  : 'Create Configuration'
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PayoutConfigDialog;
