import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { EnrollmentReviewResponse } from "@/lib/types/enrollmentReview";
import { FundsResponseDialog } from "./FundsResponseDialog";

interface DepositWithdrawalTabProps {
  data: EnrollmentReviewResponse;
}

export function DepositWithdrawalTab({ data }: DepositWithdrawalTabProps) {
  const [action, setAction] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  // Get current balance from the current phase or first account
  const currentPhase = data.phases.find(phase => phase.is_current);
  const currentBalance = currentPhase?.current_balance || data.accounts[0]?.balance || 0;

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { enrollmentReviewService } = await import("@/services/enrollmentReviewService");
      const response = await enrollmentReviewService.manageFunds(data.enrollment.id, {
        action,
        amount: parseFloat(amount),
        comment: comment || "Manual Adjustment"
      });
      
      setLastResponse(response);
      setShowResponseDialog(true);
      
      // Reset form on success
      if (response.success) {
        setAmount("");
        setComment("");
      }
    } catch (error: any) {
      setLastResponse({
        success: false,
        error: error.message || "Failed to process transaction"
      });
      setShowResponseDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <Badge variant="outline" className="mt-2">
            Account: {data.enrollment.currency}
          </Badge>
        </CardContent>
      </Card>

      {/* Transaction Form */}
      <Card>
        <CardHeader>
          <CardTitle>Deposit / Withdrawal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="action">Action</Label>
            <Select value={action} onValueChange={(value: "deposit" | "withdraw") => setAction(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Deposit
                  </div>
                </SelectItem>
                <SelectItem value="withdraw">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    Withdraw
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Enter a note about this transaction"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
            className="w-full"
            variant={action === "deposit" ? "default" : "destructive"}
          >
            {isSubmitting ? "Processing..." : `${action === "deposit" ? "Deposit" : "Withdraw"} $${amount || "0.00"}`}
          </Button>
        </CardContent>
      </Card>

      <FundsResponseDialog
        isOpen={showResponseDialog}
        onClose={() => setShowResponseDialog(false)}
        response={lastResponse}
      />
    </div>
  );
}