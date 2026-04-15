
export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email?: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  message: string;
  is_internal: boolean;
  is_chat_message: boolean;
  created_by: string | null;
  created_at: string;
  profile?: Profile;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  text: string;
  author: string;
  created_at: string;
}

export type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed';

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requester_email: string;
  requester_name: string;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  attachments?: string[];
  assigned_profile?: Profile;
  created_profile?: Profile;
  replies?: TicketReply[];
}

export interface TicketCreate {
  subject: string;
  description: string;
  requester_email: string;
  requester_name: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status?: TicketStatus;
  assigned_to?: string;
  attachments?: string[];
}

export interface TicketReplyCreate {
  ticket_id: string;
  message: string;
  is_internal?: boolean;
  is_chat_message?: boolean;
}

export interface TicketUpdate {
  status?: TicketStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
}
