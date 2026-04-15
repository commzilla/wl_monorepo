// Structured pattern detected by AI (Gemini JSON format)
export interface AIDetectedPattern {
  code: string;
  confidence: number;
  evidence: string[];
  severity: 'AUTO_REJECT' | 'REVIEW' | 'LOW' | 'NONE';
}

// Risk factors analyzed by AI
export interface AIRiskFactors {
  martingale_signature: boolean;
  pyramid_signature: boolean;
  grid_signature: boolean;
  hedging_detected: boolean;
  bot_signature: boolean;
  copy_trading_signature: boolean;
  news_trading_signature: boolean;
  all_in_signature: boolean;
}

// Structured AI response (Gemini JSON output)
export interface AIAnalysisResult {
  patterns_detected: AIDetectedPattern[];
  recommendation: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';
  confidence: number;
  reasoning: string;
  risk_factors: AIRiskFactors;
  key_findings: string[];
  suggested_action: string;
}

export interface AIRiskAnalysis {
  id: string;
  payout: string;
  account_id: string;
  account_step: 'step_1' | 'step_2';
  trade_data: Record<string, any>;
  account_snapshot: Record<string, any>;
  consistency_score: number | null;
  consistency_result: string | null;
  ai_model: string;
  ai_prompt_version: string;
  ai_raw_request: Record<string, any> | null;
  ai_raw_response: Record<string, any> | null;
  ai_analysis_text: string | null;
  ai_recommendation: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW' | null;
  ai_patterns_detected: string[];
  ai_confidence: number | null;
  final_decision: 'APPROVE' | 'REJECT' | 'APPROVE_WITH_DEDUCTIONS' | null;
  requires_human_review: boolean;
  runpod_job_id: string | null; // Deprecated - kept for backward compatibility
  status: 'queued' | 'running' | 'completed' | 'failed';
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface AIRiskAnalysisResponse {
  exists: boolean;
  can_scan: boolean;
  status?: string;
  data?: AIRiskAnalysis;
  detail?: string;
  queued?: boolean;
  analysis_id?: string;
}
