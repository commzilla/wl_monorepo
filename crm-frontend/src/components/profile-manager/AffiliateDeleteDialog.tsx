import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';

interface AffiliateDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  userName: string;
}

export default function AffiliateDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  userName,
}: AffiliateDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState('');

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isLoading) { onOpenChange(v); setConfirmText(''); } }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base font-semibold">Delete Affiliate Profile</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                This will permanently delete the affiliate profile for <strong>{userName}</strong>. This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-5 space-y-4">
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              All referral data, earnings, and commission history will be lost.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              Type <strong className="text-foreground">DELETE</strong> to confirm
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="bg-muted/30 text-sm font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-muted/20 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={confirmText !== 'DELETE' || isLoading}
            onClick={onConfirm}
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Delete Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
