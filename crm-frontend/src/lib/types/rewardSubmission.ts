export type RewardSubmissionStatus = 'pending' | 'approved' | 'declined';

export interface RewardSubmission {
  id: string;
  user: string;
  user_name: string;
  task: string;
  task_title: string;
  notes: string;
  proof_url: string | null;
  proof_image: string | null;
  status: RewardSubmissionStatus;
  admin_comment: string;
  reward_amount: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface CreateRewardSubmissionData {
  task: string;
  notes?: string;
  proof_url?: string;
  proof_image_file?: File;
}

export interface ApproveSubmissionData {
  reward_amount?: number;
}

export interface DeclineSubmissionData {
  admin_comment: string;
}
