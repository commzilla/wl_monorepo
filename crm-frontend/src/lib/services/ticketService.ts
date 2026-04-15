import { Ticket, TicketReply, Profile } from '@/lib/types/tickets';

// Mock ticket service implementation
class MockTicketService {
  async getTickets(): Promise<Ticket[]> {
    console.log('Demo mode: No support tickets available');
    return [];
  }

  async getTicket(id: string): Promise<Ticket | null> {
    console.log('Demo mode: No ticket data available for ID:', id);
    return null;
  }

  async createTicket(params: any): Promise<Ticket> {
    console.log('Demo mode: Ticket creation disabled');
    throw new Error('Support ticket functionality unavailable - No backend connection');
  }

  async updateTicket(id: string, updates: any): Promise<Ticket | null> {
    console.log('Demo mode: Ticket updates disabled for ID:', id);
    return null;
  }

  async updateTicketStatus(id: string, status: string): Promise<Ticket | null> {
    console.log('Demo mode: Ticket status updates disabled for ID:', id);
    return null;
  }

  async deleteTicket(id: string): Promise<boolean> {
    console.log('Demo mode: Ticket deletion disabled for ID:', id);
    return false;
  }

  async assignTicket(ticketId: string, agentId: string | null): Promise<Ticket | null> {
    console.log('Demo mode: Ticket assignment disabled');
    return null;
  }

  async addReply(params: { ticket_id: string; message: string; is_internal?: boolean }): Promise<TicketReply> {
    console.log('Demo mode: Ticket replies disabled');
    throw new Error('Support ticket functionality unavailable - No backend connection');
  }

  async getProfiles(): Promise<Profile[]> {
    console.log('Demo mode: No user profiles available');
    return [];
  }
}

export const TicketService = new MockTicketService();