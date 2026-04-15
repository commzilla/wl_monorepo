import { apiService } from './apiService';
import type { AIRiskRule, AIRiskRuleFormData } from '@/lib/types/aiRiskRule';

const BASE_URL = '/admin/ai-risk-rules';

export const aiRiskRuleService = {
  getAll: async (): Promise<AIRiskRule[]> => {
    const response = await apiService.get<AIRiskRule[]>(`${BASE_URL}/`);
    return response.data || [];
  },

  getById: async (id: string): Promise<AIRiskRule> => {
    const response = await apiService.get<AIRiskRule>(`${BASE_URL}/${id}/`);
    if (!response.data) {
      throw new Error('Rule not found');
    }
    return response.data;
  },

  create: async (data: AIRiskRuleFormData): Promise<AIRiskRule> => {
    const response = await apiService.post<AIRiskRule>(`${BASE_URL}/`, data);
    if (!response.data) {
      throw new Error('Failed to create rule');
    }
    return response.data;
  },

  update: async (id: string, data: Partial<AIRiskRuleFormData>): Promise<AIRiskRule> => {
    const response = await apiService.patch<AIRiskRule>(`${BASE_URL}/${id}/`, data);
    if (!response.data) {
      throw new Error('Failed to update rule');
    }
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiService.delete(`${BASE_URL}/${id}/`);
  },

  activate: async (id: string): Promise<{ status: string; code: string }> => {
    const response = await apiService.post<{ status: string; code: string }>(
      `${BASE_URL}/${id}/activate/`
    );
    if (!response.data) {
      throw new Error('Failed to activate rule');
    }
    return response.data;
  },

  deactivate: async (id: string): Promise<{ status: string; code: string }> => {
    const response = await apiService.post<{ status: string; code: string }>(
      `${BASE_URL}/${id}/deactivate/`
    );
    if (!response.data) {
      throw new Error('Failed to deactivate rule');
    }
    return response.data;
  },
};
