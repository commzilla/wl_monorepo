import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useTags, useCreateTag } from '@/hooks/useJournal';
import { TradeTag } from '@/utils/journalApi';
import TradeTagBadge from './TradeTagBadge';

interface TradeTagInputProps {
  selectedTags: string[];
  onChange: (tagIds: string[]) => void;
  enrollmentId: string;
}

const TradeTagInput: React.FC<TradeTagInputProps> = ({ selectedTags, onChange, enrollmentId: _enrollmentId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: tags = [] } = useTags();
  const createTagMutation = useCreateTag();

  // Group available tags by category
  const groupedTags = useMemo(() => {
    const groups: Record<string, TradeTag[]> = {};
    const filtered = tags.filter((tag) =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.forEach((tag) => {
      const category = tag.category_name || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(tag);
    });

    return groups;
  }, [tags, searchQuery]);

  const selectedTagObjects = useMemo(
    () => tags.filter((tag) => selectedTags.includes(tag.id)),
    [tags, selectedTags]
  );

  const hasExactMatch = useMemo(
    () =>
      tags.some(
        (tag) => tag.name.toLowerCase() === searchQuery.toLowerCase()
      ),
    [tags, searchQuery]
  );

  const handleToggleTag = useCallback(
    (tagId: string) => {
      if (selectedTags.includes(tagId)) {
        onChange(selectedTags.filter((id) => id !== tagId));
      } else {
        onChange([...selectedTags, tagId]);
      }
    },
    [selectedTags, onChange]
  );

  const handleRemoveTag = useCallback(
    (tagId: string) => {
      onChange(selectedTags.filter((id) => id !== tagId));
    },
    [selectedTags, onChange]
  );

  const handleCreateTag = useCallback(() => {
    if (!searchQuery.trim() || hasExactMatch) return;

    createTagMutation.mutate(
      {
        category: 'custom',
        name: searchQuery.trim(),
        color: '#3AB3FF',
      },
      {
        onSuccess: (newTag) => {
          onChange([...selectedTags, newTag.id]);
          setSearchQuery('');
        },
      }
    );
  }, [searchQuery, hasExactMatch, createTagMutation, onChange, selectedTags]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!hasExactMatch && searchQuery.trim()) {
          handleCreateTag();
        }
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    },
    [hasExactMatch, searchQuery, handleCreateTag]
  );

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative space-y-2">
      {/* Selected tags */}
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTagObjects.map((tag) => (
            <TradeTagBadge
              key={tag.id}
              name={tag.name}
              color={tag.color}
              onRemove={() => handleRemoveTag(tag.id)}
            />
          ))}
        </div>
      )}

      {/* Search input */}
      <div
        className={`flex items-center gap-2 rounded-lg border bg-transparent px-3 py-2 transition-colors ${
          isOpen
            ? 'border-[#28BFFF]/40'
            : 'border-[#28BFFF]/10 hover:border-[#28BFFF]/25'
        }`}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-[#85A8C3]/60" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search or create tags..."
          className="flex-1 bg-transparent text-sm text-[#E4EEF5] placeholder:text-[#85A8C3]/50 focus:outline-none"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#28BFFF]/15 bg-[#0A1114] shadow-lg shadow-black/40">
          {Object.keys(groupedTags).length === 0 && !searchQuery.trim() && (
            <div className="px-3 py-4 text-center text-xs text-[#85A8C3]/60">
              No tags available
            </div>
          )}

          {Object.entries(groupedTags).map(([category, categoryTags]) => (
            <div key={category}>
              <div className="sticky top-0 bg-[#0A1114] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#85A8C3]/60">
                {category}
              </div>
              {categoryTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag.id)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-[#28BFFF]/10 text-[#E4EEF5]'
                        : 'text-[#85A8C3] hover:bg-[#28BFFF]/5 hover:text-[#E4EEF5]'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 truncate">{tag.name}</span>
                    {isSelected && (
                      <span className="text-xs text-[#28BFFF]">Selected</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Create new tag option */}
          {searchQuery.trim() && !hasExactMatch && (
            <button
              type="button"
              onClick={handleCreateTag}
              disabled={createTagMutation.isPending}
              className="flex w-full items-center gap-2 border-t border-[#28BFFF]/10 px-3 py-2.5 text-left text-sm text-[#3AB3FF] transition-colors hover:bg-[#28BFFF]/5 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>
                Create &ldquo;{searchQuery.trim()}&rdquo;
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TradeTagInput;
