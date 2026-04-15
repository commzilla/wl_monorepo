import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCircle, Calendar, Clock, User, Download, XCircle, Loader2, Video } from 'lucide-react';
import { api, BookingPublic } from '@/services/meetingApi';

export default function ConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const cancelToken = (location.state as any)?.cancelToken;

  const [booking, setBooking] = useState<BookingPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    api.getBooking(bookingId)
      .then(b => { setBooking(b); setLoading(false); })
      .catch(() => setLoading(false));
  }, [bookingId]);

  const handleCancel = async () => {
    if (!bookingId || !cancelToken) return;
    setCancelling(true);
    try {
      await api.cancelBooking(bookingId, cancelToken);
      setCancelled(true);
    } catch {
      // error
    }
    setCancelling(false);
  };

  const generateICS = () => {
    if (!booking) return;
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WeFund//Meet//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:Meeting with ${booking.host_name}`,
      `DESCRIPTION:Video call - ${booking.daily_room_url || 'Link will be available at meeting time'}`,
      `URL:${window.location.origin}/room/${booking.id}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${booking.host_name.toLowerCase().replace(/\s/g, '-')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Booking Not Found</h1>
          <p className="text-gray-400">This booking may have been cancelled or doesn't exist.</p>
        </div>
      </div>
    );
  }

  const startDate = new Date(booking.start_time);
  const endDate = new Date(booking.end_time);
  const isCancelled = cancelled || booking.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <header className="border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
          <img src="/wefund-icon.svg" alt="WeMeet" className="h-7 w-auto" />
          <span className="font-semibold text-white/90">WeMeet</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
          {isCancelled ? (
            <>
              <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Meeting Cancelled</h1>
              <p className="text-gray-400">This meeting has been cancelled.</p>
            </>
          ) : (
            <>
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Meeting Confirmed!</h1>
              <p className="text-gray-400">Your meeting has been booked successfully.</p>
            </>
          )}

          <div className="mt-8 space-y-4 text-left">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <User className="h-3.5 w-3.5" /> Host
                  </div>
                  <p className="font-medium text-white">{booking.host_name}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Calendar className="h-3.5 w-3.5" /> Date
                  </div>
                  <p className="font-medium text-white">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Clock className="h-3.5 w-3.5" /> Time
                  </div>
                  <p className="font-medium text-white">
                    {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Clock className="h-3.5 w-3.5" /> Duration
                  </div>
                  <p className="font-medium text-white">{booking.duration_minutes} minutes</p>
                </div>
              </div>
            </div>
          </div>

          {!isCancelled && (
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={`/room/${booking.id}`}
                className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-all shadow-lg shadow-brand-600/25"
              >
                <Video className="h-4 w-4" /> Join Meeting Room
              </a>
              <button
                onClick={generateICS}
                className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-white/5 text-gray-300 font-medium hover:bg-white/10 border border-white/10 transition-all"
              >
                <Download className="h-4 w-4" /> Add to Calendar
              </button>
            </div>
          )}

          {cancelToken && !isCancelled && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="text-sm text-gray-500 hover:text-red-400 transition-colors inline-flex items-center gap-1"
              >
                {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                Cancel this meeting
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <span className="text-xs text-gray-600">Powered by WeMeet</span>
        </div>
      </footer>
    </div>
  );
}
