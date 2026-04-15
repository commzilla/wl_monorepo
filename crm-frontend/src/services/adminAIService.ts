/**
 * Admin AI Assistant — API Service
 * REST endpoints for admin AI chat management.
 * Uses the shared apiService for token refresh and consistent auth handling.
 */

import { apiService } from '@/services/apiService';
import type {
  AdminAIConfig,
  AdminAIConversation,
  AdminAIFeedback,
  AdminAITrainingExample,
  AdminAIContextType,
} from '@/types/adminAI';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.we-fund.com';

/**
 * Wrapper that uses apiService (with auto token refresh) and throws on error.
 */
async function call<T>(method: 'get' | 'post' | 'patch' | 'delete', endpoint: string, body?: any): Promise<T> {
  let response;
  switch (method) {
    case 'get':
      response = await apiService.get<T>(endpoint);
      break;
    case 'post':
      response = await apiService.post<T>(endpoint, body);
      break;
    case 'patch':
      response = await apiService.patch<T>(endpoint, body);
      break;
    case 'delete':
      response = await apiService.delete<T>(endpoint);
      break;
  }
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data as T;
}

export const adminAIService = {
  // ===================================================================
  // CONFIG
  // ===================================================================

  async getConfig(): Promise<AdminAIConfig> {
    return call<AdminAIConfig>('get', '/admin/ai-assistant/config/');
  },

  async updateConfig(updates: Partial<AdminAIConfig>): Promise<AdminAIConfig> {
    return call<AdminAIConfig>('patch', '/admin/ai-assistant/config/', updates);
  },

  // ===================================================================
  // CONVERSATIONS
  // ===================================================================

  async startConversation(params: {
    context_type?: AdminAIContextType;
    context_id?: string;
    context_url?: string;
  }): Promise<AdminAIConversation> {
    return call<AdminAIConversation>('post', '/admin/ai-assistant/chat/start/', params);
  },

  async getConversations(): Promise<AdminAIConversation[]> {
    return call<AdminAIConversation[]>('get', '/admin/ai-assistant/chat/conversations/');
  },

  async getConversation(conversationId: string): Promise<AdminAIConversation> {
    return call<AdminAIConversation>('get', `/admin/ai-assistant/chat/conversations/${conversationId}/`);
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await call<void>('delete', `/admin/ai-assistant/chat/conversations/${conversationId}/`);
  },

  // ===================================================================
  // ACTIONS
  // ===================================================================

  async confirmAction(params: {
    conversation_id: string;
    message_id: string;
    confirmed: boolean;
  }): Promise<{ success: boolean; action_result?: any; message: string }> {
    return call('post', '/admin/ai-assistant/chat/confirm/', params);
  },

  // ===================================================================
  // FEEDBACK
  // ===================================================================

  async submitFeedback(feedback: Omit<AdminAIFeedback, 'id' | 'created_at' | 'admin_email'>): Promise<AdminAIFeedback> {
    return call<AdminAIFeedback>('post', '/admin/ai-assistant/feedback/', feedback);
  },

  async getFeedback(filters?: { conversation?: string; is_positive?: boolean }): Promise<AdminAIFeedback[]> {
    let endpoint = '/admin/ai-assistant/feedback/';
    const params = new URLSearchParams();
    if (filters?.conversation) params.append('conversation', filters.conversation);
    if (filters?.is_positive !== undefined) params.append('is_positive', String(filters.is_positive));
    const qs = params.toString();
    if (qs) endpoint += `?${qs}`;

    const data = await call<{ results: AdminAIFeedback[] } | AdminAIFeedback[]>('get', endpoint);
    return Array.isArray(data) ? data : data.results || [];
  },

  // ===================================================================
  // TRAINING EXAMPLES
  // ===================================================================

  async getTrainingExamples(filters?: { is_active?: boolean; search?: string }): Promise<AdminAITrainingExample[]> {
    let endpoint = '/admin/ai-assistant/training-examples/';
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.search) params.append('search', filters.search);
    const qs = params.toString();
    if (qs) endpoint += `?${qs}`;

    const data = await call<{ results: AdminAITrainingExample[] } | AdminAITrainingExample[]>('get', endpoint);
    return Array.isArray(data) ? data : data.results || [];
  },

  async createTrainingExample(data: Omit<AdminAITrainingExample, 'id' | 'created_at' | 'updated_at'>): Promise<AdminAITrainingExample> {
    return call<AdminAITrainingExample>('post', '/admin/ai-assistant/training-examples/', data);
  },

  async updateTrainingExample(id: string, data: Partial<AdminAITrainingExample>): Promise<AdminAITrainingExample> {
    return call<AdminAITrainingExample>('patch', `/admin/ai-assistant/training-examples/${id}/`, data);
  },

  async deleteTrainingExample(id: string): Promise<void> {
    await call<void>('delete', `/admin/ai-assistant/training-examples/${id}/`);
  },

};
