import { apiService } from './apiService';
import type { BetaFeature, BetaFeatureFormData, ChangeStatusData } from '@/lib/types/betaFeature';

const BASE_URL = '/admin/beta-features';

export const betaFeatureService = {
  getAll: async (): Promise<BetaFeature[]> => {
    const response = await apiService.get<BetaFeature[]>(`${BASE_URL}/`);
    return response.data || [];
  },

  getById: async (id: string): Promise<BetaFeature> => {
    const response = await apiService.get<BetaFeature>(`${BASE_URL}/${id}/`);
    if (!response.data) {
      throw new Error('Feature not found');
    }
    return response.data;
  },

  create: async (data: BetaFeatureFormData): Promise<BetaFeature> => {
    const response = await apiService.post<BetaFeature>(`${BASE_URL}/`, data);
    if (!response.data) {
      throw new Error('Failed to create feature');
    }
    return response.data;
  },

  update: async (id: string, data: Partial<BetaFeatureFormData>): Promise<BetaFeature> => {
    const response = await apiService.patch<BetaFeature>(`${BASE_URL}/${id}/`, data);
    if (!response.data) {
      throw new Error('Failed to update feature');
    }
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiService.delete(`${BASE_URL}/${id}/`);
  },

  changeStatus: async (id: string, data: ChangeStatusData): Promise<{ message: string; old_status: string; new_status: string }> => {
    const response = await apiService.post<{ message: string; old_status: string; new_status: string }>(
      `${BASE_URL}/${id}/change-status/`,
      data
    );
    if (!response.data) {
      throw new Error('Failed to change status');
    }
    return response.data;
  },
};
