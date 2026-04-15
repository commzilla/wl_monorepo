import React from 'react';

interface StatsCardProps {
  label: string;
  value: string;
  icon: string;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  icon,
  className = ""
}) => {
  return (
    <div className={`items-center border border-[color:var(--border-Cards-border-gradient,#28BFFF)] flex min-w-60 gap-4 overflow-hidden flex-1 shrink basis-[0%] px-6 py-5 rounded-lg border-solid max-md:px-5 ${className}`}>
      <div className="items-center border border-[color:var(--border-Cards-border-gradient,#28BFFF)] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch flex gap-[13px] w-12 h-12 bg-[rgba(40,191,255,0.05)] my-auto p-[11px] rounded-lg border-solid">
        <img
          src={icon}
          className="aspect-[1] object-contain w-[26px] self-stretch my-auto"
          alt={label}
        />
      </div>
      <div className="self-stretch flex min-w-60 flex-col items-stretch justify-center flex-1 shrink basis-[22px] my-auto">
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
