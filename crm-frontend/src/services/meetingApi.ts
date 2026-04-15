const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.we-fund.com';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.detail || 'Request failed');
  }
  return res.json();
}

export interface MeetingProfilePublic {
  slug: string;
  headline: string;
  bio: string;
  durations_offered: number[];
  default_duration: number;
  timezone: string;
  max_days_ahead: number;
  user_name: string;
  user_profile_picture: string;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
}

export interface SlotsResponse {
  date: string;
  duration: number;
  slots: TimeSlot[];
}

export interface BookingPublic {
  id: string;
  guest_name: string;
  guest_email: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  timezone: string;
  status: string;
  daily_room_url: string;
  host_name: string;
  host_profile_picture: string;
  created_at: string;
  cancel_token?: string;
}

export interface GuestToken {
  token: string;
  room_url: string;
  room_name: string;
}

export const api = {
  getProfile: (slug: string) =>
    request<MeetingProfilePublic>(`/meet/${slug}/`),

  getSlots: (slug: string, date: string, duration: number, timezone?: string) =>
    request<SlotsResponse>(`/meet/${slug}/slots/?date=${date}&duration=${duration}${timezone ? `&timezone=${timezone}` : ''}`),

  createBooking: (slug: string, data: {
    guest_name: string;
    guest_email: string;
    guest_notes: string;
    start_time: string;
    duration_minutes: number;
    timezone: string;
  }) =>
    request<BookingPublic>(`/meet/${slug}/book/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getBooking: (bookingId: string) =>
    request<BookingPublic>(`/meet/booking/${bookingId}/`),

  cancelBooking: (bookingId: string, cancelToken: string) =>
    request<{ status: string }>(`/meet/booking/${bookingId}/cancel/`, {
      method: 'POST',
      body: JSON.stringify({ cancel_token: cancelToken }),
    }),

  getGuestToken: (bookingId: string) =>
    request<GuestToken>(`/meet/room/${bookingId}/token/`),
};
