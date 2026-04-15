import { apiService } from './apiService';
import { EventLog, EventLogFilters, EventLogResponse } from '@/lib/types/eventLog';

export const eventLogService = {
  async getEventLogs(filters?: EventLogFilters): Promise<EventLogResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.date_from) params.append('timestamp_after', filters.date_from);
      if (filters.date_to) params.append('timestamp_before', filters.date_to);
      if (filters.category) params.append('category', filters.category);
      if (filters.event_type) params.append('event_type', filters.event_type);
      if (filters.user) params.append('user', filters.user);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.page_size) params.append('page_size', filters.page_size.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.ordering) params.append('ordering', filters.ordering);
    }

    const queryString = params.toString();
    const endpoint = `/admin/event-logs/${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiService.get<EventLogResponse>(endpoint);
    return response.data!;
  },

  async getEventLogDetail(id: string): Promise<EventLog> {
    const response = await apiService.get<EventLog>(`/admin/event-logs/${id}/`);
    return response.data!;
  },

  async getUserEventLogs(userId: string, filters?: { category?: string }): Promise<EventLog[]> {
    const params = new URLSearchParams();

    if (filters?.category) {
      params.append('category', filters.category);
    }

    const queryString = params.toString();
    const endpoint = `/admin/users/event-logs/${userId}/${queryString ? `?${queryString}` : ''}`;
    const response = await apiService.get<EventLog[]>(endpoint);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data || [];
  },
};
