import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FAQService, FAQCollection, FAQArticle } from '@/services/faqService';
import {
  Plus,
  Edit,
  Trash2,
  FolderOpen,
  FileText,
  Eye,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Search
} from 'lucide-react';

const FAQManagement = () => {
  const { toast } = useToast();
  const [collections, setCollections] = useState<FAQCollection[]>([]);
  const [articles, setArticles] = useState<FAQArticle[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<FAQCollection | null>(null);
  const [editingArticle, setEditingArticle] = useState<FAQArticle | null>(null);

  // Form states
  const [collectionForm, setCollectionForm] = useState({ title: '', description: '', icon: '', is_active: true });
  const [articleForm, setArticleForm] = useState({
    title: '',
    content: '',
    search_keywords: '',
    collection_id: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [colls, arts] = await Promise.all([
        FAQService.getAllCollections(),
        FAQService.getAllArticles()
      ]);
      setCollections(colls);
      setArticles(arts);
    } catch (error) {
      toast({ title: 'Error loading FAQ data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCollection = async () => {
    try {
      if (editingCollection) {
        await FAQService.updateCollection(editingCollection.id, collectionForm);
        toast({ title: 'Collection updated' });
      } else {
        await FAQService.createCollection(collectionForm);
        toast({ title: 'Collection created' });
      }
      setCollectionDialogOpen(false);
      setEditingCollection(null);
      setCollectionForm({ title: '', description: '', icon: '', is_active: true });
      loadData();
    } catch (error) {
      toast({ title: 'Error saving collection', variant: 'destructive' });
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Are you sure? This will hide the collection and its articles.')) return;
    try {
      await FAQService.deleteCollection(id);
      toast({ title: 'Collection deleted' });
      loadData();
    } catch (error) {
      toast({ title: 'Error deleting collection', variant: 'destructive' });
    }
  };

  const handleSaveArticle = async () => {
    try {
      const data = {
        ...articleForm,
        search_keywords: articleForm.search_keywords.split(',').map(k => k.trim()).filter(Boolean)
      };

      if (editingArticle) {
        await FAQService.updateArticle(editingArticle.id, data);
        toast({ title: 'Article updated' });
      } else {
        await FAQService.createArticle(data);
        toast({ title: 'Article created' });
      }
      setArticleDialogOpen(false);
      setEditingArticle(null);
      setArticleForm({ title: '', content: '', search_keywords: '', collection_id: '', is_active: true });
      loadData();
    } catch (error) {
      toast({ title: 'Error saving article', variant: 'destructive' });
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Are you sure? This will hide the article.')) return;
    try {
      await FAQService.deleteArticle(id);
      toast({ title: 'Article deleted' });
      loadData();
    } catch (error) {
      toast({ title: 'Error deleting article', variant: 'destructive' });
    }
  };

  const openEditCollection = (collection: FAQCollection) => {
    setEditingCollection(collection);
    setCollectionForm({
      title: collection.title,
      description: collection.description || '',
      icon: collection.icon || '',
      is_active: collection.is_active
    });
    setCollectionDialogOpen(true);
  };

  const openEditArticle = (article: FAQArticle) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      content: article.content,
      search_keywords: article.search_keywords?.join(', ') || '',
      collection_id: article.collection_id,
      is_active: article.is_active
    });
    setArticleDialogOpen(true);
  };

  const openNewArticle = (collectionId?: string) => {
    setEditingArticle(null);
    setArticleForm({
      title: '',
      content: '',
      search_keywords: '',
      collection_id: collectionId || selectedCollection || '',
      is_active: true
    });
    setArticleDialogOpen(true);
  };

  const filteredArticles = articles.filter((a) => {
    if (selectedCollection && a.collection_id !== selectedCollection) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.search_keywords?.some(k => k.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            FAQ Management
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage help articles and FAQ collections for the support widget
          </p>
        </div>
      </div>

      <Tabs defaultValue="collections" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex min-w-max">
            <TabsTrigger value="collections">
              <FolderOpen className="h-4 w-4 mr-2" />
              Collections ({collections.length})
            </TabsTrigger>
            <TabsTrigger value="articles">
              <FileText className="h-4 w-4 mr-2" />
              Articles ({articles.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="collections" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => {
              setEditingCollection(null);
              setCollectionForm({ title: '', description: '', icon: '', is_active: true });
              setCollectionDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Collection
            </Button>
          </div>

          <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => {
              const articleCount = articles.filter(a => a.collection_id === collection.id).length;
              return (
                <Card key={collection.id} className={!collection.is_active ? 'opacity-50' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{collection.title}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditCollection(collection)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCollection(collection.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {collection.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant={collection.is_active ? 'default' : 'secondary'}>
                        {collection.is_active ? 'Active' : 'Hidden'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{articleCount} articles</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="articles" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles..."
                  className="pl-9"
                />
              </div>
              <Select value={selectedCollection || 'all'} onValueChange={(v) => setSelectedCollection(v === 'all' ? null : v)}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Filter by collection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collections</SelectItem>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => openNewArticle()} className="self-end sm:self-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          </div>

          <div className="space-y-3">
            {filteredArticles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchQuery ? `No articles matching "${searchQuery}"` : 'No articles found.'}
              </p>
            )}
            {filteredArticles.map((article) => (
              <Card key={article.id} className={!article.is_active ? 'opacity-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="font-medium">{article.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {article.faq_collections?.title || 'Unknown'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {article.content.substring(0, 200)}...
                      </p>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {article.views_count} views
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {article.helpful_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsDown className="h-3 w-3" /> {article.not_helpful_count}
                        </span>
                        {article.search_keywords?.length > 0 && (
                          <span className="hidden sm:inline">Keywords: {article.search_keywords.slice(0, 3).join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEditArticle(article)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteArticle(article.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Collection Dialog */}
      <Dialog open={collectionDialogOpen} onOpenChange={setCollectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCollection ? 'Edit Collection' : 'New Collection'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={collectionForm.title}
                onChange={(e) => setCollectionForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Trading Rules and Guidelines"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={collectionForm.description}
                onChange={(e) => setCollectionForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this collection..."
              />
            </div>
            <div>
              <Label>Icon (optional)</Label>
              <Input
                value={collectionForm.icon}
                onChange={(e) => setCollectionForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="e.g., book, help-circle"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={collectionForm.is_active}
                onCheckedChange={(checked) => setCollectionForm(f => ({ ...f, is_active: checked }))}
              />
              <Label>Active (visible to users)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCollection}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article Dialog */}
      <Dialog open={articleDialogOpen} onOpenChange={setArticleDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>{editingArticle ? 'Edit Article' : 'New Article'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Collection</Label>
              <Select
                value={articleForm.collection_id}
                onValueChange={(v) => setArticleForm(f => ({ ...f, collection_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select collection" />
                </SelectTrigger>
                <SelectContent>
                  {collections.filter(c => c.is_active).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={articleForm.title}
                onChange={(e) => setArticleForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g., What is the maximum daily loss limit?"
              />
            </div>
            <div>
              <Label>Content (Markdown supported)</Label>
              <Textarea
                value={articleForm.content}
                onChange={(e) => setArticleForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Write your article content here..."
                className="min-h-[200px]"
              />
            </div>
            <div>
              <Label>Search Keywords (comma-separated)</Label>
              <Input
                value={articleForm.search_keywords}
                onChange={(e) => setArticleForm(f => ({ ...f, search_keywords: e.target.value }))}
                placeholder="e.g., daily loss, limit, rules, trading"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={articleForm.is_active}
                onCheckedChange={(checked) => setArticleForm(f => ({ ...f, is_active: checked }))}
              />
              <Label>Active (visible to users)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArticleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveArticle}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default FAQManagement;
