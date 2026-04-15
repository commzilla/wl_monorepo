export interface PayoutReachRates {
  "1st": number;
  "2nd": number;
  "3rd": number;
  "4th": number;
}

export interface PayoutsByChallenge {
  challenge__step_type: string;
  total_value: number;
  count: number;
}

export interface TopRepeatWithdrawer {
  trader__id: string;
  trader__first_name: string;
  trader__last_name: string;
  withdrawal_count: number;
  total_net: number;
  total_client_share: number;
}

export interface PayoutsByCountry {
  trader__profile__country: string;
  total: number;
  count: number;
}

export interface StepTypeBreakdown {
  challenge__step_type: string;
  total_value: number;
  count: number;
  avg_value: number;
}

export interface AccountSizeBreakdown {
  account_size: number;
  total_value: number;
  count: number;
  avg_value: number;
}

export interface PeriodTrends {
  total_payouts_value: number;
  num_payouts: number;
  avg_payouts_value: number;
}

export type QuickDateFilter = 'all' | 'today' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';

export interface PayoutDateFilterParams {
  quick?: QuickDateFilter;
  date_from?: string;
  date_to?: string;
}

export interface PayoutAnalyticsData {
  total_payouts_value: number;
  avg_payouts_value: number;
  num_payouts: number;
  total_withdrawable_profits: number;
  total_withdrawable_net: number;
  avg_profit_split: number;
  payout_reach_rates: PayoutReachRates;
  repeat_withdrawal_rate: number;
  payouts_by_challenge: PayoutsByChallenge[];
  last_month_payouts: number;
  current_month_payouts: number;
  total_funded_value: number;
  approved_withdrawals_value: number;
  paid_withdrawals_value: number;
  pending_withdrawals_value: number;
  declined_withdrawals_value: number;
  top_repeat_withdrawers: TopRepeatWithdrawer[];
  payouts_by_country: PayoutsByCountry[];
  date_filter_applied: boolean;
  previous_period: PeriodTrends;
  trends: PeriodTrends;
  step_type_breakdown: StepTypeBreakdown[];
  account_size_breakdown: AccountSizeBreakdown[];
}
