import React from 'react';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  senderName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ senderName = 'WeHelp bot' }) => {
  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-purple-100 text-purple-600">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{senderName}</span>
          <span className="text-xs text-muted-foreground">is typing</span>
        </div>
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950 inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
