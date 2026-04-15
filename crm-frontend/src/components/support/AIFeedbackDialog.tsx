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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, ThumbsUp, ThumbsDown, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { aiFeedbackService, AIFeedback } from '@/services/aiFeedbackService';
import { useToast } from '@/hooks/use-toast';
import { eventLogService } from '@/services/eventLogService';

interface AIFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  conversationId: string;
  agentId: string;
  messageContent: string;
  onFeedbackSubmitted?: (feedback: AIFeedback) => void;
}

type FeedbackType = 'helpful' | 'partially_helpful' | 'not_helpful' | 'wrong' | 'harmful';

const feedbackOptions: { value: FeedbackType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'helpful', label: 'Helpful', icon: <ThumbsUp className="h-4 w-4" />, color: 'text-green-600 border-green-600' },
  { value: 'partially_helpful', label: 'Partially Helpful', icon: <CheckCircle className="h-4 w-4" />, color: 'text-yellow-600 border-yellow-600' },
  { value: 'not_helpful', label: 'Not Helpful', icon: <ThumbsDown className="h-4 w-4" />, color: 'text-orange-600 border-orange-600' },
  { value: 'wrong', label: 'Wrong', icon: <XCircle className="h-4 w-4" />, color: 'text-red-600 border-red-600' },
  { value: 'harmful', label: 'Harmful', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-800 border-red-800' },
];

const issueCategories = [
  'Incorrect information',
  'Tone issue',
  'Missing context',
  'Too verbose',
  'Too brief',
  'Off-topic',
  'Technical error',
  'Policy violation',
];

export function AIFeedbackDialog({
  open,
  onOpenChange,
  messageId,
  conversationId,
  agentId,
  messageContent,
  onFeedbackSubmitted,
}: AIFeedbackDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [wasAccurate, setWasAccurate] = useState(true);
  const [wasHelpful, setWasHelpful] = useState(true);
  const [wasProfessional, setWasProfessional] = useState(true);
  const [neededCorrection, setNeededCorrection] = useState(false);
  const [correctionMade, setCorrectionMade] = useState('');
  const [agentNotes, setAgentNotes] = useState('');
  const [shouldBeTrainingExample, setShouldBeTrainingExample] = useState(false);
  const [trainingPriority, setTrainingPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (!feedbackType || rating === 0) {
      toast({ title: 'Please provide a rating and feedback type', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const feedback = await aiFeedbackService.submitFeedback({
        conversation_id: conversationId,
        message_id: messageId,
        agent_id: agentId,
        rating,
        feedback_type: feedbackType,
        was_accurate: wasAccurate,
        was_helpful: wasHelpful,
        was_professional: wasProfessional,
        needed_correction: neededCorrection,
        correction_made: neededCorrection ? correctionMade : undefined,
        agent_notes: agentNotes || undefined,
        should_be_training_example: shouldBeTrainingExample,
        training_priority: shouldBeTrainingExample ? trainingPriority : 'normal',
        issue_categories: selectedCategories,
      });

      // Log feedback submission success
      console.log('AI feedback submitted:', feedback);

      toast({ title: 'Feedback submitted successfully' });
      onFeedbackSubmitted?.(feedback);
      onOpenChange(false);

      // Reset form
      setRating(0);
      setFeedbackType(null);
      setWasAccurate(true);
      setWasHelpful(true);
      setWasProfessional(true);
      setNeededCorrection(false);
      setCorrectionMade('');
      setAgentNotes('');
      setShouldBeTrainingExample(false);
      setTrainingPriority('normal');
      setSelectedCategories([]);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({ title: 'Failed to submit feedback', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate AI Response</DialogTitle>
          <DialogDescription>
            Help improve the AI by providing feedback on this response
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Message Preview */}
          <div className="p-3 bg-muted rounded-lg text-sm max-h-24 overflow-y-auto">
            {messageContent.length > 200 ? `${messageContent.slice(0, 200)}...` : messageContent}
          </div>

          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={cn(
                    "p-1 transition-colors",
                    star <= rating ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-400"
                  )}
                >
                  <Star className={cn("h-6 w-6", star <= rating && "fill-current")} />
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Type */}
          <div className="space-y-2">
            <Label>Feedback Type</Label>
            <div className="flex flex-wrap gap-2">
              {feedbackOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFeedbackType(option.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors",
                    feedbackType === option.value
                      ? `${option.color} bg-current/10`
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Checkboxes */}
          <div className="space-y-3">
            <Label>Quality Assessment</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox id="accurate" checked={wasAccurate} onCheckedChange={(c) => setWasAccurate(!!c)} />
                <Label htmlFor="accurate" className="text-sm font-normal">Accurate</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="helpful" checked={wasHelpful} onCheckedChange={(c) => setWasHelpful(!!c)} />
                <Label htmlFor="helpful" className="text-sm font-normal">Helpful</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="professional" checked={wasProfessional} onCheckedChange={(c) => setWasProfessional(!!c)} />
                <Label htmlFor="professional" className="text-sm font-normal">Professional</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="correction" checked={neededCorrection} onCheckedChange={(c) => setNeededCorrection(!!c)} />
                <Label htmlFor="correction" className="text-sm font-normal">Needed Correction</Label>
              </div>
            </div>
          </div>

          {/* Correction Text */}
          {neededCorrection && (
            <div className="space-y-2">
              <Label htmlFor="correction-text">What correction did you make?</Label>
              <Textarea
                id="correction-text"
                value={correctionMade}
                onChange={(e) => setCorrectionMade(e.target.value)}
                placeholder="Describe the correction..."
                rows={2}
              />
            </div>
          )}

          {/* Issue Categories */}
          {(feedbackType === 'not_helpful' || feedbackType === 'wrong' || feedbackType === 'harmful') && (
            <div className="space-y-2">
              <Label>Issue Categories</Label>
              <div className="flex flex-wrap gap-2">
                {issueCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      "px-2 py-1 rounded text-xs border transition-colors",
                      selectedCategories.includes(cat)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Agent Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              value={agentNotes}
              onChange={(e) => setAgentNotes(e.target.value)}
              placeholder="Any additional observations for training..."
              rows={2}
            />
          </div>

          {/* Training Example */}
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                id="training"
                checked={shouldBeTrainingExample}
                onCheckedChange={(c) => setShouldBeTrainingExample(!!c)}
              />
              <Label htmlFor="training" className="text-sm font-normal">
                Mark as training example
              </Label>
            </div>
            {shouldBeTrainingExample && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">Priority:</Label>
                <Select value={trainingPriority} onValueChange={(v) => setTrainingPriority(v as any)}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !feedbackType || rating === 0}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
