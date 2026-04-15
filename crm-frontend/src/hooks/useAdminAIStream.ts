/**
 * Admin AI Assistant — SSE Streaming Hook
 * Raw fetch with ReadableStream reader for SSE event parsing.
 */

import { useState, useCallback, useRef } from 'react';
import type { AdminAIStreamEvent } from '@/types/adminAI';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.we-fund.com';

interface UseAdminAIStreamOptions {
  onToken?: (text: string) => void;
  onToolCall?: (name: string, args: Record<string, any>) => void;
  onToolResult?: (name: string, success: boolean, data: Record<string, any>, error?: string) => void;
  onConfirmationRequired?: (messageId: string, toolName: string, params: Record<string, any>, description: string) => void;
  onDone?: (messageId?: string, modelUsed?: string, complexityScore?: number) => void;
  onError?: (message: string) => void;
}

interface UseAdminAIStreamReturn {
  isStreaming: boolean;
  startStream: (conversationId: string, message: string, contextUrl?: string) => void;
  cancelStream: () => void;
}

export function useAdminAIStream(options: UseAdminAIStreamOptions = {}): UseAdminAIStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Use a ref to avoid stale closures — callbacks always read latest options
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback((conversationId: string, message: string, contextUrl?: string) => {
    // Cancel any existing stream
    cancelStream();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);

    const token = localStorage.getItem('access');

    const url = `${API_BASE_URL}/admin/ai-assistant/chat/stream/`;

    fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message: message,
        ...(contextUrl ? { context_url: contextUrl } : {}),
      }),
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          optionsRef.current.onError?.(`HTTP ${response.status}: ${response.statusText}`);
          setIsStreaming(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          optionsRef.current.onError?.('No response body available.');
          setIsStreaming(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Parse SSE events from buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;

              const jsonStr = trimmed.slice(6); // Remove "data: "
              try {
                const event: AdminAIStreamEvent = JSON.parse(jsonStr);
                handleEvent(event);
              } catch {
                // Skip malformed JSON
              }
            }
          }
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            // User cancelled — ignore
          } else {
            optionsRef.current.onError?.(err instanceof Error ? err.message : 'Stream error');
          }
        } finally {
          setIsStreaming(false);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // User cancelled — ignore
        } else {
          optionsRef.current.onError?.(err instanceof Error ? err.message : 'Connection failed');
        }
        setIsStreaming(false);
      });
  }, [cancelStream]);

  function handleEvent(event: AdminAIStreamEvent) {
    const opts = optionsRef.current;
    switch (event.type) {
      case 'token':
        opts.onToken?.(event.text);
        break;
      case 'tool_call':
        opts.onToolCall?.(event.name, event.args);
        break;
      case 'tool_result':
        opts.onToolResult?.(event.name, event.success, event.data, event.error);
        break;
      case 'confirmation_required':
        opts.onConfirmationRequired?.(event.message_id, event.tool_name, event.params, event.description);
        break;
      case 'done':
        opts.onDone?.(event.message_id, event.model_used, event.complexity_score);
        break;
      case 'error':
        opts.onError?.(event.message);
        break;
    }
  }

  return { isStreaming, startStream, cancelStream };
}
