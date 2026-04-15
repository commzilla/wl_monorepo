export interface DirectionBreakdown {
  cmd: number;
  count: number;
}

export interface TopSymbol {
  symbol: string;
  trade_count: number;
  total_profit: number;
  avg_profit: number;
}

export interface TopAccount {
  account_id: string;
  trade_count: number;
  total_profit: number;
  avg_profit: number;
}

export interface Trade {
  order: string;
  account_id: string;
  symbol: string;
  profit: number;
  volume: number;
  open_price: number;
  close_price: number;
}

export interface ChallengeFunnel {
  total_enrollments: number;
  failed_phase1: number;
  failed_phase2: number;
  reached_live: number;
  live_active: number;
  live_failed: number;
}

export interface TradeAnalyticsData {
  total_live_accounts: number;
  total_trades: number;
  total_profit: number;
  avg_profit_per_trade: number;
  total_commission: number;
  total_storage: number;
  direction_breakdown: DirectionBreakdown[];
  top_symbols: TopSymbol[];
  top_accounts: TopAccount[];
  last_month_trades: number;
  last_month_profit: number;
  current_month_trades: number;
  current_month_profit: number;
  best_trades: Trade[];
  worst_trades: Trade[];
  funnel: ChallengeFunnel;
  avg_live_survival_days: number | null;
}