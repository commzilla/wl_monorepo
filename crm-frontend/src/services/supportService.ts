/**
 * Support Service - Django API Client
 * Connects to Django backend for support chat management
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.we-fund.com';

export interface ConversationProfile {
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  account_login: string | null;
  status: 'active' | 'resolved' | 'escalated';
  subject: string | null;
  email_subject?: string | null;
  assigned_agent_id: string | null;
  assigned_agent?: {
    id: string;
    name: string;
    email: string;
  };
  ai_enabled: boolean;
  attachments_enabled: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  last_message_at: string | null;
  last_message_sender_type?: 'user' | 'ai' | 'agent' | null;
  resolved_at: string | null;
  first_response_at: string | null;
  agent_takeover_at: string | null;
  is_archived: boolean;
  source?: 'widget' | 'discord' | 'email' | 'website';
  external_channel_id?: string | null;
  needs_human_review?: boolean;
  escalation_reason?: string;
  is_guest?: boolean;
  guest_name?: string | null;
  guest_email?: string | null;
  has_mention_for_me?: boolean;
  created_at: string;
  updated_at: string;
  last_message?: Message;
  profiles?: ConversationProfile;
  metadata?: Record<string, any>;
  message_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'ai' | 'agent';
  sender_id: string | null;
  sender_name?: string;
  message_type?: 'chat' | 'email' | 'system';
  content: string;
  metadata: Record<string, any>;
  is_internal: boolean;
  attachment_url?: string;
  attachment_name?: string;
  attachment_type?: string;
  emotional_context?: {
    level: string;
    indicators: string[];
  };
  email_meta?: {
    subject?: string;
    from_email?: string;
    to_email?: string;
  } | null;
  created_at: string;
  edited_at?: string | null;
  is_deleted?: boolean;
}

export interface SupportEmailTemplate {
  id: number;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  description: string;
}

export interface AIConfig {
  id: string;
  ai_enabled: boolean;
  ai_greeting: string;
  ai_system_prompt: string | null;
  simple_model: string;
  complex_model: string;
  complexity_threshold: number;
  read_actions_enabled: boolean;
  write_actions_enabled: boolean;
  allowed_write_actions: string[];
  confidence_threshold: number;
  escalation_keywords: string[];
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export interface MentionNotification {
  id: string;
  title: string;
  message: string;
  action_url: string;
  is_read: boolean;
  created_at: string;
}

export interface SupportStats {
  total_conversations: number;
  active_conversations: number;
  escalated_conversations: number;
  resolved_conversations: number;
  resolved_today: number;
  avg_response_time_minutes: number;
  avg_resolution_time_minutes: number;
  escalated_count: number;
  needs_review_count: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_source: Record<string, number>;
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

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;

  return JSON.parse(text);
}

export class SupportService {
  // ===================================================================
  // ADMIN/CRM ENDPOINTS
  // ===================================================================

  /**
   * Get all conversations (admin view)
   */
  static async getAllConversations(filters?: {
    status?: string;
    priority?: string;
    source?: string;
    assigned_to_me?: boolean;
  }): Promise<Conversation[]> {
    let endpoint = '/admin/support/conversations/';
    const params = new URLSearchParams();

    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.priority && filters.priority !== 'all') {
      params.append('priority', filters.priority);
    }
    if (filters?.source && filters.source !== 'all') {
      params.append('source', filters.source);
    }
    if (filters?.assigned_to_me) {
      params.append('assigned_to_me', 'true');
    }

    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    const response = await apiCall<{ results: Conversation[] } | Conversation[]>(endpoint);

    // Handle paginated or direct response
    if (Array.isArray(response)) {
      return response;
    }
    return response.results || [];
  }

  /**
   * Get single conversation with messages
   */
  static async getConversation(conversationId: string): Promise<Conversation> {
    return apiCall<Conversation>(`/admin/support/conversations/${conversationId}/`);
  }

  /**
   * Get messages for a conversation
   */
  static async getConversationMessages(
    conversationId: string,
    includeInternal = true
  ): Promise<Message[]> {
    const endpoint = `/admin/support/conversations/${conversationId}/messages/${includeInternal ? '?include_internal=true' : ''}`;
    const response = await apiCall<{ results: Message[] } | Message[]>(endpoint);

    if (Array.isArray(response)) {
      return response;
    }
    return response.results || [];
  }

  /**
   * Upload attachment for a conversation
   */
  static async uploadAttachment(
    conversationId: string,
    file: File
  ): Promise<{ url: string; name: string; type: string; scan_status: string }> {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('conversation_id', conversationId);
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/support/upload-attachment/`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Upload failed');
    }

    return response.json();
  }

  /**
   * Send agent message
   */
  static async sendAgentMessage(
    conversationId: string,
    content: string,
    agentId: string,
    isInternal = false,
    attachment?: { url: string; name: string; type: string },
    mentionedUserIds?: string[]
  ): Promise<Message> {
    return apiCall<Message>(
      `/admin/support/conversations/${conversationId}/reply/`,
      'POST',
      {
        content,
        is_internal: isInternal,
        ...(attachment && { attachment }),
        ...(mentionedUserIds?.length && { mentioned_user_ids: mentionedUserIds }),
      }
    );
  }

  /**
   * Edit an agent message
   */
  static async editMessage(
    conversationId: string,
    messageId: string,
    content: string
  ): Promise<Message> {
    return apiCall<Message>(
      `/admin/support/conversations/${conversationId}/edit-message/${messageId}/`,
      'PATCH',
      { content }
    );
  }

  /**
   * Delete an agent message (soft delete)
   */
  static async deleteMessage(
    conversationId: string,
    messageId: string
  ): Promise<Message> {
    return apiCall<Message>(
      `/admin/support/conversations/${conversationId}/delete-message/${messageId}/`,
      'DELETE'
    );
  }

  /**
   * Update conversation
   */
  static async updateConversation(
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<Conversation> {
    return apiCall<Conversation>(
      `/admin/support/conversations/${conversationId}/`,
      'PATCH',
      updates
    );
  }

  /**
   * Resolve conversation
   */
  static async resolveConversation(conversationId: string): Promise<Conversation> {
    return apiCall<Conversation>(
      `/admin/support/conversations/${conversationId}/resolve/`,
      'POST'
    );
  }

  /**
   * Escalate conversation
   */
  static async escalateConversation(
    conversationId: string,
    reason?: string
  ): Promise<Conversation> {
    return apiCall<Conversation>(
      `/admin/support/conversations/${conversationId}/escalate/`,
      'POST',
      { reason }
    );
  }

  /**
   * Assign agent to conversation
   */
  static async assignAgent(
    conversationId: string,
    agentId: string
  ): Promise<Conversation> {
    return apiCall<Conversation>(
      `/admin/support/conversations/${conversationId}/assign/`,
      'POST',
      { agent_id: agentId }
    );
  }

  /**
   * Toggle AI for conversation
   */
  static async toggleAI(
    conversationId: string,
    enabled: boolean,
    agentId?: string,
    agentName?: string
  ): Promise<Conversation> {
    return apiCall<Conversation>(
      `/admin/support/conversations/${conversationId}/`,
      'PATCH',
      {
        ai_enabled: enabled,
        ...(agentId && !enabled ? { agent_takeover_by: agentId } : {})
      }
    );
  }

  /**
   * Toggle attachments for conversation
   */
  static async toggleAttachments(
    conversationId: string,
    enabled: boolean
  ): Promise<Conversation> {
    return this.updateConversation(conversationId, { attachments_enabled: enabled });
  }

  /**
   * Archive/delete conversation
   */
  static async archiveConversation(conversationId: string): Promise<void> {
    await apiCall<void>(
      `/admin/support/conversations/${conversationId}/`,
      'DELETE'
    );
  }

  // ===================================================================
  // AI CONFIGURATION
  // ===================================================================

  /**
   * Get AI configuration
   */
  static async getAIConfig(): Promise<AIConfig> {
    return apiCall<AIConfig>('/admin/support/ai-config/');
  }

  /**
   * Update AI configuration
   */
  static async updateAIConfig(updates: Partial<AIConfig>): Promise<AIConfig> {
    return apiCall<AIConfig>('/admin/support/ai-config/', 'PATCH', updates);
  }

  // ===================================================================
  // STATISTICS
  // ===================================================================

  /**
   * Get support dashboard statistics
   */
  static async getStats(): Promise<SupportStats> {
    return apiCall<SupportStats>('/admin/support/conversations/stats/');
  }

  // ===================================================================
  // EMAIL ENDPOINTS
  // ===================================================================

  /**
   * Send an email reply in an existing conversation
   */
  static async sendEmailReply(
    conversationId: string,
    bodyHtml: string,
    subject?: string,
    bodyText?: string
  ): Promise<Message> {
    return apiCall<Message>(
      `/admin/support/conversations/${conversationId}/send-email/`,
      'POST',
      {
        body_html: bodyHtml,
        ...(subject ? { subject } : {}),
        ...(bodyText ? { body_text: bodyText } : {}),
      }
    );
  }

  /**
   * Create a new email conversation
   */
  static async createEmailConversation(
    toEmail: string,
    subject: string,
    bodyHtml: string,
    bodyText?: string
  ): Promise<Conversation> {
    return apiCall<Conversation>(
      '/admin/support/conversations/new-email/',
      'POST',
      {
        to_email: toEmail,
        subject,
        body_html: bodyHtml,
        ...(bodyText ? { body_text: bodyText } : {}),
      }
    );
  }

  /**
   * Convert a live chat conversation to an email ticket
   */
  static async convertToEmail(
    conversationId: string,
    subject?: string
  ): Promise<Conversation> {
    return apiCall<Conversation>(
      `/admin/support/conversations/${conversationId}/convert-to-email/`,
      'POST',
      subject ? { subject } : {}
    );
  }

  /**
   * Get available support email templates
   */
  static async getSupportEmailTemplates(): Promise<SupportEmailTemplate[]> {
    return apiCall<SupportEmailTemplate[]>(
      '/admin/support/conversations/email-templates/'
    );
  }

  // ===================================================================
  // REAL-TIME SUBSCRIPTIONS (Polling-based for Django)
  // ===================================================================

  private static pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Subscribe to conversation updates (polling-based)
   */
  static subscribeToConversations(
    callback: (conversation: Conversation) => void,
    pollInterval = 5000
  ): { unsubscribe: () => void } {
    let lastUpdate = new Date().toISOString();

    const getTimestamp = (conv: Conversation) => conv.updated_at || conv.last_message_at || conv.created_at;

    const poll = async () => {
      try {
        const conversations = await this.getAllConversations();
        conversations.forEach(conv => {
          const ts = getTimestamp(conv);
          if (ts && ts > lastUpdate) {
            callback(conv);
          }
        });
        if (conversations.length > 0) {
          const maxDate = conversations.reduce((max, c) => {
            const ts = getTimestamp(c);
            return ts && ts > max ? ts : max;
          }, lastUpdate);
          lastUpdate = maxDate;
        }
      } catch (error) {
        console.error('Failed to poll conversations:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const intervalId = setInterval(poll, pollInterval);
    this.pollingIntervals.set('conversations', intervalId);

    return {
      unsubscribe: () => {
        clearInterval(intervalId);
        this.pollingIntervals.delete('conversations');
      }
    };
  }

  /**
   * Subscribe to messages for a conversation (polling-based)
   */
  static subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void,
    pollInterval = 3000
  ): { unsubscribe: () => void } {
    let lastMessageTime = new Date().toISOString();

    const poll = async () => {
      try {
        const messages = await this.getConversationMessages(conversationId, true);
        messages.forEach(msg => {
          if (msg.created_at > lastMessageTime) {
            callback(msg);
          }
        });
        if (messages.length > 0) {
          const maxDate = messages.reduce((max, m) =>
            m.created_at > max ? m.created_at : max, lastMessageTime
          );
          lastMessageTime = maxDate;
        }
      } catch (error) {
        console.error('Failed to poll messages:', error);
      }
    };

    // Set up interval
    const intervalId = setInterval(poll, pollInterval);
    this.pollingIntervals.set(`messages-${conversationId}`, intervalId);

    return {
      unsubscribe: () => {
        clearInterval(intervalId);
        this.pollingIntervals.delete(`messages-${conversationId}`);
      }
    };
  }

  /**
   * Clean up all subscriptions
   */
  static unsubscribeAll(): void {
    this.pollingIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();
  }

  // ===================================================================
  // WIDGET CLIENT ENDPOINTS (for testing)
  // ===================================================================

  /**
   * Start a new conversation (widget endpoint)
   */
  static async startConversation(
    userId: string,
    accountLogin?: string,
    userName?: string
  ): Promise<{ conversation: Conversation; greeting: string }> {
    return apiCall<{ conversation: Conversation; greeting: string }>(
      '/support/chat/start-conversation/',
      'POST',
      { account_login: accountLogin, user_name: userName }
    );
  }

  /**
   * Send message (widget endpoint)
   */
  static async sendMessage(
    conversationId: string,
    message: string,
    userId?: string
  ): Promise<{
    user_message: Message;
    ai_response: Message | null;
    escalated: boolean;
    emotional_level: string;
  }> {
    return apiCall(
      '/support/chat/send-message/',
      'POST',
      { conversation_id: conversationId, message }
    );
  }

  /**
   * Export conversation
   */
  static async exportConversation(
    conversationId: string
  ): Promise<{ text: string; filename: string }> {
    return apiCall(
      '/support/chat/export-conversation/',
      'POST',
      { conversation_id: conversationId }
    );
  }

  /**
   * List user's conversations (widget endpoint)
   */
  static async listConversations(userId: string): Promise<Conversation[]> {
    return apiCall<Conversation[]>('/support/chat/list-conversations/', 'POST');
  }

  // ===================================================================
  // AGENT & MENTION ENDPOINTS
  // ===================================================================

  /**
   * Get list of support agents
   */
  static async getAgents(): Promise<Agent[]> {
    return apiCall<Agent[]>('/admin/support/agents/');
  }

  /**
   * Get mention notifications for the current user
   */
  static async getMentionNotifications(all = false): Promise<{
    notifications: MentionNotification[];
    unread_count: number;
  }> {
    const endpoint = all ? '/admin/support/mentions/?all=true' : '/admin/support/mentions/';
    return apiCall(endpoint);
  }

  /**
   * Mark mention notifications as read
   */
  static async markMentionsRead(notificationIds?: string[]): Promise<{ success: boolean; marked_read: number }> {
    const data = notificationIds?.length
      ? { notification_ids: notificationIds }
      : { mark_all: true };
    return apiCall('/admin/support/mentions/mark-read/', 'POST', data);
  }
}
