import { apiService } from './apiService';
import type { CompetitionsBetaAccess, CompetitionsBetaAccessFilters, DeclineCompetitionsRequestData } from '@/lib/types/competitionsBetaAccess';

const BASE_URL = '/admin/competitions-beta';

export const competitionsBetaAccessService = {
  getAll: async (filters?: CompetitionsBetaAccessFilters): Promise<CompetitionsBetaAccess[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    
    const url = queryParams.toString() ? `${BASE_URL}/?${queryParams}` : `${BASE_URL}/`;
    console.log('[CompetitionsBetaAccess] Fetching from:', url);
    const response = await apiService.get<CompetitionsBetaAccess[]>(url);
    console.log('[CompetitionsBetaAccess] Response:', response);
    return response.data || [];
  },

  approve: async (id: string): Promise<{ detail: string }> => {
    const response = await apiService.post<{ detail: string }>(
      `${BASE_URL}/${id}/approve/`
    );
    if (!response.data) {
      throw new Error('Failed to approve request');
    }
    return response.data;
  },

  decline: async (id: string, data: DeclineCompetitionsRequestData): Promise<{ detail: string }> => {
    const response = await apiService.post<{ detail: string }>(
      `${BASE_URL}/${id}/decline/`,
      data
    );
    if (!response.data) {
      throw new Error('Failed to decline request');
    }
    return response.data;
  },
};
