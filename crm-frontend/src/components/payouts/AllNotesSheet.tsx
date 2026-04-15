import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2, Lock, Calendar, User, AlertTriangle, X } from 'lucide-react';
import { useInternalNotes } from '@/hooks/useInternalNotes';
import { NOTE_CATEGORY_OPTIONS, NoteCategory, InternalNote } from '@/lib/types/internalNotes';
import { format } from 'date-fns';

interface AllNotesSheetProps {
  traderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AllNotesSheet: React.FC<AllNotesSheetProps> = ({ traderId, open, onOpenChange }) => {
  const {
    notes, isNotesLoading, loadFullNotes, fullNotesLoaded,
    createNote, isCreating, updateNote, deleteNote,
  } = useInternalNotes(traderId);

  const [categoryFilter, setCategoryFilter] = useState<NoteCategory | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newCategory, setNewCategory] = useState<NoteCategory>('general');
  const [newHighRisk, setNewHighRisk] = useState(false);
  const [newPrivate] = useState(false);

  useEffect(() => {
    if (open && !fullNotesLoaded) {
      loadFullNotes();
    }
  }, [open, fullNotesLoaded, loadFullNotes]);

  const filteredNotes = categoryFilter === 'all'
    ? notes
    : notes.filter(n => n.category === categoryFilter);

  const handleCreate = () => {
    if (!newNote.trim()) return;
    createNote(
      { note: newNote.trim(), category: newCategory, is_high_risk: newHighRisk, is_private: newPrivate },
      {
        onSuccess: () => {
          setNewNote('');
          setNewCategory('general');
          setNewHighRisk(false);
          setIsAddOpen(false);
        },
      }
    );
  };

  const handleUpdate = (noteId: string) => {
    if (!editText.trim()) return;
    updateNote(
      { noteId, data: { note: editText.trim() } },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const startEdit = (note: InternalNote) => {
    setEditingId(note.id);
    setEditText(note.note);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>All Internal Notes</SheetTitle>
        </SheetHeader>

        {/* Category filter bar */}
        <div className="px-6 py-3 border-b flex flex-wrap gap-1.5">
          <Badge
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            onClick={() => setCategoryFilter('all')}
          >
            All
          </Badge>
          {NOTE_CATEGORY_OPTIONS.map(opt => (
            <Badge
              key={opt.value}
              variant={categoryFilter === opt.value ? 'default' : 'outline'}
              className={`cursor-pointer text-xs ${categoryFilter !== opt.value ? opt.color : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === opt.value ? 'all' : opt.value)}
            >
              {opt.label}
            </Badge>
          ))}
        </div>

        {/* Notes list */}
        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-3">
            {isNotesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse space-y-2 p-3 border rounded-lg">
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No notes found</p>
              </div>
            ) : (
              filteredNotes.map(note => {
                const catOpt = NOTE_CATEGORY_OPTIONS.find(o => o.value === note.category);
                const isEditing = editingId === note.id;

                return (
                  <div
                    key={note.id}
                    className={`border rounded-lg p-3 space-y-2 ${
                      note.is_high_risk ? 'border-destructive/30 bg-destructive/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">{note.created_by_name}</span>
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => startEdit(note)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Note</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. Are you sure?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteNote(note.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {catOpt && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${catOpt.color}`}>
                          {catOpt.label}
                        </Badge>
                      )}
                      {note.is_high_risk && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          High Risk
                        </Badge>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[60px] text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdate(note.id)}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.note}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Add note form at bottom */}
        <div className="border-t px-6 py-4">
          {!isAddOpen ? (
            <Button variant="outline" className="w-full gap-2" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Note
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">New Note</Label>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsAddOpen(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Textarea
                placeholder="Enter your note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Select value={newCategory} onValueChange={(v: NoteCategory) => setNewCategory(v)}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
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
                <div className="flex items-center gap-1.5">
                  <Switch id="hr-sheet" checked={newHighRisk} onCheckedChange={setNewHighRisk} />
                  <Label htmlFor="hr-sheet" className="text-xs">High Risk</Label>
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isCreating || !newNote.trim()}>
                {isCreating ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AllNotesSheet;