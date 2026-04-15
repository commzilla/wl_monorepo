import { apiService } from './apiService';
import type { AutoRewardRule, CreateAutoRewardRuleData, UpdateAutoRewardRuleData } from '@/lib/types/autoRewardRule';

export const autoRewardRuleService = {
  getRules: async (params?: { search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);

    const endpoint = `/admin/reward/auto-rules/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiService.get<AutoRewardRule[]>(endpoint);
    if (response.error) throw new Error(response.error);
    return response;
  },

  createRule: async (data: CreateAutoRewardRuleData) => {
    const response = await apiService.post<AutoRewardRule>('/admin/reward/auto-rules/', data);
    if (response.error) throw new Error(response.error);
    return response;
  },

  updateRule: async (id: string, data: UpdateAutoRewardRuleData) => {
    const response = await apiService.patch<AutoRewardRule>(`/admin/reward/auto-rules/${id}/`, data);
    if (response.error) throw new Error(response.error);
    return response;
  },

  deleteRule: async (id: string) => {
    const response = await apiService.delete(`/admin/reward/auto-rules/${id}/`);
    if (response.error) throw new Error(response.error);
    return response;
  },
};
