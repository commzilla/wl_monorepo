import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import {
  format, addDays, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isBefore, startOfDay, isToday, addMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Globe, User, Mail, MessageSquare, Loader2, Calendar } from 'lucide-react';
import { api, MeetingProfilePublic, TimeSlot } from '@/services/meetingApi';

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<MeetingProfilePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(0);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState('');

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const guestTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Load profile
  useEffect(() => {
    if (!slug) return;
    api.getProfile(slug)
      .then(p => {
        setProfile(p);
        setSelectedDuration(p.default_duration);
        setLoading(false);
      })
      .catch(() => {
        setError('Booking page not found');
        setLoading(false);
      });
  }, [slug]);

  // Load slots when date or duration changes
  useEffect(() => {
    if (!slug || !selectedDate || !selectedDuration) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    api.getSlots(slug, dateStr, selectedDuration, guestTimezone)
      .then(res => {
        setSlots(res.slots);
        setSlotsLoading(false);
      })
      .catch(() => {
        setSlots([]);
        setSlotsLoading(false);
      });
  }, [slug, selectedDate, selectedDuration]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    // Pad start to Monday
    const startDay = getDay(start);
    const padStart = startDay === 0 ? 6 : startDay - 1; // Monday-based
    const padDays = Array.from({ length: padStart }, (_, i) => addDays(start, -(padStart - i)));
    return [...padDays, ...days];
  }, [currentMonth]);

  const today = startOfDay(new Date());
  const maxDate = profile ? addDays(today, profile.max_days_ahead) : addDays(today, 30);

  const handleBook = async () => {
    if (!slug || !selectedSlot || !guestName || !guestEmail) return;
    setBooking(true);
    setBookError('');
    try {
      const result = await api.createBooking(slug, {
        guest_name: guestName,
        guest_email: guestEmail,
        guest_notes: guestNotes,
        start_time: selectedSlot.start_time,
        duration_minutes: selectedDuration,
        timezone: guestTimezone,
      });
      navigate(`/booking/${result.id}`, {
        state: { cancelToken: result.cancel_token },
      });
    } catch (e: any) {
      setBookError(e.message || 'Failed to book. Please try again.');
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-gray-400">{error || 'This booking page does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/wefund-icon.svg" alt="WeMeet" className="h-7 w-auto" />
            <span className="font-semibold text-white/90">WeMeet</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Globe className="h-3.5 w-3.5" />
            {guestTimezone}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          {/* Left: Profile Card */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
              {profile.user_profile_picture ? (
                <img
                  src={profile.user_profile_picture}
                  alt={profile.user_name}
                  className="h-16 w-16 rounded-full object-cover mb-4 ring-2 ring-brand-500/30"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-brand-600/20 flex items-center justify-center mb-4 ring-2 ring-brand-500/30">
                  <span className="text-2xl font-bold text-brand-400">
                    {profile.user_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <h1 className="text-xl font-bold text-white">{profile.user_name}</h1>
              <h2 className="text-sm text-gray-400 mt-1">{profile.headline}</h2>
              {profile.bio && (
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">{profile.bio}</p>
              )}
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                {selectedDuration} min meeting
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <img src="/wefund-icon.svg" alt="" className="h-3.5 w-auto opacity-60" />
                Video call via WeMeet
              </div>
            </div>

            {/* Duration selector */}
            {profile.durations_offered.length > 1 && (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</label>
                <div className="flex gap-2 mt-2">
                  {profile.durations_offered.sort((a, b) => a - b).map(d => (
                    <button
                      key={d}
                      onClick={() => setSelectedDuration(d)}
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                        selectedDuration === d
                          ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Calendar + Slots + Form */}
          <div className="space-y-6">
            {!selectedSlot ? (
              <>
                {/* Calendar */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">
                      {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                      <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, i) => {
                      const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                      const isPast = isBefore(day, today);
                      const isTooFar = isBefore(maxDate, day);
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const isDisabled = !isCurrentMonth || isPast || isTooFar;

                      return (
                        <button
                          key={i}
                          disabled={isDisabled}
                          onClick={() => setSelectedDate(day)}
                          className={`aspect-square rounded-xl text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
                              : isDisabled
                              ? 'text-gray-700 cursor-not-allowed'
                              : isToday(day)
                              ? 'bg-white/10 text-brand-400 hover:bg-brand-600/20'
                              : 'text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          {format(day, 'd')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <h3 className="font-semibold text-white mb-4">
                      Available times for {format(selectedDate, 'EEEE, MMMM d')}
                    </h3>
                    {slotsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                      </div>
                    ) : slots.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-8">No available times on this date.</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slots.map((slot, i) => {
                          const t = new Date(slot.start_time);
                          return (
                            <button
                              key={i}
                              onClick={() => setSelectedSlot(slot)}
                              className="py-2.5 px-3 rounded-xl text-sm font-medium bg-white/5 text-gray-300 hover:bg-brand-600/20 hover:text-brand-400 border border-transparent hover:border-brand-600/30 transition-all"
                            >
                              {format(t, 'HH:mm')}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Booking Form */
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Back to time selection
                </button>

                <div className="p-4 rounded-xl bg-brand-600/10 border border-brand-600/20 mb-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-brand-400" />
                    <div>
                      <p className="font-medium text-white">
                        {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-400">
                        {format(new Date(selectedSlot.start_time), 'HH:mm')} -{' '}
                        {format(new Date(selectedSlot.end_time), 'HH:mm')}{' '}
                        ({selectedDuration} min)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
                      <User className="h-4 w-4 text-gray-500" /> Your Name *
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-600/50 focus:border-brand-600/50 transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
                      <Mail className="h-4 w-4 text-gray-500" /> Email *
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-600/50 focus:border-brand-600/50 transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-1.5">
                      <MessageSquare className="h-4 w-4 text-gray-500" /> Notes (optional)
                    </label>
                    <textarea
                      value={guestNotes}
                      onChange={e => setGuestNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-600/50 focus:border-brand-600/50 transition-all resize-none"
                      placeholder="What would you like to discuss?"
                    />
                  </div>

                  {bookError && (
                    <p className="text-red-400 text-sm">{bookError}</p>
                  )}

                  <button
                    onClick={handleBook}
                    disabled={!guestName || !guestEmail || booking}
                    className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2"
                  >
                    {booking ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Booking...</>
                    ) : (
                      'Confirm Booking'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <span className="text-xs text-gray-600">Powered by WeMeet</span>
          <a href="https://we-fund.com" target="_blank" rel="noopener" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            we-fund.com
          </a>
        </div>
      </footer>
    </div>
  );
}
