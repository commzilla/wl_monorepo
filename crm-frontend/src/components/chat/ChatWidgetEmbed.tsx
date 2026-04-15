
import React, { useEffect, useState } from 'react';
import ChatWidget from './ChatWidget';
import { ChatService } from '@/lib/services/chatService';
import { ChatWidgetConfig } from '@/lib/types/chat';

const ChatWidgetEmbed: React.FC = () => {
  const [config, setConfig] = useState<ChatWidgetConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const widgetConfig = await ChatService.getWidgetConfig();
        setConfig(widgetConfig);
      } catch (error) {
        console.error('Error loading chat widget config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  if (isLoading || !config) {
    return null;
  }

  return <ChatWidget config={config} />;
};

export default ChatWidgetEmbed;
