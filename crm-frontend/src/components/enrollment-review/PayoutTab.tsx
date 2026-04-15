import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { payoutConfigurationService } from '@/services/payoutConfigurationService';
import { CreatePayoutConfigurationData, UpdatePayoutConfigurationData } from '@/lib/types/payoutConfiguration';
import { toast } from 'sonner';
import { Settings, DollarSign, Calendar, Percent } from 'lucide-react';

interface PayoutTabProps {
  enrollmentId: string;
}

const PayoutTab: React.FC<PayoutTabProps> = ({ enrollmentId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CreatePayoutConfigurationData>({
    config_type: 'default',
    live_trading_start_date: '',
    payment_cycle: 'monthly',
    is_active: true,
    notes: ''
  });

  const queryClient = useQueryClient();

  const {
    data: payoutConfig,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['payout-configuration', enrollmentId],
    queryFn: () => payoutConfigurationService.getPayoutConfiguration(enrollmentId),
    retry: false,
    throwOnError: false
  });

  console.log('PayoutTab debug:', { payoutConfig, isLoading, error, enrollmentId });

  const createMutation = useMutation({
    mutationFn: async (data: CreatePayoutConfigurationData) => {
      console.log('Creating payout configuration with data:', data);
      try {
        const result = await payoutConfigurationService.createPayoutConfiguration(enrollmentId, data);
        console.log('Creation successful:', result);
        return result;
      } catch (error) {
        console.error('Creation failed in mutationFn:', error);
        throw error; // Re-throw to ensure onError is called
      }
    },
    onSuccess: async (newData) => {
      console.log('Create mutation onSuccess, new data:', newData);
      // Set the data in cache immediately
      queryClient.setQueryData(['payout-configuration', enrollmentId], newData);
      
      // Wait a moment before invalidating to ensure the backend has processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Invalidate and refetch to ensure we have the latest data
      await queryClient.invalidateQueries({ queryKey: ['payout-configuration', enrollmentId] });
      await refetch();
      
      setIsEditing(false);
      toast.success('Payout configuration created successfully');
    },
    onError: (error: Error) => {
      console.error('Create mutation onError:', error);
      toast.error(`Failed to create payout configuration: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdatePayoutConfigurationData) => {
      console.log('Updating payout configuration with data:', data);
      try {
        const result = await payoutConfigurationService.updatePayoutConfiguration(enrollmentId, data);
        console.log('Update successful:', result);
        return result;
      } catch (error) {
        console.error('Update failed in mutationFn:', error);
        throw error; // Re-throw to ensure onError is called
      }
    },
    onSuccess: (updatedData) => {
      console.log('Update mutation onSuccess, updated data:', updatedData);
      queryClient.setQueryData(['payout-configuration', enrollmentId], updatedData);
      queryClient.invalidateQueries({ queryKey: ['payout-configuration', enrollmentId] });
      refetch();
      setIsEditing(false);
      toast.success('Payout configuration updated successfully');
    },
    onError: (error: Error) => {
      console.error('Update mutation onError:', error);
      toast.error(`Failed to update payout configuration: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (payoutConfig) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = () => {
    if (payoutConfig) {
      setFormData({
        config_type: payoutConfig.config_type,
        live_trading_start_date: payoutConfig.live_trading_start_date,
        profit_share_percent: payoutConfig.profit_share_percent,
        payment_cycle: payoutConfig.payment_cycle,
        custom_cycle_days: payoutConfig.custom_cycle_days,
        custom_payout_days: payoutConfig.custom_payout_days,
        first_payout_delay_days: payoutConfig.first_payout_delay_days ?? undefined,
        subsequent_cycle_days: payoutConfig.subsequent_cycle_days ?? undefined,
        min_net_amount: payoutConfig.min_net_amount,
        base_share_percent: payoutConfig.base_share_percent,
        custom_next_withdrawal_datetime: payoutConfig.custom_next_withdrawal_datetime,
        is_active: payoutConfig.is_active,
        notes: payoutConfig.notes || ''
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      config_type: 'default',
      live_trading_start_date: '',
      payment_cycle: 'monthly',
      is_active: true,
      notes: ''
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Payout Configuration</h2>
        </div>
        {!isEditing && (
          <Button onClick={handleEdit} variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            {payoutConfig ? 'Edit Configuration' : 'Create Configuration'}
          </Button>
        )}
      </div>

      {error && !payoutConfig && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">No payout configuration found for this enrollment.</p>
              <Button onClick={() => setIsEditing(true)}>
                Create Payout Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {payoutConfig && !isEditing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuration Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Configuration Type</Label>
                <Badge variant={payoutConfig.config_type === 'custom' ? 'default' : 'secondary'}>
                  {payoutConfig.config_type === 'custom' ? 'Custom Override' : 'Default Policy'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Status</Label>
                <Badge variant={payoutConfig.is_active ? 'success' : 'destructive'}>
                  {payoutConfig.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Live Trading Start Date</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(payoutConfig.live_trading_start_date).toLocaleDateString()}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Payment Cycle</Label>
                <p className="text-sm text-muted-foreground capitalize">
                  {payoutConfig.payment_cycle.replace('_', ' ')}
                </p>
              </div>

              {payoutConfig.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">{payoutConfig.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Profit Share Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {payoutConfig.profit_share_percent && (
                <div>
                  <Label className="text-sm font-medium">Profit Share Percent</Label>
                  <p className="text-lg font-semibold text-primary">
                    {payoutConfig.profit_share_percent}%
                  </p>
                </div>
              )}

              {payoutConfig.base_share_percent && (
                <div>
                  <Label className="text-sm font-medium">Base Share Percent</Label>
                  <p className="text-sm text-muted-foreground">
                    {payoutConfig.base_share_percent}%
                  </p>
                </div>
              )}

              {payoutConfig.min_net_amount && (
                <div>
                  <Label className="text-sm font-medium">Minimum Net Amount</Label>
                  <p className="text-sm text-muted-foreground">
                    ${payoutConfig.min_net_amount.toLocaleString()}
                  </p>
                </div>
              )}

              {payoutConfig.first_payout_delay_days !== null && payoutConfig.first_payout_delay_days !== undefined && (
                <div>
                  <Label className="text-sm font-medium">First Payout Delay</Label>
                  <p className="text-sm text-muted-foreground">
                    {payoutConfig.first_payout_delay_days} days
                  </p>
                </div>
              )}

              {payoutConfig.subsequent_cycle_days !== null && payoutConfig.subsequent_cycle_days !== undefined && (
                <div>
                  <Label className="text-sm font-medium">Subsequent Cycle</Label>
                  <p className="text-sm text-muted-foreground">
                    {payoutConfig.subsequent_cycle_days} days
                  </p>
                </div>
              )}

              {payoutConfig.custom_next_withdrawal_datetime && (
                <div>
                  <Label className="text-sm font-medium">Custom Next Withdrawal Date/Time</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(payoutConfig.custom_next_withdrawal_datetime).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>
              {payoutConfig ? 'Edit Payout Configuration' : 'Create Payout Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="config_type">Configuration Type</Label>
                  <Select 
                    value={formData.config_type} 
                    onValueChange={(value: 'default' | 'custom') => 
                      setFormData(prev => ({ ...prev, config_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (Policy Driven)</SelectItem>
                      <SelectItem value="custom">Custom (Client Override)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="live_trading_start_date">Live Trading Start Date</Label>
                  <Input
                    id="live_trading_start_date"
                    type="date"
                    value={formData.live_trading_start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, live_trading_start_date: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_cycle">Payment Cycle</Label>
                  <Select 
                    value={formData.payment_cycle} 
                    onValueChange={(value: any) => 
                      setFormData(prev => ({ ...prev, payment_cycle: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                      <SelectItem value="custom_days">Custom Days in Month</SelectItem>
                      <SelectItem value="custom_interval">Custom Interval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.config_type === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="profit_share_percent">Profit Share Percent</Label>
                    <Input
                      id="profit_share_percent"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.profit_share_percent || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        profit_share_percent: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                    />
                  </div>
                )}
              </div>

              {formData.payment_cycle === 'custom_interval' && (
                <div className="space-y-2">
                  <Label htmlFor="custom_cycle_days">Custom Cycle Days</Label>
                  <Input
                    id="custom_cycle_days"
                    type="number"
                    min="1"
                    value={formData.custom_cycle_days || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      custom_cycle_days: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                  />
                </div>
              )}

              {formData.config_type === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_payout_delay_days">First Payout Delay (Days)</Label>
                    <Input
                      id="first_payout_delay_days"
                      type="number"
                      min="0"
                      value={formData.first_payout_delay_days !== undefined ? formData.first_payout_delay_days.toString() : ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        first_payout_delay_days: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subsequent_cycle_days">Subsequent Cycle Days</Label>
                    <Input
                      id="subsequent_cycle_days"
                      type="number"
                      min="0"
                      value={formData.subsequent_cycle_days !== undefined ? formData.subsequent_cycle_days.toString() : ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        subsequent_cycle_days: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min_net_amount">Minimum Net Amount</Label>
                    <Input
                      id="min_net_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.min_net_amount || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        min_net_amount: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="base_share_percent">Base Share Percent</Label>
                    <Input
                      id="base_share_percent"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.base_share_percent || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        base_share_percent: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom_next_withdrawal_datetime">Custom Next Withdrawal Date/Time</Label>
                    <Input
                      id="custom_next_withdrawal_datetime"
                      type="datetime-local"
                      value={formData.custom_next_withdrawal_datetime || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        custom_next_withdrawal_datetime: e.target.value || undefined 
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Manually set next withdrawal date/time (overrides automatic calculation)
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active Configuration</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Optional notes or admin remarks..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayoutTab;