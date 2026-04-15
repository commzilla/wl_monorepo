
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChatWidgetConfig } from '@/lib/types/chat';
import { MessageSquare } from 'lucide-react';

interface GeneralSettingsCardProps {
  config: ChatWidgetConfig;
  onConfigUpdate: (updates: Partial<ChatWidgetConfig>) => void;
}

const GeneralSettingsCard: React.FC<GeneralSettingsCardProps> = ({ config, onConfigUpdate }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          General Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">Widget Name</Label>
          <Input
            id="name"
            value={config.name}
            onChange={(e) => onConfigUpdate({ name: e.target.value })}
            placeholder="Chat Widget"
          />
        </div>

        <div>
          <Label htmlFor="widget_identifier">Widget Identifier</Label>
          <Input
            id="widget_identifier"
            value={config.widget_identifier || ''}
            onChange={(e) => onConfigUpdate({ widget_identifier: e.target.value })}
            placeholder="e.g., 20b37722-5ba0-4f91-a8fc-06297b6c76e1"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Unique identifier for this widget configuration. Use this in your embed code.
          </p>
        </div>

        <div>
          <Label htmlFor="logo">Logo URL</Label>
          <Input
            id="logo"
            value={config.logo_url || ''}
            onChange={(e) => onConfigUpdate({ logo_url: e.target.value || null })}
            placeholder="https://example.com/logo.png"
          />
        </div>

        <div>
          <Label htmlFor="position">Position</Label>
          <Select value={config.position} onValueChange={(value) => onConfigUpdate({ position: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom-right">Bottom Right</SelectItem>
              <SelectItem value="bottom-left">Bottom Left</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={config.is_enabled}
            onCheckedChange={(checked) => onConfigUpdate({ is_enabled: checked })}
          />
          <Label htmlFor="enabled">Enable Widget</Label>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeneralSettingsCard;
