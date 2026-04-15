import React from 'react';

interface MetricsCardProps {
  icon: string;
  label: string;
  value: string;
  iconClass?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ 
  icon, 
  label, 
  value, 
  iconClass = "w-6 h-6" 
}) => {
  return (
    <div className="flex items-center gap-3 md:gap-4 p-4 md:p-6 rounded-lg border border-[#28BFFF]/20 bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] backdrop-blur-sm">
      <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg border border-[#28BFFF]/40 bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)] flex-shrink-0">
        <img
          src={icon}
          className={`${iconClass} w-5 h-5 md:w-6 md:h-6`}
          alt={label}
        />
      </div>
      <div className="flex flex-col gap-1 md:gap-2 flex-1 min-w-0">
        <div className="text-xs md:text-sm text-[#85A8C3] font-normal tracking-[-0.36px] md:tracking-[-0.42px] leading-normal">
          {label}
        </div>
        <div className={`text-lg md:text-2xl font-medium tracking-[-0.54px] md:tracking-[-0.72px] leading-normal truncate ${
          value === '--' ? 'text-[#85A8C3] opacity-60' : 'text-[#E4EEF5]'
        }`}>
          {value === '--' ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#85A8C3] opacity-40 animate-pulse"></span>
              No data
            </span>
          ) : value}
        </div>
      </div>
    </div>
  );
};
