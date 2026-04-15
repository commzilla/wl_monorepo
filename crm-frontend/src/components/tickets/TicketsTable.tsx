
import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { Ticket } from '@/lib/types/tickets';

interface TicketsTableProps {
  tickets: Ticket[];
  isLoading: boolean;
  onViewTicket: (ticket: Ticket) => void;
}

const TicketsTable: React.FC<TicketsTableProps> = ({ tickets, isLoading, onViewTicket }) => {
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return { label: 'Low', color: 'bg-green-100 text-green-800' };
      case 'medium': return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
      case 'high': return { label: 'High', color: 'bg-orange-100 text-orange-800' };
      case 'urgent': return { label: 'Urgent', color: 'bg-red-100 text-red-800' };
      default: return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return { label: 'Open', color: 'bg-blue-100 text-blue-800' };
      case 'pending': return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
      case 'resolved': return { label: 'Resolved', color: 'bg-green-100 text-green-800' };
      case 'closed': return { label: 'Closed', color: 'bg-gray-100 text-gray-800' };
      default: return { label: 'New', color: 'bg-purple-100 text-purple-800' };
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="h-10 w-10 mx-auto mb-3 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p>Loading tickets...</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No tickets found</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Requester</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Assigned To</TableHead>
          <TableHead>Created</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map(ticket => {
          const priorityInfo = getPriorityLabel(ticket.priority);
          const statusInfo = getStatusLabel(ticket.status);
          
          return (
            <TableRow key={ticket.id}>
              <TableCell className="font-mono">{ticket.id.slice(0, 8)}</TableCell>
              <TableCell className="font-medium">{ticket.subject}</TableCell>
              <TableCell>{ticket.requester_email}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={priorityInfo.color}>
                  {priorityInfo.label}
                </Badge>
              </TableCell>
              <TableCell>
                {ticket.assigned_profile 
                  ? `${ticket.assigned_profile.first_name} ${ticket.assigned_profile.last_name}` 
                  : 'Unassigned'
                }
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(ticket.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onViewTicket(ticket)}
                  className="flex gap-1 items-center"
                >
                  <MessageSquare size={14} />
                  <span>Respond</span>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default TicketsTable;
