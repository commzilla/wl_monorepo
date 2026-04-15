
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Ticket, Profile } from '@/lib/types/tickets';
import { TicketService } from '@/lib/services/ticketService';
import { toast } from 'sonner';
import TicketHeader from './TicketHeader';
import TicketStatusControls from './TicketStatusControls';
import TicketOriginalRequest from './TicketOriginalRequest';
import TicketConversation from './TicketConversation';
import TicketReplyForm from './TicketReplyForm';

interface TicketDetailsDialogProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketUpdated: () => void;
}

const TicketDetailsDialog: React.FC<TicketDetailsDialogProps> = ({
  ticket: initialTicket,
  isOpen,
  onOpenChange,
  onTicketUpdated
}) => {
  const [ticket, setTicket] = useState<Ticket | null>(initialTicket);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  // Update local ticket state when initialTicket changes
  useEffect(() => {
    setTicket(initialTicket);
  }, [initialTicket]);
  
  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
    }
  }, [isOpen]);

  const fetchProfiles = async () => {
    try {
      const profilesData = await TicketService.getProfiles();
      setProfiles(profilesData);
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    }
  };

  const refreshTicketData = async () => {
    if (!ticket) return;
    
    try {
      const updatedTicket = await TicketService.getTicket(ticket.id);
      setTicket(updatedTicket);
      onTicketUpdated(); // Also update the parent list
    } catch (error) {
      console.error('Failed to refresh ticket data:', error);
    }
  };
  
  const handleSubmitReply = async (message: string, isInternal: boolean) => {
    if (!ticket) return;
    if (!message.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await TicketService.addReply({
        ticket_id: ticket.id,
        message,
        is_internal: isInternal
      });
      
      toast.success('Reply sent successfully');
      await refreshTicketData(); // Refresh ticket data to show new reply
    } catch (error) {
      console.error('Failed to send reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleResolveTicket = async () => {
    if (!ticket) return;
    
    setIsSubmitting(true);
    try {
      await TicketService.updateTicketStatus(ticket.id, 'resolved');
      toast.success('Ticket marked as resolved');
      await refreshTicketData(); // Refresh ticket data to show new status
    } catch (error) {
      console.error('Failed to resolve ticket:', error);
      toast.error('Failed to resolve ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignTicket = async (userId: string) => {
    if (!ticket) return;
    
    try {
      await TicketService.assignTicket(ticket.id, userId === 'unassigned' ? null : userId);
      toast.success('Ticket assignment updated');
      await refreshTicketData(); // Refresh ticket data to show new assignment
    } catch (error) {
      console.error('Failed to assign ticket:', error);
      toast.error('Failed to assign ticket');
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!ticket) return;
    
    try {
      await TicketService.updateTicketStatus(ticket.id, status as any);
      toast.success('Ticket status updated');
      await refreshTicketData(); // Refresh ticket data to show new status
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const handlePriorityChange = async (priority: string) => {
    if (!ticket) return;
    
    try {
      await TicketService.updateTicket(ticket.id, { priority: priority as any });
      toast.success('Ticket priority updated');
      await refreshTicketData(); // Refresh ticket data to show new priority
    } catch (error) {
      console.error('Failed to update priority:', error);
      toast.error('Failed to update priority');
    }
  };
  
  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <TicketHeader ticket={ticket} />
        </DialogHeader>
        
        <div className="space-y-4">
          <TicketStatusControls
            ticket={ticket}
            profiles={profiles}
            onStatusChange={handleStatusChange}
            onAssignTicket={handleAssignTicket}
            onPriorityChange={handlePriorityChange}
          />

          <TicketOriginalRequest ticket={ticket} />
          
          <TicketConversation ticket={ticket} />
          
          <Separator />
          
          <TicketReplyForm
            ticket={ticket}
            onSubmitReply={handleSubmitReply}
            onResolveTicket={handleResolveTicket}
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailsDialog;
