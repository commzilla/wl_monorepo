
import { Ticket, TicketReply, Profile } from '@/lib/types/tickets';

export interface CreateTicketParams {
  subject: string;
  description: string;
  requester_email: string;
  requester_name: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  attachments?: string[];
}

export interface UpdateTicketParams {
  status?: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  agent_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export class MockTicketService {
  private static instance: MockTicketService;
  
  static getInstance(): MockTicketService {
    if (!MockTicketService.instance) {
      MockTicketService.instance = new MockTicketService();
    }
    return MockTicketService.instance;
  }

  private STORAGE_KEY = 'mockTickets';
  private REPLIES_KEY = 'mockTicketReplies';

  private constructor() {}

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private saveTickets(tickets: Ticket[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tickets));
  }

  private getReplies(): TicketReply[] {
    const stored = localStorage.getItem(this.REPLIES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private saveReplies(replies: TicketReply[]): void {
    localStorage.setItem(this.REPLIES_KEY, JSON.stringify(replies));
  }

  public async getTickets(): Promise<Ticket[]> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  }

  public async getTicket(id: string): Promise<Ticket | null> {
    const tickets = await this.getTickets();
    const ticket = tickets.find(ticket => ticket.id === id) || null;
    
    if (ticket) {
      // Attach replies to ticket
      const replies = this.getReplies().filter(reply => reply.ticket_id === id);
      ticket.replies = replies;
    }
    
    return ticket;
  }

  public async createTicket(params: CreateTicketParams): Promise<Ticket> {
    const newTicket: Ticket = {
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      assigned_to: null,
      created_by: null,
      ...params
    };

    const tickets = await this.getTickets();
    tickets.push(newTicket);
    this.saveTickets(tickets);

    return newTicket;
  }

  public async updateTicket(id: string, updates: UpdateTicketParams): Promise<Ticket | null> {
    const tickets = await this.getTickets();
    const ticketIndex = tickets.findIndex(ticket => ticket.id === id);

    if (ticketIndex === -1) {
      return null;
    }

    const updatedTicket = {
      ...tickets[ticketIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    tickets[ticketIndex] = updatedTicket;
    this.saveTickets(tickets);

    return updatedTicket;
  }

  public async updateTicketStatus(id: string, status: 'new' | 'open' | 'pending' | 'resolved' | 'closed'): Promise<Ticket | null> {
    return this.updateTicket(id, { status });
  }

  public async deleteTicket(id: string): Promise<boolean> {
    let tickets = await this.getTickets();
    const initialLength = tickets.length;
    tickets = tickets.filter(ticket => ticket.id !== id);

    if (tickets.length === initialLength) {
      return false;
    }

    this.saveTickets(tickets);
    return true;
  }

  public async assignTicket(ticketId: string, agentId: string | null): Promise<Ticket | null> {
    return this.updateTicket(ticketId, { agent_id: agentId });
  }

  // Replies
  public async addReply(params: { ticket_id: string; message: string; is_internal?: boolean }): Promise<TicketReply> {
    const newReply: TicketReply = {
      id: this.generateId(),
      ticket_id: params.ticket_id,
      message: params.message,
      is_internal: params.is_internal || false,
      is_chat_message: false,
      created_by: 'current-user',
      created_at: new Date().toISOString()
    };

    const replies = this.getReplies();
    replies.push(newReply);
    this.saveReplies(replies);
    
    return newReply;
  }

  // Profiles
  public async getProfiles(): Promise<Profile[]> {
    // Mock profiles data
    return [
      {
        id: '1',
        first_name: 'John',
        last_name: 'Admin',
        avatar_url: null
      },
      {
        id: '2',
        first_name: 'Jane',
        last_name: 'Support',
        avatar_url: null
      },
      {
        id: '3',
        first_name: 'Bob',
        last_name: 'Risk',
        avatar_url: null
      }
    ];
  }
}

export const mockTicketService = MockTicketService.getInstance();
