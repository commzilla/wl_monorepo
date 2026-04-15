// Types for Compliance Analysis API

export interface ComplianceResponsibleTrade {
  id: string;
  ticket_id: string;
  symbol: string;
  direction: string;
  lot_size: string;
  open_time_utc: string;
  close_time_utc: string;
  pnl: string;
  margin_at_open_pct: string;
  reason_flagged: string;
  breach_type: string;
}

export interface ComplianceAnalysis {
  id: string;
  payout: string;
  version: string;
  hard_breach_detected: boolean;
  soft_breach_detected: boolean;
  hard_breaches: string[];
  soft_breaches: string[];
  evidence: Array<{
    rule: string;
    details: string;
  }>;
  metrics: {
    daily_loss?: number;
    max_allowed_loss?: number;
    [key: string]: any;
  };
  payout_adjustments: {
    reduced_amount?: number;
    [key: string]: any;
  };
  responsible_trades: ComplianceResponsibleTrade[];
  created_at: string;
  updated_at: string;
}