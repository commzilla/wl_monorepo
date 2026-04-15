export interface TraderJourneyFilters {
  program?: string;
  country?: string;
  account_size?: string;
  quick_date?: string;
  from_date?: string;
  to_date?: string;
  trade_from?: string;
  trade_to?: string;
}

export interface TraderJourneyOverview {
  orders: number;
  starts: number;
  phase1_pass: number;
  phase2_pass: number;
  live: number;
  payout_accounts: number;
  breached_accounts: number;
}

export interface TraderJourneyConversions {
  buy_to_start_pct: number;
  start_to_phase1_pct: number;
  phase1_to_phase2_pct: number;
  phase2_to_live_pct: number;
  live_to_payout_pct: number;
  start_to_breach_pct: number;
}

export interface BreachByRule {
  max_daily_loss: number;
  max_total_loss: number;
  Inactivity: number;
}

export interface BreachByPhase {
  phase_1_in_progress: number;
  phase_2_in_progress: number;
  live_in_progress: number;
}

export interface TraderJourneyBreaches {
  total: number;
  by_rule: BreachByRule;
  by_phase: BreachByPhase;
}

export interface TraderJourneyResponse {
  filters: TraderJourneyFilters;
  overview: TraderJourneyOverview;
  conversions: TraderJourneyConversions;
  breaches: TraderJourneyBreaches;
}
