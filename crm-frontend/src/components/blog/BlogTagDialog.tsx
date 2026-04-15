import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blogService, BlogTag } from '@/services/blogService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Loader2, AlertCircle } from 'lucide-react';

const BlogTagManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState('');

  const { data: tagsRes, isLoading, isError, error } = useQuery({
    queryKey: ['blog-tags'],
    queryFn: async () => {
      const res = await blogService.getTags();
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await blogService.createTag({ name });
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-tags'] });
      setNewTag('');
      toast({ title: 'Tag created' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create tag', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await blogService.deleteTag(id);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-tags'] });
      toast({ title: 'Tag deleted' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to delete tag', description: err.message, variant: 'destructive' });
    },
  });

  const handleCreate = () => {
    if (newTag.trim()) {
      createMutation.mutate(newTag.trim());
    }
  };

  const tags = tagsRes || [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newTag}
          onChange={e => setNewTag(e.target.value)}
          placeholder="New tag name"
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <Button size="sm" onClick={handleCreate} disabled={!newTag.trim() || createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          Add
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading tags...</span>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">Failed to load tags{error instanceof Error ? `: ${error.message}` : ''}</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag: BlogTag) => (
            <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
              {tag.name}
              <button
                onClick={() => { if (confirm(`Delete tag "${tag.name}"?`)) deleteMutation.mutate(tag.id); }}
                className="ml-1 hover:text-destructive"
                disabled={deleteMutation.isPending}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground">No tags yet. Create one above.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BlogTagManager;
