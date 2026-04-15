import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, X } from 'lucide-react';
import { SupportService, SupportEmailTemplate, Conversation } from '@/services/supportService';
import { EmailRichTextEditor } from './EmailRichTextEditor';

interface EmailComposePanelProps {
  conversation: Conversation;
  onSend: (bodyHtml: string, subject: string) => Promise<void>;
  onCancel: () => void;
  sending: boolean;
}

export const EmailComposePanel: React.FC<EmailComposePanelProps> = ({
  conversation,
  onSend,
  onCancel,
  sending,
}) => {
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [templates, setTemplates] = useState<SupportEmailTemplate[]>([]);

  useEffect(() => {
    // Pre-fill subject from conversation
    const existingSubject = conversation.email_subject || conversation.subject || '';
    setSubject(existingSubject ? (existingSubject.toLowerCase().startsWith('re:') ? existingSubject : `Re: ${existingSubject}`) : '');

    // Load templates
    SupportService.getSupportEmailTemplates()
      .then(setTemplates)
      .catch(() => {}); // Silently fail if no templates
  }, [conversation.id]);

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'none') {
      return;
    }
    const template = templates.find(t => t.id === Number(templateId));
    if (template) {
      setBodyHtml(template.body_html);
      if (template.subject && !subject) {
        setSubject(template.subject);
      }
    }
  };

  const handleSend = async () => {
    if (!bodyHtml.trim() || !recipientEmail) return;
    try {
      await onSend(bodyHtml, subject);
      setBodyHtml('');
    } catch {
      // Error already handled by parent — keep body intact for retry
    }
  };

  const recipientEmail = conversation.user_email || conversation.guest_email || '';

  return (
    <div className="p-4 border-t space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Compose Email</span>
          {recipientEmail ? (
            <span className="text-xs text-muted-foreground">to: {recipientEmail}</span>
          ) : (
            <span className="text-xs text-red-500">No email address on file</span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="text-sm"
          />
        </div>
        {templates.length > 0 && (
          <Select onValueChange={handleTemplateSelect}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No template</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <EmailRichTextEditor
        content={bodyHtml}
        onChange={setBodyHtml}
        placeholder="Compose your email..."
      />

      <div className="flex justify-end">
        <Button
          onClick={handleSend}
          disabled={sending || !bodyHtml.trim() || !recipientEmail}
          size="sm"
        >
          <Send className="h-4 w-4 mr-1" />
          {sending ? 'Sending...' : 'Send Email'}
        </Button>
      </div>
    </div>
  );
};
