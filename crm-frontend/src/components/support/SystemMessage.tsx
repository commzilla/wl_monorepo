import React from 'react';
import { format } from 'date-fns';
import { UserCog, Bot, Languages } from 'lucide-react';
import { Message } from '@/services/supportService';

interface SystemMessageProps {
  message: Message;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({ message }) => {
  const metadata = message.metadata || {};
  const eventType = metadata.event_type as string;

  const getIcon = () => {
    switch (eventType) {
      case 'agent_joined':
        return <UserCog className="h-4 w-4" />;
      case 'agent_left':
        return <Bot className="h-4 w-4" />;
      case 'language_detected':
        return <Languages className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (eventType) {
      case 'agent_joined':
        return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
      case 'agent_left':
        return 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  return (
    <div className="flex justify-center my-3">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm text-muted-foreground ${getBackgroundColor()}`}>
        {getIcon()}
        <span>{message.content}</span>
        <span className="text-xs opacity-70">
          {format(new Date(message.created_at), 'HH:mm')}
        </span>
      </div>
    </div>
  );
};

export default SystemMessage;
