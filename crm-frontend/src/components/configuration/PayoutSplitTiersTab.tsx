import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, TrendingUp, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { payoutPolicyService } from '@/services/payoutPolicyService';
import { PayoutSplitTierDialog } from './PayoutSplitTierDialog';
import type { PayoutSplitTier } from '@/lib/types/payoutPolicy';

export const PayoutSplitTiersTab = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PayoutSplitTier | null>(null);
  const queryClient = useQueryClient();

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ['payout-split-tiers'],
    queryFn: () => payoutPolicyService.getPayoutSplitTiers(),
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['payout-policies'],
    queryFn: () => payoutPolicyService.getPayoutPolicies(),
  });

  const deleteMutation = useMutation({
    mutationFn: payoutPolicyService.deletePayoutSplitTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-split-tiers'] });
      toast.success('Split tier deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete split tier: ' + error.message);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this split tier?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (tier: PayoutSplitTier) => {
    setEditingTier(tier);
  };

  const getPolicyName = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    return policy ? `${policy.challenge_name} (${policy.step_type})` : 'Unknown Policy';
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading split tiers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Payout Split Tiers</h3>
          <p className="text-sm text-muted-foreground">
            Configure tiered profit sharing based on payout number
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Split Tier
        </Button>
      </div>

      {tiers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No split tiers configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create split tiers to define different profit sharing percentages based on payout sequence.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Split Tier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Split Tiers</CardTitle>
            <CardDescription>
              Profit sharing tiers based on payout sequence number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead>From Payout #</TableHead>
                  <TableHead>To Payout #</TableHead>
                  <TableHead>Share %</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell>
                      <div className="font-medium">
                        {getPolicyName(tier.policy)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{tier.from_payout_number}</Badge>
                    </TableCell>
                    <TableCell>
                      {tier.to_payout_number ? (
                        <Badge variant="outline">{tier.to_payout_number}</Badge>
                      ) : (
                        <Badge variant="secondary">∞</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{tier.share_percent}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(tier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(tier.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <PayoutSplitTierDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        tier={null}
      />
      
      <PayoutSplitTierDialog
        open={!!editingTier}
        onOpenChange={(open) => !open && setEditingTier(null)}
        tier={editingTier}
      />
    </div>
  );
};