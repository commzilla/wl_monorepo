
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChatService } from '@/lib/services/chatService';
import { ChatWidgetConfig } from '@/lib/types/chat';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
import GeneralSettingsCard from './GeneralSettingsCard';
import AppearanceSettingsCard from './AppearanceSettingsCard';
import MessagesSettingsCard from './MessagesSettingsCard';
import EmbedCodeCard from './EmbedCodeCard';
import PreviewCard from './PreviewCard';

const ChatAdmin: React.FC = () => {
  const [config, setConfig] = useState<ChatWidgetConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const widgetConfig = await ChatService.getWidgetConfig();
      setConfig(widgetConfig);
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Failed to load chat widget configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      const updatedConfig = await ChatService.updateWidgetConfig(config.id, {
        name: config.name,
        widget_identifier: config.widget_identifier,
        primary_color: config.primary_color,
        secondary_color: config.secondary_color,
        text_color: config.text_color,
        background_color: config.background_color,
        logo_url: config.logo_url,
        welcome_message: config.welcome_message,
        offline_message: config.offline_message,
        is_enabled: config.is_enabled,
        position: config.position
      });

      if (updatedConfig) {
        setConfig(updatedConfig);
        toast.success('Chat widget configuration saved successfully');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (updates: Partial<ChatWidgetConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  if (!config) {
    return <div className="flex items-center justify-center p-8">Failed to load configuration</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Live Chat Widget</h1>
          <p className="text-muted-foreground">Configure your website's chat widget appearance and behavior</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GeneralSettingsCard config={config} onConfigUpdate={updateConfig} />
        <AppearanceSettingsCard config={config} onConfigUpdate={updateConfig} />
        <MessagesSettingsCard config={config} onConfigUpdate={updateConfig} />
        <EmbedCodeCard config={config} />
      </div>

      <PreviewCard config={config} />

      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={isSaving} size="lg">
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
};

export default ChatAdmin;
