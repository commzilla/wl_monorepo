import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, Phone } from 'lucide-react';
import { WhatsAppConversation } from '@/services/whatsappService';

interface WhatsAppConversationListProps {
  conversations: WhatsAppConversation[];
  selectedId: string | null;
  onSelect: (conversation: WhatsAppConversation) => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800',
  human_handoff: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
};

const leadColors: Record<string, string> = {
  new: 'bg-slate-100 text-slate-700',
  engaged: 'bg-blue-100 text-blue-700',
  qualified: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

function formatTime(dateStr: string | null) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function WhatsAppConversationList({
  conversations,
  selectedId,
  onSelect,
}: WhatsAppConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
        <Phone className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No conversations found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 pr-2">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`p-3 rounded-lg cursor-pointer transition-colors border ${
              selectedId === conv.id
                ? 'bg-accent border-accent-foreground/20'
                : 'hover:bg-muted/50 border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">
                    {conv.profile_name || conv.wa_id}
                  </span>
                  {conv.ai_enabled ? (
                    <Bot className="h-3 w-3 text-blue-500 flex-shrink-0" />
                  ) : (
                    <User className="h-3 w-3 text-orange-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {conv.wa_id}
                </p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatTime(conv.last_message_at)}
              </span>
            </div>

            {conv.last_message && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                {conv.last_message.sender_type === 'ai' && '🤖 '}
                {conv.last_message.sender_type === 'agent' && '👤 '}
                {conv.last_message.content}
              </p>
            )}

            <div className="flex items-center gap-1.5 mt-2">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[conv.status] || ''}`}>
                {conv.status === 'human_handoff' ? 'Handoff' : conv.status}
              </Badge>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${leadColors[conv.lead_status] || ''}`}>
                {conv.lead_status}
              </Badge>
              {conv.message_count > 0 && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {conv.message_count} msgs
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
