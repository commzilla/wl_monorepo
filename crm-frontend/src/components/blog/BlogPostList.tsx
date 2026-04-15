import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blogService, BlogPostFilters } from '@/services/blogService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, MoreHorizontal, Eye, Edit2, Trash2, Globe, EyeOff, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface BlogPostListProps {
  onNewPost: () => void;
}

const BlogPostList: React.FC<BlogPostListProps> = ({ onNewPost }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = React.useState<BlogPostFilters>({ page: 1, page_size: 20, ordering: '-created_at' });
  const [searchInput, setSearchInput] = React.useState('');

  const { data: postsResponse, isLoading, isError, error } = useQuery({
    queryKey: ['blog-posts', filters],
    queryFn: async () => {
      const res = await blogService.getPosts(filters);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await blogService.deletePost(id);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast({ title: 'Post deleted' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to delete post', description: err.message, variant: 'destructive' });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await blogService.publishPost(id);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast({ title: 'Post published' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to publish post', description: err.message, variant: 'destructive' });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await blogService.unpublishPost(id);
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast({ title: 'Post unpublished' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to unpublish post', description: err.message, variant: 'destructive' });
    },
  });

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchInput, page: 1 }));
  };

  const statusBadge = (s: string) => {
    const variants: Record<string, 'secondary' | 'default' | 'outline'> = { draft: 'secondary', published: 'default', archived: 'outline' };
    return <Badge variant={variants[s] || 'secondary'}>{s}</Badge>;
  };

  const posts = postsResponse?.results || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Select value={filters.status || 'all'} onValueChange={v => setFilters(prev => ({ ...prev, status: v === 'all' ? undefined : v, page: 1 }))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onNewPost}>
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Failed to load posts{error instanceof Error ? `: ${error.message}` : ''}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No posts found</TableCell>
              </TableRow>
            ) : posts.map(post => (
              <TableRow key={post.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{post.title}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[300px]">{post.excerpt}</p>
                  </div>
                </TableCell>
                <TableCell>{post.category_name || '\u2014'}</TableCell>
                <TableCell>{statusBadge(post.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : format(new Date(post.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/blog/edit/${post.id}`)}>
                        <Edit2 className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      {post.status === 'draft' && (
                        <DropdownMenuItem onClick={() => publishMutation.mutate(post.id)}>
                          <Globe className="h-4 w-4 mr-2" /> Publish
                        </DropdownMenuItem>
                      )}
                      {post.status === 'published' && (
                        <DropdownMenuItem onClick={() => unpublishMutation.mutate(post.id)}>
                          <EyeOff className="h-4 w-4 mr-2" /> Unpublish
                        </DropdownMenuItem>
                      )}
                      {post.status === 'published' && (
                        <DropdownMenuItem onClick={() => window.open(`https://stg.we-fund.com/blog/${post.slug}`, '_blank')}>
                          <Eye className="h-4 w-4 mr-2" /> View Live
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Delete this post?')) deleteMutation.mutate(post.id); }}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {postsResponse && postsResponse.count > (filters.page_size || 20) && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{postsResponse.count} total posts</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!postsResponse.previous} onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={!postsResponse.next} onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogPostList;
