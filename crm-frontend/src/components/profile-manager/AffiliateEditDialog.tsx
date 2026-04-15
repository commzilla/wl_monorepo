import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Edit, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { affiliateService } from '@/services/affiliateService';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  traderId: string;
  affiliateProfile: any;
  customCommission: any;
  userName: string;
  onSuccess: () => void;
}

export default function AffiliateEditDialog({
  open,
  onOpenChange,
  traderId,
  affiliateProfile,
  customCommission,
  userName,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    approved: false,
    website_url: '',
    promotion_strategy: '',
    custom_commission_active: false,
    commission_rate: '',
    fixed_amount: '',
    commission_notes: '',
  });

  useEffect(() => {
    if (open && affiliateProfile) {
      setFormData({
        approved: affiliateProfile.approved ?? false,
        website_url: affiliateProfile.website_url || '',
        promotion_strategy: affiliateProfile.promotion_strategy || '',
        custom_commission_active: customCommission?.is_active ?? false,
        commission_rate: customCommission?.commission_rate || '',
        fixed_amount: customCommission?.fixed_amount_per_referral || '',
        commission_notes: customCommission?.notes || '',
      });
    }
  }, [open, affiliateProfile, customCommission]);

  const mutation = useMutation({
    mutationFn: () =>
      affiliateService.updateAffiliateUser(traderId, {
        affiliate_profile: {
          approved: formData.approved,
          website_url: formData.website_url || undefined,
          promotion_strategy: formData.promotion_strategy || undefined,
        },
        custom_commission: {
          is_active: formData.custom_commission_active,
          commission_rate: formData.commission_rate || undefined,
          fixed_amount_per_referral: formData.fixed_amount || undefined,
          notes: formData.commission_notes || undefined,
        },
      }),
    onSuccess: () => {
      toast({ title: 'Updated', description: 'Affiliate profile updated' });
      onOpenChange(false);
      onSuccess();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const update = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!mutation.isPending) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Edit className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base font-semibold">Edit Affiliate Profile</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Update profile and commission settings for {userName}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-5 space-y-5 overflow-y-auto">
          {/* Profile Section */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Profile</p>

            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Approved</p>
                <p className="text-xs text-muted-foreground">Allow commission earnings</p>
              </div>
              <Switch checked={formData.approved} onCheckedChange={(v) => update('approved', v)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Website URL</Label>
              <Input
                value={formData.website_url}
                onChange={(e) => update('website_url', e.target.value)}
                placeholder="https://example.com"
                className="bg-muted/30 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Promotion Strategy</Label>
              <Textarea
                value={formData.promotion_strategy}
                onChange={(e) => update('promotion_strategy', e.target.value)}
                placeholder="Describe promotion approach..."
                rows={2}
                className="bg-muted/30 text-sm resize-none"
              />
            </div>
          </div>

          {/* Commission Section */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custom Commission</p>

            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Custom Commission Active</p>
                <p className="text-xs text-muted-foreground">Override tier-based rates</p>
              </div>
              <Switch
                checked={formData.custom_commission_active}
                onCheckedChange={(v) => update('custom_commission_active', v)}
              />
            </div>

            {formData.custom_commission_active && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Commission Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.commission_rate}
                      onChange={(e) => update('commission_rate', e.target.value)}
                      placeholder="18.50"
                      className="bg-muted/30 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Fixed Amount / Referral</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.fixed_amount}
                      onChange={(e) => update('fixed_amount', e.target.value)}
                      placeholder="50.00"
                      className="bg-muted/30 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Notes</Label>
                  <Textarea
                    value={formData.commission_notes}
                    onChange={(e) => update('commission_notes', e.target.value)}
                    placeholder="e.g., Special partner agreement"
                    rows={2}
                    className="bg-muted/30 text-sm resize-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-muted/20 border-t border-border/60 shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
