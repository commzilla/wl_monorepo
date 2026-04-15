import { apiService } from './apiService';
import { RiskCoreMetricsResponse, RiskCoreMetricsFilters } from '@/lib/types/riskCoreMetrics';

class RiskCoreMetricsService {
  async getRiskCoreMetrics(filters?: RiskCoreMetricsFilters): Promise<RiskCoreMetricsResponse> {
    const params = new URLSearchParams();
    
    if (filters?.program) {
      params.append('program', filters.program);
    }
    if (filters?.country) {
      params.append('country', filters.country);
    }
    if (filters?.account_size) {
      params.append('account_size', filters.account_size);
    }

    const queryString = params.toString();
    const endpoint = queryString 
      ? `/admin/analytics/risk/core-metrics/?${queryString}`
      : '/admin/analytics/risk/core-metrics/';

    const response = await apiService.get<RiskCoreMetricsResponse>(endpoint);
    return response.data!;
  }
}

export const riskCoreMetricsService = new RiskCoreMetricsService();
