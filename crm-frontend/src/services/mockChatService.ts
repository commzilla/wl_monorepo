
import { ChatWidgetConfig, ChatSession, ChatMessage, ChatWidgetConfigUpdate } from '@/lib/types/chat';

class MockChatService {
  private readonly CONFIG_KEY = 'mock_chat_config';
  private readonly SESSIONS_KEY = 'mock_chat_sessions';
  private readonly MESSAGES_KEY = 'mock_chat_messages';

  private getConfig(): ChatWidgetConfig {
    const stored = localStorage.getItem(this.CONFIG_KEY);
    return stored ? JSON.parse(stored) : this.getDefaultConfig();
  }

  private getDefaultConfig(): ChatWidgetConfig {
    const config: ChatWidgetConfig = {
      id: 'default-config',
      name: 'Chat Widget',
      primary_color: '#8B5CF6',
      secondary_color: '#6E59A5',
      text_color: '#FFFFFF',
      background_color: '#FFFFFF',
      position: 'bottom-right',
      welcome_message: 'Hello! How can we help you today?',
      offline_message: 'We\'re currently offline. Please leave a message and we\'ll get back to you soon.',
      logo_url: null,
      widget_identifier: 'default-widget',
      is_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
    return config;
  }

  private getSessions(): ChatSession[] {
    const stored = localStorage.getItem(this.SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private saveSessions(sessions: ChatSession[]): void {
    localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
  }

  private getMessages(): ChatMessage[] {
    const stored = localStorage.getItem(this.MESSAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private saveMessages(messages: ChatMessage[]): void {
    localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages));
  }

  async getWidgetConfig(): Promise<ChatWidgetConfig | null> {
    console.log('Fetching chat widget config');
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getConfig();
  }

  async updateWidgetConfig(configId: string, updates: ChatWidgetConfigUpdate): Promise<ChatWidgetConfig | null> {
    console.log('Updating chat widget config', { configId, updates });
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const config = this.getConfig();
    const updatedConfig = {
      ...config,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(updatedConfig));
    return updatedConfig;
  }

  async createChatSession(visitorId: string): Promise<ChatSession> {
    console.log('Creating chat session for visitor:', visitorId);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const sessions = this.getSessions();
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      visitor_id: visitorId,
      visitor_name: null,
      visitor_email: null,
      status: 'active',
      ticket_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    sessions.push(newSession);
    this.saveSessions(sessions);
    return newSession;
  }

  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const sessions = this.getSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    
    if (index === -1) return null;

    sessions[index] = {
      ...sessions[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.saveSessions(sessions);
    return sessions[index];
  }

  async getActiveSessions(): Promise<ChatSession[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const sessions = this.getSessions();
    return sessions.filter(s => s.status === 'active');
  }

  async sendMessage(sessionId: string, message: string, senderType: 'visitor' | 'agent', senderId?: string): Promise<ChatMessage> {
    console.log('Sending chat message', { sessionId, senderType, message });
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const messages = this.getMessages();
    const newMessage: ChatMessage = {
      id: `message-${Date.now()}`,
      session_id: sessionId,
      message,
      sender_type: senderType,
      sender_id: senderId || null,
      created_at: new Date().toISOString()
    };

    messages.push(newMessage);
    this.saveMessages(messages);
    return newMessage;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    const messages = this.getMessages();
    return messages.filter(m => m.session_id === sessionId);
  }

  async convertChatToTicket(sessionId: string, visitorName: string, visitorEmail: string): Promise<string | null> {
    try {
      const messages = await this.getChatMessages(sessionId);
      
      if (messages.length === 0) {
        throw new Error('No messages found in chat session');
      }

      // Mock ticket creation
      const ticketId = `ticket-from-chat-${Date.now()}`;
      
      // Update session with ticket ID
      await this.updateChatSession(sessionId, {
        ticket_id: ticketId,
        status: 'transferred_to_ticket'
      });

      console.log('Chat converted to ticket:', ticketId);
      return ticketId;
    } catch (error) {
      console.error('Error converting chat to ticket:', error);
      return null;
    }
  }

  // Mock real-time subscriptions
  subscribeToChatMessages(sessionId: string, callback: (message: ChatMessage) => void) {
    console.log('Subscribing to chat messages for session:', sessionId);
    
    // Mock subscription - in real app this would be WebSocket or SSE
    const mockChannel = {
      unsubscribe: () => {
        console.log('Unsubscribed from chat messages');
      }
    };

    return mockChannel;
  }

  subscribeToActiveSessions(callback: (session: ChatSession) => void) {
    const mockChannel = {
      unsubscribe: () => {
        console.log('Unsubscribed from active sessions');
      }
    };

    return mockChannel;
  }
}

export const mockChatService = new MockChatService();
