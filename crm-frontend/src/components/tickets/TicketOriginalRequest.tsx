
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Mail, Paperclip, ExternalLink } from 'lucide-react';
import { Ticket } from '@/lib/types/tickets';

interface TicketOriginalRequestProps {
  ticket: Ticket;
}

const TicketOriginalRequest: React.FC<TicketOriginalRequestProps> = ({ ticket }) => {
  const attachments = ticket.attachments || [];

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
        <Mail size={16} />
        <span className="font-medium">Original Request</span>
        <span>•</span>
        <span>{new Date(ticket.created_at).toLocaleString()}</span>
      </div>
      <div className="space-y-2">
        <div className="text-sm">
          <span className="font-medium">From:</span> {ticket.requester_name} &lt;{ticket.requester_email}&gt;
        </div>
        <div className="text-sm">
          <span className="font-medium">Subject:</span> {ticket.subject}
        </div>
        <Separator className="my-3" />
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</div>
        
        {attachments.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Paperclip size={14} />
                <span>Attachments ({attachments.length})</span>
              </div>
              <div className="grid gap-2">
                {attachments.map((url, index) => {
                  const fileName = url.split('/').pop() || `attachment-${index + 1}`;
                  return (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink size={12} />
                      {fileName}
                    </a>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TicketOriginalRequest;
