export interface WeCoinsUserOverview {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
}

export interface WeCoinsWalletOverview {
  id: string;
  balance: number;
}

export interface WeCoinsTransactionOverview {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string | null;
}

export interface WeCoinsSubmissionTaskOverview {
  id: string | null;
  title: string | null;
  status: string | null;
  reward_amount: number;
  requires_url_submission: boolean;
  starts_at: string | null;
  expires_at: string | null;
  is_available: boolean;
}

export interface WeCoinsRewardSubmissionOverview {
  id: string;
  status: string;
  notes: string;
  proof_url: string | null;
  proof_image: string | null;
  admin_comment: string;
  reward_amount: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  task: WeCoinsSubmissionTaskOverview;
}

export interface WeCoinsRedeemItemOverview {
  id: string | null;
  title: string | null;
  category: string | null;
  required_wecoins: number;
  stock_quantity: number;
  max_per_user: number;
  is_active: boolean;
  is_archived: boolean;
  starts_at: string | null;
  expires_at: string | null;
  is_available: boolean;
  coupon_code: string | null;
  addon_code: string | null;
  image_url: string | null;
}

export interface WeCoinsRedemptionOverview {
  id: string;
  status: string;
  admin_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  delivery_data: Record<string, any> | null;
  item: WeCoinsRedeemItemOverview;
}

export interface WeCoinsOverviewResponse {
  user: WeCoinsUserOverview;
  wallet: WeCoinsWalletOverview;
  transactions: WeCoinsTransactionOverview[];
  reward_submissions: WeCoinsRewardSubmissionOverview[];
  redemptions: WeCoinsRedemptionOverview[];
}
