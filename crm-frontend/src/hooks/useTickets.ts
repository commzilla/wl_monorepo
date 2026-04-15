
import { useState, useEffect } from 'react';
import { TicketService } from '@/lib/services/ticketService';
import { Ticket } from '@/lib/types/tickets';
import { toast } from 'sonner';

export const useTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCreatedExample, setHasCreatedExample] = useState(false);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const fetchedTickets = await TicketService.getTickets();
      setTickets(fetchedTickets);
      
      // Create an example ticket if none exist and we haven't created one yet
      if (fetchedTickets.length === 0 && !hasCreatedExample) {
        await createExampleTicket();
        setHasCreatedExample(true);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      toast.error('Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const createTicket = async (formData: FormData) => {
    try {
      const subject = formData.get('subject') as string;
      const description = formData.get('description') as string;
      const priority = formData.get('priority') as 'low' | 'medium' | 'high' | 'urgent';
      const requester_email = formData.get('requester_email') as string;
      const requester_name = formData.get('requester_name') as string;
      
      if (!subject || !description || !requester_email || !requester_name) {
        toast.error('Please fill all required fields');
        return false;
      }
      
      await TicketService.createTicket({
        subject,
        description,
        requester_email,
        requester_name,
        priority,
        status: 'new'
      });
      
      toast.success('Ticket created successfully');
      await fetchTickets();
      return true;
    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast.error('Failed to create ticket');
      return false;
    }
  };

  const createExampleTicket = async () => {
    try {
      await TicketService.createTicket({
        subject: 'Unable to access MT5 trading platform',
        description: 'I am having trouble logging into my MT5 account. The system keeps saying "Invalid account" even though I am using the correct credentials. I tried resetting my password but the issue persists. This is affecting my trading activities and I need urgent assistance.',
        requester_email: 'trader.john@example.com',
        requester_name: 'John Trader',
        priority: 'high',
        status: 'new'
      });
      
      console.log('Example ticket created');
      await fetchTickets();
    } catch (error) {
      console.error('Failed to create example ticket:', error);
    }
  };

  const getTicketDetails = async (ticketId: string): Promise<Ticket | null> => {
    try {
      return await TicketService.getTicket(ticketId);
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
      toast.error('Failed to fetch ticket details');
      return null;
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return {
    tickets,
    isLoading,
    fetchTickets,
    createTicket,
    getTicketDetails
  };
};
