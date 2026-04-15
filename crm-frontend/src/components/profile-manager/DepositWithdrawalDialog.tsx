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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, TrendingUp, TrendingDown, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';

interface DepositWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  challengeName: string;
  mt5AccountId?: string | number;
  currentBalance?: number;
  currency?: string;
  onSuccess?: () => void;
}

export default function DepositWithdrawalDialog({
  open,
  onOpenChange,
  enrollmentId,
  challengeName,
  mt5AccountId,
  currentBalance,
  currency = 'USD',
  onSuccess,
}: DepositWithdrawalDialogProps) {
  const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await enrollmentReviewService.manageFunds(enrollmentId, {
        action,
        amount: parseFloat(amount),
        comment: comment || 'Manual Adjustment',
      });
      setResponse(res);
      if (res.success) {
        setAmount('');
        setComment('');
        onSuccess?.();
      }
    } catch (error: any) {
      setResponse({
        success: false,
        error: error.message || 'Failed to process transaction',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setResponse(null);
    setAmount('');
    setComment('');
    setAction('deposit');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Deposit / Withdrawal
          </DialogTitle>
          <DialogDescription>
            {challengeName}
            {mt5AccountId && <span className="font-mono ml-1">• MT5: {mt5AccountId}</span>}
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
                    {response.success ? 'Transaction Successful' : 'Transaction Failed'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {response.message || response.error || 'Unknown error'}
                  </p>
                </div>
              </div>
            </div>

            {response.success && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Action:</span>
                  <Badge variant="outline" className="ml-2 capitalize">{response.action}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="ml-2 font-medium">${response.amount}</span>
                </div>
              </div>
            )}

            <Button onClick={handleClose} variant="outline" className="w-full">Close</Button>
          </div>
        ) : (
          /* Form View */
          <div className="space-y-4">
            {/* Current Balance */}
            {currentBalance !== undefined && (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className="text-xl font-bold">
                  ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  <span className="text-xs text-muted-foreground ml-1">{currency}</span>
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={action} onValueChange={(v: 'deposit' | 'withdraw') => setAction(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      Deposit
                    </div>
                  </SelectItem>
                  <SelectItem value="withdraw">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      Withdraw
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Comment (Optional)</Label>
              <Textarea
                placeholder="Note about this transaction"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
              className="w-full"
              variant={action === 'deposit' ? 'default' : 'destructive'}
            >
              {isSubmitting
                ? 'Processing...'
                : `${action === 'deposit' ? 'Deposit' : 'Withdraw'} $${amount || '0.00'}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
