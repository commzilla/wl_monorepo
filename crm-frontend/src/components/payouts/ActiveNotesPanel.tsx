import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StickyNote, Plus, ChevronDown, ChevronUp, AlertTriangle, Calendar, User } from 'lucide-react';
import { useInternalNotes } from '@/hooks/useInternalNotes';
import { NOTE_CATEGORY_OPTIONS, NoteCategory } from '@/lib/types/internalNotes';
import { format } from 'date-fns';

interface ActiveNotesPanelProps {
  traderId: string;
  onOpenAllNotes: () => void;
}

const ActiveNotesPanel: React.FC<ActiveNotesPanelProps> = ({ traderId, onOpenAllNotes }) => {
  const { summary, isSummaryLoading, createNote, isCreating } = useInternalNotes(traderId);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [category, setCategory] = useState<NoteCategory>('general');
  const [isHighRisk, setIsHighRisk] = useState(false);
  const [isPrivate] = useState(false);

  const handleSubmit = () => {
    if (!newNote.trim()) return;
    createNote(
      { note: newNote.trim(), category, is_high_risk: isHighRisk, is_private: isPrivate },
      {
        onSuccess: () => {
          setNewNote('');
          setCategory('general');
          setIsHighRisk(false);
          setIsAddFormOpen(false);
        },
      }
    );
  };

  if (isSummaryLoading) {
    return (
      <div className="h-12 rounded-lg bg-muted/50 animate-pulse" />
    );
  }

  const totalCount = summary?.total_count || 0;
  const hasHighRisk = summary?.has_high_risk || false;

  // Empty state — compact bar
  if (totalCount === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Notes: 0</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs gap-1"
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
          >
            <Plus className="h-3 w-3" />
            {isAddFormOpen ? 'Cancel' : 'Add Note'}
          </Button>
        </div>
        {isAddFormOpen && renderAddForm()}
      </div>
    );
  }

  // Active notes — highlighted card
  const borderClass = hasHighRisk
    ? 'border-destructive/50 bg-destructive/5'
    : 'border-amber-300 bg-amber-50/50';

  const categoryBadges = summary?.category_counts
    ? Object.entries(summary.category_counts).map(([cat, count]) => {
        const opt = NOTE_CATEGORY_OPTIONS.find(o => o.value === cat);
        if (!opt || !count) return null;
        return (
          <Badge key={cat} variant="outline" className={`text-xs ${opt.color}`}>
            {opt.label}: {count}
          </Badge>
        );
      })
    : null;

  function renderAddForm() {
    return (
      <div className="space-y-3 pt-3 mt-3 border-t">
        <Textarea
          placeholder="Enter your note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="min-h-[80px]"
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Category:</Label>
            <Select value={category} onValueChange={(v: NoteCategory) => setCategory(v)}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_CATEGORY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="high-risk-panel" checked={isHighRisk} onCheckedChange={setIsHighRisk} />
            <Label htmlFor="high-risk-panel" className="text-xs flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              High Risk
            </Label>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsAddFormOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={isCreating || !newNote.trim()}>
              {isCreating ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`border ${borderClass} transition-all`}>
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-center gap-3 flex-wrap">
          <StickyNote className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-semibold text-sm">
            Active Notes ({totalCount})
          </span>
          {hasHighRisk && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              HIGH RISK
            </Badge>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            {categoryBadges}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            >
              <Plus className="h-3 w-3" />
              Add Note
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={onOpenAllNotes}
            >
              View All
            </Button>
          </div>
        </div>

        {/* Latest note previews */}
        {summary?.latest_notes && summary.latest_notes.length > 0 && (
          <div className="mt-3 space-y-2">
            {summary.latest_notes.slice(0, 3).map(note => {
              const catOpt = NOTE_CATEGORY_OPTIONS.find(o => o.value === note.category);
              return (
                <div
                  key={note.id}
                  className={`flex items-start gap-3 p-2.5 rounded-md border text-sm ${
                    note.is_high_risk ? 'border-destructive/30 bg-destructive/5' : 'bg-background/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{note.created_by_name}</span>
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), 'MMM dd, HH:mm')}
                      </span>
                      {catOpt && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${catOpt.color}`}>
                          {catOpt.label}
                        </Badge>
                      )}
                      {note.is_high_risk && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          High Risk
                        </Badge>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">{note.note}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inline add form */}
        {isAddFormOpen && renderAddForm()}
      </CardContent>
    </Card>
  );
};

export default ActiveNotesPanel;