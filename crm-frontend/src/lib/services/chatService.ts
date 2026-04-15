import { ChatWidgetConfig, ChatSession, ChatMessage, ChatWidgetConfigUpdate } from '@/lib/types/chat';

// Mock chat service implementation
export class ChatService {
  static async getWidgetConfig(): Promise<ChatWidgetConfig | null> {
    // Return basic configuration for display but no functional data
    return {
      id: 'demo-config',
      name: 'Chat Widget (Demo)',
      primary_color: '#8B5CF6',
      secondary_color: '#6E59A5', 
      text_color: '#FFFFFF',
      background_color: '#FFFFFF',
      position: 'bottom-right',
      welcome_message: 'Chat functionality disabled - No backend connection',
      offline_message: 'Chat service unavailable',
      logo_url: null,
      widget_identifier: 'demo-widget',
      is_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  static async updateWidgetConfig(configId: string, updates: ChatWidgetConfigUpdate): Promise<ChatWidgetConfig | null> {
    console.log('Demo mode: Widget config update disabled');
    return null;
  }

  static async createChatSession(visitorId: string): Promise<ChatSession> {
    console.log('Demo mode: Chat session creation disabled');
    throw new Error('Chat functionality unavailable - No backend connection');
  }

  static async getChatSession(sessionId: string): Promise<ChatSession | null> {
    console.log('Demo mode: No chat sessions available');
    return null;
  }

  static async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | null> {
    console.log('Demo mode: Chat session updates disabled');
    return null;
  }

  static async getActiveSessions(): Promise<ChatSession[]> {
    console.log('Demo mode: No active chat sessions');
    return [];
  }

  static async sendMessage(sessionId: string, message: string, senderType: 'visitor' | 'agent', senderId?: string): Promise<ChatMessage> {
    console.log('Demo mode: Message sending disabled');
    throw new Error('Chat functionality unavailable - No backend connection');
  }

  static async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    console.log('Demo mode: No chat messages available');
    return [];
  }

  static async convertChatToTicket(sessionId: string, visitorName: string, visitorEmail: string): Promise<string | null> {
    console.log('Demo mode: Chat to ticket conversion disabled');
    return null;
  }

  static subscribeToChatMessages(sessionId: string, callback: (message: ChatMessage) => void) {
    console.log('Demo mode: Real-time chat messaging disabled');
    return {
      unsubscribe: () => console.log('Demo mode: No subscriptions to unsubscribe')
    };
  }

  static subscribeToActiveSessions(callback: (session: ChatSession) => void) {
    console.log('Demo mode: Real-time session tracking disabled');
    return {
      unsubscribe: () => console.log('Demo mode: No subscriptions to unsubscribe')
    };
  }
}