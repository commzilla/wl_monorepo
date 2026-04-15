import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { mt5Service } from '@/services/mt5Service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Server,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ResyncTradesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mt5AccountId: string;
  onSuccess?: () => void;
}

interface ResyncResult {
  account_id: number;
  fetched_from_mt5: number;
  existing_in_db: number;
  created_new: number;
  updated_existing: number;
  skipped: number;
  total_after_sync: number;
  dry_run: boolean;
  preview_created: number[];
  preview_updated: number[];
}

export default function ResyncTradesDialog({
  open,
  onOpenChange,
  mt5AccountId,
  onSuccess,
}: ResyncTradesDialogProps) {
  const { toast } = useToast();
  const [dryRunResult, setDryRunResult] = useState<ResyncResult | null>(null);
  const [step, setStep] = useState<'initial' | 'preview' | 'completed'>('initial');

  const dryRunMutation = useMutation({
    mutationFn: () => mt5Service.resyncTrades(mt5AccountId, true),
    onSuccess: (data) => {
      setDryRunResult(data);
      setStep('preview');
    },
    onError: (error: Error) => {
      toast({ title: 'Dry run failed', description: error.message, variant: 'destructive' });
    },
  });

  const actualSyncMutation = useMutation({
    mutationFn: () => mt5Service.resyncTrades(mt5AccountId, false),
    onSuccess: (data) => {
      toast({
        title: 'Trades Resynced',
        description: `Created: ${data.created_new}, Updated: ${data.updated_existing}`,
      });
      setStep('completed');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: 'Sync Failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleClose = () => {
    setDryRunResult(null);
    setStep('initial');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 rounded-xl border-border/50">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <RefreshCw size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Resync MT5 Trades</h2>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Account <span className="font-mono">{mt5AccountId}</span>
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {step === 'initial' && (
            <>
              <div className="flex gap-3 p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Fetch live data from MT5</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    This will compare MT5 trades with the database. We'll run a dry run first to preview changes before writing.
                  </p>
                </div>
              </div>
            </>
          )}

          {step === 'preview' && dryRunResult && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="rounded-lg bg-muted/30 border border-border/50 p-4 space-y-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Server size={12} />
                  Preview Results
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-muted-foreground">Fetched from MT5</span>
                    <p className="text-2xl font-bold text-foreground">{dryRunResult.fetched_from_mt5}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-muted-foreground">Existing in DB</span>
                    <p className="text-2xl font-bold text-foreground">{dryRunResult.existing_in_db}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200">
                    {dryRunResult.created_new} New
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-200">
                    {dryRunResult.updated_existing} Updated
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {dryRunResult.skipped} Skipped
                  </Badge>
                </div>

                {dryRunResult.preview_created.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[11px] text-muted-foreground">Will be created:</span>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {dryRunResult.preview_created.slice(0, 10).join(', ')}
                      {dryRunResult.preview_created.length > 10 && ` +${dryRunResult.preview_created.length - 10} more`}
                    </p>
                  </div>
                )}

                {dryRunResult.preview_updated.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[11px] text-muted-foreground">Will be updated:</span>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {dryRunResult.preview_updated.slice(0, 10).join(', ')}
                      {dryRunResult.preview_updated.length > 10 && ` +${dryRunResult.preview_updated.length - 10} more`}
                    </p>
                  </div>
                )}
              </div>

              {(dryRunResult.created_new > 0 || dryRunResult.updated_existing > 0) && (
                <div className="flex gap-3 p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Proceeding will write <span className="font-medium text-foreground">{dryRunResult.created_new + dryRunResult.updated_existing}</span> changes to the database.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'completed' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Sync Completed</p>
                <p className="text-xs text-muted-foreground mt-0.5">Trades have been resynced from MT5</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20">
          <Button variant="outline" size="sm" onClick={handleClose} className="h-9">
            {step === 'completed' ? 'Close' : 'Cancel'}
          </Button>
          {step === 'initial' && (
            <Button
              size="sm"
              onClick={() => dryRunMutation.mutate()}
              disabled={dryRunMutation.isPending}
              className="h-9 min-w-[120px]"
            >
              {dryRunMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Running…
                </>
              ) : (
                'Start Dry Run'
              )}
            </Button>
          )}
          {step === 'preview' && (
            <Button
              size="sm"
              onClick={() => actualSyncMutation.mutate()}
              disabled={actualSyncMutation.isPending || (dryRunResult?.created_new === 0 && dryRunResult?.updated_existing === 0)}
              className="h-9 min-w-[120px]"
            >
              {actualSyncMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Syncing…
                </>
              ) : dryRunResult?.created_new === 0 && dryRunResult?.updated_existing === 0 ? (
                'No Changes Needed'
              ) : (
                'Execute Sync'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
