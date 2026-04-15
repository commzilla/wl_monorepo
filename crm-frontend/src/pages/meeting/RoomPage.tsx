import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Clock, User, Loader2 } from 'lucide-react';
import { api, BookingPublic, GuestToken } from '@/services/meetingApi';

export default function RoomPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [booking, setBooking] = useState<BookingPublic | null>(null);
  const [token, setToken] = useState<GuestToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookingId) return;

    Promise.all([
      api.getBooking(bookingId),
      api.getGuestToken(bookingId),
    ])
      .then(([b, t]) => {
        setBooking(b);
        setToken(t);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || 'Failed to load meeting room');
        setLoading(false);
      });
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading meeting room...</p>
        </div>
      </div>
    );
  }

  if (error || !booking || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Unable to Join</h1>
          <p className="text-gray-400">{error || 'This meeting is not available.'}</p>
        </div>
      </div>
    );
  }

  const roomUrl = `${token.room_url}?t=${token.token}`;
  const startDate = new Date(booking.start_time);
  const endDate = new Date(booking.end_time);

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img src="/wefund-icon.svg" alt="WeMeet" className="h-7 w-auto" />
          <div>
            <p className="font-semibold text-white text-sm">Meeting with {booking.host_name}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
              </span>
              <span>{booking.duration_minutes} min</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>

      {/* Daily.co iframe */}
      <div className="flex-1">
        <iframe
          ref={iframeRef}
          src={roomUrl}
          allow="camera; microphone; fullscreen; speaker; display-capture; compute-pressure"
          className="w-full h-full border-0"
          title="Meeting Room"
        />
      </div>
    </div>
  );
}
