
import React from 'react';

interface ProgressCardProps {
  title: string;
  value: string;
  percentage: number;
  maxValue: string;
  percentageText: string;
  icon: string;
  badge?: {
    text: string;
    color: 'green' | 'red';
  };
  timer?: string;
  className?: string;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  value,
  percentage,
  maxValue,
  percentageText,
  icon,
  badge,
  timer,
  className = ""
}) => {
  const getBadgeStyles = (color: 'green' | 'red') => {
    return color === 'green'
      ? 'text-[#1BBF99] bg-[rgba(27,191,153,0.18)]'
      : 'text-[#ED5363] bg-[rgba(237,83,99,0.20)]';
  };

  return (
    <div className={`border border-[rgba(40,191,255,0.05)] min-w-60 flex-1 shrink basis-[0%] px-5 py-4 rounded-xl border-solid bg-[rgba(40,191,255,0.02)] ${className}`}>
      <div className="flex w-full gap-3 items-start">
        <div className="flex min-w-60 flex-col items-stretch font-medium flex-1 shrink basis-[0%]">
          <div className="text-[#E4EEF5] text-ellipsis text-sm">
            {title}
          </div>
          {badge && (
            <div className="bg-blend-normal flex text-xs whitespace-nowrap text-center tracking-[-0.36px] mt-1">
              <div className={`justify-center items-center flex gap-[3px] pl-1 pr-1.5 py-0.5 rounded-2xl ${getBadgeStyles(badge.color)}`}>
                <img
                  src={badge.color === 'green' ? "https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/4478c07d8f5f57067c10bdd58ce2196958bbb6b4?placeholderIfAbsent=true" : "https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/42a06b6996526acaed5ff40f25c1e7184e98387d?placeholderIfAbsent=true"}
                  className="aspect-[1] object-contain w-3 self-stretch shrink-0 my-auto"
                  alt="Badge icon"
                />
                <span className="self-stretch my-auto">
                  {badge.text}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex min-h-8 items-center gap-2.5 justify-center w-8">
          <img
            src={icon}
            className="aspect-[1] object-contain w-5 self-stretch my-auto"
            alt="Card icon"
          />
        </div>
      </div>
      
      <div className="w-full mt-8">
        <div className="w-full">
          <div className="flex min-h-8 w-full items-center gap-3">
            <div className="text-[#E4EEF5] text-xl font-medium tracking-[-0.6px] self-stretch my-auto">
              {value}
            </div>
            {timer && (
              <div className="justify-center items-center border border-[rgba(40,191,255,0.05)] self-stretch flex gap-1 text-[10px] text-[#85A8C3] font-normal whitespace-nowrap text-center tracking-[-0.3px] my-auto pl-2 pr-2.5 py-2 rounded-lg border-solid">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/b23fdd525a8e7e9205c0ec08c7ccf91777547bb6?placeholderIfAbsent=true"
                  className="aspect-[1] object-contain w-4 self-stretch shrink-0 my-auto"
                  alt="Timer icon"
                />
                <span className="text-[#85A8C3] self-stretch my-auto">
                  {timer}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex w-full gap-4 mt-3">
            <div className="min-w-60 w-full flex-1 shrink basis-[0%] pt-2">
              <div className="w-full rounded-[100px] bg-[rgba(80,213,255,0.20)] h-1.5">
                <div 
                  className="flex shrink-0 h-1.5 bg-[#1BBF99] rounded-[100px]"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex w-full items-center gap-[40px_100px] text-xs text-[#85A8C3] font-normal text-center tracking-[-0.36px] justify-between mt-2">
                <span className="text-[#85A8C3] self-stretch my-auto">
                  Maximum {maxValue}
                </span>
                <span className="text-[#85A8C3] self-stretch my-auto">
                  {percentageText}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
