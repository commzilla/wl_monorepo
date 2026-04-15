import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { traderService } from '@/services/traderService';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface DeleteProfileDialogProps {
  traderId: string;
  traderName: string;
  traderEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DeleteProfileDialog: React.FC<DeleteProfileDialogProps> = ({
  traderId,
  traderName,
  traderEmail,
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const canDelete = confirmText === 'DELETE';

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await traderService.deleteTrader(traderId);
      toast({
        title: 'Trader Deleted',
        description: `${traderName} has been permanently deleted.`,
      });
      onOpenChange(false);
      navigate('/traders');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete trader',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) setConfirmText('');
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 rounded-xl border-destructive/20">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Trash2 size={18} className="text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Delete Trader</h2>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                This action is permanent and irreversible
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Warning Banner */}
          <div className="flex gap-3 p-3.5 rounded-lg bg-destructive/5 border border-destructive/15">
            <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-sm">
              <p className="font-medium text-foreground">
                You are about to delete this trader permanently.
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                All associated data including challenge enrollments, accounts, trades, and transaction history will be permanently removed. This cannot be undone.
              </p>
            </div>
          </div>

          {/* Trader Info Card */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
              {traderName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{traderName}</p>
              <p className="text-xs text-muted-foreground truncate">{traderEmail}</p>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={12} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Type <span className="font-mono font-semibold text-destructive">DELETE</span> to confirm
              </p>
            </div>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background font-mono"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="h-9"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={!canDelete || isDeleting}
            onClick={handleDelete}
            className="h-9 min-w-[100px]"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete Trader
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteProfileDialog;
