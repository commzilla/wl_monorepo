import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { affiliateService } from '@/services/affiliateService';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  traderId: string;
  currentCode?: string;
  userName: string;
  onSuccess: () => void;
}

export default function AffiliateAssignReferralCodeDialog({
  open,
  onOpenChange,
  traderId,
  currentCode,
  userName,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [code, setCode] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      affiliateService.assignReferralCode({
        user_id: traderId,
        referral_code: code.toUpperCase(),
      }),
    onSuccess: (data) => {
      toast({ title: 'Success', description: data.message || 'Referral code assigned' });
      onOpenChange(false);
      setCode('');
      onSuccess();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!mutation.isPending) { onOpenChange(v); if (!v) setCode(''); } }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Tag className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base font-semibold">Assign Referral Code</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Assign or update the referral code for {userName}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-5 space-y-4">
          {currentCode && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                Current code: <code className="bg-background px-2 py-0.5 rounded text-foreground font-mono">{currentCode}</code>
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">New Referral Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CUSTOM123"
              className="bg-muted/30 text-sm font-mono uppercase"
              maxLength={32}
            />
            <p className="text-xs text-muted-foreground">
              Uppercase letters, numbers, underscores, hyphens only (max 32 chars)
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-muted/20 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button size="sm" disabled={!code.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Assign Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
