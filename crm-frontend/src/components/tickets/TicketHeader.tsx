
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Ticket } from '@/lib/types/tickets';

interface TicketHeaderProps {
  ticket: Ticket;
}

const TicketHeader: React.FC<TicketHeaderProps> = ({ ticket }) => {
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

  const priorityInfo = getPriorityLabel(ticket.priority);
  const statusInfo = getStatusLabel(ticket.status);

  return (
    <>
      <DialogTitle className="text-xl flex items-start justify-between gap-4">
        <span>Ticket #{ticket.id.slice(0, 8)}: {ticket.subject}</span>
        <div className="flex gap-2">
          <Badge variant="outline" className={statusInfo.color}>
            {statusInfo.label}
          </Badge>
          <Badge variant="outline" className={priorityInfo.color}>
            {priorityInfo.label}
          </Badge>
        </div>
      </DialogTitle>
      <DialogDescription className="text-sm text-muted-foreground">
        From: {ticket.requester_name} ({ticket.requester_email})
        <br />
        Created: {new Date(ticket.created_at).toLocaleString()}
        <br />
        Assigned to: {ticket.assigned_profile 
          ? `${ticket.assigned_profile.first_name} ${ticket.assigned_profile.last_name}` 
          : 'Unassigned'
        }
      </DialogDescription>
    </>
  );
};

export default TicketHeader;
