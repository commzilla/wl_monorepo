import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { LineChart, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { useMonteCarlo } from '@/hooks/useJournal';
import { MonteCarloResult } from '@/utils/journalApi';
import { formatCurrency } from '@/utils/currencyFormatter';

interface MonteCarloChartProps {
  enrollmentId: string;
}

interface ChartPoint {
  trade: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as ChartPoint;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-[#1E2D3D] bg-[#0A1114] px-4 py-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-[#E4EEF5]">Trade #{point.trade}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">95th pct</span>
          <span className="text-[10px] font-medium text-[#1BBF99]">
            {formatCurrency(point.p95)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">75th pct</span>
          <span className="text-[10px] font-medium text-[#1BBF99]/80">
            {formatCurrency(point.p75)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">Median</span>
          <span className="text-[10px] font-semibold text-[#3AB3FF]">
            {formatCurrency(point.p50)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">25th pct</span>
          <span className="text-[10px] font-medium text-[#F59E0B]/80">
            {formatCurrency(point.p25)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">5th pct</span>
          <span className="text-[10px] font-medium text-[#ED5363]">
            {formatCurrency(point.p5)}
          </span>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: string;
}> = ({ icon, label, value, subtext, color }) => (
  <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] p-4">
    <div className="mb-2 flex items-center gap-2">
      {icon}
      <span className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">{label}</span>
    </div>
    <p className="text-xl font-bold" style={{ color }}>
      {value}
    </p>
    {subtext && <p className="mt-0.5 text-[10px] text-[#85A8C3]/50">{subtext}</p>}
  </div>
);

const MonteCarloChart: React.FC<MonteCarloChartProps> = ({ enrollmentId }) => {
  const { data, isLoading, isError } = useMonteCarlo(enrollmentId);

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data?.percentile_curves) return [];

    const p5 = data.percentile_curves['5'] ?? data.percentile_curves['p5'] ?? [];
    const p25 = data.percentile_curves['25'] ?? data.percentile_curves['p25'] ?? [];
    const p50 = data.percentile_curves['50'] ?? data.percentile_curves['p50'] ?? [];
    const p75 = data.percentile_curves['75'] ?? data.percentile_curves['p75'] ?? [];
    const p95 = data.percentile_curves['95'] ?? data.percentile_curves['p95'] ?? [];

    const length = Math.max(p5.length, p25.length, p50.length, p75.length, p95.length);
    if (length === 0) return [];

    const points: ChartPoint[] = [];
    // Sample at most 100 points for performance
    const step = Math.max(1, Math.floor(length / 100));

    for (let i = 0; i < length; i += step) {
      points.push({
        trade: i + 1,
        p5: p5[i] ?? 0,
        p25: p25[i] ?? 0,
        p50: p50[i] ?? 0,
        p75: p75[i] ?? 0,
        p95: p95[i] ?? 0,
      });
    }

    // Always include last point
    if (length > 0 && points[points.length - 1]?.trade !== length) {
      points.push({
        trade: length,
        p5: p5[length - 1] ?? 0,
        p25: p25[length - 1] ?? 0,
        p50: p50[length - 1] ?? 0,
        p75: p75[length - 1] ?? 0,
        p95: p95[length - 1] ?? 0,
      });
    }

    return points;
  }, [data]);

  const profitTarget = data?.profit_target ?? 0;

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
      <div className="flex items-center gap-2 border-b border-[#1E2D3D]/60 px-5 py-4">
        <LineChart className="h-4 w-4 text-[#7570FF]" />
        <h3 className="text-sm font-semibold text-[#E4EEF5]">Monte Carlo Simulation</h3>
        {data && (
          <span className="ml-auto text-[10px] text-[#85A8C3]/50">
            {data.simulations.toLocaleString()} simulations
            {' / '}
            {data.trade_count} trades
          </span>
        )}
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
          </div>
        ) : isError || chartData.length === 0 ? (
          <div className="flex h-72 items-center justify-center">
            <p className="text-xs text-[#85A8C3]/50">
              You need at least 10 closed trades to generate the Monte Carlo Analysis.
            </p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="mc-p5-p95" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1BBF99" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#ED5363" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="mc-p25-p75" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1BBF99" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3AB3FF" stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1E2D3D"
                  strokeOpacity={0.3}
                  vertical={false}
                />

                <XAxis
                  dataKey="trade"
                  tick={{ fontSize: 10, fill: '#85A8C3' }}
                  axisLine={{ stroke: '#1E2D3D', strokeOpacity: 0.4 }}
                  tickLine={false}
                  label={{
                    value: 'Trade #',
                    position: 'insideBottomRight',
                    offset: -5,
                    style: { fontSize: 10, fill: '#85A8C3' },
                  }}
                />

                <YAxis
                  tick={{ fontSize: 10, fill: '#85A8C3' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v, undefined, { maximumFractionDigits: 0 })}
                  width={70}
                />

                <Tooltip content={<CustomTooltip />} />

                {/* Profit target reference line */}
                {profitTarget > 0 && (
                  <ReferenceLine
                    y={profitTarget}
                    stroke="#F59E0B"
                    strokeDasharray="6 4"
                    strokeOpacity={0.6}
                    label={{
                      value: `Target: ${formatCurrency(profitTarget, undefined, { maximumFractionDigits: 0 })}`,
                      position: 'right',
                      style: { fontSize: 10, fill: '#F59E0B' },
                    }}
                  />
                )}

                {/* Starting balance reference line */}
                {data && (
                  <ReferenceLine
                    y={data.starting_balance}
                    stroke="#85A8C3"
                    strokeDasharray="3 3"
                    strokeOpacity={0.3}
                  />
                )}

                {/* 5th-95th percentile band (outer cone) */}
                <Area
                  type="monotone"
                  dataKey="p95"
                  stroke="none"
                  fill="url(#mc-p5-p95)"
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="p5"
                  stroke="none"
                  fill="#0A1114"
                  fillOpacity={1}
                  isAnimationActive={false}
                />

                {/* 25th-75th percentile band (inner cone) */}
                <Area
                  type="monotone"
                  dataKey="p75"
                  stroke="none"
                  fill="url(#mc-p25-p75)"
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="p25"
                  stroke="none"
                  fill="#0A1114"
                  fillOpacity={1}
                  isAnimationActive={false}
                />

                {/* Percentile lines */}
                <Area
                  type="monotone"
                  dataKey="p95"
                  stroke="#1BBF99"
                  strokeOpacity={0.3}
                  strokeWidth={1}
                  fill="none"
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="p75"
                  stroke="#1BBF99"
                  strokeOpacity={0.5}
                  strokeWidth={1}
                  fill="none"
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="p50"
                  stroke="#3AB3FF"
                  strokeWidth={2}
                  fill="none"
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="p25"
                  stroke="#F59E0B"
                  strokeOpacity={0.5}
                  strokeWidth={1}
                  fill="none"
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="p5"
                  stroke="#ED5363"
                  strokeOpacity={0.3}
                  strokeWidth={1}
                  fill="none"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="mb-5 mt-3 flex flex-wrap items-center justify-center gap-4 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded bg-[#1BBF99]/30" />
                <span className="text-[#85A8C3]/60">95th pct</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded bg-[#1BBF99]/50" />
                <span className="text-[#85A8C3]/60">75th pct</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded bg-[#3AB3FF]" />
                <span className="text-[#85A8C3]/60">Median</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded bg-[#F59E0B]/50" />
                <span className="text-[#85A8C3]/60">25th pct</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded bg-[#ED5363]/30" />
                <span className="text-[#85A8C3]/60">5th pct</span>
              </div>
              {profitTarget > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="h-0.5 w-4 rounded border-b border-dashed border-[#F59E0B]/60" />
                  <span className="text-[#85A8C3]/60">Target</span>
                </div>
              )}
            </div>

            {/* Stats panel */}
            {data && (
              <div className="grid grid-cols-1 gap-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard
                  icon={<Target className="h-3.5 w-3.5 text-[#1BBF99]" />}
                  label="Prob. of Target"
                  value={`${(data.probability_target * 100).toFixed(1)}%`}
                  subtext={profitTarget > 0 ? `Target: ${formatCurrency(profitTarget, undefined, { maximumFractionDigits: 0 })}` : undefined}
                  color={data.probability_target >= 0.5 ? '#1BBF99' : '#F59E0B'}
                />
                <StatCard
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-[#ED5363]" />}
                  label="Risk of Ruin"
                  value={`${(data.risk_of_ruin * 100).toFixed(1)}%`}
                  subtext="Probability of account blow"
                  color={data.risk_of_ruin <= 0.1 ? '#1BBF99' : '#ED5363'}
                />
                <StatCard
                  icon={<TrendingUp className="h-3.5 w-3.5 text-[#3AB3FF]" />}
                  label="Median Final"
                  value={formatCurrency(data.median_final, undefined, { maximumFractionDigits: 0 })}
                  color="#3AB3FF"
                />
                <StatCard
                  icon={<TrendingUp className="h-3.5 w-3.5 text-[#1BBF99]" />}
                  label="Best Case (95th)"
                  value={formatCurrency(data.p95_final, undefined, { maximumFractionDigits: 0 })}
                  color="#1BBF99"
                />
                <StatCard
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-[#ED5363]" />}
                  label="Worst Case (5th)"
                  value={formatCurrency(data.p5_final, undefined, { maximumFractionDigits: 0 })}
                  color="#ED5363"
                />
              </div>
            )}

            {/* Drawdown stats */}
            {data && (data.avg_max_drawdown > 0 || data.median_max_drawdown > 0) && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
                    Avg Max Drawdown
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#F59E0B]">
                    {formatCurrency(data.avg_max_drawdown, undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
                    Median Max Drawdown
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#F59E0B]">
                    {formatCurrency(data.median_max_drawdown, undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MonteCarloChart;
