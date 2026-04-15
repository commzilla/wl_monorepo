
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';
import { CheckCircle2, Lock, Send } from 'lucide-react';
import { Ticket } from '@/lib/types/tickets';

interface TicketReplyFormProps {
  ticket: Ticket;
  onSubmitReply: (message: string, isInternal: boolean) => Promise<void>;
  onResolveTicket: () => Promise<void>;
  isSubmitting: boolean;
}

const TicketReplyForm: React.FC<TicketReplyFormProps> = ({
  ticket,
  onSubmitReply,
  onResolveTicket,
  isSubmitting
}) => {
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const handleSubmit = async () => {
    if (!replyText.trim()) return;
    
    await onSubmitReply(replyText, isInternal);
    setReplyText('');
    setIsInternal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h3 className="font-medium">Reply to customer</h3>
        <div className="ml-auto flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsInternal(!isInternal)}
            className={`flex items-center gap-1 ${isInternal ? 'bg-yellow-50 border-yellow-200' : ''}`}
          >
            <Lock size={14} />
            <span>{isInternal ? 'Internal Note' : 'Public Reply'}</span>
          </Button>
          
          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResolveTicket}
              className="flex items-center gap-1"
              disabled={isSubmitting}
            >
              <CheckCircle2 size={14} />
              <span>Resolve</span>
            </Button>
          )}
        </div>
      </div>
      
      <Textarea
        placeholder={isInternal ? "Add an internal note..." : "Reply to customer..."}
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        rows={4}
        className="w-full"
      />
      
      <DialogFooter>
        <Button
          type="button"
          onClick={handleSubmit}
          className="flex items-center gap-1"
          disabled={isSubmitting || !replyText.trim()}
        >
          <Send size={14} />
          <span>{isInternal ? 'Add Note' : 'Send Reply'}</span>
        </Button>
      </DialogFooter>
    </div>
  );
};

export default TicketReplyForm;
