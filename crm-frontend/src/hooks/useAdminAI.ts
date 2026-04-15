/**
 * Admin AI Assistant — Main State Management Hook
 * Manages conversation state, message flow, SSE streaming, and context detection.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { adminAIService } from '@/services/adminAIService';
import { useAdminAIStream } from '@/hooks/useAdminAIStream';
import type {
  AdminAIConversation,
  AdminAIMessage,
  AdminAIContextType,
} from '@/types/adminAI';

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

interface UseAdminAIReturn {
  // State
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

  // Actions
  startNewChat: () => Promise<void>;
  sendMessage: (text: string) => void;
  confirmAction: (confirmed: boolean) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  goBack: () => void;
  clearError: () => void;
}

function detectContextFromPath(pathname: string): { type: AdminAIContextType; id: string | null } {
  const lower = pathname.toLowerCase();

  if (lower.includes('/enrollment-review/')) {
    const match = pathname.match(/\/enrollment-review\/([^/]+)/);
    return { type: 'enrollment', id: match?.[1] || null };
  }
  if (lower.includes('/traders/') && lower.includes('/review')) {
    const match = pathname.match(/\/traders\/([^/]+)\/review/);
    return { type: 'trader', id: match?.[1] || null };
  }
  if (lower.includes('/trading-activity/payout/')) {
    const match = pathname.match(/\/trading-activity\/payout\/([^/]+)/);
    return { type: 'payout', id: match?.[1] || null };
  }
  if (lower.includes('/trading-activity/')) {
    const match = pathname.match(/\/trading-activity\/([^/]+)/);
    return { type: 'trader', id: match?.[1] || null };
  }
  if (lower.includes('/payout-request') || lower.includes('/payouts')) {
    return { type: 'payout', id: null };
  }
  if (lower.includes('/order-history')) {
    return { type: 'order', id: null };
  }
  if (lower.includes('/traders')) {
    return { type: 'trader', id: null };
  }
  if (lower.includes('/challenges') || lower.includes('/bulk-challenge')) {
    return { type: 'enrollment', id: null };
  }

  return { type: 'general', id: null };
}

export function useAdminAI(): UseAdminAIReturn {
  const location = useLocation();

  const [conversation, setConversation] = useState<AdminAIConversation | null>(null);
  const [conversations, setConversations] = useState<AdminAIConversation[]>([]);
  const [messages, setMessages] = useState<AdminAIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [toolActivities, setToolActivities] = useState<ToolActivity[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  const streamingTextRef = useRef('');
  const toolActivitiesRef = useRef<ToolActivity[]>([]);
  const idCounterRef = useRef(0);
  const confirmingRef = useRef(false);

  // Detect context from current URL — memoised to avoid recalculating every render
  const { type: contextType, id: contextId } = useMemo(
    () => detectContextFromPath(location.pathname),
    [location.pathname]
  );
  const contextUrl = `${window.location.origin}${location.pathname}${location.search}`;

  // SSE stream hook
  const { isStreaming, startStream, cancelStream } = useAdminAIStream({
    onToken: (text) => {
      streamingTextRef.current += text;
      setStreamingText(streamingTextRef.current);
    },
    onToolCall: (name, args) => {
      idCounterRef.current += 1;
      const activity: ToolActivity = {
        id: `tc-${idCounterRef.current}`,
        type: 'tool_call',
        name,
        args,
        timestamp: new Date().toISOString(),
      };
      toolActivitiesRef.current = [...toolActivitiesRef.current, activity];
      setToolActivities(toolActivitiesRef.current);
    },
    onToolResult: (name, success, data, err) => {
      idCounterRef.current += 1;
      const activity: ToolActivity = {
        id: `tr-${idCounterRef.current}`,
        type: 'tool_result',
        name,
        success,
        data,
        error: err,
        timestamp: new Date().toISOString(),
      };
      toolActivitiesRef.current = [...toolActivitiesRef.current, activity];
      setToolActivities(toolActivitiesRef.current);
    },
    onConfirmationRequired: (messageId, toolName, params, description) => {
      setPendingConfirmation({ messageId, toolName, params, description });
    },
    onDone: (messageId, modelUsed, complexityScore) => {
      // Add AI message from streamed text
      if (streamingTextRef.current) {
        const aiMsg: AdminAIMessage = {
          id: messageId || `ai-${Date.now()}`,
          conversation: conversation?.id || '',
          role: 'ai',
          content: streamingTextRef.current,
          model_used: modelUsed || null,
          complexity_score: complexityScore ?? null,
          action_executed: null,
          action_params: null,
          action_result: null,
          action_status: null,
          metadata: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
      // Reset streaming state
      streamingTextRef.current = '';
      setStreamingText('');
      toolActivitiesRef.current = [];
      setToolActivities([]);
    },
    onError: (message) => {
      setError(message);
      streamingTextRef.current = '';
      setStreamingText('');
    },
  });

  // Cancel stream on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      cancelStream();
    };
  }, [cancelStream]);

  // Clear pending confirmation on route change to prevent confirming wrong context
  useEffect(() => {
    setPendingConfirmation(null);
  }, [location.pathname]);

  const loadConversations = useCallback(async () => {
    try {
      const convs = await adminAIService.getConversations();
      setConversations(convs);
    } catch {
      // Silent fail — conversation list is non-critical
    }
  }, []);

  const startNewChat = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPendingConfirmation(null);
    setToolActivities([]);
    toolActivitiesRef.current = [];

    try {
      const conv = await adminAIService.startConversation({
        context_type: contextType,
        context_id: contextId || undefined,
        context_url: contextUrl,
      });

      setConversation(conv);
      setMessages(conv.messages || []);
      // Refresh conversation list so the new chat appears
      loadConversations();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setIsLoading(false);
    }
  }, [contextType, contextId, contextUrl, loadConversations]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!conversation || !text.trim() || isStreaming) return;

      // Add admin message optimistically
      const adminMsg: AdminAIMessage = {
        id: `admin-${Date.now()}`,
        conversation: conversation.id,
        role: 'admin',
        content: text.trim(),
        model_used: null,
        complexity_score: null,
        action_executed: null,
        action_params: null,
        action_result: null,
        action_status: null,
        metadata: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, adminMsg]);

      // Reset streaming state
      streamingTextRef.current = '';
      setStreamingText('');
      toolActivitiesRef.current = [];
      setToolActivities([]);
      setPendingConfirmation(null);
      setError(null);

      // Start SSE stream
      startStream(conversation.id, text.trim(), contextUrl);
    },
    [conversation, isStreaming, startStream, contextUrl]
  );

  const confirmAction = useCallback(
    async (confirmed: boolean) => {
      if (!conversation || !pendingConfirmation) return;
      // Ref-based guard prevents double-submission on rapid clicks
      if (confirmingRef.current) return;
      confirmingRef.current = true;

      setIsLoading(true);
      try {
        const result = await adminAIService.confirmAction({
          conversation_id: conversation.id,
          message_id: pendingConfirmation.messageId,
          confirmed,
        });

        // Add system message with result
        const systemMsg: AdminAIMessage = {
          id: `sys-${Date.now()}`,
          conversation: conversation.id,
          role: 'system',
          content: result.message || (confirmed ? 'Action confirmed.' : 'Action cancelled.'),
          model_used: null,
          complexity_score: null,
          action_executed: pendingConfirmation.toolName,
          action_params: pendingConfirmation.params,
          action_result: result.action_result || null,
          action_status: confirmed ? (result.success ? 'success' : 'error') : 'cancelled',
          metadata: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, systemMsg]);
        setPendingConfirmation(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to process confirmation');
      } finally {
        confirmingRef.current = false;
        setIsLoading(false);
      }
    },
    [conversation, pendingConfirmation]
  );

  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    setError(null);
    setPendingConfirmation(null);

    try {
      const conv = await adminAIService.getConversation(conversationId);
      setConversation(conv);
      setMessages(conv.messages || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      await adminAIService.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      // If we deleted the active conversation, clear it
      if (conversation?.id === conversationId) {
        setConversation(null);
        setMessages([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversation');
    }
  }, [conversation]);

  const goBack = useCallback(() => {
    cancelStream();
    setConversation(null);
    setMessages([]);
    setPendingConfirmation(null);
    setError(null);
    streamingTextRef.current = '';
    setStreamingText('');
    toolActivitiesRef.current = [];
    setToolActivities([]);
  }, [cancelStream]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load conversation list on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
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
    startNewChat,
    sendMessage,
    confirmAction,
    loadConversation,
    loadConversations,
    deleteConversation,
    goBack,
    clearError,
  };
}
