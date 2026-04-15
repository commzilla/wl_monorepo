
/**
 * Affiliates Management Page
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Lazy Loading: Queries only fetch when their tab is active (enabled prop)
 * 2. React Query Caching: 2-3 minute staleTime to reduce API calls
 * 3. Memoization: useCallback for handlers, useMemo for computed values
 * 4. Component Memoization: Key child components wrapped with React.memo
 * 5. Tab State Management: Controlled tab switching prevents unnecessary renders
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { affiliateService, CreateAffiliatePayoutData, UpdateAffiliatePayoutData, AffiliateReferral } from '@/services/affiliateService';
import AffiliateDashboard from '@/components/affiliates/AffiliateDashboard';
import AffiliateSales from '@/components/affiliates/AffiliateSales';
import AffiliatePayouts from '@/components/affiliates/AffiliatePayouts';
import AffiliateUsersTab from '@/components/affiliates/AffiliateUsersTab';
import TopAffiliatesTab from '@/components/affiliates/TopAffiliatesTab';
import { BadgePercent } from 'lucide-react';

const Affiliates = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [payoutsQuery, setPayoutsQuery] = useState({ page: 1, page_size: 10 });
  const [referralFilters, setReferralFilters] = useState({ page: 1, page_size: 10 });

  // Lazy load: only fetch dashboard data when on dashboard tab
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['affiliate-dashboard'],
    queryFn: () => affiliateService.getDashboard(),
    enabled: activeTab === 'dashboard',
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  // Lazy load: only fetch referrals when on sales tab
  const { data: referralsData, isLoading: referralsLoading, refetch: refetchReferrals } = useQuery({
    queryKey: ['affiliate-referrals', referralFilters],
    queryFn: () => affiliateService.getReferrals(referralFilters),
    enabled: activeTab === 'sales',
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Lazy load: only fetch payouts when on payouts tab
  const { data: payoutsData, isLoading: payoutsLoading, refetch: refetchPayouts } = useQuery({
    queryKey: ['affiliate-payouts', payoutsQuery],
    queryFn: () => affiliateService.getPayouts(payoutsQuery),
    enabled: activeTab === 'payouts',
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // CRUD handlers for payouts - memoized to prevent re-creation
  const handleCreatePayout = useCallback(async (data: CreateAffiliatePayoutData) => {
    const result = await affiliateService.createPayout(data);
    if (!result) {
      throw new Error('Failed to create payout');
    }
  }, []);

  const handleUpdatePayout = useCallback(async (id: string, data: UpdateAffiliatePayoutData) => {
    const result = await affiliateService.updatePayout(id, data);
    if (!result) {
      throw new Error('Failed to update payout');
    }
  }, []);

  const handleDeletePayout = useCallback(async (id: string) => {
    const result = await affiliateService.deletePayout(id);
    if (!result) {
      throw new Error('Failed to delete payout');
    }
  }, []);

  const handleRefreshPayouts = useCallback(() => {
    refetchPayouts();
    queryClient.invalidateQueries({ queryKey: ['affiliate-payouts'] });
  }, [refetchPayouts, queryClient]);

  // CRUD mutations for referrals
  const createReferralMutation = useMutation({
    mutationFn: affiliateService.createReferral,
    onSuccess: () => {
      toast({ title: 'Success', description: 'Referral created successfully' });
      refetchReferrals();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create referral', variant: 'destructive' });
    },
  });

  const updateReferralMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AffiliateReferral> }) => 
      affiliateService.updateReferral(id, data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Referral updated successfully' });
      refetchReferrals();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update referral', variant: 'destructive' });
    },
  });

  const deleteReferralMutation = useMutation({
    mutationFn: affiliateService.deleteReferral,
    onSuccess: () => {
      toast({ title: 'Success', description: 'Referral deleted successfully' });
      refetchReferrals();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete referral', variant: 'destructive' });
    },
  });

  // Handle pagination for payouts - memoized
  const handlePayoutPageChange = useCallback((page: number) => {
    setPayoutsQuery(prev => ({ ...prev, page }));
  }, []);

  // Handle filter changes for payouts - memoized
  const handlePayoutFiltersChange = useCallback((newFilters: any) => {
    setPayoutsQuery(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  // Handle pagination for referrals - memoized
  const handlePageChange = useCallback((page: number) => {
    setReferralFilters(prev => ({ ...prev, page }));
  }, []);

  // Handle filter changes for referrals - memoized
  const handleReferralFiltersChange = useCallback((newFilters: any) => {
    setReferralFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  // Calculate pagination info for referrals - memoized
  const referralPagination = useMemo(() => {
    if (!referralsData?.results?.count) return undefined;
    
    const currentPage = referralFilters.page || 1;
    const pageSize = referralFilters.page_size || 10;
    const totalPages = Math.ceil(referralsData.results.count / pageSize);
    
    return {
      count: referralsData.results.count,
      next: referralsData.results.next,
      previous: referralsData.results.previous,
      currentPage,
      totalPages
    };
  }, [referralsData, referralFilters.page, referralFilters.page_size]);

  // Calculate pagination info for payouts - memoized
  const payoutPagination = useMemo(() => {
    if (!payoutsData?.results?.count) return undefined;
    
    const currentPage = payoutsQuery.page || 1;
    const pageSize = payoutsQuery.page_size || 10;
    const totalPages = Math.ceil(payoutsData.results.count / pageSize);
    
    return {
      count: payoutsData.results.count,
      next: payoutsData.results.next,
      previous: payoutsData.results.previous,
      currentPage,
      totalPages
    };
  }, [payoutsData, payoutsQuery.page, payoutsQuery.page_size]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-8">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-purple-500/5 p-4 sm:p-8 border border-border/20">
          <div className="relative z-10">
            <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 rounded-xl bg-primary/10">
                <BadgePercent className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  Affiliate Management
                </h1>
                <p className="text-sm sm:text-lg text-muted-foreground mt-1 sm:mt-2">
                  Manage affiliate dashboard, track sales performance, and monitor payouts
                </p>
              </div>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-2xl"></div>
        </div>


        {/* Main Content */}
        <div className="glass-card rounded-2xl border-0 shadow-xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-border/20 bg-card/50 px-3 sm:px-6 overflow-x-auto">
              <TabsList className="bg-transparent border-0 h-auto gap-1 sm:gap-2 md:gap-4 flex-wrap">
                <TabsTrigger
                  value="dashboard"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent rounded-lg px-3 sm:px-6 py-2 font-medium transition-all duration-200 text-sm"
                >
                  Dashboard
                </TabsTrigger>
                <TabsTrigger
                  value="sales"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent rounded-lg px-3 sm:px-6 py-2 font-medium transition-all duration-200 text-sm"
                >
                  Sales
                </TabsTrigger>
                <TabsTrigger
                  value="payouts"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent rounded-lg px-3 sm:px-6 py-2 font-medium transition-all duration-200 text-sm"
                >
                  Payouts
                </TabsTrigger>
                <TabsTrigger
                  value="affiliates"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent rounded-lg px-3 sm:px-6 py-2 font-medium transition-all duration-200 text-sm"
                >
                  Affiliates
                </TabsTrigger>
                <TabsTrigger
                  value="top-affiliates"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/20 border border-transparent rounded-lg px-3 sm:px-6 py-2 font-medium transition-all duration-200 text-sm"
                >
                  Top Affiliates
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-3 sm:p-6">
              <TabsContent value="dashboard" className="mt-0">
                <AffiliateDashboard
                  data={dashboardData}
                  isLoading={dashboardLoading}
                />
              </TabsContent>

              <TabsContent value="sales" className="mt-0">
                <AffiliateSales
                  sales={referralsData?.results?.results || []}
                  summary={referralsData?.summary}
                  pagination={referralPagination}
                  isLoading={referralsLoading}
                  onFiltersChange={handleReferralFiltersChange}
                  onPageChange={handlePageChange}
                  onCreateReferral={async (data) => { await createReferralMutation.mutateAsync(data); }}
                  onUpdateReferral={async (id, data) => { await updateReferralMutation.mutateAsync({ id, data }); }}
                  onDeleteReferral={async (id) => { await deleteReferralMutation.mutateAsync(id); }}
                  isCreating={createReferralMutation.isPending}
                  isUpdating={updateReferralMutation.isPending}
                  isDeleting={deleteReferralMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="payouts" className="mt-0">
                <AffiliatePayouts
                  payouts={payoutsData?.results?.results || []}
                  summary={payoutsData?.summary}
                  pagination={payoutPagination}
                  isLoading={payoutsLoading}
                  onRefresh={handleRefreshPayouts}
                  onPageChange={handlePayoutPageChange}
                  onCreatePayout={handleCreatePayout}
                  onUpdatePayout={handleUpdatePayout}
                  onDeletePayout={handleDeletePayout}
                  onFiltersChange={handlePayoutFiltersChange}
                />
              </TabsContent>

              <TabsContent value="affiliates" className="mt-0">
                <AffiliateUsersTab />
              </TabsContent>

              <TabsContent value="top-affiliates" className="mt-0">
                <TopAffiliatesTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>

      </div>
    </div>
  );
};

export default Affiliates;
