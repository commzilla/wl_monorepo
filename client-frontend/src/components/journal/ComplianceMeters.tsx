import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface ComplianceMetersProps {
  dailyLossUsedPct: number;
  totalLossUsedPct: number;
  profitTargetProgressPct: number;
}

interface GaugeConfig {
  label: string;
  value: number;
  getColor: (pct: number) => string;
  format: (pct: number) => string;
}

const getLossColor = (pct: number): string => {
  if (pct > 80) return '#ED5363';
  if (pct >= 50) return '#F5A623';
  return '#1BBF99';
};

const getProgressColor = (pct: number): string => {
  if (pct >= 80) return '#1BBF99';
  if (pct >= 40) return '#3AB3FF';
  return '#3AB3FF';
};

const ComplianceMeters: React.FC<ComplianceMetersProps> = ({
  dailyLossUsedPct,
  totalLossUsedPct,
  profitTargetProgressPct,
}) => {
  const gauges: GaugeConfig[] = [
    {
      label: 'Daily Loss Used',
      value: dailyLossUsedPct,
      getColor: getLossColor,
      format: (pct) => `${pct.toFixed(1)}%`,
    },
    {
      label: 'Total Loss Used',
      value: totalLossUsedPct,
      getColor: getLossColor,
      format: (pct) => `${pct.toFixed(1)}%`,
    },
    {
      label: 'Profit Target',
      value: profitTargetProgressPct,
      getColor: getProgressColor,
      format: (pct) => `${pct.toFixed(1)}%`,
    },
  ];

  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#1E2D3D]/60 px-5 py-4">
        <ShieldCheck className="h-4 w-4 text-[#3AB3FF]" />
        <h3 className="text-sm font-semibold text-[#E4EEF5]">Compliance</h3>
      </div>

      {/* Gauges */}
      <div className="space-y-5 p-5">
        {gauges.map((gauge) => {
          const color = gauge.getColor(gauge.value);
          const barWidth = Math.min(Math.max(gauge.value, 0), 100);

          return (
            <div key={gauge.label}>
              {/* Label row */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[#E4EEF5]">
                  {gauge.label}
                </span>
                <span className="text-sm font-bold" style={{ color }}>
                  {gauge.format(gauge.value)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1E2D3D]/40">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: color,
                    opacity: 0.8,
                  }}
                />
              </div>

              {/* Threshold markers for loss gauges */}
              {gauge.label !== 'Profit Target' && (
                <div className="relative mt-1 flex justify-between text-[9px] text-[#85A8C3]/40">
                  <span>0%</span>
                  <span>50%</span>
                  <span>80%</span>
                  <span>100%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComplianceMeters;
