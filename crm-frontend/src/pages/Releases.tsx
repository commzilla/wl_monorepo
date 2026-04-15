import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Rocket, GitCommit, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Star, Calendar, Loader2 } from 'lucide-react';
import { releaseService, Release, CreateReleaseRequest, GitCommit as GitCommitType } from '@/services/releaseService';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

const REPOS = ['api', 'crm', 'app', 'website'] as const;

const repoBadgeColors: Record<string, string> = {
  'api': 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  'crm': 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  'app': 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
  'website': 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
};

const Releases: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Releases tab state
  const [releaseSearch, setReleaseSearch] = useState('');
  const [releasePage, setReleasePage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formVersion, setFormVersion] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formRepos, setFormRepos] = useState<string[]>([]);
  const [formIsMajor, setFormIsMajor] = useState(false);

  // Git log tab state
  const [gitRepoFilter, setGitRepoFilter] = useState('all');
  const [gitPage, setGitPage] = useState(1);

  // Queries
  const { data: releasesData, isLoading: releasesLoading } = useQuery({
    queryKey: ['releases', releaseSearch, releasePage],
    queryFn: async () => {
      const res = await releaseService.getReleases({
        search: releaseSearch || undefined,
        page: releasePage,
        page_size: 20,
      });
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const { data: gitLogData, isLoading: gitLogLoading } = useQuery({
    queryKey: ['git-log', gitRepoFilter, gitPage],
    queryFn: async () => {
      const res = await releaseService.getGitLog({
        repo: gitRepoFilter !== 'all' ? gitRepoFilter : undefined,
        page: gitPage,
        page_size: 50,
      });
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateReleaseRequest) => releaseService.createRelease(data),
    onSuccess: (res) => {
      if (res.error) { toast({ title: 'Error', description: res.error, variant: 'destructive' }); return; }
      toast({ title: 'Release created' });
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateReleaseRequest> }) => releaseService.updateRelease(id, data),
    onSuccess: (res) => {
      if (res.error) { toast({ title: 'Error', description: res.error, variant: 'destructive' }); return; }
      toast({ title: 'Release updated' });
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => releaseService.deleteRelease(id),
    onSuccess: (res) => {
      if (res.error) { toast({ title: 'Error', description: res.error, variant: 'destructive' }); return; }
      toast({ title: 'Release deleted' });
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRelease(null);
    setFormTitle('');
    setFormDescription('');
    setFormVersion('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormRepos([]);
    setFormIsMajor(false);
  };

  const openCreateDialog = () => {
    closeDialog();
    setDialogOpen(true);
  };

  const openEditDialog = (release: Release) => {
    setEditingRelease(release);
    setFormTitle(release.title);
    setFormDescription(release.description || '');
    setFormVersion(release.version);
    setFormDate(release.release_date);
    setFormRepos(release.repos_affected);
    setFormIsMajor(release.is_major);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data: CreateReleaseRequest = {
      title: formTitle,
      description: formDescription,
      version: formVersion || undefined,
      release_date: formDate,
      repos_affected: formRepos,
      is_major: formIsMajor,
    };
    if (editingRelease) {
      updateMutation.mutate({ id: editingRelease.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleRepo = (repo: string) => {
    setFormRepos(prev => prev.includes(repo) ? prev.filter(r => r !== repo) : [...prev, repo]);
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const releasesTotalPages = releasesData ? Math.ceil(releasesData.count / 20) : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Releases"
        description="Track shipped features and view commit history across all repositories"
        icon={Rocket}
      />

      <Tabs defaultValue="releases" className="w-full">
        <TabsList className="w-full grid grid-cols-2 sm:w-auto sm:inline-flex">
          <TabsTrigger value="releases" className="gap-2">
            <Rocket size={16} />
            Releases
          </TabsTrigger>
          <TabsTrigger value="commits" className="gap-2">
            <GitCommit size={16} />
            Commit Log
          </TabsTrigger>
        </TabsList>

        {/* --- Releases Tab --- */}
        <TabsContent value="releases" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search releases..."
                value={releaseSearch}
                onChange={(e) => { setReleaseSearch(e.target.value); setReleasePage(1); }}
                className="pl-9"
              />
            </div>
            <Button onClick={openCreateDialog} className="gap-2 w-full sm:w-auto">
              <Plus size={16} />
              New Release
            </Button>
          </div>

          {releasesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !releasesData?.results?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Rocket size={40} className="mb-3 opacity-30" />
                <p className="text-lg font-medium">No releases yet</p>
                <p className="text-sm">Create your first release to start tracking what you ship.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {releasesData.results.map((release) => (
                <Card key={release.id} className={release.is_major ? 'border-primary/40 shadow-md' : ''}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {release.is_major && (
                            <Star size={16} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                          )}
                          <h3 className="font-semibold text-lg truncate">{release.title}</h3>
                          {release.version && (
                            <Badge variant="outline" className="font-mono text-xs">{release.version}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(release.release_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          {release.created_by_name && (
                            <span>by {release.created_by_name}</span>
                          )}
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {release.repos_affected.map(repo => (
                            <Badge key={repo} variant="outline" className={`text-xs ${repoBadgeColors[repo] || ''}`}>
                              {repo}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(release)}>
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setDeletingId(release.id); setDeleteDialogOpen(true); }}>
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              {releasesTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Page {releasePage} of {releasesTotalPages} ({releasesData.count} releases)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={releasePage <= 1} onClick={() => setReleasePage(p => p - 1)}>
                      <ChevronLeft size={16} /> <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <Button variant="outline" size="sm" disabled={releasePage >= releasesTotalPages} onClick={() => setReleasePage(p => p + 1)}>
                      <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* --- Commit Log Tab --- */}
        <TabsContent value="commits" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={gitRepoFilter} onValueChange={(v) => { setGitRepoFilter(v); setGitPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by repo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Repos</SelectItem>
                {REPOS.map(repo => (
                  <SelectItem key={repo} value={repo}>{repo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {gitLogLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !gitLogData?.results?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <GitCommit size={40} className="mb-3 opacity-30" />
                <p className="text-lg font-medium">No commits found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {gitLogData.results.map((commit, idx) => (
                <div key={`${commit.hash}-${idx}`} className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 flex-shrink-0">
                    {commit.short_hash}
                  </Badge>
                  <span className="flex-1 text-sm truncate">{commit.subject}</span>
                  <Badge variant="outline" className={`text-xs flex-shrink-0 ${repoBadgeColors[commit.repo] || ''}`}>
                    {commit.repo}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex-shrink-0 w-20 text-right">
                    {formatRelativeDate(commit.date)}
                  </span>
                </div>
              ))}

              {/* Pagination */}
              {(gitLogData.total_pages > 1) && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Page {gitLogData.page} of {gitLogData.total_pages} ({gitLogData.count} commits)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={gitPage <= 1} onClick={() => setGitPage(p => p - 1)}>
                      <ChevronLeft size={16} /> <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <Button variant="outline" size="sm" disabled={gitPage >= gitLogData.total_pages} onClick={() => setGitPage(p => p + 1)}>
                      <span className="hidden sm:inline">Next</span> <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRelease ? 'Edit Release' : 'New Release'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Payout Flow Redesign" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version (optional)</Label>
                <Input id="version" value={formVersion} onChange={(e) => setFormVersion(e.target.value)} placeholder="e.g. v2.1.0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Release Date</Label>
                <Input id="date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Markdown)</Label>
              <Textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What was shipped? Why does it matter?"
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Repos Affected</Label>
              <div className="flex gap-4">
                {REPOS.map(repo => (
                  <label key={repo} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={formRepos.includes(repo)} onCheckedChange={() => toggleRepo(repo)} />
                    <span className="text-sm">{repo}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formIsMajor} onCheckedChange={setFormIsMajor} id="is_major" />
              <Label htmlFor="is_major">Major Release</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!formTitle || !formDate || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingRelease ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Release</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this release? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeletingId(null); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Releases;
