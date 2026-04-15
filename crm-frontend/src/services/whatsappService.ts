/**
 * WhatsApp Service - Django API Client
 * Connects to Django backend for WhatsApp conversation management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.we-fund.com';

export interface WhatsAppMessage {
  id: string;
  conversation: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'user' | 'ai' | 'agent' | 'system';
  content: string;
  twilio_sid: string | null;
  delivery_status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | null;
  agent: string | null;
  agent_name: string | null;
  ai_model_used: string;
  ai_tokens_used: number | null;
  ai_tool_calls: any[];
  is_internal: boolean;
  created_at: string;
}

export interface WhatsAppConversation {
  id: string;
  wa_id: string;
  profile_name: string;
  user: string | null;
  status: 'active' | 'human_handoff' | 'resolved' | 'archived';
  ai_enabled: boolean;
  assigned_agent: string | null;
  assigned_agent_name: string | null;
  lead_status: 'new' | 'engaged' | 'qualified' | 'converted' | 'lost';
  lead_data: Record<string, any>;
  last_message_at: string | null;
  message_count: number;
  ai_message_count: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_message: {
    content: string;
    sender_type: string;
    direction: string;
    created_at: string;
  } | null;
  messages?: WhatsAppMessage[];
}

export interface WhatsAppBotConfig {
  bot_enabled: boolean;
  ai_model: string;
  ai_temperature: number;
  ai_max_tokens: number;
  system_prompt_override: string;
  greeting_message: string;
  handoff_message: string;
  out_of_hours_message: string;
  max_ai_messages_per_hour: number;
  max_messages_per_conversation_per_day: number;
  escalation_keywords: string[];
  updated_at: string;
}

export interface WhatsAppStats {
  total_conversations: number;
  by_status: Record<string, number>;
  by_lead_status: Record<string, number>;
  today_messages: number;
  today_new_conversations: number;
  needs_attention: number;
}

function getAuthToken(): string | null {
  return localStorage.getItem('access') || localStorage.getItem('auth_token') || localStorage.getItem('token');
}

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

// Polling subscription handlers
const subscriptions: Map<string, NodeJS.Timeout> = new Map();

export class WhatsAppService {
  // Conversations
  static async getConversations(filters?: {
    status?: string;
    lead_status?: string;
    search?: string;
    assigned_to_me?: boolean;
    needs_attention?: boolean;
  }): Promise<WhatsAppConversation[]> {
    let endpoint = '/admin/whatsapp/conversations/';
    const params = new URLSearchParams();

    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.lead_status && filters.lead_status !== 'all') {
      params.append('lead_status', filters.lead_status);
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }
    if (filters?.assigned_to_me) {
      params.append('assigned_to_me', 'true');
    }
    if (filters?.needs_attention) {
      params.append('needs_attention', 'true');
    }

    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    const response = await apiCall<{ results: WhatsAppConversation[] } | WhatsAppConversation[]>(endpoint);
    if (Array.isArray(response)) return response;
    return (response as { results: WhatsAppConversation[] }).results || [];
  }

  static async getConversation(id: string): Promise<WhatsAppConversation> {
    return apiCall<WhatsAppConversation>(`/admin/whatsapp/conversations/${id}/`);
  }

  static async updateConversation(id: string, data: Partial<WhatsAppConversation>): Promise<WhatsAppConversation> {
    return apiCall<WhatsAppConversation>(`/admin/whatsapp/conversations/${id}/`, 'PATCH', data);
  }

  // Messages
  static async getMessages(conversationId: string, includeInternal = true): Promise<WhatsAppMessage[]> {
    return apiCall<WhatsAppMessage[]>(
      `/admin/whatsapp/conversations/${conversationId}/messages/?include_internal=${includeInternal}`
    );
  }

  static async sendReply(conversationId: string, content: string, isInternal = false): Promise<WhatsAppMessage> {
    return apiCall<WhatsAppMessage>(
      `/admin/whatsapp/conversations/${conversationId}/reply/`,
      'POST',
      { content, is_internal: isInternal }
    );
  }

  // Actions
  static async toggleAI(conversationId: string, enabled: boolean): Promise<{ ai_enabled: boolean }> {
    return apiCall(`/admin/whatsapp/conversations/${conversationId}/toggle-ai/`, 'POST', { enabled });
  }

  static async resolveConversation(conversationId: string): Promise<{ status: string }> {
    return apiCall(`/admin/whatsapp/conversations/${conversationId}/resolve/`, 'POST');
  }

  static async assignAgent(conversationId: string, agentId: string | null): Promise<WhatsAppConversation> {
    return apiCall(`/admin/whatsapp/conversations/${conversationId}/assign/`, 'POST', { agent_id: agentId });
  }

  // Stats
  static async getStats(): Promise<WhatsAppStats> {
    return apiCall<WhatsAppStats>('/admin/whatsapp/conversations/stats/');
  }

  // Bot Config
  static async getBotConfig(): Promise<WhatsAppBotConfig> {
    return apiCall<WhatsAppBotConfig>('/admin/whatsapp/config/');
  }

  static async updateBotConfig(data: Partial<WhatsAppBotConfig>): Promise<WhatsAppBotConfig> {
    return apiCall<WhatsAppBotConfig>('/admin/whatsapp/config/', 'PATCH', data);
  }

  // Polling subscriptions
  static subscribeToConversations(
    callback: (conversations: WhatsAppConversation[]) => void,
    filters?: Parameters<typeof WhatsAppService.getConversations>[0],
    pollInterval = 5000
  ): () => void {
    const key = 'wa_conversations';
    if (subscriptions.has(key)) {
      clearInterval(subscriptions.get(key)!);
    }

    const poll = async () => {
      try {
        const data = await WhatsAppService.getConversations(filters);
        callback(data);
      } catch (e) {
        console.error('WhatsApp conversation poll error:', e);
      }
    };

    poll();
    const interval = setInterval(poll, pollInterval);
    subscriptions.set(key, interval);

    return () => {
      clearInterval(interval);
      subscriptions.delete(key);
    };
  }

  static subscribeToMessages(
    conversationId: string,
    callback: (messages: WhatsAppMessage[]) => void,
    pollInterval = 3000
  ): () => void {
    const key = `wa_messages_${conversationId}`;
    if (subscriptions.has(key)) {
      clearInterval(subscriptions.get(key)!);
    }

    const poll = async () => {
      try {
        const data = await WhatsAppService.getMessages(conversationId);
        callback(data);
      } catch (e) {
        console.error('WhatsApp message poll error:', e);
      }
    };

    poll();
    const interval = setInterval(poll, pollInterval);
    subscriptions.set(key, interval);

    return () => {
      clearInterval(interval);
      subscriptions.delete(key);
    };
  }

  static unsubscribeAll() {
    subscriptions.forEach((interval) => clearInterval(interval));
    subscriptions.clear();
  }
}
