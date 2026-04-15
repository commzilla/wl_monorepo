import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Loader2, Bot, AlertCircle, X, MessageSquare, Trash2, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AdminAIMessageBubble } from './AdminAIMessage';
import { AdminAIToolResult } from './AdminAIToolResult';
import { AdminAIConfirmation } from './AdminAIConfirmation';
import { AdminAIFeedbackDialog } from './AdminAIFeedbackDialog';
import { adminAIService } from '@/services/adminAIService';
import { ChatMessageRenderer } from '@/components/support/ChatMessageRenderer';
import type { AdminAIConversation, AdminAIMessage, AdminAIContextType } from '@/types/adminAI';

interface ToolActivity {
  id: string;
  type: 'tool_call' | 'tool_result';
  name: string;
  args?: Record<string, any>;
  success?: boolean;
  data?: Record<string, any>;
  error?: string;
  timestamp: string;
}

interface PendingConfirmation {
  messageId: string;
  toolName: string;
  params: Record<string, any>;
  description: string;
}

interface AdminAIChatPanelProps {
  conversation: AdminAIConversation | null;
  conversations: AdminAIConversation[];
  messages: AdminAIMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  streamingText: string;
  toolActivities: ToolActivity[];
  pendingConfirmation: PendingConfirmation | null;
  contextType: AdminAIContextType;
  canConfirmActions?: boolean;
  onSendMessage: (text: string) => void;
  onStartNewChat: () => Promise<void>;
  onConfirmAction: (confirmed: boolean) => Promise<void>;
  onLoadConversation: (conversationId: string) => Promise<void>;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  onBack: () => void;
  onClose: () => void;
  onClearError: () => void;
}

const contextLabels: Record<AdminAIContextType, string> = {
  general: 'General',
  enrollment: 'Enrollment',
  trader: 'Trader',
  payout: 'Payout',
  order: 'Order',
};

const contextColors: Record<AdminAIContextType, string> = {
  general: 'bg-muted text-muted-foreground',
  enrollment: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  trader: 'bg-green-500/20 text-green-400 border-green-500/30',
  payout: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  order: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function AdminAIChatPanel({
  conversation,
  conversations,
  messages,
  isStreaming,
  isLoading,
  error,
  streamingText,
  toolActivities,
  pendingConfirmation,
  contextType,
  canConfirmActions = false,
  onSendMessage,
  onStartNewChat,
  onConfirmAction,
  onLoadConversation,
  onDeleteConversation,
  onBack,
  onClose,
  onClearError,
}: AdminAIChatPanelProps) {
  const [input, setInput] = useState('');
  const [feedbackDialog, setFeedbackDialog] = useState<{ messageId: string; content: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamingText, toolActivities, pendingConfirmation]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversation]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleThumbsUp = (messageId: string) => {
    // Quick positive feedback — fire and forget
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || !conversation) return;
    adminAIService.submitFeedback({
      conversation: conversation.id,
      message: messageId,
      admin_user: '',
      is_positive: true,
      issue_type: 'helpful',
      correction_text: '',
      notes: '',
    }).catch(() => {});
  };

  const handleThumbsDown = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    setFeedbackDialog({ messageId, content: msg.content });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-card/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center">
            <Bot className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Assistant</h3>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4', contextColors[contextType])}>
                {contextLabels[contextType]}
              </Badge>
              {isStreaming && (
                <span className="flex items-center gap-1 text-[10px] text-primary">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  thinking
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {conversation && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack} title="Back to conversations">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onStartNewChat} title="New Chat">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="flex-1 truncate">{error}</span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClearError}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {!conversation && !isLoading && (
          <div className="flex flex-col h-full">
            {/* New chat button */}
            <div className="px-1 mb-3">
              <Button size="sm" className="w-full gap-2" onClick={onStartNewChat}>
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>

            {conversations.length === 0 ? (
              /* Empty state when no conversations exist */
              <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center mb-4">
                  <Bot className="h-7 w-7 text-primary" />
                </div>
                <h4 className="text-sm font-medium text-foreground mb-1">Admin AI Assistant</h4>
                <p className="text-xs text-muted-foreground">
                  Ask questions, look up data, or execute actions. Start a conversation to begin.
                </p>
              </div>
            ) : (
              /* Conversation history list */
              <div className="flex-1 overflow-y-auto">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1 mb-2">
                  Recent conversations
                </p>
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="group flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors border border-transparent hover:border-border/30"
                      onClick={() => onLoadConversation(conv.id)}
                    >
                      <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Badge
                            variant="outline"
                            className={cn('text-[9px] px-1 py-0 h-3.5', contextColors[conv.context_type as AdminAIContextType] || contextColors.general)}
                          >
                            {contextLabels[conv.context_type as AdminAIContextType] || 'General'}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(conv.last_message_at || conv.created_at)}
                          </span>
                          {conv.message_count != null && (
                            <span className="text-[10px] text-muted-foreground">
                              · {conv.message_count} msg{conv.message_count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-foreground truncate">
                          {conv.last_message_preview?.content || 'No messages yet'}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {isLoading && !conversation && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {messages.map((msg) => (
          <AdminAIMessageBubble
            key={msg.id}
            message={msg}
            onThumbsUp={handleThumbsUp}
            onThumbsDown={handleThumbsDown}
          />
        ))}

        {/* Tool activity indicator during streaming */}
        {isStreaming && toolActivities.length > 0 && !streamingText && (
          <div className="flex gap-2 mb-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center mt-1">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="max-w-[80%]">
              <div className="rounded-xl px-3.5 py-2.5 text-sm bg-muted/60 border border-border/30 rounded-bl-sm inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-muted-foreground">
                  {(() => {
                    const latest = [...toolActivities].reverse().find((a) => a.type === 'tool_call');
                    if (!latest) return 'Working...';
                    const name = latest.name.replace(/_/g, ' ');
                    if (name.includes('lookup') || name.includes('search') || name.includes('get')) return 'Looking up data...';
                    if (name.includes('mt5')) return 'Contacting MT5...';
                    return 'Processing...';
                  })()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator when streaming but no text yet */}
        {isStreaming && !streamingText && toolActivities.length === 0 && (
          <div className="flex gap-2 mb-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center mt-1">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="max-w-[80%]">
              <div className="rounded-xl px-3.5 py-2.5 text-sm bg-muted/60 border border-border/30 rounded-bl-sm inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Streaming text */}
        {streamingText && (
          <div className="flex gap-2 mb-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center mt-1">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="max-w-[80%]">
              <div className="rounded-xl px-3.5 py-2.5 text-sm leading-relaxed bg-muted/60 border border-border/30 rounded-bl-sm">
                <ChatMessageRenderer content={streamingText} />
                <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5" />
              </div>
            </div>
          </div>
        )}

        {/* Pending confirmation — only shown to admin-role users */}
        {pendingConfirmation && canConfirmActions && (
          <AdminAIConfirmation
            toolName={pendingConfirmation.toolName}
            params={pendingConfirmation.params}
            description={pendingConfirmation.description}
            onConfirm={() => onConfirmAction(true)}
            onCancel={() => onConfirmAction(false)}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Input area */}
      {conversation && (
        <div className="border-t border-border/30 px-3 py-2.5 bg-card/40">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              maxLength={4000}
              rows={1}
              className="flex-1 resize-none bg-muted/40 border border-border/30 rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors min-h-[36px] max-h-[100px]"
              style={{ height: 'auto', overflow: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 100) + 'px';
              }}
              disabled={isStreaming}
            />
            <Button
              size="icon"
              className="h-9 w-9 rounded-xl flex-shrink-0"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Feedback dialog */}
      {feedbackDialog && conversation && (
        <AdminAIFeedbackDialog
          open={!!feedbackDialog}
          onOpenChange={(open) => !open && setFeedbackDialog(null)}
          messageId={feedbackDialog.messageId}
          conversationId={conversation.id}
          messageContent={feedbackDialog.content}
        />
      )}
    </div>
  );
}
