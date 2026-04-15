import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface BlogSEOPanelProps {
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  slug: string;
  onMetaTitleChange: (v: string) => void;
  onMetaDescriptionChange: (v: string) => void;
  onFocusKeywordChange: (v: string) => void;
  onSlugChange: (v: string) => void;
}

const charCountColor = (len: number, greenMax: number, yellowMax: number) =>
  len <= greenMax ? 'text-green-600' : len <= yellowMax ? 'text-yellow-600' : 'text-red-600';

const BlogSEOPanel: React.FC<BlogSEOPanelProps> = ({
  metaTitle, metaDescription, focusKeyword, slug,
  onMetaTitleChange, onMetaDescriptionChange, onFocusKeywordChange, onSlugChange,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">SEO Settings</h3>

      <div>
        <Label className="text-xs">
          Meta Title{' '}
          <span className={cn('text-xs', charCountColor(metaTitle.length, 50, 60))}>
            ({metaTitle.length}/60)
          </span>
        </Label>
        <Input value={metaTitle} onChange={e => onMetaTitleChange(e.target.value.slice(0, 60))} placeholder="Custom search title" className="text-sm" maxLength={60} />
      </div>

      <div>
        <Label className="text-xs">
          Meta Description{' '}
          <span className={cn('text-xs', charCountColor(metaDescription.length, 120, 155))}>
            ({metaDescription.length}/155)
          </span>
        </Label>
        <Textarea value={metaDescription} onChange={e => onMetaDescriptionChange(e.target.value.slice(0, 155))} placeholder="Custom search description" rows={3} className="text-sm" maxLength={155} />
      </div>

      <div>
        <Label className="text-xs">Focus Keyword</Label>
        <Input value={focusKeyword} onChange={e => onFocusKeywordChange(e.target.value)} placeholder="e.g. prop firm challenge" className="text-sm" />
      </div>

      <div>
        <Label className="text-xs">URL Slug</Label>
        <Input value={slug} onChange={e => onSlugChange(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))} placeholder="article-slug" className="text-sm" />
      </div>

      <div className="rounded-md border p-3 bg-muted/30">
        <p className="text-xs text-muted-foreground mb-1">Google Preview</p>
        <p className="text-blue-600 text-sm font-medium truncate">{metaTitle || 'Article Title | WeFund Blog'}</p>
        <p className="text-green-700 text-xs truncate">https://we-fund.com/blog/{slug || 'article-slug'}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{metaDescription || 'Article description will appear here...'}</p>
      </div>
    </div>
  );
};

export default BlogSEOPanel;
