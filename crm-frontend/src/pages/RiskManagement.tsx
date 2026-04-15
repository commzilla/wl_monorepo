
import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { RiskService } from '@/services/riskService';
import { SoftBreachTable, HardBreachTable, RevertedBreachTable } from '@/components/risk/RealBreachTable';
import { Search, Filter, AlertTriangle, Shield, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import { RiskDashboardOverview, SoftBreach, HardBreach, BreachPagination } from '@/lib/types/djangoRisk';
import { toast } from '@/hooks/use-toast';

const RiskManagement = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('soft');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<RiskDashboardOverview | null>(null);
  const [softBreaches, setSoftBreaches] = useState<SoftBreach[]>([]);
  const [softBreachesPagination, setSoftBreachesPagination] = useState<BreachPagination | null>(null);
  const [hardBreaches, setHardBreaches] = useState<HardBreach[]>([]);
  const [hardBreachesPagination, setHardBreachesPagination] = useState<BreachPagination | null>(null);
  const [revertedBreaches, setRevertedBreaches] = useState<HardBreach[]>([]);
  const [revertedBreachesPagination, setRevertedBreachesPagination] = useState<BreachPagination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const pageSize = 10;

  // Generate smart pagination page numbers
  const getPageNumbers = (currentPage: number, totalPages: number): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    
    // Always show first page
    pages.push(1);
    
    if (currentPage <= 3) {
      // Near the start
      pages.push(2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      // Near the end
      pages.push('...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      // Middle
      pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    
    return pages;
  };

  const fetchOverview = async () => {
    try {
      const data = await RiskService.getOverview();
      setOverview(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch overview data';
      setError(errorMessage);
    }
  };

  const fetchSoftBreaches = async (page = 1, search = debouncedSearchQuery) => {
    try {
      setLoading(true);
      const { data, pagination } = await RiskService.getSoftBreaches(page, pageSize, search);
      setSoftBreaches(data);
      setSoftBreachesPagination(pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch soft breaches';
      
      // Handle "Invalid page" error by falling back to page 1
      if (errorMessage.includes('Invalid page') && page > 1) {
        console.warn(`Soft breaches page ${page} is invalid, falling back to page 1`);
        toast({
          title: "Page Not Found",
          description: `Page ${page} is not available. Returning to page 1.`,
          variant: "default",
        });
        if (page !== 1) {
          await fetchSoftBreaches(1);
          return;
        }
      }
      
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage.includes('Invalid page') 
          ? "The requested page is not available" 
          : "Failed to fetch soft breaches data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHardBreaches = async (page = 1, search = debouncedSearchQuery) => {
    try {
      setLoading(true);
      const { data, pagination } = await RiskService.getHardBreaches(page, pageSize, search);
      setHardBreaches(data);
      setHardBreachesPagination(pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch hard breaches';
      
      // Handle "Invalid page" error by falling back to page 1
      if (errorMessage.includes('Invalid page') && page > 1) {
        console.warn(`Hard breaches page ${page} is invalid, falling back to page 1`);
        toast({
          title: "Page Not Found",
          description: `Page ${page} is not available. Returning to page 1.`,
          variant: "default",
        });
        if (page !== 1) {
          await fetchHardBreaches(1);
          return;
        }
      }
      
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage.includes('Invalid page') 
          ? "The requested page is not available" 
          : "Failed to fetch hard breaches data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRevertedBreaches = async (page = 1, search = debouncedSearchQuery) => {
    try {
      setLoading(true);
      const { data, pagination } = await RiskService.getRevertedBreaches(page, pageSize, search);
      setRevertedBreaches(data);
      setRevertedBreachesPagination(pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch reverted breaches';
      
      // Handle "Invalid page" error by falling back to page 1
      if (errorMessage.includes('Invalid page') && page > 1) {
        console.warn(`Reverted breaches page ${page} is invalid, falling back to page 1`);
        toast({
          title: "Page Not Found",
          description: `Page ${page} is not available. Returning to page 1.`,
          variant: "default",
        });
        if (page !== 1) {
          await fetchRevertedBreaches(1);
          return;
        }
      }
      
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage.includes('Invalid page') 
          ? "The requested page is not available" 
          : "Failed to fetch reverted breaches data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRiskData = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch overview data once
      if (!overview) {
        await fetchOverview();
      }
      
      // Fetch the appropriate breach data based on active tab
      if (activeTab === 'soft') {
        await fetchSoftBreaches(page);
      } else if (activeTab === 'hard') {
        await fetchHardBreaches(page);
      } else {
        await fetchRevertedBreaches(page);
      }
      
      setCurrentPage(page);
    } catch (err) {
      // Error handling is done in individual fetch methods
    } finally {
      setLoading(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Trigger search when debounced query changes
  useEffect(() => {
    setCurrentPage(1);
    if (activeTab === 'soft') {
      fetchSoftBreaches(1, debouncedSearchQuery);
    } else if (activeTab === 'hard') {
      fetchHardBreaches(1, debouncedSearchQuery);
    } else {
      fetchRevertedBreaches(1, debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, activeTab]);

  useEffect(() => {
    fetchRiskData(1);
  }, []);

  useEffect(() => {
    // When tab changes, fetch the appropriate data
    if (activeTab === 'soft') {
      fetchSoftBreaches(1);
    } else if (activeTab === 'hard') {
      fetchHardBreaches(1);
    } else {
      fetchRevertedBreaches(1);
    }
    setCurrentPage(1);
  }, [activeTab]);

  const handleRefresh = () => {
    fetchOverview();
    if (activeTab === 'soft') {
      fetchSoftBreaches(currentPage, debouncedSearchQuery);
    } else if (activeTab === 'hard') {
      fetchHardBreaches(currentPage, debouncedSearchQuery);
    } else {
      fetchRevertedBreaches(currentPage, debouncedSearchQuery);
    }
  };

  const handlePageChange = (page: number) => {
    if (activeTab === 'soft') {
      fetchSoftBreaches(page, debouncedSearchQuery);
    } else if (activeTab === 'hard') {
      fetchHardBreaches(page, debouncedSearchQuery);
    } else {
      fetchRevertedBreaches(page, debouncedSearchQuery);
    }
    setCurrentPage(page);
  };

  if (error) {
    return (
      <div>
        <PageHeader 
          title="Risk Management" 
          subtitle="Real-time breach detection and risk analysis"
        />
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error Loading Risk Data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Risk Management" 
        subtitle="Real-time breach detection and risk analysis"
        actions={
          <Button onClick={handleRefresh} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Soft Breaches</p>
                <p className="text-2xl font-bold text-warning">
                  {loading ? '...' : overview?.soft_breaches_total || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {loading ? '...' : overview?.soft_breaches_active || 0} active
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hard Breaches</p>
                <p className="text-2xl font-bold text-destructive">
                  {loading ? '...' : overview?.hard_breaches_total || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {loading ? '...' : overview?.hard_breaches_active || 0} active
                </p>
              </div>
              <Shield className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Breaches</p>
                <p className="text-2xl font-bold">
                  {loading ? '...' : (overview?.soft_breaches_active || 0) + (overview?.hard_breaches_active || 0)}
                </p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Violations</p>
                <p className="text-2xl font-bold">
                  {loading ? '...' : (overview?.soft_breaches_total || 0) + (overview?.hard_breaches_total || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Filter */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, rule, or account ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="soft">Soft Breaches</TabsTrigger>
          <TabsTrigger value="hard">Hard Breaches</TabsTrigger>
          <TabsTrigger value="reverted">Reverted Logs</TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="soft">
          <Card>
            <CardHeader className="px-3 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Soft Breaches
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Showing {softBreaches.length} results {softBreachesPagination?.count ? `of ${softBreachesPagination.count} total` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="text-warning border-warning w-fit">
                  {overview?.soft_breaches_active || 0} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading soft breaches...</p>
                </div>
              ) : (
                <>
                  <SoftBreachTable breaches={softBreaches} />
                  {softBreachesPagination && softBreachesPagination.total_pages > 1 && (
                    <div className="mt-6 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          {softBreachesPagination.previous && (
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => handlePageChange(currentPage - 1)}
                                className="cursor-pointer"
                              />
                            </PaginationItem>
                          )}
                          
                          {getPageNumbers(currentPage, softBreachesPagination.total_pages).map((page, idx) => (
                            <PaginationItem key={`${page}-${idx}`}>
                              {page === '...' ? (
                                <span className="px-4 py-2 text-muted-foreground">...</span>
                              ) : (
                                <PaginationLink
                                  onClick={() => handlePageChange(page as number)}
                                  isActive={page === currentPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              )}
                            </PaginationItem>
                          ))}
                          
                          {softBreachesPagination.next && (
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => handlePageChange(currentPage + 1)}
                                className="cursor-pointer"
                              />
                            </PaginationItem>
                          )}
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hard">
          <Card>
            <CardHeader className="px-3 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Shield className="h-5 w-5 text-destructive" />
                    Hard Breaches
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Showing {hardBreaches.length} results {hardBreachesPagination?.count ? `of ${hardBreachesPagination.count} total` : ''}
                  </p>
                </div>
                <Badge variant="destructive" className="w-fit">
                  {overview?.hard_breaches_active || 0} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading hard breaches...</p>
                </div>
              ) : (
                <>
                  <HardBreachTable breaches={hardBreaches} onBreachReverted={handleRefresh} />
                  {hardBreachesPagination && hardBreachesPagination.total_pages > 1 && (
                    <div className="mt-6 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          {hardBreachesPagination.previous && (
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => handlePageChange(currentPage - 1)}
                                className="cursor-pointer"
                              />
                            </PaginationItem>
                          )}
                          
                          {getPageNumbers(currentPage, hardBreachesPagination.total_pages).map((page, idx) => (
                            <PaginationItem key={`${page}-${idx}`}>
                              {page === '...' ? (
                                <span className="px-4 py-2 text-muted-foreground">...</span>
                              ) : (
                                <PaginationLink
                                  onClick={() => handlePageChange(page as number)}
                                  isActive={page === currentPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              )}
                            </PaginationItem>
                          ))}
                          
                          {hardBreachesPagination.next && (
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => handlePageChange(currentPage + 1)}
                                className="cursor-pointer"
                              />
                            </PaginationItem>
                          )}
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reverted">
          <Card>
            <CardHeader className="px-3 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    Reverted Breach Logs
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Showing {revertedBreaches.length} results {revertedBreachesPagination?.count ? `of ${revertedBreachesPagination.count} total` : ''}
                  </p>
                </div>
                <Badge variant="outline" className="text-muted-foreground w-fit">
                  {revertedBreaches.length || 0} Entries
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading reverted breach logs...</p>
                </div>
              ) : (
                <>
                  <RevertedBreachTable breaches={revertedBreaches} />
                  {revertedBreachesPagination && revertedBreachesPagination.total_pages > 1 && (
                    <div className="mt-6 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          {revertedBreachesPagination.previous && (
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => handlePageChange(currentPage - 1)}
                                className="cursor-pointer"
                              />
                            </PaginationItem>
                          )}
                          
                          {getPageNumbers(currentPage, revertedBreachesPagination.total_pages).map((page, idx) => (
                            <PaginationItem key={`${page}-${idx}`}>
                              {page === '...' ? (
                                <span className="px-4 py-2 text-muted-foreground">...</span>
                              ) : (
                                <PaginationLink
                                  onClick={() => handlePageChange(page as number)}
                                  isActive={page === currentPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              )}
                            </PaginationItem>
                          ))}
                          
                          {revertedBreachesPagination.next && (
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => handlePageChange(currentPage + 1)}
                                className="cursor-pointer"
                              />
                            </PaginationItem>
                          )}
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskManagement;
