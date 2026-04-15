import React from 'react';
import {
  TrendingUp,
  Target,
  Scale,
  Brain,
  LineChart,
  ArrowUpDown,
  Hash,
  BookOpen,
} from 'lucide-react';
import { formatCurrency } from '@/utils/currencyFormatter';

interface JournalMetricsRowProps {
  netPnl: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  sharpeRatio: number;
  avgRR: number;
  totalTrades: number;
  tradesJournaled: number;
}

interface MetricCardConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  getValue: (props: JournalMetricsRowProps) => string;
  getColor: (props: JournalMetricsRowProps) => string;
}

const METRICS: MetricCardConfig[] = [
  {
    key: 'net_pnl',
    label: 'Net P&L',
    icon: <TrendingUp className="h-4 w-4" />,
    getValue: (p) => {
      const prefix = p.netPnl >= 0 ? '+' : '';
      return `${prefix}${formatCurrency(p.netPnl)}`;
    },
    getColor: (p) => (p.netPnl >= 0 ? '#1BBF99' : '#ED5363'),
  },
  {
    key: 'win_rate',
    label: 'Win Rate',
    icon: <Target className="h-4 w-4" />,
    getValue: (p) => `${p.winRate.toFixed(1)}%`,
    getColor: (p) => (p.winRate > 50 ? '#1BBF99' : '#ED5363'),
  },
  {
    key: 'profit_factor',
    label: 'Profit Factor',
    icon: <Scale className="h-4 w-4" />,
    getValue: (p) => p.profitFactor.toFixed(2),
    getColor: () => '#E4EEF5',
  },
  {
    key: 'expectancy',
    label: 'Expectancy',
    icon: <Brain className="h-4 w-4" />,
    getValue: (p) => {
      const prefix = p.expectancy >= 0 ? '+' : '';
      return `${prefix}${formatCurrency(p.expectancy)}`;
    },
    getColor: (p) => (p.expectancy >= 0 ? '#1BBF99' : '#ED5363'),
  },
  {
    key: 'sharpe_ratio',
    label: 'Sharpe Ratio',
    icon: <LineChart className="h-4 w-4" />,
    getValue: (p) => p.sharpeRatio.toFixed(2),
    getColor: () => '#E4EEF5',
  },
  {
    key: 'avg_rr',
    label: 'Avg R:R',
    icon: <ArrowUpDown className="h-4 w-4" />,
    getValue: (p) => p.avgRR.toFixed(2),
    getColor: () => '#E4EEF5',
  },
  {
    key: 'total_trades',
    label: 'Total Trades',
    icon: <Hash className="h-4 w-4" />,
    getValue: (p) => p.totalTrades.toLocaleString(),
    getColor: () => '#E4EEF5',
  },
  {
    key: 'trades_journaled',
    label: 'Journaled',
    icon: <BookOpen className="h-4 w-4" />,
    getValue: (p) => {
      const pct = p.totalTrades > 0 ? ((p.tradesJournaled / p.totalTrades) * 100).toFixed(0) : '0';
      return `${p.tradesJournaled} (${pct}%)`;
    },
    getColor: () => '#3AB3FF',
  },
];

const JournalMetricsRow: React.FC<JournalMetricsRowProps> = (props) => {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      {METRICS.map((metric) => {
        const color = metric.getColor(props);
        return (
          <div
            key={metric.key}
            className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <span style={{ color: '#85A8C3' }}>{metric.icon}</span>
              <span className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
                {metric.label}
              </span>
            </div>
            <p className="text-xl font-bold" style={{ color }}>
              {metric.getValue(props)}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default JournalMetricsRow;
