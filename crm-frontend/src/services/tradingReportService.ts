import { apiService } from './apiService';
import type {
  TradingReport,
  TradingReportListItem,
  TradingReportConfig,
  TradingReportFilters,
  GenerateReportParams,
} from '@/lib/types/tradingReports';

class TradingReportService {
  private baseEndpoint = '/admin/trading-reports';

  async getReports(filters?: TradingReportFilters): Promise<TradingReportListItem[]> {
    let endpoint = `${this.baseEndpoint}/`;

    const params = new URLSearchParams();
    if (filters) {
      if (filters.period_type) params.append('period_type', filters.period_type);
      if (filters.is_auto_generated !== undefined) params.append('is_auto_generated', String(filters.is_auto_generated));
    }

    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    const response = await apiService.get<TradingReportListItem[]>(endpoint);
    if (response.error) throw new Error(response.error);
    return response.data || [];
  }

  async getReport(id: number): Promise<TradingReport> {
    const response = await apiService.get<TradingReport>(`${this.baseEndpoint}/${id}/`);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async generateReport(params: GenerateReportParams): Promise<TradingReport> {
    const response = await apiService.post<TradingReport>(`${this.baseEndpoint}/generate/`, params);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async getAnonymized(id: number): Promise<TradingReport> {
    const response = await apiService.get<TradingReport>(`${this.baseEndpoint}/${id}/anonymized/`);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async getConfig(): Promise<TradingReportConfig> {
    const response = await apiService.get<TradingReportConfig>(`${this.baseEndpoint}/config/`);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }

  async updateConfig(data: Partial<TradingReportConfig>): Promise<TradingReportConfig> {
    const response = await apiService.put<TradingReportConfig>(`${this.baseEndpoint}/config/`, data);
    if (response.error) throw new Error(response.error);
    return response.data!;
  }
}

export const tradingReportService = new TradingReportService();
