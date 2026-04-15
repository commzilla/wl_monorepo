import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { mt5Service } from "@/services/mt5Service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

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

export function ResyncTradesDialog({
  open,
  onOpenChange,
  mt5AccountId,
  onSuccess,
}: ResyncTradesDialogProps) {
  const [dryRunResult, setDryRunResult] = useState<ResyncResult | null>(null);
  const [step, setStep] = useState<'initial' | 'preview' | 'completed'>('initial');

  const dryRunMutation = useMutation({
    mutationFn: () => mt5Service.resyncTrades(mt5AccountId, true),
    onSuccess: (data) => {
      setDryRunResult(data);
      setStep('preview');
    },
    onError: (error: Error) => {
      toast.error("Dry run failed", {
        description: error.message,
      });
    },
  });

  const actualSyncMutation = useMutation({
    mutationFn: () => mt5Service.resyncTrades(mt5AccountId, false),
    onSuccess: (data) => {
      toast.success("Trades resynced successfully", {
        description: `Created: ${data.created_new}, Updated: ${data.updated_existing}`,
      });
      setStep('completed');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("Sync failed - Server Error", {
        description: error.message.includes("500") 
          ? "Backend server error occurred. The sync preview worked, but the actual sync operation failed. Please check backend logs or contact support."
          : error.message,
        duration: 8000,
      });
    },
  });

  const handleClose = () => {
    setDryRunResult(null);
    setStep('initial');
    onOpenChange(false);
  };

  const handleDryRun = () => {
    dryRunMutation.mutate();
  };

  const handleActualSync = () => {
    actualSyncMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Resync MT5 Trades</DialogTitle>
          <DialogDescription>
            Force re-sync closed trades for MT5 account {mt5AccountId}
          </DialogDescription>
        </DialogHeader>

        {step === 'initial' && (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will fetch live data from MT5 and compare with existing trades in the database.
                First, we'll run a dry run to preview the changes.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleDryRun}
                disabled={dryRunMutation.isPending}
              >
                {dryRunMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Dry Run
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'preview' && dryRunResult && (
          <>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview Results</CardTitle>
                  <CardDescription>
                    No data was written to the database. Review the changes below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Fetched from MT5</div>
                      <div className="text-2xl font-bold">{dryRunResult.fetched_from_mt5}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Existing in DB</div>
                      <div className="text-2xl font-bold">{dryRunResult.existing_in_db}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                      {dryRunResult.created_new} New
                    </Badge>
                    <Badge variant="default" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                      {dryRunResult.updated_existing} Updated
                    </Badge>
                    <Badge variant="secondary">
                      {dryRunResult.skipped} Skipped
                    </Badge>
                  </div>

                  {dryRunResult.preview_created.length > 0 && (
                    <div className="pt-2">
                      <div className="text-xs font-medium mb-1">Will be created:</div>
                      <div className="text-xs text-muted-foreground">
                        {dryRunResult.preview_created.slice(0, 10).join(", ")}
                        {dryRunResult.preview_created.length > 10 && ` +${dryRunResult.preview_created.length - 10} more`}
                      </div>
                    </div>
                  )}

                  {dryRunResult.preview_updated.length > 0 && (
                    <div className="pt-2">
                      <div className="text-xs font-medium mb-1">Will be updated:</div>
                      <div className="text-xs text-muted-foreground">
                        {dryRunResult.preview_updated.slice(0, 10).join(", ")}
                        {dryRunResult.preview_updated.length > 10 && ` +${dryRunResult.preview_updated.length - 10} more`}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(dryRunResult.created_new > 0 || dryRunResult.updated_existing > 0) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Proceeding will write {dryRunResult.created_new + dryRunResult.updated_existing} changes to the database.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleActualSync}
                disabled={actualSyncMutation.isPending}
                variant={dryRunResult.created_new === 0 && dryRunResult.updated_existing === 0 ? "secondary" : "default"}
              >
                {actualSyncMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dryRunResult.created_new === 0 && dryRunResult.updated_existing === 0 
                  ? "No Changes Needed" 
                  : "Execute Sync"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'completed' && (
          <>
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <div className="font-semibold">Sync Completed Successfully</div>
                <div className="text-sm text-muted-foreground">
                  Trades have been resynced from MT5
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
