import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Film, TrendingUp, TrendingDown, Clock, Tag } from 'lucide-react';
import { useReplayTrades } from '@/hooks/useJournal';
import { ReplayTrade } from '@/utils/journalApi';
import { formatCurrency } from '@/utils/currencyFormatter';
import TradeReplayControls from './TradeReplayControls';

interface TradeReplayPlayerProps {
  enrollmentId: string;
}

const TradeReplayPlayer: React.FC<TradeReplayPlayerProps> = ({ enrollmentId }) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const { data, isLoading } = useReplayTrades(enrollmentId, selectedDate);
  const trades = useMemo<ReplayTrade[]>(() => (Array.isArray(data) ? data : []), [data]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset index when trades change
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [trades]);

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && trades.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= trades.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000 / speed);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, trades.length]);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handlePrev = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);
  const handleNext = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.min(trades.length - 1, prev + 1));
  }, [trades.length]);
  const handleFirst = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);
  const handleLast = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(Math.max(0, trades.length - 1));
  }, [trades.length]);

  const currentTrade = trades[currentIndex] ?? null;
  const visibleTrades = trades.slice(0, currentIndex + 1);

  // Compute cumulative P&L for the timeline bar
  const maxAbsPnl = useMemo(() => {
    if (trades.length === 0) return 1;
    return Math.max(...trades.map((t) => Math.abs(t.cumulative_pnl)), 1);
  }, [trades]);

  const formatTime = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-[#7570FF]" />
          <h2 className="text-lg font-semibold text-[#E4EEF5]">Trade Replay</h2>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg border border-[#1E2D3D] bg-[#0A1114] px-3 py-1.5 text-xs text-[#E4EEF5] focus:border-[#3AB3FF]/40 focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
        </div>
      ) : trades.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
          <p className="text-xs text-[#85A8C3]/50">No trades found for this date.</p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <TradeReplayControls
            currentIndex={currentIndex}
            totalTrades={trades.length}
            isPlaying={isPlaying}
            speed={speed}
            onPlay={handlePlay}
            onPause={handlePause}
            onPrev={handlePrev}
            onNext={handleNext}
            onFirst={handleFirst}
            onLast={handleLast}
            onSpeedChange={setSpeed}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left: Current trade detail */}
            <div className="lg:col-span-2 rounded-xl border border-[#1E2D3D] bg-[#0A1114] p-5">
              {currentTrade && (
                <div className="space-y-5">
                  {/* Trade header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-[#E4EEF5]">
                        {currentTrade.symbol}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          currentTrade.cmd === 0
                            ? 'bg-[#1BBF99]/15 text-[#1BBF99]'
                            : 'bg-[#ED5363]/15 text-[#ED5363]'
                        }`}
                      >
                        {currentTrade.cmd === 0 ? 'BUY' : 'SELL'}
                      </span>
                      <span className="text-sm text-[#85A8C3]">
                        {currentTrade.volume} lots
                      </span>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-xl font-bold"
                        style={{
                          color: parseFloat(currentTrade.profit) >= 0 ? '#1BBF99' : '#ED5363',
                        }}
                      >
                        {parseFloat(currentTrade.profit) >= 0 ? '+' : ''}
                        {formatCurrency(parseFloat(currentTrade.profit))}
                      </p>
                    </div>
                  </div>

                  {/* Trade info grid */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/50">Open</p>
                      <p className="mt-1 text-sm font-semibold text-[#E4EEF5]">
                        {currentTrade.open_price}
                      </p>
                      <p className="text-[10px] text-[#85A8C3]/50">
                        {formatTime(currentTrade.open_time)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/50">Close</p>
                      <p className="mt-1 text-sm font-semibold text-[#E4EEF5]">
                        {currentTrade.close_price}
                      </p>
                      <p className="text-[10px] text-[#85A8C3]/50">
                        {formatTime(currentTrade.close_time)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/50">SL</p>
                      <p className="mt-1 text-sm font-semibold text-[#ED5363]">
                        {currentTrade.sl || '-'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/50">TP</p>
                      <p className="mt-1 text-sm font-semibold text-[#1BBF99]">
                        {currentTrade.tp || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  {currentTrade.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="h-3 w-3 text-[#85A8C3]/50" />
                      {currentTrade.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: `${tag.color}15`,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {currentTrade.notes && (
                    <div className="rounded-lg border border-[#1E2D3D]/40 bg-[#080808] p-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/50 mb-1">
                        Notes
                      </p>
                      <p className="text-xs text-[#E4EEF5] leading-relaxed">
                        {currentTrade.notes}
                      </p>
                    </div>
                  )}

                  {/* Cumulative P&L */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#1E2D3D]/40">
                    <span className="text-[10px] uppercase tracking-wider text-[#85A8C3]/50">
                      Cumulative P&L
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: currentTrade.cumulative_pnl >= 0 ? '#1BBF99' : '#ED5363',
                      }}
                    >
                      {currentTrade.cumulative_pnl >= 0 ? '+' : ''}
                      {formatCurrency(currentTrade.cumulative_pnl)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Trade timeline */}
            <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114] p-4">
              <p className="mb-3 text-xs font-semibold text-[#85A8C3]">Timeline</p>
              <div className="max-h-[400px] space-y-1.5 overflow-y-auto pr-1">
                {trades.map((trade, idx) => {
                  const profit = parseFloat(trade.profit);
                  const isActive = idx === currentIndex;
                  const isRevealed = idx <= currentIndex;
                  const isWin = profit >= 0;

                  return (
                    <button
                      key={trade.order}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentIndex(idx);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-all ${
                        isActive
                          ? 'border border-[#3AB3FF]/30 bg-[#3AB3FF]/5'
                          : isRevealed
                          ? 'border border-transparent hover:bg-[#1E2D3D]/30'
                          : 'border border-transparent opacity-30'
                      }`}
                    >
                      {/* Index dot */}
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                        style={{
                          backgroundColor: isRevealed
                            ? isWin
                              ? 'rgba(27, 191, 153, 0.15)'
                              : 'rgba(237, 83, 99, 0.15)'
                            : 'rgba(30, 45, 61, 0.4)',
                          color: isRevealed
                            ? isWin
                              ? '#1BBF99'
                              : '#ED5363'
                            : '#85A8C3',
                        }}
                      >
                        {idx + 1}
                      </div>

                      {/* Symbol + time */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-[#E4EEF5]">
                          {trade.symbol}
                        </p>
                        <p className="text-[9px] text-[#85A8C3]/50">
                          {formatTime(trade.close_time)}
                        </p>
                      </div>

                      {/* P&L */}
                      {isRevealed && (
                        <span
                          className="shrink-0 text-[11px] font-semibold"
                          style={{ color: isWin ? '#1BBF99' : '#ED5363' }}
                        >
                          {isWin ? '+' : ''}
                          {formatCurrency(profit)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* P&L progression bar */}
          <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114] p-4">
            <p className="mb-3 text-xs font-semibold text-[#85A8C3]">
              P&L Progression
            </p>
            <div className="flex items-end gap-[2px]" style={{ height: 80 }}>
              {trades.map((trade, idx) => {
                const isRevealed = idx <= currentIndex;
                const isActive = idx === currentIndex;
                const pnl = trade.cumulative_pnl;
                const barHeight = Math.max(4, (Math.abs(pnl) / maxAbsPnl) * 60);
                const isPositive = pnl >= 0;

                return (
                  <div
                    key={trade.order}
                    className="flex flex-1 flex-col items-center justify-end"
                    style={{ height: '100%' }}
                  >
                    <div
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: isRevealed ? barHeight : 4,
                        backgroundColor: !isRevealed
                          ? '#1E2D3D'
                          : isPositive
                          ? isActive
                            ? '#1BBF99'
                            : 'rgba(27, 191, 153, 0.4)'
                          : isActive
                          ? '#ED5363'
                          : 'rgba(237, 83, 99, 0.4)',
                        minHeight: 2,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TradeReplayPlayer;
