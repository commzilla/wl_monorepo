import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { kycService, type ClientKYC } from '@/services/kycService';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  CheckCircle, 
  Clock, 
  Search, 
  XCircle, 
  AlertTriangle,
  Loader2 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

const KYC = () => {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVerification, setSelectedVerification] = useState<ClientKYC | null>(null);
  const [updatedStatus, setUpdatedStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Use React Query for data fetching
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['kyc-verifications', searchQuery, statusFilter],
    queryFn: () => kycService.getKycVerifications({
      search: searchQuery || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined
    }),
    retry: 1,
  });

  const verifications = response?.results || [];

  // Show error if API call fails
  useEffect(() => {
    if (error) {
      console.error('KYC fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to load KYC verifications",
        variant: "destructive",
      });
    }
  }, [error]);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-500 border-amber-500"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500"><AlertTriangle className="h-3 w-3 mr-1" /> In Progress</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };
  
  const openVerificationDetails = (verification: ClientKYC) => {
    setSelectedVerification(verification);
    setUpdatedStatus(verification.status);
    setNotes('');
    setDialogOpen(true);
  };
  
  const updateVerificationStatus = async () => {
    if (!selectedVerification || !updatedStatus) return;
    
    try {
      setIsUpdating(true);
      await kycService.updateKycStatus(
        selectedVerification.id,
        updatedStatus,
        notes,
        selectedVerification.client
      );
      
      toast({
        title: "Status updated",
        description: `Verification status updated to ${updatedStatus}`,
      });
      
      setDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error updating KYC status:', error);
      toast({
        title: "Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (error) {
    return (
      <div>
        <PageHeader 
          title="KYC Management" 
          subtitle="Manage trader identity verifications"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive">Failed to load KYC verifications</p>
              <Button onClick={() => refetch()} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div>
      <PageHeader 
        title="KYC Management" 
        subtitle="Manage trader identity verifications"
      />
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or session ID..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Verification Requests</CardTitle>
          <CardDescription>
            Manage KYC verification requests from traders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : verifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No verification requests found</div>
            ) : isMobile ? (
              <div className="space-y-3">
                {verifications.map((verification: ClientKYC) => (
                  <Card key={verification.id} className="p-4 space-y-2 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => openVerificationDetails(verification)}>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{verification.client_name}</div>
                        <div className="text-xs text-muted-foreground truncate">{verification.client_email}</div>
                      </div>
                      {getStatusBadge(verification.status)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{format(new Date(verification.initiate_date), 'MMM d, yyyy')}</span>
                      <Badge variant={verification.rise_invite_sent ? "default" : "secondary"} className="text-xs">
                        RISE: {verification.rise_invite_sent ? "Sent" : "Not Sent"}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Initiate Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>RISE Invite</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.map((verification: ClientKYC) => (
                    <TableRow key={verification.id}>
                      <TableCell>{verification.client_name}</TableCell>
                      <TableCell>{verification.client_email}</TableCell>
                      <TableCell>{format(new Date(verification.initiate_date), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell>{getStatusBadge(verification.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={verification.rise_invite_sent ? "default" : "secondary"} className="text-xs">
                            {verification.rise_invite_sent ? "Sent" : "Not Sent"}
                          </Badge>
                          {verification.rise_invite_sent && (
                            <Badge variant={verification.rise_invite_accepted ? "default" : "outline"} className="text-xs">
                              {verification.rise_invite_accepted ? "Accepted" : "Pending"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {verification.session_id ? (
                          <div className="text-xs">
                            <div>ID: {verification.session_id}</div>
                            {verification.session_link && (
                              <a href={verification.session_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                View Session
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">No session</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs max-w-32 truncate">
                          {verification.note || verification.operator_remark || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openVerificationDetails(verification)}
                        >
                          <Search className="h-4 w-4 mr-1" /> Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-6 border-b border-border">
            <DialogTitle className="text-2xl font-semibold">Verification Details</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Comprehensive view and management of KYC verification
            </DialogDescription>
          </DialogHeader>
          
          {selectedVerification && (
            <div className="py-6 space-y-8">
              {/* Client Information Section */}
              <div className="bg-gradient-to-r from-background to-muted/30 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <div className="w-2 h-6 bg-primary rounded-full mr-3"></div>
                  Client Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                    <div className="text-lg font-semibold p-3 bg-background rounded-md border">
                      {selectedVerification.client_name}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
                    <div className="text-lg font-semibold p-3 bg-background rounded-md border">
                      {selectedVerification.client_email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Section */}
              <div className="bg-gradient-to-r from-background to-muted/30 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <div className="w-2 h-6 bg-blue-500 rounded-full mr-3"></div>
                  Timeline
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Initiated</Label>
                    <div className="text-base font-medium p-3 bg-background rounded-md border">
                      {format(new Date(selectedVerification.initiate_date), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                    <div className="text-base font-medium p-3 bg-background rounded-md border">
                      {format(new Date(selectedVerification.updated_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              </div>

              {/* RISE Integration Status */}
              <div className="bg-gradient-to-r from-background to-muted/30 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <div className="w-2 h-6 bg-green-500 rounded-full mr-3"></div>
                  RISE Integration Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Invite Status</Label>
                    <div className="flex gap-2 p-3 bg-background rounded-md border">
                      <Badge variant={selectedVerification.rise_invite_sent ? "default" : "secondary"} className="text-sm px-3 py-1">
                        {selectedVerification.rise_invite_sent ? "Sent" : "Not Sent"}
                      </Badge>
                      {selectedVerification.rise_invite_sent && (
                        <Badge variant={selectedVerification.rise_invite_accepted ? "default" : "outline"} className="text-sm px-3 py-1">
                          {selectedVerification.rise_invite_accepted ? "Accepted" : "Pending"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Session ID</Label>
                    <div className="text-base font-medium p-3 bg-background rounded-md border">
                      {selectedVerification.session_id || "No session available"}
                    </div>
                  </div>
                </div>

                {selectedVerification.session_link && (
                  <div className="mt-4 space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Session Link</Label>
                    <div className="p-3 bg-background rounded-md border">
                      <a 
                        href={selectedVerification.session_link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:text-primary/80 font-medium underline underline-offset-2"
                      >
                        View Verification Session →
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* System IDs Section */}
              <div className="bg-gradient-to-r from-background to-muted/30 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <div className="w-2 h-6 bg-indigo-500 rounded-full mr-3"></div>
                  System Identifiers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Verification ID</Label>
                    <div className="text-base font-medium p-3 bg-background rounded-md border font-mono">
                      {selectedVerification.id}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Client ID</Label>
                    <div className="text-base font-medium p-3 bg-background rounded-md border font-mono">
                      {selectedVerification.client}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">RISE Invite ID</Label>
                    <div className="text-base font-medium p-3 bg-background rounded-md border font-mono">
                      {selectedVerification.rise_invite_id || "N/A"}
                    </div>
                  </div>
                </div>
                {selectedVerification.operator && (
                  <div className="mt-4 space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Operator</Label>
                    <div className="text-base font-medium p-3 bg-background rounded-md border">
                      {selectedVerification.operator}
                    </div>
                  </div>
                )}
              </div>

              {/* API Response Section */}
              {selectedVerification.rise_api_response && (
                <div className="bg-gradient-to-r from-background to-muted/30 p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <div className="w-2 h-6 bg-purple-500 rounded-full mr-3"></div>
                    RISE API Response
                  </h3>
                  <div className="bg-slate-900 text-green-400 p-4 rounded-lg border overflow-x-auto">
                    <pre className="text-sm font-mono whitespace-pre-wrap">
                      {JSON.stringify(selectedVerification.rise_api_response, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Webhook Response Section */}
              {selectedVerification.rise_webhook_response && (
                <div className="bg-gradient-to-r from-background to-muted/30 p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <div className="w-2 h-6 bg-cyan-500 rounded-full mr-3"></div>
                    RISE Webhook Response
                  </h3>
                  <div className="bg-slate-900 text-cyan-400 p-4 rounded-lg border overflow-x-auto">
                    <pre className="text-sm font-mono whitespace-pre-wrap">
                      {JSON.stringify(selectedVerification.rise_webhook_response, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Existing Notes Section */}
              <div className="bg-gradient-to-r from-background to-muted/30 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <div className="w-2 h-6 bg-amber-500 rounded-full mr-3"></div>
                  Existing Notes
                </h3>
                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-amber-900 dark:text-amber-100 leading-relaxed">
                    {selectedVerification.note || selectedVerification.operator_remark || "No notes available"}
                  </p>
                </div>
              </div>
              
              {/* Status Management Section */}
              <div className="bg-gradient-to-r from-background to-muted/30 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <div className="w-2 h-6 bg-red-500 rounded-full mr-3"></div>
                  Status Management
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium text-muted-foreground">Update Status</Label>
                    <Select 
                      value={updatedStatus || ''} 
                      onValueChange={(value) => setUpdatedStatus(value)}
                    >
                      <SelectTrigger id="status" className="h-12 text-base">
                        <SelectValue placeholder="Select verification status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">Add Administrative Notes</Label>
                    <Textarea 
                      id="notes" 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add detailed notes about this verification decision..."
                      rows={4}
                      className="text-base resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="pt-6 border-t border-border">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="px-6">
              Cancel
            </Button>
            <Button 
              onClick={updateVerificationStatus}
              disabled={isUpdating}
              className="px-6"
            >
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Verification Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KYC;