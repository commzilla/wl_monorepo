
import React from 'react';
import { Lock, Mail, User } from 'lucide-react';
import { Ticket } from '@/lib/types/tickets';

interface TicketConversationProps {
  ticket: Ticket;
}

const TicketConversation: React.FC<TicketConversationProps> = ({ ticket }) => {
  if (!ticket.replies || ticket.replies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Conversation</h3>
      {ticket.replies.map((reply) => {
        // If reply has created_by (agent replied), it's not a customer reply
        const isCustomerReply = !reply.created_by;
        const isInternalNote = reply.is_internal;
        
        return (
          <div key={reply.id} className="border rounded-lg p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 text-sm">
              {isInternalNote ? (
                <>
                  <Lock size={16} className="text-yellow-600" />
                  <span className="font-medium text-yellow-700">Internal Note</span>
                </>
              ) : isCustomerReply ? (
                <>
                  <Mail size={16} className="text-blue-600" />
                  <span className="font-medium text-blue-700">Customer Reply</span>
                </>
              ) : (
                <>
                  <User size={16} className="text-green-600" />
                  <span className="font-medium text-green-700">Support Response</span>
                </>
              )}
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {new Date(reply.created_at).toLocaleString()}
              </span>
            </div>
            
            {/* Sender info */}
            <div className="text-sm text-muted-foreground mb-3">
              {isInternalNote ? (
                <span>
                  <span className="font-medium">By:</span> {reply.profile 
                    ? `${reply.profile.first_name} ${reply.profile.last_name}` 
                    : 'System'
                  }
                </span>
              ) : isCustomerReply ? (
                <span>
                  <span className="font-medium">From:</span> {ticket.requester_name} &lt;{ticket.requester_email}&gt;
                </span>
              ) : (
                <span>
                  <span className="font-medium">From:</span> {reply.profile 
                    ? `${reply.profile.first_name} ${reply.profile.last_name}${reply.profile.email ? ` <${reply.profile.email}>` : ''}` 
                    : 'Support Team'
                  }
                </span>
              )}
            </div>
            
            {/* Message content */}
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {reply.message}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TicketConversation;
