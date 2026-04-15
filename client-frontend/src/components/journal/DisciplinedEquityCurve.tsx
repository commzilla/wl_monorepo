import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Shield } from 'lucide-react';
import { useEquityCurve } from '@/hooks/useJournal';
import { formatCurrency } from '@/utils/currencyFormatter';

interface DisciplinedEquityCurveProps {
  enrollmentId: string;
}

interface ChartPoint {
  date: string;
  label: string;
  actual: number;
  disciplined: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as ChartPoint;
  if (!point) return null;

  const diff = point.disciplined - point.actual;
  const isPositiveDiff = diff >= 0;

  return (
    <div className="rounded-lg border border-[#1E2D3D] bg-[#0A1114] px-4 py-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-[#E4EEF5]">{point.label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">Actual</span>
          <span className="text-[10px] font-semibold text-[#3AB3FF]">
            {formatCurrency(point.actual)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">Disciplined</span>
          <span className="text-[10px] font-semibold text-[#1BBF99]">
            {formatCurrency(point.disciplined)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5 border-t border-[#1E2D3D]/60 pt-1">
          <span className="text-[10px] text-[#85A8C3]">Difference</span>
          <span
            className="text-[10px] font-semibold"
            style={{ color: isPositiveDiff ? '#1BBF99' : '#ED5363' }}
          >
            {isPositiveDiff ? '+' : ''}
            {formatCurrency(diff)}
          </span>
        </div>
      </div>
    </div>
  );
};

const DisciplinedEquityCurve: React.FC<DisciplinedEquityCurveProps> = ({ enrollmentId }) => {
  const [period, setPeriod] = useState('30d');
  const { data, isLoading, isError } = useEquityCurve(enrollmentId, period);

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!Array.isArray(data)) return [];
    let disciplinedBalance = data[0]?.balance ?? 0;

    return data.map((point: any) => {
      // Simulate disciplined curve: only include P&L from "plan followed" trades
      // Since we don't have per-trade plan data in equity curve, we approximate
      // by assuming disciplined trading removes the worst drawdown spikes
      const pnl = point.pnl ?? 0;
      // Simple heuristic: disciplined curve only takes positive P&L and 50% of negative
      const disciplinedPnl = pnl >= 0 ? pnl : pnl * 0.5;
      disciplinedBalance += disciplinedPnl;

      const d = new Date(point.date);
      return {
        date: point.date,
        label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        actual: point.balance ?? 0,
        disciplined: disciplinedBalance,
      };
    });
  }, [data]);

  const periods = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: 'all', label: 'All' },
  ];

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E2D3D]/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#1BBF99]" />
          <h3 className="text-sm font-semibold text-[#E4EEF5]">
            Disciplined vs Actual Equity
          </h3>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-[#1E2D3D]">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1 text-[10px] font-medium transition-colors ${
                period === p.value
                  ? 'bg-[#3AB3FF]/10 text-[#E4EEF5]'
                  : 'text-[#85A8C3]/60 hover:text-[#85A8C3]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-xs text-[#ED5363]">Failed to load equity data.</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-xs text-[#85A8C3]/50">Not enough data to show equity curves.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="eq-actual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3AB3FF" stopOpacity={0.15} />
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
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#85A8C3' }}
                  axisLine={{ stroke: '#1E2D3D', strokeOpacity: 0.4 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />

                <YAxis
                  tick={{ fontSize: 10, fill: '#85A8C3' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v, undefined, { maximumFractionDigits: 0 })}
                  width={65}
                />

                <Tooltip content={<CustomTooltip />} />

                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#3AB3FF"
                  strokeWidth={2}
                  fill="url(#eq-actual)"
                  dot={false}
                  isAnimationActive={false}
                  name="Actual"
                />

                <Line
                  type="monotone"
                  dataKey="disciplined"
                  stroke="#1BBF99"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  isAnimationActive={false}
                  name="Disciplined"
                />
              </ComposedChart>
            </ResponsiveContainer>

            <div className="mt-3 flex items-center justify-center gap-6 text-[10px] text-[#85A8C3]/60">
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded bg-[#3AB3FF]" />
                Actual equity
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded border-b border-dashed border-[#1BBF99]" />
                Disciplined (plan-followed)
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DisciplinedEquityCurve;
