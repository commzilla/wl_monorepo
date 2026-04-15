export interface PayoutPolicy {
  id: string;
  challenge: string;
  challenge_name: string;
  step_type: string;
  first_payout_delay_days: number;
  subsequent_cycle_days: number;
  min_net_amount: string;
  base_share_percent: string;
  is_active: boolean;
  max_payouts: number;
  min_trading_days: number;
  split_tiers: PayoutSplitTier[];
}

export interface PayoutSplitTier {
  id: string;
  policy: string;
  from_payout_number: number;
  to_payout_number: number | null;
  share_percent: string;
}

export interface CreatePayoutPolicyData {
  challenge: string;
  first_payout_delay_days: number;
  subsequent_cycle_days: number;
  min_net_amount: string;
  base_share_percent: string;
  is_active: boolean;
  max_payouts: number;
  min_trading_days: number;
}

export interface CreatePayoutSplitTierData {
  policy: string;
  from_payout_number: number;
  to_payout_number: number | null;
  share_percent: string;
}