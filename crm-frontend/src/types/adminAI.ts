/**
 * Admin AI Assistant — TypeScript Types
 */

// ===================================================================
// CONFIG
// ===================================================================

export interface AdminAIConfig {
  id: string;
  ai_enabled: boolean;
  ai_greeting: string;
  ai_system_prompt: string;
  simple_model: string;
  standard_model: string;
  pro_model: string;
  complexity_threshold_standard: number;
  complexity_threshold_pro: number;
  read_actions_enabled: boolean;
  write_actions_enabled: boolean;
  allowed_read_actions: string[];
  allowed_write_actions: string[];
  confirmation_required_actions: string[];
  max_tokens: number;
  temperature: number;
  created_at: string;
  updated_at: string;
}

// ===================================================================
// CONVERSATION
// ===================================================================

export type AdminAIContextType = 'general' | 'enrollment' | 'trader' | 'payout' | 'order';

export interface AdminAIConversation {
  id: string;
  admin_user: string;
  admin_email: string;
  admin_name: string;
  context_type: AdminAIContextType;
  context_id: string | null;
  context_url: string;
  is_active: boolean;
  last_message_at: string | null;
  message_count?: number;
  last_message_preview?: {
    role: string;
    content: string;
    created_at: string;
  } | null;
  metadata?: Record<string, any>;
  messages?: AdminAIMessage[];
  created_at: string;
  updated_at?: string;
}

// ===================================================================
// MESSAGE
// ===================================================================

export type AdminAIMessageRole = 'admin' | 'ai' | 'system';
export type AdminAIActionStatus = 'success' | 'error' | 'pending_confirmation' | 'cancelled';

export interface AdminAIMessage {
  id: string;
  conversation: string;
  role: AdminAIMessageRole;
  content: string;
  model_used: string | null;
  complexity_score: number | null;
  action_executed: string | null;
  action_params: Record<string, any> | null;
  action_result: Record<string, any> | null;
  action_status: AdminAIActionStatus | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

// ===================================================================
// FEEDBACK
// ===================================================================

export type AdminAIIssueType =
  | 'wrong_data'
  | 'wrong_action'
  | 'poor_explanation'
  | 'hallucination'
  | 'helpful'
  | 'other';

export interface AdminAIFeedback {
  id: string;
  conversation: string;
  message: string;
  admin_user: string;
  admin_email?: string;
  is_positive: boolean;
  issue_type: AdminAIIssueType;
  correction_text: string;
  notes: string;
  created_at: string;
}

// ===================================================================
// TRAINING EXAMPLE
// ===================================================================

export interface AdminAITrainingExample {
  id: string;
  question: string;
  ideal_response: string;
  source_feedback: string | null;
  weight: number;
  issue_type: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ===================================================================
// SSE STREAM EVENTS
// ===================================================================

export type AdminAIStreamEventType =
  | 'token'
  | 'tool_call'
  | 'tool_result'
  | 'confirmation_required'
  | 'done'
  | 'error';

export interface AdminAIStreamEventToken {
  type: 'token';
  text: string;
}

export interface AdminAIStreamEventToolCall {
  type: 'tool_call';
  name: string;
  args: Record<string, any>;
}

export interface AdminAIStreamEventToolResult {
  type: 'tool_result';
  name: string;
  success: boolean;
  data: Record<string, any>;
  error?: string;
}

export interface AdminAIStreamEventConfirmation {
  type: 'confirmation_required';
  message_id: string;
  tool_name: string;
  params: Record<string, any>;
  description: string;
}

export interface AdminAIStreamEventDone {
  type: 'done';
  message_id?: string;
  model_used?: string;
  complexity_score?: number;
}

export interface AdminAIStreamEventError {
  type: 'error';
  message: string;
}

export type AdminAIStreamEvent =
  | AdminAIStreamEventToken
  | AdminAIStreamEventToolCall
  | AdminAIStreamEventToolResult
  | AdminAIStreamEventConfirmation
  | AdminAIStreamEventDone
  | AdminAIStreamEventError;
