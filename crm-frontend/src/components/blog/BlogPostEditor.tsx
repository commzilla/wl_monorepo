import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { blogService, BlogPost, BlogCategory, BlogTag } from '@/services/blogService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import BlogAIPanel from './BlogAIPanel';
import BlogSEOPanel from './BlogSEOPanel';
import BlogImageUpload from './BlogImageUpload';
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Link as LinkIcon, ImageIcon,
  AlignLeft, AlignCenter, AlignRight, Undo, Redo,
  Save, Eye, Globe, ArrowLeft, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BlogPostEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [featuredImage, setFeaturedImage] = useState('');
  const [featuredImageAlt, setFeaturedImageAlt] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [authorDisplayName, setAuthorDisplayName] = useState('');
  const [postStatus, setPostStatus] = useState<string>('draft');

  // TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({ openOnClick: false }),
      ImageExt,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing your article...' }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
  });

  // Load existing post
  const { data: postRes, isLoading: postLoading } = useQuery({
    queryKey: ['blog-post', id],
    queryFn: async () => {
      const res = await blogService.getPost(id!);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    enabled: isEditing,
  });

  // Load categories and tags
  const { data: categoriesRes } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const res = await blogService.getCategories();
      return res.data || [];
    },
  });

  const { data: tagsRes } = useQuery({
    queryKey: ['blog-tags'],
    queryFn: async () => {
      const res = await blogService.getTags();
      return res.data || [];
    },
  });

  // Populate form when post loads
  useEffect(() => {
    if (postRes) {
      setTitle(postRes.title || '');
      setSlug(postRes.slug || '');
      setExcerpt(postRes.excerpt || '');
      setCategoryId(postRes.category || '');
      setSelectedTagIds(postRes.tags || []);
      setFeaturedImage(postRes.featured_image || '');
      setFeaturedImageAlt(postRes.featured_image_alt || '');
      setMetaTitle(postRes.meta_title || '');
      setMetaDescription(postRes.meta_description || '');
      setFocusKeyword(postRes.focus_keyword || '');
      setAuthorDisplayName(postRes.author_display_name || '');
      setPostStatus(postRes.status || 'draft');
      if (editor && postRes.content) {
        editor.commands.setContent(postRes.content);
      }
    }
  }, [postRes, editor]);

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEditing || !slug) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  // Save mutations
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        return blogService.updatePost(id!, data);
      }
      return blogService.createPost(data);
    },
    onSuccess: (res) => {
      if (res.error) {
        toast({ title: 'Save failed', description: res.error, variant: 'destructive' });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast({ title: isEditing ? 'Post updated' : 'Post created' });
      if (!isEditing && res.data?.id) {
        navigate(`/blog/edit/${res.data.id}`, { replace: true });
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: (postId: string) => blogService.publishPost(postId),
    onSuccess: (res) => {
      if (res.error) {
        toast({ title: 'Publish failed', description: res.error, variant: 'destructive' });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      queryClient.invalidateQueries({ queryKey: ['blog-post', id] });
      setPostStatus('published');
      toast({ title: 'Post published!' });
    },
  });

  const buildPayload = () => ({
    title,
    slug,
    excerpt,
    content: editor?.getHTML() || '',
    category: categoryId || null,
    tag_ids: selectedTagIds,
    featured_image: featuredImage,
    featured_image_alt: featuredImageAlt,
    meta_title: metaTitle,
    meta_description: metaDescription,
    focus_keyword: focusKeyword,
    author_display_name: authorDisplayName,
  });

  const handleSave = () => saveMutation.mutate(buildPayload());

  const handlePublish = async () => {
    // Save first, then publish
    const res = isEditing
      ? await blogService.updatePost(id!, buildPayload())
      : await blogService.createPost(buildPayload());
    if (res.error) {
      toast({ title: 'Save failed', description: res.error, variant: 'destructive' });
      return;
    }
    const postId = isEditing ? id! : res.data?.id;
    if (postId) publishMutation.mutate(postId);
  };

  // AI callbacks
  const handleInsertContent = useCallback((content: string) => {
    if (editor) {
      editor.commands.setContent(content);
    }
  }, [editor]);

  const handleApplyMeta = useCallback((meta: any) => {
    if (meta.title) setTitle(meta.title);
    if (meta.meta_title) setMetaTitle(meta.meta_title.slice(0, 60));
    if (meta.meta_description) setMetaDescription(meta.meta_description.slice(0, 155));
    if (meta.excerpt) setExcerpt(meta.excerpt.slice(0, 500));
  }, []);

  // Toolbar
  const ToolbarButton = ({ active, onClick, children, title: tip }: any) => (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', active && 'bg-muted')}
      onClick={onClick}
      title={tip}
      type="button"
    >
      {children}
    </Button>
  );

  const handleAddLink = () => {
    const url = window.prompt('Enter URL');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleAddImage = () => {
    const url = window.prompt('Enter image URL');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const categories = categoriesRes || [];
  const tags = tagsRes || [];

  if (postLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/blog')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{isEditing ? 'Edit Post' : 'New Post'}</h1>
            {postStatus !== 'draft' && <Badge variant="default" className="mt-1">{postStatus}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          {postStatus === 'published' && isEditing && (
            <Button variant="outline" onClick={() => window.open(`https://stg.we-fund.com/blog/${slug}`, '_blank')}>
              <Eye className="h-4 w-4 mr-2" /> Preview
            </Button>
          )}
          <Button onClick={handlePublish} disabled={publishMutation.isPending || !title}>
            {publishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
            Publish
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: Editor */}
        <div className="space-y-4">
          {/* Title */}
          <Input
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Post title"
            className="text-2xl font-bold h-14 border-0 border-b rounded-none px-0 focus-visible:ring-0"
          />

          {/* Toolbar */}
          {editor && (
            <div className="flex flex-wrap items-center gap-0.5 border rounded-md p-1 bg-muted/30">
              <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
                <Bold className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
                <Italic className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
                <UnderlineIcon className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
                <Strikethrough className="h-4 w-4" />
              </ToolbarButton>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
                <Heading2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
                <Heading3 className="h-4 w-4" />
              </ToolbarButton>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
                <List className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List">
                <ListOrdered className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
                <Quote className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
                <Code className="h-4 w-4" />
              </ToolbarButton>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <ToolbarButton onClick={handleAddLink} title="Add Link">
                <LinkIcon className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={handleAddImage} title="Add Image">
                <ImageIcon className="h-4 w-4" />
              </ToolbarButton>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <ToolbarButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left">
                <AlignLeft className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center">
                <AlignCenter className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right">
                <AlignRight className="h-4 w-4" />
              </ToolbarButton>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
                <Undo className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
                <Redo className="h-4 w-4" />
              </ToolbarButton>
            </div>
          )}

          {/* Editor Content */}
          <div className="border rounded-md min-h-[500px]">
            <EditorContent editor={editor} />
          </div>

          {/* Excerpt */}
          <div>
            <Label className="text-xs">Excerpt</Label>
            <Textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="Short summary for listings and social sharing..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">{excerpt.length}/500</p>
          </div>

          {/* SEO Panel */}
          <div className="border rounded-md p-4">
            <BlogSEOPanel
              metaTitle={metaTitle}
              metaDescription={metaDescription}
              focusKeyword={focusKeyword}
              slug={slug}
              onMetaTitleChange={setMetaTitle}
              onMetaDescriptionChange={setMetaDescription}
              onFocusKeywordChange={setFocusKeyword}
              onSlugChange={setSlug}
            />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* AI Panel */}
          <div className="border rounded-md p-4">
            <BlogAIPanel
              onInsertContent={handleInsertContent}
              onApplyMeta={handleApplyMeta}
              currentContent={editor?.getHTML()}
              focusKeyword={focusKeyword}
            />
          </div>

          {/* Post Settings */}
          <div className="border rounded-md p-4 space-y-4">
            <h3 className="text-sm font-semibold">Post Settings</h3>

            <div>
              <Label className="text-xs">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: BlogCategory) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Tags</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((tag: BlogTag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTagIds.includes(tag.id) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => {
                      setSelectedTagIds(prev =>
                        prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id]
                      );
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>

            <BlogImageUpload
              value={featuredImage}
              altText={featuredImageAlt}
              onChange={setFeaturedImage}
              onAltChange={setFeaturedImageAlt}
            />

            <div>
              <Label className="text-xs">Author Display Name</Label>
              <Input
                value={authorDisplayName}
                onChange={e => setAuthorDisplayName(e.target.value)}
                placeholder="Public author name"
                className="text-sm"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              {(() => {
                const words = editor?.getText().split(/\s+/).filter(Boolean).length || 0;
                return <>{words.toLocaleString()} words &middot; ~{Math.max(1, Math.round(words / 200))} min read</>;
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPostEditorPage;
