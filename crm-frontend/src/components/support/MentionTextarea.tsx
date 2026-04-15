import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SupportService, Agent } from '@/services/supportService';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (mentionedIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value,
  onChange,
  onMentionsChange,
  placeholder,
  disabled,
  className = '',
  onKeyDown,
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch agents once on mount
  useEffect(() => {
    SupportService.getAgents().then(setAgents).catch(() => {});
  }, []);

  // Re-scan text for mentioned agent IDs whenever value changes
  useEffect(() => {
    const mentionedIds: string[] = [];
    agents.forEach((agent) => {
      const fullName = `${agent.first_name} ${agent.last_name}`.trim();
      if (fullName && value.includes(`@${fullName}`)) {
        mentionedIds.push(agent.id);
      }
    });
    onMentionsChange(mentionedIds);
  }, [value, agents]);

  const filteredAgents = agents.filter((agent) => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    const name = `${agent.first_name} ${agent.last_name}`.toLowerCase();
    return name.includes(q) || agent.email.toLowerCase().includes(q);
  });

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    // Find the last @ before cursor
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt >= 0) {
      // Check if @ is at start or preceded by whitespace/newline
      const charBefore = lastAt > 0 ? newValue[lastAt - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || lastAt === 0) {
        const query = textBeforeCursor.slice(lastAt + 1);
        // Only show dropdown if no space-space pattern (allow "First Last" but not after completing)
        if (!query.includes('  ') && query.length < 50) {
          setMentionStart(lastAt);
          setMentionQuery(query);
          setShowDropdown(true);
          setDropdownIndex(0);
          return;
        }
      }
    }
    setShowDropdown(false);
  };

  const insertMention = useCallback((agent: Agent) => {
    if (mentionStart === null) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const fullName = `${agent.first_name} ${agent.last_name}`.trim();
    const before = value.slice(0, mentionStart);
    const after = value.slice(textarea.selectionStart);
    const newValue = `${before}@${fullName} ${after}`;

    onChange(newValue);
    setShowDropdown(false);
    setMentionStart(null);
    setMentionQuery('');

    // Restore cursor position after the inserted mention
    requestAnimationFrame(() => {
      const pos = mentionStart + fullName.length + 2; // @ + name + space
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    });
  }, [mentionStart, value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && filteredAgents.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDropdownIndex((prev) => Math.min(prev + 1, filteredAgents.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setDropdownIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredAgents[dropdownIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Scroll active dropdown item into view
  useEffect(() => {
    if (showDropdown && dropdownRef.current) {
      const active = dropdownRef.current.children[dropdownIndex] as HTMLElement;
      active?.scrollIntoView({ block: 'nearest' });
    }
  }, [dropdownIndex, showDropdown]);

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] resize-y ${className}`}
      />
      {showDropdown && filteredAgents.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto bg-popover border border-border rounded-md shadow-lg z-50"
        >
          {filteredAgents.map((agent, idx) => {
            const fullName = `${agent.first_name} ${agent.last_name}`.trim();
            return (
              <div
                key={agent.id}
                className={`px-3 py-2 cursor-pointer flex items-center gap-2 text-sm ${
                  idx === dropdownIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur
                  insertMention(agent);
                }}
                onMouseEnter={() => setDropdownIndex(idx)}
              >
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                  {agent.first_name?.[0]}{agent.last_name?.[0]}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{fullName || agent.email}</div>
                  <div className="text-xs text-muted-foreground truncate">{agent.role}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MentionTextarea;
