
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChatWidgetConfig } from '@/lib/types/chat';

interface MessagesSettingsCardProps {
  config: ChatWidgetConfig;
  onConfigUpdate: (updates: Partial<ChatWidgetConfig>) => void;
}

const MessagesSettingsCard: React.FC<MessagesSettingsCardProps> = ({ config, onConfigUpdate }) => {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="welcome_message">Welcome Message</Label>
          <Textarea
            id="welcome_message"
            value={config.welcome_message}
            onChange={(e) => onConfigUpdate({ welcome_message: e.target.value })}
            placeholder="Hello! How can we help you today?"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="offline_message">Offline Message</Label>
          <Textarea
            id="offline_message"
            value={config.offline_message}
            onChange={(e) => onConfigUpdate({ offline_message: e.target.value })}
            placeholder="We're currently offline. Please leave a message and we'll get back to you soon."
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default MessagesSettingsCard;
