import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaWallet, FaSearch, FaFilter, FaCalendarAlt, FaTimes, FaTable } from "react-icons/fa";

import { fetchAffiliateWalletTransactions, AffiliateWalletTransaction, WalletTransactionFilters, fetchAffiliateProfile, AffiliateProfile } from '@/utils/api';

const AffiliateWalletTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<AffiliateWalletTransaction[]>([]);
  const [affiliateData, setAffiliateData] = useState<AffiliateProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const pageSize = 25;

  // Convert recent payouts to transaction format for fallback
  const convertPayoutsToTransactions = (payouts: AffiliateProfile['recent_payouts']): AffiliateWalletTransaction[] => {
    return payouts?.map(payout => ({
      id: payout.id,
      transaction_type: 'payout' as const,
      transaction_type_display: 'Payout',
      status: payout.status as 'pending' | 'approved' | 'processing' | 'completed' | 'rejected',
      status_display: payout.status.charAt(0).toUpperCase() + payout.status.slice(1),
      amount: -payout.amount, // Negative for payout
      note: `Payout request ${payout.status}`,
      created_at: payout.requested_at,
    })) || [];
  };

  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Current page:', currentPage);
      console.log('Page size:', pageSize);
      console.log('Filters:', { statusFilter, typeFilter, dateRange });
      
      const filters: WalletTransactionFilters = {
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { transaction_type: typeFilter }),
        ...(dateRange.start && { created_at__gte: dateRange.start }),
        ...(dateRange.end && { created_at__lte: dateRange.end }),
      };
      
      console.log('Calling fetchAffiliateWalletTransactions with:', { currentPage, pageSize, filters });
      
      const data = await fetchAffiliateWalletTransactions(currentPage, pageSize, filters);
      
      console.log('Successfully loaded transactions:', data);
      
      // Use real transactions (even if empty - this is normal)
      setTransactions(data.results);
      setTotalCount(data.count);
      setHasNext(!!data.next);
      setHasPrevious(!!data.previous);
      setIsUsingFallback(false);
      
    } catch (err) {
      console.error('Failed to load wallet transactions:', err);
      
      // Only show fallback if there's an actual API error
      try {
        console.log('API error occurred, falling back to recent payouts...');
        const affiliateProfile = await fetchAffiliateProfile();
        setAffiliateData(affiliateProfile);
        
        const fallbackTransactions = convertPayoutsToTransactions(affiliateProfile.recent_payouts);
        console.log('Fallback transactions from payouts:', fallbackTransactions);
        
        setTransactions(fallbackTransactions);
        setTotalCount(fallbackTransactions.length);
        setHasNext(false);
        setHasPrevious(false);
        setIsUsingFallback(true);
        
        setError('Affiliate transactions API is currently unavailable. Showing recent payouts instead.');
      } catch (fallbackError) {
        console.error('Both API and fallback failed:', fallbackError);
        setError(err instanceof Error ? err.message : 'Failed to load affiliate transactions');
        setTransactions([]);
        setIsUsingFallback(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [currentPage, statusFilter, typeFilter, dateRange]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: AffiliateWalletTransaction['status']) => {
    const statusConfig = {
      pending: { color: '#FFC107', bg: 'rgba(255,193,7,0.2)', label: 'Pending' },
      approved: { color: '#28A745', bg: 'rgba(40,167,69,0.2)', label: 'Approved' },
      processing: { color: '#17A2B8', bg: 'rgba(23,162,184,0.2)', label: 'Processing' },
      completed: { color: '#28A745', bg: 'rgba(40,167,69,0.2)', label: 'Completed' },
      rejected: { color: '#DC3545', bg: 'rgba(220,53,69,0.2)', label: 'Rejected' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span 
        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: config.bg, color: config.color }}
      >
        ● {config.label}
      </span>
    );
  };

  const getTypeIcon = (type: AffiliateWalletTransaction['transaction_type']) => {
    const typeConfig = {
      commission: { color: '#28A745', label: 'Commission' },
      payout: { color: '#DC3545', label: 'Payout' },
      bonus: { color: '#FFD700', label: 'Bonus' },
      refund: { color: '#17A2B8', label: 'Refund' }
    };

    const config = typeConfig[type] || typeConfig.commission;
    
    return (
      <span 
        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: `${config.color}20`, color: config.color }}
      >
        {config.label}
      </span>
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  if (isLoading && transactions.length === 0) {
    return (
      <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-[305px] rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:pb-[100px] max-md:px-5">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#28BFFF]"></div>
            <span className="text-[#85A8C3]">Loading affiliate transactions...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-[305px] rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:pb-[100px] max-md:px-5">
      <header className="flex w-full items-center justify-between flex-wrap max-md:max-w-full mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/affiliate"
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-[rgba(40,191,255,0.05)] hover:bg-[rgba(40,191,255,0.1)] transition-colors border border-[#28BFFF]/20"
          >
            <FaArrowLeft className="w-4 h-4 text-[#28BFFF]" />
          </Link>
          <div className="self-stretch flex min-w-60 items-center gap-2 text-[32px] text-[#E4EEF5] font-medium whitespace-nowrap tracking-[-0.96px] flex-wrap flex-1 shrink basis-7 my-auto max-md:max-w-full">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
              <FaWallet className="w-6 h-6 text-[#28BFFF]" />
            </div>
            <h1 className="text-[#E4EEF5] self-stretch my-auto">
              Affiliate Transactions
            </h1>
          </div>
        </div>
      </header>

      {error && !isUsingFallback && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-red-400 font-medium mb-1">Error</div>
            <div className="text-red-300 text-sm">{error}</div>
          </div>
        </div>
      )}

      {isUsingFallback && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-yellow-400 font-medium mb-1">API Unavailable</div>
            <div className="text-yellow-300 text-sm">
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <section className="mb-8">
        <div className="bg-[#0A1114] rounded-xl border border-[#28BFFF]/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#E4EEF5] text-lg font-medium">Filter Transactions</h2>
            <button
              onClick={clearFilters}
              className="text-[#28BFFF] hover:text-[#28BFFF]/80 text-sm transition-colors"
            >
              Clear Filters
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <FaFilter className="w-4 h-4 text-[#85A8C3]" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#080808] border border-[#28BFFF]/20 rounded-lg px-3 py-2 text-[#E4EEF5] focus:outline-none focus:border-[#28BFFF] flex-1"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <FaFilter className="w-4 h-4 text-[#85A8C3]" />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#080808] border border-[#28BFFF]/20 rounded-lg px-3 py-2 text-[#E4EEF5] focus:outline-none focus:border-[#28BFFF] flex-1"
              >
                <option value="">All Types</option>
                <option value="commission">Commission</option>
                <option value="payout">Payout</option>
                <option value="bonus">Bonus</option>
                <option value="refund">Refund</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <FaCalendarAlt className="w-4 h-4 text-[#85A8C3]" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange({ ...dateRange, start: e.target.value });
                  setCurrentPage(1);
                }}
                className="bg-[#080808] border border-[#28BFFF]/20 rounded-lg px-3 py-2 text-[#E4EEF5] focus:outline-none focus:border-[#28BFFF] flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#85A8C3] text-sm">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange({ ...dateRange, end: e.target.value });
                  setCurrentPage(1);
                }}
                className="bg-[#080808] border border-[#28BFFF]/20 rounded-lg px-3 py-2 text-[#E4EEF5] focus:outline-none focus:border-[#28BFFF] flex-1"
              />
            </div>
          </div>
        </div>
      </section>
      {/* Transactions Table */}
      <section className="mb-8">
        <div className="bg-[#0A1114] rounded-xl border border-[#28BFFF]/10">
          <div className="flex items-center justify-between p-6 border-b border-[#28BFFF]/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
                <FaTable className="w-5 h-5 text-[#28BFFF]" />
              </div>
              <h2 className="text-[#E4EEF5] text-xl font-medium">
                Affiliate Transactions ({totalCount})
              </h2>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#28BFFF]"></div>
              <span className="ml-3 text-[#85A8C3]">Loading transactions...</span>
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-[rgba(40,191,255,0.1)] flex items-center justify-center">
                <FaWallet className="w-8 h-8 text-[#28BFFF]" />
              </div>
              <p className="text-[#85A8C3] text-lg mb-2">No transactions found</p>
              <p className="text-[#85A8C3] text-sm">
                {statusFilter || typeFilter || dateRange.start || dateRange.end
                  ? 'Try adjusting your filters'
                  : 'No affiliate transactions available yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#28BFFF]/10">
                    <th className="text-left p-4 text-[#85A8C3] text-sm font-medium">Date</th>
                    <th className="text-left p-4 text-[#85A8C3] text-sm font-medium">Type</th>
                    <th className="text-left p-4 text-[#85A8C3] text-sm font-medium">Amount</th>
                    <th className="text-left p-4 text-[#85A8C3] text-sm font-medium">Status</th>
                    <th className="text-left p-4 text-[#85A8C3] text-sm font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-[#28BFFF]/5 hover:bg-[rgba(40,191,255,0.02)]">
                      <td className="p-4 text-[#E4EEF5] text-sm">{formatDate(transaction.created_at)}</td>
                      <td className="p-4">{getTypeIcon(transaction.transaction_type)}</td>
                      <td className="p-4 text-sm font-medium" style={{ 
                        color: transaction.amount >= 0 ? '#28A745' : '#DC3545' 
                      }}>
                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </td>
                      <td className="p-4">{getStatusBadge(transaction.status)}</td>
                      <td className="p-4 text-[#85A8C3] text-sm">{transaction.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {transactions.length > 0 && (hasPrevious || hasNext) && (
            <div className="flex items-center justify-between p-6 border-t border-[#28BFFF]/10">
              <div className="text-[#85A8C3] text-sm">
                Page {currentPage} - Showing {transactions.length} of {totalCount} transactions
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!hasPrevious}
                  className="px-4 py-2 bg-[#080808] border border-[#28BFFF]/20 rounded-lg text-[#E4EEF5] hover:bg-[#28BFFF]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!hasNext}
                  className="px-4 py-2 bg-[#080808] border border-[#28BFFF]/20 rounded-lg text-[#E4EEF5] hover:bg-[#28BFFF]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export const AffiliateWalletTransactionsPage: React.FC = () => {
  return <AffiliateWalletTransactions />;
};

export default AffiliateWalletTransactionsPage;