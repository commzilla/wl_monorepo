import { apiService } from './apiService';
import { TrendsAnalyticsResponse } from '@/lib/types/trendsAnalytics';

export const trendsAnalyticsService = {
  getTrendsAnalytics: async (): Promise<TrendsAnalyticsResponse> => {
    const response = await apiService.get<TrendsAnalyticsResponse>('/admin/analytics/trends/');
    return response.data!;
  },
};
