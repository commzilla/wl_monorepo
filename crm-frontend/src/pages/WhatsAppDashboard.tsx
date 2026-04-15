import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WhatsAppService, WhatsAppConversation } from '@/services/whatsappService';
import { WhatsAppStatsBar } from '@/components/whatsapp/WhatsAppStatsBar';
import { WhatsAppFilters } from '@/components/whatsapp/WhatsAppFilters';
import { WhatsAppConversationList } from '@/components/whatsapp/WhatsAppConversationList';
import { WhatsAppChatPanel } from '@/components/whatsapp/WhatsAppChatPanel';
import { WhatsAppLeadPanel } from '@/components/whatsapp/WhatsAppLeadPanel';
import { MessageSquareMore, ArrowLeft, UserCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

type MobilePanel = 'list' | 'chat' | 'lead';

export default function WhatsAppDashboard() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<WhatsAppConversation | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [leadFilter, setLeadFilter] = useState('all');
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('list');

  // Load conversations with polling
  useEffect(() => {
    const filters: Parameters<typeof WhatsAppService.getConversations>[0] = {};
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (leadFilter !== 'all') filters.lead_status = leadFilter;
    if (search) filters.search = search;

    const unsub = WhatsAppService.subscribeToConversations(
      (data) => {
        setConversations(data);
        // Update selected conversation if it exists in the new data
        if (selectedConversation) {
          const updated = data.find((c) => c.id === selectedConversation.id);
          if (updated) setSelectedConversation(updated);
        }
      },
      filters,
      5000
    );

    return unsub;
  }, [statusFilter, leadFilter, search]);

  const handleSelect = useCallback((conv: WhatsAppConversation) => {
    setSelectedConversation(conv);
    if (isMobile) setMobilePanel('chat');
  }, [isMobile]);

  const handleConversationUpdate = useCallback(async () => {
    try {
      if (selectedConversation) {
        const updated = await WhatsAppService.getConversation(selectedConversation.id);
        setSelectedConversation(updated);
      }
      // Also refresh the list
      const filters: Parameters<typeof WhatsAppService.getConversations>[0] = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (leadFilter !== 'all') filters.lead_status = leadFilter;
      if (search) filters.search = search;
      const data = await WhatsAppService.getConversations(filters);
      setConversations(data);
    } catch (e) {
      console.error('Failed to refresh conversations:', e);
    }
  }, [selectedConversation, statusFilter, leadFilter, search]);

  return (
    <div className={`flex flex-col p-4 gap-4 ${isMobile ? 'h-[calc(100vh-56px)]' : 'h-[calc(100vh-64px)]'} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {isMobile && mobilePanel !== 'list' && (
            <Button variant="ghost" size="icon" onClick={() => setMobilePanel(mobilePanel === 'lead' ? 'chat' : 'list')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <MessageSquareMore className="h-5 w-5 text-green-600" />
              WhatsApp Sales Agent
            </h1>
            {(!isMobile || mobilePanel === 'list') && (
              <p className="text-sm text-muted-foreground">
                Manage AI-powered WhatsApp conversations and leads
              </p>
            )}
          </div>
        </div>
        {isMobile && mobilePanel === 'chat' && selectedConversation && (
          <Button variant="outline" size="sm" onClick={() => setMobilePanel('lead')}>
            <UserCircle className="h-4 w-4 mr-1" />
            Lead
          </Button>
        )}
      </div>

      {/* Stats — hide on mobile when viewing chat/lead */}
      {(!isMobile || mobilePanel === 'list') && (
        <div className="flex-shrink-0">
          <WhatsAppStatsBar />
        </div>
      )}

      {/* Main Layout */}
      {isMobile ? (
        /* Mobile: Panel switching */
        <div className="flex-1 min-h-0">
          {mobilePanel === 'list' && (
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="p-3 border-b flex-shrink-0">
                <WhatsAppFilters
                  statusFilter={statusFilter}
                  leadFilter={leadFilter}
                  search={search}
                  onStatusChange={setStatusFilter}
                  onLeadChange={setLeadFilter}
                  onSearchChange={setSearch}
                />
              </div>
              <div className="flex-1 min-h-0 p-2">
                <WhatsAppConversationList
                  conversations={conversations}
                  selectedId={selectedConversation?.id || null}
                  onSelect={handleSelect}
                />
              </div>
            </Card>
          )}

          {mobilePanel === 'chat' && (
            <Card className="h-full overflow-hidden">
              {selectedConversation ? (
                <WhatsAppChatPanel
                  conversation={selectedConversation}
                  onConversationUpdate={handleConversationUpdate}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquareMore className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Select a conversation to view messages</p>
                </div>
              )}
            </Card>
          )}

          {mobilePanel === 'lead' && (
            <Card className="h-full overflow-hidden">
              {selectedConversation ? (
                <WhatsAppLeadPanel
                  conversation={selectedConversation}
                  onUpdate={handleConversationUpdate}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <p className="text-sm text-center">
                    Select a conversation to view lead details
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      ) : (
        /* Desktop: 3-column grid */
        <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
          {/* Left: Conversation List */}
          <div className="col-span-3 min-h-0">
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="p-3 border-b flex-shrink-0">
                <WhatsAppFilters
                  statusFilter={statusFilter}
                  leadFilter={leadFilter}
                  search={search}
                  onStatusChange={setStatusFilter}
                  onLeadChange={setLeadFilter}
                  onSearchChange={setSearch}
                />
              </div>
              <div className="flex-1 min-h-0 p-2">
                <WhatsAppConversationList
                  conversations={conversations}
                  selectedId={selectedConversation?.id || null}
                  onSelect={handleSelect}
                />
              </div>
            </Card>
          </div>

          {/* Center: Chat Panel */}
          <div className="col-span-6 min-h-0">
            <Card className="h-full overflow-hidden">
              {selectedConversation ? (
                <WhatsAppChatPanel
                  conversation={selectedConversation}
                  onConversationUpdate={handleConversationUpdate}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquareMore className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Select a conversation to view messages</p>
                </div>
              )}
            </Card>
          </div>

          {/* Right: Lead Panel */}
          <div className="col-span-3 min-h-0">
            <Card className="h-full overflow-hidden">
              {selectedConversation ? (
                <WhatsAppLeadPanel
                  conversation={selectedConversation}
                  onUpdate={handleConversationUpdate}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <p className="text-sm text-center">
                    Select a conversation to view lead details
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
