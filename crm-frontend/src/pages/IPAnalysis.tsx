import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import IPSearch from '@/components/risk/IPSearch';
import { IPSummaryTable } from '@/components/risk/IPSummaryTable';
import { IPAccountsTable } from '@/components/risk/IPAccountsTable';
import { IPAnalysisService } from '@/services/ipAnalysisService';
import { IPSummary, AccountByIP, IPAnalyticsPagination } from '@/lib/types/ipAnalysis';
import { useToast } from '@/hooks/use-toast';

export default function IPAnalysis() {
  const [view, setView] = useState<'summary' | 'accounts'>('summary');
  const [selectedIP, setSelectedIP] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [summaryData, setSummaryData] = useState<IPSummary[]>([]);
  const [filteredSummaryData, setFilteredSummaryData] = useState<IPSummary[]>([]);
  const [accountsData, setAccountsData] = useState<AccountByIP[]>([]);
  const [summaryPagination, setSummaryPagination] = useState<IPAnalyticsPagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });
  const [accountsPagination, setAccountsPagination] = useState<IPAnalyticsPagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const { toast } = useToast();

  const fetchIPSummary = async (page = 1, search = searchQuery) => {
    setSummaryLoading(true);
    try {
      const response = await IPAnalysisService.getIPSummary(page, summaryPagination.pageSize, search);
      setSummaryData(response.data);
      setFilteredSummaryData(response.data);
      setSummaryPagination({
        ...summaryPagination,
        page,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      });
    } catch (error) {
      console.error('Error fetching IP summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch IP summary data',
        variant: 'destructive',
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchAccountsByIP = async (ip: string, page = 1) => {
    setAccountsLoading(true);
    try {
      const response = await IPAnalysisService.getAccountsByIP(ip, page, accountsPagination.pageSize);
      setAccountsData(response.data);
      setAccountsPagination({
        ...accountsPagination,
        page,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      });
    } catch (error) {
      console.error('Error fetching accounts by IP:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch accounts data',
        variant: 'destructive',
      });
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleViewAccounts = (ip: string) => {
    setSelectedIP(ip);
    setView('accounts');
    setAccountsPagination(prev => ({ ...prev, page: 1 }));
    fetchAccountsByIP(ip, 1);
  };

  const handleBackToSummary = () => {
    setView('summary');
    setSelectedIP('');
    setAccountsData([]);
  };

  const handleSummaryPageChange = (page: number) => {
    fetchIPSummary(page);
  };

  const handleAccountsPageChange = (page: number) => {
    if (selectedIP) {
      fetchAccountsByIP(selectedIP, page);
    }
  };

  // Fetch from server on mount and when search query changes
  useEffect(() => {
    fetchIPSummary(1, searchQuery);
  }, [searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <PageHeader
        title="IP Analysis"
        subtitle="Monitor IP addresses and associated trading accounts for risk assessment"
      />

      <div className="space-y-4 sm:space-y-6">
        {view === 'summary' && (
          <IPSearch 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
        
        {view === 'summary' ? (
          <IPSummaryTable
            data={filteredSummaryData}
            pagination={summaryPagination}
            onPageChange={handleSummaryPageChange}
            onViewAccounts={handleViewAccounts}
            loading={summaryLoading}
          />
        ) : (
          <IPAccountsTable
            ip={selectedIP}
            data={accountsData}
            pagination={accountsPagination}
            onPageChange={handleAccountsPageChange}
            onBack={handleBackToSummary}
            loading={accountsLoading}
          />
        )}
      </div>
    </div>
  );
}