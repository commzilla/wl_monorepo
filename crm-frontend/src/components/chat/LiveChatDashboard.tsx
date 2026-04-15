import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChatService } from '@/lib/services/chatService';
import { ChatSession, ChatMessage } from '@/lib/types/chat';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle, Send, Archive, User, Circle, Clock, Mail, Activity, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { useAudioNotifications } from '@/utils/audioNotifications';
import ClientInfoCard from '@/components/chat/ClientInfoCard';
import { apiService } from '@/services/apiService';
import { ChatMessageRenderer } from '@/components/support/ChatMessageRenderer';
import { TypingIndicator } from '@/components/support/TypingIndicator';

// Interface for agent profile data
interface AgentProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const LiveChatDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [agentProfiles, setAgentProfiles] = useState<Map<string, AgentProfile>>(new Map());
  
  const {
    enableAudio,
    disableAudio,
    isEnabled,
    initialize,
    playVisitorMessage,
    playAgentMessage,
    playNewSession
  } = useAudioNotifications();

  useEffect(() => {
    loadActiveSessions();
    
    // Initialize audio on component mount
    initialize();
    
    // Load current user's profile
    if (user?.id) {
      fetchAgentProfile(user.id);
    }
    
    // Presence tracking disabled
    
    // Subscribe to new sessions
    const sessionSubscription = ChatService.subscribeToActiveSessions((session) => {
      setActiveSessions(prev => [session, ...prev]);
      toast.info(`New chat session started with ${session.visitor_name || 'Anonymous'}`);
      
      // Play new session sound
      if (audioEnabled) {
        playNewSession();
      }
    });

    return () => {
      sessionSubscription.unsubscribe();
    };
  }, [audioEnabled]);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession.id);
      
      // Subscribe to new messages for selected session
      const messageSubscription = ChatService.subscribeToChatMessages(selectedSession.id, async (message) => {
        setMessages(prev => [...prev, message]);
        
        // Fetch agent profile if it's a new agent message
        if (message.sender_type === 'agent' && message.sender_id && !agentProfiles.has(message.sender_id)) {
          await fetchAgentProfile(message.sender_id);
        }
        
        // Play sound for incoming messages
        if (audioEnabled) {
          if (message.sender_type === 'visitor') {
            playVisitorMessage();
          } else if (message.sender_type === 'agent' && message.sender_id !== user?.id) {
            // Only play agent sound if it's from another agent
            playAgentMessage();
          }
        }
      });

      return () => {
        messageSubscription.unsubscribe();
      };
    }
  }, [selectedSession, audioEnabled, user?.id]);

  const loadActiveSessions = async () => {
    try {
      const sessions = await ChatService.getActiveSessions();
      setActiveSessions(sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load chat sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const sessionMessages = await ChatService.getChatMessages(sessionId);
      setMessages(sessionMessages);
      
      // Load agent profiles for the messages
      await loadAgentProfilesForMessages(sessionMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedSession || !user) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await ChatService.sendMessage(selectedSession.id, messageText, 'agent', user.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const toggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    
    if (newState) {
      enableAudio();
      initialize(); // Re-initialize audio context
      toast.success('Sound notifications enabled');
    } else {
      disableAudio();
      toast.info('Sound notifications disabled');
    }
  };

  const convertToTicket = async (session: ChatSession) => {
    if (!session.visitor_name || !session.visitor_email) {
      toast.error('Visitor information is required to create a ticket');
      return;
    }

    try {
      const ticketId = await ChatService.convertChatToTicket(
        session.id,
        session.visitor_name,
        session.visitor_email
      );

      if (ticketId) {
        toast.success('Chat converted to ticket successfully');
        loadActiveSessions(); // Refresh sessions
        setSelectedSession(null);
      }
    } catch (error) {
      console.error('Error converting to ticket:', error);
      toast.error('Failed to convert chat to ticket');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Fetch agent profile by ID
  const fetchAgentProfile = async (agentId: string) => {
    if (agentProfiles.has(agentId)) {
      return agentProfiles.get(agentId);
    }

    try {
      // For now, we'll use the current user's profile endpoint
      // In a real system, you'd have an endpoint to get user profiles by ID
      const response = await apiService.get<AgentProfile>(`/auth/profile/me/`);
      
      if (response.data) {
        const profile = response.data;
        setAgentProfiles(prev => new Map(prev.set(agentId, profile)));
        return profile;
      }
    } catch (error) {
      console.error('Error fetching agent profile:', error);
    }
    
    return null;
  };

  // Get agent display name
  const getAgentName = (agentId: string) => {
    const profile = agentProfiles.get(agentId);
    if (profile) {
      const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      return fullName || profile.email.split('@')[0] || 'Agent';
    }
    return 'Agent';
  };

  // Load agent profiles for messages
  const loadAgentProfilesForMessages = async (messages: ChatMessage[]) => {
    const agentIds = messages
      .filter(msg => msg.sender_type === 'agent' && msg.sender_id)
      .map(msg => msg.sender_id!)
      .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

    for (const agentId of agentIds) {
      if (!agentProfiles.has(agentId)) {
        await fetchAgentProfile(agentId);
      }
    }
  };

  const getSessionStatus = (session: ChatSession) => {
    // If this is the currently selected session, always show as Active
    if (selectedSession?.id === session.id) {
      return {
        label: 'Active',
        color: 'text-primary',
        dotColor: 'fill-primary text-primary',
        showActivity: true,
        animate: true
      };
    }
    
    // Check if the visitor is actually online (real-time presence)
    const isRealTimeOnline = onlineUsers.has(session.visitor_id);
    
    if (isRealTimeOnline) {
      return {
        label: 'Online',
        color: 'text-green-600',
        dotColor: 'fill-green-500 text-green-500',
        showActivity: false,
        animate: true
      };
    }
    
    // For offline users, check message recency to determine status
    const lastActivity = new Date(session.updated_at);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60));
    
    // Away if they had recent activity but aren't currently online
    if (diffInMinutes <= 30) {
      return {
        label: 'Away',
        color: 'text-yellow-600',
        dotColor: 'fill-yellow-500 text-yellow-500',
        showActivity: false,
        animate: false
      };
    }
    
    // Idle for longer periods
    return {
      label: 'Idle',
      color: 'text-gray-500',
      dotColor: 'fill-gray-400 text-gray-400',
      showActivity: false,
      animate: false
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity size={20} className="animate-spin" />
          <span>Loading chat sessions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Sessions List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageCircle size={18} className="text-primary" />
              </div>
              <span>Live Chat Sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAudio}
                className="p-2"
                title={audioEnabled ? 'Disable sound notifications' : 'Enable sound notifications'}
              >
                {audioEnabled ? (
                  <Volume2 size={16} className="text-primary" />
                ) : (
                  <VolumeX size={16} className="text-muted-foreground" />
                )}
              </Button>
              <Badge variant="secondary" className="px-3 py-1">
                {activeSessions.length} Active
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-y-auto h-[500px]">
            {activeSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <MessageCircle size={48} className="mb-4 opacity-30" />
                <p className="text-sm">No active chat sessions</p>
                <p className="text-xs mt-1">New conversations will appear here</p>
              </div>
            ) : (
              activeSessions.map((session) => {
                const status = getSessionStatus(session);
                
                return (
                <div
                  key={session.id}
                  className={`relative p-4 border-b border-border cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
                    selectedSession?.id === session.id 
                      ? 'bg-primary/5 border-l-4 border-l-primary shadow-sm' 
                      : 'hover:border-l-4 hover:border-l-muted-foreground/20'
                  }`}
                  onClick={() => setSelectedSession(session)}
                >
                  {/* Status indicator */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Circle 
                        size={8} 
                        className={`${status.dotColor} ${status.animate ? 'animate-pulse' : ''}`} 
                      />
                      <span className={`text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    {status.showActivity && (
                      <Activity size={14} className="text-primary animate-pulse" />
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground truncate">
                          {session.visitor_name || 'Anonymous Visitor'}
                        </h4>
                      </div>
                      
                      {session.visitor_email && (
                        <div className="flex items-center gap-1 mb-2">
                          <Mail size={12} className="text-muted-foreground" />
                          <p className="text-sm text-muted-foreground truncate">{session.visitor_email}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={12} />
                        <span>Started {formatTimeAgo(session.created_at)}</span>
                      </div>
                    </div>
                  </div>

                   {/* Additional info section */}
                   {(session.visitor_metadata?.analytics?.isReturningVisitor || 
                     session.visitor_metadata?.clientInfo?.device?.type ||
                     session.visitor_metadata?.analytics?.chatCounts?.totalSessions) && (
                     <div className="flex items-center justify-between pt-2 border-t border-border/50">
                       <div className="flex items-center gap-2">
                         {session.visitor_metadata?.analytics?.isReturningVisitor && (
                           <Badge variant="secondary" className="text-xs">
                             Returning
                           </Badge>
                         )}
                         {session.visitor_metadata?.clientInfo?.device?.type && (
                           <Badge variant="outline" className="text-xs capitalize">
                             {session.visitor_metadata.clientInfo.device.type}
                           </Badge>
                         )}
                       </div>
                       {session.visitor_metadata?.analytics?.chatCounts?.totalSessions && (
                         <div className="text-xs text-muted-foreground">
                           {session.visitor_metadata.analytics.chatCounts.totalSessions} chats
                         </div>
                       )}
                     </div>
                   )}
                </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <div className="lg:col-span-2">
        {selectedSession ? (
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User size={20} />
                  {selectedSession.visitor_name || 'Anonymous'}
                </CardTitle>
                {selectedSession.visitor_email && (
                  <p className="text-sm text-muted-foreground">{selectedSession.visitor_email}</p>
                )}
                
                {/* Client Information Display */}
                {selectedSession.visitor_metadata && (
                  <ClientInfoCard 
                    clientInfo={selectedSession.visitor_metadata.clientInfo}
                    analytics={selectedSession.visitor_metadata.analytics}
                  />
                )}
              </div>
              <Button
                onClick={() => convertToTicket(selectedSession)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Archive size={16} />
                Convert to Ticket
              </Button>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col ${message.sender_type === 'agent' ? 'items-end' : 'items-start'}`}
                  >
                    {/* Show sender name for agents */}
                    {message.sender_type === 'agent' && message.sender_id && (
                      <div className="text-xs text-muted-foreground mb-1 px-1">
                        {getAgentName(message.sender_id)}
                      </div>
                    )}

                    <div
                      className={`max-w-md px-3 py-2 rounded-lg ${
                        message.sender_type === 'agent'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <ChatMessageRenderer content={message.message} />
                    </div>
                  </div>
                ))}
                {/* Typing indicator when last message is from visitor */}
                {messages.length > 0 &&
                  messages[messages.length - 1].sender_type === 'visitor' && (
                    <TypingIndicator senderName="WeHelp bot" />
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your response..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    size="sm"
                  >
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <CardContent>
              <div className="text-center text-muted-foreground">
                <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a chat session to start responding</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LiveChatDashboard;