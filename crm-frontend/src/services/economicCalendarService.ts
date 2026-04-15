/**
 * Economic Calendar Service
 * API service for economic calendar events and sync operations
 */

import { apiService } from './apiService';
import type {
  EconomicEvent,
  EconomicEventCreateData,
  EconomicEventUpdateData,
  EconomicEventFilters,
  SyncSchedule,
  HighImpactEventsResponse,
  SyncResult,
} from '@/lib/types/economicCalendar';

class EconomicCalendarService {
  private baseEndpoint = '/admin/economic-calendar';

  /**
   * Get all economic events with optional filters
   */
  async getAll(filters?: EconomicEventFilters): Promise<EconomicEvent[]> {
    let endpoint = `${this.baseEndpoint}/`;

    // Build query string from filters
    const params = new URLSearchParams();
    if (filters) {
      if (filters.currency) params.append('currency', filters.currency);
      if (filters.impact) params.append('impact', filters.impact);
      if (filters.source) params.append('source', filters.source);
      if (filters.is_active !== undefined) params.append('is_active', String(filters.is_active));
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.high_impact_only) params.append('high_impact_only', 'true');
    }

    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    const response = await apiService.get<EconomicEvent[]>(endpoint);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  }

  /**
   * Get a single economic event by ID
   */
  async get(id: string): Promise<EconomicEvent> {
    const response = await apiService.get<EconomicEvent>(`${this.baseEndpoint}/${id}/`);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  /**
   * Create a new economic event (admin only)
   */
  async create(data: EconomicEventCreateData): Promise<EconomicEvent> {
    const response = await apiService.post<EconomicEvent>(`${this.baseEndpoint}/`, data);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  /**
   * Update an existing economic event (admin only)
   */
  async update(id: string, data: EconomicEventUpdateData): Promise<EconomicEvent> {
    const response = await apiService.patch<EconomicEvent>(`${this.baseEndpoint}/${id}/`, data);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  /**
   * Delete an economic event (admin only)
   */
  async delete(id: string): Promise<void> {
    const response = await apiService.delete(`${this.baseEndpoint}/${id}/`);
    if (response.error) {
      throw new Error(response.error);
    }
  }

  /**
   * Toggle event active status (admin only)
   */
  async toggleActive(id: string): Promise<{ id: string; is_active: boolean; message: string }> {
    const response = await apiService.post<{ id: string; is_active: boolean; message: string }>(
      `${this.baseEndpoint}/${id}/toggle_active/`
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  /**
   * Trigger manual sync from Forex Factory API (admin only)
   */
  async triggerSync(): Promise<{ status: string; message: string; result: SyncResult }> {
    const response = await apiService.post<{ status: string; message: string; result: SyncResult }>(
      `${this.baseEndpoint}/sync/`
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  /**
   * Get sync schedule status
   */
  async getSyncStatus(): Promise<SyncSchedule> {
    const response = await apiService.get<SyncSchedule>(`${this.baseEndpoint}/sync_status/`);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  /**
   * Get high-impact events for Events tab (grouped by upcoming/past)
   */
  async getHighImpactEvents(currency?: string): Promise<HighImpactEventsResponse> {
    let endpoint = `${this.baseEndpoint}/high_impact/`;
    if (currency) {
      endpoint += `?currency=${currency}`;
    }

    const response = await apiService.get<HighImpactEventsResponse>(endpoint);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }
}

export const economicCalendarService = new EconomicCalendarService();
