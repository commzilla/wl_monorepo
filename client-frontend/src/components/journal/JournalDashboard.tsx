import React from 'react';
import { useJournalDashboard } from '@/hooks/useJournal';
import type { DashboardData } from '@/utils/journalApi';
import JournalMetricsRow from './JournalMetricsRow';
import EquityCurveChart from './EquityCurveChart';
import ComplianceMeters from './ComplianceMeters';
import JournalStreakCard from './JournalStreakCard';
import QuickInsightsCard from './QuickInsightsCard';

interface JournalDashboardProps {
  enrollmentId: string;
}

const JournalDashboard: React.FC<JournalDashboardProps> = ({ enrollmentId }) => {
  const { data, isLoading } = useJournalDashboard(enrollmentId);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-sm text-[#85A8C3]/50">No dashboard data available.</p>
      </div>
    );
  }

  const dashboard = data as DashboardData;

  return (
    <div className="space-y-5">
      {/* Full-width Metrics Row */}
      <JournalMetricsRow
        netPnl={dashboard.net_pnl}
        winRate={dashboard.win_rate}
        profitFactor={dashboard.profit_factor}
        expectancy={dashboard.expectancy}
        sharpeRatio={dashboard.sharpe_ratio}
        avgRR={dashboard.avg_rr}
        totalTrades={dashboard.total_trades}
        tradesJournaled={dashboard.trades_journaled}
      />

      {/* 2-column grid below */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Equity Curve — spans 2 cols on lg */}
        <div className="lg:col-span-2">
          <EquityCurveChart enrollmentId={enrollmentId} />
        </div>

        {/* Compliance Meters */}
        <ComplianceMeters
          dailyLossUsedPct={dashboard.daily_loss_used_pct}
          totalLossUsedPct={dashboard.total_loss_used_pct}
          profitTargetProgressPct={dashboard.profit_target_progress_pct}
        />

        {/* Journal Streak */}
        <JournalStreakCard
          journalStreak={dashboard.journal_streak}
          winStreak={dashboard.win_streak}
          lossStreak={dashboard.loss_streak}
        />

        {/* Quick Insights — spans 2 cols on lg */}
        <div className="lg:col-span-2">
          <QuickInsightsCard insight={dashboard.quick_insight} />
        </div>
      </div>
    </div>
  );
};

export default JournalDashboard;
