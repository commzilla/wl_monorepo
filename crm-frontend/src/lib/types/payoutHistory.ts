export interface TraderPayout {
  id: string;
  trader: string;
  challenge_enrollment: string;
  amount: number;
  profit: number;
  profit_share: number;
  net_profit: number;
  released_fund: number;
  method: 'paypal' | 'bank' | 'crypto' | 'rise';
  method_details: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  admin_note?: string;
  rejection_reason?: string;
  is_custom_amount: boolean;
  exclude_amount?: number;
  exclude_reason?: string;
  requested_at: string;
  reviewed_at?: string;
  paid_at?: string;
  trader_username: string;
}

export interface PayoutHistoryResponse {
  enrollment_id: string;
  challenge_name: string;
  client_name: string;
  payouts: TraderPayout[];
}