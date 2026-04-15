
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, CheckCircle, XCircle, Bot, Filter } from 'lucide-react';
import { eaService, EARequest } from '@/services/eaService';

type EAStatus = 'all' | 'pending' | 'approved' | 'rejected';

const statusColors = {
  pending: 'default',
  approved: 'default',
  rejected: 'destructive',
} as const;

const ExpertAdvisors = () => {
  const { user, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<EARequest[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<EARequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EAStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<EARequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    let filtered = submissions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(submission => 
        submission.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.client_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(submission => submission.status === statusFilter);
    }

    setFilteredSubmissions(filtered);
  }, [submissions, searchTerm, statusFilter]);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      
      const response = await eaService.getEARequests();
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setSubmissions(response.data || []);
    } catch (error) {
      console.error('Error in fetchSubmissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch EA submissions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFile = async (submission: EARequest) => {
    try {
      const response = await eaService.getFileContent(submission.id);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      const content = response.data?.content || '';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = submission.mq5_file_url.split('/').pop() || 'ea-file.mq5';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Downloaded!",
        description: "EA file downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download EA file",
      });
    }
  };

  const approveSubmission = async (submission: EARequest) => {
    setIsProcessing(true);
    try {
      const response = await eaService.updateEARequest(submission.id, {
        status: 'approved'
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Update local state with the response
      setSubmissions(prev => prev.map(s => 
        s.id === submission.id ? response.data! : s
      ));

      toast({
        title: "EA Approved",
        description: `EA request from ${submission.client_name} has been approved successfully.`,
      });
    } catch (error: any) {
      console.error('Error approving EA:', error);
      toast({
        title: "Approval failed",
        description: error.message || "Failed to approve EA submission",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectSubmission = async (submission: EARequest, reason: string) => {
    setIsProcessing(true);
    try {
      const response = await eaService.updateEARequest(submission.id, {
        status: 'rejected',
        rejection_reason: reason
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Update local state with the response
      setSubmissions(prev => prev.map(s => 
        s.id === submission.id ? response.data! : s
      ));

      toast({
        title: "EA Rejected",
        description: `EA request from ${submission.client_name} has been rejected.`,
      });

      setSelectedSubmission(null);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error rejecting EA:', error);
      toast({
        title: "Rejection failed",
        description: error.message || "Failed to reject EA submission",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please sign in to access this page.</p>
      </div>
    );
  }

  if (!hasPermission('risk.manage_ea')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Access denied. You don't have permission to manage Expert Advisors.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading EA submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Expert Advisor Approval</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Review and approve trading bots submitted by traders
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>EA Submissions</CardTitle>
          <CardDescription>
            Manage Expert Advisor submissions and control which bots traders can use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: EAStatus) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">{submissions.filter(s => s.status === 'pending').length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{submissions.filter(s => s.status === 'approved').length}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{submissions.filter(s => s.status === 'rejected').length}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{submissions.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>EA File</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{submission.client_name}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {submission.enrollment_id.slice(0, 8)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{submission.client_email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[submission.status]}>
                        {submission.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {submission.mq5_file_url.split('/').pop() || 'ea-file.mq5'}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadFile(submission)}
                          className="text-xs w-fit"
                        >
                          Download
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {submission.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => approveSubmission(submission)}
                              disabled={isProcessing}
                              className="text-xs"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setSelectedSubmission(submission)}
                                  className="text-xs"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Reject
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reject EA Submission</DialogTitle>
                                  <DialogDescription>
                                    Provide a reason for rejecting the EA request from "{submission.client_name}"
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Textarea
                                    placeholder="Enter rejection reason..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={4}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <DialogTrigger asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogTrigger>
                                    <Button
                                      variant="destructive"
                                      onClick={() => rejectSubmission(submission, rejectionReason)}
                                      disabled={isProcessing || !rejectionReason.trim()}
                                    >
                                      {isProcessing ? "Processing..." : "Reject EA"}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredSubmissions.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No EA submissions found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpertAdvisors;
