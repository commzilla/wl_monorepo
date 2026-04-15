
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Ticket, Profile } from '@/lib/types/tickets';

interface TicketStatusControlsProps {
  ticket: Ticket;
  profiles: Profile[];
  onStatusChange: (status: string) => void;
  onAssignTicket: (userId: string) => void;
  onPriorityChange: (priority: string) => void;
}

const TicketStatusControls: React.FC<TicketStatusControlsProps> = ({
  ticket,
  profiles,
  onStatusChange,
  onAssignTicket,
  onPriorityChange
}) => {
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <Label htmlFor="status">Status</Label>
        <Select value={ticket.status} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex-1">
        <Label htmlFor="assigned">Assign To</Label>
        <Select 
          value={ticket.assigned_to || 'unassigned'} 
          onValueChange={onAssignTicket}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.first_name} {profile.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <Label htmlFor="priority">Priority</Label>
        <Select value={ticket.priority} onValueChange={onPriorityChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TicketStatusControls;
