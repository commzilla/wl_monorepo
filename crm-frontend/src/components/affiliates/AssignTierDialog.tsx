import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { affiliateService } from '@/services/affiliateService';
import { AffiliateUser } from '@/types/affiliate';
import { Award, Loader2 } from 'lucide-react';

interface AssignTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AffiliateUser | null;
}

const AssignTierDialog = ({ open, onOpenChange, user }: AssignTierDialogProps) => {
  const [selectedTierId, setSelectedTierId] = React.useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tiers = [] } = useQuery({
    queryKey: ['affiliate-tiers'],
    queryFn: affiliateService.getAffiliateTiers,
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: ({ userId, tierId }: { userId: string; tierId: string | null }) =>
      affiliateService.assignTier(userId, tierId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-users'] });
      toast({ title: 'Success', description: data?.message || 'Tier assignment updated successfully' });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  React.useEffect(() => {
    if (open && user) {
      setSelectedTierId(user.manual_tier_override_info?.id || '');
    }
  }, [open, user]);

  const handleSubmit = () => {
    if (!user) return;
    const tierId = selectedTierId === 'auto' ? null : selectedTierId || null;
    assignMutation.mutate({ userId: user.id, tierId });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!assignMutation.isPending) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Award className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base font-semibold">Assign Affiliate Tier</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Assign a manual tier override for {user?.username}. Select "Auto" to remove override.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tier</Label>
            <Select value={selectedTierId} onValueChange={setSelectedTierId}>
              <SelectTrigger className="bg-muted/30 text-sm">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Based on Referrals)</SelectItem>
                {tiers.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    {tier.name} — {tier.commission_rate}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {user && (user.auto_tier_info || user.manual_tier_override_info) && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Current Status</p>
              {user.auto_tier_info && (
                <p className="text-xs text-muted-foreground">
                  Auto Tier: <strong className="text-foreground">{user.auto_tier_info.name}</strong> ({user.auto_tier_info.commission_rate}%)
                </p>
              )}
              {user.manual_tier_override_info && (
                <p className="text-xs text-muted-foreground">
                  Manual Override: <strong className="text-foreground">{user.manual_tier_override_info.name}</strong> ({user.manual_tier_override_info.commission_rate}%)
                </p>
              )}
              {user.effective_commission_rate && (
                <p className="text-xs text-muted-foreground">
                  Effective Rate: <strong className="text-foreground">{user.effective_commission_rate}%</strong>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-muted/20 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={assignMutation.isPending}>
            Cancel
          </Button>
          <Button size="sm" disabled={assignMutation.isPending} onClick={handleSubmit}>
            {assignMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignTierDialog;
