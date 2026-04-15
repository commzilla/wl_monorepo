// Types for Challenge Enrollment Review API

export interface AddressInfo {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state?: string;
  postcode?: string;
  country: string;
}

export interface ClientProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  kyc_status: string;
  address_info?: AddressInfo;
}

export interface EnrollmentData {
  id: string;
  challenge_name: string;
  step_type: string;
  account_size: number;
  currency: string;
  status: string;
  start_date: string;
  completed_date?: string;
  live_start_date?: string;
  latest_breach?: {
    rule: string;
    reason: string;
    previous_state: any;
    breached_at: string;
  };
}

export interface Phase {
  phase_type: string;
  trading_period: string;
  min_trading_days: string;
  max_daily_loss: number;
  max_loss: number;
  profit_target?: number;
  is_current: boolean;
  current_balance?: number;
  profit_target_left?: number;
  max_daily_loss_left?: number;
  max_total_loss_left?: number;
  daily_pnl?: number;
  max_daily_loss_time_remaining?: string;
  daily_starting_balance?: number;
  daily_starting_equity?: number;
}

export interface Trade {
  order: number;
  symbol: string;
  cmd: number;
  volume: number;
  open_time: string;
  open_price: number;
  close_time: string;
  close_price: number;
  sl?: number;
  tp?: number;
  rrr?: number;
  profit: number;
  commission: number;
  comment: string;
}

export interface Account {
  id: string;
  phase_type: string;
  status: string;
  mt5_account_id: string;
  balance?: number;
  trades: Trade[];
}

export interface EnrollmentReviewResponse {
  client_profile: ClientProfile;
  enrollment: EnrollmentData;
  phases: Phase[];
  accounts: Account[];
  latest_breach?: {
    rule: string;
    reason: string;
    previous_state: any;
    breached_at: string;
  };
}

// Open Trades types
export interface OpenTrade {
  order: number;
  symbol: string;
  cmd: number;
  volume: number;
  open_time: string;
  open_price: number;
  sl?: number;
  tp?: number;
  profit: number;
  swap: number;
  commission: number;
  comment: string;
}

export interface OpenTradesResponse {
  enrollment_id: string;
  mt5_account_id: string;
  open_trades: OpenTrade[];
}

export interface CloseTradesResponse {
  success: boolean;
  message?: string;
  error?: string;
  systemErrorStatus?: string;
  enrollment_id: string;
  mt5_account_id: string;
}

// Funds API types
export interface FundsRequest {
  action: "deposit" | "withdraw";
  amount: number;
  comment?: string;
}

export interface FundsResponse {
  success: boolean;
  message?: string;
  error?: string;
  enrollment_id: string;
  mt5_account_id: string;
  amount: number;
  action: string;
}

// Block Account API types
export interface BlockAccountRequest {
  title: string;
  explanation: string;
}

export interface BlockAccountResponse {
  success: boolean;
  message?: string;
  error?: string;
  enrollment_id: string;
  mt5_account_id: string;
  breach_id?: string;
}

// Broken Details API types
export interface AccountDetails {
  phase: string;
  broker_type: string;
  mt5_account_id: string;
  password: string;
  investor_password: string;
}

export interface BrokerDetailsResponse {
  challenge_id: string;
  accounts: AccountDetails[];
}

// MT5 Account Details API types
export interface MT5AccountDetailsResponse {
  success: boolean;
  enrollment_id: string;
  mt5_account_id: string;
  account_details?: any; // MT5 account details object
  applicationStatus?: string;
  error?: string;
}

// Snapshot API types
export interface MT5DailySnapshot {
  id: string;
  date: string;
  account_id: string;
  enrollment_id: string;
  client_name: string;
  challenge_name: string;
  starting_balance: number;
  starting_equity: number;
  ending_balance: number;
  ending_equity: number;
  today_profit: number;
  total_profit: number;
  today_max_drawdown: number;
  total_max_drawdown: number;
  daily_loss_used: number;
  total_loss_used: number;
  created_at: string;
  updated_at: string;
}

export interface SnapshotsResponse {
  enrollment_id: string;
  challenge_name: string;
  client_name: string;
  snapshots: MT5DailySnapshot[];
}

// Legacy types for backward compatibility
export interface CurrentPhase extends Phase {}
export interface MT5Trade extends Trade {}
export interface AccountData extends Account {}