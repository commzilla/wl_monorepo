export interface PayoutConfiguration {
  id: string;
  enrollment: string;
  client_name: string;
  client_email: string;
  challenge_name: string;
  mt5_account_id: string;
  account_size: number;
  config_type: 'default' | 'custom';
  live_trading_start_date: string;
  profit_share_percent?: number;
  payment_cycle: 'monthly' | 'biweekly' | 'custom_days' | 'custom_interval';
  custom_cycle_days?: number;
  custom_payout_days?: number[];
  first_payout_delay_days?: number;
  subsequent_cycle_days?: number;
  min_net_amount?: number;
  base_share_percent?: number;
  custom_next_withdrawal_datetime?: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  trader_share_percent?: number;
}

export interface CreatePayoutConfigurationData {
  config_type: 'default' | 'custom';
  live_trading_start_date: string;
  profit_share_percent?: number;
  payment_cycle: 'monthly' | 'biweekly' | 'custom_days' | 'custom_interval';
  custom_cycle_days?: number;
  custom_payout_days?: number[];
  first_payout_delay_days?: number;
  subsequent_cycle_days?: number;
  min_net_amount?: number;
  base_share_percent?: number;
  custom_next_withdrawal_datetime?: string;
  is_active: boolean;
  notes?: string;
}

export interface UpdatePayoutConfigurationData extends Partial<CreatePayoutConfigurationData> {}