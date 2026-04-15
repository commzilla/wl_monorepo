import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Eye, DollarSign, Clock, CheckCircle, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { AffiliatePayout, CreateAffiliatePayoutData, UpdateAffiliatePayoutData } from '@/services/affiliateService';
import { PayoutDialog } from './PayoutDialog';
import { PayoutDetailsDialog } from './PayoutDetailsDialog';
import PayoutFilters from './PayoutFilters';
import { useToast } from '@/hooks/use-toast';

interface AffiliatePayoutsProps {
  payouts: AffiliatePayout[] | undefined;
  summary?: {
    total_payouts: number;
    approved_paid: number;
    pending_payouts: number;
    by_status: Array<{
      status: string;
      count: number;
      total: number;
    }>;
  };
  pagination?: {
    count: number;
    next: string | null;
    previous: string | null;
    currentPage: number;
    totalPages: number;
  };
  isLoading: boolean;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
  onCreatePayout: (data: CreateAffiliatePayoutData) => Promise<void>;
  onUpdatePayout: (id: string, data: UpdateAffiliatePayoutData) => Promise<void>;
  onDeletePayout: (id: string) => Promise<void>;
  onFiltersChange: (filters: any) => void;
}

const AffiliatePayouts = React.memo<AffiliatePayoutsProps>(({ 
  payouts, 
  summary,
  pagination,
  isLoading, 
  onRefresh,
  onPageChange,
  onCreatePayout,
  onUpdatePayout,
  onDeletePayout,
  onFiltersChange
}) => {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<AffiliatePayout | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('-requested_at');

  // Apply filters whenever they change
  useEffect(() => {
    const filters: any = {};
    
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (typeFilter !== 'all') filters.is_manual = typeFilter === 'true';
    if (dateRangeFilter !== 'all') {
      if (dateRangeFilter === 'custom') {
        if (fromDate) filters.processed_from = fromDate;
        if (toDate) filters.processed_to = toDate;
      }
    }
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    if (sortBy) filters.ordering = sortBy;

    onFiltersChange(filters);
  }, [statusFilter, typeFilter, dateRangeFilter, fromDate, toDate, searchQuery, sortBy, onFiltersChange]);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setDateRangeFilter('all');
    setFromDate('');
    setToDate('');
    setSearchQuery('');
    setSortBy('-requested_at');
  };
  if (isLoading) {
    return (
      <Card className="glass-card border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Affiliate Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">{status}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{status}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleCreatePayout = async (data: CreateAffiliatePayoutData) => {
    setActionLoading(true);
    try {
      await onCreatePayout(data);
      toast({
        title: "Success",
        description: "Payout created successfully",
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create payout",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePayout = async (data: UpdateAffiliatePayoutData) => {
    if (!selectedPayout) return;
    setActionLoading(true);
    try {
      await onUpdatePayout(selectedPayout.id, data);
      toast({
        title: "Success",
        description: "Payout updated successfully",
      });
      setSelectedPayout(null);
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payout",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePayout = async () => {
    if (!selectedPayout) return;
    setActionLoading(true);
    try {
      await onDeletePayout(selectedPayout.id);
      toast({
        title: "Success",
        description: "Payout deleted successfully",
      });
      setSelectedPayout(null);
      setDeleteDialogOpen(false);
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete payout",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <PayoutFilters
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        dateRangeFilter={dateRangeFilter}
        onDateRangeFilterChange={setDateRangeFilter}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onClearFilters={handleClearFilters}
      />

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="glass-card border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Payouts</p>
                  <p className="text-2xl font-bold">${(summary.total_payouts || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved/Paid</p>
                  <p className="text-2xl font-bold">${(summary.approved_paid || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">${(summary.pending_payouts || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Eye className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">By Status</p>
                  <div className="flex gap-2 mt-1">
                    {(summary.by_status || []).map((status, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {status.status}: {status.count || 0}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="glass-card border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Affiliate Payouts
            </CardTitle>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Payout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
        {!Array.isArray(payouts) || payouts.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isLoading ? "Loading payouts..." : "No payout data available"}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(payouts) && payouts.map((payout) => (
                  <TableRow key={payout.id} className="hover:bg-muted/10">
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {payout.affiliate}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                          ${parseFloat(payout.amount.toString()).toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payout.status)}
                        {getStatusBadge(payout.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(payout.requested_at).toLocaleDateString()}</p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(payout.requested_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {payout.processed_at ? (
                        <div className="text-sm">
                          <p>{new Date(payout.processed_at).toLocaleDateString()}</p>
                          <p className="text-muted-foreground text-xs">
                            {new Date(payout.processed_at).toLocaleTimeString()}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {payout.transaction_id ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {payout.transaction_id}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payout.is_manual ? 'secondary' : 'outline'}>
                        {payout.is_manual ? 'Manual' : 'Automatic'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedPayout(payout);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedPayout(payout);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedPayout(payout);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.count} total items)
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => pagination.currentPage > 1 && onPageChange(pagination.currentPage - 1)}
                      className={pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i;
                    if (page > pagination.totalPages) return null;
                    
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => onPageChange(page)}
                          isActive={page === pagination.currentPage}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => pagination.currentPage < pagination.totalPages && onPageChange(pagination.currentPage + 1)}
                      className={pagination.currentPage === pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <PayoutDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreatePayout}
        isLoading={actionLoading}
      />

      <PayoutDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        payout={selectedPayout || undefined}
        onSubmit={handleUpdatePayout}
        isLoading={actionLoading}
      />

      <PayoutDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        payout={selectedPayout}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payout? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayout}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

AffiliatePayouts.displayName = 'AffiliatePayouts';

export default AffiliatePayouts;