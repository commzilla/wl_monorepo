
import React, { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Ticket } from '@/lib/types/tickets';
import TicketDetailsDialog from '@/components/tickets/TicketDetailsDialog';
import TicketFilters from '@/components/tickets/TicketFilters';
import CreateTicketForm from '@/components/tickets/CreateTicketForm';
import TicketsTable from '@/components/tickets/TicketsTable';
import { useTickets } from '@/hooks/useTickets';

const Tickets = () => {
  const { tickets, isLoading, fetchTickets, createTicket, getTicketDetails } = useTickets();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const success = await createTicket(formData);
    
    if (success) {
      // Reset form
      (e.target as HTMLFormElement).reset();
    }
  };

  const handleViewTicket = async (ticket: Ticket) => {
    const fullTicket = await getTicketDetails(ticket.id);
    if (fullTicket) {
      setSelectedTicket(fullTicket);
      setIsTicketDialogOpen(true);
    }
  };

  const getFilteredTickets = () => {
    return tickets.filter(ticket => {
      const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
      const priorityMatch = priorityFilter === 'all' || ticket.priority === priorityFilter;
      return statusMatch && priorityMatch;
    });
  };

  const filteredTickets = getFilteredTickets();

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Support Tickets"
        subtitle="Manage all support requests from traders"
      />

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4">
        <TicketFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          onRefresh={fetchTickets}
        />

        <CreateTicketForm onSubmit={handleCreateTicket} />
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketsTable
            tickets={filteredTickets}
            isLoading={isLoading}
            onViewTicket={handleViewTicket}
          />
        </CardContent>
      </Card>
      
      <TicketDetailsDialog 
        ticket={selectedTicket}
        isOpen={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
        onTicketUpdated={fetchTickets}
      />
    </div>
  );
};

export default Tickets;
