import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Languages, ChevronDown, ChevronUp } from 'lucide-react';
import { ChatMessageRenderer } from './ChatMessageRenderer';

interface TranslatedMessageProps {
  originalContent: string;
  translatedContent: string;
  detectedLanguage?: string;
  showOriginalFirst?: boolean;
  className?: string;
}

export const TranslatedMessage: React.FC<TranslatedMessageProps> = ({
  originalContent,
  translatedContent,
  detectedLanguage,
  showOriginalFirst = false,
  className = '',
}) => {
  const [showOriginal, setShowOriginal] = useState(false);

  // If no translation needed, just show the content
  if (!translatedContent || originalContent === translatedContent) {
    return <ChatMessageRenderer content={originalContent} className={className} />;
  }

  const primaryContent = showOriginalFirst ? originalContent : translatedContent;
  const secondaryContent = showOriginalFirst ? translatedContent : originalContent;
  const secondaryLabel = showOriginalFirst ? 'Translated' : 'Original';

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-1.5">
        {detectedLanguage && (
          <Badge variant="outline" className="text-xs flex items-center gap-1 h-5">
            <Languages className="h-3 w-3" />
            {detectedLanguage}
          </Badge>
        )}
      </div>

      <ChatMessageRenderer content={primaryContent} />

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 h-6 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setShowOriginal(!showOriginal)}
      >
        {showOriginal ? (
          <>
            <ChevronUp className="h-3 w-3 mr-1" />
            Hide {secondaryLabel}
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3 mr-1" />
            Show {secondaryLabel}
          </>
        )}
      </Button>

      {showOriginal && (
        <div className="mt-2 p-2 rounded bg-muted/50 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">{secondaryLabel}:</p>
          <ChatMessageRenderer content={secondaryContent} className="text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default TranslatedMessage;
