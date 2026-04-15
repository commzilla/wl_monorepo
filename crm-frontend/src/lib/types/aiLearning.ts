export interface AILearningStats {
  total_analyses: number;
  total_reviewed: number;
  ai_accuracy: number;
  patterns_by_type: Record<string, number>;
  decisions_by_type: Record<string, number>;
}

export interface AIAnalysisWithFeedback {
  id: string;
  payout_id: string;
  account_id: string;
  ai_recommendation: string;
  ai_confidence: number;
  ai_patterns_detected: string[];
  human_decision?: string;
  human_agrees_with_ai?: boolean;
  is_training_example: boolean;
  created_at: string;
  reviewed_at?: string;
}

export interface AITrainingExample extends AIAnalysisWithFeedback {
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
}

export interface AIAnalysisFilters {
  has_feedback?: boolean;
  is_training_example?: boolean;
  human_agrees_with_ai?: boolean;
  ai_recommendation?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const RECOMMENDATION_LABELS: Record<string, string> = {
  approve: 'Approve',
  reject: 'Reject',
  review: 'Needs Review',
};

export const RECOMMENDATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  approve: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800'
  },
  reject: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800'
  },
  review: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800'
  },
};
