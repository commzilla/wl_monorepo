import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIChat } from '@/hooks/useJournal';

interface AIChatInterfaceProps {
  enrollmentId: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const PRESET_QUESTIONS = [
  "What's my best setup?",
  "Why am I losing?",
  "Risk assessment",
  "Performance summary",
];

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    // Process inline bold markers
    const processInline = (str: string): React.ReactNode[] => {
      const parts: React.ReactNode[] = [];
      const boldRegex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = boldRegex.exec(str)) !== null) {
        if (match.index > lastIndex) {
          parts.push(str.slice(lastIndex, match.index));
        }
        parts.push(
          <span key={`bold-${match.index}`} className="font-semibold text-[#E4EEF5]">
            {match[1]}
          </span>
        );
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < str.length) {
        parts.push(str.slice(lastIndex));
      }

      return parts.length > 0 ? parts : [str];
    };

    const trimmed = line.trim();

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={lineIndex} className="flex items-start gap-2 ml-2 my-0.5">
          <span className="text-[#3AB3FF] mt-1.5 text-[6px]">&#9679;</span>
          <span>{processInline(trimmed.slice(2))}</span>
        </div>
      );
    } else if (trimmed.length === 0) {
      elements.push(<div key={lineIndex} className="h-2" />);
    } else {
      elements.push(
        <p key={lineIndex} className="my-0.5">
          {processInline(trimmed)}
        </p>
      );
    }
  });

  return elements;
}

const TypingIndicator: React.FC = () => (
  <div className="flex items-center gap-3 px-4 py-3">
    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#3AB3FF]/10 border border-[#3AB3FF]/20 shrink-0">
      <Sparkles className="w-3.5 h-3.5 text-[#3AB3FF]" />
    </div>
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full bg-[#3AB3FF] animate-[bounce_1.4s_ease-in-out_infinite]" />
      <span className="w-2 h-2 rounded-full bg-[#3AB3FF] animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
      <span className="w-2 h-2 rounded-full bg-[#3AB3FF] animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
    </div>
  </div>
);

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({ enrollmentId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [remainingQueries, setRemainingQueries] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useAIChat();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatMutation.isPending, scrollToBottom]);

  const handleSend = useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || chatMutation.isPending) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');

      chatMutation.mutate(
        { question: trimmed, enrollmentId },
        {
          onSuccess: (data) => {
            const aiMessage: ChatMessage = {
              id: `ai-${Date.now()}`,
              role: 'assistant',
              content: data.answer,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
            if (data.remaining_queries !== undefined) {
              setRemainingQueries(data.remaining_queries);
            }
          },
          onError: () => {
            const errorMessage: ChatMessage = {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content:
                'Sorry, I was unable to process your request. Please try again later.',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
          },
        }
      );
    },
    [chatMutation, enrollmentId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-[#1A2A3A] bg-[#0A1114] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1A2A3A] bg-[#0D1519]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#3AB3FF]/10 border border-[#3AB3FF]/20">
            <Sparkles className="w-4 h-4 text-[#3AB3FF]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#E4EEF5]">AI Trading Coach</h3>
            <p className="text-xs text-[#85A8C3]">Ask anything about your trading</p>
          </div>
        </div>
        {remainingQueries !== null && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#3AB3FF]/10 border border-[#3AB3FF]/20">
            <span className="text-xs font-medium text-[#3AB3FF]">
              {remainingQueries} queries left
            </span>
          </div>
        )}
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="flex flex-col gap-3 p-4 overflow-y-auto h-full">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#3AB3FF]/10 border border-[#3AB3FF]/20 mb-4">
                <Sparkles className="w-7 h-7 text-[#3AB3FF]" />
              </div>
              <h4 className="text-base font-semibold text-[#E4EEF5] mb-1.5">
                Your AI Trading Coach
              </h4>
              <p className="text-sm text-[#85A8C3] max-w-sm mb-6">
                Ask me anything about your trading performance, patterns, risk management, or
                areas for improvement.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {PRESET_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    disabled={chatMutation.isPending}
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-[#3AB3FF] bg-[#3AB3FF]/8 border border-[#3AB3FF]/20 hover:bg-[#3AB3FF]/15 hover:border-[#3AB3FF]/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-start gap-2.5 max-w-[85%]">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#3AB3FF]/10 border border-[#3AB3FF]/20 shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#3AB3FF]" />
                  </div>
                  <div className="rounded-xl rounded-tl-sm px-4 py-3 bg-[#111A20] border border-[#1A2A3A] text-sm text-[#C8D9E6] leading-relaxed">
                    {renderMarkdown(msg.content)}
                  </div>
                </div>
              )}
              {msg.role === 'user' && (
                <div className="max-w-[75%] rounded-xl rounded-tr-sm px-4 py-3 bg-[#3AB3FF]/15 border border-[#3AB3FF]/25 text-sm text-[#E4EEF5] leading-relaxed">
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {chatMutation.isPending && <TypingIndicator />}
        </div>
      </ScrollArea>

      {/* Preset chips (shown when there are messages) */}
      {messages.length > 0 && (
        <div className="flex gap-2 px-4 py-2 border-t border-[#1A2A3A] overflow-x-auto">
          {PRESET_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              disabled={chatMutation.isPending}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium text-[#85A8C3] bg-[#111A20] border border-[#1A2A3A] hover:text-[#3AB3FF] hover:border-[#3AB3FF]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-t border-[#1A2A3A] bg-[#0D1519]">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your AI coach..."
          disabled={chatMutation.isPending}
          className="flex-1 bg-[#111A20] border border-[#1A2A3A] rounded-lg px-3.5 py-2.5 text-sm text-[#E4EEF5] placeholder:text-[#4A6578] focus:outline-none focus:border-[#3AB3FF]/40 focus:ring-1 focus:ring-[#3AB3FF]/20 transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => handleSend(input)}
          disabled={!input.trim() || chatMutation.isPending}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#3AB3FF] hover:bg-[#28BFFF] text-[#080808] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AIChatInterface;
