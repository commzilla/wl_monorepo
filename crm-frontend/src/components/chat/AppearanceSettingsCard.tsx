
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChatWidgetConfig } from '@/lib/types/chat';
import { Palette } from 'lucide-react';

interface AppearanceSettingsCardProps {
  config: ChatWidgetConfig;
  onConfigUpdate: (updates: Partial<ChatWidgetConfig>) => void;
}

const AppearanceSettingsCard: React.FC<AppearanceSettingsCardProps> = ({ config, onConfigUpdate }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="primary_color">Primary Color</Label>
          <div className="flex gap-2">
            <Input
              id="primary_color"
              type="color"
              value={config.primary_color}
              onChange={(e) => onConfigUpdate({ primary_color: e.target.value })}
              className="w-16 h-10"
            />
            <Input
              value={config.primary_color}
              onChange={(e) => onConfigUpdate({ primary_color: e.target.value })}
              placeholder="#8B5CF6"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="secondary_color">Secondary Color</Label>
          <div className="flex gap-2">
            <Input
              id="secondary_color"
              type="color"
              value={config.secondary_color}
              onChange={(e) => onConfigUpdate({ secondary_color: e.target.value })}
              className="w-16 h-10"
            />
            <Input
              value={config.secondary_color}
              onChange={(e) => onConfigUpdate({ secondary_color: e.target.value })}
              placeholder="#6E59A5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="text_color">Text Color</Label>
          <div className="flex gap-2">
            <Input
              id="text_color"
              type="color"
              value={config.text_color}
              onChange={(e) => onConfigUpdate({ text_color: e.target.value })}
              className="w-16 h-10"
            />
            <Input
              value={config.text_color}
              onChange={(e) => onConfigUpdate({ text_color: e.target.value })}
              placeholder="#FFFFFF"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="background_color">Background Color</Label>
          <div className="flex gap-2">
            <Input
              id="background_color"
              type="color"
              value={config.background_color}
              onChange={(e) => onConfigUpdate({ background_color: e.target.value })}
              className="w-16 h-10"
            />
            <Input
              value={config.background_color}
              onChange={(e) => onConfigUpdate({ background_color: e.target.value })}
              placeholder="#FFFFFF"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppearanceSettingsCard;
