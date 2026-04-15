export type BetaAccessStatus = 'pending' | 'requested' | 'approved' | 'declined';

export interface WeCoinsBetaAccess {
  id: string;
  user: number;
  user_email: string;
  user_name: string;
  status: BetaAccessStatus;
  request_notes: string | null;
  admin_notes: string | null;
  requested_at: string;
  reviewed_at: string | null;
}

export interface BetaAccessFilters {
  status?: BetaAccessStatus;
}

export interface DeclineRequestData {
  admin_notes: string;
}
