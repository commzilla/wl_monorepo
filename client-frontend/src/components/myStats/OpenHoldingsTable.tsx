import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import DateRangePicker from '../shared/DateRangePicker';
import { fetchOpenTrades, type OpenTrade } from "../../utils/api";
import { getBrowserInfo } from "@/utils/browserCompat";
import { formatCurrency } from "@/utils/currencyFormatter";

// Helper function to safely convert values and handle NaN/null/undefined
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

// Parse open_time which can be either timestamp or UTC string format
const parseOpenTime = (value: any): Date | null => {
  if (!value) return null;
  
  // If it's a string (new format: "2025-09-03 16:55:41")
  if (typeof value === 'string') {
    const date = new Date(value + 'Z'); // Add Z to treat as UTC
    return isNaN(date.getTime()) ? null : date;
  }
  
  // If it's a number (old format: timestamp)
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return null;
  const ms = n < 1e12 ? n * 1000 : n;
  const date = new Date(ms);
  return isNaN(date.getTime()) ? null : date;
};

interface OpenHoldingsTableProps {
  selectedEnrollment?: {
    account_id: string;
    enrollment_id: string;
    challenge_name: string;
    account_size: number;
    currency?: string;
  };
}

const OpenHoldingsTable: React.FC<OpenHoldingsTableProps> = ({
  selectedEnrollment,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [tableStartDate, setTableStartDate] = useState<Date | null>(null);
  const [tableEndDate, setTableEndDate] = useState<Date | null>(null);
  const browserInfo = getBrowserInfo();
  
  // Get currency from selected enrollment
  const currency = selectedEnrollment?.currency || 'USD';

  // Query to fetch open trades with optimized polling to prevent flickering
  const { data: openTradesData, isLoading, error } = useQuery({
    queryKey: ['openTrades', selectedEnrollment?.account_id, currentPage, rowsPerPage, searchTerm],
    queryFn: () => fetchOpenTrades(
      selectedEnrollment?.account_id,
      currentPage,
      rowsPerPage,
      searchTerm || undefined
    ),
    enabled: !!selectedEnrollment?.account_id,
    staleTime: 10000,
    gcTime: 300000,
    refetchInterval: 10000, // Increased interval to reduce flickering (was 5000)
    refetchIntervalInBackground: false, // Only refetch when tab is active
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  // Get the open trades directly from the API response
  const openTradeData: OpenTrade[] = useMemo(() => {
    return openTradesData?.results || [];
  }, [openTradesData]);

  // Filter data (pagination is handled by the API)
  const filteredData = useMemo(() => {
    let filtered = openTradeData;

    // Apply date filter (API doesn't support date filtering, so we filter client-side)
    if (tableStartDate) {
      filtered = filtered.filter(trade => {
        const tradeDate = parseOpenTime(trade.open_time);
        if (!tradeDate) return false;
        return tradeDate >= new Date(tableStartDate);
      });
    }

    if (tableEndDate) {
      filtered = filtered.filter(trade => {
        const tradeDate = parseOpenTime(trade.open_time);
        if (!tradeDate) return false;
        return tradeDate <= new Date(tableEndDate);
      });
    }

    return filtered;
  }, [openTradeData, tableStartDate, tableEndDate]);

  // Get pagination info from API response
  const totalItems = openTradesData?.count || 0;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const currentPageData = filteredData;

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleDateRangeSelect = (start: Date | null, end: Date | null) => {
    setTableStartDate(start);
    setTableEndDate(end);
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`w-8 h-8 flex items-center justify-center text-sm font-semibold rounded-lg border transition-all duration-150 ease-in-out ${
            currentPage === i
              ? "border-[#28BFFF]/40 bg-[rgba(40,191,255,0.15)] text-[#E4EEF5] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]"
              : "border-[#28BFFF]/20 bg-[rgba(40,191,255,0.05)] text-[#85A8C3] hover:bg-[rgba(40,191,255,0.1)]"
          }`}
        >
          {i}
        </button>,
      );
    }

    return buttons;
  };

  const shouldShowLoading = !selectedEnrollment || isLoading;

  if (shouldShowLoading) {
    return (
      <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] p-6">
        <div className="text-center text-[#85A8C3]">Loading open holdings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] p-6">
        <div className="text-center text-[#ED5363]">Error loading open holdings: {error instanceof Error ? error.message : 'Unknown error'}</div>
      </div>
    );
  }

  const startIndex = (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(startIndex + rowsPerPage - 1, totalItems);

  return (
    <div
      style={{
        // macOS Chrome/Brave specific fixes to prevent flickering
        ...((browserInfo.isChrome || browserInfo.isBrave) && browserInfo.isMacOS && {
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          contain: 'layout style paint',
        })
      }}
    >
      {/* Main Container */}
      <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] p-6">
        {/* Header Container */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-xl font-medium text-[#E4EEF5] tracking-tight">
            Open Holdings ({totalItems})
          </h1>

          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
            {/* Date Range Picker */}
            <DateRangePicker
              defaultStartDate={tableStartDate}
              defaultEndDate={tableEndDate}
              onRangeSelect={handleDateRangeSelect}
            />

            {/* Search Field */}
            <div className="flex items-center h-9 px-4 py-2 border border-[#28BFFF]/20 rounded-lg bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] text-[#E4EEF5] text-sm font-normal transition-all duration-200 hover:bg-[rgba(40,191,255,0.1)] focus-within:border-[#28BFFF]/40">
              <Search className="w-4 h-4 text-[#85A8C3] flex-shrink-0" />
              <input
                type="text"
                placeholder="Search symbol"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[#E4EEF5] placeholder-[#85A8C3] border-none outline-none ml-2"
                style={{
                  WebkitAppearance: 'none',
                  appearance: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="space-y-4">
          {/* Table Content */}
          {currentPageData.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-[#85A8C3] text-sm">
                {searchTerm ? 'No open holdings found matching your search.' : 'No open holdings available.'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg">
              <div 
                className={`gap-0 min-w-[1000px] open-holdings-table ${
                  browserInfo.isSafari 
                    ? 'grid grid-cols-8' 
                    : 'grid grid-cols-8'
                }`}
                style={{
                  // Safari-specific grid fixes
                  ...(browserInfo.isSafari && {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: '0',
                  })
                }}
              >
                {/* Table Headers */}
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-6 py-3.5 text-left border-r border-[#28BFFF]/20 whitespace-nowrap">
                <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                  Trade ID
                </span>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-4 py-3.5 text-center border-r border-[#28BFFF]/20 whitespace-nowrap">
                  <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                    Open time
                  </span>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-4 py-3.5 text-right border-r border-[#28BFFF]/20 whitespace-nowrap">
                  <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                    Open Price
                  </span>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-4 py-3.5 text-right border-r border-[#28BFFF]/20 whitespace-nowrap">
                  <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                    Current Price
                  </span>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-3 py-3.5 text-center border-r border-[#28BFFF]/20 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                      Side
                    </span>
                    <ChevronDown className="w-3 h-3 text-[#E4EEF5]" />
                  </div>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-8 py-3.5 text-center border-r border-[#28BFFF]/20 whitespace-nowrap">
                  <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                    Symbol
                  </span>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-4 py-3.5 text-center border-r border-[#28BFFF]/20 whitespace-nowrap">
                  <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                    Volume
                  </span>
                </div>
                <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-6 py-3.5 text-right whitespace-nowrap">
                  <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                    Profit/Loss
                  </span>
                </div>

                {/* Table Rows */}
                {currentPageData.map((trade, index) => {
                  const side = trade.cmd === 0 ? "Buy" : "Sell";
                  return (
                    <div key={`open-${trade.order}-${index}`} className="contents">
                      <div className="px-6 py-2 border-b border-[#28BFFF]/10 text-left">
                        <span className="text-sm text-[#E4EEF5] tracking-tight">
                          {trade.order}
                        </span>
                      </div>
                      <div className="px-4 py-2 border-b border-[#28BFFF]/10 text-center">
                        <span className="text-sm text-[#E4EEF5] tracking-tight">
                          {(() => {
                            const date = parseOpenTime(trade.open_time);
                            if (!date) return 'N/A';
                            return date.toLocaleString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            });
                          })()}
                        </span>
                      </div>
                      <div className="px-4 py-2 border-b border-[#28BFFF]/10 text-right">
                        <span className="text-sm text-[#E4EEF5] tracking-tight">
                          {trade.open_price > 0 ? trade.open_price.toFixed(5) : 'N/A'}
                        </span>
                      </div>
                      <div className="px-4 py-2 border-b border-[#28BFFF]/10 text-right">
                        <span className="text-sm text-[#E4EEF5] tracking-tight">
                          {trade.current_price > 0 ? trade.current_price.toFixed(5) : 'N/A'}
                        </span>
                      </div>
                      <div className="px-3 py-2 border-b border-[#28BFFF]/10 text-center">
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-2xl text-xs font-semibold ${
                              side === "Buy"
                                ? "bg-[rgba(27,191,153,0.20)] text-[#1BBF99]"
                                : "bg-[rgba(237,83,99,0.20)] text-[#ED5363]"
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                side === "Buy"
                                  ? "bg-[#1BBF99]"
                                  : "bg-[#ED5363]"
                              }`}
                            ></div>
                            {side}
                          </span>
                        </div>
                      </div>
                      <div className="px-8 py-2 border-b border-[#28BFFF]/10 text-center">
                        <span className="text-sm text-[#E4EEF5] tracking-tight">
                          {trade.symbol}
                        </span>
                      </div>
                      <div className="px-4 py-2 border-b border-[#28BFFF]/10 text-center">
                        <span className="text-sm text-[#E4EEF5] tracking-tight">
                          {trade.volume}
                        </span>
                      </div>
                      <div className="px-6 py-2 border-b border-[#28BFFF]/10 text-right">
                        <span
                          className={`text-sm tracking-tight ${
                            trade.profit >= 0
                              ? "text-[#1BBF99]"
                              : "text-[#ED5363]"
                          }`}
                        >
                          {trade.profit >= 0 ? "" : "-"}{formatCurrency(Math.abs(trade.profit), currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-6 py-3">
              {/* Rows Per Page */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-[#85A8C3] tracking-tight">
                  Rows per page:
                </span>
                <div className="relative">
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="appearance-none bg-[rgba(40,191,255,0.05)] border border-[#28BFFF]/20 rounded-lg px-3 py-2.5 pr-8 text-sm font-semibold text-[#E4EEF5] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)] focus:outline-none tracking-tight"
                    style={{
                      WebkitAppearance: 'none',
                      appearance: 'none',
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#85A8C3] pointer-events-none" />
                </div>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-4">
                {/* Page Info */}
                <span className="text-xs text-[#85A8C3] tracking-tight">
                  {startIndex} - {endIndex} of {totalItems}
                </span>

                {/* Navigation */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center text-[#85A8C3] hover:text-[#E4EEF5] disabled:text-[#454546] disabled:cursor-not-allowed border border-[#28BFFF]/20 rounded-lg bg-[rgba(40,191,255,0.05)] hover:bg-[rgba(40,191,255,0.1)] transition-all duration-150 ease-in-out"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {renderPaginationButtons()}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center text-[#85A8C3] hover:text-[#E4EEF5] disabled:text-[#454546] disabled:cursor-not-allowed border border-[#28BFFF]/20 rounded-lg bg-[rgba(40,191,255,0.05)] hover:bg-[rgba(40,191,255,0.1)] transition-all duration-150 ease-in-out"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpenHoldingsTable;