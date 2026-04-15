import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Copy } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { toast } from 'sonner';

interface BlockAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  challengeName: string;
  mt5AccountId?: string | number;
  status?: string;
  onSuccess?: () => void;
}

export default function BlockAccountDialog({
  open,
  onOpenChange,
  enrollmentId,
  challengeName,
  mt5AccountId,
  status,
  onSuccess,
}: BlockAccountDialogProps) {
  const [title, setTitle] = useState('');
  const [explanation, setExplanation] = useState('');
  const [response, setResponse] = useState<any>(null);

  const blockMutation = useMutation({
    mutationFn: () =>
      enrollmentReviewService.blockAccount(enrollmentId, {
        title: title.trim(),
        explanation: explanation.trim(),
      }),
    onSuccess: (res) => {
      setResponse(res);
      if (res.success) {
        toast.success('Account blocked successfully');
        setTitle('');
        setExplanation('');
        onSuccess?.();
      } else {
        toast.error(res.error || 'Failed to block account');
      }
    },
    onError: (error: any) => {
      setResponse({
        success: false,
        error: error.message || 'Failed to block account',
        enrollment_id: enrollmentId,
        mt5_account_id: mt5AccountId,
      });
      toast.error(error.message || 'Failed to block account');
    },
  });

  const handleClose = () => {
    setResponse(null);
    setTitle('');
    setExplanation('');
    onOpenChange(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Block Account
          </DialogTitle>
          <DialogDescription>
            This will permanently block the MT5 account and mark the challenge as failed.
          </DialogDescription>
        </DialogHeader>

        {response ? (
          /* Response View */
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${
              response.success
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-destructive/5 border-destructive/20'
            }`}>
              <div className="flex items-start gap-2">
                {response.success ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {response.success ? 'Account Blocked Successfully' : 'Block Operation Failed'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {response.message || response.error}
                  </p>
                </div>
              </div>
            </div>

            {response.success && (
              <div className="space-y-2 text-sm">
                {response.enrollment_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Enrollment ID:</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{response.enrollment_id}</code>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(response.enrollment_id)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {response.breach_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Breach ID:</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{response.breach_id}</code>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(response.breach_id)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button onClick={handleClose} variant="outline" className="w-full">Close</Button>
          </div>
        ) : (
          /* Form View */
          <div className="space-y-4">
            {/* Context Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground">Challenge</p>
                <p className="text-sm font-medium mt-0.5">{challengeName}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground">MT5 Account</p>
                <p className="text-sm font-medium font-mono mt-0.5">{mt5AccountId || 'N/A'}</p>
              </div>
            </div>

            {status && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Current Status:</span>
                <Badge variant="outline" className="text-xs capitalize">{status}</Badge>
              </div>
            )}

            {/* Warning */}
            <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                <p className="text-xs text-destructive">
                  This action cannot be undone. The account will be permanently blocked and the user will be notified.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g., Breach: Over-leverage, Rule Violation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={blockMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label>Explanation *</Label>
              <Textarea
                placeholder="Detailed explanation for blocking this account..."
                rows={3}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                disabled={blockMutation.isPending}
              />
            </div>

            <Button
              variant="destructive"
              onClick={() => blockMutation.mutate()}
              disabled={blockMutation.isPending || !title.trim() || !explanation.trim()}
              className="w-full"
            >
              {blockMutation.isPending ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2 animate-spin" />
                  Blocking Account...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Block Account
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
