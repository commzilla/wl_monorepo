import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAI } from '@/hooks/useAdminAI';
import { AdminAIChatPanel } from './AdminAIChatPanel';

/**
 * Inner widget that mounts useAdminAI — only rendered for CRM staff.
 * Write actions and confirmations are only shown to admin-role users;
 * support/risk users get read-only tool access.
 */
function AdminAIWidgetInner() {
  const { isAdmin, hasPermission } = useAuth();
  const canConfirm = hasPermission('config.manage_ai_rules');
  const [isOpen, setIsOpen] = useState(false);

  const {
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
    deleteConversation,
    goBack,
    clearError,
  } = useAdminAI();

  return (
    <>
      {/* Floating trigger button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            className={cn(
              'h-12 w-12 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300',
              'bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70',
              'border border-primary/30'
            )}
          >
            <Bot className="h-5.5 w-5.5 text-primary-foreground" />
          </Button>
        )}
      </div>

      {/* Chat panel overlay */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={cn(
              'w-[calc(100vw-48px)] sm:w-[400px] h-[600px] max-h-[calc(100vh-80px)]',
              'rounded-2xl overflow-hidden shadow-2xl',
              'bg-card/95 backdrop-blur-xl border border-border/30',
              'flex flex-col',
              'animate-in slide-in-from-bottom-5 fade-in duration-300'
            )}
          >
            <AdminAIChatPanel
              conversation={conversation}
              conversations={conversations}
              messages={messages}
              isStreaming={isStreaming}
              isLoading={isLoading}
              error={error}
              streamingText={streamingText}
              toolActivities={toolActivities}
              pendingConfirmation={canConfirm ? pendingConfirmation : null}
              contextType={contextType}
              canConfirmActions={canConfirm}
              onSendMessage={sendMessage}
              onStartNewChat={startNewChat}
              onConfirmAction={confirmAction}
              onLoadConversation={loadConversation}
              onDeleteConversation={deleteConversation}
              onBack={goBack}
              onClose={() => setIsOpen(false)}
              onClearError={clearError}
            />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Gate component — only mounts the inner widget (with hooks) for CRM staff.
 * Admin, support, and risk roles can use the chat widget.
 */
export function AdminAIWidget() {
  const { hasPermission } = useAuth();

  if (!hasPermission('dashboard.view')) return null;

  return <AdminAIWidgetInner />;
}
