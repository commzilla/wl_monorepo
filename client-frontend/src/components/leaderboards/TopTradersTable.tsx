import React, { useState } from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Leaf,
} from "lucide-react";

// TypeScript interfaces
interface Trader {
  id: string;
  name: string;
  avatar: string;
  equity: number;
  growthPercentage: number;
  profit: number;
  wonTradePercent: number;
  isCurrentUser?: boolean;
}

interface TopTradersTableProps {
  traders: Trader[];
  currentPage?: number;
  totalPages?: number;
  itemsPerPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (items: number) => void;
}

// Laurel icon for top traders title
const LaurelIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 15s-4-2-4-5V7l4-2 4 2v3c0 3-4 5-4 5z" />
    <path d="M10 13s-2-1-2-3V8l2-1 2 1v2" />
  </svg>
);

const TopTradersTable: React.FC<TopTradersTableProps> = ({
  traders = [],
  currentPage = 1,
  totalPages = 10,
  itemsPerPage = 10,
  totalItems = 100,
  onPageChange = () => {},
  onItemsPerPageChange = () => {},
}) => {
  const [selectedItemsPerPage, setSelectedItemsPerPage] =
    useState(itemsPerPage);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get rank styling based on position
  const getRankStyling = (index: number, isCurrentUser?: boolean) => {
    const position = index + 1;

    if (isCurrentUser) {
      return {
        rowBg: "bg-blue-500/10",
        placeColor: "text-blue-400",
        highlightBar: "bg-blue-400",
      };
    }

    switch (position) {
      case 1:
        return {
          rowBg: "bg-yellow-400/10",
          placeColor: "text-yellow-400",
          highlightBar: "bg-yellow-400",
        };
      case 2:
        return {
          rowBg: "bg-slate-400/10",
          placeColor: "text-slate-400",
          highlightBar: "bg-slate-400",
        };
      case 3:
        return {
          rowBg: "bg-orange-400/10",
          placeColor: "text-orange-400",
          highlightBar: "bg-orange-400",
        };
      default:
        return {
          rowBg: "bg-slate-800/20",
          placeColor: "text-slate-500",
          highlightBar: "bg-transparent",
        };
    }
  };

  // Generate pagination numbers
  const generatePaginationNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage > 3) {
        pages.push(1, '...');
      }
      for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        if(i > 0 && i <= totalPages)
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('...', totalPages);
      }
    }

    return pages.filter((item, index) => pages.indexOf(item) === index || item === '...');
  };


  return (
    <>
      {/* Header Section */}
      <div className="flex justify-between items-center w-full mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg border border-[#3AB3FF] bg-[#3AB3FF]/10 shadow-[0_0_16px_rgba(58,179,255,0.12),0_-8px_32px_rgba(58,179,255,0.06)_inset]">
            <img src="/leaderboard-icon.svg" alt="Top Traders" className="w-9 h-auto" />
          </div>
          <h2 className="text-xl font-medium text-slate-200">Top Traders</h2>
        </div>
      </div>
      <div className="flex flex-col gap-4 w-full max-w-full mx-auto bg-[rgba(40,191,255,0.05)] p-6 rounded-2xl border border-[rgba(40,191,255,0.1)]">
        {/* Table Container */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[600px] lg:min-w-[1000px]">
            {/* Table Header */}
            <div className="grid grid-cols-[80px_1fr_1fr_1fr] lg:grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm font-medium text-slate-400 border-b border-slate-800">
              <div>Place</div>
              <div>Trader</div>
              <div className="text-right hidden lg:block">Equity</div>
              <div className="text-right">Growth Percentage</div>
              <div className="text-right hidden lg:block">Profit</div>
              <div className="text-right">Won Trade Percent</div>
            </div>

            {/* Table Body */}
            <div className="flex flex-col gap-2 mt-2">
              {traders.map((trader, index) => {
                const styling = getRankStyling(index, trader.isCurrentUser);
                const position = index + 1;

                return (
                  <div
                    key={trader.id}
                    className={`grid grid-cols-[80px_1fr_1fr_1fr] lg:grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] items-center gap-4 p-4 rounded-lg transition-colors duration-200 ${
                      styling.rowBg
                    } ${
                      trader.isCurrentUser
                        ? ""
                        : "border border-transparent"
                    }`}
                  >
                    {/* Place */}
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-1 h-8 rounded-full ${styling.highlightBar}`}
                      ></div>
                      <div
                        className={`text-lg font-semibold ${styling.placeColor}`}
                      >
                        {position}
                      </div>
                    </div>

                    {/* Trader */}
                    <div className="flex items-center gap-3">
                      <img
                        src={trader.avatar}
                        alt={trader.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-700"
                      />
                      <div className="font-medium text-slate-200">
                        {trader.isCurrentUser ? "You" : trader.name}
                      </div>
                    </div>

                    {/* Equity */}
                    <div className="text-right font-medium text-slate-300 hidden lg:block">
                      {formatCurrency(trader.equity)}
                    </div>

                    {/* Growth Percentage */}
                    <div className="flex justify-end">
                      <div className="px-3 py-1 text-sm font-semibold text-yellow-400 bg-yellow-400/10 rounded-full">
                        {trader.growthPercentage}%
                      </div>
                    </div>

                    {/* Profit */}
                    <div className="text-right font-medium text-slate-300 hidden lg:block">
                      {formatCurrency(trader.profit)}
                    </div>

                    {/* Won Trade Percent */}
                    <div className="text-right font-medium text-slate-300">
                      {trader.wonTradePercent}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4 mt-6">
          {/* Items Per Page */}
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
            <span>Traders per page:</span>
            <div className="relative">
              <select
                value={selectedItemsPerPage}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSelectedItemsPerPage(val);
                  onItemsPerPageChange(val);
                }}
                className="pl-3 pr-8 py-2 appearance-none bg-slate-800 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <ChevronDownIcon className="w-5 h-5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Page Info */}
          <div className="hidden md:block text-sm text-slate-500">
            {`01 - ${String(itemsPerPage).padStart(2, '0')} top traders of ${totalItems}`}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              First
            </button>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-md hover:bg-slate-800 disabled:opacity-50"
            >
              <ChevronLeftIcon className="w-5 h-5 text-slate-400" />
            </button>

            {generatePaginationNumbers().map((page, index) =>
              typeof page === "number" ? (
                <button
                  key={index}
                  onClick={() => onPageChange(page)}
                  className={`w-9 h-9 rounded-md text-sm font-medium ${
                    currentPage === page
                      ? "bg-cyan-500 text-slate-900"
                      : "hover:bg-slate-800 text-slate-400"
                  }`}
                >
                  {page}
                </button>
              ) : (
                <span key={index} className="px-2 text-slate-500">
                  ...
                </span>
              )
            )}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md hover:bg-slate-800 disabled:opacity-50"
            >
              <ChevronRightIcon className="w-5 h-5 text-slate-400" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TopTradersTable; 