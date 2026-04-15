import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { KeyRound, Loader2, Copy, Lock, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { traderService } from '@/services/traderService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PasswordManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  traderId: string;
  traderEmail: string;
  traderName: string;
}

export default function PasswordManagementDialog({
  open,
  onOpenChange,
  traderId,
  traderEmail,
  traderName,
}: PasswordManagementDialogProps) {
  const { toast } = useToast();
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [view, setView] = useState<'menu' | 'generated' | 'reset-confirm' | 'reset-done'>('menu');

  const generatePasswordMutation = useMutation({
    mutationFn: (length: number = 12) =>
      apiService.post('/admin/users/generate-password/', { email: traderEmail, length }),
    onSuccess: (response: any) => {
      if (response.data?.password) {
        setGeneratedPassword(response.data.password);
        setView('generated');
      }
    },
    onError: (error: any) => {
      toast({ title: 'Failed', description: error.message || 'Failed to generate password', variant: 'destructive' });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (email: string) => traderService.resetTraderPassword(email),
    onSuccess: (data) => {
      setView('reset-done');
    },
    onError: (error: any) => {
      toast({ title: 'Failed', description: error.message || 'Failed to reset password', variant: 'destructive' });
    },
  });

  const handleClose = () => {
    setView('menu');
    setGeneratedPassword('');
    onOpenChange(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Copied to clipboard' });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 rounded-xl border-border/50">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Password Management</h2>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {traderName} · {traderEmail}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">
          {/* Menu View */}
          {view === 'menu' && (
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <KeyRound size={12} />
                Actions
              </h4>

              <button
                onClick={() => generatePasswordMutation.mutate(12)}
                disabled={generatePasswordMutation.isPending}
                className="w-full flex items-start gap-3 p-3.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all text-left group"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  {generatePasswordMutation.isPending ? (
                    <Loader2 size={16} className="text-primary animate-spin" />
                  ) : (
                    <KeyRound size={16} className="text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Generate Password</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Create a new random password and display it for manual sharing
                  </p>
                </div>
              </button>

              <button
                onClick={() => setView('reset-confirm')}
                className="w-full flex items-start gap-3 p-3.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-amber-500/30 transition-all text-left group"
              >
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/15 transition-colors">
                  <RefreshCw size={16} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Reset Password</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Generate a new password and send it directly to the trader's email
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Generated Password View */}
          {view === 'generated' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Password Generated Successfully</p>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80 mt-0.5">
                      Copy this password and share it securely with the trader.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                <p className="text-[11px] text-muted-foreground mb-2">New Password</p>
                <div className="flex items-center justify-between gap-3">
                  <code className="text-base font-mono font-bold text-foreground tracking-wider select-all">
                    {generatedPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={() => copyToClipboard(generatedPassword)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy
                  </Button>
                </div>
              </div>

              <Button onClick={handleClose} variant="outline" className="w-full h-9">
                Done
              </Button>
            </div>
          )}

          {/* Reset Confirm View */}
          {view === 'reset-confirm' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Confirm Password Reset</p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1">
                      This will generate a new random password for <strong>{traderEmail}</strong> and send it via email. The trader will receive new login credentials immediately.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">Trader</p>
                  <p className="text-sm font-medium mt-0.5">{traderName}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">Email</p>
                  <p className="text-sm font-medium mt-0.5 truncate">{traderEmail}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-9"
                  onClick={() => setView('menu')}
                  disabled={resetPasswordMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-9 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => resetPasswordMutation.mutate(traderEmail)}
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Resetting…</>
                  ) : (
                    <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Reset Password</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Reset Done View */}
          {view === 'reset-done' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Password Reset Successful</p>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80 mt-0.5">
                      A new password has been generated and sent to <strong>{traderEmail}</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={handleClose} variant="outline" className="w-full h-9">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
