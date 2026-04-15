export interface TraderBehaviorFilters {
  program?: string;
  country?: string;
  account_size?: string;
  from_date?: string;
  to_date?: string;
  trade_from?: string;
  trade_to?: string;
}

export interface TraderBehaviorSummary {
  total_trades: number;
  total_accounts: number;
  total_traders: number;
  win_rate_pct: number;
  loss_rate_pct: number;
  gross_profit: string;
  gross_loss: string;
  net_profit: string;
  avg_profit_per_trade: string;
  avg_trade_duration_seconds: number;
  avg_trade_duration_human: string;
}

export interface StyleDistribution {
  scalping_trades_pct: number;
  intraday_trades_pct: number;
  swing_trades_pct: number;
}

export interface TraderBehavior {
  sl_usage_pct: number;
  tp_usage_pct: number;
  avg_volume: number;
  symbol_concentration_top3_pct: number;
  style_distribution: StyleDistribution;
  ea_usage_pct: number;
  avg_trades_per_account: number;
}

export interface SymbolStats {
  symbol: string;
  net_profit: string;
  total_trades: number;
  avg_profit_per_trade: string;
}

export interface TraderBehaviorResponse {
  filters: TraderBehaviorFilters;
  summary: TraderBehaviorSummary;
  behavior: TraderBehavior;
  top_profitable_symbols: SymbolStats[];
  top_loss_symbols: SymbolStats[];
}
