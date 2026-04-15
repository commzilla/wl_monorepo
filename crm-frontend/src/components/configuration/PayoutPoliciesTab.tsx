import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, CalendarDays, DollarSign, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { payoutPolicyService } from '@/services/payoutPolicyService';
import { PayoutPolicyDialog } from './PayoutPolicyDialog';
import type { PayoutPolicy } from '@/lib/types/payoutPolicy';

export const PayoutPoliciesTab = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PayoutPolicy | null>(null);
  const queryClient = useQueryClient();

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['payout-policies'],
    queryFn: () => payoutPolicyService.getPayoutPolicies(),
  });

  const deleteMutation = useMutation({
    mutationFn: payoutPolicyService.deletePayoutPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-policies'] });
      toast.success('Payout policy deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete payout policy: ' + error.message);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this payout policy?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (policy: PayoutPolicy) => {
    setEditingPolicy(policy);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading payout policies...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Payout Policies</h3>
          <p className="text-sm text-muted-foreground">
            Manage payout rules and settings for each challenge
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Policy
        </Button>
      </div>

      {policies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payout policies configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first payout policy to define payout rules for challenges.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {policies.map((policy) => (
            <Card key={policy.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {policy.challenge_name}
                      <Badge variant={policy.is_active ? 'default' : 'secondary'}>
                        {policy.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {policy.step_type} • Base Share: {policy.base_share_percent}%
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(policy)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(policy.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">First Payout Delay</div>
                      <div className="text-sm text-muted-foreground">
                        {policy.first_payout_delay_days} days
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Cycle Days</div>
                      <div className="text-sm text-muted-foreground">
                        {policy.subsequent_cycle_days} days
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Min Amount</div>
                      <div className="text-sm text-muted-foreground">
                        ${policy.min_net_amount}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Min Trading Days</div>
                      <div className="text-sm text-muted-foreground">
                        {policy.min_trading_days === 0 ? 'No restriction' : `${policy.min_trading_days} days`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Split Tiers</div>
                      <div className="text-sm text-muted-foreground">
                        {policy.split_tiers?.length || 0} configured
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PayoutPolicyDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        policy={null}
      />
      
      <PayoutPolicyDialog
        open={!!editingPolicy}
        onOpenChange={(open) => !open && setEditingPolicy(null)}
        policy={editingPolicy}
      />
    </div>
  );
};