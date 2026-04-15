export type RewardTaskStatus = 'active' | 'inactive' | 'archived' | 'expired';

export type ExpireAction = 'mark_expired' | 'archive' | 'inactivate';

export interface RewardTask {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  url?: string;
  feature_image?: string;
  example_image?: string;
  requires_url_submission: boolean;
  reward_amount: number;
  starts_at?: string | null;
  expires_at?: string | null;
  expire_action: ExpireAction;
  is_expired: boolean;
  is_scheduled: boolean;
  is_available: boolean;
  status: RewardTaskStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateRewardTaskData {
  title: string;
  description?: string;
  instructions?: string;
  url?: string;
  feature_image_file?: File;
  example_image_file?: File;
  requires_url_submission?: boolean;
  reward_amount: number;
  starts_at?: string | null;
  expires_at?: string | null;
  expire_action?: ExpireAction;
  status?: RewardTaskStatus;
}

export interface UpdateRewardTaskData {
  title?: string;
  description?: string;
  instructions?: string;
  url?: string;
  feature_image_file?: File;
  remove_feature_image?: boolean;
  example_image_file?: File;
  remove_example_image?: boolean;
  requires_url_submission?: boolean;
  reward_amount?: number;
  starts_at?: string | null;
  expires_at?: string | null;
  expire_action?: ExpireAction;
  status?: RewardTaskStatus;
}
