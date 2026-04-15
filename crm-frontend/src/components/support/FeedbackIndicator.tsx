import React from 'react';
import { ThumbsUp, ThumbsDown, MessageSquareMore } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIFeedback } from '@/services/aiFeedbackService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FeedbackIndicatorProps {
  feedback: AIFeedback | null;
  className?: string;
}

export function FeedbackIndicator({ feedback, className }: FeedbackIndicatorProps) {
  if (!feedback) {
    return null;
  }

  const isPositive = feedback.feedback_type === 'helpful' || feedback.feedback_type === 'partially_helpful';
  const isNegative = feedback.feedback_type === 'not_helpful' || feedback.feedback_type === 'wrong' || feedback.feedback_type === 'harmful';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
              isPositive && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              isNegative && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
              !isPositive && !isNegative && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
              className
            )}
          >
            {isPositive && <ThumbsUp className="h-3 w-3" />}
            {isNegative && <ThumbsDown className="h-3 w-3" />}
            <span>{feedback.rating}/5</span>
            {feedback.should_be_training_example && (
              <MessageSquareMore className="h-3 w-3 text-primary" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div className="font-medium capitalize">{feedback.feedback_type.replace('_', ' ')}</div>
            {feedback.agent_notes && <div className="text-muted-foreground">{feedback.agent_notes}</div>}
            {feedback.should_be_training_example && (
              <div className="text-primary">Marked as training example ({feedback.training_priority})</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
