import React, { useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useJournalTrades } from '@/hooks/useJournal';
import { CalendarDay, TradeListItem } from '@/utils/journalApi';
import { formatCurrency } from '@/utils/currencyFormatter';
import SessionEditor from './SessionEditor';

interface CalendarDayDetailProps {
  date: string;
  enrollmentId: string;
  onClose: () => void;
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

function formatDateDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const CalendarDayDetail: React.FC<CalendarDayDetailProps> = ({ date, enrollmentId, onClose }) => {
  const { data: tradesData, isLoading } = useJournalTrades(
    enrollmentId,
    { date_from: date, date_to: date },
    1,
    100
  );

  const trades = tradesData?.results ?? [];

  const daySummary = useMemo(() => {
    const totalPnl = trades.reduce((sum, t) => sum + parseFloat(t.profit), 0);
    const wins = trades.filter((t) => parseFloat(t.profit) > 0).length;
    const losses = trades.filter((t) => parseFloat(t.profit) < 0).length;
    const totalVolume = trades.reduce((sum, t) => sum + t.volume, 0);
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    const biggestWin = trades.length > 0 ? Math.max(...trades.map((t) => parseFloat(t.profit))) : 0;
    const biggestLoss = trades.length > 0 ? Math.min(...trades.map((t) => parseFloat(t.profit))) : 0;
    return { totalPnl, wins, losses, totalVolume, winRate, biggestWin, biggestLoss };
  }, [trades]);

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114] p-5 animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#E4EEF5]">{formatDateDisplay(date)}</h3>
          <p className="mt-0.5 text-xs text-[#85A8C3]">
            {trades.length} trade{trades.length !== 1 ? 's' : ''} executed
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg border border-[#1E2D3D] p-1.5 text-[#85A8C3] transition-colors hover:border-[#ED5363]/30 hover:text-[#ED5363]"
          aria-label="Close day detail"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* P&L Summary Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">Net P&L</p>
          <p
            className="mt-1 text-sm font-bold"
            style={{ color: daySummary.totalPnl >= 0 ? '#1BBF99' : '#ED5363' }}
          >
            {daySummary.totalPnl >= 0 ? '+' : ''}
            {formatCurrency(daySummary.totalPnl)}
          </p>
        </div>
        <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">Win Rate</p>
          <p className="mt-1 text-sm font-bold text-[#E4EEF5]">{daySummary.winRate.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">W / L</p>
          <p className="mt-1 text-sm font-bold text-[#E4EEF5]">
            <span className="text-[#1BBF99]">{daySummary.wins}</span>
            {' / '}
            <span className="text-[#ED5363]">{daySummary.losses}</span>
          </p>
        </div>
        <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">Volume</p>
          <p className="mt-1 text-sm font-bold text-[#E4EEF5]">{daySummary.totalVolume.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">Best Trade</p>
          <p className="mt-1 text-sm font-bold text-[#1BBF99]">
            {daySummary.biggestWin > 0 ? `+${formatCurrency(daySummary.biggestWin)}` : '--'}
          </p>
        </div>
        <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">Worst Trade</p>
          <p className="mt-1 text-sm font-bold text-[#ED5363]">
            {daySummary.biggestLoss < 0 ? formatCurrency(daySummary.biggestLoss) : '--'}
          </p>
        </div>
      </div>

      {/* Two-column: Trades + Session */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Trades Table */}
        <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808]">
          <div className="border-b border-[#1E2D3D]/60 px-4 py-3">
            <h4 className="text-sm font-medium text-[#E4EEF5]">Trades</h4>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
              </div>
            ) : trades.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-xs text-[#85A8C3]/60">No trades on this day</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1E2D3D]/40 text-[10px] uppercase tracking-wider text-[#85A8C3]/50">
                    <th className="px-4 py-2.5 font-medium">Symbol</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Volume</th>
                    <th className="px-4 py-2.5 font-medium">Open</th>
                    <th className="px-4 py-2.5 font-medium">Close</th>
                    <th className="px-4 py-2.5 text-right font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => {
                    const profit = parseFloat(trade.profit);
                    const isBuy = trade.cmd === 0;
                    return (
                      <tr
                        key={trade.order}
                        className="border-b border-[#1E2D3D]/20 transition-colors hover:bg-[#1E2D3D]/10"
                      >
                        <td className="px-4 py-2.5 font-medium text-[#E4EEF5]">{trade.symbol}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 text-xs ${
                              isBuy ? 'text-[#1BBF99]' : 'text-[#ED5363]'
                            }`}
                          >
                            {isBuy ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {isBuy ? 'Buy' : 'Sell'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-[#85A8C3]">{trade.volume}</td>
                        <td className="px-4 py-2.5 text-[#85A8C3]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[#85A8C3]/40" />
                            {formatTime(trade.open_time)}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[#85A8C3]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[#85A8C3]/40" />
                            {formatTime(trade.close_time)}
                          </div>
                        </td>
                        <td
                          className="px-4 py-2.5 text-right font-semibold"
                          style={{ color: profit >= 0 ? '#1BBF99' : '#ED5363' }}
                        >
                          {profit >= 0 ? '+' : ''}
                          {formatCurrency(profit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Session Editor */}
        <SessionEditor date={date} enrollmentId={enrollmentId} />
      </div>
    </div>
  );
};

export default CalendarDayDetail;
