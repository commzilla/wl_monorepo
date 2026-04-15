import React, { useState } from 'react';

interface CalendarProps {
  className?: string;
}

interface CalendarDay {
  day: string;
  value: string;
  type: 'header' | 'profit' | 'loss' | 'neutral' | 'current';
}

export const Calendar: React.FC<CalendarProps> = ({ className = "" }) => {
  const [currentMonth, setCurrentMonth] = useState('Jun 2024');
  
  const weekdays = ['Sun', 'Mom', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const calendarData: CalendarDay[][] = [
    [
      { day: 'Sun', value: '$0', type: 'header' },
      { day: 'Mom', value: '$0', type: 'header' },
      { day: 'Tue', value: '$0', type: 'header' },
      { day: '1', value: '$0', type: 'neutral' },
      { day: '2', value: '$123', type: 'loss' },
      { day: '3', value: '$123', type: 'loss' },
      { day: '4', value: '$123', type: 'profit' },
    ],
    [
      { day: '5', value: '$123', type: 'profit' },
      { day: '6', value: '$123', type: 'profit' },
      { day: '7', value: '$123', type: 'current' },
      { day: '8', value: '$123', type: 'profit' },
      { day: '9', value: '$0', type: 'neutral' },
      { day: '10', value: '$0', type: 'neutral' },
      { day: '11', value: '$0', type: 'neutral' },
    ],
    [
      { day: '12', value: '$0', type: 'neutral' },
      { day: '13', value: '$0', type: 'neutral' },
      { day: '14', value: '$0', type: 'neutral' },
      { day: '15', value: '$0', type: 'neutral' },
      { day: '16', value: '$0', type: 'neutral' },
      { day: '17', value: '$0', type: 'neutral' },
      { day: '18', value: '$0', type: 'neutral' },
    ],
    [
      { day: '19', value: '$0', type: 'neutral' },
      { day: '20', value: '$0', type: 'neutral' },
      { day: '21', value: '$0', type: 'neutral' },
      { day: '22', value: '$0', type: 'neutral' },
      { day: '23', value: '$0', type: 'neutral' },
      { day: '24', value: '$0', type: 'neutral' },
      { day: '24', value: '$0', type: 'neutral' },
    ],
    [
      { day: '25', value: '$0', type: 'neutral' },
      { day: '26', value: '$0', type: 'neutral' },
      { day: '27', value: '$0', type: 'neutral' },
      { day: '28', value: '$0', type: 'neutral' },
      { day: '29', value: '$0', type: 'neutral' },
      { day: '30', value: '$0', type: 'neutral' },
      { day: 'Sat', value: '$0', type: 'header' },
    ],
  ];

  const getCellStyles = (type: string) => {
    switch (type) {
      case 'header':
        return 'justify-center items-center border border-[color:var(--border-Cards-border-gradient,#28BFFF)] bg-[rgba(40,191,255,0.05)] text-[#E4EEF5] text-sm font-semibold tracking-[-0.42px]';
      case 'profit':
        return 'items-center border border-[color:var(--State-green-bg,rgba(27,191,153,0.18))] text-[#E4EEF5] text-sm font-semibold tracking-[-0.42px]';
      case 'loss':
        return 'items-center border border-[color:var(--State-red-bg,rgba(237,83,99,0.20))] text-[#E4EEF5] text-sm font-semibold tracking-[-0.42px]';
      case 'current':
        return 'items-center border border-[color:var(--Button-gradient,#09F)] text-[#E4EEF5] text-sm font-semibold tracking-[-0.42px]';
      default:
        return 'items-stretch border border-[color:var(--border-Cards-border-gradient,#28BFFF)] text-[#85A8C3] text-sm font-medium';
    }
  };

  const getValueColor = (type: string) => {
    switch (type) {
      case 'profit':
        return 'text-[#1BBF99]';
      case 'loss':
        return 'text-[#ED5363]';
      default:
        return 'text-[#456074]';
    }
  };

  return (
    <div className={`border border-[color:var(--border-Cards-border-gradient,#28BFFF)] min-w-60 flex-1 shrink basis-[0%] p-6 rounded-xl border-solid max-md:max-w-full max-md:px-5 ${className}`}>
      <div className="flex w-full gap-2 max-md:max-w-full">
        <div className="flex min-w-60 w-full items-center gap-6 justify-center flex-wrap flex-1 shrink basis-[0%] py-2 max-md:max-w-full">
          <button className="justify-center items-center border border-[color:var(--border-tertiary-button-gradient,#28BFFF)] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch flex min-h-11 gap-2 w-11 h-11 bg-[rgba(40,191,255,0.05)] my-auto pl-2.5 pr-3.5 rounded-lg border-solid">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/114bad83c78fae4891b0fc7e53a8ccb74a7fdd39?placeholderIfAbsent=true"
              className="aspect-[1] object-contain w-5 self-stretch my-auto"
              alt="Previous month"
            />
          </button>
          
          <div className="text-[#85A8C3] text-center text-xl font-medium tracking-[-0.6px] self-stretch w-24 my-auto">
            {currentMonth}
          </div>
          
          <button className="justify-center items-center border border-[color:var(--border-tertiary-button-gradient,#28BFFF)] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch flex min-h-11 gap-2 w-11 h-11 bg-[rgba(40,191,255,0.05)] my-auto pl-2.5 pr-3.5 rounded-lg border-solid">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/4c974b2e606ebfa38fc7b66af83da6bbaf6eeaf1?placeholderIfAbsent=true"
              className="aspect-[1] object-contain w-5 self-stretch my-auto"
              alt="Next month"
            />
          </button>
        </div>
      </div>
      
      <div className="w-full whitespace-nowrap text-center mt-8 max-md:max-w-full">
        <div className="flex w-full gap-2 text-sm text-[#85A8C3] font-normal tracking-[-0.42px] flex-wrap pb-2 max-md:max-w-full">
          {weekdays.map((day) => (
            <div
              key={day}
              className="text-[#85A8C3] self-stretch gap-2.5 flex-1 shrink basis-[0%] px-3 py-2"
            >
              {day}
            </div>
          ))}
        </div>
        
        <div className="w-full mt-4 max-md:max-w-full">
          {calendarData.map((week, weekIndex) => (
            <div
              key={weekIndex}
              className="flex w-full items-center gap-2 flex-wrap mt-2 first:mt-0 max-md:max-w-full"
            >
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`self-stretch flex min-h-14 flex-col flex-1 shrink basis-[0%] my-auto px-3 py-2 rounded-lg border-solid ${getCellStyles(day.type)}`}
                >
                  <div className="self-stretch my-auto">
                    {day.day}
                  </div>
                  <div className={`text-xs font-normal tracking-[-0.36px] mt-2 ${getValueColor(day.type)}`}>
                    {day.value}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
