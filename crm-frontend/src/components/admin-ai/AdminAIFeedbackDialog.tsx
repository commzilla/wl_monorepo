import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { adminAIService } from '@/services/adminAIService';
import { useToast } from '@/hooks/use-toast';
import type { AdminAIIssueType } from '@/types/adminAI';

interface AdminAIFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  conversationId: string;
  messageContent: string;
}

const issueTypes: { value: AdminAIIssueType; label: string }[] = [
  { value: 'wrong_data', label: 'Wrong Data' },
  { value: 'wrong_action', label: 'Wrong Action' },
  { value: 'poor_explanation', label: 'Poor Explanation' },
  { value: 'hallucination', label: 'Hallucination' },
  { value: 'other', label: 'Other' },
];

export function AdminAIFeedbackDialog({
  open,
  onOpenChange,
  messageId,
  conversationId,
  messageContent,
}: AdminAIFeedbackDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issueType, setIssueType] = useState<AdminAIIssueType>('other');
  const [correctionText, setCorrectionText] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await adminAIService.submitFeedback({
        conversation: conversationId,
        message: messageId,
        admin_user: '', // Backend sets this from request.user
        is_positive: false,
        issue_type: issueType,
        correction_text: correctionText,
        notes,
      });

      toast({ title: 'Feedback submitted successfully' });
      onOpenChange(false);

      // Reset form
      setIssueType('other');
      setCorrectionText('');
      setNotes('');
    } catch {
      toast({ title: 'Failed to submit feedback', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report AI Response Issue</DialogTitle>
          <DialogDescription>Help improve the AI assistant by reporting what went wrong</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Preview */}
          <div className="p-2.5 bg-muted rounded-lg text-xs max-h-20 overflow-y-auto text-muted-foreground">
            {messageContent.length > 150 ? `${messageContent.slice(0, 150)}...` : messageContent}
          </div>

          {/* Issue Type */}
          <div className="space-y-2">
            <Label>Issue Type</Label>
            <Select value={issueType} onValueChange={(v) => setIssueType(v as AdminAIIssueType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Correction */}
          <div className="space-y-2">
            <Label htmlFor="correction">What should the correct response be?</Label>
            <Textarea
              id="correction"
              value={correctionText}
              onChange={(e) => setCorrectionText(e.target.value)}
              placeholder="Describe the ideal response..."
              rows={3}
              maxLength={2000}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra context..."
              rows={2}
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
