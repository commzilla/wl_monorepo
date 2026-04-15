import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { internalNotesService } from '@/services/internalNotesService';
import { CreateInternalNoteRequest, UpdateInternalNoteRequest } from '@/lib/types/internalNotes';
import { toast } from 'sonner';

const CONTENT_TYPE = 'challengeenrollment';

export function usePayoutNotes(enrollmentId: string) {
  const queryClient = useQueryClient();
  const [fullNotesLoaded, setFullNotesLoaded] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ['internal-notes-summary', enrollmentId],
    queryFn: () => internalNotesService.getNoteSummary(CONTENT_TYPE, enrollmentId),
    enabled: !!enrollmentId,
    staleTime: 30_000,
  });

  const notesQuery = useQuery({
    queryKey: ['internal-notes', CONTENT_TYPE, enrollmentId],
    queryFn: () => internalNotesService.getInternalNotes(CONTENT_TYPE, enrollmentId),
    enabled: !!enrollmentId && fullNotesLoaded,
    staleTime: 30_000,
  });

  const loadFullNotes = useCallback(() => setFullNotesLoaded(true), []);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['internal-notes-summary', enrollmentId] });
    queryClient.invalidateQueries({ queryKey: ['internal-notes', CONTENT_TYPE, enrollmentId] });
  };

  const createMutation = useMutation({
    mutationFn: (data: Omit<CreateInternalNoteRequest, 'content_type' | 'object_id'>) =>
      internalNotesService.createInternalNote({
        content_type: CONTENT_TYPE,
        object_id: enrollmentId,
        ...data,
      }),
    onSuccess: () => {
      invalidate();
      toast.success('Note created successfully');
    },
    onError: () => {
      toast.error('Failed to create note');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ noteId, data }: { noteId: string; data: UpdateInternalNoteRequest }) =>
      internalNotesService.updateInternalNote(noteId, data),
    onSuccess: () => {
      invalidate();
      toast.success('Note updated successfully');
    },
    onError: () => {
      toast.error('Failed to update note');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => internalNotesService.deleteInternalNote(noteId),
    onSuccess: () => {
      invalidate();
      toast.success('Note deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete note');
    },
  });

  return {
    summary: summaryQuery.data,
    isSummaryLoading: summaryQuery.isLoading,
    notes: notesQuery.data || [],
    isNotesLoading: notesQuery.isLoading,
    loadFullNotes,
    fullNotesLoaded,
    createNote: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateNote: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteNote: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}