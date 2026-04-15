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
import { fetchMyStats, TradeHistory as ApiTradeHistory } from "../../utils/api";
import { getBrowserInfo } from "@/utils/browserCompat";
import { formatCurrency } from "@/utils/currencyFormatter";

// Helper function to safely convert values and handle NaN/null/undefined
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

// Types for the trade data (updated to match API)
interface TradeData {
  ticket: number;
  openTime: string;
  openPrice: number;
  closeTime: string;
  closePrice: number;
  side: string;
  symbol: string;
  volume: number;
  grossProfit: number;
  winLoss: number;
}

interface TradeHistoryTableProps {
  data?: TradeData[];
  selectedEnrollment?: any;
}

const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({
  data: propData,
  selectedEnrollment,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [tableStartDate, setTableStartDate] = useState<Date | null>(null);
  const [tableEndDate, setTableEndDate] = useState<Date | null>(null);
  const browserInfo = getBrowserInfo();
  
  // Get currency from selected enrollment
  const currency = selectedEnrollment?.currency || 'USD';

  // Fetch real data from API with anti-flicker optimizations
  const { data: myStatsResponse, isLoading, error } = useQuery({
    queryKey: ['myStats', currentPage, rowsPerPage, selectedEnrollment?.enrollment_id],
    queryFn: () => fetchMyStats(currentPage, rowsPerPage, selectedEnrollment?.enrollment_id),
    enabled: !!selectedEnrollment?.enrollment_id,
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  // Transform API data to match component interface
  const tradeData = useMemo(() => {
    if (propData) return propData; // Use prop data if provided
    
    if (!myStatsResponse?.results?.trade_history) return [];
    
    console.log('Raw API trade_history:', myStatsResponse.results.trade_history);
    
    const transformedData = myStatsResponse.results.trade_history.map((trade: ApiTradeHistory, index: number): TradeData => {
      console.log(`Trade ${index + 1}:`, {
        order: trade.order,
        side: trade.side,
        originalSide: trade.side
      });
      
      return {
        ticket: safeNumber(trade.order), // Use 'order' directly from API
        openTime: new Date(trade.open_time).toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(',', ' -'),
        openPrice: safeNumber(trade.open_price),
        closeTime: new Date(trade.close_time).toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(',', ' -'),
        closePrice: safeNumber(trade.close_price),
        side: trade.side === 'buy' ? 'Buy' : trade.side === 'sell' ? 'Sell' : trade.side, // Handle both lowercase and proper case
        symbol: trade.symbol || '',
        volume: safeNumber(trade.volume),
        grossProfit: safeNumber(trade.profit), // Use 'profit' directly from API
        winLoss: safeNumber(trade.profit),
      };
    });
    
    console.log('Transformed trade data:', transformedData);
    return transformedData;
  }, [myStatsResponse?.results?.trade_history, propData]);

  // Filter data based on search term and selected date
  const filteredData = useMemo(() => {
    return tradeData.filter((trade) => {
      const matchesSearch =
        searchTerm === "" ||
        trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.ticket.toString().includes(searchTerm);

      const matchesDate =
        selectedDate === "" || trade.openTime.includes(selectedDate);

      return matchesSearch && matchesDate;
    });
  }, [tradeData, searchTerm, selectedDate]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginated = filteredData.slice(startIndex, startIndex + rowsPerPage);
    console.log('Paginated data for display:', paginated);
    return paginated;
  }, [filteredData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(startIndex + rowsPerPage - 1, filteredData.length);

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

  const shouldShowLoading = !selectedEnrollment || isLoading || !myStatsResponse?.results;

  if (shouldShowLoading) {
    return (
      <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] p-6">
        <div className="text-center text-[#85A8C3]">Loading trade history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] p-6">
        <div className="text-center text-[#ED5363]">Error loading trade history: {error instanceof Error ? error.message : 'Unknown error'}</div>
      </div>
    );
  }

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
            Trade history
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
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
          <div className="overflow-x-auto rounded-lg">
            <div 
              className={`gap-0 min-w-[1000px] trade-history-table ${
                browserInfo.isSafari 
                  ? 'grid grid-cols-9' 
                  : 'grid grid-cols-9'
              }`}
              style={{
                // Safari-specific grid fixes
                ...(browserInfo.isSafari && {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(9, 1fr)',
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
              <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-8 py-3.5 text-center border-r border-[#28BFFF]/20 whitespace-nowrap">
                <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                  Close time
                </span>
              </div>
              <div className="bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] px-4 py-3.5 text-right border-r border-[#28BFFF]/20 whitespace-nowrap">
                <span className="text-xs font-medium text-[#E4EEF5] tracking-tight">
                  Close Price
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
                  Gross Profit
                </span>
              </div>

              {/* Table Rows */}
              {paginatedData.map((trade, index) => {
                console.log(`Rendering trade ${index}:`, trade.side);
                return (
                  <React.Fragment key={`${trade.ticket}-${index}`}>
                    <div className="px-6 py-2 border-b border-[#28BFFF]/10 text-left">
                      <span className="text-sm text-[#E4EEF5] tracking-tight">
                        {trade.ticket}
                      </span>
                    </div>
                    <div className="px-4 py-2 border-b border-[#28BFFF]/10 text-center">
                      <span className="text-sm text-[#E4EEF5] tracking-tight">
                        {trade.openTime}
                      </span>
                    </div>
                    <div className="px-4 py-2 border-b border-[#28BFFF]/10 text-right">
                      <span className="text-sm text-[#E4EEF5] tracking-tight">
                        {trade.openPrice.toFixed(5)}
                      </span>
                    </div>
                    <div className="px-8 py-2 border-b border-[#28BFFF]/10 text-center">
                      <span className="text-sm text-[#E4EEF5] tracking-tight">
                        {trade.closeTime}
                      </span>
                    </div>
                    <div className="px-4 py-2 border-b border-[#28BFFF]/10 text-right">
                      <span className="text-sm text-[#E4EEF5] tracking-tight">
                        {trade.closePrice.toFixed(5)}
                      </span>
                    </div>
                    <div className="px-3 py-2 border-b border-[#28BFFF]/10 text-center">
                      <div className="flex justify-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-2xl text-xs font-semibold ${
                            trade.side === "Buy"
                              ? "bg-[rgba(27,191,153,0.20)] text-[#1BBF99]"
                              : "bg-[rgba(237,83,99,0.20)] text-[#ED5363]"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              trade.side === "Buy"
                                ? "bg-[#1BBF99]"
                                : "bg-[#ED5363]"
                            }`}
                          ></div>
                          {trade.side}
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
                        {trade.volume.toFixed(2)}
                      </span>
                    </div>
                    <div className="px-6 py-2 border-b border-[#28BFFF]/10 text-right">
                      <span
                        className={`text-sm tracking-tight ${
                          trade.grossProfit >= 0
                            ? "text-[#1BBF99]"
                            : "text-[#ED5363]"
                        }`}
                      >
                        {trade.grossProfit >= 0 ? "" : "-"}{formatCurrency(Math.abs(trade.grossProfit), currency)}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
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

            {/* Items Info */}
            <div className="text-xs text-[#85A8C3] tracking-tight">
              {String(startIndex).padStart(2, "0")} -{" "}
              {String(endIndex).padStart(2, "0")} items of{" "}
              {filteredData.length}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-1 py-2 text-sm font-semibold text-[#E4EEF5] tracking-tight disabled:opacity-50"
                style={{
                  WebkitAppearance: 'none',
                  appearance: 'none',
                }}
              >
                First
              </button>

              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center border border-[#28BFFF]/20 bg-[rgba(40,191,255,0.05)] rounded-lg disabled:opacity-50 shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]"
                style={{
                  WebkitAppearance: 'none',
                  appearance: 'none',
                }}
              >
                <ChevronLeft className="w-4 h-4 text-[#85A8C3]" />
              </button>

              {renderPaginationButtons()}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center border border-[#28BFFF]/20 bg-[rgba(40,191,255,0.05)] rounded-lg disabled:opacity-50 shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]"
                style={{
                  WebkitAppearance: 'none',
                  appearance: 'none',
                }}
              >
                <ChevronRight className="w-4 h-4 text-[#85A8C3]" />
              </button>

              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-1 py-2 text-sm font-semibold text-[#E4EEF5] tracking-tight disabled:opacity-50"
                style={{
                  WebkitAppearance: 'none',
                  appearance: 'none',
                }}
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeHistoryTable;
