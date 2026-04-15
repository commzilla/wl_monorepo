import React, { useState, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { LineChart } from 'lucide-react';
import { useEquityCurve } from '@/hooks/useJournal';
import type { EquityCurvePoint } from '@/utils/journalApi';
import { formatCurrency } from '@/utils/currencyFormatter';

interface EquityCurveChartProps {
  enrollmentId: string;
}

const PERIODS = ['7d', '30d', '90d', 'All'] as const;
type Period = (typeof PERIODS)[number];

const formatDateLabel = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as EquityCurvePoint;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-[#1E2D3D] bg-[#0A1114] px-4 py-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-[#E4EEF5]">{point.date}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">Equity</span>
          <span className="text-[10px] font-semibold text-[#3AB3FF]">
            {formatCurrency(point.equity)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">Balance</span>
          <span className="text-[10px] font-medium text-[#E4EEF5]">
            {formatCurrency(point.balance)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">Drawdown</span>
          <span className="text-[10px] font-medium text-[#ED5363]">
            {point.drawdown_pct.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">Day P&L</span>
          <span
            className="text-[10px] font-semibold"
            style={{ color: point.pnl >= 0 ? '#1BBF99' : '#ED5363' }}
          >
            {point.pnl >= 0 ? '+' : ''}
            {formatCurrency(point.pnl)}
          </span>
        </div>
      </div>
    </div>
  );
};

const EquityCurveChart: React.FC<EquityCurveChartProps> = ({ enrollmentId }) => {
  const [period, setPeriod] = useState<Period>('30d');
  const apiPeriod = period === 'All' ? 'all' : period;
  const { data, isLoading, isError } = useEquityCurve(enrollmentId, apiPeriod);
  const points: EquityCurvePoint[] = data ?? [];

  const chartData = useMemo(() => {
    return points.map((p) => ({
      ...p,
      drawdown_pct: Math.abs(p.drawdown_pct),
    }));
  }, [points]);

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1E2D3D]/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-[#3AB3FF]" />
          <h3 className="text-sm font-semibold text-[#E4EEF5]">Equity Curve</h3>
        </div>
        {/* Period selector */}
        <div className="flex items-center rounded-lg border border-[#1E2D3D] bg-[#080808] p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-[#3AB3FF]/15 text-[#3AB3FF] border border-[#3AB3FF]/25'
                  : 'text-[#85A8C3] hover:text-[#E4EEF5] border border-transparent'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart body */}
      <div className="p-5">
        {isLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-xs text-[#ED5363]">Failed to load equity curve data.</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-xs text-[#85A8C3]/50">No equity curve data available yet.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3AB3FF" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3AB3FF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1E2D3D"
                  strokeOpacity={0.3}
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#85A8C3' }}
                  axisLine={{ stroke: '#1E2D3D', strokeOpacity: 0.4 }}
                  tickLine={false}
                  tickFormatter={formatDateLabel}
                  interval="preserveStartEnd"
                />

                <YAxis
                  yAxisId="equity"
                  tick={{ fontSize: 10, fill: '#85A8C3' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    formatCurrency(v, undefined, { maximumFractionDigits: 0 })
                  }
                  width={70}
                />

                <YAxis
                  yAxisId="drawdown"
                  orientation="right"
                  tick={{ fontSize: 10, fill: '#ED5363' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                  width={50}
                  reversed
                />

                <Tooltip content={<CustomTooltip />} />

                <ReferenceLine
                  yAxisId="equity"
                  y={chartData[0]?.balance ?? 0}
                  stroke="#85A8C3"
                  strokeDasharray="3 3"
                  strokeOpacity={0.2}
                />

                {/* Equity area */}
                <Area
                  yAxisId="equity"
                  type="monotone"
                  dataKey="equity"
                  stroke="#3AB3FF"
                  strokeWidth={2}
                  fill="url(#equityGradient)"
                  dot={false}
                  isAnimationActive={false}
                />

                {/* Drawdown line on secondary axis */}
                <Line
                  yAxisId="drawdown"
                  type="monotone"
                  dataKey="drawdown_pct"
                  stroke="#ED5363"
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-center gap-6 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded bg-[#3AB3FF]" />
                <span className="text-[#85A8C3]/60">Equity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded bg-[#ED5363]/70" />
                <span className="text-[#85A8C3]/60">Drawdown %</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EquityCurveChart;
