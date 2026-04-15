import React from 'react';
import { BarChart3, Clock, Tag, PieChart, Timer, Flame } from 'lucide-react';
import SymbolBreakdownChart from './SymbolBreakdownChart';
import TimeAnalysisHeatmap from './TimeAnalysisHeatmap';
import WinLossDistribution from './WinLossDistribution';
import MonteCarloChart from './MonteCarloChart';
import MFEMAEScatterPlot from './MFEMAEScatterPlot';
import DisciplinedEquityCurve from './DisciplinedEquityCurve';
import { useTagPerformance, useHoldingTime, useStreaks } from '@/hooks/useJournal';
import { formatCurrency } from '@/utils/currencyFormatter';

interface AnalyticsDashboardProps {
  enrollmentId: string;
}

// ─── Tag Performance Panel ────────────────────────────────────────────

interface TagPerformancePanelProps {
  enrollmentId: string;
}

const TagPerformancePanel: React.FC<TagPerformancePanelProps> = ({ enrollmentId }) => {
  const { data, isLoading } = useTagPerformance(enrollmentId);
  const tags = (data as any[]) ?? [];

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
      <div className="flex items-center gap-2 border-b border-[#1E2D3D]/60 px-5 py-4">
        <Tag className="h-4 w-4 text-[#7570FF]" />
        <h3 className="text-sm font-semibold text-[#E4EEF5]">Tag Performance</h3>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
          </div>
        ) : tags.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-xs text-[#85A8C3]/50">No tag data available. Tag your trades to see performance.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tags.slice(0, 10).map((tag: any, idx: number) => {
              const pnl = tag.pnl ?? 0;
              const winRate = tag.win_rate ?? 0;
              const trades = tag.trades ?? 0;
              const isPositive = pnl >= 0;
              return (
                <div key={tag.tag_id ?? idx} className="group">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color ?? '#3AB3FF' }}
                      />
                      <span className="text-xs font-medium text-[#E4EEF5] truncate">{tag.name ?? tag.tag_name}</span>
                      <span className="text-[10px] text-[#85A8C3]/50 shrink-0">{trades} trades</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-[#85A8C3]">{winRate.toFixed(0)}% WR</span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: isPositive ? '#1BBF99' : '#ED5363' }}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(pnl)}
                      </span>
                    </div>
                  </div>
                  {/* Bar */}
                  <div className="mt-1.5 h-1 w-full rounded-full bg-[#1E2D3D]/40">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(winRate, 100)}%`,
                        backgroundColor: isPositive ? '#1BBF99' : '#ED5363',
                        opacity: 0.6,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Holding Time Panel ───────────────────────────────────────────────

interface HoldingTimePanelProps {
  enrollmentId: string;
}

const HoldingTimePanel: React.FC<HoldingTimePanelProps> = ({ enrollmentId }) => {
  const { data, isLoading } = useHoldingTime(enrollmentId);
  const buckets = (data as any[]) ?? [];

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
      <div className="flex items-center gap-2 border-b border-[#1E2D3D]/60 px-5 py-4">
        <Timer className="h-4 w-4 text-[#F59E0B]" />
        <h3 className="text-sm font-semibold text-[#E4EEF5]">Holding Time Analysis</h3>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
          </div>
        ) : buckets.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-xs text-[#85A8C3]/50">No holding time data available yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {buckets.map((bucket: any, idx: number) => {
              const label = bucket.label ?? bucket.range ?? `Bucket ${idx + 1}`;
              const trades = bucket.trades ?? 0;
              const pnl = bucket.pnl ?? 0;
              const winRate = bucket.win_rate ?? 0;
              const maxTrades = Math.max(...buckets.map((b: any) => b.trades ?? 0), 1);
              const barWidth = (trades / maxTrades) * 100;
              const isPositive = pnl >= 0;

              return (
                <div key={idx}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs text-[#E4EEF5]">{label}</span>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className="text-[10px] text-[#85A8C3]">{trades} trades</span>
                      <span className="text-[10px] text-[#85A8C3]">{winRate.toFixed(0)}% WR</span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: isPositive ? '#1BBF99' : '#ED5363' }}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(pnl)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#1E2D3D]/40">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: isPositive ? '#1BBF99' : '#ED5363',
                        opacity: 0.5,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Streak Analysis Panel ────────────────────────────────────────────

interface StreakPanelProps {
  enrollmentId: string;
}

const StreakPanel: React.FC<StreakPanelProps> = ({ enrollmentId }) => {
  const { data, isLoading } = useStreaks(enrollmentId);
  const streaks = Array.isArray(data) ? data : (data as any)?.streaks ?? [];

  const currentStreak = streaks.length > 0 ? streaks[0] : null;
  const longestWin = streaks.reduce(
    (max: any, s: any) => (s.type === 'win' && s.count > (max?.count ?? 0) ? s : max),
    null
  );
  const longestLoss = streaks.reduce(
    (max: any, s: any) => (s.type === 'loss' && s.count > (max?.count ?? 0) ? s : max),
    null
  );

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
      <div className="flex items-center gap-2 border-b border-[#1E2D3D]/60 px-5 py-4">
        <Flame className="h-4 w-4 text-[#ED5363]" />
        <h3 className="text-sm font-semibold text-[#E4EEF5]">Streak Analysis</h3>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
          </div>
        ) : streaks.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-xs text-[#85A8C3]/50">No streak data available yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">Current</p>
                <p
                  className="mt-1 text-lg font-bold"
                  style={{
                    color: currentStreak?.type === 'win' ? '#1BBF99' : '#ED5363',
                  }}
                >
                  {currentStreak?.count ?? 0}
                </p>
                <p className="text-[10px] text-[#85A8C3]/50">
                  {currentStreak?.type === 'win' ? 'wins' : 'losses'}
                </p>
              </div>
              <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">Best Win</p>
                <p className="mt-1 text-lg font-bold text-[#1BBF99]">{longestWin?.count ?? 0}</p>
                <p className="text-[10px] text-[#85A8C3]/50">consecutive</p>
              </div>
              <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">Worst Loss</p>
                <p className="mt-1 text-lg font-bold text-[#ED5363]">{longestLoss?.count ?? 0}</p>
                <p className="text-[10px] text-[#85A8C3]/50">consecutive</p>
              </div>
            </div>

            {/* Recent streaks timeline */}
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
                Recent Streaks
              </p>
              <div className="flex flex-wrap gap-1">
                {streaks.slice(0, 20).map((streak: any, idx: number) => {
                  const isWin = streak.type === 'win';
                  return (
                    <div
                      key={idx}
                      className="flex items-center rounded-md border px-2 py-1"
                      style={{
                        borderColor: isWin ? 'rgba(27, 191, 153, 0.3)' : 'rgba(237, 83, 99, 0.3)',
                        backgroundColor: isWin ? 'rgba(27, 191, 153, 0.05)' : 'rgba(237, 83, 99, 0.05)',
                      }}
                      title={`${streak.count} ${streak.type}s: ${formatCurrency(streak.pnl)}`}
                    >
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: isWin ? '#1BBF99' : '#ED5363' }}
                      >
                        {streak.count}{isWin ? 'W' : 'L'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ enrollmentId }) => {
  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-[#3AB3FF]" />
        <h2 className="text-lg font-semibold text-[#E4EEF5]">Analytics</h2>
      </div>

      {/* 2-col grid on desktop, 1-col on mobile */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="min-w-0 overflow-hidden"><SymbolBreakdownChart enrollmentId={enrollmentId} /></div>
        <div className="min-w-0"><TimeAnalysisHeatmap enrollmentId={enrollmentId} /></div>
        <div className="min-w-0 overflow-hidden"><TagPerformancePanel enrollmentId={enrollmentId} /></div>
        <div className="min-w-0 overflow-hidden"><WinLossDistribution enrollmentId={enrollmentId} /></div>
        <div className="min-w-0 overflow-hidden"><HoldingTimePanel enrollmentId={enrollmentId} /></div>
        <div className="min-w-0 overflow-hidden"><StreakPanel enrollmentId={enrollmentId} /></div>
        <div className="min-w-0 overflow-hidden"><MFEMAEScatterPlot enrollmentId={enrollmentId} /></div>
        <div className="min-w-0 overflow-hidden"><DisciplinedEquityCurve enrollmentId={enrollmentId} /></div>
      </div>

      {/* Monte Carlo - full width */}
      <div className="min-w-0 overflow-hidden">
        <MonteCarloChart enrollmentId={enrollmentId} />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
