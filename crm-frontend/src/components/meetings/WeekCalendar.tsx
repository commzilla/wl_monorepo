import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isToday, addWeeks, getHours, getMinutes, addMinutes,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Video, Clock, User, Mail, X, Check,
  MessageSquare, CheckCircle2, XCircle, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MeetingBooking, MeetingAvailability } from '@/services/meetingService';

const HOUR_HEIGHT = 60;

const BLOCK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  confirmed: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-300' },
  pending:   { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-300' },
  cancelled: { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400 line-through opacity-50' },
  completed: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-300' },
};

const STATUS_BADGE: Record<string, { color: string; icon: React.ElementType }> = {
  pending:   { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  confirmed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle2 },
  cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  completed: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Check },
};

interface WeekCalendarProps {
  bookings: MeetingBooking[];
  isLoading: boolean;
  onJoinMeeting: (booking: MeetingBooking) => void;
  onCancelBooking: (booking: MeetingBooking) => void;
  onCompleteMeeting: (booking: MeetingBooking) => void;
  currentWeekStart: Date;
  onWeekChange: (newStart: Date) => void;
  availability?: MeetingAvailability[];
  onSlotClick?: (day: Date, hour: number, minutes: number) => void;
}

export default function WeekCalendar({
  bookings,
  isLoading,
  onJoinMeeting,
  onCancelBooking,
  onCompleteMeeting,
  currentWeekStart,
  onWeekChange,
  availability,
  onSlotClick,
}: WeekCalendarProps) {
  const [selectedBooking, setSelectedBooking] = useState<MeetingBooking | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [now, setNow] = useState(new Date());
  const gridRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Compute dynamic time range from availability
  const { startHour, endHour, hours } = useMemo(() => {
    let earliest = 7;
    let latest = 21;

    if (availability && availability.length > 0) {
      const activeSlots = availability.filter(a => a.is_active);
      if (activeSlots.length > 0) {
        const starts = activeSlots
          .map(a => parseInt(a.start_time?.split(':')[0] || '7', 10))
          .filter(h => !isNaN(h));
        const ends = activeSlots
          .map(a => parseInt(a.end_time?.split(':')[0] || '21', 10))
          .filter(h => !isNaN(h));

        if (starts.length > 0 && ends.length > 0) {
          earliest = Math.max(0, Math.min(...starts) - 1);
          latest = Math.min(24, Math.max(...ends) + 1);
        }
      }
    }

    const hoursArr = Array.from({ length: latest - earliest }, (_, i) => earliest + i);
    return { startHour: earliest, endHour: latest, hours: hoursArr };
  }, [availability]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Close popover on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedBooking(null);
        setPopoverPos(null);
      }
    };
    if (selectedBooking) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [selectedBooking]);

  const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  const getBookingsForDay = (day: Date) =>
    bookings.filter((b) => isSameDay(parseISO(b.start_time), day));

  const getBlockStyle = (booking: MeetingBooking) => {
    const start = parseISO(booking.start_time);
    const hour = getHours(start);
    const minutes = getMinutes(start);
    const top = (hour - startHour) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
    const height = Math.max((booking.duration_minutes / 60) * HOUR_HEIGHT, 20);
    return { top, height };
  };

  const handleBlockClick = (booking: MeetingBooking, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedBooking?.id === booking.id) {
      setSelectedBooking(null);
      setPopoverPos(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    let left = rect.left - gridRect.left + rect.width + 8;
    let top = rect.top - gridRect.top;

    // If popover would overflow right, show to left
    if (left + 280 > gridRect.width) {
      left = rect.left - gridRect.left - 288;
    }
    // Clamp top
    if (top < 0) top = 0;
    if (top + 300 > gridRect.height) top = gridRect.height - 300;

    setSelectedBooking(booking);
    setPopoverPos({ top, left });
  };

  const handleDayColumnClick = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSlotClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMinutes = (y / HOUR_HEIGHT) * 60 + startHour * 60;
    // Snap to 15-minute intervals
    const snapped = Math.round(totalMinutes / 15) * 15;
    const hour = Math.floor(snapped / 60);
    const minutes = snapped % 60;
    if (hour >= startHour && hour < endHour) {
      onSlotClick(day, hour, minutes);
    }
  };

  const closePopover = () => {
    setSelectedBooking(null);
    setPopoverPos(null);
  };

  // Current time indicator
  const nowHour = getHours(now);
  const nowMinutes = getMinutes(now);
  const showTimeLine = nowHour >= startHour && nowHour < endHour;
  const timeLineTop = (nowHour - startHour) * HOUR_HEIGHT + (nowMinutes / 60) * HOUR_HEIGHT;

  // Scroll to current time on mount
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollContainerRef.current && showTimeLine) {
      const scrollTo = Math.max(timeLineTop - 200, 0);
      scrollContainerRef.current.scrollTop = scrollTo;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));
  const totalHeight = (endHour - startHour) * HOUR_HEIGHT;

  return (
    <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
      {/* Navigation Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-card/40">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onWeekChange(addWeeks(currentWeekStart, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onWeekChange(addWeeks(currentWeekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold ml-2">{weekLabel}</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isCurrentWeek}
          onClick={() => onWeekChange(new Date())}
        >
          Today
        </Button>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Scroll container with sticky day header + time grid */}
      <div className="overflow-x-auto">
      <div ref={scrollContainerRef} className="overflow-y-auto max-h-[600px] relative min-w-[600px]">
        {/* Day Header Row — sticky inside scroll container so columns align with grid */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-white/10 sticky top-0 z-20">
          <div className="border-r border-white/5" />
          {days.map((day) => {
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`relative text-center py-2 border-r border-white/5 last:border-r-0 bg-gray-950/95 backdrop-blur`}
              >
                {today && <div className="absolute inset-0 bg-primary/10" />}
                <div className={`relative text-xs font-medium ${today ? 'text-primary' : 'text-muted-foreground'}`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`relative text-lg font-semibold leading-tight ${today ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time Grid */}
        <div ref={gridRef} className="grid grid-cols-[56px_repeat(7,1fr)] relative" style={{ height: totalHeight }}>
          {/* Time labels gutter */}
          <div className="relative border-r border-white/5">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full text-right pr-2 text-xs text-muted-foreground"
                style={{ top: (hour - startHour) * HOUR_HEIGHT - 8 }}
              >
                {format(new Date(2000, 0, 1, hour), 'HH:mm')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayBookings = getBookingsForDay(day);
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`relative border-r border-white/5 last:border-r-0 ${today ? 'bg-primary/[0.03]' : ''} ${onSlotClick ? 'cursor-pointer' : ''}`}
                onClick={(e) => handleDayColumnClick(day, e)}
              >
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-white/5"
                    style={{ top: (hour - startHour) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Meeting blocks (side-by-side when overlapping) */}
                {computeOverlapLayout(dayBookings).map(({ booking, colIndex, totalCols }) => {
                  const { top, height } = getBlockStyle(booking);
                  const colors = BLOCK_COLORS[booking.status] || BLOCK_COLORS.pending;
                  const startTime = parseISO(booking.start_time);
                  const endTime = addMinutes(startTime, booking.duration_minutes);
                  const isSelected = selectedBooking?.id === booking.id;
                  const colWidth = 100 / totalCols;
                  const leftPct = colIndex * colWidth;

                  return (
                    <button
                      key={booking.id}
                      className={`absolute rounded-md border px-1.5 py-0.5 cursor-pointer transition-all overflow-hidden
                        ${colors.bg} ${colors.border} ${isSelected ? 'ring-2 ring-primary/50 z-20' : 'hover:brightness-125 z-10'}`}
                      style={{
                        top,
                        height: Math.max(height, 24),
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${colWidth}% - 4px)`,
                      }}
                      onClick={(e) => handleBlockClick(booking, e)}
                    >
                      <div className={`text-[11px] font-medium leading-tight truncate ${colors.text}`}>
                        {booking.guest_name}
                      </div>
                      {height >= 36 && (
                        <div className={`text-[10px] leading-tight truncate ${colors.text} opacity-75`}>
                          {format(startTime, 'HH:mm')}–{format(endTime, 'HH:mm')}
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Current time line */}
                {today && showTimeLine && (
                  <div
                    className="absolute left-0 right-0 z-30 pointer-events-none"
                    style={{ top: timeLineTop }}
                  >
                    <div className="relative">
                      <div className="absolute -left-[5px] -top-[5px] w-[10px] h-[10px] rounded-full bg-red-500" />
                      <div className="h-[2px] bg-red-500 w-full" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Popover */}
          {selectedBooking && popoverPos && (
            <div
              ref={popoverRef}
              className="absolute z-50 w-72 rounded-lg border border-white/10 bg-card shadow-2xl p-4 space-y-3"
              style={{ top: popoverPos.top, left: popoverPos.left }}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{selectedBooking.guest_name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{selectedBooking.guest_email}</span>
                  </div>
                </div>
                <button onClick={closePopover} className="text-muted-foreground hover:text-foreground p-0.5">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Time + Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>
                    {format(parseISO(selectedBooking.start_time), 'MMM d, HH:mm')}
                    {' – '}
                    {format(addMinutes(parseISO(selectedBooking.start_time), selectedBooking.duration_minutes), 'HH:mm')}
                    {' '}({selectedBooking.duration_minutes}min)
                  </span>
                </div>
                {(() => {
                  const style = STATUS_BADGE[selectedBooking.status] || STATUS_BADGE.pending;
                  const Icon = style.icon;
                  return (
                    <Badge variant="outline" className={`${style.color} text-xs`}>
                      <Icon className="h-3 w-3 mr-1" />
                      {selectedBooking.status}
                    </Badge>
                  );
                })()}
              </div>

              {/* Notes */}
              {selectedBooking.guest_notes && (
                <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-3">{selectedBooking.guest_notes}</span>
                </div>
              )}

              {/* Actions */}
              {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') && (
                <div className="flex flex-col gap-2 pt-1">
                  <Button size="sm" className="w-full h-7 text-xs" onClick={() => { onJoinMeeting(selectedBooking); closePopover(); }}>
                    <Video className="h-3 w-3 mr-1" /> Join Meeting
                  </Button>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => { onCompleteMeeting(selectedBooking); closePopover(); }}>
                      <Check className="h-3 w-3 mr-1" /> Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs text-red-400 hover:text-red-300 hover:border-red-500/30"
                      onClick={() => { onCancelBooking(selectedBooking); closePopover(); }}
                    >
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function isBookingPast(booking: MeetingBooking): boolean {
  const endTime = new Date(booking.start_time).getTime() + booking.duration_minutes * 60000;
  return endTime < Date.now();
}

/** Compute side-by-side column layout for overlapping bookings (Google Calendar style). */
function computeOverlapLayout(bookings: MeetingBooking[]): { booking: MeetingBooking; colIndex: number; totalCols: number }[] {
  if (bookings.length === 0) return [];

  const sorted = [...bookings].sort((a, b) => {
    const diff = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    return diff !== 0 ? diff : b.duration_minutes - a.duration_minutes;
  });

  // Assign each booking to the first available column
  const columns: number[] = []; // tracks end-time per column
  const items: { booking: MeetingBooking; colIndex: number }[] = [];

  for (const booking of sorted) {
    const startMs = new Date(booking.start_time).getTime();
    const endMs = startMs + booking.duration_minutes * 60000;
    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      if (startMs >= columns[i]) {
        columns[i] = endMs;
        items.push({ booking, colIndex: i });
        placed = true;
        break;
      }
    }
    if (!placed) {
      items.push({ booking, colIndex: columns.length });
      columns.push(endMs);
    }
  }

  // For each booking, find the max columns in its overlap group
  return items.map((item) => {
    const s = new Date(item.booking.start_time).getTime();
    const e = s + item.booking.duration_minutes * 60000;
    const overlapping = items.filter((o) => {
      const os = new Date(o.booking.start_time).getTime();
      const oe = os + o.booking.duration_minutes * 60000;
      return s < oe && e > os;
    });
    return { ...item, totalCols: Math.max(...overlapping.map((o) => o.colIndex)) + 1 };
  });
}
