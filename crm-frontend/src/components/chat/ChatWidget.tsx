
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { ChatService } from '@/lib/services/chatService';
import { ChatWidgetConfig, ChatSession, ChatMessage } from '@/lib/types/chat';
import { toast } from 'sonner';
import { useAudioNotifications } from '@/utils/audioNotifications';
import { useClientTracking } from '@/utils/clientTracking';

interface ChatWidgetProps {
  config: ChatWidgetConfig;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [session, setSession] = useState<ChatSession | null>(null);
  const [visitorInfo, setVisitorInfo] = useState({ name: '', email: '' });
  const [hasProvidedInfo, setHasProvidedInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const visitorIdRef = useRef<string>(Math.random().toString(36).substr(2, 9));
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTime = useRef<string>(new Date().toISOString());
  
  const { initialize, playAgentMessage } = useAudioNotifications();
  const { collectInfo, getAnalytics, updateChatCounts } = useClientTracking();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize audio context when component mounts
    initialize();
  }, []);

  useEffect(() => {
    // Set up presence tracking when chat widget is open
    if (isOpen && hasProvidedInfo) {
      console.log('Chat widget opened');
    }
  }, [isOpen, hasProvidedInfo]);

  // Clean up on component unmount and update chat analytics
  useEffect(() => {
    return () => {
      // Update chat analytics when component unmounts
      if (session && messages.length > 0) {
        updateChatCounts(messages.length, sessionStartTime.current);
        console.log('📊 Updated chat analytics on unmount');
      }
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      // Cleanup on unmount
    };
  }, [session, messages.length]);

  const startChat = async () => {
    if (!hasProvidedInfo && (!visitorInfo.name || !visitorInfo.email)) {
      toast.error('Please provide your name and email to start chatting');
      return;
    }

    setIsLoading(true);
    try {
      // Collect comprehensive client information
      console.log('📊 Starting chat with client tracking...');
      const clientInfo = await collectInfo();
      const analytics = getAnalytics();
      
      console.log('📊 Client Info:', clientInfo);
      console.log('📊 Analytics:', analytics);

      const newSession = await ChatService.createChatSession(visitorIdRef.current);
      setSession(newSession);
      
      // Update session with visitor info and tracking data
      await ChatService.updateChatSession(newSession.id, {
        visitor_name: visitorInfo.name,
        visitor_email: visitorInfo.email,
        // Store tracking data in a metadata field (you might need to add this to your schema)
        visitor_metadata: {
          clientInfo,
          analytics,
          sessionStartTime: sessionStartTime.current
        }
      });

      setHasProvidedInfo(true);
      
      // Subscribe to new messages
      ChatService.subscribeToChatMessages(newSession.id, (message) => {
        setMessages(prev => [...prev, message]);
        
        // Play sound for agent messages (not visitor's own messages)
        if (message.sender_type === 'agent') {
          setTimeout(() => playAgentMessage(), 100); // Small delay to ensure audio context is ready
        }
      });

      // Send welcome message from "agent"
      setTimeout(() => {
        ChatService.sendMessage(newSession.id, config.welcome_message, 'agent');
      }, 1000);
      
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !session) return;

    const messageText = currentMessage.trim();
    setCurrentMessage('');

    try {
      await ChatService.sendMessage(session.id, messageText, 'visitor');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (hasProvidedInfo) {
        sendMessage();
      } else {
        startChat();
      }
    }
  };

  if (!config.is_enabled) return null;

  const primaryColor = config.primary_color;
  const textColor = config.text_color;
  const bgColor = config.background_color;

  return (
    <div 
      className={`fixed z-50 ${
        config.position === 'bottom-left' ? 'bottom-4 left-4' : 'bottom-4 right-4'
      }`}
      style={{ fontFamily: 'inherit' }}
    >
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-16 h-16 shadow-lg hover:scale-105 transition-transform"
          style={{ backgroundColor: primaryColor, color: textColor }}
        >
          <MessageCircle size={24} />
        </Button>
      ) : (
        <Card 
          className={`w-80 h-96 shadow-xl ${isMinimized ? 'h-12' : 'h-96'}`}
          style={{ backgroundColor: bgColor }}
        >
          <CardHeader 
            className="flex flex-row items-center justify-between p-4 border-b"
            style={{ backgroundColor: primaryColor, color: textColor }}
          >
            <div className="flex items-center gap-2">
              {config.logo_url && (
                <img src={config.logo_url} alt="Logo" className="w-6 h-6 rounded" />
              )}
              <span className="font-semibold">{config.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="hover:bg-white/20"
                style={{ color: textColor }}
              >
                <Minimize2 size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20"
                style={{ color: textColor }}
              >
                <X size={16} />
              </Button>
            </div>
          </CardHeader>

          {!isMinimized && (
            <CardContent className="p-0 flex flex-col h-80">
              {!hasProvidedInfo ? (
                <div className="p-4 space-y-4">
                  <p className="text-sm text-gray-600">{config.welcome_message}</p>
                  <Input
                    placeholder="Your name"
                    value={visitorInfo.name}
                    onChange={(e) => setVisitorInfo(prev => ({ ...prev, name: e.target.value }))}
                    onKeyPress={handleKeyPress}
                  />
                  <Input
                    placeholder="Your email"
                    type="email"
                    value={visitorInfo.email}
                    onChange={(e) => setVisitorInfo(prev => ({ ...prev, email: e.target.value }))}
                    onKeyPress={handleKeyPress}
                  />
                  <Button 
                    onClick={startChat} 
                    disabled={isLoading || !visitorInfo.name || !visitorInfo.email}
                    className="w-full"
                    style={{ backgroundColor: primaryColor, color: textColor }}
                  >
                    {isLoading ? 'Starting...' : 'Start Chat'}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                            message.sender_type === 'visitor'
                              ? 'text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                          style={message.sender_type === 'visitor' ? { backgroundColor: primaryColor } : {}}
                        >
                          {message.message}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 border-t bg-gray-50">
                    <div
                      className="flex items-center gap-2 rounded-full border-2 bg-white px-4 py-1 shadow-sm"
                      style={{ borderColor: primaryColor }}
                    >
                      <Input
                        placeholder="Type your message..."
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-0"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!currentMessage.trim()}
                        size="icon"
                        className="rounded-full h-9 w-9 shrink-0"
                        style={{ backgroundColor: primaryColor, color: textColor }}
                      >
                        <Send size={16} />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};

export default ChatWidget;
