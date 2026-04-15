// Types for Django Payout Details API

export interface PayoutMT5Trade {
  id: number;
  rrr: number | null;
  account_id: number;
  order: string;
  timestamp: string;
  symbol: string;
  digits: number;
  volume: number;
  cmd: string;
  open_time: string;
  close_time: string;
  open_price: number;
  close_price: number;
  profit: number;
  sl?: number;
  stop_loss?: number;
  tp?: number;
  take_profit?: number;
  commission?: number;
  commission_agent?: number;
  storage?: number;
  taxes?: number;
  value_date?: number;
  expiration?: number;
  conv_reserv?: number;
  open_conv_rate?: number;
  close_conv_rate?: number;
  magic?: number;
  comment?: string;
  spread?: number;
  margin_rate?: number;
  is_closed?: boolean;
  created_at?: string;
}

export interface PayoutBreach {
  rule: string;
  reason: string;
  breached_at: string;
}

export interface PayoutSoftBreach {
  rule: string;
  severity: string;
  value: number;
  description: string;
  detected_at: string;
  resolved: boolean;
}

export interface PayoutAITradingReview {
  summary: string;
  trading_style: string;
  risk_assessment: string;
  recommendation: string;
}

export interface PayoutAccountTradeHistory {
  phase_type: string;
  account_id: string;
  status: string;
  trades: PayoutMT5Trade[];
}

export interface PayoutHistoryItem {
  id: string;
  amount: string;
  profit: string;
  profit_share: string;
  net_profit: string;
  released_fund: string;
  method: string;
  status: string;
  requested_at: string;
  reviewed_at?: string;
  paid_at?: string;
}

export interface PayoutDetailsResponse {
  id: string;
  enrollment_id?: string;
  trader_user_id?: number;
  trader_name: string;
  trader_email: string;
  challenge_type: string;
  challenge_start_date: string;
  challenge_status: string;
  account_size: number;
  mt5_account_id: string;
  current_balance: number;
  total_profit_loss: number;
  total_trades: number;
  win_rate: number;
  net_profit: number;
  average_win: number;
  average_loss: number;
  average_trade_duration: number;
  total_breaches: number;
  soft_breaches: PayoutSoftBreach[];
  hard_breaches: PayoutBreach[];
  risk_score: number;
  ai_recommendations: string;
  ai_trading_review: PayoutAITradingReview;
  trade_history: PayoutAccountTradeHistory[];
  payout_history?: PayoutHistoryItem[];
  
  // Current payout request details
  amount: string;
  profit: string;
  profit_share: string;
  released_fund: string;
  method: string;
  method_details?: {
    crypto_type?: string | null;
    wallet_address?: string | null;
  };
  status: string;
  admin_note?: string | null;
  rejection_reason?: string | null;
  is_custom_amount?: boolean;
  exclude_amount?: string | null;
  exclude_reason?: string | null;
  requested_at: string;
  reviewed_at?: string | null;
  paid_at?: string | null;
}