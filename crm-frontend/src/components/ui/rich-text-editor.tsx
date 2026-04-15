import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bold, List, AlignLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
  required?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  rows = 12,
  className,
  id,
  required,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormatting = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);

    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleBold = () => {
    insertFormatting('**', '**');
  };

  const handleBullet = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lines = value.split('\n');
    let currentPos = 0;
    let lineIndex = 0;

    // Find which line we're on
    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= start) {
        lineIndex = i;
        break;
      }
      currentPos += lines[i].length + 1; // +1 for the newline
    }

    // Add bullet to current line
    if (!lines[lineIndex].startsWith('• ')) {
      lines[lineIndex] = '• ' + lines[lineIndex];
    }

    onChange(lines.join('\n'));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2);
    }, 0);
  };

  const handleParagraph = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newText = value.substring(0, start) + '\n\n' + value.substring(start);
    
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 2, start + 2);
    }, 0);
  };

  const formatPreview = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/^• (.+)$/gm, '<li class="ml-4">$1</li>')
      .replace(/\n\n/g, '</p><p class="mt-3">')
      .replace(/^(.+)$/gm, (match) => {
        if (match.startsWith('<li') || match.startsWith('<strong') || match.startsWith('</p>') || match.startsWith('<p')) {
          return match;
        }
        return `<p>${match}</p>`;
      })
      .replace(/<\/p><p class="mt-3"><li/g, '<ul class="list-disc ml-4 space-y-1 mt-2"><li')
      .replace(/<\/li><\/p>/g, '</li></ul>');
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Toolbar */}
      <div className="flex gap-1 p-1 border rounded-md bg-muted/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBold}
          className="h-8 px-2"
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBullet}
          className="h-8 px-2"
          title="Bullet Point"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleParagraph}
          className="h-8 px-2"
          title="New Paragraph"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground self-center px-2">
          **bold**, • bullets, double line break for paragraphs
        </span>
      </div>

      {/* Editor */}
      <Textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="font-mono text-sm resize-none"
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            handleBold();
          }
        }}
      />

      {/* Preview */}
      {value && (
        <div className="border rounded-md p-3 bg-muted/30">
          <div className="text-xs font-medium text-muted-foreground mb-2">Preview:</div>
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatPreview(value) }}
          />
        </div>
      )}
    </div>
  );
};