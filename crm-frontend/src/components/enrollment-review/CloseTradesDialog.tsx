import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { CloseTradesResponse } from '@/lib/types/enrollmentReview';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface CloseTradesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  tradesCount: number;
}

const CloseTradesDialog: React.FC<CloseTradesDialogProps> = ({
  open,
  onOpenChange,
  enrollmentId,
  tradesCount,
}) => {
  const [result, setResult] = useState<CloseTradesResponse | null>(null);
  const queryClient = useQueryClient();

  const closeTradesMutation = useMutation({
    mutationFn: () => enrollmentReviewService.closeAllTrades(enrollmentId),
    onSuccess: (data) => {
      console.log('Close trades successful:', data);
      setResult(data);
      
      // Immediate refetch
      queryClient.invalidateQueries({ queryKey: ['open-trades', enrollmentId] });
      if (data.mt5_account_id) {
        queryClient.invalidateQueries({ queryKey: ['account-pnl', data.mt5_account_id] });
      }
      
      // Delayed refetch to account for system lag (after 3 seconds)
      setTimeout(() => {
        console.log('Performing delayed refetch for account:', data.mt5_account_id);
        queryClient.invalidateQueries({ queryKey: ['open-trades', enrollmentId] });
        if (data.mt5_account_id) {
          queryClient.invalidateQueries({ queryKey: ['account-pnl', data.mt5_account_id] });
        }
      }, 3000);
      
      // Another delayed refetch after 6 seconds
      setTimeout(() => {
        console.log('Performing second delayed refetch for account:', data.mt5_account_id);
        queryClient.invalidateQueries({ queryKey: ['open-trades', enrollmentId] });
        if (data.mt5_account_id) {
          queryClient.invalidateQueries({ queryKey: ['account-pnl', data.mt5_account_id] });
        }
      }, 6000);
    },
    onError: (error) => {
      setResult({
        success: false,
        error: error.message,
        enrollment_id: enrollmentId,
        mt5_account_id: '',
      });
    },
  });

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    closeTradesMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Close All Open Trades
          </DialogTitle>
          {!result && (
            <DialogDescription>
              Are you sure you want to close all {tradesCount} open trade{tradesCount !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </DialogDescription>
          )}
        </DialogHeader>

        {result && (
          <div className="space-y-4">
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
                  {result.success ? result.message : result.error}
                  {result.systemErrorStatus && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      Status: {result.systemErrorStatus}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirm}
                disabled={closeTradesMutation.isPending}
              >
                {closeTradesMutation.isPending ? 'Closing...' : 'Close All Trades'}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CloseTradesDialog;