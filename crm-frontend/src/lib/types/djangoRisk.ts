// Types for Django Risk Management API

export interface SoftBreach {
  id: string;
  account_id: number;
  user_id: string;
  user_name: string;
  rule: string;
  severity: string;
  value: number | null;
  description: string | null;
  detected_at: string;
  resolved: boolean;
  resolved_at: string | null;
}

export interface HardBreach {
  id: number | string;
  user_id?: string;
  user_name?: string;
  account_id?: number;
  rule: string;
  reason: string;
  breached_at: string;
  reverted?: boolean;
  evidence?: BreachEvidence | null;
}

export interface BreachEvidencePosition {
  id: string;
  ticket: number;
  symbol: string;
  side: string;
  volume: string;
  open_price: string | null;
  current_price: string | null;
  sl: string | null;
  tp: string | null;
  profit: string | null;
  swap: string | null;
  commission: string | null;
  opened_at: string | null;
  magic: number | null;
  comment: string;
  created_at: string;
}

export interface BreachEvidence {
  id: string;
  account_id: number | null;
  captured_at: string;
  broker_time: string | null;
  created_at: string;
  equity: string | null;
  balance: string | null;
  margin: string | null;
  free_margin: string | null;
  start_balance: string | null;
  threshold: string | null;
  max_loss_amount: string | null;
  max_loss_percent: string | null;
  equity_payload: any;
  positions_count: number;
  positions_payload: any;
  positions: BreachEvidencePosition[];
}

export interface BreachPagination {
  count: number;
  next: string | null;
  previous: string | null;
  current_page: number;
  total_pages: number;
}

export interface RiskDashboardOverview {
  soft_breaches_total: number;
  soft_breaches_active: number;
  hard_breaches_total: number;
  hard_breaches_active: number;
}

export interface RiskDashboardResponse {
  overview: RiskDashboardOverview;
  soft_breaches: SoftBreach[];
  soft_breaches_pagination: BreachPagination;
  hard_breaches: HardBreach[];
  hard_breaches_pagination: BreachPagination;
}

export interface SoftBreachesResponse {
  results: SoftBreach[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface HardBreachesResponse {
  results: HardBreach[];
  count: number;
  next: string | null;
  previous: string | null;
}
