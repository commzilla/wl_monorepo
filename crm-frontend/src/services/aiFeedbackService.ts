/**
 * AI Feedback Service - Django API Client
 * For rating and providing feedback on AI support responses
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.we-fund.com';

export interface AIFeedback {
  id?: string;
  conversation_id: string;
  message_id: string;
  agent_id?: string;
  rating: number;
  feedback_type: 'helpful' | 'partially_helpful' | 'not_helpful' | 'wrong_info' | 'wrong' | 'harmful' | 'inappropriate';
  was_accurate?: boolean;
  was_helpful?: boolean;
  was_professional?: boolean;
  needed_correction?: boolean;
  correction_made?: string;
  agent_notes?: string;
  should_be_training_example?: boolean;
  training_priority?: string | number;
  issue_categories?: string[];
  created_at?: string;
}

export interface FeedbackStats {
  total_feedback: number;
  average_rating: number;
  helpful_count: number;
  not_helpful_count: number;
  training_examples_count: number;
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('access') || localStorage.getItem('auth_token') || localStorage.getItem('token');
}

// API helper for Django backend
async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  data?: Record<string, any>
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || error.error || 'Request failed');
  }

  const text = await response.text();
  if (!text) return {} as T;

  return JSON.parse(text);
}

export const aiFeedbackService = {
  /**
   * Submit feedback for an AI message
   */
  async submitFeedback(feedback: Omit<AIFeedback, 'id' | 'created_at'>): Promise<AIFeedback> {
    return apiCall<AIFeedback>(
      '/admin/support/feedback/',
      'POST',
      {
        conversation: feedback.conversation_id,
        message: feedback.message_id,
        rating: feedback.rating,
        feedback_type: feedback.feedback_type,
        was_helpful: feedback.was_helpful,
        needed_correction: feedback.needed_correction,
        correction_made: feedback.correction_made,
        agent_notes: feedback.agent_notes,
        should_be_training_example: feedback.should_be_training_example,
        training_priority: feedback.training_priority || 0,
        issue_categories: feedback.issue_categories || [],
      }
    );
  },

  /**
   * Get feedback for a specific message
   */
  async getFeedbackForMessage(messageId: string): Promise<AIFeedback | null> {
    try {
      const response = await apiCall<AIFeedback | null>(
        `/admin/support/feedback/by-message/${messageId}/`
      );
      return response;
    } catch {
      return null;
    }
  },

  /**
   * Get all feedback for a conversation
   */
  async getFeedbackForConversation(conversationId: string): Promise<AIFeedback[]> {
    const response = await apiCall<{ results: AIFeedback[] } | AIFeedback[]>(
      `/admin/support/feedback/?conversation_id=${conversationId}`
    );

    if (Array.isArray(response)) {
      return response;
    }
    return response.results || [];
  },

  /**
   * Update existing feedback
   */
  async updateFeedback(id: string, updates: Partial<AIFeedback>): Promise<AIFeedback> {
    return apiCall<AIFeedback>(
      `/admin/support/feedback/${id}/`,
      'PATCH',
      updates
    );
  },

  /**
   * Get feedback marked as training examples
   */
  async getTrainingExamples(): Promise<AIFeedback[]> {
    const response = await apiCall<AIFeedback[]>(
      '/admin/support/feedback/training-examples/'
    );
    return response;
  },

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<FeedbackStats> {
    return apiCall<FeedbackStats>('/admin/support/feedback/stats/');
  },

  /**
   * Delete feedback
   */
  async deleteFeedback(id: string): Promise<void> {
    await apiCall<void>(`/admin/support/feedback/${id}/`, 'DELETE');
  }
};
