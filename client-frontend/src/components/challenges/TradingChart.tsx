
import React, { useState, useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Area,
  CartesianGrid,
  Tooltip,
  ComposedChart,
} from 'recharts';
import DateRangePicker from '../shared/DateRangePicker';
import { formatCurrency } from '@/utils/currencyFormatter';

export interface TradingChartData {
  date: string;
  balance: number;
  equity: number;
  profitTarget: number;
  dailyLoss: number;
  maxDrawdown: number;
}

interface TradingChartProps {
  className?: string;
  data?: TradingChartData[];
  isLoading?: boolean;
  onDateRangeChange?: (start: Date | null, end: Date | null) => void;
  startDate?: Date | null;
  endDate?: Date | null;
  currency?: string;
}

const chartConfig = {
  balance: {
    label: "Balance",
    color: "#E4EEF5",
  },
  equity: {
    label: "Equity", 
    color: "#50D5FF",
  },
  profitTarget: {
    label: "Profit Target",
    color: "#1BBF99",
  },
  dailyLoss: {
    label: "Daily Loss Limit",
    color: "#7570FF",
  },
  maxDrawdown: {
    label: "Total Loss Limit",
    color: "#ED5363",
  },
};

export const TradingChart: React.FC<TradingChartProps> = React.memo(({ 
  className = "",
  data = [],
  isLoading = false,
  onDateRangeChange,
  startDate,
  endDate,
  currency = 'USD'
}) => {
  const [activeLines, setActiveLines] = useState({
    balance: true,  // Show balance line by default
    equity: true,   // Keep equity line active
    profitTarget: true,  // Show profit target line by default
    dailyLoss: true,     // Show daily loss limit by default
    maxDrawdown: true,  // Show total loss limit by default
  });

  const handleDateRangeSelect = (start: Date | null, end: Date | null) => {
    onDateRangeChange?.(start, end);
  };

  const toggleLine = (lineKey: string) => {
    setActiveLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey as keyof typeof prev]
    }));
  };

  // Calculate clean Y-axis ticks with round numbers
  const { yAxisTicks, yAxisDomain } = useMemo(() => {
    if (!data.length) return { yAxisTicks: undefined, yAxisDomain: ['auto', 'auto'] as [string | number, string | number] };

    const visibleData: number[] = [];
    data.forEach(item => {
      if (activeLines.balance) visibleData.push(item.balance);
      if (activeLines.equity) visibleData.push(item.equity);
      if (activeLines.profitTarget) visibleData.push(item.profitTarget);
      if (activeLines.dailyLoss) visibleData.push(item.dailyLoss);
      if (activeLines.maxDrawdown) visibleData.push(item.maxDrawdown);
    });

    if (visibleData.length === 0) return { yAxisTicks: undefined, yAxisDomain: ['auto', 'auto'] as [string | number, string | number] };

    const min = Math.min(...visibleData);
    const max = Math.max(...visibleData);
    const range = max - min;

    // Pick a nice step size based on the range
    const niceSteps = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
    // Target ~4-7 ticks
    let step = niceSteps[0];
    for (const s of niceSteps) {
      if (range / s <= 8) {
        step = s;
        break;
      }
    }

    // Floor min and ceil max to step boundaries, with padding
    const domainMin = Math.max(0, Math.floor(min / step) * step - step);
    const domainMax = Math.ceil(max / step) * step + step;

    // Generate tick values
    const ticks: number[] = [];
    for (let v = domainMin; v <= domainMax; v += step) {
      ticks.push(v);
    }

    return {
      yAxisTicks: ticks,
      yAxisDomain: [domainMin, domainMax] as [number, number],
    };
  }, [data, activeLines]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[rgba(21,56,71,0.95)] border border-[#28BFFF]/20 rounded-lg p-3 shadow-lg backdrop-blur-sm">
          <p className="text-[#E4EEF5] font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[#85A8C3]">{entry.name}:</span>
              <span className="text-[#E4EEF5] font-medium">
                {formatCurrency(entry.value, currency)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`justify-center items-stretch border border-[rgba(40,191,255,0.08)] flex w-full flex-col overflow-hidden p-4 md:p-6 rounded-xl border-solid bg-[rgba(40,191,255,0.02)] shadow-[0_0_30px_-10px_rgba(40,191,255,0.1),inset_0_1px_0_0_rgba(40,191,255,0.06)] ${className}`}>
      <div className="w-full flex-1">
        <div className="flex w-full items-stretch gap-4 md:gap-8 flex-1 h-full">
          <div className="w-full flex-1">
            {/* Header: Title, filters, date range */}
            <div className="flex w-full items-start md:items-center justify-between gap-3 md:gap-6 flex-wrap">
              <div className="text-[#E4EEF5] text-base md:text-lg tracking-[-0.54px]">
                Trading Results
              </div>
              
              {/* Filters - horizontally scrollable on mobile */}
              <div className="flex items-center gap-2 text-xs text-center tracking-[-0.36px] rounded-lg max-w-full overflow-x-auto md:overflow-visible whitespace-nowrap py-1">
                {Object.entries(chartConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => toggleLine(key)}
                    className={`min-h-[28px] md:min-h-[31px] gap-1 whitespace-nowrap px-3 md:pl-3 md:pr-4 py-1.5 md:py-2 rounded-[100px] border-solid transition-all ${
                      activeLines[key as keyof typeof activeLines]
                        ? 'text-[#E4EEF5] border border-[#09F] shadow-[0px_0px_40px_0px_rgba(79,214,255,0.20)_inset] bg-[rgba(8,8,8,0.01)]'
                        : 'text-[#85A8C3] border border-[#28BFFF] font-normal bg-[rgba(40,191,255,0.05)]'
                    }`}
                    title={config.label}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
              
              {/* Date range picker */}
              <div className="w-full md:w-auto">
                <DateRangePicker
                  defaultStartDate={startDate}
                  defaultEndDate={endDate}
                  onRangeSelect={handleDateRangeSelect}
                />
              </div>
            </div>
            
            {/* Chart */}
            <div className="w-full flex-1 mt-4 md:mt-8">
              {isLoading ? (
                <div className="flex items-center justify-center h-[360px] md:h-[480px]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#50D5FF]"></div>
                    <div className="text-[#85A8C3]">Loading chart data...</div>
                  </div>
                </div>
              ) : data.length === 0 ? (
                <div className="flex items-center justify-center h-[360px] md:h-[480px]">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-[#28BFFF]/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#85A8C3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="text-[#85A8C3] text-center">No trading data available for the selected period</div>
                  </div>
                </div>
              ) : (
                <div className="h-[360px] md:h-[480px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 16, right: 20, left: 12, bottom: 12 }}>
                      <defs>
                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#50D5FF" stopOpacity={0.35} />
                          <stop offset="40%" stopColor="#50D5FF" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#50D5FF" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="chartBgGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#28BFFF" stopOpacity={0.03} />
                          <stop offset="100%" stopColor="#0A1A24" stopOpacity={0} />
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                        <filter id="glowSoft">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="2 6"
                        stroke="rgba(29,38,45,0.8)"
                        vertical={true}
                      />

                      <XAxis
                        dataKey="date"
                        axisLine={{ stroke: "rgba(133,168,195,0.2)" }}
                        tickLine={{ stroke: "rgba(133,168,195,0.15)", size: 4 }}
                        tick={{ fill: "#85A8C3", fontSize: 11 }}
                      />

                      <YAxis
                        domain={yAxisDomain}
                        ticks={yAxisTicks}
                        axisLine={{ stroke: "rgba(133,168,195,0.2)" }}
                        tickLine={{ stroke: "rgba(133,168,195,0.15)", size: 4 }}
                        tick={{ fill: "#85A8C3", fontSize: 11 }}
                        tickFormatter={(value) => formatCurrency(value, currency, { maximumFractionDigits: 0 })}
                      />

                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: 'rgba(80,213,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />

                      {activeLines.equity && (
                        <Area
                          type="monotone"
                          dataKey="equity"
                          stroke={chartConfig.equity.color}
                          strokeWidth={2}
                          fill="url(#equityGradient)"
                          name={chartConfig.equity.label}
                          animationDuration={1000}
                          animationEasing="ease-out"
                        />
                      )}

                      {activeLines.balance && (
                        <Line
                          type="monotone"
                          dataKey="balance"
                          stroke={chartConfig.balance.color}
                          strokeWidth={3}
                          dot={false}
                          name={chartConfig.balance.label}
                          animationDuration={1200}
                          animationEasing="ease-out"
                          connectNulls={false}
                          filter="url(#glow)"
                        />
                      )}

                      {activeLines.profitTarget && (
                        <Line
                          type="monotone"
                          dataKey="profitTarget"
                          stroke={chartConfig.profitTarget.color}
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray="8 4"
                          name={chartConfig.profitTarget.label}
                          animationDuration={800}
                          animationEasing="ease-out"
                        />
                      )}

                      {activeLines.dailyLoss && (
                        <Line
                          type="monotone"
                          dataKey="dailyLoss"
                          stroke={chartConfig.dailyLoss.color}
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray="6 3"
                          name={chartConfig.dailyLoss.label}
                          animationDuration={800}
                          animationEasing="ease-out"
                        />
                      )}

                      {activeLines.maxDrawdown && (
                        <Line
                          type="monotone"
                          dataKey="maxDrawdown"
                          stroke={chartConfig.maxDrawdown.color}
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray="4 6"
                          name={chartConfig.maxDrawdown.label}
                          animationDuration={800}
                          animationEasing="ease-out"
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
