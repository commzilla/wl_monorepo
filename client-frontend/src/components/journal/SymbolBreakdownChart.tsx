import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useSymbolPerformance } from '@/hooks/useJournal';
import { SymbolPerformance } from '@/utils/journalApi';
import { formatCurrency } from '@/utils/currencyFormatter';

interface SymbolBreakdownChartProps {
  enrollmentId: string;
}

interface ChartDataItem {
  symbol: string;
  pnl: number;
  trades: number;
  winRate: number;
  avgProfit: number;
  volume: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload as ChartDataItem;
  const isPositive = data.pnl >= 0;

  return (
    <div className="rounded-lg border border-[#1E2D3D] bg-[#0A1114] px-4 py-3 shadow-xl">
      <p className="mb-2 text-sm font-semibold text-[#E4EEF5]">{data.symbol}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs text-[#85A8C3]">P&L</span>
          <span
            className="text-xs font-semibold"
            style={{ color: isPositive ? '#1BBF99' : '#ED5363' }}
          >
            {isPositive ? '+' : ''}
            {formatCurrency(data.pnl)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs text-[#85A8C3]">Trades</span>
          <span className="text-xs font-medium text-[#E4EEF5]">{data.trades}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs text-[#85A8C3]">Win Rate</span>
          <span className="text-xs font-medium text-[#E4EEF5]">{data.winRate.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs text-[#85A8C3]">Avg Profit</span>
          <span
            className="text-xs font-medium"
            style={{ color: data.avgProfit >= 0 ? '#1BBF99' : '#ED5363' }}
          >
            {data.avgProfit >= 0 ? '+' : ''}
            {formatCurrency(data.avgProfit)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs text-[#85A8C3]">Volume</span>
          <span className="text-xs font-medium text-[#E4EEF5]">{data.volume.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

const SymbolBreakdownChart: React.FC<SymbolBreakdownChartProps> = ({ enrollmentId }) => {
  const { data, isLoading, isError } = useSymbolPerformance(enrollmentId);
  const symbols = data ?? [];

  const chartData = useMemo<ChartDataItem[]>(() => {
    return [...symbols]
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 15)
      .map((s) => ({
        symbol: s.symbol,
        pnl: s.pnl,
        trades: s.trades,
        winRate: s.win_rate,
        avgProfit: s.avg_profit,
        volume: s.volume,
      }));
  }, [symbols]);

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
      <div className="flex items-center gap-2 border-b border-[#1E2D3D]/60 px-5 py-4">
        <BarChart3 className="h-4 w-4 text-[#3AB3FF]" />
        <h3 className="text-sm font-semibold text-[#E4EEF5]">P&L by Symbol</h3>
        {symbols.length > 0 && (
          <span className="ml-auto text-[10px] text-[#85A8C3]/50">
            {symbols.length} symbol{symbols.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-xs text-[#ED5363]">Failed to load symbol data.</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-xs text-[#85A8C3]/50">No symbol data available yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(chartData.length * 36, 200)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1E2D3D"
                strokeOpacity={0.4}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#85A8C3' }}
                tickFormatter={(v) => formatCurrency(v, undefined, { maximumFractionDigits: 0, showSymbol: true })}
                axisLine={{ stroke: '#1E2D3D', strokeOpacity: 0.4 }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="symbol"
                tick={{ fontSize: 11, fill: '#E4EEF5', fontWeight: 500 }}
                width={80}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(58, 179, 255, 0.04)' }} />
              <Bar dataKey="pnl" radius={[0, 4, 4, 0]} barSize={20}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pnl >= 0 ? '#1BBF99' : '#ED5363'}
                    fillOpacity={0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Inline labels below chart */}
        {chartData.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {chartData.slice(0, 5).map((item) => (
              <div key={item.symbol} className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                <span className="font-medium text-[#E4EEF5]">{item.symbol}</span>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className="text-[#85A8C3]">{item.trades} trades</span>
                  <span className="text-[#85A8C3]">{item.winRate.toFixed(0)}% WR</span>
                  <span
                    className="font-semibold"
                    style={{ color: item.pnl >= 0 ? '#1BBF99' : '#ED5363' }}
                  >
                    {item.pnl >= 0 ? '+' : ''}
                    {formatCurrency(item.pnl)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SymbolBreakdownChart;
