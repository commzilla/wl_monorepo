import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check, Bot, User, Cog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AdminAIMessage as AdminAIMessageType } from '@/types/adminAI';
import { ChatMessageRenderer } from '@/components/support/ChatMessageRenderer';

interface AdminAIMessageProps {
  message: AdminAIMessageType;
  onThumbsUp?: (messageId: string) => void;
  onThumbsDown?: (messageId: string) => void;
}

function getModelBadge(modelUsed: string | null) {
  if (!modelUsed) return null;
  const lower = modelUsed.toLowerCase();
  if (lower.includes('lite') || lower.includes('flash-lite')) {
    return { label: 'Lite', className: 'bg-green-500/20 text-green-400 border-green-500/30' };
  }
  if (lower.includes('pro')) {
    return { label: 'Pro', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
  }
  return { label: 'Standard', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
}

export function AdminAIMessageBubble({ message, onThumbsUp, onThumbsDown }: AdminAIMessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const isAdmin = message.role === 'admin';
  const isAI = message.role === 'ai';
  const isSystem = message.role === 'system';

  const modelBadge = isAI ? getModelBadge(message.model_used) : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).catch(() => {
      // Clipboard API not available (e.g. non-HTTPS)
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/30 text-xs text-muted-foreground">
          <Cog className="h-3 w-3" />
          <span>{message.content}</span>
          {message.action_status && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                message.action_status === 'success' && 'border-green-500/50 text-green-400',
                message.action_status === 'error' && 'border-red-500/50 text-red-400',
                message.action_status === 'cancelled' && 'border-yellow-500/50 text-yellow-400',
                message.action_status === 'pending_confirmation' && 'border-blue-500/50 text-blue-400'
              )}
            >
              {message.action_status}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2 mb-3', isAdmin ? 'justify-end' : 'justify-start')}>
      {/* Avatar for AI */}
      {isAI && (
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center mt-1">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div className={cn('max-w-[80%] group', isAdmin ? 'order-first' : '')}>
        {/* Model badge for AI */}
        {isAI && modelBadge && (
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4', modelBadge.className)}>
              {modelBadge.label}
            </Badge>
            {message.complexity_score && (
              <span className="text-[10px] text-muted-foreground">
                complexity: {message.complexity_score}/7
              </span>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-xl px-3.5 py-2.5 text-sm leading-relaxed',
            isAdmin
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted/60 border border-border/30 rounded-bl-sm'
          )}
        >
          <ChatMessageRenderer content={message.content} />
        </div>

        {/* Actions row */}
        <div
          className={cn(
            'flex items-center gap-1 mt-1 transition-opacity',
            feedback ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            isAdmin ? 'justify-end' : 'justify-start'
          )}
        >
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </Button>

          {isAI && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-6 w-6', feedback === 'up' ? 'text-green-400' : 'hover:text-green-400')}
                onClick={() => {
                  if (feedback) return;
                  setFeedback('up');
                  onThumbsUp?.(message.id);
                }}
                disabled={feedback === 'down'}
              >
                <ThumbsUp className={cn('h-3 w-3', feedback === 'up' && 'fill-current')} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-6 w-6', feedback === 'down' ? 'text-red-400' : 'hover:text-red-400')}
                onClick={() => {
                  if (feedback) return;
                  setFeedback('down');
                  onThumbsDown?.(message.id);
                }}
                disabled={feedback === 'up'}
              >
                <ThumbsDown className={cn('h-3 w-3', feedback === 'down' && 'fill-current')} />
              </Button>
            </>
          )}

          <span className="text-[10px] text-muted-foreground ml-1">
            {new Date(message.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Avatar for admin */}
      {isAdmin && (
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-500/10 border border-blue-500/20 flex items-center justify-center mt-1">
          <User className="h-4 w-4 text-blue-400" />
        </div>
      )}
    </div>
  );
}
