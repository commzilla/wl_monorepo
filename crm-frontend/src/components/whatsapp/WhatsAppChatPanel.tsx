import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Send,
  Bot,
  User,
  Shield,
  Check,
  CheckCheck,
  AlertCircle,
  StickyNote,
} from 'lucide-react';
import {
  WhatsAppService,
  WhatsAppMessage,
  WhatsAppConversation,
} from '@/services/whatsappService';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppChatPanelProps {
  conversation: WhatsAppConversation;
  onConversationUpdate?: () => void;
}

const senderIcons: Record<string, typeof Bot> = {
  ai: Bot,
  agent: Shield,
  user: User,
  system: AlertCircle,
};

function DeliveryIcon({ status }: { status: string | null }) {
  if (!status) return null;
  switch (status) {
    case 'sent':
      return <Check className="h-3 w-3 text-slate-400" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-slate-400" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
}

export function WhatsAppChatPanel({
  conversation,
  onConversationUpdate,
}: WhatsAppChatPanelProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [input, setInput] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = WhatsAppService.subscribeToMessages(
      conversation.id,
      (msgs) => setMessages(msgs),
      3000
    );
    return unsub;
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await WhatsAppService.sendReply(conversation.id, input.trim(), isInternal);
      setInput('');
      toast({
        title: isInternal ? 'Note added' : 'Message sent',
        variant: 'default',
      });
      onConversationUpdate?.();
    } catch (e: any) {
      toast({ title: 'Failed to send', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0"
        style={{ background: 'rgba(var(--card), 0.9)' }}
      >
        <div>
          <h3 className="font-semibold text-sm">
            {conversation.profile_name || conversation.wa_id}
          </h3>
          <p className="text-xs text-muted-foreground">{conversation.wa_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={conversation.ai_enabled ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}
          >
            {conversation.ai_enabled ? 'AI Active' : 'AI Off'}
          </Badge>
          <Badge
            variant="outline"
            className={
              conversation.status === 'human_handoff'
                ? 'bg-orange-50 text-orange-700'
                : conversation.status === 'resolved'
                ? 'bg-green-50 text-green-700'
                : 'bg-blue-50 text-blue-700'
            }
          >
            {conversation.status === 'human_handoff' ? 'Handoff' : conversation.status}
          </Badge>
        </div>
      </div>

      {/* Messages — opaque background to override glass-card transparency */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3"
        style={{ background: '#eae6df' }}
      >
        <div className="space-y-1">
          {messages.map((msg) => {
            const isOutbound = msg.direction === 'outbound';
            const SenderIcon = senderIcons[msg.sender_type] || User;

            if (msg.is_internal) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div
                    className="rounded-lg px-3 py-1.5 max-w-[75%]"
                    style={{ background: '#fef3c7', border: '1px solid #fde68a' }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <StickyNote className="h-3 w-3" style={{ color: '#d97706' }} />
                      <span className="text-[10px] font-semibold" style={{ color: '#92400e' }}>
                        Internal Note {msg.agent_name ? `by ${msg.agent_name}` : ''}
                      </span>
                    </div>
                    <p className="text-xs whitespace-pre-wrap" style={{ color: '#78350f' }}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[75%] rounded-lg px-3 py-2"
                  style={{
                    background: isOutbound ? '#d9fdd3' : '#ffffff',
                    boxShadow: '0 1px 1px rgba(0,0,0,0.08)',
                  }}
                >
                  {/* Sender label */}
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <SenderIcon
                      className="h-3 w-3"
                      style={{
                        color: msg.sender_type === 'ai'
                          ? '#2563eb'
                          : msg.sender_type === 'agent'
                          ? '#9333ea'
                          : msg.sender_type === 'system'
                          ? '#6b7280'
                          : '#475569',
                      }}
                    />
                    <span
                      className="text-[10px] font-semibold capitalize"
                      style={{ color: isOutbound ? '#1a7f37' : '#6b7280' }}
                    >
                      {msg.sender_type}
                      {msg.agent_name ? ` (${msg.agent_name})` : ''}
                    </span>
                  </div>
                  {/* Message body */}
                  <p
                    className="text-sm whitespace-pre-wrap break-words leading-relaxed"
                    style={{ color: '#111827' }}
                  >
                    {msg.content}
                  </p>
                  {/* Footer: time + delivery status */}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px]" style={{ color: '#6b7280' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isOutbound && <DeliveryIcon status={msg.delivery_status} />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant={isInternal ? 'default' : 'outline'}
            size="sm"
            className="h-6 text-xs"
            onClick={() => setIsInternal(!isInternal)}
          >
            <StickyNote className="h-3 w-3 mr-1" />
            {isInternal ? 'Internal Note' : 'WhatsApp Reply'}
          </Button>
          {isInternal && (
            <span className="text-[10px] text-yellow-600">
              This note will NOT be sent to the customer
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={isInternal ? 'Write an internal note...' : 'Type a reply...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 ${isInternal ? 'border-yellow-300 bg-yellow-50/50' : ''}`}
          />
          <Button
            size="sm"
            disabled={!input.trim() || sending}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
