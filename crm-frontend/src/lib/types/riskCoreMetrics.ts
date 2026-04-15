export interface RiskCoreMetricsFilters {
  program?: string;
  country?: string;
  account_size?: string;
}

export interface PayoutMetrics {
  payouts_daily: number;
  payouts_weekly: number;
  payouts_monthly: number;
  payout_approval_rate: number;
  average_payout_amount: string;
}

export interface RevenueMetrics {
  revenue_daily: string;
  revenue_weekly: string;
  revenue_monthly: string;
  revenue_vs_payout_ratio: number;
}

export interface TopInstrument {
  symbol: string;
  total: number;
}

export interface TradingBehavior {
  top_instruments: TopInstrument[];
  stop_loss_usage_rate: number;
  avg_payout_vs_avg_volume: number;
}

export interface RiskCoreMetricsResponse {
  available_programs?: string[];
  filters: RiskCoreMetricsFilters;
  payout_metrics: PayoutMetrics;
  revenue_metrics: RevenueMetrics;
  trading_behavior: TradingBehavior;
}
