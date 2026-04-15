
import React from 'react';
import LiveChatDashboard from '@/components/chat/LiveChatDashboard';
import { MessageCircle } from 'lucide-react';

const ChatWidget = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Live Chat Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor and manage active chat sessions with your website visitors
          </p>
        </div>
      </div>
      
      <LiveChatDashboard />
    </div>
  );
};

export default ChatWidget;
