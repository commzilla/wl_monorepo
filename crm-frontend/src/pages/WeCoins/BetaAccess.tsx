import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Clock, User, Calendar, MessageSquare } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { weCoinsBetaAccessService } from '@/services/weCoinsBetaAccessService';
import type { WeCoinsBetaAccess, BetaAccessStatus } from '@/lib/types/weCoinsBetaAccess';

const BetaAccess = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<WeCoinsBetaAccess | null>(null);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch beta access requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['wecoins-beta-access', statusFilter],
    queryFn: () => weCoinsBetaAccessService.getAll({
      status: statusFilter === 'all' ? undefined : statusFilter as BetaAccessStatus,
    }),
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => weCoinsBetaAccessService.approve(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wecoins-beta-access'] });
      toast({
        title: 'Success',
        description: data.detail || 'Request approved successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive',
      });
    },
  });

  // Decline mutation
  const declineMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      weCoinsBetaAccessService.decline(id, { admin_notes: notes }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wecoins-beta-access'] });
      toast({
        title: 'Success',
        description: data.detail || 'Request declined successfully',
      });
      setIsDeclineDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to decline request',
        variant: 'destructive',
      });
    },
  });

  const handleApprove = (request: WeCoinsBetaAccess) => {
    approveMutation.mutate(request.id);
  };

  const handleDeclineClick = (request: WeCoinsBetaAccess) => {
    setSelectedRequest(request);
    setIsDeclineDialogOpen(true);
  };

  const handleDeclineConfirm = () => {
    if (selectedRequest) {
      declineMutation.mutate({ id: selectedRequest.id, notes: adminNotes });
    }
  };

  const getStatusBadgeVariant = (status: BetaAccessStatus) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'declined':
        return 'destructive';
      case 'pending':
      case 'requested':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: BetaAccessStatus) => {
    switch (status) {
      case 'approved':
        return <Check className="h-3 w-3" />;
      case 'declined':
        return <X className="h-3 w-3" />;
      case 'pending':
      case 'requested':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const pendingCount = requests?.filter(r => r.status === 'pending' || r.status === 'requested').length || 0;
  const approvedCount = requests?.filter(r => r.status === 'approved').length || 0;
  const declinedCount = requests?.filter(r => r.status === 'declined').length || 0;

  return (
    <div className="space-y-3 sm:space-y-6">
      <div>
        <PageHeader title="WeCoins Beta Access" />
        <p className="text-sm sm:text-base text-muted-foreground mt-2">Manage beta access requests for WeCoins features</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-l-4 border-l-secondary">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Requests
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-bold">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Approved
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-primary">{approvedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Declined
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-destructive">{declinedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Request Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Reviewed At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading beta access requests...
                    </TableCell>
                  </TableRow>
                ) : requests && requests.length > 0 ? (
                  requests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{request.user_name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{request.user_email}</TableCell>
                      <TableCell className="max-w-xs">
                        {request.request_notes ? (
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span className="text-sm line-clamp-2">{request.request_notes}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(request.status)} className="gap-1 capitalize">
                          {getStatusIcon(request.status)}
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(request.requested_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.reviewed_at ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(request.reviewed_at).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(request.status === 'pending' || request.status === 'requested') && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleApprove(request)}
                              disabled={approveMutation.isPending}
                              className="gap-1"
                            >
                              <Check className="h-3 w-3" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeclineClick(request)}
                              disabled={declineMutation.isPending}
                              className="gap-1"
                            >
                              <X className="h-3 w-3" />
                              Decline
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No beta access requests found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <Dialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Beta Access Request</DialogTitle>
            <DialogDescription>
              Provide a reason for declining {selectedRequest?.user_name}'s request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin_notes">Admin Notes</Label>
              <Textarea
                id="admin_notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter reason for declining..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeclineDialogOpen(false);
                setSelectedRequest(null);
                setAdminNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineConfirm}
              disabled={!adminNotes.trim()}
            >
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BetaAccess;
