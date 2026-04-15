import React from 'react';

interface ChatMessageRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses inline markdown: **bold**, *italic*, `code`, [links](url)
 */
function parseInline(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  // Match: **bold**, *italic*, `code`, [text](url), raw URLs, @mentions
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s<]+)|(@[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?))/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      result.push(<strong key={key++} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      result.push(<em key={key++} className="italic">{match[3]}</em>);
    } else if (match[4]) {
      // `inline code`
      result.push(
        <code key={key++} className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
          {match[4]}
        </code>
      );
    } else if (match[5] && match[6]) {
      // [text](url)
      result.push(
        <a key={key++} href={match[6]} target="_blank" rel="noopener noreferrer"
           className="text-primary underline hover:text-primary/80 transition-colors">
          {match[5]}
        </a>
      );
    } else if (match[7]) {
      // Raw URL
      result.push(
        <a key={key++} href={match[7]} target="_blank" rel="noopener noreferrer"
           className="text-primary underline hover:text-primary/80 transition-colors">
          {match[7]}
        </a>
      );
    } else if (match[8]) {
      // @mention
      result.push(
        <span key={key++} className="text-blue-600 font-semibold bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 px-1 rounded">
          {match[8]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
}

/**
 * Renders markdown content as styled React elements.
 * Supports: headings, bold, italic, inline code, code blocks,
 * bullet/numbered lists, blockquotes, links, horizontal rules.
 */
export const ChatMessageRenderer: React.FC<ChatMessageRendererProps> = ({ content, className = '' }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block ```
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={key++} className="my-2 rounded-md overflow-x-auto">
          <code className="block bg-gray-900 text-gray-100 p-3 text-xs font-mono">
            {codeLines.join('\n')}
          </code>
        </pre>
      );
      continue;
    }

    // Heading ###, ##, #
    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^(#{1,3})\s/)![1].length;
      const text = line.replace(/^#{1,3}\s+/, '');
      const headingClass = level === 1 ? 'text-base font-bold mt-3 mb-1' :
                           level === 2 ? 'text-sm font-bold mt-2.5 mb-1' :
                           'text-sm font-semibold mt-2 mb-1';
      elements.push(<div key={key++} className={headingClass}>{parseInline(text)}</div>);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      elements.push(<hr key={key++} className="my-3 border-border" />);
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote key={key++} className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic">
          {quoteLines.map((ql, qi) => (
            <p key={qi} className="mb-0.5 last:mb-0">{parseInline(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Unordered list: *, -, +
    if (/^\s*[\*\-\+]\s+/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\s*[\*\-\+]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*[\*\-\+]\s+/, '');
        listItems.push(<li key={listItems.length} className="leading-relaxed">{parseInline(itemText)}</li>);
        i++;
      }
      elements.push(
        <ul key={key++} className="list-disc pl-5 mb-1.5 space-y-0.5">{listItems}</ul>
      );
      continue;
    }

    // Ordered list: 1. 2. etc
    if (/^\s*\d+[\.\)]\s+/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\s*\d+[\.\)]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*\d+[\.\)]\s+/, '');
        listItems.push(<li key={listItems.length} className="leading-relaxed">{parseInline(itemText)}</li>);
        i++;
      }
      elements.push(
        <ol key={key++} className="list-decimal pl-5 mb-1.5 space-y-0.5">{listItems}</ol>
      );
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph - collect consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^\s*[\*\-\+]\s+/.test(lines[i]) &&
      !/^\s*\d+[\.\)]\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('> ') &&
      !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      elements.push(
        <p key={key++} className="mb-1.5 last:mb-0 leading-relaxed">
          {paraLines.map((pl, pi) => (
            <React.Fragment key={pi}>
              {pi > 0 && <br />}
              {parseInline(pl)}
            </React.Fragment>
          ))}
        </p>
      );
    }
  }

  return (
    <div className={`text-sm ${className}`}>
      {elements}
    </div>
  );
};

export default ChatMessageRenderer;
