import React, { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Crosshair } from 'lucide-react';
import { useMFEMAE } from '@/hooks/useJournal';
import { formatCurrency } from '@/utils/currencyFormatter';

interface MFEMAEScatterPlotProps {
  enrollmentId: string;
}

type ViewMode = 'mfe' | 'mae' | 'both';

interface TradePoint {
  order: number;
  symbol: string;
  profit: number;
  mfe: number;
  mae: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as TradePoint;
  const isProfit = d.profit >= 0;

  return (
    <div className="rounded-lg border border-[#1E2D3D] bg-[#0A1114] px-4 py-3 shadow-xl">
      <p className="mb-2 text-xs font-semibold text-[#E4EEF5]">
        {d.symbol} #{d.order}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">P&L</span>
          <span
            className="text-[10px] font-semibold"
            style={{ color: isProfit ? '#1BBF99' : '#ED5363' }}
          >
            {isProfit ? '+' : ''}
            {formatCurrency(d.profit)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">MFE</span>
          <span className="text-[10px] font-medium text-[#1BBF99]">
            +{formatCurrency(d.mfe)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[10px] text-[#85A8C3]">MAE</span>
          <span className="text-[10px] font-medium text-[#ED5363]">
            -{formatCurrency(d.mae)}
          </span>
        </div>
      </div>
    </div>
  );
};

const MFEMAEScatterPlot: React.FC<MFEMAEScatterPlotProps> = ({ enrollmentId }) => {
  const { data, isLoading, isError } = useMFEMAE(enrollmentId);
  const [viewMode, setViewMode] = useState<ViewMode>('mfe');

  const trades = useMemo<TradePoint[]>(() => {
    if (!Array.isArray(data)) return [];
    return data.map((t: any) => ({
      order: t.order ?? 0,
      symbol: t.symbol ?? '',
      profit: t.profit ?? 0,
      mfe: t.mfe ?? 0,
      mae: Math.abs(t.mae ?? 0),
    }));
  }, [data]);

  const mfeData = useMemo(
    () => trades.map((t) => ({ ...t, x: t.mfe, y: t.profit })),
    [trades]
  );

  const maeData = useMemo(
    () => trades.map((t) => ({ ...t, x: t.mae, y: t.profit })),
    [trades]
  );

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E2D3D]/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-[#F59E0B]" />
          <h3 className="text-sm font-semibold text-[#E4EEF5]">MFE / MAE Analysis</h3>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-[#1E2D3D]">
          {(['mfe', 'mae', 'both'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-[10px] font-medium uppercase transition-colors ${
                viewMode === mode
                  ? 'bg-[#3AB3FF]/10 text-[#E4EEF5]'
                  : 'text-[#85A8C3]/60 hover:text-[#85A8C3]'
              }`}
            >
              {mode === 'both' ? 'Both' : mode.toUpperCase()}
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
            <p className="text-xs text-[#ED5363]">Failed to load MFE/MAE data.</p>
          </div>
        ) : trades.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-xs text-[#85A8C3]/50">Not enough trade data for MFE/MAE analysis.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1E2D3D"
                  strokeOpacity={0.3}
                />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={viewMode === 'mae' ? 'MAE' : 'MFE'}
                  tick={{ fontSize: 10, fill: '#85A8C3' }}
                  axisLine={{ stroke: '#1E2D3D', strokeOpacity: 0.4 }}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v, undefined, { maximumFractionDigits: 0 })}
                  label={{
                    value: viewMode === 'mae' ? 'MAE ($)' : viewMode === 'both' ? 'MFE ($)' : 'MFE ($)',
                    position: 'insideBottomRight',
                    offset: -5,
                    style: { fontSize: 10, fill: '#85A8C3' },
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="P&L"
                  tick={{ fontSize: 10, fill: '#85A8C3' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v, undefined, { maximumFractionDigits: 0 })}
                  width={60}
                  label={{
                    value: 'P&L ($)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 10, fill: '#85A8C3' },
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#85A8C3" strokeOpacity={0.3} />

                {(viewMode === 'mfe' || viewMode === 'both') && (
                  <Scatter
                    name="MFE"
                    data={mfeData}
                    fill="#1BBF99"
                    fillOpacity={0.6}
                    r={4}
                  />
                )}
                {(viewMode === 'mae' || viewMode === 'both') && (
                  <Scatter
                    name="MAE"
                    data={maeData}
                    fill="#ED5363"
                    fillOpacity={0.6}
                    r={4}
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>

            <div className="mt-3 flex items-center justify-center gap-6 text-[10px] text-[#85A8C3]/60">
              {(viewMode === 'mfe' || viewMode === 'both') && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#1BBF99]" />
                  MFE (Max Favorable)
                </div>
              )}
              {(viewMode === 'mae' || viewMode === 'both') && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#ED5363]" />
                  MAE (Max Adverse)
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MFEMAEScatterPlot;
