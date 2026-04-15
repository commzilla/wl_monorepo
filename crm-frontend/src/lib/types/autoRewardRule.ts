export type AutoRewardTriggerType = 'purchase' | 'payout_approved';

export const TRIGGER_TYPE_LABELS: Record<AutoRewardTriggerType, string> = {
  purchase: 'Challenge Purchase',
  payout_approved: 'Payout Approved',
};

export interface AutoRewardRule {
  id: string;
  title: string;
  description: string;
  trigger_type: AutoRewardTriggerType;
  threshold: number;
  reward_amount: number;
  is_active: boolean;
  grants_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAutoRewardRuleData {
  title: string;
  description?: string;
  trigger_type: AutoRewardTriggerType;
  threshold: number;
  reward_amount: number;
  is_active?: boolean;
}

export interface UpdateAutoRewardRuleData {
  title?: string;
  description?: string;
  trigger_type?: AutoRewardTriggerType;
  threshold?: number;
  reward_amount?: number;
  is_active?: boolean;
}
