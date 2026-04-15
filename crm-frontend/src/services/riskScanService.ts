import { apiService } from './apiService';

export interface RiskScanReport {
  message: string;
  report: any;
}

export interface RiskEngineReport {
  payout_id: string;
  has_report: boolean;
  refresh_available: boolean;
  global_score?: number;
  max_severity?: string | null;
  recommended_action?: string | null;
  generated_at?: string | null;
  scan_window?: {
    start: string | null;
    end: string | null;
    is_custom?: boolean;
    last_payout_time?: string | null;
  };
  report?: any;
  detail?: string;
}

export interface RiskScanError {
  error: string;
  details?: string;
}

export interface PayoutAIAnalysisResponse {
  payout_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message?: string;
  llm_model?: string;
  llm_prompt_version?: string;
  stats?: any;
  trade_samples?: any;
  ai_summary?: string;
  ai_trading_style?: any;
  ai_risk_profile?: any;
  ai_consistency?: any;
  ai_recommendations?: any;
  recommendation?: {
    decision?: 'approve' | 'reject' | 'manual_review';
    confidence?: number;
    rationale?: string;
  };
  llm_raw_response?: any;
}

export interface RiskScanParams {
  payoutId: string;
  startDate?: string;
  endDate?: string;
}

export const riskScanService = {
  /**
   * Run Risk Engine v2 for a specific payout ID
   * @param params - Object containing payoutId and optional date filters
   * @returns Risk scan report
   */
  async runRiskScan(params: RiskScanParams): Promise<RiskScanReport> {
    const { payoutId, startDate, endDate } = params;
    
    const payload: Record<string, string> = {
      payout_id: payoutId,
    };
    
    if (startDate) {
      payload.start_date = startDate;
    }
    if (endDate) {
      payload.end_date = endDate;
    }
    
    const response = await apiService.post<RiskScanReport & { error?: string; details?: string }>('/admin/risk-scan/', payload);

    if (response.error) {
      throw new Error(response.error);
    }

    // Check if the API response contains an error object (500 responses may still parse as JSON)
    if (response.data && (response.data as any).error) {
      const errorData = response.data as any;
      const errorMessage = errorData.details 
        ? `${errorData.error}: ${errorData.details}` 
        : errorData.error;
      throw new Error(errorMessage);
    }

    return response.data;
  },

  /**
   * Get Risk Engine v2 report for a specific payout
   * @param payoutId - UUID of the payout
   * @param refresh - Whether to trigger a re-scan
   * @returns Risk engine report
   */
  async getRiskEngineReport(payoutId: string, refresh: boolean = false): Promise<RiskEngineReport> {
    const url = `/admin/risk-engine/payout-report/?payout_id=${payoutId}${refresh ? '&refresh=true' : ''}`;
    const response = await apiService.get<RiskEngineReport>(url);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  /**
   * Get AI Analysis for a specific payout
   * @param payoutId - UUID of the payout
   * @returns AI Analysis response
   */
  async getPayoutAIAnalysis(payoutId: string): Promise<PayoutAIAnalysisResponse> {
    const response = await apiService.get<PayoutAIAnalysisResponse>(`/admin/payout-report/ai-analysis/${payoutId}/`);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  /**
   * Refresh AI Analysis for a specific payout (triggers re-analysis)
   * @param payoutId - UUID of the payout
   * @returns Status response
   */
  async refreshPayoutAIAnalysis(payoutId: string): Promise<{ detail: string; payout_id: string; status: string }> {
    const response = await apiService.post<{ detail: string; payout_id: string; status: string }>(`/admin/payout-report/ai-analysis/${payoutId}/`);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },
};
