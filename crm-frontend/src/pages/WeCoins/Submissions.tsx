import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, CheckCircle, XCircle, ExternalLink, Image } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

import { rewardSubmissionService } from '@/services/rewardSubmissionService';
import type { RewardSubmission, RewardSubmissionStatus } from '@/lib/types/rewardSubmission';

const Submissions = () => {
  const { toast } = useToast();
  
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<RewardSubmission | null>(null);
  
  const [approveFormData, setApproveFormData] = useState({
    reward_amount: '',
  });

  const [declineFormData, setDeclineFormData] = useState({
    admin_comment: '',
  });

  // Fetch submissions
  const { data: submissions, isLoading } = useQuery({
    queryKey: ['reward-submissions', statusFilter, searchQuery],
    queryFn: () => rewardSubmissionService.getSubmissions({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchQuery || undefined,
    }),
  });

  // Approve submission mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reward_amount?: number } }) =>
      rewardSubmissionService.approveSubmission(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['reward-submissions'] });
      toast({
        title: 'Success',
        description: response.data?.detail || 'Submission approved successfully',
      });
      setIsApproveDialogOpen(false);
      setIsDetailsDialogOpen(false);
      setSelectedSubmission(null);
      setApproveFormData({ reward_amount: '' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve submission',
        variant: 'destructive',
      });
    },
  });

  // Decline submission mutation
  const declineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { admin_comment: string } }) =>
      rewardSubmissionService.declineSubmission(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['reward-submissions'] });
      toast({
        title: 'Success',
        description: response.data?.detail || 'Submission declined',
      });
      setIsDeclineDialogOpen(false);
      setIsDetailsDialogOpen(false);
      setSelectedSubmission(null);
      setDeclineFormData({ admin_comment: '' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to decline submission',
        variant: 'destructive',
      });
    },
  });

  const handleViewDetails = (submission: RewardSubmission) => {
    setSelectedSubmission(submission);
    setIsDetailsDialogOpen(true);
  };

  const handleApprove = (submission: RewardSubmission) => {
    setSelectedSubmission(submission);
    setApproveFormData({ reward_amount: submission.reward_amount.toString() });
    setIsApproveDialogOpen(true);
  };

  const handleDecline = (submission: RewardSubmission) => {
    setSelectedSubmission(submission);
    setDeclineFormData({ admin_comment: '' });
    setIsDeclineDialogOpen(true);
  };

  const confirmApprove = () => {
    if (!selectedSubmission) return;
    approveMutation.mutate({
      id: selectedSubmission.id,
      data: approveFormData.reward_amount ? { reward_amount: parseFloat(approveFormData.reward_amount) } : {},
    });
  };

  const confirmDecline = () => {
    if (!selectedSubmission) return;
    declineMutation.mutate({
      id: selectedSubmission.id,
      data: { admin_comment: declineFormData.admin_comment },
    });
  };

  const getStatusBadgeVariant = (status: RewardSubmissionStatus) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'declined':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader title="WeCoins Submissions" />

      <Card>
        <CardContent className="p-3 sm:p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or task..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Reward Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Reviewed By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading submissions...
                    </TableCell>
                  </TableRow>
                ) : submissions?.data && submissions.data.length > 0 ? (
                  submissions.data.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">{submission.user_name}</TableCell>
                      <TableCell>{submission.task_title}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {submission.reward_amount} WeCoins
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(submission.status)}>
                          {submission.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(submission.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {submission.reviewed_at ? (
                          <div>
                            <div className="text-muted-foreground">
                              {formatDate(submission.reviewed_at)}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(submission)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {submission.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(submission)}
                                className="text-success hover:text-success"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDecline(submission)}
                                className="text-destructive hover:text-destructive"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No submissions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <p className="font-medium">{selectedSubmission.user_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Task</Label>
                  <p className="font-medium">{selectedSubmission.task_title}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reward Amount</Label>
                  <p className="font-semibold text-primary">{selectedSubmission.reward_amount} WeCoins</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusBadgeVariant(selectedSubmission.status)}>
                      {selectedSubmission.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Submitted</Label>
                  <p className="text-sm">{formatDate(selectedSubmission.created_at)}</p>
                </div>
                {selectedSubmission.reviewed_at && (
                  <div>
                    <Label className="text-muted-foreground">Reviewed</Label>
                    <p className="text-sm">{formatDate(selectedSubmission.reviewed_at)}</p>
                  </div>
                )}
              </div>

              {selectedSubmission.notes && (
                <div>
                  <Label className="text-muted-foreground">User Notes</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selectedSubmission.notes}</p>
                </div>
              )}

              {selectedSubmission.proof_url && (
                <div>
                  <Label className="text-muted-foreground">Proof URL</Label>
                  <a
                    href={selectedSubmission.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {selectedSubmission.proof_url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {selectedSubmission.proof_image && (
                <div>
                  <Label className="text-muted-foreground">Proof Screenshot</Label>
                  <div className="mt-2 relative rounded-lg overflow-hidden border border-border">
                    <a
                      href={selectedSubmission.proof_image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <img
                        src={selectedSubmission.proof_image}
                        alt="Proof screenshot"
                        className="w-full h-auto max-h-96 object-contain bg-muted"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-background/90 px-3 py-1.5 rounded-md flex items-center gap-2 text-sm">
                          <Image className="h-4 w-4" />
                          View Full Size
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
              )}

              {selectedSubmission.admin_comment && (
                <div>
                  <Label className="text-muted-foreground">Admin Comment</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                    {selectedSubmission.admin_comment}
                  </p>
                </div>
              )}

              {selectedSubmission.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      setIsDetailsDialogOpen(false);
                      handleApprove(selectedSubmission);
                    }}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setIsDetailsDialogOpen(false);
                      handleDecline(selectedSubmission);
                    }}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Submission</DialogTitle>
            <DialogDescription>
              Approve this submission and credit WeCoins to the user's wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reward_amount">Reward Amount (WeCoins)</Label>
              <Input
                id="reward_amount"
                type="number"
                step="0.01"
                value={approveFormData.reward_amount}
                onChange={(e) => setApproveFormData({ reward_amount: e.target.value })}
                placeholder="Enter reward amount"
              />
              <p className="text-xs text-muted-foreground">
                Leave as is to use the default task reward amount
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? 'Approving...' : 'Approve & Credit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Submission</DialogTitle>
            <DialogDescription>
              Decline this submission and provide a reason for the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin_comment">Admin Comment *</Label>
              <Textarea
                id="admin_comment"
                value={declineFormData.admin_comment}
                onChange={(e) => setDeclineFormData({ admin_comment: e.target.value })}
                placeholder="Explain why this submission is being declined..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeclineDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDecline}
              disabled={!declineFormData.admin_comment || declineMutation.isPending}
            >
              {declineMutation.isPending ? 'Declining...' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Submissions;
