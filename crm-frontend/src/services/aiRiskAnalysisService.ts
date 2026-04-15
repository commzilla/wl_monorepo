import { apiService } from './apiService';
import { AIRiskAnalysisResponse } from '@/lib/types/aiRiskAnalysis';
import { AIRiskReviewFeedback, AIRiskFeedbackResponse, AIRiskFeedbackSubmitResponse } from '@/lib/types/aiRiskFeedback';

export const aiRiskAnalysisService = {
  async getAnalysis(payoutId: string): Promise<AIRiskAnalysisResponse> {
    const response = await apiService.get<AIRiskAnalysisResponse>(`/admin/ai-risk-analysis/${payoutId}/`);
    // 404 means no analysis exists yet - return structured response
    if (response.error && response.error.includes('404')) {
      return { exists: false, can_scan: true };
    }
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  },

  async runAnalysis(payoutId: string): Promise<AIRiskAnalysisResponse> {
    const response = await apiService.post<AIRiskAnalysisResponse>(`/admin/ai-risk-analysis/${payoutId}/`);
    // 409 means analysis already in progress
    if (response.error && response.error.includes('409')) {
      throw new Error('AI risk analysis already in progress');
    }
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  },

  async getFeedback(analysisId: string): Promise<AIRiskFeedbackResponse> {
    const response = await apiService.get<AIRiskFeedbackResponse>(`/admin/ai-risk-analysis/feedback/${analysisId}/`);
    if (response.error && response.error.includes('404')) {
      return { exists: false };
    }
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  },

  async submitFeedback(analysisId: string, feedback: AIRiskReviewFeedback): Promise<AIRiskFeedbackSubmitResponse> {
    const response = await apiService.post<AIRiskFeedbackSubmitResponse>(`/admin/ai-risk-analysis/feedback/${analysisId}/`, feedback);
    if (response.error && response.error.includes('409')) {
      throw new Error('Feedback already submitted');
    }
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  },

  async exportReport(payoutId: string): Promise<Blob> {
    const response = await apiService.getBlob(`/admin/ai-risk-report/${payoutId}/`);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  },
};
