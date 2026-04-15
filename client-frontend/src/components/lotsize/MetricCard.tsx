import React from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  className = ''
}) => {
  return (
    <div className={`items-center border border-[color:var(--border-Cards-border-gradient,#28BFFF)] self-stretch flex min-w-60 gap-4 overflow-hidden flex-1 shrink basis-[0%] my-auto px-6 py-5 rounded-lg border-solid max-md:px-5 ${className}`}>
      <div className="self-stretch flex min-w-60 w-full flex-col items-stretch justify-center flex-1 shrink basis-[0%] my-auto">
        <div className="text-[#85A8C3] text-ellipsis text-sm font-normal tracking-[-0.42px]">
          {label}
        </div>
        <div className="text-[#E4EEF5] text-2xl font-medium tracking-[-0.72px] mt-2">
          {value}
        </div>
      </div>
    </div>
  );
};
