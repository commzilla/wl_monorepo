import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Mail } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Message } from '@/services/supportService';

interface EmailMessageBubbleProps {
  message: Message;
  senderName: string;
  formatDate: (dateString: string | null | undefined, formatStr: string) => string;
}

export const EmailMessageBubble: React.FC<EmailMessageBubbleProps> = ({
  message,
  senderName,
  formatDate,
}) => {
  const isAgent = message.sender_type === 'agent';
  const emailMeta = message.email_meta || message.metadata || {};
  const emailSubject = emailMeta.subject || emailMeta.email_subject;
  const emailFrom = emailMeta.from_email || emailMeta.email_from;
  const emailTo = emailMeta.to_email || emailMeta.email_to;
  const sanitizedContent = useMemo(() => DOMPurify.sanitize(message.content), [message.content]);

  return (
    <div className="flex gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isAgent ? 'bg-amber-100 text-amber-600' : 'bg-orange-100 text-orange-600'
      }`}>
        <Mail className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{senderName}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700">
            via Email
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDate(message.created_at, 'HH:mm')}
          </span>
        </div>
        {emailSubject && (
          <div className="text-xs text-muted-foreground mb-1 font-medium">
            Subject: {emailSubject}
          </div>
        )}
        <div className={`p-3 rounded-lg border ${
          isAgent
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
            : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
        }`}>
          <div
            className="text-sm prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {isAgent && emailTo && `Sent to: ${emailTo}`}
          {!isAgent && emailFrom && `From: ${emailFrom}`}
        </div>
      </div>
    </div>
  );
};
