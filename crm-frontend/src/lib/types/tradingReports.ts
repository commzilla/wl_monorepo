export interface TradingReportEntry {
  rank: number;
  trader_username: string;
  trader_email: string;
  value: number;
  details: Record<string, any>;
}

export interface TradingReportMetric {
  metric_name: string;
  metric_label: string;
  entries: TradingReportEntry[];
}

export interface TradingReport {
  id: number;
  period_type: 'weekly' | 'monthly' | 'custom';
  period_start: string;
  period_end: string;
  generated_at: string;
  generated_by: number | null;
  generated_by_email: string | null;
  data: { metrics: TradingReportMetric[] };
  is_auto_generated: boolean;
  slack_sent: boolean;
}

export interface TradingReportListItem {
  id: number;
  period_type: 'weekly' | 'monthly' | 'custom';
  period_start: string;
  period_end: string;
  generated_at: string;
  generated_by_email: string | null;
  is_auto_generated: boolean;
  slack_sent: boolean;
}

export interface TradingReportConfig {
  is_enabled: boolean;
  slack_webhook_url: string;
  slack_enabled: boolean;
  auto_weekly: boolean;
  auto_monthly: boolean;
  weekly_day: number;
  monthly_day: number;
}

export interface GenerateReportParams {
  period_start: string;
  period_end: string;
  period_type: 'weekly' | 'monthly' | 'custom';
}

export interface TradingReportFilters {
  period_type?: string;
  is_auto_generated?: boolean;
}

export const PERIOD_TYPE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  custom: 'Custom',
};

export const METRIC_ICONS: Record<string, string> = {
  highest_payout: 'DollarSign',
  best_trade: 'TrendingUp',
  best_roi: 'Target',
  most_profitable_trader: 'Trophy',
  most_active_trader: 'Zap',
  fastest_phase_completion: 'Rocket',
  most_traded_pairs: 'BarChart3',
  quickest_2step: 'Timer',
  fastest_to_payout: 'Banknote',
};

export const METRIC_VALUE_SUFFIXES: Record<string, string> = {
  highest_payout: '',
  best_trade: '',
  best_roi: '%',
  most_profitable_trader: '',
  most_active_trader: ' trades',
  fastest_phase_completion: '',
  most_traded_pairs: ' trades',
  quickest_2step: '',
  fastest_to_payout: '',
};
