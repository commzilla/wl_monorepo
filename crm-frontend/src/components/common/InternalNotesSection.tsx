import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileText, Plus, Edit2, Trash2, Calendar, User, AlertTriangle } from 'lucide-react';
import { useInternalNotes } from '@/hooks/useInternalNotes';
import { InternalNote, NoteCategory, NOTE_CATEGORY_OPTIONS } from '@/lib/types/internalNotes';
import { format } from 'date-fns';

interface InternalNotesSectionProps {
  traderId: string;
  title?: string;
}

const InternalNotesSection: React.FC<InternalNotesSectionProps> = ({
  traderId,
  title = "Internal Notes"
}) => {
  const {
    notes, isNotesLoading, loadFullNotes, fullNotesLoaded,
    createNote, isCreating, updateNote, deleteNote,
  } = useInternalNotes(traderId);
  const [editingNote, setEditingNote] = useState<InternalNote | null>(null);
  const [newNote, setNewNote] = useState('');
  const [isPrivate] = useState(false);
  const [category, setCategory] = useState<NoteCategory>('general');
  const [isHighRisk, setIsHighRisk] = useState(false);

  // Load full notes on mount
  if (!fullNotesLoaded) {
    loadFullNotes();
  }

  const handleCreateNote = () => {
    if (!newNote.trim()) return;
    createNote(
      { note: newNote.trim(), is_private: isPrivate, category, is_high_risk: isHighRisk },
      {
        onSuccess: () => {
          setNewNote('');
          setCategory('general');
          setIsHighRisk(false);
        },
      }
    );
  };

  const handleUpdateNote = (noteId: string, updatedNote: string) => {
    if (!updatedNote.trim()) return;
    updateNote(
      { noteId, data: { note: updatedNote.trim() } },
      { onSuccess: () => setEditingNote(null) }
    );
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
  };

  if (isNotesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {title}
          <Badge variant="secondary" className="ml-auto">
            {notes.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Note */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Add Internal Note</h4>
          </div>

          <Textarea
            placeholder="Enter your internal note here..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[100px]"
          />

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Category:</Label>
              <Select value={category} onValueChange={(v: NoteCategory) => setCategory(v)}>
                <SelectTrigger className="h-8 w-[150px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="high-risk-common" checked={isHighRisk} onCheckedChange={setIsHighRisk} />
              <Label htmlFor="high-risk-common" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                High Risk
              </Label>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button
              onClick={handleCreateNote}
              disabled={isCreating || !newNote.trim()}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {isCreating ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No internal notes yet</p>
              <p className="text-sm">Add the first note above</p>
            </div>
          ) : (
            notes.map((note) => {
              const catOpt = NOTE_CATEGORY_OPTIONS.find(o => o.value === note.category);
              return (
                <div key={note.id} className={`border rounded-lg p-4 space-y-3 ${note.is_high_risk ? 'border-destructive/30 bg-destructive/5' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{note.created_by_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(note.created_at), 'MMM dd, yyyy HH:mm')}
                          {catOpt && (
                            <Badge variant="outline" className={`text-xs ${catOpt.color}`}>
                              {catOpt.label}
                            </Badge>
                          )}
                          {note.is_high_risk && (
                            <Badge variant="destructive" className="text-xs gap-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              High Risk
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingNote(note)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Internal Note</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this internal note? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteNote(note.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {editingNote?.id === note.id ? (
                    <EditNoteForm
                      note={note}
                      onSave={(updatedNote) => handleUpdateNote(note.id, updatedNote)}
                      onCancel={() => setEditingNote(null)}
                    />
                  ) : (
                    <div className="bg-background/50 rounded p-3 border-l-4 border-l-primary/30">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.note}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface EditNoteFormProps {
  note: InternalNote;
  onSave: (updatedNote: string) => void;
  onCancel: () => void;
}

const EditNoteForm: React.FC<EditNoteFormProps> = ({ note, onSave, onCancel }) => {
  const [editedNote, setEditedNote] = useState(note.note);

  const handleSave = () => {
    if (!editedNote.trim()) return;
    onSave(editedNote);
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={editedNote}
        onChange={(e) => setEditedNote(e.target.value)}
        className="min-h-[80px]"
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
};

export default InternalNotesSection;
