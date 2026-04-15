import { apiService } from './apiService';
import { InternalNote, InternalNoteSummary, CreateInternalNoteRequest, UpdateInternalNoteRequest } from '@/lib/types/internalNotes';

class InternalNotesService {
  async getInternalNotes(contentType: string, objectId: string): Promise<InternalNote[]> {
    const response = await apiService.get<{ results: InternalNote[]; count: number } | InternalNote[]>(
      `/admin/internal-notes/?content_type=${contentType}&object_id=${objectId}&page_size=200`
    );

    if (response.error) {
      throw new Error(response.error);
    }

    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    return data?.results || [];
  }

  async getNotesByTrader(traderId: string): Promise<InternalNote[]> {
    const response = await apiService.get<{ results: InternalNote[]; count: number } | InternalNote[]>(
      `/admin/internal-notes/?trader_id=${traderId}&page_size=200`
    );

    if (response.error) {
      throw new Error(response.error);
    }

    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    return data?.results || [];
  }

  async getNoteSummary(contentType: string, objectId: string): Promise<InternalNoteSummary> {
    const response = await apiService.get<InternalNoteSummary>(
      `/admin/internal-notes/summary/?content_type=${contentType}&object_id=${objectId}`
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data || { total_count: 0, has_high_risk: false, category_counts: {}, latest_notes: [] };
  }

  async getNoteSummaryByTrader(traderId: string): Promise<InternalNoteSummary> {
    const response = await apiService.get<InternalNoteSummary>(
      `/admin/internal-notes/summary/?trader_id=${traderId}`
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data || { total_count: 0, has_high_risk: false, category_counts: {}, latest_notes: [] };
  }

  async createInternalNote(request: CreateInternalNoteRequest): Promise<InternalNote> {
    const response = await apiService.post<InternalNote>('/admin/internal-notes/', request);

    if (response.error) {
      throw new Error(response.error || `Failed to create internal note (HTTP ${response.status})`);
    }

    if (!response.data) {
      throw new Error('No data returned from API');
    }

    return response.data;
  }

  async updateInternalNote(noteId: string, request: UpdateInternalNoteRequest): Promise<InternalNote> {
    const response = await apiService.patch<InternalNote>(`/admin/internal-notes/${noteId}/`, request);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  }

  async deleteInternalNote(noteId: string): Promise<void> {
    const response = await apiService.delete(`/admin/internal-notes/${noteId}/`);

    if (response.error) {
      throw new Error(response.error);
    }
  }
}

export const internalNotesService = new InternalNotesService();
