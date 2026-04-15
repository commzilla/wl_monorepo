import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { PieChart } from 'lucide-react';
import { useDistribution } from '@/hooks/useJournal';
import { formatCurrency } from '@/utils/currencyFormatter';

interface WinLossDistributionProps {
  enrollmentId: string;
}

interface BinData {
  range: string;
  rangeMin: number;
  rangeMax: number;
  count: number;
  midpoint: number;
}

interface DistributionStats {
  mean: number;
  median: number;
  std_dev: number;
  skewness: number;
  total_trades: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload as BinData;
  const isPositive = data.midpoint >= 0;

  return (
    <div className="rounded-lg border border-[#1E2D3D] bg-[#0A1114] px-4 py-3 shadow-xl">
      <p className="mb-1 text-xs font-medium text-[#E4EEF5]">{data.range}</p>
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[10px] text-[#85A8C3]">Trades</span>
          <span className="text-[10px] font-semibold text-[#E4EEF5]">{data.count}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[10px] text-[#85A8C3]">P&L Range</span>
          <span
            className="text-[10px] font-semibold"
            style={{ color: isPositive ? '#1BBF99' : '#ED5363' }}
          >
            {formatCurrency(data.rangeMin)} to {formatCurrency(data.rangeMax)}
          </span>
        </div>
      </div>
    </div>
  );
};

const SymbolStat: React.FC<{
  label: string;
  value: string;
  color?: string;
}> = ({ label, value, color }) => (
  <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808] px-3 py-2 text-center">
    <p className="text-[10px] uppercase tracking-wider text-[#85A8C3]/60">{label}</p>
    <p className="mt-0.5 text-sm font-bold" style={{ color: color ?? '#E4EEF5' }}>
      {value}
    </p>
  </div>
);

const WinLossDistribution: React.FC<WinLossDistributionProps> = ({ enrollmentId }) => {
  const { data, isLoading, isError } = useDistribution(enrollmentId);

  const { bins, stats } = useMemo(() => {
    if (!data) return { bins: [] as BinData[], stats: null };

    // The API might return bins and stats, or just an array
    const rawBins: any[] = Array.isArray(data) ? data : (data as any).bins ?? [];
    const rawStats: DistributionStats | null = Array.isArray(data) ? null : (data as any).stats ?? null;

    const processedBins: BinData[] = rawBins.map((bin: any) => ({
      range: bin.range ?? bin.label ?? `${formatCurrency(bin.min ?? bin.range_min ?? 0, undefined, { maximumFractionDigits: 0 })} - ${formatCurrency(bin.max ?? bin.range_max ?? 0, undefined, { maximumFractionDigits: 0 })}`,
      rangeMin: bin.min ?? bin.range_min ?? 0,
      rangeMax: bin.max ?? bin.range_max ?? 0,
      count: bin.count ?? 0,
      midpoint: ((bin.min ?? bin.range_min ?? 0) + (bin.max ?? bin.range_max ?? 0)) / 2,
    }));

    return { bins: processedBins, stats: rawStats };
  }, [data]);

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
      <div className="flex items-center gap-2 border-b border-[#1E2D3D]/60 px-5 py-4">
        <PieChart className="h-4 w-4 text-[#28BFFF]" />
        <h3 className="text-sm font-semibold text-[#E4EEF5]">P&L Distribution</h3>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-xs text-[#ED5363]">Failed to load distribution data.</p>
          </div>
        ) : bins.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-xs text-[#85A8C3]/50">No distribution data available yet.</p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bins} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1E2D3D"
                  strokeOpacity={0.4}
                  vertical={false}
                />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 9, fill: '#85A8C3' }}
                  axisLine={{ stroke: '#1E2D3D', strokeOpacity: 0.4 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#85A8C3' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(58, 179, 255, 0.04)' }} />
                <ReferenceLine x={0} stroke="#85A8C3" strokeOpacity={0.3} strokeDasharray="3 3" />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={20}>
                  {bins.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.midpoint >= 0 ? '#1BBF99' : '#ED5363'}
                      fillOpacity={0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Stats */}
            {stats && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SymbolStat
                  label="Mean"
                  value={`${stats.mean >= 0 ? '+' : ''}${formatCurrency(stats.mean)}`}
                  color={stats.mean >= 0 ? '#1BBF99' : '#ED5363'}
                />
                <SymbolStat
                  label="Median"
                  value={`${stats.median >= 0 ? '+' : ''}${formatCurrency(stats.median)}`}
                  color={stats.median >= 0 ? '#1BBF99' : '#ED5363'}
                />
                <SymbolStat
                  label="Std Dev"
                  value={formatCurrency(stats.std_dev)}
                  color="#F59E0B"
                />
                <SymbolStat
                  label="Total Trades"
                  value={String(stats.total_trades)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WinLossDistribution;
