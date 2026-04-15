import React, { useState, useMemo, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { useTimePerformance } from '@/hooks/useJournal';
import { TimeHeatmapCell } from '@/utils/journalApi';
import { formatCurrency } from '@/utils/currencyFormatter';

interface TimeAnalysisHeatmapProps {
  enrollmentId: string;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, '0')
);

interface TooltipData {
  x: number;
  y: number;
  cell: TimeHeatmapCell;
}

function getCellColor(pnl: number, maxAbsPnl: number): string {
  if (maxAbsPnl === 0 || pnl === 0) return 'rgba(30, 45, 61, 0.3)';

  const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1);

  if (pnl > 0) {
    // Green scale: #1BBF99
    const r = Math.round(27 * intensity);
    const g = Math.round(100 + 91 * intensity);
    const b = Math.round(80 + 73 * intensity);
    const a = 0.15 + intensity * 0.65;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  } else {
    // Red scale: #ED5363
    const r = Math.round(120 + 117 * intensity);
    const g = Math.round(40 + 43 * intensity);
    const b = Math.round(50 + 49 * intensity);
    const a = 0.15 + intensity * 0.65;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}

const CELL_SIZE = 28;
const CELL_GAP = 2;
const LABEL_WIDTH = 36;
const LABEL_HEIGHT = 20;

const TimeAnalysisHeatmap: React.FC<TimeAnalysisHeatmapProps> = ({ enrollmentId }) => {
  const { data, isLoading, isError } = useTimePerformance(enrollmentId);
  const cells = data ?? [];

  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const cellMap = useMemo(() => {
    const map = new Map<string, TimeHeatmapCell>();
    cells.forEach((c) => map.set(`${c.weekday}-${c.hour}`, c));
    return map;
  }, [cells]);

  const maxAbsPnl = useMemo(() => {
    if (cells.length === 0) return 0;
    return Math.max(...cells.map((c) => Math.abs(c.pnl)), 1);
  }, [cells]);

  const svgWidth = LABEL_WIDTH + 24 * (CELL_SIZE + CELL_GAP);
  const svgHeight = LABEL_HEIGHT + 7 * (CELL_SIZE + CELL_GAP);

  const handleCellHover = useCallback(
    (e: React.MouseEvent<SVGRectElement>, cell: TimeHeatmapCell) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const parentRect = e.currentTarget.closest('svg')?.getBoundingClientRect();
      if (parentRect) {
        setTooltip({
          x: rect.left - parentRect.left + CELL_SIZE / 2,
          y: rect.top - parentRect.top - 8,
          cell,
        });
      }
    },
    []
  );

  const handleCellLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#1E2D3D]/60 px-5 py-4">
        <Clock className="h-4 w-4 text-[#F59E0B]" />
        <h3 className="text-sm font-semibold text-[#E4EEF5]">Time Performance Heatmap</h3>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-xs text-[#ED5363]">Failed to load time data.</p>
          </div>
        ) : cells.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-xs text-[#85A8C3]/50">No time-based data available yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="relative inline-block">
              <svg
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="block"
              >
                {/* Hour labels (X axis) */}
                {HOUR_LABELS.map((label, hour) => (
                  <text
                    key={`h-${hour}`}
                    x={LABEL_WIDTH + hour * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2}
                    y={LABEL_HEIGHT - 6}
                    textAnchor="middle"
                    className="fill-[#85A8C3]/50"
                    fontSize={9}
                    fontFamily="inherit"
                  >
                    {hour % 2 === 0 ? label : ''}
                  </text>
                ))}

                {/* Day rows */}
                {DAY_LABELS.map((dayLabel, dayIdx) => (
                  <React.Fragment key={`day-${dayIdx}`}>
                    {/* Day label (Y axis) */}
                    <text
                      x={LABEL_WIDTH - 6}
                      y={LABEL_HEIGHT + dayIdx * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2 + 3}
                      textAnchor="end"
                      className="fill-[#85A8C3]/50"
                      fontSize={10}
                      fontFamily="inherit"
                    >
                      {dayLabel}
                    </text>

                    {/* Hour cells */}
                    {Array.from({ length: 24 }, (_, hour) => {
                      const cell = cellMap.get(`${dayIdx}-${hour}`);
                      const pnl = cell?.pnl ?? 0;
                      const color = getCellColor(pnl, maxAbsPnl);

                      return (
                        <rect
                          key={`cell-${dayIdx}-${hour}`}
                          x={LABEL_WIDTH + hour * (CELL_SIZE + CELL_GAP)}
                          y={LABEL_HEIGHT + dayIdx * (CELL_SIZE + CELL_GAP)}
                          width={CELL_SIZE}
                          height={CELL_SIZE}
                          rx={4}
                          fill={color}
                          className="cursor-pointer transition-opacity hover:opacity-80"
                          onMouseEnter={(e) =>
                            handleCellHover(e, cell ?? { hour, weekday: dayIdx, pnl: 0, trades: 0, win_rate: 0 })
                          }
                          onMouseLeave={handleCellLeave}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </svg>

              {/* Tooltip */}
              {tooltip && (
                <div
                  className="pointer-events-none absolute z-10 rounded-lg border border-[#1E2D3D] bg-[#0A1114] px-3 py-2 shadow-xl"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  <p className="mb-1 text-[10px] font-medium text-[#E4EEF5]">
                    {DAY_LABELS[tooltip.cell.weekday]} {HOUR_LABELS[tooltip.cell.hour]}:00
                  </p>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] text-[#85A8C3]">Trades</span>
                      <span className="text-[10px] font-medium text-[#E4EEF5]">{tooltip.cell.trades}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] text-[#85A8C3]">Win Rate</span>
                      <span className="text-[10px] font-medium text-[#E4EEF5]">
                        {tooltip.cell.win_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] text-[#85A8C3]">Avg P&L</span>
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: tooltip.cell.pnl >= 0 ? '#1BBF99' : '#ED5363' }}
                      >
                        {tooltip.cell.pnl >= 0 ? '+' : ''}
                        {formatCurrency(tooltip.cell.pnl)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Color legend */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="text-[10px] text-[#85A8C3]/50">Loss</span>
              <div className="flex items-center gap-0.5">
                {[0.8, 0.6, 0.4, 0.2].map((intensity) => (
                  <div
                    key={`loss-${intensity}`}
                    className="h-3 w-6 rounded-sm"
                    style={{
                      backgroundColor: `rgba(237, 83, 99, ${intensity * 0.7})`,
                    }}
                  />
                ))}
                <div className="h-3 w-6 rounded-sm bg-[#1E2D3D]/30" />
                {[0.2, 0.4, 0.6, 0.8].map((intensity) => (
                  <div
                    key={`win-${intensity}`}
                    className="h-3 w-6 rounded-sm"
                    style={{
                      backgroundColor: `rgba(27, 191, 153, ${intensity * 0.7})`,
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-[#85A8C3]/50">Profit</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeAnalysisHeatmap;
