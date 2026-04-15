export interface HedgingDetectRequest {
  account_ids: string[];
  date_from?: string;
  date_to?: string;
  window_seconds?: number;
  min_pairs?: number;
  include_trades?: boolean;
  max_pairs_per_account?: number;
}

export interface HedgingTrade {
  order: number;
  open_time: string;
  open_price: string;
  volume: number;
}

export interface HedgingPair {
  symbol: string;
  start_time: string;
  end_time: string;
  buy: HedgingTrade;
  sell: HedgingTrade;
}

export interface HedgingAccountResult {
  account_id: number;
  pairs_found: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  enrollment?: {
    enrollment_id: string;
    challenge: string;
    enrollment_status: string;
    account_size: string;
    currency: string;
    client: {
      client_id: string;
      name: string;
      email: string;
      kyc_status: string;
    };
  };
  pairs: HedgingPair[];
  reason: string;
}

export interface HedgingDetectResponse {
  range: {
    from: string;
    to: string;
  };
  params: {
    window_seconds: number;
    min_pairs: number;
    include_trades: boolean;
    max_pairs_per_account: number;
  };
  requested_accounts: number[];
  accounts_flagged: number;
  results: HedgingAccountResult[];
}

// Find Similar Hedging Types
export interface HedgingFindSimilarRequest {
  seed_account_id: string;
  date_from?: string;
  date_to?: string;
  window_seconds?: number;
  min_matches?: number;
  max_results?: number;
  include_evidence?: boolean;
  max_evidence_per_account?: number;
}

export interface HedgingEvidence {
  symbol: string;
  start_time: string;
  end_time: string;
  buy: HedgingTrade;
  sell: HedgingTrade;
}

export interface HedgingSeedEvent {
  symbol: string;
  start_time: string;
  end_time: string;
  seed_buy: HedgingTrade;
  seed_sell: HedgingTrade;
}

export interface HedgingSimilarAccount {
  account_id: number;
  matches: number;
  matched_symbols: string[];
  evidence: HedgingEvidence[];
  confidence_ratio: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  enrollment?: {
    enrollment_id: string;
    challenge: string;
    enrollment_status: string;
    account_size: string;
    currency: string;
    client: {
      client_id: string;
      name: string;
      email: string;
      kyc_status: string;
    };
  };
}

export interface HedgingFindSimilarResponse {
  seed_account_id: number;
  seed_hedging_events?: number;
  range: {
    from: string;
    to: string;
  };
  // params may be missing when no hedging events found for seed
  params?: {
    window_seconds: number;
    min_matches: number;
    max_results: number;
    include_evidence: boolean;
    max_evidence_per_account: number;
  };
  // Alternative: window_seconds at root level when no hedging events found
  window_seconds?: number;
  similar_accounts_found?: number;
  similar_accounts: HedgingSimilarAccount[];
  seed_events?: HedgingSeedEvent[];
  message?: string;
}
