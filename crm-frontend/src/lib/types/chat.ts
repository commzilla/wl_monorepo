
export interface ChatWidgetConfig {
  id: string;
  name: string;
  widget_identifier: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  background_color: string;
  logo_url: string | null;
  welcome_message: string;
  offline_message: string;
  is_enabled: boolean;
  position: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  visitor_id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  ticket_id: string | null;
  status: 'active' | 'ended' | 'transferred_to_ticket';
  created_at: string;
  updated_at: string;
  visitor_metadata?: {
    clientInfo?: any;
    analytics?: any;
    sessionStartTime?: string;
  };
}

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_type: 'visitor' | 'agent';
  sender_id: string | null;
  message: string;
  created_at: string;
}

export interface ChatWidgetConfigUpdate {
  name?: string;
  widget_identifier?: string;
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
  background_color?: string;
  logo_url?: string | null;
  welcome_message?: string;
  offline_message?: string;
  is_enabled?: boolean;
  position?: string;
}
