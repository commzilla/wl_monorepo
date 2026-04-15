import React, { useCallback, useMemo, useState } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { useJournalTrades } from '@/hooks/useJournal';
import { TradeListItem } from '@/utils/journalApi';
import { Switch } from '@/components/ui/switch';
import TradeTagBadge from './TradeTagBadge';
import TradeJournalDrawer from './TradeJournalDrawer';

interface JournalTradeLogProps {
  enrollmentId: string;
}

const PAGE_SIZE = 50;

const JournalTradeLog: React.FC<JournalTradeLogProps> = ({ enrollmentId }) => {
  // Filter state
  const [symbolFilter, setSymbolFilter] = useState('');
  const [sideFilter, setSideFilter] = useState<'' | 'buy' | 'sell'>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hasNotesOnly, setHasNotesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);

  // Drawer state
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);

  // Build filters object for the API
  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (symbolFilter.trim()) f.symbol = symbolFilter.trim();
    if (sideFilter) f.side = sideFilter;
    if (dateFrom) f.date_from = dateFrom;
    if (dateTo) f.date_to = dateTo;
    if (hasNotesOnly) f.has_journal = 'true';
    return f;
  }, [symbolFilter, sideFilter, dateFrom, dateTo, hasNotesOnly]);

  const { data, isLoading, isFetching } = useJournalTrades(
    enrollmentId,
    filters,
    page,
    PAGE_SIZE
  );

  const trades = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Reset to page 1 when filters change
  const handleFilterChange = useCallback(
    <T,>(setter: React.Dispatch<React.SetStateAction<T>>) =>
      (value: T) => {
        setter(value);
        setPage(1);
      },
    []
  );

  const handleRowClick = useCallback((trade: TradeListItem) => {
    setSelectedOrder(trade.order);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setSelectedOrder(null);
  }, []);

  const formatDateTime = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }) +
      ' ' +
      d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
  };

  const renderStars = (rating: number | null) => {
    if (rating === null || rating === 0) {
      return <span className="text-[#85A8C3]/30">-</span>;
    }
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-3 w-3 ${
              s <= rating
                ? 'fill-[#F5A623] text-[#F5A623]'
                : 'fill-transparent text-[#85A8C3]/20'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="border border-[rgba(40,191,255,0.05)] w-full rounded-2xl">
      {/* Header + Filter bar */}
      <div className="flex flex-col gap-4 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-xl font-medium tracking-[-0.6px] text-[#E4EEF5]">
            Trade Log
          </h2>
          <div className="flex items-center gap-3">
            {isFetching && !isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-[#28BFFF]/60" />
            )}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                showFilters
                  ? 'border-[#28BFFF]/40 bg-[#28BFFF]/10 text-[#E4EEF5]'
                  : 'border-[#28BFFF]/10 text-[#85A8C3] hover:border-[#28BFFF]/25 hover:text-[#E4EEF5]'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </button>
          </div>
        </div>

        {/* Collapsible filters */}
        {showFilters && (
          <div className="flex flex-wrap items-end gap-3">
            {/* Symbol search */}
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#85A8C3]/60">
                Symbol
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-[#28BFFF]/15 bg-transparent px-3 py-1.5">
                <Search className="h-3.5 w-3.5 text-[#85A8C3]/50" />
                <input
                  type="text"
                  value={symbolFilter}
                  onChange={(e) =>
                    handleFilterChange(setSymbolFilter)(e.target.value)
                  }
                  placeholder="e.g. EURUSD"
                  className="w-28 bg-transparent text-sm text-[#E4EEF5] placeholder:text-[#85A8C3]/40 focus:outline-none"
                />
              </div>
            </div>

            {/* Side filter */}
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#85A8C3]/60">
                Side
              </span>
              <div className="flex overflow-hidden rounded-lg border border-[#28BFFF]/15">
                {[
                  { label: 'All', value: '' as const },
                  { label: 'Buy', value: 'buy' as const },
                  { label: 'Sell', value: 'sell' as const },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      handleFilterChange(setSideFilter)(opt.value)
                    }
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      sideFilter === opt.value
                        ? 'bg-[#28BFFF]/15 text-[#E4EEF5]'
                        : 'text-[#85A8C3] hover:bg-[#28BFFF]/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date from */}
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#85A8C3]/60">
                From
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) =>
                  handleFilterChange(setDateFrom)(e.target.value)
                }
                className="rounded-lg border border-[#28BFFF]/15 bg-transparent px-3 py-1.5 text-sm text-[#E4EEF5] focus:border-[#28BFFF]/40 focus:outline-none [color-scheme:dark]"
              />
            </div>

            {/* Date to */}
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#85A8C3]/60">
                To
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) =>
                  handleFilterChange(setDateTo)(e.target.value)
                }
                className="rounded-lg border border-[#28BFFF]/15 bg-transparent px-3 py-1.5 text-sm text-[#E4EEF5] focus:border-[#28BFFF]/40 focus:outline-none [color-scheme:dark]"
              />
            </div>

            {/* Has notes toggle */}
            <div className="flex items-center gap-2 pb-0.5">
              <Switch
                id="has-notes"
                checked={hasNotesOnly}
                onCheckedChange={(checked) =>
                  handleFilterChange(setHasNotesOnly)(checked)
                }
                className="data-[state=checked]:bg-[#3AB3FF]"
              />
              <label
                htmlFor="has-notes"
                className="cursor-pointer text-sm text-[#85A8C3]"
              >
                Journaled only
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto">
        {/* Table header */}
        <div className="flex min-w-[900px] items-center border-b border-[#171E22] px-6 text-[11px] font-medium uppercase tracking-wider text-[#85A8C3]/70">
          <div className="w-[110px] shrink-0 py-3">Symbol</div>
          <div className="w-[70px] shrink-0 py-3">Side</div>
          <div className="w-[70px] shrink-0 py-3 text-right">Volume</div>
          <div className="w-[130px] shrink-0 py-3 pl-4">Open Time</div>
          <div className="w-[130px] shrink-0 py-3 pl-4">Close Time</div>
          <div className="w-[100px] shrink-0 py-3 text-right">P&L</div>
          <div className="w-[100px] shrink-0 py-3 pl-4">Rating</div>
          <div className="flex-1 py-3 pl-4">Tags</div>
          <div className="w-[40px] shrink-0 py-3 text-center">
            <span className="sr-only">Journal</span>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#28BFFF]" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && trades.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-[#85A8C3]/60">No trades found</p>
            <p className="mt-1 text-xs text-[#85A8C3]/40">
              Adjust your filters or wait for new trades to sync
            </p>
          </div>
        )}

        {/* Table rows */}
        {!isLoading &&
          trades.map((trade) => {
            const isBuy = trade.cmd === 0;
            const profit = parseFloat(trade.profit);
            const isProfitable = profit >= 0;

            return (
              <div
                key={trade.order}
                role="button"
                tabIndex={0}
                onClick={() => handleRowClick(trade)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(trade);
                  }
                }}
                className="flex min-w-[900px] cursor-pointer items-center border-b border-[#171E22] px-6 transition-colors hover:bg-[#28BFFF]/[0.03]"
              >
                {/* Symbol */}
                <div className="w-[110px] shrink-0 py-3 text-sm font-medium text-[#E4EEF5]">
                  {trade.symbol}
                </div>

                {/* Side */}
                <div className="w-[70px] shrink-0 py-3">
                  <span
                    className={`inline-block rounded-2xl px-2 py-0.5 text-xs font-semibold ${
                      isBuy
                        ? 'bg-[rgba(27,191,153,0.18)] text-[#1BBF99]'
                        : 'bg-[rgba(237,83,99,0.20)] text-[#ED5363]'
                    }`}
                  >
                    {isBuy ? 'Buy' : 'Sell'}
                  </span>
                </div>

                {/* Volume */}
                <div className="w-[70px] shrink-0 py-3 text-right text-sm text-[#E4EEF5]">
                  {trade.volume}
                </div>

                {/* Open Time */}
                <div className="w-[130px] shrink-0 py-3 pl-4 text-xs text-[#85A8C3]">
                  {formatDateTime(trade.open_time)}
                </div>

                {/* Close Time */}
                <div className="w-[130px] shrink-0 py-3 pl-4 text-xs text-[#85A8C3]">
                  {formatDateTime(trade.close_time)}
                </div>

                {/* P&L */}
                <div
                  className={`w-[100px] shrink-0 py-3 text-right text-sm font-semibold ${
                    isProfitable ? 'text-[#1BBF99]' : 'text-[#ED5363]'
                  }`}
                >
                  {isProfitable ? '+' : ''}${profit.toFixed(2)}
                </div>

                {/* Rating */}
                <div className="w-[100px] shrink-0 py-3 pl-4">
                  {renderStars(trade.rating)}
                </div>

                {/* Tags */}
                <div className="flex flex-1 flex-wrap gap-1 py-3 pl-4">
                  {trade.tags.length > 0 ? (
                    trade.tags.slice(0, 3).map((tag) => (
                      <TradeTagBadge
                        key={tag.id}
                        name={tag.name}
                        color={tag.color}
                      />
                    ))
                  ) : (
                    <span className="text-xs text-[#85A8C3]/30">-</span>
                  )}
                  {trade.tags.length > 3 && (
                    <span className="text-xs text-[#85A8C3]/50">
                      +{trade.tags.length - 3}
                    </span>
                  )}
                </div>

                {/* Journal status */}
                <div className="w-[40px] shrink-0 py-3 text-center">
                  {trade.has_journal ? (
                    <CheckCircle2 className="mx-auto h-4 w-4 text-[#1BBF99]" />
                  ) : (
                    <div className="mx-auto h-4 w-4 rounded-full border border-[#85A8C3]/20" />
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Pagination */}
      {!isLoading && totalCount > 0 && (
        <div className="flex items-center justify-between gap-4 px-6 py-4 flex-wrap">
          <span className="text-xs text-[#85A8C3]/60">
            Showing{' '}
            <span className="font-medium text-[#85A8C3]">
              {(page - 1) * PAGE_SIZE + 1}
            </span>{' '}
            -{' '}
            <span className="font-medium text-[#85A8C3]">
              {Math.min(page * PAGE_SIZE, totalCount)}
            </span>{' '}
            of{' '}
            <span className="font-medium text-[#85A8C3]">{totalCount}</span>{' '}
            trades
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              className="rounded-lg border border-[#28BFFF]/10 px-2.5 py-1 text-xs font-medium text-[#E4EEF5] transition-colors hover:bg-[#28BFFF]/5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center justify-center rounded-lg border border-[#28BFFF]/10 p-1.5 text-[#E4EEF5] transition-colors hover:bg-[#28BFFF]/5 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page numbers */}
            {generatePageNumbers(page, totalPages).map((p, i) =>
              p === null ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-1 text-xs text-[#85A8C3]/40"
                >
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
                    p === page
                      ? 'border-[#28BFFF]/30 bg-[#28BFFF]/10 text-[#E4EEF5]'
                      : 'border-[#28BFFF]/10 bg-[rgba(40,191,255,0.05)] text-[#85A8C3] hover:text-[#E4EEF5]'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center justify-center rounded-lg border border-[#28BFFF]/10 p-1.5 text-[#E4EEF5] transition-colors hover:bg-[#28BFFF]/5 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="rounded-lg border border-[#28BFFF]/10 px-2.5 py-1 text-xs font-medium text-[#E4EEF5] transition-colors hover:bg-[#28BFFF]/5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Trade Journal Drawer */}
      <TradeJournalDrawer
        order={selectedOrder}
        enrollmentId={enrollmentId}
        onClose={handleDrawerClose}
        open={selectedOrder !== null}
      />
    </div>
  );
};

/**
 * Generate an array of page numbers to display, with null representing ellipsis.
 * Always shows first page, last page, current page, and one page on each side of current.
 */
function generatePageNumbers(
  current: number,
  total: number
): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [];
  const addPage = (p: number) => {
    if (pages[pages.length - 1] !== p) {
      pages.push(p);
    }
  };

  addPage(1);

  if (current > 3) {
    pages.push(null); // ellipsis
  }

  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    addPage(i);
  }

  if (current < total - 2) {
    pages.push(null); // ellipsis
  }

  addPage(total);

  return pages;
}

export default JournalTradeLog;
