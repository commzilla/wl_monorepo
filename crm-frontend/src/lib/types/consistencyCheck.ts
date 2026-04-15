// Types for Consistency Check API

// New API response structure
export interface ConsistencySummaryNew {
  daily_deductions: number;
  total_deductions: number;
  total_lot_violations: number;
  aggregated_deductions: number;
  total_daily_violations: number;
  single_trade_deductions: number;
  total_aggregated_violations: number;
  total_single_trade_violations: number;
}

export interface ConsistencyClassificationNew {
  status: string;
  verdict: 'pass' | 'reject' | 'not_applicable';
  severity_level: string;
  deduction_percentage: number;
}

export interface ConsistencyRecommendationsNew {
  action: string;
  account_status: string;
  internal_notes: string;
  message_to_trader: string;
}

export interface ConsistencyFinancialSummary {
  adjusted_profit: number;
  total_deductions: number;
  total_cycle_profit: number;
  deduction_percentage: number;
  threshold_30_percent: number;
}

export interface ConsistencyPayoutCalculationNew {
  payout_status: string;
  adjusted_profit: number;
  approved_payout: number;
  original_profit: number;
  total_deductions: number;
}

export interface DailyViolation {
  date: string;
  profit: number;
  threshold: number;
  deduction: number;
  percentage_of_total: number;
}

export interface SingleTradeViolationNew {
  date: string;
  time: string;
  symbol: string;
  deduction: number;
  threshold: number;
  ticket_id: number;
  exceeded_by: number;
  trade_profit: number;
  percentage_of_total: number;
}

export interface AggregatedTradeViolationNew {
  tickets: number[];
  combined_profit: number;
  threshold: number;
  deduction: number;
}

export interface LotSizeViolationNew {
  symbol: string;
  lot_size: number;
  severity: string;
  ticket_id: number;
  average_lot: number;
  max_allowed: number;
  min_allowed: number;
  violation_type: string;
}

export interface ConsistencyAnalysisNew {
  summary: ConsistencySummaryNew;
  applicable: boolean;
  account_type: string;
  classification: ConsistencyClassificationNew;
  recommendations: ConsistencyRecommendationsNew;
  daily_violations: DailyViolation[];
  financial_summary: ConsistencyFinancialSummary;
  payout_calculation: ConsistencyPayoutCalculationNew;
  lot_size_violations: LotSizeViolationNew[];
  reason_not_applicable: string | null;
  single_trade_violations: SingleTradeViolationNew[];
  aggregated_trade_violations: AggregatedTradeViolationNew[];
}

export interface ConsistencyAnalysisWrapper {
  consistency_analysis: ConsistencyAnalysisNew;
}

export interface ConsistencyCheckResponse {
  message: string;
  already_generated: boolean;
  report_id: string;
  account_id?: string;
  account_type?: string;
  verdict: 'pass' | 'reject' | 'not_applicable';
  approved_amount: number;
  deduction_percentage: number;
  payout_status: string;
  reason: string;
  created_at?: string;
  
  // New fields from updated backend
  analysis?: ConsistencyAnalysisWrapper;
  ai_request?: Record<string, unknown> | null;
  ai_raw_response?: string | null;
  ai_parsed_response?: Record<string, unknown> | null;
}
