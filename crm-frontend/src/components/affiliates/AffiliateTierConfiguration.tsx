import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Award } from 'lucide-react';
import { affiliateService } from '@/services/affiliateService';
import { AffiliateCommissionTier } from '@/types/affiliate';
import { useToast } from '@/hooks/use-toast';
import AffiliateTierDialog from './AffiliateTierDialog';

const AffiliateTierConfiguration = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<AffiliateCommissionTier | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ['affiliate-tiers'],
    queryFn: affiliateService.getAffiliateTiers,
  });

  const deleteMutation = useMutation({
    mutationFn: affiliateService.deleteAffiliateTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-tiers'] });
      toast({
        title: 'Success',
        description: 'Affiliate tier deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this affiliate tier?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Affiliate Commission Tiers</h2>
          <p className="text-muted-foreground">
            Manage commission tiers based on referral volume
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tier
        </Button>
      </div>

      <div className="grid gap-4">
        {tiers.map((tier) => (
          <Card key={tier.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Award className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                    <CardDescription>
                      {tier.max_referrals 
                        ? `${tier.min_referrals}-${tier.max_referrals} referrals → ${tier.commission_rate}%`
                        : `${tier.min_referrals}+ referrals → ${tier.commission_rate}%`
                      }
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Min Referrals</p>
                  <p className="text-2xl font-bold">{tier.min_referrals}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Max Referrals</p>
                  <p className="text-2xl font-bold">{tier.max_referrals || 'Unlimited'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Commission Rate</p>
                  <p className="text-2xl font-bold">{tier.commission_rate}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingTier(tier)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(tier.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {tiers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Award className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No affiliate tiers configured</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first affiliate commission tier to get started
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Tier
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AffiliateTierDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        tier={null}
      />

      <AffiliateTierDialog
        open={!!editingTier}
        onOpenChange={(open) => !open && setEditingTier(null)}
        tier={editingTier}
      />
    </div>
  );
};

export default AffiliateTierConfiguration;