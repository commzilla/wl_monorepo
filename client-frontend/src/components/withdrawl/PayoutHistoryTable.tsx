
import React, { useState } from 'react';
import DateRangePicker from '../shared/DateRangePicker';
import { TraderPayoutHistory } from '@/utils/api';
import { StatusDetailsModal } from './StatusDetailsModal';
import { Info } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';

interface PayoutHistoryTableProps {
  payoutData: TraderPayoutHistory[];
  isLoading?: boolean;
}

export const PayoutHistoryTable: React.FC<PayoutHistoryTableProps> = ({ 
  payoutData, 
  isLoading 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<TraderPayoutHistory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStatusClick = (record: TraderPayoutHistory) => {
    // Only show modal if there are details to display
    const hasDetails = 
      (record.status === 'rejected' && record.rejection_details) ||
      (record.status === 'extended_review' && record.extended_review_details) ||
      ((record.status === 'approved' || record.status === 'paid') && record.exclude_details);
    
    if (hasDetails) {
      setSelectedRecord(record);
      setIsModalOpen(true);
    }
  };

  const getStatusBadge = (status: TraderPayoutHistory['status']) => {
    const statusConfig = {
      pending: { color: '#FFC107', bg: 'rgba(255,193,7,0.2)', label: 'Pending' },
      approved: { color: '#28A745', bg: 'rgba(40,167,69,0.2)', label: 'Approved' },
      rejected: { color: '#DC3545', bg: 'rgba(220,53,69,0.2)', label: 'Rejected' },
      paid: { color: '#28A745', bg: 'rgba(40,167,69,0.2)', label: 'Paid' },
      cancelled: { color: '#6C757D', bg: 'rgba(108,117,125,0.2)', label: 'Cancelled' },
      extended_review: { color: '#FF9800', bg: 'rgba(255,152,0,0.2)', label: 'Extended Review' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span 
        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
        style={{ backgroundColor: config.bg, color: config.color }}
      >
        ● {config.label}
      </span>
    );
  };

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


  const getMethodLabel = (method: TraderPayoutHistory['method']) => {
    const methodMap = {
      'paypal': 'PayPal',
      'bank': 'Bank Transfer', 
      'crypto': 'Crypto',
      'rise': 'Rise'
    };
    return methodMap[method] || method;
  };

  const getMethodIcon = (method: TraderPayoutHistory['method']) => {
    const methodConfig = {
      'paypal': { color: '#0070BA', bg: 'rgba(0,112,186,0.1)' },
      'bank': { color: '#28A745', bg: 'rgba(40,167,69,0.1)' },
      'crypto': { color: '#F7931A', bg: 'rgba(247,147,26,0.1)' },
      'rise': { color: '#6366F1', bg: 'rgba(99,102,241,0.1)' }
    };

    const config = methodConfig[method] || methodConfig.rise;
    
    return (
      <span 
        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
        style={{ backgroundColor: config.bg, color: config.color }}
      >
        {getMethodLabel(method)}
      </span>
    );
  };

  const handleDateRangeSelect = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#28BFFF]"></div>
          <span className="ml-3 text-[#E4EEF5]">Loading payout history...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Main Container */}
      <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] p-6">
        {/* Header Container */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 md:mb-8">
          <h1 className="text-lg md:text-xl font-medium text-[#E4EEF5] tracking-tight">
            Payout history
          </h1>

          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 w-full sm:w-auto">
            {/* Date Range Picker */}
            <DateRangePicker
              defaultStartDate={startDate}
              defaultEndDate={endDate}
              onRangeSelect={handleDateRangeSelect}
            />

            {/* Search Field */}
            <div className="flex items-center gap-2 w-full sm:w-64 h-10 md:h-11 px-3 md:px-4 rounded-lg border border-[#28BFFF]/20 bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
              <img
                src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/8c48740f86e7c2605ce0b1f1a57555338555f102?placeholderIfAbsent=true"
                className="w-4 h-4 flex-shrink-0"
                alt="Search"
              />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[#85A8C3] placeholder-[#85A8C3]/70 focus:outline-none tracking-tight"
              />
            </div>
          </div>
        </div>
        
        {/* Table Container */}
        <div className="space-y-4">
          {payoutData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-[rgba(40,191,255,0.1)] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#28BFFF]">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-[#85A8C3] text-sm">No payout history found</p>
            </div>
          ) : (
            /* Table Content */
            <div className="overflow-x-auto rounded-lg">
              <div className="grid grid-cols-8 gap-0 min-w-[1000px] md:min-w-[1200px]">
                {/* Table Headers */}
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-3 md:px-4 py-3 md:py-3.5 text-left border-r border-[#28BFFF]/20 whitespace-nowrap">
                  <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                    <span className="hidden sm:inline">Transaction ID</span>
                    <span className="sm:hidden">ID</span>
                  </span>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-2 md:px-3 py-3 md:py-3.5 text-center border-r border-[#28BFFF]/20 whitespace-nowrap">
                  <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                    <span className="hidden md:inline">MT5 Account</span>
                    <span className="md:hidden">Account</span>
                  </span>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-2 md:px-3 py-3 md:py-3.5 text-center border-r border-[#28BFFF]/20 whitespace-nowrap">
                  <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                    Date
                  </span>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-2 md:px-3 py-3 md:py-3.5 text-center border-r border-[#28BFFF]/20 whitespace-nowrap">
                  <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                    Method
                  </span>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-2 md:px-3 py-3 md:py-3.5 text-center border-r border-[#28BFFF]/20 whitespace-nowrap">
                  <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                    <span className="hidden md:inline">Profit</span>
                    <span className="md:hidden">Profit</span>
                  </span>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-2 md:px-3 py-3 md:py-3.5 text-center border-r border-[#28BFFF]/20 whitespace-nowrap">
                  <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                    <span className="hidden md:inline">Share %</span>
                    <span className="md:hidden">Share</span>
                  </span>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-2 md:px-3 py-3 md:py-3.5 text-center border-r border-[#28BFFF]/20 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                      Status
                    </span>
                    <Info className="w-3.5 h-3.5 text-[#28BFFF]/60" />
                  </div>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-2 md:px-4 py-3 md:py-3.5 text-right whitespace-nowrap">
                  <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                    <span className="hidden md:inline">Net Payout</span>
                    <span className="md:hidden">Net</span>
                  </span>
                </div>

                {/* Table Rows */}
                {payoutData.map((record, index) => (
                  <React.Fragment key={record.id}>
                    <div className="px-3 md:px-4 py-2 border-b border-[#28BFFF]/10 text-left">
                      <span className="text-xs md:text-sm text-[#E4EEF5] tracking-tight">
                        {record.id.split('-')[0]}
                      </span>
                    </div>
                    <div className="px-2 md:px-3 py-2 border-b border-[#28BFFF]/10 text-center">
                      <span className="text-xs md:text-sm text-[#E4EEF5] tracking-tight">
                        {record.mt5_account_id || 'N/A'}
                      </span>
                    </div>
                    <div className="px-2 md:px-3 py-2 border-b border-[#28BFFF]/10 text-center">
                      <span className="text-xs md:text-sm text-[#E4EEF5] tracking-tight">
                        {formatDate(record.requested_at)}
                      </span>
                    </div>
                    <div className="px-2 md:px-3 py-2 border-b border-[#28BFFF]/10 text-center">
                      {getMethodIcon(record.method)}
                    </div>
                    <div className="px-2 md:px-3 py-2 border-b border-[#28BFFF]/10 text-center">
                      <span className="text-xs md:text-sm text-[#E4EEF5] tracking-tight">
                        {formatCurrency(record.profit, record.currency)}
                      </span>
                    </div>
                    <div className="px-2 md:px-3 py-2 border-b border-[#28BFFF]/10 text-center">
                      <span className="text-xs md:text-sm text-[#E4EEF5] tracking-tight">
                        {Number(record.profit_share).toFixed(2)}%
                      </span>
                    </div>
                    <div className="px-2 md:px-3 py-2 border-b border-[#28BFFF]/10 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {getStatusBadge(record.status)}
                        {((record.status === 'rejected' && record.rejection_details) ||
                          (record.status === 'extended_review' && record.extended_review_details) ||
                          ((record.status === 'approved' || record.status === 'paid') && record.exclude_details)) && (
                          <button
                            onClick={() => handleStatusClick(record)}
                            className="p-1 rounded-full hover:bg-[rgba(40,191,255,0.1)] transition-colors"
                            aria-label="View status details"
                          >
                            <Info className="w-3.5 h-3.5 text-[#28BFFF]" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="px-2 md:px-4 py-2 border-b border-[#28BFFF]/10 text-right">
                      <span className="text-xs md:text-sm text-[#28A745] font-medium tracking-tight">
                        {formatCurrency(record.net_profit, record.currency)}
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {payoutData.length > 0 && (
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 px-3 md:px-6 py-3">
              {/* Rows Per Page */}
              <div className="flex items-center gap-2 order-2 lg:order-1">
                <span className="text-xs md:text-sm text-[#85A8C3] tracking-tight hidden sm:inline">Transactions per page:</span>
                <span className="text-xs md:text-sm text-[#85A8C3] tracking-tight sm:hidden">Per page:</span>
                <select className="bg-[rgba(40,191,255,0.05)] border border-[#28BFFF]/20 rounded-lg px-2 md:px-3 py-1 text-[#E4EEF5] text-xs md:text-sm tracking-tight">
                  <option>10</option>
                  <option>20</option>
                  <option>50</option>
                </select>
              </div>
              
              {/* Page Info */}
              <div className="text-xs md:text-sm text-[#85A8C3] tracking-tight order-1 lg:order-2">
                01 - {Math.min(20, payoutData.length)} transactions of {payoutData.length}
              </div>
              
              {/* Pagination Controls */}
              <div className="flex items-center gap-1 md:gap-2 order-3">
                <button className="text-xs md:text-sm text-[#E4EEF5] px-2 md:px-3 py-1 hover:bg-[rgba(40,191,255,0.1)] rounded tracking-tight hidden sm:inline">First</button>
                <button className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 bg-[rgba(40,191,255,0.05)] border border-[#28BFFF]/20 rounded-lg hover:bg-[rgba(40,191,255,0.1)]">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/ec7ae07fe1daef512d5a701c4460beb4cdc65c20?placeholderIfAbsent=true"
                    className="w-3 h-3 md:w-4 md:h-4"
                    alt="Previous"
                  />
                </button>
                <button className="w-7 h-7 md:w-8 md:h-8 bg-[rgba(40,191,255,0.15)] border border-[#28BFFF]/40 rounded-lg text-[#E4EEF5] text-xs md:text-sm font-medium shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">1</button>
                <button className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 bg-[rgba(40,191,255,0.05)] border border-[#28BFFF]/20 rounded-lg hover:bg-[rgba(40,191,255,0.1)]">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/14dc5235aeb54961992f360cc137b00dd88a6c40?placeholderIfAbsent=true"
                    className="w-3 h-3 md:w-4 md:h-4"
                    alt="Next"
                  />
                </button>
                <button className="text-xs md:text-sm text-[#E4EEF5] px-2 md:px-3 py-1 hover:bg-[rgba(40,191,255,0.1)] rounded tracking-tight hidden sm:inline">Last</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Details Modal */}
      {selectedRecord && (
        <StatusDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRecord(null);
          }}
          record={selectedRecord}
        />
      )}
    </div>
  );
};
