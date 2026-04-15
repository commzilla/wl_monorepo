import React from 'react';
import { StatsCard } from './StatsCard';

interface MetricsGridProps {
  className?: string;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ className = "" }) => {
  const metricsData = [
    [
      { label: "Balance", value: "$50000.00", icon: "https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/d27e6a6a65166d33f605ea55660ef2cc1069b755?placeholderIfAbsent=true" },
      { label: "Avg. Winning Trade", value: "$70.00", icon: "https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/38d3be6b150e6a74db3aac01514dbd8399e546c8?placeholderIfAbsent=true" },
      { label: "Avg. Losing Trade", value: "-$20.00", icon: "https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/d04d2fd6ca2f0c75b215a0126804a879e1e407cb?placeholderIfAbsent=true" },
      { label: "Win Rate", value: "65%", icon: "https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/9f24d8042b23bdb0acce8b2af30b74b32f4a214d?placeholderIfAbsent=true" },
    ],
    [
      { label: "Todays's profit", value: "$8500.00", icon: "https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/8d59b1f593e3071f1a9ecb234960fe650a4d9e21?placeholderIfAbsent=true" },
      { label: "Equity", value: "$70.00", icon: "https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/94df167428baf3c00c45b1d1f2f2d0953c22224a?placeholderIfAbsent=true" },
      { label: "Trades", value: "4", icon: "https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/938279ce86bc9d429b463b77f244705efb5c254c?placeholderIfAbsent=true" },
      { label: "Profit / Loss", value: "$50000.00", icon: "https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/e0827f33393fca9b6473a822755c3edefb083745?placeholderIfAbsent=true" },
    ],
  ];

  return (
    <div className={className}>
      {metricsData.map((row, rowIndex) => (
        <div key={rowIndex} className="flex w-full gap-4 flex-wrap mt-4 first:mt-0 max-md:max-w-full">
          {row.map((metric, index) => (
            <StatsCard
              key={index}
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
