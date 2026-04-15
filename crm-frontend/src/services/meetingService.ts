import { apiService } from './apiService';

export interface MeetingAvailability {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface MeetingDateOverride {
  id?: string;
  date: string;
  is_blocked: boolean;
  start_time?: string | null;
  end_time?: string | null;
}

export interface MeetingProfile {
  id: string;
  user: string;
  slug: string;
  headline: string;
  bio: string;
  durations_offered: number[];
  default_duration: number;
  timezone: string;
  buffer_minutes: number;
  max_days_ahead: number;
  min_notice_hours: number;
  is_active: boolean;
  google_calendar_connected: boolean;
  google_calendar_id: string;
  availabilities: MeetingAvailability[];
  user_name: string;
  booking_url: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingBooking {
  id: string;
  meeting_profile: string;
  guest_name: string;
  guest_email: string;
  guest_notes: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  timezone: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  daily_room_name: string;
  daily_room_url: string;
  host_name: string;
  created_at: string;
  updated_at: string;
}

class MeetingService {
  // Profile
  async getProfile(): Promise<MeetingProfile> {
    const response = await apiService.get<MeetingProfile>('/admin/meetings/profile/');
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async updateProfile(data: Partial<MeetingProfile>): Promise<MeetingProfile> {
    const response = await apiService.put<MeetingProfile>('/admin/meetings/profile/', data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  // Availability
  async getAvailability(): Promise<MeetingAvailability[]> {
    const response = await apiService.get<MeetingAvailability[]>('/admin/meetings/availability/');
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async createAvailability(data: Omit<MeetingAvailability, 'id'>): Promise<MeetingAvailability> {
    const response = await apiService.post<MeetingAvailability>('/admin/meetings/availability/', data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async deleteAvailability(id: string): Promise<void> {
    const response = await apiService.delete(`/admin/meetings/availability/?id=${id}`);
    if (response.error) throw new Error(response.error);
  }

  // Date Overrides
  async getOverrides(): Promise<MeetingDateOverride[]> {
    const response = await apiService.get<MeetingDateOverride[]>('/admin/meetings/overrides/');
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async createOverride(data: Omit<MeetingDateOverride, 'id'>): Promise<MeetingDateOverride> {
    const response = await apiService.post<MeetingDateOverride>('/admin/meetings/overrides/', data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async deleteOverride(id: string): Promise<void> {
    const response = await apiService.delete(`/admin/meetings/overrides/?id=${id}`);
    if (response.error) throw new Error(response.error);
  }

  // Bookings
  async getBookings(params?: {
    status?: string;
    date_from?: string;
    date_to?: string;
    upcoming?: string;
  }): Promise<MeetingBooking[]> {
    let url = '/admin/meetings/bookings/';
    if (params) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
      const qsStr = qs.toString();
      if (qsStr) url += `?${qsStr}`;
    }
    const response = await apiService.get<MeetingBooking[]>(url);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async createBooking(data: {
    guest_name: string;
    guest_email: string;
    guest_notes?: string;
    start_time: string;
    duration_minutes: number;
    timezone: string;
    send_email: boolean;
  }): Promise<MeetingBooking> {
    const response = await apiService.post<MeetingBooking>('/admin/meetings/bookings/create/', data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async updateBookingStatus(id: string, status: 'cancelled' | 'completed'): Promise<MeetingBooking> {
    const response = await apiService.patch<MeetingBooking>(`/admin/meetings/bookings/${id}/`, { status });
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async getHostToken(bookingId: string): Promise<{ token: string; room_url: string; room_name: string }> {
    const response = await apiService.get<{ token: string; room_url: string; room_name: string }>(
      `/admin/meetings/bookings/${bookingId}/host-token/`
    );
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  // Instant Meeting
  async startInstantMeeting(): Promise<{
    booking_id: string;
    token: string;
    room_url: string;
    room_name: string;
    guest_link: string;
  }> {
    const response = await apiService.post<{
      booking_id: string;
      token: string;
      room_url: string;
      room_name: string;
      guest_link: string;
    }>('/admin/meetings/instant-start/', {});
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  // Google Calendar
  async getGoogleAuthUrl(): Promise<{ auth_url: string }> {
    const response = await apiService.get<{ auth_url: string }>('/admin/meetings/google/auth-url/');
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async disconnectGoogle(): Promise<void> {
    const response = await apiService.post('/admin/meetings/google/disconnect/', {});
    if (response.error) throw new Error(response.error);
  }
}

const meetingService = new MeetingService();
export default meetingService;
