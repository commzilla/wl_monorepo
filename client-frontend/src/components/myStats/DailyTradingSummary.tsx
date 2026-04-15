
import React, { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Calendar,
  CalendarPlus,
  CalendarX,
  TrendingUp,
} from "lucide-react";
import { fetchMyStats, fetchMonthlyDailySummary, fetchDailyPnlDetail, DailyPL } from "../../utils/api";
import { getBrowserInfo } from "@/utils/browserCompat";
import { formatCurrency, getCurrencySymbol } from "@/utils/currencyFormatter";

const CustomBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  const isPositive = payload.value >= 0;
  const color = isPositive ? "#1BBF99" : "#ED5363";

  // Show a minimal bar for zero values to indicate trading activity
  if (payload.value === 0) {
    return (
      <rect
        x={x}
        y={y + height / 2 - 1}
        width={16}
        height={2}
        fill="#85A8C3"
        rx={1}
        ry={1}
        opacity={0.7}
      />
    );
  }

  return (
    <rect
      x={x}
      y={isPositive ? y : y + height}
      width={16}
      height={Math.abs(height)}
      fill={color}
      rx={4}
      ry={4}
    />
  );
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Helper function to safely convert values and handle NaN/null/undefined
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

const safeString = (value: any, defaultValue: string = '0'): string => {
  if (value === null || value === undefined) return defaultValue;
  const num = safeNumber(value);
  return num.toLocaleString();
};

const DailyTradingSummary: React.FC<{ selectedEnrollment?: any }> = ({ selectedEnrollment }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Get currency from selected enrollment
  const currency = selectedEnrollment?.currency || 'USD';
  
  // Initialize with current month
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  
  // Helper to format month display
  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  // Get account ID from selected enrollment
  const accountId = selectedEnrollment?.account_id;

  // Fetch monthly daily summary with anti-flicker optimizations
  const { data: monthlyData, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ['monthlyDailySummary', accountId, currentMonth],
    queryFn: () => fetchMonthlyDailySummary(accountId, currentMonth),
    enabled: !!accountId,
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  // Fetch daily detail for selected date with anti-flicker optimizations
  const { data: dailyDetail, isLoading: isLoadingDaily } = useQuery({
    queryKey: ['dailyPnlDetail', accountId, selectedDate],
    queryFn: () => fetchDailyPnlDetail(accountId, selectedDate!),
    enabled: !!accountId && !!selectedDate,
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  // Fetch myStats for bottom cards with anti-flicker optimizations
  const { data: myStatsResponse } = useQuery({
    queryKey: ['myStats', selectedEnrollment?.enrollment_id],
    queryFn: () => fetchMyStats(1, 100, selectedEnrollment?.enrollment_id),
    enabled: !!selectedEnrollment?.enrollment_id,
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  const myStats = myStatsResponse?.results;

  const shouldShowLoading = !selectedEnrollment || isLoadingMonthly || !monthlyData;
  const browserInfo = getBrowserInfo();

  // Generate calendar data from real API data
  const calendarData = useMemo(() => {
    if (!monthlyData?.days || monthlyData.days.length === 0) {
      // Generate empty calendar data based on current month
      const [year, month] = currentMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      
      return Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        value: 0,
        hasTrading: false,
        isWeekend: [0, 6].includes(new Date(year, month - 1, i + 1).getDay()),
        date: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
        trades: 0,
        lots: 0
      }));
    }

    // Generate calendar data from API response
    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const data = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayData = monthlyData.days.find(d => d.date === dateStr);
      
      data.push({
        day: i,
        value: safeNumber(dayData?.profit),
        hasTrading: !!dayData && safeNumber(dayData.profit) !== 0,
        isWeekend: [0, 6].includes(new Date(year, month - 1, i).getDay()),
        date: dateStr,
        trades: 0, // Will be filled from dailyDetail when selected
        lots: 0 // Will be filled from dailyDetail when selected
      });
    }

    return data;
  }, [monthlyData, currentMonth]);

  // Generate hourly chart data for selected date
  const hourlyChartData = useMemo(() => {
    if (!selectedDate || !dailyDetail?.pnl_chart || dailyDetail.pnl_chart.length === 0) {
      return [
        { time: "8:00", value: 0 },
        { time: "10:00", value: 0 },
        { time: "12:00", value: 0 },
        { time: "14:00", value: 0 },
        { time: "16:00", value: 0 },
        { time: "18:00", value: 0 },
        { time: "20:00", value: 0 },
      ];
    }

    // Use real PnL chart data from API
    return dailyDetail.pnl_chart.map(point => ({
      time: point.time,
      value: safeNumber(point.pnl)
    }));
  }, [selectedDate, dailyDetail?.pnl_chart]);

  // Set initial selected date
  React.useEffect(() => {
    if (!selectedDate && calendarData.length > 0) {
      const firstTradingDay = calendarData.find(d => d.hasTrading);
      if (firstTradingDay) {
        setSelectedDate(firstTradingDay.date);
      } else {
        setSelectedDate(calendarData[6]?.date || null); // Default to day 7
      }
    }
  }, [calendarData, selectedDate]);

  const selectedDateData = calendarData.find(d => d.date === selectedDate);
  const selectedDateValue = safeNumber(selectedDateData?.value);

  const handlePreviousMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    setCurrentMonth(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
    setSelectedDate(null); // Reset selected date when changing months
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    setCurrentMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
    setSelectedDate(null); // Reset selected date when changing months
  };

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  if (shouldShowLoading) {
    return (
      <div className="p-6 rounded-2xl border border-[rgba(40,191,255,0.05)] bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)]">
        <div className="text-center text-[#85A8C3]">Loading daily summary...</div>
      </div>
    );
  }

  return (
    <div 
      className="font-sans stats-container"
      style={{
        // macOS Chrome/Brave specific fixes
        ...((browserInfo.isChrome || browserInfo.isBrave) && browserInfo.isMacOS && {
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
        })
      }}
    >
      {/* Main Container */}
      <div className="relative overflow-hidden rounded-2xl p-6 border border-[rgba(40,191,255,0.05)] bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] gradient-bg">
        {/* Title */}
        <h1 className="text-[#E4EEF5] text-xl font-medium mb-8 tracking-tight">
          Summary by the day
        </h1>

        {/* Content Container */}
        <div className="flex flex-col lg:flex-row gap-4 xl:gap-6">
          {/* Calendar Container */}
          <div className="flex-1">
            <div className="rounded-xl p-6 bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] border border-[#28BFFF]/20 backdrop-blur-sm">
              {/* Calendar Header */}
              <div className="flex justify-center items-center mb-8">
                <div className="flex items-center gap-6">
                  <button
                    onClick={handlePreviousMonth}
                    className="flex items-center justify-center w-11 h-11 rounded-lg border border-[#28BFFF]/40 bg-[rgba(40,191,255,0.05)] hover:bg-[rgba(40,191,255,0.1)] transition-colors shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#85A8C3]" />
                  </button>

                  <h2 className="text-[#85A8C3] text-xl font-medium tracking-tight min-w-[96px] text-center">
                    {formatMonthDisplay(currentMonth)}
                  </h2>

                  <button
                    onClick={handleNextMonth}
                    className="flex items-center justify-center w-11 h-11 rounded-lg border border-[#28BFFF]/40 bg-[rgba(40,191,255,0.05)] hover:bg-[rgba(40,191,255,0.1)] transition-colors shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]"
                  >
                    <ChevronRight className="w-5 h-5 text-[#85A8C3]" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="space-y-4">
                {/* Weekdays Header */}
                <div className="grid grid-cols-7 gap-2 pb-2">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="flex justify-center items-center py-2"
                    >
                      <span className="text-[#85A8C3] text-sm tracking-tight">
                        {day}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="space-y-2">
                  {/* Generate calendar rows properly */}
                  {(() => {
                    const [year, month] = currentMonth.split('-').map(Number);
                    const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.
                    const daysInMonth = new Date(year, month, 0).getDate();
                    
                    // Create calendar grid
                    const calendarGrid = [];
                    let currentDay = 1;
                    
                    // Generate weeks
                    for (let week = 0; week < 6; week++) {
                      const weekDays = [];
                      
                      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                        if (week === 0 && dayOfWeek < firstDayOfMonth) {
                          // Empty cells before the first day of the month
                          weekDays.push({ type: "empty" });
                        } else if (currentDay <= daysInMonth) {
                          // Valid day of the month
                          weekDays.push({ type: "day", day: currentDay });
                          currentDay++;
                        } else {
                          // Empty cells after the last day of the month
                          weekDays.push({ type: "empty" });
                        }
                      }
                      
                      calendarGrid.push({
                        type: "week-row",
                        items: weekDays
                      });
                    }
                    
                    return calendarGrid;
                  })().map((row, rowIndex) => (
                    <div key={rowIndex} className="grid grid-cols-7 gap-2">
                      {row.items.map((item, itemIndex) => {
                        if (item.type === "empty") {
                          return (
                            <div
                              key={`empty-${itemIndex}`}
                              className="min-h-[56px]"
                            />
                          );
                        }

                        if (item.type === "day") {
                          const dayData = calendarData.find(
                            (d) => d.day === item.day,
                          );
                          if (!dayData) return null;

                          const isSelected = dayData.date === selectedDate;
                          const hasLoss =
                            dayData.hasTrading && dayData.value < 0;
                          const hasProfit =
                            dayData.hasTrading && dayData.value > 0;

                          let bgClass =
                            "border-[#28BFFF]/20 bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)]";
                          let textClass = "text-[#85A8C3]";
                          let valueClass = "text-[#85A8C3]";

                          if (hasLoss) {
                            bgClass =
                              "border-[#ED5363]/20 bg-gradient-to-b from-[rgba(237,83,99,0.15)] to-[rgba(11,25,29,0.15)]";
                            textClass = "text-[#E4EEF5] font-semibold";
                            valueClass = "text-[#ED5363]";
                          } else if (hasProfit) {
                            bgClass =
                              "border-[#1BBF99]/20 bg-gradient-to-b from-[rgba(27,191,153,0.15)] to-[rgba(11,25,29,0.15)]";
                            textClass = "text-[#E4EEF5] font-semibold";
                            valueClass = "text-[#1BBF99]";
                          }

                          if (isSelected) {
                            bgClass =
                              "border-[#28BFFF]/40 bg-gradient-to-b from-[rgba(40,191,255,0.15)] to-[rgba(11,25,29,0.15)]";
                          }

                          return (
                            <button
                              key={dayData.day}
                              onClick={() => handleDateClick(dayData.date)}
                              className={`flex flex-col items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-all hover:scale-[1.02] min-h-[56px] ${bgClass}`}
                            >
                              <span
                                className={`text-sm tracking-tight ${textClass}`}
                              >
                                {dayData.day}
                              </span>
                              <span
                                className={`text-xs tracking-tight ${valueClass}`}
                              >
                                {dayData.hasTrading
                                  ? formatCurrency(Math.abs(dayData.value), currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                  : formatCurrency(0, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </button>
                          );
                        }

                        return null;
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chart Container */}
          <div className="flex-1">
            <div className="rounded-xl p-6 h-full flex flex-col bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] border border-[#28BFFF]/20 backdrop-blur-sm">
              {/* Chart Header */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-[#28BFFF]/20">
                <div className="flex flex-col gap-2">
                  <span className="text-[#85A8C3] text-sm tracking-tight">
                    {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </span>
                  <span className={`text-2xl font-medium tracking-tight ${selectedDateValue >= 0 ? 'text-[#1BBF99]' : 'text-[#ED5363]'}`}>
                    {formatCurrency(selectedDateValue, currency)}
                  </span>
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center gap-2 px-6 py-3 rounded-full border border-[#28BFFF]/20 bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
                    <span className="text-[#85A8C3] text-sm font-semibold tracking-tight">
                      Trades:
                    </span>
                     <span className="text-[#E4EEF5] text-sm font-semibold tracking-tight">
                       {dailyDetail?.trade_count || 0}
                     </span>
                   </div>
                   <div className="flex items-center gap-2 px-6 py-3 rounded-full border border-[#28BFFF]/20 bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
                     <span className="text-[#85A8C3] text-sm font-semibold tracking-tight">
                       Lots:
                     </span>
                     <span className="text-[#E4EEF5] text-sm font-semibold tracking-tight">
                      {safeNumber(dailyDetail?.lots).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="flex-1 flex flex-col justify-between min-h-[300px] relative">
                {/* Chart Area */}
                <div className="flex-1 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={hourlyChartData}
                      margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                    >
                      <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#85A8C3" }}
                        className="text-trading-text-secondary"
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#85A8C3" }}
                        tickFormatter={(value) => `${getCurrencySymbol(currency)}${value}`}
                      />
                      <Bar dataKey="value" shape={<CustomBar />} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Zero line */}
                <div className="absolute top-1/2 left-5 right-5 h-px bg-[#28BFFF]/20 transform -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
          {/* P&L Card */}
          <div className="flex items-center gap-4 p-5 rounded-lg border border-[#28BFFF]/20 bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] backdrop-blur-sm">
            <div className="flex items-center justify-center p-3 rounded-lg border border-[#28BFFF]/40 bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
              <ArrowUpDown className="w-7 h-7 text-[#85A8C3]" />
            </div>
            <div className="flex-1">
              <div className="text-[#85A8C3] text-sm tracking-tight mb-2">
                P&L
              </div>
              <div className="text-[#E4EEF5] text-2xl font-medium tracking-tight">
                {formatCurrency(myStats?.net_pnl, currency)}
              </div>
            </div>
          </div>

          {/* Best Day Card */}
          <div className="flex items-center gap-4 p-5 rounded-lg border border-[#28BFFF]/20 bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] backdrop-blur-sm">
            <div className="flex items-center justify-center p-3 rounded-lg border border-[#28BFFF]/40 bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
              <CalendarPlus className="w-7 h-7 text-[#1BBF99]" />
            </div>
            <div className="flex-1">
              <div className="text-[#85A8C3] text-sm tracking-tight mb-2 truncate">
                Best Day ({myStats?.best_day?.date ? new Date(myStats.best_day.date).toLocaleDateString() : 'N/A'})
              </div>
              <div className="text-[#E4EEF5] text-2xl font-medium tracking-tight">
                {formatCurrency(myStats?.best_day?.profit, currency)}
              </div>
            </div>
          </div>

          {/* Worst Day Card */}
          <div className="flex items-center gap-4 p-5 rounded-lg border border-[#28BFFF]/20 bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] backdrop-blur-sm">
            <div className="flex items-center justify-center p-3 rounded-lg border border-[#28BFFF]/40 bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
              <CalendarX className="w-7 h-7 text-[#ED5363]" />
            </div>
            <div className="flex-1">
              <div className="text-[#85A8C3] text-sm tracking-tight mb-2 truncate">
                Worst Day ({myStats?.worst_day?.date ? new Date(myStats.worst_day.date).toLocaleDateString() : 'N/A'})
              </div>
              <div className="text-[#E4EEF5] text-2xl font-medium tracking-tight">
                {formatCurrency(myStats?.worst_day?.profit, currency)}
              </div>
            </div>
          </div>

          {/* Win Rate Card */}
          <div className="flex items-center gap-4 p-5 rounded-lg border border-[#28BFFF]/20 bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] backdrop-blur-sm">
            <div className="flex items-center justify-center p-3 rounded-lg border border-[#28BFFF]/40 bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
              <TrendingUp className="w-7 h-7 text-[#85A8C3]" />
            </div>
            <div className="flex-1">
              <div className="text-[#85A8C3] text-sm tracking-tight mb-2">
                Win Rate
              </div>
              <div className="text-[#E4EEF5] text-2xl font-medium tracking-tight">
                {safeNumber(myStats?.win_rate)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyTradingSummary;
