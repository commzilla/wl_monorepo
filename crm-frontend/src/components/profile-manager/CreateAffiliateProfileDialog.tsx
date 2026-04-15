import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Loader2 } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { affiliateService } from '@/services/affiliateService';

interface CreateAffiliateProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  traderId: string;
  onSuccess: () => void;
}

export default function CreateAffiliateProfileDialog({
  open,
  onOpenChange,
  traderId,
  onSuccess,
}: CreateAffiliateProfileDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    referral_code: '',
    approved: false,
    website_url: '',
    promotion_strategy: '',
    manual_tier_override: '',
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ['affiliate-tiers'],
    queryFn: () => affiliateService.getAffiliateTiers(),
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: Record<string, any> = {
        approved: formData.approved,
      };
      if (formData.referral_code.trim()) payload.referral_code = formData.referral_code.trim();
      if (formData.website_url.trim()) payload.website_url = formData.website_url.trim();
      if (formData.promotion_strategy.trim()) payload.promotion_strategy = formData.promotion_strategy.trim();
      if (formData.manual_tier_override) payload.manual_tier_override = formData.manual_tier_override;

      const response = await apiService.post(`/admin/traders/${traderId}/affiliate-profile/`, payload);

      if (response.error) {
        throw new Error(response.error);
      }

      toast({ title: 'Success', description: 'Affiliate profile created successfully.' });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Failed', description: error.message || 'Could not create affiliate profile.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      referral_code: '',
      approved: false,
      website_url: '',
      promotion_strategy: '',
      manual_tier_override: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting) { onOpenChange(v); if (!v) resetForm(); } }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base font-semibold">Create Affiliate Profile</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Set up an affiliate profile for this trader without changing their role.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="px-6 pb-5 space-y-4">
            {/* Referral Code */}
            <div className="space-y-1.5">
              <Label htmlFor="referral_code" className="text-sm font-medium">
                Referral Code
                <span className="text-xs text-muted-foreground ml-1.5 font-normal">(optional — auto-generated if blank)</span>
              </Label>
              <Input
                id="referral_code"
                value={formData.referral_code}
                onChange={(e) => setFormData(prev => ({ ...prev, referral_code: e.target.value }))}
                placeholder="e.g. TRADER2024"
                className="bg-muted/30 font-mono text-sm"
              />
            </div>

            {/* Approved toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Approved</p>
                <p className="text-xs text-muted-foreground">Immediately approve this affiliate profile</p>
              </div>
              <Switch
                checked={formData.approved}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, approved: checked }))}
              />
            </div>

            {/* Website URL */}
            <div className="space-y-1.5">
              <Label htmlFor="website_url" className="text-sm font-medium">
                Website URL
                <span className="text-xs text-muted-foreground ml-1.5 font-normal">(optional)</span>
              </Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                placeholder="https://example.com"
                className="bg-muted/30 text-sm"
              />
            </div>

            {/* Promotion Strategy */}
            <div className="space-y-1.5">
              <Label htmlFor="promotion_strategy" className="text-sm font-medium">
                Promotion Strategy
                <span className="text-xs text-muted-foreground ml-1.5 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="promotion_strategy"
                value={formData.promotion_strategy}
                onChange={(e) => setFormData(prev => ({ ...prev, promotion_strategy: e.target.value }))}
                placeholder="Describe how the affiliate plans to promote..."
                rows={3}
                className="bg-muted/30 text-sm resize-none"
              />
            </div>

            {/* Manual Tier Override */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Manual Tier Override
                <span className="text-xs text-muted-foreground ml-1.5 font-normal">(optional)</span>
              </Label>
              <Select
                value={formData.manual_tier_override}
                onValueChange={(value) => setFormData(prev => ({ ...prev, manual_tier_override: value === '__none__' ? '' : value }))}
              >
                <SelectTrigger className="bg-muted/30 text-sm">
                  <SelectValue placeholder="Auto (based on referrals)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Auto (based on referrals)</SelectItem>
                  {tiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.name} — {tier.commission_rate}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 bg-muted/20 border-t border-border/60">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Create Profile
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
