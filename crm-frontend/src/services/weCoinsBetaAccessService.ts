import { apiService } from './apiService';
import type { WeCoinsBetaAccess, BetaAccessFilters, DeclineRequestData } from '@/lib/types/weCoinsBetaAccess';

const BASE_URL = '/admin/wecoins/access';

export const weCoinsBetaAccessService = {
  getAll: async (filters?: BetaAccessFilters): Promise<WeCoinsBetaAccess[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    
    const url = queryParams.toString() ? `${BASE_URL}?${queryParams}` : BASE_URL;
    const response = await apiService.get<WeCoinsBetaAccess[]>(url);
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

  decline: async (id: string, data: DeclineRequestData): Promise<{ detail: string }> => {
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
