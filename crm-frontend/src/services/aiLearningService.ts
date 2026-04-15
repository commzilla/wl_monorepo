import { apiService } from './apiService';
import type {
  AILearningStats,
  AIAnalysisWithFeedback,
  AITrainingExample,
  AIAnalysisFilters,
  PaginatedResponse
} from '@/lib/types/aiLearning';

const BASE_URL = '/admin/ai-risk-learning';

export const aiLearningService = {
  getStats: async (): Promise<AILearningStats> => {
    const response = await apiService.get<AILearningStats>(`${BASE_URL}/stats/`);
    if (!response.data) {
      throw new Error('Failed to fetch stats');
    }
    return response.data;
  },

  getAnalyses: async (filters?: AIAnalysisFilters): Promise<PaginatedResponse<AIAnalysisWithFeedback>> => {
    let endpoint = `${BASE_URL}/analyses/`;

    if (filters) {
      const params = new URLSearchParams();
      if (filters.has_feedback !== undefined) {
        params.append('has_feedback', String(filters.has_feedback));
      }
      if (filters.is_training_example !== undefined) {
        params.append('is_training_example', String(filters.is_training_example));
      }
      if (filters.human_agrees_with_ai !== undefined) {
        params.append('human_agrees_with_ai', String(filters.human_agrees_with_ai));
      }
      if (filters.ai_recommendation) {
        params.append('ai_recommendation', filters.ai_recommendation);
      }
      if (filters.start_date) {
        params.append('start_date', filters.start_date);
      }
      if (filters.end_date) {
        params.append('end_date', filters.end_date);
      }
      if (filters.page) {
        params.append('page', String(filters.page));
      }
      if (filters.page_size) {
        params.append('page_size', String(filters.page_size));
      }

      const queryString = params.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }
    }

    const response = await apiService.get<PaginatedResponse<AIAnalysisWithFeedback>>(endpoint);
    if (!response.data) {
      return { count: 0, next: null, previous: null, results: [] };
    }
    return response.data;
  },

  getTrainingExamples: async (): Promise<AITrainingExample[]> => {
    const response = await apiService.get<AITrainingExample[]>(`${BASE_URL}/training/`);
    return response.data || [];
  },

  approveForTraining: async (id: string): Promise<{ status: string; id: string }> => {
    const response = await apiService.post<{ status: string; id: string }>(
      `${BASE_URL}/training/${id}/approve/`
    );
    if (!response.data) {
      throw new Error('Failed to approve for training');
    }
    return response.data;
  },

  rejectFromTraining: async (id: string, reason?: string): Promise<{ status: string; id: string }> => {
    const response = await apiService.post<{ status: string; id: string }>(
      `${BASE_URL}/training/${id}/reject/`,
      { reason }
    );
    if (!response.data) {
      throw new Error('Failed to reject from training');
    }
    return response.data;
  },

  submitFeedback: async (
    analysisId: string,
    feedback: { human_decision: string; notes?: string }
  ): Promise<{ status: string }> => {
    const response = await apiService.post<{ status: string }>(
      `/admin/ai-risk-analysis/feedback/${analysisId}/`,
      feedback
    );
    if (!response.data) {
      throw new Error('Failed to submit feedback');
    }
    return response.data;
  },
};
