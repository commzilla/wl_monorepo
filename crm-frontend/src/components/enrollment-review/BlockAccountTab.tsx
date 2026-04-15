import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Shield, User, CreditCard } from 'lucide-react';
import { EnrollmentReviewResponse, BlockAccountRequest } from '@/lib/types/enrollmentReview';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BlockAccountResponseDialog } from './BlockAccountResponseDialog';

interface BlockAccountTabProps {
  data: EnrollmentReviewResponse;
  enrollmentId: string;
}

export const BlockAccountTab: React.FC<BlockAccountTabProps> = ({ data, enrollmentId }) => {
  const [title, setTitle] = useState('');
  const [explanation, setExplanation] = useState('');
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const blockAccountMutation = useMutation({
    mutationFn: (request: BlockAccountRequest) => 
      enrollmentReviewService.blockAccount(enrollmentId, request),
    onSuccess: (response) => {
      setLastResponse(response);
      setResponseDialogOpen(true);
      if (response.success) {
        toast.success('Account blocked successfully');
        setTitle('');
        setExplanation('');
      } else {
        toast.error(response.error || 'Failed to block account');
      }
    },
    onError: (error: any) => {
      const errorResponse = {
        success: false,
        error: error.message || 'Failed to block account',
        enrollment_id: enrollmentId,
        mt5_account_id: data.enrollment.id
      };
      setLastResponse(errorResponse);
      setResponseDialogOpen(true);
      toast.error(error.message || 'Failed to block account');
    },
  });

  const handleBlockAccount = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!explanation.trim()) {
      toast.error('Explanation is required');
      return;
    }

    blockAccountMutation.mutate({
      title: title.trim(),
      explanation: explanation.trim()
    });
  };

  const currentPhase = data.phases.find(phase => phase.is_current);
  const currentAccount = data.accounts.find(account => account.phase_type === currentPhase?.phase_type);

  return (
    <>
      <div className="space-y-6">
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Block Account - Danger Zone
            </CardTitle>
            <CardDescription>
              This action will permanently block the MT5 account, mark the challenge as failed, 
              and notify the user. This action cannot be undone.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Client</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.client_profile.full_name}</div>
              <p className="text-xs text-muted-foreground">{data.client_profile.email}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MT5 Account</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentAccount?.mt5_account_id || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Balance: ${currentAccount?.balance?.toFixed(2) || '0.00'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Challenge Status</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{data.enrollment.status}</div>
              <p className="text-xs text-muted-foreground">
                {data.enrollment.challenge_name}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Block Account Details</CardTitle>
            <CardDescription>
              Provide the reason and explanation for blocking this account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Breach: Over-leverage, Rule Violation, etc."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={blockAccountMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="explanation">Explanation *</Label>
              <Textarea
                id="explanation"
                placeholder="Detailed explanation of why the account is being blocked..."
                rows={4}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                disabled={blockAccountMutation.isPending}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                variant="destructive"
                onClick={handleBlockAccount}
                disabled={blockAccountMutation.isPending || !title.trim() || !explanation.trim()}
              >
                {blockAccountMutation.isPending ? (
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
          </CardContent>
        </Card>
      </div>

      <BlockAccountResponseDialog
        open={responseDialogOpen}
        onOpenChange={setResponseDialogOpen}
        response={lastResponse}
      />
    </>
  );
};