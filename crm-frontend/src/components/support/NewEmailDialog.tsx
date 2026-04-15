import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send } from 'lucide-react';
import { SupportService, SupportEmailTemplate, Conversation } from '@/services/supportService';
import { useToast } from '@/hooks/use-toast';
import { EmailRichTextEditor } from './EmailRichTextEditor';

interface NewEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversation: Conversation) => void;
}

export const NewEmailDialog: React.FC<NewEmailDialogProps> = ({
  open,
  onOpenChange,
  onConversationCreated,
}) => {
  const { toast } = useToast();
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [templates, setTemplates] = useState<SupportEmailTemplate[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setToEmail('');
      setSubject('');
      setBodyHtml('');
      SupportService.getSupportEmailTemplates()
        .then(setTemplates)
        .catch(() => {});
    }
  }, [open]);

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'none') return;
    const template = templates.find(t => t.id === Number(templateId));
    if (template) {
      setBodyHtml(template.body_html);
      if (template.subject && !subject) {
        setSubject(template.subject);
      }
    }
  };

  const handleSend = async () => {
    if (!toEmail.trim() || !subject.trim() || !bodyHtml.trim()) return;

    setSending(true);
    try {
      const conversation = await SupportService.createEmailConversation(
        toEmail,
        subject,
        bodyHtml,
      );
      toast({
        title: 'Email sent',
        description: `New email conversation created with ${toEmail}`,
      });
      onOpenChange(false);
      onConversationCreated(conversation);
    } catch (error: any) {
      toast({
        title: 'Failed to send email',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>New Email Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="to-email">To</Label>
            <Input
              id="to-email"
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            {templates.length > 0 && (
              <div>
                <Label>Template</Label>
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
              </div>
            )}
          </div>

          <div>
            <Label className="mb-1 block">Body</Label>
            <EmailRichTextEditor
              content={bodyHtml}
              onChange={setBodyHtml}
              placeholder="Compose your email..."
              minHeight="150px"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !toEmail.trim() || !subject.trim() || !bodyHtml.trim()}
            >
              <Send className="h-4 w-4 mr-1" />
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
