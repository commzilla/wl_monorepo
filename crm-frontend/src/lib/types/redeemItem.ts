export type RedeemItemCategory = 
  | 'discount' 
  | 'subscription' 
  | 'addon' 
  | 'payout_addon' 
  | 'drawdown_addon' 
  | 'merch' 
  | 'giveaway'
  | 'other';

export type RedeemItemExpireAction = 'deactivate' | 'archive';

export interface RedeemItem {
  id: string;
  title: string;
  description: string;
  category: RedeemItemCategory;
  required_wecoins: number;
  stock_quantity: number;
  max_per_user: number;
  is_active: boolean;
  coupon_code: string | null;
  addon_code: string | null;
  image_url: string | null;
  // Scheduling / Expiration
  starts_at: string | null;
  expires_at: string | null;
  expire_action: RedeemItemExpireAction;
  is_archived: boolean;
  // Computed flags (read-only from API)
  is_expired: boolean;
  is_scheduled: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRedeemItemData {
  title: string;
  description?: string;
  category: RedeemItemCategory;
  required_wecoins: number;
  stock_quantity?: number;
  max_per_user?: number;
  is_active?: boolean;
  coupon_code?: string;
  addon_code?: string;
  image_file?: File;
  starts_at?: string | null;
  expires_at?: string | null;
  expire_action?: RedeemItemExpireAction;
  is_archived?: boolean;
}

export interface UpdateRedeemItemData {
  title?: string;
  description?: string;
  category?: RedeemItemCategory;
  required_wecoins?: number;
  stock_quantity?: number;
  max_per_user?: number;
  is_active?: boolean;
  coupon_code?: string;
  addon_code?: string;
  image_file?: File;
  remove_image?: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
  expire_action?: RedeemItemExpireAction;
  is_archived?: boolean;
}

export const CATEGORY_LABELS: Record<RedeemItemCategory, string> = {
  discount: 'Discount Code',
  subscription: 'Subscription Plan',
  addon: 'Addon / Feature',
  payout_addon: 'Payout Addon',
  drawdown_addon: 'Drawdown Addon',
  merch: 'Merchandise',
  giveaway: 'Giveaway',
  other: 'Other',
};

export const EXPIRE_ACTION_LABELS: Record<RedeemItemExpireAction, string> = {
  deactivate: 'Set inactive',
  archive: 'Archive',
};
