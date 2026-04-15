import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { SupportService, Conversation, Message } from '@/services/supportService';
import { aiFeedbackService, AIFeedback } from '@/services/aiFeedbackService';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  UserCog,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  Search,
  Star,
  Paperclip,
  BarChart3,
  Inbox,
  MessageCircle,
  Globe,
  Mail,
  Volume2,
  VolumeX,
  CircleDot,
  ArrowRightLeft,
  ArrowLeft,
  AtSign,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
// Discord icon SVG component
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);
import { AIFeedbackDialog } from '@/components/support/AIFeedbackDialog';
import { FeedbackIndicator } from '@/components/support/FeedbackIndicator';
import { ChatMessageRenderer } from '@/components/support/ChatMessageRenderer';
import { CSStatsPanel } from '@/components/support/CSStatsPanel';
import { ConversationFilters } from '@/components/support/ConversationFilters';
import { AgentAssignmentDropdown } from '@/components/support/AgentAssignmentDropdown';
import { SystemMessage } from '@/components/support/SystemMessage';
import { TranslatedMessage } from '@/components/support/TranslatedMessage';
import { TypingIndicator } from '@/components/support/TypingIndicator';
import { EmailComposePanel } from '@/components/support/EmailComposePanel';
import { NewEmailDialog } from '@/components/support/NewEmailDialog';
import { EmailMessageBubble } from '@/components/support/EmailMessageBubble';
import { MentionTextarea } from '@/components/support/MentionTextarea';
import { MentionNotificationBell } from '@/components/support/MentionNotificationBell';
import { audioNotifications } from '@/utils/audioNotifications';

// Safe date formatting helper — displays all times in fixed UTC+2
// Backend has USE_TZ=False so timestamps arrive WITHOUT 'Z' suffix.
// We force UTC interpretation then use Intl to format directly in UTC+2,
// bypassing date-fns format() which always applies the browser's local tz.
const formatDate = (dateString: string | null | undefined, formatStr: string): string => {
  if (!dateString) return 'N/A';
  try {
    // Force UTC: append Z if no timezone indicator present
    let utcString = dateString;
    if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
      utcString = dateString + 'Z';
    }
    const date = new Date(utcString);
    if (isNaN(date.getTime())) return 'N/A';
    const tz = 'Etc/GMT-2';
    if (formatStr === 'HH:mm') {
      return date.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
    }
    if (formatStr === 'MMM d, HH:mm') {
      const month = date.toLocaleString('en-US', { timeZone: tz, month: 'short' });
      const day = date.toLocaleString('en-US', { timeZone: tz, day: 'numeric' });
      const time = date.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
      return `${month} ${day}, ${time}`;
    }
    // Fallback for any other format
    return date.toLocaleString('en-US', { timeZone: tz });
  } catch {
    return 'N/A';
  }
};

const SupportDashboard = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const [showMessages, setShowMessages] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'chats' | 'email' | 'stats'>('chats');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);

  // Keep ref in sync with state so callbacks always have the latest value
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    audioNotifications.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Initialize audio context on first user interaction (browser requirement)
  useEffect(() => {
    const initAudio = () => {
      audioNotifications.initialize();
      document.removeEventListener('click', initAudio);
    };
    document.addEventListener('click', initAudio);
    return () => document.removeEventListener('click', initAudio);
  }, []);

  // Get current user info from auth context
  const currentUserId = user?.id || null;
  const currentUserName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';

  // Feedback state
  const [messageFeedback, setMessageFeedback] = useState<Record<string, AIFeedback>>({});
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedMessageForFeedback, setSelectedMessageForFeedback] = useState<Message | null>(null);

  // Agent names cache for displaying agent names in messages
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});

  // Global status counts (independent of current filter)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // Email dialog state
  const [newEmailDialogOpen, setNewEmailDialogOpen] = useState(false);

  // Unread conversation tracking
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const selectedConvRef = useRef<string | null>(null);
  useEffect(() => { selectedConvRef.current = selectedConversation?.id || null; }, [selectedConversation?.id]);

  // Mention tracking
  const [mentionConvIds, setMentionConvIds] = useState<Set<string>>(new Set());
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  // Auto-toggle internal note when @mentions are present
  const prevHadMentions = useRef(false);
  useEffect(() => {
    const hasMentions = mentionedUserIds.length > 0;
    if (hasMentions && !prevHadMentions.current) {
      setIsInternal(true);
    }
    prevHadMentions.current = hasMentions;
  }, [mentionedUserIds]);

  // Attachment upload state
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; name: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Message edit/delete state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const markUnread = (convId: string) => {
    setUnreadIds(prev => {
      const next = new Set(prev);
      next.add(convId);
      return next;
    });
  };

  const markRead = (convId: string) => {
    setUnreadIds(prev => {
      if (!prev.has(convId)) return prev;
      const next = new Set(prev);
      next.delete(convId);
      return next;
    });
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    markRead(conv.id);
    // Clear mention badge and mark mention notifications read for this conversation
    if (mentionConvIds.has(conv.id)) {
      setMentionConvIds(prev => {
        const next = new Set(prev);
        next.delete(conv.id);
        return next;
      });
      // Mark mention notifications for this conversation as read in the background
      SupportService.getMentionNotifications().then(data => {
        const ids = data.notifications
          .filter(n => !n.is_read && n.action_url?.includes(conv.id))
          .map(n => n.id);
        if (ids.length) SupportService.markMentionsRead(ids).catch(() => {});
      }).catch(() => {});
    }
    if (isMobile) setShowMessages(true);
  };

  const loadStatusCounts = async () => {
    try {
      const stats = await SupportService.getStats();
      setStatusCounts({
        all: stats.total_conversations ?? 0,
        active: stats.active_conversations ?? 0,
        escalated: stats.escalated_conversations ?? 0,
        resolved: stats.resolved_conversations ?? 0,
      });
    } catch {
      // Silently fail — pills will show 0
    }
  };

  useEffect(() => {
    loadStatusCounts();
  }, []);

  useEffect(() => {
    loadConversations();

    // Subscribe to real-time updates (polling-based for Django)
    const subscription = SupportService.subscribeToConversations((conv) => {
      // Mark as unread if we're not currently viewing this conversation
      if (conv.id !== selectedConvRef.current) {
        markUnread(conv.id);
      }
      // Track mention badges from polling
      if (conv.has_mention_for_me && conv.id !== selectedConvRef.current) {
        setMentionConvIds(prev => {
          if (prev.has(conv.id)) return prev;
          const next = new Set(prev);
          next.add(conv.id);
          return next;
        });
      }
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === conv.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = conv;
          return updated;
        }
        // New conversation appeared — play notification sound
        if (soundEnabledRef.current) {
          audioNotifications.playNewSession();
        }
        return [conv, ...prev];
      });
    });

    return () => {
      subscription.unsubscribe();
      SupportService.unsubscribeAll();
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      loadFeedbackForConversation(selectedConversation.id);

      // Subscribe to messages for selected conversation
      const subscription = SupportService.subscribeToMessages(selectedConversation.id, (msg) => {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
        // Play sound for incoming messages (not from current agent)
        if (soundEnabledRef.current && msg.sender_id !== currentUserId) {
          if (msg.sender_type === 'user') {
            audioNotifications.playVisitorMessage();
          } else if (msg.sender_type === 'ai') {
            audioNotifications.playAgentMessage();
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedConversation?.id]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await SupportService.getAllConversations(
        statusFilter !== 'all' ? { status: statusFilter } : undefined
      );
      setConversations(data);
      // Populate mention badges from conversation data
      const mentionIds = new Set<string>();
      data.forEach(c => { if (c.has_mention_for_me) mentionIds.add(c.id); });
      setMentionConvIds(mentionIds);
      loadStatusCounts();
    } catch (error) {
      toast({ title: 'Error loading conversations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const data = await SupportService.getConversationMessages(conversationId, true);
      setMessages(data);
      setTimeout(scrollToBottom, 100);

      // Extract agent names from messages
      loadAgentNames(data);
    } catch (error) {
      toast({ title: 'Error loading messages', variant: 'destructive' });
    }
  };

  const loadAgentNames = async (messages: Message[]) => {
    // Extract agent names from messages that have sender_name
    const newNames: Record<string, string> = {};
    messages.forEach(msg => {
      if (msg.sender_type === 'agent' && msg.sender_id && msg.sender_name) {
        newNames[msg.sender_id] = msg.sender_name;
      }
    });
    if (Object.keys(newNames).length > 0) {
      setAgentNames(prev => ({ ...prev, ...newNames }));
    }
  };

  const loadFeedbackForConversation = async (conversationId: string) => {
    try {
      const feedbackList = await aiFeedbackService.getFeedbackForConversation(conversationId);
      const feedbackMap: Record<string, AIFeedback> = {};
      feedbackList.forEach(f => {
        feedbackMap[f.message_id] = f;
      });
      setMessageFeedback(feedbackMap);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;
    setUploading(true);
    try {
      const result = await SupportService.uploadAttachment(selectedConversation.id, file);
      setPendingAttachment({ url: result.url, name: result.name, type: result.type });
    } catch (error: any) {
      toast({ title: error.message || 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !pendingAttachment) || !selectedConversation || !currentUserId) return;

    setSendingMessage(true);
    try {
      await SupportService.sendAgentMessage(
        selectedConversation.id,
        newMessage || (pendingAttachment ? `[Attachment: ${pendingAttachment.name}]` : ''),
        currentUserId,
        isInternal,
        pendingAttachment || undefined,
        mentionedUserIds.length > 0 ? mentionedUserIds : undefined
      );
      setNewMessage('');
      setMentionedUserIds([]);
      setPendingAttachment(null);
      toast({ title: isInternal ? 'Internal note added' : 'Message sent' });
      // Instantly bump this conversation to the top of the list
      const now = new Date().toISOString();
      setConversations(prev => prev.map(c =>
        c.id === selectedConversation.id
          ? { ...c, updated_at: now, last_message_at: now, last_message_sender_type: 'agent' as const }
          : c
      ));
      markRead(selectedConversation.id);
    } catch (error) {
      toast({ title: 'Error sending message', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!selectedConversation || !editingContent.trim()) return;
    try {
      const updated = await SupportService.editMessage(
        selectedConversation.id,
        messageId,
        editingContent.trim()
      );
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: updated.content, edited_at: updated.edited_at } : m));
      setEditingMessageId(null);
      setEditingContent('');
      toast({ title: 'Message updated' });
    } catch (error: any) {
      toast({ title: error.message || 'Failed to edit message', variant: 'destructive' });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedConversation) return;
    try {
      await SupportService.deleteMessage(selectedConversation.id, messageId);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: '' } : m));
      toast({ title: 'Message deleted' });
    } catch (error: any) {
      toast({ title: error.message || 'Failed to delete message', variant: 'destructive' });
    }
  };

  const handleSendEmail = async (bodyHtml: string, subject: string) => {
    if (!selectedConversation || !currentUserId) return;
    setSendingMessage(true);
    try {
      await SupportService.sendEmailReply(
        selectedConversation.id,
        bodyHtml,
        subject,
      );
      toast({ title: 'Email sent' });
      const now = new Date().toISOString();
      setConversations(prev => prev.map(c =>
        c.id === selectedConversation.id
          ? { ...c, updated_at: now, last_message_at: now, last_message_sender_type: 'agent' as const }
          : c
      ));
      markRead(selectedConversation.id);
    } catch (error) {
      toast({ title: 'Error sending email', variant: 'destructive' });
      throw error;
    } finally {
      setSendingMessage(false);
    }
  };

  const handleNewEmailCreated = (conversation: Conversation) => {
    setConversations(prev => [conversation, ...prev]);
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
  };

  const [convertingToEmail, setConvertingToEmail] = useState(false);
  const handleConvertToEmail = async () => {
    if (!selectedConversation || convertingToEmail) return;
    setConvertingToEmail(true);
    try {
      const updated = await SupportService.convertToEmail(selectedConversation.id);
      setSelectedConversation(updated);
      setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
      toast({ title: 'Converted to email ticket' });
      // Switch to email tab so agent sees the conversation there
      setActiveView('email');
      loadMessages(updated.id);
    } catch (error: any) {
      toast({
        title: 'Failed to convert',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setConvertingToEmail(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedConversation) return;
    try {
      await SupportService.resolveConversation(selectedConversation.id);
      toast({ title: 'Conversation resolved' });
      loadConversations();
    } catch (error) {
      toast({ title: 'Error resolving conversation', variant: 'destructive' });
    }
  };

  const handleToggleAI = async (enabled: boolean) => {
    if (!selectedConversation || !currentUserId) return;
    try {
      await SupportService.toggleAI(selectedConversation.id, enabled, currentUserId, currentUserName);
      setSelectedConversation(prev => prev ? { ...prev, ai_enabled: enabled } : null);
      toast({ title: enabled ? 'AI enabled' : 'AI disabled - You are now handling this conversation' });
      // Reload messages to show the system message
      if (!enabled) {
        setTimeout(() => loadMessages(selectedConversation.id), 500);
      }
    } catch (error) {
      toast({ title: 'Error toggling AI', variant: 'destructive' });
    }
  };

  const handleToggleAttachments = async (enabled: boolean) => {
    if (!selectedConversation) return;
    try {
      await SupportService.toggleAttachments(selectedConversation.id, enabled);
      setSelectedConversation(prev => prev ? { ...prev, attachments_enabled: enabled } : null);
      toast({ title: enabled ? 'Attachments enabled for client' : 'Attachments disabled for client' });
    } catch (error) {
      toast({ title: 'Error toggling attachments', variant: 'destructive' });
    }
  };

  const handleAgentAssigned = (agentId: string | null) => {
    setSelectedConversation(prev => prev ? { ...prev, assigned_agent_id: agentId } : null);
    // Also update the conversations list so switching conversations doesn't revert
    if (selectedConversation) {
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, assigned_agent_id: agentId }
            : c
        )
      );
    }
  };

  // Helper to get user display name
  const getUserDisplayName = (conv: Conversation) => {
    // First check user_name from API (Django backend)
    if ((conv as any).user_name) {
      return (conv as any).user_name;
    }
    // Fallback to profiles (Supabase format)
    if (conv.profiles?.first_name || conv.profiles?.last_name) {
      return `${conv.profiles.first_name || ''} ${conv.profiles.last_name || ''}`.trim();
    }
    return null;
  };

  const getUserEmail = (conv: Conversation) => {
    // First check user_email from API (Django backend)
    if ((conv as any).user_email) {
      return (conv as any).user_email;
    }
    // Fallback to profiles (Supabase format)
    return conv.profiles?.email || null;
  };

  const handleExport = async () => {
    if (!selectedConversation) return;
    try {
      const result = await SupportService.exportConversation(selectedConversation.id);
      const blob = new Blob([result.text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Conversation exported' });
    } catch (error) {
      toast({ title: 'Error exporting conversation', variant: 'destructive' });
    }
  };

  const handleOpenFeedback = (message: Message) => {
    setSelectedMessageForFeedback(message);
    setFeedbackDialogOpen(true);
  };

  const handleFeedbackSubmitted = (feedback: AIFeedback) => {
    setMessageFeedback(prev => ({
      ...prev,
      [feedback.message_id]: feedback
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'escalated': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default">Active</Badge>;
      case 'resolved': return <Badge variant="secondary">Resolved</Badge>;
      case 'escalated': return <Badge variant="destructive">Escalated</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getSenderIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="h-4 w-4" />;
      case 'ai': return <Bot className="h-4 w-4" />;
      case 'agent': return <UserCog className="h-4 w-4" />;
      default: return null;
    }
  };

  const isSystemMessage = (msg: Message) => {
    return msg.metadata?.event_type === 'agent_joined' || msg.metadata?.event_type === 'agent_left';
  };

  // Filter and sort conversations (most recent first)
  const filteredConversations = conversations
    .filter(c => {
      // Tab-level source filtering
      const convSource = c.source || 'widget';
      if (activeView === 'chats' && convSource === 'email') return false;
      if (activeView === 'email' && convSource !== 'email') return false;

      // Filter by status
      if (statusFilter === 'assigned_to_me') {
        if (c.assigned_agent_id !== currentUserId) {
          return false;
        }
      } else if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }
      // Filter by search
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        return c.account_login?.toLowerCase().includes(search) ||
               c.subject?.toLowerCase().includes(search) ||
               c.email_subject?.toLowerCase().includes(search) ||
               c.user_email?.toLowerCase().includes(search) ||
               c.user_name?.toLowerCase().includes(search) ||
               c.profiles?.email?.toLowerCase().includes(search) ||
               c.profiles?.first_name?.toLowerCase().includes(search) ||
               c.profiles?.last_name?.toLowerCase().includes(search);
      }
      return true;
    })
    .sort((a, b) => {
      // In email tab: "Needs Reply" (last_message_sender_type === 'user') first
      if (activeView === 'email') {
        const aNeeds = a.last_message_sender_type === 'user' ? 1 : 0;
        const bNeeds = b.last_message_sender_type === 'user' ? 1 : 0;
        if (aNeeds !== bNeeds) return bNeeds - aNeeds;
      }
      // Then sort by most recent activity
      const getTimestamp = (c: typeof a) => {
        const dateStr = c.updated_at || c.last_message_at || c.created_at;
        if (!dateStr) return 0;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      };
      return getTimestamp(b) - getTimestamp(a);
    });

  // Get "time ago" string for email ticket triage
  const getTimeAgo = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const now = Date.now();
      const diffMs = now - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      return `${diffDay}d ago`;
    } catch {
      return '';
    }
  };

  // Get reply status badge for email tickets
  const getReplyBadge = (conv: Conversation) => {
    if (conv.status === 'resolved') {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] px-1.5 py-0 leading-4 flex-shrink-0 hover:bg-emerald-100">
          Resolved
        </Badge>
      );
    }
    if (conv.last_message_sender_type === 'user') {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-[10px] px-1.5 py-0 leading-4 flex-shrink-0 hover:bg-red-100">
          <CircleDot className="h-2.5 w-2.5 mr-0.5" />
          Needs Reply
        </Badge>
      );
    }
    if (conv.last_message_sender_type === 'agent') {
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] px-1.5 py-0 leading-4 flex-shrink-0 hover:bg-amber-100">
          Awaiting Reply
        </Badge>
      );
    }
    return null;
  };

  // Get source icon
  const getSourceIcon = (source?: string) => {
    if (source === 'discord') {
      return <DiscordIcon className="h-3 w-3 text-indigo-500" />;
    }
    if (source === 'website') {
      return <Globe className="h-3 w-3 text-teal-500" />;
    }
    if (source === 'email') {
      return <Mail className="h-3 w-3 text-amber-500" />;
    }
    return <MessageCircle className="h-3 w-3 text-blue-500" />;
  };

  // Get source badge for header
  const getSourceBadge = (source?: string) => {
    if (source === 'discord') {
      return (
        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
          <DiscordIcon className="h-3 w-3 mr-1" />
          Discord
        </Badge>
      );
    }
    if (source === 'website') {
      return (
        <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
          <Globe className="h-3 w-3 mr-1" />
          Website
        </Badge>
      );
    }
    if (source === 'email') {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <Mail className="h-3 w-3 mr-1" />
          Email
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        <MessageCircle className="h-3 w-3 mr-1" />
        Widget
      </Badge>
    );
  };

  return (
    <div className={`flex flex-col ${isMobile ? 'h-[calc(100vh-56px)]' : 'h-[calc(100vh-120px)]'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 flex-shrink-0 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            {isMobile && showMessages && (
              <Button variant="ghost" size="icon" className="mr-1 -ml-2" onClick={() => setShowMessages(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Support Dashboard
          </h1>
          {(!isMobile || !showMessages) && (
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage live chat and email support conversations
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'chats' | 'email' | 'stats')}>
            <TabsList>
              <TabsTrigger value="chats" className="gap-1.5">
                <MessageSquare className="h-4 w-4" />
                {!isMobile && 'Live Chat'}
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5">
                <Mail className="h-4 w-4" />
                {!isMobile && 'Email Tickets'}
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                {!isMobile && 'Stats'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <MentionNotificationBell
            onNavigateToConversation={(convId) => {
              const conv = conversations.find(c => c.id === convId);
              if (conv) selectConversation(conv);
            }}
          />
          <Button
            onClick={() => setSoundEnabled(!soundEnabled)}
            variant="outline"
            size="icon"
            title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button onClick={loadConversations} variant="outline" size={isMobile ? 'icon' : 'default'}>
            <RefreshCw className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Refresh</span>}
          </Button>
          {activeView === 'email' && (
            <Button onClick={() => setNewEmailDialogOpen(true)} variant="default" size="sm">
              <Mail className="h-4 w-4 mr-1" />
              New Email
            </Button>
          )}
        </div>
      </div>

      {activeView === 'stats' ? (
        <Card className="flex-1 overflow-auto">
          <CardContent className="p-6">
            <CSStatsPanel />
          </CardContent>
        </Card>
      ) : /* chats or email */ (
        <div className={`${isMobile ? 'flex flex-col' : 'grid grid-cols-12 gap-6'} flex-1 min-h-0`}>
          {/* Conversations List */}
          <div className={`${isMobile ? (showMessages ? 'hidden' : 'flex-1') : 'col-span-4'} flex flex-col min-h-0`}>
            <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <CardHeader className="pb-3 space-y-3 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <ConversationFilters
                  conversations={conversations}
                  activeStatus={statusFilter}
                  onStatusChange={(status) => setStatusFilter(status)}
                  currentUserId={currentUserId}
                  globalCounts={statusCounts}
                />
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden min-h-0">
                <ScrollArea className="h-full">
                  <div className="space-y-1 p-2">
                    {filteredConversations.map((conv) => {
                      const displayName = getUserDisplayName(conv);
                      const email = getUserEmail(conv);
                      const unread = unreadIds.has(conv.id) && selectedConversation?.id !== conv.id;
                      const isEmailTab = activeView === 'email';

                      return (
                        <div
                          key={conv.id}
                          onClick={() => selectConversation(conv)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedConversation?.id === conv.id
                              ? 'bg-primary/10 border border-primary/20'
                              : unread
                                ? 'bg-blue-100 dark:bg-blue-900/40 border-l-4 border-l-blue-600 hover:bg-blue-200 dark:hover:bg-blue-900/60 shadow-sm'
                                : 'hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {unread && (
                                  <span className="relative h-2.5 w-2.5 flex-shrink-0">
                                    <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75" />
                                    <span className="relative block h-2.5 w-2.5 rounded-full bg-blue-600" />
                                  </span>
                                )}
                                {isEmailTab ? (
                                  <span className={`text-sm truncate ${unread ? 'font-bold text-blue-900 dark:text-blue-100' : 'font-medium'}`}>
                                    {conv.email_subject || conv.subject || 'No Subject'}
                                  </span>
                                ) : (
                                  <span className={`text-sm truncate ${unread ? 'font-bold text-blue-900 dark:text-blue-100' : 'font-medium'}`}>
                                    {displayName || 'Unknown User'}
                                  </span>
                                )}
                                {unread && (
                                  <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0 leading-4 flex-shrink-0 hover:bg-blue-600">
                                    New
                                  </Badge>
                                )}
                                {mentionConvIds.has(conv.id) && (
                                  <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 leading-4 flex-shrink-0 hover:bg-amber-500 gap-0.5">
                                    <AtSign className="h-2.5 w-2.5" />
                                  </Badge>
                                )}
                                {!isEmailTab && conv.is_guest && (
                                  <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 text-[10px] px-1.5 py-0 leading-4 flex-shrink-0">
                                    Guest
                                  </Badge>
                                )}
                              </div>
                              {isEmailTab ? (
                                <span className="text-xs text-muted-foreground block truncate">
                                  {displayName || email || 'Unknown'}
                                </span>
                              ) : (
                                email && (
                                  <span className="text-xs text-muted-foreground block truncate">
                                    {email}
                                  </span>
                                )
                              )}
                            </div>
                            {isEmailTab ? getReplyBadge(conv) : getStatusIcon(conv.status)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {!isEmailTab && getSourceIcon(conv.source)}
                            {!isEmailTab && (conv.ai_enabled ? (
                              <Bot className="h-3 w-3 text-purple-500" />
                            ) : (
                              <UserCog className="h-3 w-3 text-green-500" />
                            ))}
                            <span>{isEmailTab ? getTimeAgo(conv.last_message_at || conv.updated_at) : formatDate(conv.updated_at, 'MMM d, HH:mm')}</span>
                            {!isEmailTab && conv.attachments_enabled && (
                              <Paperclip className="h-3 w-3 text-blue-500" />
                            )}
                            {isEmailTab && getStatusIcon(conv.status)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Chat Panel */}
          <div className={`${isMobile ? (showMessages ? 'flex-1' : 'hidden') : 'col-span-8'} flex flex-col min-h-0`}>
            {selectedConversation ? (
              <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {getUserDisplayName(selectedConversation) || 'Support Conversation'}
                      </CardTitle>
                      {selectedConversation.source === 'email' && selectedConversation.email_subject && (
                        <p className="text-sm font-medium text-foreground/80">{selectedConversation.email_subject}</p>
                      )}
                      {getUserEmail(selectedConversation) && (
                        <p className="text-sm text-muted-foreground">{getUserEmail(selectedConversation)}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {getStatusBadge(selectedConversation.status)}
                        {getSourceBadge(selectedConversation.source)}
                        {selectedConversation.is_guest && (
                          <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                            <Globe className="h-3 w-3 mr-1" />
                            Guest Visitor
                          </Badge>
                        )}
                        <Badge variant={selectedConversation.priority === 'urgent' ? 'destructive' : 'outline'}>
                          {selectedConversation.priority}
                        </Badge>
                        {selectedConversation.ai_enabled ? (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            <Bot className="h-3 w-3 mr-1" />
                            AI Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            <UserCog className="h-3 w-3 mr-1" />
                            Human Takeover
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <AgentAssignmentDropdown
                        conversation={selectedConversation}
                        onAssigned={handleAgentAssigned}
                      />
                      {!isMobile && activeView === 'chats' && selectedConversation.source !== 'email' && (getUserEmail(selectedConversation)) && (
                        <Button variant="outline" size="sm" onClick={handleConvertToEmail} disabled={convertingToEmail}>
                          <ArrowRightLeft className="h-4 w-4 mr-1" />
                          {convertingToEmail ? 'Converting...' : 'Convert to Email'}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="h-4 w-4" />
                        {!isMobile && <span className="ml-1">Export</span>}
                      </Button>
                      {selectedConversation.status !== 'resolved' && (
                        <Button size="sm" onClick={handleResolve}>
                          <CheckCircle className="h-4 w-4" />
                          {!isMobile && <span className="ml-1">Resolve</span>}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 p-0 overflow-hidden min-h-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-4 p-4">
                      {messages.map((msg) => {
                        // Render system messages differently
                        if (isSystemMessage(msg)) {
                          return <SystemMessage key={msg.id} message={msg} />;
                        }

                        // Render email messages with dedicated component
                        if (msg.message_type === 'email') {
                          const emailSenderName = msg.sender_type === 'user'
                            ? (getUserDisplayName(selectedConversation) || 'Customer')
                            : (msg.sender_id && agentNames[msg.sender_id]) || 'Agent';
                          return (
                            <EmailMessageBubble
                              key={msg.id}
                              message={msg}
                              senderName={emailSenderName}
                              formatDate={formatDate}
                            />
                          );
                        }

                        const metadata = msg.metadata || {};
                        const hasTranslation = metadata.translated_content && metadata.original_content !== metadata.translated_content;
                        const isOwnAgentMessage = msg.sender_type === 'agent' && msg.sender_id === currentUserId;
                        const isEditing = editingMessageId === msg.id;

                        // Render deleted messages
                        if (msg.is_deleted) {
                          return (
                            <div key={msg.id} className="flex gap-3 opacity-50">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-400">
                                {getSenderIcon(msg.sender_type)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm text-muted-foreground">
                                    {msg.sender_type === 'agent' ? ((msg.sender_id && agentNames[msg.sender_id]) || 'Agent') : 'WeHelp bot'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(msg.created_at, 'HH:mm')}
                                  </span>
                                </div>
                                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 italic text-muted-foreground text-sm">
                                  This message was deleted.
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg.id}
                            className={`flex gap-3 group ${msg.is_internal ? 'opacity-60' : ''}`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              msg.sender_type === 'user' ? 'bg-blue-100 text-blue-600' :
                              msg.sender_type === 'ai' ? 'bg-purple-100 text-purple-600' :
                              'bg-green-100 text-green-600'
                            }`}>
                              {getSenderIcon(msg.sender_type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {msg.sender_type === 'user'
                                    ? (getUserDisplayName(selectedConversation) || 'Customer')
                                    : msg.sender_type === 'ai'
                                    ? 'WeHelp bot'
                                    : (msg.sender_id && agentNames[msg.sender_id]) || 'Agent'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(msg.created_at, 'HH:mm')}
                                </span>
                                {msg.edited_at && (
                                  <span className="text-xs text-muted-foreground italic">(edited)</span>
                                )}
                                {msg.is_internal && (
                                  <Badge variant="outline" className="text-xs">Internal</Badge>
                                )}
                                {/* Show feedback indicator for AI messages */}
                                {msg.sender_type === 'ai' && messageFeedback[msg.id] && (
                                  <FeedbackIndicator feedback={messageFeedback[msg.id]} />
                                )}
                                {/* Edit/Delete buttons for own agent messages */}
                                {isOwnAgentMessage && !isEditing && (
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-auto">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                      onClick={() => { setEditingMessageId(msg.id); setEditingContent(msg.content); }}
                                      title="Edit message"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      title="Delete message"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className={`p-3 rounded-lg ${
                                msg.sender_type === 'user' ? 'bg-blue-50 dark:bg-blue-950' :
                                msg.sender_type === 'ai' ? 'bg-purple-50 dark:bg-purple-950' :
                                msg.is_internal ? 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200' :
                                'bg-green-50 dark:bg-green-950'
                              }`}>
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editingContent}
                                      onChange={(e) => setEditingContent(e.target.value)}
                                      className="w-full rounded border border-input bg-background px-2 py-1 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditMessage(msg.id); }
                                        if (e.key === 'Escape') { setEditingMessageId(null); setEditingContent(''); }
                                      }}
                                    />
                                    <div className="flex gap-1">
                                      <Button size="sm" className="h-7 text-xs" onClick={() => handleEditMessage(msg.id)}>
                                        <Check className="h-3 w-3 mr-1" /> Save
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingMessageId(null); setEditingContent(''); }}>
                                        <X className="h-3 w-3 mr-1" /> Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : hasTranslation && msg.sender_type === 'user' ? (
                                  <TranslatedMessage
                                    originalContent={metadata.original_content || msg.content}
                                    translatedContent={metadata.translated_content || msg.content}
                                    detectedLanguage={metadata.detected_language}
                                    showOriginalFirst={false}
                                  />
                                ) : (
                                  <ChatMessageRenderer content={msg.content} />
                                )}
                                {msg.attachment_url && (
                                  <div className="mt-2">
                                    {msg.attachment_type?.startsWith('image/') ? (
                                      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                        <img src={msg.attachment_url} alt={msg.attachment_name || 'Attachment'} className="max-w-xs rounded border cursor-pointer hover:opacity-90" />
                                      </a>
                                    ) : msg.attachment_type?.startsWith('video/') ? (
                                      <video src={msg.attachment_url} controls className="max-w-xs rounded border" />
                                    ) : (
                                      <a
                                        href={msg.attachment_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                                      >
                                        <Paperclip className="h-3 w-3" />
                                        {msg.attachment_name || 'Attachment'}
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* Feedback button for AI messages */}
                              {msg.sender_type === 'ai' && !messageFeedback[msg.id] && currentUserId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-1 h-7 text-xs text-muted-foreground hover:text-primary"
                                  onClick={() => handleOpenFeedback(msg)}
                                >
                                  <Star className="h-3 w-3 mr-1" />
                                  Rate Response
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {/* Typing indicator: show when AI is enabled and last message is from user */}
                      {selectedConversation.ai_enabled &&
                        messages.length > 0 &&
                        messages[messages.length - 1].sender_type === 'user' && (
                          <TypingIndicator />
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                {activeView === 'email' ? (
                  <EmailComposePanel
                    conversation={selectedConversation}
                    onSend={handleSendEmail}
                    onCancel={() => setSelectedConversation(null)}
                    sending={sendingMessage}
                  />
                ) : (
                  <div className="p-3 sm:p-4 border-t">
                    <div className="flex items-center gap-3 sm:gap-4 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isInternal}
                          onCheckedChange={setIsInternal}
                          id="internal-note"
                        />
                        <Label htmlFor="internal-note" className="text-xs sm:text-sm">Internal</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selectedConversation.attachments_enabled}
                          onCheckedChange={handleToggleAttachments}
                        />
                        <Label className="text-xs sm:text-sm">Attach</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={selectedConversation.ai_enabled}
                          onCheckedChange={handleToggleAI}
                        />
                        <Label className="text-xs sm:text-sm">AI</Label>
                      </div>
                    </div>
                    {/* Pending attachment preview */}
                    {pendingAttachment && (
                      <div className="flex items-center gap-2 p-2 mb-2 bg-muted rounded-md">
                        <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate flex-1">{pendingAttachment.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setPendingAttachment(null)}
                        >
                          &times;
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,application/pdf"
                        onChange={handleFileSelect}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="self-end flex-shrink-0"
                        disabled={uploading || selectedConversation.ai_enabled}
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach file"
                      >
                        {uploading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                      </Button>
                      <MentionTextarea
                        value={newMessage}
                        onChange={setNewMessage}
                        onMentionsChange={setMentionedUserIds}
                        placeholder={selectedConversation.ai_enabled ? "AI is handling this conversation. Disable AI to respond." : (isInternal ? "Add internal note... (use @ to mention)" : "Type your message... (use @ to mention)")}
                        disabled={selectedConversation.ai_enabled}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && !selectedConversation.ai_enabled) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sendingMessage || (!newMessage.trim() && !pendingAttachment) || selectedConversation.ai_enabled}
                        className="self-end"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to view messages</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* AI Feedback Dialog */}
      {selectedMessageForFeedback && currentUserId && (
        <AIFeedbackDialog
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
          messageId={selectedMessageForFeedback.id}
          conversationId={selectedMessageForFeedback.conversation_id}
          agentId={currentUserId}
          messageContent={selectedMessageForFeedback.content}
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      )}

      {/* New Email Dialog */}
      <NewEmailDialog
        open={newEmailDialogOpen}
        onOpenChange={setNewEmailDialogOpen}
        onConversationCreated={handleNewEmailCreated}
      />
    </div>
  );
};

export default SupportDashboard;
