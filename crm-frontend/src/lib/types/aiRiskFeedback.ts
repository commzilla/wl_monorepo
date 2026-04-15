export interface AIRiskReviewFeedback {
  human_decision: 'APPROVE' | 'REJECT' | 'APPROVE_WITH_DEDUCTIONS';
  human_agrees_with_ai: boolean;
  human_reasoning: string;
  patterns_confirmed: string[];
  patterns_rejected: string[];
  patterns_added: string[];
  review_difficulty: 'easy' | 'medium' | 'hard';
  training_priority: number;
  is_training_example: boolean;
}

export interface AIRiskFeedbackResponse {
  exists: boolean;
  data?: AIRiskReviewFeedback;
}

export interface AIRiskFeedbackSubmitResponse {
  created: boolean;
  final_decision: string;
}
