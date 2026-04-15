import React, { useState, useEffect, useRef } from "react";
import { getBrowserInfo } from "@/utils/browserCompat";

interface DateRangePickerProps {
  className?: string;
  defaultStartDate?: Date;
  defaultEndDate?: Date;
  onRangeSelect?: (startDate: Date | null, endDate: Date | null) => void;
}

interface CalendarDate {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  className,
  defaultStartDate,
  defaultEndDate,
  onRangeSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(
    defaultStartDate || null,
  );
  const [endDate, setEndDate] = useState<Date | null>(defaultEndDate || null);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate);
  const [currentMonth1, setCurrentMonth1] = useState(new Date());
  const [currentMonth2, setCurrentMonth2] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  });
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const browserInfo = getBrowserInfo();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Update internal state when default props change
  useEffect(() => {
    if (defaultStartDate !== undefined) {
      setStartDate(defaultStartDate);
      setTempStartDate(defaultStartDate);
    }
    if (defaultEndDate !== undefined) {
      setEndDate(defaultEndDate);
      setTempEndDate(defaultEndDate);
    }
  }, [defaultStartDate, defaultEndDate]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getCalendarDates = (month: Date): CalendarDate[] => {
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startOfWeek = new Date(startOfMonth);
    startOfWeek.setDate(startOfMonth.getDate() - startOfMonth.getDay());

    const dates: CalendarDate[] = [];
    const current = new Date(startOfWeek);

    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = current.getMonth() === month.getMonth();
      const isToday = current.getTime() === today.getTime();
      const isFuture = current > today;

      dates.push({
        date: new Date(current),
        isCurrentMonth,
        isToday,
        isFuture,
      });

      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const isDateInRange = (date: Date, start: Date | null, end: Date | null) => {
    if (!start || !end) return false;
    return date >= start && date <= end;
  };

  const isDateSelected = (date: Date) => {
    if (!tempStartDate && !tempEndDate) return false;
    if (tempStartDate && date.getTime() === tempStartDate.getTime())
      return true;
    if (tempEndDate && date.getTime() === tempEndDate.getTime()) return true;
    return false;
  };

  const isDateInHoverRange = (date: Date) => {
    if (!tempStartDate || !hoveredDate || tempEndDate) return false;
    const start = tempStartDate < hoveredDate ? tempStartDate : hoveredDate;
    const end = tempStartDate < hoveredDate ? hoveredDate : tempStartDate;
    return date > start && date < end;
  };

  const handleDateClick = (date: Date) => {
    if (date > today) return; // Disable future dates

    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      // Start new selection
      setTempStartDate(date);
      setTempEndDate(null);
    } else {
      // Complete selection
      if (date < tempStartDate) {
        setTempEndDate(tempStartDate);
        setTempStartDate(date);
      } else {
        setTempEndDate(date);
      }
    }
  };

  const handleApply = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setIsOpen(false);
    onRangeSelect?.(tempStartDate, tempEndDate);
  };

  const handleCancel = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setIsOpen(false);
  };

  const navigateMonth = (direction: "prev" | "next", calendar: 1 | 2) => {
    const newMonth = new Date(calendar === 1 ? currentMonth1 : currentMonth2);
    newMonth.setMonth(newMonth.getMonth() + (direction === "next" ? 1 : -1));

    if (calendar === 1) {
      setCurrentMonth1(newMonth);
      // Ensure month2 is always after month1
      const nextMonth = new Date(newMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setCurrentMonth2(nextMonth);
    } else {
      setCurrentMonth2(newMonth);
      // Ensure month1 is always before month2
      const prevMonth = new Date(newMonth);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      setCurrentMonth1(prevMonth);
    }
  };

  const getDisplayText = () => {
    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    return "Select Date";
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  return (
    <div className={`relative ${className || ""}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-normal transition-all duration-200 border-[#28BFFF]/20 bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)] text-[#E4EEF5] hover:bg-[rgba(40,191,255,0.1)] hover:border-[#28BFFF]/40 ${isOpen ? "ring-2 ring-[#28BFFF]/30 ring-opacity-50" : ""}`}
        style={{
          WebkitAppearance: 'none',
          appearance: 'none',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0"
        >
          <path
            d="M13 2H11.5V1.5C11.5 1.36739 11.4473 1.24021 11.3536 1.14645C11.2598 1.05268 11.1326 1 11 1C10.8674 1 10.7402 1.05268 10.6464 1.14645C10.5527 1.24021 10.5 1.36739 10.5 1.5V2H5.5V1.5C5.5 1.36739 5.44732 1.24021 5.35355 1.14645C5.25979 1.05268 5.13261 1 5 1C4.86739 1 4.74021 1.05268 4.64645 1.14645C4.55268 1.24021 4.5 1.36739 4.5 1.5V2H3C2.73478 2 2.48043 2.10536 2.29289 2.29289C2.10536 2.48043 2 2.73478 2 3V13C2 13.2652 2.10536 13.5196 2.29289 13.7071C2.48043 13.8946 2.73478 14 3 14H13C13.2652 14 13.5196 13.8946 13.7071 13.7071C13.8946 13.5196 14 13.2652 14 13V3C14 2.73478 13.8946 2.48043 13.7071 2.29289C13.5196 2.10536 13.2652 2 13 2ZM4.5 3V3.5C4.5 3.63261 4.55268 3.75979 4.64645 3.85355C4.74021 3.94732 4.86739 4 5 4C5.13261 4 5.25979 3.94732 5.35355 3.85355C5.44732 3.75979 5.5 3.63261 5.5 3.5V3H10.5V3.5C10.5 3.63261 10.5527 3.75979 10.6464 3.85355C10.7402 3.94732 10.8674 4 11 4C11.1326 4 11.2598 3.94732 11.3536 3.85355C11.4473 3.75979 11.5 3.63261 11.5 3.5V3H13V5H3V3H4.5ZM13 13H3V6H13V13Z"
            fill="#85A8C3"
          />
        </svg>
        <span className="tracking-[-0.42px] text-xs">{getDisplayText()}</span>
        {isOpen && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="ml-auto flex h-5 w-5 items-center justify-center rounded border-0 bg-transparent p-0 hover:bg-white/10 cursor-pointer"
            style={{
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="M12.5502 11.8871C12.5937 11.9307 12.6283 11.9824 12.6518 12.0393C12.6754 12.0962 12.6875 12.1572 12.6875 12.2188C12.6875 12.2804 12.6754 12.3413 12.6518 12.3983C12.6283 12.4552 12.5937 12.5069 12.5502 12.5504C12.5066 12.594 12.4549 12.6285 12.398 12.6521C12.3411 12.6756 12.2801 12.6878 12.2185 12.6878C12.1569 12.6878 12.0959 12.6756 12.039 12.6521C11.9821 12.6285 11.9304 12.594 11.8869 12.5504L7.99977 8.66271L4.11266 12.5504C4.02471 12.6384 3.90541 12.6878 3.78102 12.6878C3.65663 12.6878 3.53734 12.6384 3.44938 12.5504C3.36143 12.4625 3.31201 12.3432 3.31201 12.2188C3.31201 12.0944 3.36143 11.9751 3.44938 11.8871L7.33708 8.00002L3.44938 4.11291C3.36143 4.02495 3.31201 3.90566 3.31201 3.78127C3.31201 3.65688 3.36143 3.53758 3.44938 3.44963C3.53734 3.36167 3.65663 3.31226 3.78102 3.31226C3.90541 3.31226 4.02471 3.36167 4.11266 3.44963L7.99977 7.33732L11.8869 3.44963C11.9748 3.36167 12.0941 3.31226 12.2185 3.31226C12.3429 3.31226 12.4622 3.36167 12.5502 3.44963C12.6381 3.53758 12.6875 3.65688 12.6875 3.78127C12.6875 3.90566 12.6381 4.02495 12.5502 4.11291L8.66247 8.00002L12.5502 11.8871Z"
                fill="#85A8C3"
              />
            </svg>
          </div>
        )}
      </button>

      {/* Calendar Modal */}
      {isOpen && (
        <div
          ref={modalRef}
          className="absolute top-full right-0 z-[9999] mt-2 flex flex-col rounded-lg border border-[rgba(40,191,255,0.05)] bg-[#11181C] shadow-[0px_0px_24px_-4px_rgba(0,0,0,0.16)] backdrop-blur-md w-full min-w-[520px] p-4 date-picker-modal"
          style={{
            // Safari-specific modal positioning fixes
            ...(browserInfo.isSafari && {
              transform: 'translateZ(0)',
              WebkitTransform: 'translateZ(0)',
              willChange: 'transform',
            })
          }}
        >
          {/* Two Calendar Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* First Calendar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateMonth("prev", 1)}
                  className="flex h-6 w-6 items-center justify-center rounded text-[#85A8C3] hover:bg-[rgba(40,191,255,0.1)] transition-colors"
                  style={{
                    WebkitAppearance: 'none',
                    appearance: 'none',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M10 12L6 8L10 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <h3 className="text-sm font-medium text-[#E4EEF5]">
                  {monthNames[currentMonth1.getMonth()]},{" "}
                  {currentMonth1.getFullYear()}
                </h3>
                <button
                  onClick={() => navigateMonth("next", 1)}
                  className="flex h-6 w-6 items-center justify-center rounded text-[#85A8C3] hover:bg-[rgba(40,191,255,0.1)] transition-colors"
                  style={{
                    WebkitAppearance: 'none',
                    appearance: 'none',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 4L10 8L6 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-0.5">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="p-1 text-center text-xs text-[#85A8C3]"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-0.5">
                {getCalendarDates(currentMonth1).map((calDate, index) => {
                  const isSelected = isDateSelected(calDate.date);
                  const isInRange = isDateInRange(
                    calDate.date,
                    tempStartDate,
                    tempEndDate,
                  );
                  const isInHoverRange = isDateInHoverRange(calDate.date);
                  const isStart =
                    tempStartDate &&
                    calDate.date.getTime() === tempStartDate.getTime();
                  const isEnd =
                    tempEndDate &&
                    calDate.date.getTime() === tempEndDate.getTime();

                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(calDate.date)}
                      onMouseEnter={() => setHoveredDate(calDate.date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      disabled={calDate.isFuture || !calDate.isCurrentMonth}
                      className={`relative h-8 w-8 text-xs transition-all duration-150 ${
                        calDate.isCurrentMonth
                          ? "text-[#E4EEF5]"
                          : "text-[#85A8C3]/30"
                      } ${calDate.isFuture ? "cursor-not-allowed opacity-30" : ""} ${
                        !calDate.isFuture && calDate.isCurrentMonth
                          ? "hover:bg-[rgba(40,191,255,0.1)]"
                          : ""
                      } ${isInRange ? "bg-[rgba(40,191,255,0.1)]" : ""} ${
                        isInHoverRange ? "bg-[rgba(40,191,255,0.05)]" : ""
                      } ${
                        isSelected || isStart || isEnd
                          ? "bg-[#28BFFF] text-white rounded shadow-[inset_0px_-4px_16px_0px_rgba(78,193,255,0.06)]"
                          : ""
                      } ${
                        calDate.isToday && !isSelected
                          ? "relative after:absolute after:bottom-0.5 after:left-1/2 after:h-0.5 after:w-0.5 after:-translate-x-1/2 after:rounded-full after:bg-[#4EC1FF]"
                          : ""
                      }`}
                      style={{
                        WebkitAppearance: 'none',
                        appearance: 'none',
                      }}
                    >
                      {calDate.date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Second Calendar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateMonth("prev", 2)}
                  className="flex h-6 w-6 items-center justify-center rounded text-[#85A8C3] hover:bg-[rgba(40,191,255,0.1)] transition-colors"
                  style={{
                    WebkitAppearance: 'none',
                    appearance: 'none',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M10 12L6 8L10 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <h3 className="text-sm font-medium text-[#E4EEF5]">
                  {monthNames[currentMonth2.getMonth()]},{" "}
                  {currentMonth2.getFullYear()}
                </h3>
                <button
                  onClick={() => navigateMonth("next", 2)}
                  className="flex h-6 w-6 items-center justify-center rounded text-[#85A8C3] hover:bg-[rgba(40,191,255,0.1)] transition-colors"
                  style={{
                    WebkitAppearance: 'none',
                    appearance: 'none',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 4L10 8L6 12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-0.5">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="p-1 text-center text-xs text-[#85A8C3]"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-0.5">
                {getCalendarDates(currentMonth2).map((calDate, index) => {
                  const isSelected = isDateSelected(calDate.date);
                  const isInRange = isDateInRange(
                    calDate.date,
                    tempStartDate,
                    tempEndDate,
                  );
                  const isInHoverRange = isDateInHoverRange(calDate.date);
                  const isStart =
                    tempStartDate &&
                    calDate.date.getTime() === tempStartDate.getTime();
                  const isEnd =
                    tempEndDate &&
                    calDate.date.getTime() === tempEndDate.getTime();

                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(calDate.date)}
                      onMouseEnter={() => setHoveredDate(calDate.date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      disabled={calDate.isFuture || !calDate.isCurrentMonth}
                      className={`relative h-8 w-8 text-xs transition-all duration-150 ${
                        calDate.isCurrentMonth
                          ? "text-[#E4EEF5]"
                          : "text-[#85A8C3]/30"
                      } ${calDate.isFuture ? "cursor-not-allowed opacity-30" : ""} ${
                        !calDate.isFuture && calDate.isCurrentMonth
                          ? "hover:bg-[rgba(40,191,255,0.1)]"
                          : ""
                      } ${isInRange ? "bg-[rgba(40,191,255,0.1)]" : ""} ${
                        isInHoverRange ? "bg-[rgba(40,191,255,0.05)]" : ""
                      } ${
                        isSelected || isStart || isEnd
                          ? "bg-[#28BFFF] text-white rounded shadow-[inset_0px_-4px_16px_0px_rgba(78,193,255,0.06)]"
                          : ""
                      } ${
                        calDate.isToday && !isSelected
                          ? "relative after:absolute after:bottom-0.5 after:left-1/2 after:h-0.5 after:w-0.5 after:-translate-x-1/2 after:rounded-full after:bg-[#4EC1FF]"
                          : ""
                      }`}
                      style={{
                        WebkitAppearance: 'none',
                        appearance: 'none',
                      }}
                    >
                      {calDate.date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="rounded-lg border border-[#28BFFF]/20 bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] px-4 py-2 text-xs text-[#85A8C3] transition-all duration-150 hover:bg-[rgba(40,191,255,0.1)] hover:border-[#28BFFF]/40"
              style={{
                WebkitAppearance: 'none',
                appearance: 'none',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!tempStartDate || !tempEndDate}
              className="rounded-lg bg-[#28BFFF] px-4 py-2 text-xs text-white transition-all duration-150 shadow-[inset_0px_-4px_16px_0px_rgba(78,193,255,0.06)] hover:bg-[#28BFFF]/90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                WebkitAppearance: 'none',
                appearance: 'none',
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
