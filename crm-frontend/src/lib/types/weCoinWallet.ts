export type TransactionType = 'earn' | 'spend' | 'adjustment';

export interface WeCoinTransaction {
  id: number;
  wallet: number;
  type: TransactionType;
  amount: number;
  description: string;
  created_at: string;
}

export type RedemptionStatus = 'pending' | 'approved' | 'declined' | 'fulfilled';

export interface Redemption {
  id: string;
  user: number;
  item: string;
  item_title: string;
  item_category: string;
  status: RedemptionStatus;
  admin_comment: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
  delivery_data: Record<string, any> | null;
}

export interface WeCoinWallet {
  id: number;
  user: number;
  user_username: string;
  user_email: string;
  balance: number;
  transactions: WeCoinTransaction[];
  redemptions: Redemption[];
}

export interface AdjustBalanceData {
  amount: number;
  description: string;
}
