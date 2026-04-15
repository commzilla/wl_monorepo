import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Plus, ChevronLeft, ChevronRight, ExternalLink, FileDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

import { useToast } from "@/hooks/use-toast";
import { usePayoutFilters } from '@/hooks/usePayoutFilters';
import { apiService } from '@/services/apiService';
import PayoutRequestDialog from '@/components/payouts/PayoutRequestDialog';
import PayoutDetailsDialog from '@/components/payouts/PayoutDetailsDialog';
import { PayoutFilters } from '@/components/payouts/PayoutFilters';
import { PayoutStatsCard, PayoutOverview } from '@/components/payouts/PayoutStatsCard';
import { PayoutExportDialog } from '@/components/payouts/PayoutExportDialog';

export interface TraderPayout {
  id: string;
  trader: string;
  trader_username: string;
  trader_email?: string;
  challenge_name?: string;
  mt5_account_id: string;
  account_size: string;
  amount: string;
  profit: string;
  profit_share: string;
  net_profit: string;
  released_fund: string;
  method: 'paypal' | 'bank' | 'crypto';
  method_details: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  admin_note?: string;
  rejection_reason?: string;
  exclude_amount?: string;
  exclude_reason?: string;
  requested_at: string;
  reviewed_at?: string;
  paid_at?: string;
  challenge_enrollment?: {
    id: string;
  };
}

interface PayoutApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    overview: PayoutOverview;
    results: TraderPayout[];
  };
}

const PayoutRequest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Filter states with persistence
  const {
    search,
    status,
    traderEmail,
    traderUsername,
    dateFrom,
    dateTo,
    ordering,
    setSearch,
    setStatus,
    setTraderEmail,
    setTraderUsername,
    setDateFrom,
    setDateTo,
    setOrdering,
    clearFilters,
  } = usePayoutFilters();
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<TraderPayout | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Build query parameters
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    if (search) params.append('search', search);
    if (status && status !== 'all') params.append('status', status);
    if (traderEmail) params.append('trader_email', traderEmail);
    if (traderUsername) params.append('trader_username', traderUsername);
    if (dateFrom) params.append('date_after', dateFrom);
    if (dateTo) params.append('date_before', dateTo);
    if (ordering) params.append('ordering', ordering);
    
    params.append('page', currentPage.toString());
    params.append('page_size', pageSize.toString());
    
    return params.toString();
  };

  // Fetch payouts from API with filters and pagination
  const { data: payoutData, isLoading, refetch } = useQuery({
    queryKey: ['payouts', search, status, traderEmail, traderUsername, dateFrom, dateTo, ordering, currentPage, pageSize],
    queryFn: async () => {
      const queryString = buildQueryParams();
      const response = await apiService.get<PayoutApiResponse>(`/payouts/?${queryString}`);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });

  // Extract data from API response with proper fallbacks
  const payouts = Array.isArray(payoutData?.results?.results) ? payoutData.results.results : [];
  const overview = payoutData?.results?.overview || {
    total_count: 0,
    total_amount: 0,
    total_profit: 0,
    total_net_profit: 0,
    total_profit_share: 0,
    total_pending_payout: 0,
    total_rejected_amount: 0,
    total_approved_profit: 0,
    total_approved_net_profit: 0,
    status_counts: {}
  };
  const totalPages = payoutData?.count ? Math.ceil(payoutData.count / pageSize) : 1;

  const handleViewDetails = (payout: TraderPayout) => {
    setSelectedPayout(payout);
    setIsDetailsDialogOpen(true);
  };

  const handleStatusUpdate = async (payoutId: string, newStatus: string) => {
    try {
      const response = await apiService.put(`/payouts/${payoutId}/`, { status: newStatus });
      if (response.error) {
        throw new Error(response.error);
      }
      toast({
        title: "Success",
        description: "Payout status updated successfully",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payout status",
        variant: "destructive",
      });
    }
  };

  const handleClearFilters = () => {
    clearFilters();
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, traderEmail, traderUsername, dateFrom, dateTo, ordering]);

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'extended_review':
        return 'Extended Review';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "info" | "warning" | "success" => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'approved':
        return 'info';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'secondary';
      case 'extended_review':
        return 'default';
      case 'pending':
      default:
        return 'warning';
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <PageHeader 
        title="Payout Management" 
        subtitle="Manage trader payout requests and payments"
      />
      
      {/* Overview Stats */}
      {overview && overview.total_count > 0 && (
        <div className="mt-6">
          <PayoutStatsCard overview={overview} />
        </div>
      )}
      
      {/* Filters */}
      <div className="mt-6">
        <PayoutFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          traderEmail={traderEmail}
          onTraderEmailChange={setTraderEmail}
          traderUsername={traderUsername}
          onTraderUsernameChange={setTraderUsername}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          ordering={ordering}
          onOrderingChange={setOrdering}
          onClearFilters={handleClearFilters}
        />
      </div>
      
      {/* Payouts Table */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <CardTitle className="text-lg font-semibold">
              Payout Requests ({payoutData?.count || 0} total)
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExportDialogOpen(true)}
                disabled={isLoading}
                className="gap-2"
              >
                <FileDown size={16} />
                {!isMobile && 'Export'}
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus size={16} />
                New Request
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading payouts...</div>
          ) : isMobile ? (
            /* Mobile: Card-based layout */
            <div className="space-y-3">
              {payouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payout requests found</div>
              ) : payouts.map((payout) => (
                <Card key={payout.id} className="p-4 space-y-2 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => handleViewDetails(payout)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{payout.trader_username}</div>
                      {payout.trader_email && (
                        <div className="text-xs text-muted-foreground">{payout.trader_email}</div>
                      )}
                    </div>
                    <Badge variant={getStatusVariant(payout.status)}>
                      {getStatusLabel(payout.status)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Amount</span>
                      <div className="font-semibold">{formatCurrency(payout.amount)}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Net Profit</span>
                      <div className="font-semibold text-success">{formatCurrency(payout.net_profit)}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">MT5</span>
                      <div className="font-mono text-xs">{payout.mt5_account_id}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Requested</span>
                      <div className="text-xs">{formatDate(payout.requested_at)}</div>
                    </div>
                  </div>
                  {payout.challenge_enrollment && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/trading-activity/payout/${payout.id}`); }}>
                        Review
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Trader</TableHead>
                   <TableHead>MT5 Account</TableHead>
                   <TableHead>Challenge Name</TableHead>
                   <TableHead>Account Size</TableHead>
                   <TableHead>Amount</TableHead>
                   <TableHead>Profit</TableHead>
                   <TableHead>Share (%)</TableHead>
                   <TableHead>Net Profit</TableHead>
                   <TableHead>Status</TableHead>
                    <TableHead>Requested/Reviewed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
              <TableBody>
                 {payouts.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={11} className="text-center py-8">
                       No payout requests found
                     </TableCell>
                   </TableRow>
                 ) : (
                     payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{payout.trader_username}</div>
                            {payout.trader_email && (
                              <div className="text-sm text-muted-foreground">{payout.trader_email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payout.mt5_account_id}
                        </TableCell>
                        <TableCell>
                          {payout.challenge_name || '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payout.account_size)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payout.amount)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(payout.profit)}
                        </TableCell>
                        <TableCell>
                          {payout.profit_share}%
                        </TableCell>
                        <TableCell className="text-success font-semibold">
                          {formatCurrency(payout.net_profit)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(payout.status)}>
                            {getStatusLabel(payout.status)}
                          </Badge>
                        </TableCell>
                         <TableCell>
                           <div>
                             <div className="text-sm">{formatDate(payout.requested_at)}</div>
                             {payout.reviewed_at && (
                               <div className="text-xs text-muted-foreground mt-0.5">
                                 Reviewed: {formatDate(payout.reviewed_at)}
                               </div>
                             )}
                           </div>
                         </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(payout)}
                            >
                              <Eye size={16} />
                            </Button>
                             {payout.challenge_enrollment && (
                               <>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => window.open(`/trading-activity/payout/${payout.id}`, '_blank')}
                                   className="text-primary hover:text-primary/80"
                                   title="Open in new tab"
                                 >
                                   <ExternalLink size={16} />
                                 </Button>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => navigate(`/trading-activity/payout/${payout.id}`)}
                                   className="text-primary hover:text-primary/80"
                                 >
                                   Review
                                 </Button>
                               </>
                             )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-4 border-t gap-3">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <PayoutRequestDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={() => {
          refetch();
          setIsCreateDialogOpen(false);
        }}
      />

      <PayoutDetailsDialog
        payout={selectedPayout}
        isOpen={isDetailsDialogOpen}
        onClose={() => {
          setSelectedPayout(null);
          setIsDetailsDialogOpen(false);
        }}
        onStatusUpdate={handleStatusUpdate}
      />

      <PayoutExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
      />
    </div>
  );
};

export default PayoutRequest;
