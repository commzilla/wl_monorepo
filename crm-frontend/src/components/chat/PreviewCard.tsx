
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChatWidgetConfig } from '@/lib/types/chat';
import { MessageSquare } from 'lucide-react';

interface PreviewCardProps {
  config: ChatWidgetConfig;
}

const PreviewCard: React.FC<PreviewCardProps> = ({ config }) => {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative bg-slate-800 rounded-lg p-8 min-h-[200px] border border-slate-600">
          <p className="text-sm text-slate-300 mb-4">Preview of how your chat widget will appear on your website:</p>
          <div 
            className={`absolute ${
              config.position === 'bottom-left' ? 'bottom-4 left-4' : 'bottom-4 right-4'
            }`}
          >
            <div
              className="rounded-full w-16 h-16 shadow-lg flex items-center justify-center cursor-pointer"
              style={{ backgroundColor: config.primary_color, color: config.text_color }}
            >
              <MessageSquare size={24} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PreviewCard;
