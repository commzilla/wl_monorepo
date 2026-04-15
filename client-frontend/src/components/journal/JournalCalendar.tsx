import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useJournalCalendar } from '@/hooks/useJournal';
import { CalendarDay } from '@/utils/journalApi';
import { formatCurrency } from '@/utils/currencyFormatter';
import CalendarDayDetail from './CalendarDayDetail';

interface JournalCalendarProps {
  enrollmentId: string;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonthString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getPnlColor(pnl: number): string {
  if (pnl > 0) return '#1BBF99';
  if (pnl < 0) return '#ED5363';
  return '#85A8C3';
}

function getPnlBgOpacity(pnl: number, maxAbsPnl: number): number {
  if (maxAbsPnl === 0 || pnl === 0) return 0;
  const ratio = Math.min(Math.abs(pnl) / maxAbsPnl, 1);
  return 0.08 + ratio * 0.18;
}

function getCalendarGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  // Get day of week (0=Sun), convert to Mon-based (0=Mon)
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  // Fill leading nulls
  for (let i = 0; i < startDow; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill trailing nulls
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

const JournalCalendar: React.FC<JournalCalendarProps> = ({ enrollmentId }) => {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStr = getMonthString(currentMonth);
  const { data, isLoading, isError } = useJournalCalendar(monthStr, enrollmentId);

  const calendarDays = data?.data ?? [];

  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    calendarDays.forEach((d) => map.set(d.date, d));
    return map;
  }, [calendarDays]);

  const maxAbsPnl = useMemo(() => {
    if (calendarDays.length === 0) return 0;
    return Math.max(...calendarDays.map((d) => Math.abs(d.pnl)), 1);
  }, [calendarDays]);

  const monthSummary = useMemo(() => {
    const totalPnl = calendarDays.reduce((acc, d) => acc + d.pnl, 0);
    const totalTrades = calendarDays.reduce((acc, d) => acc + d.trades, 0);
    const totalWins = calendarDays.reduce((acc, d) => acc + d.wins, 0);
    const winningDays = calendarDays.filter((d) => d.pnl > 0).length;
    const losingDays = calendarDays.filter((d) => d.pnl < 0).length;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    return { totalPnl, totalTrades, winningDays, losingDays, winRate };
  }, [calendarDays]);

  const weeks = useMemo(
    () => getCalendarGrid(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDate(null);
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDate(null);
  }, []);

  const goToToday = useCallback(() => {
    setCurrentMonth(new Date());
    setSelectedDate(null);
  }, []);

  const handleDayClick = useCallback((dateStr: string) => {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  }, []);

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const formatDateStr = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114] p-5">
        {/* Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-[#3AB3FF]" />
            <h2 className="text-lg font-semibold text-[#E4EEF5]">
              {formatMonthLabel(currentMonth)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="rounded-lg border border-[#1E2D3D] px-3 py-1.5 text-xs font-medium text-[#85A8C3] transition-colors hover:border-[#3AB3FF]/30 hover:text-[#E4EEF5]"
            >
              Today
            </button>
            <button
              onClick={goToPrevMonth}
              className="rounded-lg border border-[#1E2D3D] p-1.5 text-[#85A8C3] transition-colors hover:border-[#3AB3FF]/30 hover:text-[#E4EEF5]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToNextMonth}
              className="rounded-lg border border-[#1E2D3D] p-1.5 text-[#85A8C3] transition-colors hover:border-[#3AB3FF]/30 hover:text-[#E4EEF5]"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Month Summary Bar */}
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-lg border border-[#1E2D3D]/60 bg-[#080808] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#85A8C3]">Net P&L</span>
            <span
              className="text-sm font-semibold"
              style={{ color: getPnlColor(monthSummary.totalPnl) }}
            >
              {monthSummary.totalPnl >= 0 ? '+' : ''}
              {formatCurrency(monthSummary.totalPnl)}
            </span>
          </div>
          <div className="h-4 w-px bg-[#1E2D3D]" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#85A8C3]">Trades</span>
            <span className="text-sm font-medium text-[#E4EEF5]">{monthSummary.totalTrades}</span>
          </div>
          <div className="h-4 w-px bg-[#1E2D3D]" />
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-[#1BBF99]" />
            <span className="text-sm text-[#1BBF99]">{monthSummary.winningDays}d</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-3.5 w-3.5 text-[#ED5363]" />
            <span className="text-sm text-[#ED5363]">{monthSummary.losingDays}d</span>
          </div>
          <div className="h-4 w-px bg-[#1E2D3D]" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#85A8C3]">Win Rate</span>
            <span className="text-sm font-medium text-[#E4EEF5]">
              {monthSummary.winRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-[#ED5363]">Failed to load calendar data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: 620 }}>
              {/* Unified grid: header + weeks share the same container */}
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="py-2 text-center text-xs font-medium uppercase tracking-wider text-[#85A8C3]/60"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="mt-1.5 grid grid-cols-7 gap-1.5">
                  {week.map((date, dayIdx) => {
                    if (!date) {
                      return <div key={dayIdx} className="h-24 rounded-lg" />;
                    }

                    const dateStr = formatDateStr(date);
                    const dayData = dayMap.get(dateStr);
                    const hasTrades = dayData && dayData.trades > 0;
                    const pnl = dayData?.pnl ?? 0;
                    const isSelected = selectedDate === dateStr;
                    const today = isToday(date);

                    const bgColor =
                      pnl > 0
                        ? `rgba(27, 191, 153, ${getPnlBgOpacity(pnl, maxAbsPnl)})`
                        : pnl < 0
                          ? `rgba(237, 83, 99, ${getPnlBgOpacity(pnl, maxAbsPnl)})`
                          : 'transparent';

                    return (
                      <button
                        key={dayIdx}
                        onClick={() => handleDayClick(dateStr)}
                        className={`group relative flex h-24 flex-col items-start rounded-lg border p-2 text-left transition-all ${
                          isSelected
                            ? 'border-[#3AB3FF] bg-[#3AB3FF]/5'
                            : hasTrades
                              ? 'border-[#1E2D3D]/60 hover:border-[#3AB3FF]/40'
                              : 'border-transparent hover:border-[#1E2D3D]/40'
                        }`}
                        style={{
                          backgroundColor: isSelected ? undefined : bgColor,
                        }}
                      >
                        {/* Day header row: number + weekday label */}
                        <div className="flex w-full items-center justify-between">
                          <span
                            className={`text-xs font-semibold ${
                              today
                                ? 'flex h-5 w-5 items-center justify-center rounded-full bg-[#3AB3FF] text-[#080808]'
                                : hasTrades
                                  ? 'text-[#E4EEF5]'
                                  : 'text-[#85A8C3]/40'
                            }`}
                          >
                            {date.getDate()}
                          </span>
                          <span className={`text-[9px] font-medium uppercase ${today ? 'text-[#3AB3FF]/60' : 'text-[#85A8C3]/25'}`}>
                            {WEEKDAY_LABELS[dayIdx]}
                          </span>
                        </div>

                        {/* P&L */}
                        {hasTrades && (
                          <span
                            className="mt-auto text-xs font-semibold"
                            style={{ color: getPnlColor(pnl) }}
                          >
                            {pnl >= 0 ? '+' : ''}
                            {formatCurrency(pnl, undefined, { maximumFractionDigits: 0 })}
                          </span>
                        )}

                        {/* Trade count */}
                        {hasTrades && (
                          <span className="text-[10px] text-[#85A8C3]/60">
                            {dayData.trades} trade{dayData.trades !== 1 ? 's' : ''}
                          </span>
                        )}

                        {/* Indicator dots */}
                        {dayData && (dayData.has_session || dayData.breaches > 0) && (
                          <div className="absolute right-1.5 top-1.5 flex gap-0.5">
                            {dayData.has_session && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-[#7570FF]"
                                title="Session logged"
                              />
                            )}
                            {dayData.breaches > 0 && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-[#ED5363]"
                                title={`${dayData.breaches} breach${dayData.breaches !== 1 ? 'es' : ''}`}
                              />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] text-[#85A8C3]/60">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#1BBF99]" />
                Profit day
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ED5363]" />
                Loss day
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#7570FF]" />
                Session logged
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full border border-[#ED5363]" />
                Breach
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Day Detail Expansion */}
      {selectedDate && (
        <CalendarDayDetail
          date={selectedDate}
          enrollmentId={enrollmentId}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
};

export default JournalCalendar;
