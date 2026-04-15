
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { useLanguage } from '@/hooks/useLanguage';
import TraderCard from '@/components/traders/TraderCard';
import TraderSearch from '@/components/traders/TraderSearch';
import TraderFilters from '@/components/traders/TraderFilters';
import AddTraderDialog from '@/components/traders/AddTraderDialog';
import { traderService, ApiTrader, TraderListParams } from '@/services/traderService';
import { toast } from '@/hooks/use-toast';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface DisplayTrader {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  fullAddress: string;
  kycStatus: 'approved' | 'rejected' | 'pending' | 'not_submitted';
  hasLiveAccount: boolean;
  registeredAt: Date;
  challenges: { 
    id: string; 
    status: string;
    name?: string;
    type?: string;
    product_name?: string;
    target_amount?: number;
    current_amount?: number;
    start_date?: string;
    end_date?: string;
    profit_target?: number;
    max_loss?: number;
    daily_loss_limit?: number;
    phase?: string;
  }[];
  accounts: { status: string }[];
}

const Traders = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [kycFilter, setKycFilter] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [ordering, setOrdering] = React.useState('-user__date_joined');

  // Build query parameters
  const queryParams: TraderListParams = {
    page: currentPage,
    page_size: pageSize,
    search: searchQuery || undefined,
    kyc_status: kycFilter !== 'all' ? kycFilter : undefined,
    ordering: ordering,
  };

  const { data: paginatedData, isLoading, error, refetch } = useQuery({
    queryKey: ['traders', queryParams],
    queryFn: async () => {
      try {
        return await traderService.getTraders(queryParams);
      } catch (error) {
        console.error('Error fetching traders:', error);
        toast({
          title: 'Error',
          description: 'Failed to load traders',
          variant: "destructive",
        });
        throw error;
      }
    },
  });

  // Transform API data to display format
  const traders: DisplayTrader[] = React.useMemo(() => {
    const apiTraders = paginatedData?.results || [];
    
    return apiTraders.map((trader: ApiTrader) => {
      // Extract country from full_address
      const extractCountry = (addressInfo: string): string => {
        if (!addressInfo || addressInfo.trim() === '') {
          return 'Not specified';
        }
        const parts = addressInfo.split(',').map(part => part.trim());
        const country = parts.length > 0 ? parts[parts.length - 1] : 'Not specified';
        return country;
      };
      
      const displayTrader: DisplayTrader = {
        id: trader.id,
        firstName: trader.first_name || '',
        lastName: trader.last_name || '',
        email: trader.email || '',
        phone: trader.phone || 'Not provided',
        country: extractCountry(trader.full_address || ''),
        fullAddress: trader.full_address || 'Not provided',
        kycStatus: trader.kyc_status || 'not_submitted',
        hasLiveAccount: trader.has_live_account || false,
        registeredAt: new Date(),
        challenges: Array.isArray(trader.challenges) 
          ? trader.challenges.map((challenge, i) => ({
              id: challenge.id || `challenge-${i}`,
              status: challenge.status || 'active',
              name: challenge.name,
              type: challenge.type,
              product_name: challenge.product_name,
              target_amount: challenge.target_amount,
              current_amount: challenge.current_amount,
              start_date: challenge.start_date,
              end_date: challenge.end_date,
              profit_target: challenge.profit_target,
              max_loss: challenge.max_loss,
              daily_loss_limit: challenge.daily_loss_limit,
              phase: challenge.phase
            }))
          : Array.from({ length: Number(trader.challenges) || 0 }, (_, i) => ({
              id: `challenge-${i}`,
              status: 'active'
            })),
        accounts: Array.from({ length: trader.active_accounts || 0 }, () => ({
          status: 'active'
        })),
      };

      return displayTrader;
    });
  }, [paginatedData?.results]);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, kycFilter, ordering]);

  // Calculate pagination info
  const totalPages = Math.ceil((paginatedData?.count || 0) / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, paginatedData?.count || 0);

  const handleTraderAdded = () => {
    refetch();
  };

  const handleTraderUpdated = () => {
    refetch();
  };

  const handleTraderDeleted = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader 
          title={t('traders.title') || 'Traders'}
          subtitle={t('traders.subtitle') || 'Manage trader accounts and challenges'}
          actions={<AddTraderDialog onSuccess={handleTraderAdded} />}
        />
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading traders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Query error:', error);
    return (
      <div>
        <PageHeader 
          title={t('traders.title') || 'Traders'}
          subtitle={t('traders.subtitle') || 'Manage trader accounts and challenges'}
          actions={<AddTraderDialog onSuccess={handleTraderAdded} />}
        />
        <div className="text-center py-8">
          <p className="text-muted-foreground text-red-500">Error loading traders. Please try again.</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader 
        title={t('traders.title') || 'Traders'}
        subtitle={t('traders.subtitle') || 'Manage trader accounts and challenges'}
        actions={<AddTraderDialog onSuccess={handleTraderAdded} />}
      />
      
      {/* Search and Filters */}
      <div className="space-y-4">
        <TraderSearch 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* KYC Status Filter */}
          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-medium text-muted-foreground">KYC Status</label>
            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="not_submitted">Not Submitted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-medium text-muted-foreground">Sort by</label>
            <Select value={ordering} onValueChange={setOrdering}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-user__date_joined">Newest First</SelectItem>
                <SelectItem value="user__date_joined">Oldest First</SelectItem>
                <SelectItem value="user__first_name">Name A-Z</SelectItem>
                <SelectItem value="-user__first_name">Name Z-A</SelectItem>
                <SelectItem value="user__email">Email A-Z</SelectItem>
                <SelectItem value="-user__email">Email Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Page Size */}
          <div className="space-y-1">
            <label className="text-xs sm:text-sm font-medium text-muted-foreground">Per page</label>
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {paginatedData && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 text-xs sm:text-sm text-muted-foreground">
          <p>
            Showing {startIndex} to {endIndex} of {paginatedData.count} traders
          </p>
          <p>
            Page {currentPage} of {totalPages}
          </p>
        </div>
      )}
      
      {/* Traders Grid */}
      <div className="grid grid-cols-1 gap-4">
        {traders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {paginatedData?.count === 0 ? 'No traders found in the system.' : 'No traders found matching your criteria.'}
            </p>
          </div>
        ) : (
          traders.map(trader => (
            <TraderCard 
              key={trader.id} 
              trader={trader} 
              onUpdated={handleTraderUpdated}
              onDeleted={handleTraderDeleted}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default Traders;
