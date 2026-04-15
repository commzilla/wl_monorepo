 export interface CopyTradingDetectRequest {
   account_ids: string[];
   date_from?: string;
   date_to?: string;
   window_seconds?: number;
   min_accounts?: number;
   volume_tolerance_ratio?: number;
   include_trades?: boolean;
   max_trades_per_cluster?: number;
 }
 
 export interface CopyTradingTrade {
   account_id: number;
   order: number;
   open_time: string;
   open_price: number;
   volume: number;
 }
 
 export interface CopyTradingAccountDetail {
   account_id: number;
   enrollment_id?: string;
   challenge?: string;
   enrollment_status?: string;
   account_size?: string;
   currency?: string;
   broker_type?: string;
   client?: {
     client_id: string;
     name: string;
     email: string;
     kyc_status: string;
   };
   unmapped?: boolean;
 }
 
 export interface CopyTradingCluster {
   symbol: string;
   side: 'BUY' | 'SELL';
   window_seconds: number;
   start_time: string;
   end_time: string;
   accounts: number[];
   orders: number[];
   trades: CopyTradingTrade[];
   accounts_detail: CopyTradingAccountDetail[];
   severity: 'LOW' | 'MEDIUM' | 'HIGH';
   reason: string;
 }
 
 export interface CopyTradingDetectResponse {
   range: {
     from: string;
     to: string;
   };
   params: {
     window_seconds: number;
     min_accounts: number;
     volume_tolerance_ratio?: number;
     include_trades: boolean;
     max_trades_per_cluster: number;
   };
   requested_accounts: number[];
   clusters_found: number;
   clusters: CopyTradingCluster[];
 }

// Find Similar Accounts Types
export interface FindSimilarRequest {
  seed_account_id: string;
  date_from?: string;
  date_to?: string;
  window_seconds?: number;
  min_matches?: number;
  max_results?: number;
  include_trades?: boolean;
}

export interface TradeEvidence {
  seed: {
    order: number;
    symbol: string;
    side: 'BUY' | 'SELL';
    open_time: string;
    open_price: string;
    volume: number;
  };
  other: {
    account_id: number;
    order: number;
    open_time: string;
    open_price: string;
    volume: number;
  };
}

export interface SimilarAccount {
  account_id: number;
  matches: number;
  matched_symbols: string[];
  first_match_time: string;
  last_match_time: string;
  evidence: TradeEvidence[];
  confidence_ratio: number;
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
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
}

export interface FindSimilarResponse {
  seed_account_id: number;
  seed_trades_count: number;
  range: {
    from: string;
    to: string;
  };
  params: {
    window_seconds: number;
    min_matches: number;
    max_results: number;
    include_trades: boolean;
  };
  similar_accounts_found: number;
  similar_accounts: SimilarAccount[];
  message?: string;
}