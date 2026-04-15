import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blogService, BlogCategory } from '@/services/blogService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';

const BlogCategoryManager: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<BlogCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { data: categoriesRes, isLoading, isError, error } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const res = await blogService.getCategories();
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<BlogCategory>) => {
      const res = await blogService.createCategory(data);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
      toast({ title: 'Category created' });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create category', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BlogCategory> }) => {
      const res = await blogService.updateCategory(id, data);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
      toast({ title: 'Category updated' });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to update category', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await blogService.deleteCategory(id);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
      toast({ title: 'Category deleted' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to delete category', description: err.message, variant: 'destructive' });
    },
  });

  const resetForm = () => { setEditing(null); setName(''); setDescription(''); setIsActive(true); };

  const handleEdit = (cat: BlogCategory) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description);
    setIsActive(cat.is_active);
  };

  const handleSubmit = () => {
    const data = { name, description, is_active: isActive };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const categories = categoriesRes || [];

  return (
    <div className="space-y-6">
      <div className="rounded-md border p-4 space-y-3">
        <h4 className="text-sm font-semibold">{editing ? 'Edit Category' : 'New Category'}</h4>
        <div>
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Category name" />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" rows={2} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label className="text-xs">Active</Label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSubmit} disabled={!name || createMutation.isPending || updateMutation.isPending}>
            {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {editing ? 'Update' : 'Create'}
          </Button>
          {editing && <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading categories...</span>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">Failed to load categories{error instanceof Error ? `: ${error.message}` : ''}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Posts</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">No categories yet</TableCell>
              </TableRow>
            ) : categories.map((cat: BlogCategory) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell>{cat.post_count}</TableCell>
                <TableCell>{cat.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" disabled={deleteMutation.isPending} onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(cat.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default BlogCategoryManager;
