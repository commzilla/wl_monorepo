import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { affiliateService } from '@/services/affiliateService';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  traderId: string;
  currentTierInfo?: { id: string; name: string; commission_rate: string | number } | null;
  userName: string;
  onSuccess: () => void;
}

export default function AffiliateAssignTierDialog({
  open,
  onOpenChange,
  traderId,
  currentTierInfo,
  userName,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState('');

  const { data: tiers = [] } = useQuery({
    queryKey: ['affiliate-tiers'],
    queryFn: () => affiliateService.getAffiliateTiers(),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setSelectedTier(currentTierInfo?.id || '');
    }
  }, [open, currentTierInfo]);

  const mutation = useMutation({
    mutationFn: () => {
      const tierId = selectedTier === 'auto' ? null : selectedTier || null;
      return affiliateService.assignTier(traderId, tierId);
    },
    onSuccess: (data: any) => {
      toast({ title: 'Success', description: data?.message || 'Tier updated' });
      onOpenChange(false);
      onSuccess();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!mutation.isPending) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Award className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base font-semibold">Assign Tier</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Set a manual tier override for {userName}. Select "Auto" to remove override.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-5 space-y-4">
          {currentTierInfo && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                Current tier: <strong className="text-foreground">{currentTierInfo.name}</strong>
                {' '}({currentTierInfo.commission_rate}%)
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tier</Label>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
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
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-muted/20 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
