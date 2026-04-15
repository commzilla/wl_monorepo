import { RedemptionStatus } from './weCoinWallet';

export interface RedeemItemSummary {
  id: string;
  title: string;
  category: string;
  required_wecoins: number;
  stock_quantity: number;
  is_active: boolean;
  total_redemptions: number;
  pending_count: number;
  approved_count: number;
  fulfilled_count: number;
  declined_count: number;
}

export interface RedemptionListItem {
  id: string;
  user_name: string;
  user_email: string;
  item_title: string;
  status: RedemptionStatus;
  admin_comment: string | null;
  created_at: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  delivery_data: Record<string, any> | null;
}

export type RedemptionAction = 'approve' | 'decline' | 'fulfill' | 'reset';

export interface RedemptionActionData {
  action: RedemptionAction;
  comment?: string;
  delivery_data?: Record<string, any>;
}

export interface RedemptionActionResponse {
  id: string;
  status: RedemptionStatus;
  message: string;
}
