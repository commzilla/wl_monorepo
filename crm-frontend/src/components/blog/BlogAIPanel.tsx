import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { blogService } from '@/services/blogService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, FileText, Search, ArrowRight, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlogAIPanelProps {
  onInsertContent?: (content: string) => void;
  onApplyMeta?: (meta: { title?: string; meta_title?: string; meta_description?: string; excerpt?: string }) => void;
  currentContent?: string;
  focusKeyword?: string;
}

// --- Outline result display ---

interface OutlineSection {
  heading?: string;
  title?: string;
  points?: string[];
  key_points?: string[];
  subsections?: string[];
}

interface OutlineResult {
  title?: string;
  suggested_title?: string;
  meta_description?: string;
  sections?: OutlineSection[];
  target_audience?: string;
  estimated_word_count?: number;
}

const OutlineDisplay: React.FC<{ data: OutlineResult; onUseOutline: () => void }> = ({ data, onUseOutline }) => {
  const title = data.title || data.suggested_title;
  const sections = data.sections || [];

  return (
    <div className="space-y-4">
      {title && (
        <div className="rounded-md border p-3 bg-primary/5">
          <p className="text-xs text-muted-foreground mb-1">Suggested Title</p>
          <p className="text-sm font-semibold">{title}</p>
        </div>
      )}

      {data.meta_description && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Meta Description</p>
          <p className="text-xs">{data.meta_description}</p>
        </div>
      )}

      {sections.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Sections ({sections.length})</p>
          {sections.map((section, i) => {
            const heading = section.heading || section.title || `Section ${i + 1}`;
            const points = section.points || section.key_points || section.subsections || [];
            return (
              <div key={i} className="rounded-md border p-2.5 text-xs space-y-1.5">
                <p className="font-semibold">{heading}</p>
                {points.length > 0 && (
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {points.map((pt, j) => <li key={j}>{pt}</li>)}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data.estimated_word_count && (
        <p className="text-xs text-muted-foreground">Estimated: ~{data.estimated_word_count} words</p>
      )}

      <Button onClick={onUseOutline} className="w-full" size="sm" variant="outline">
        Use This Outline <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
};

// --- SEO result display ---

interface SEOCheckItem {
  check?: string;
  item?: string;
  label?: string;
  status?: string;
  passed?: boolean;
  present?: boolean;
  result?: string;
  suggestion?: string;
  recommendation?: string;
}

interface SEOResult {
  score?: number;
  overall_score?: number;
  keyword_analysis?: SEOCheckItem[] | Record<string, any>;
  heading_structure?: SEOCheckItem[] | Record<string, any>;
  content_suggestions?: string[] | SEOCheckItem[];
  readability?: string | Record<string, any>;
  meta_suggestions?: {
    meta_title?: string;
    meta_description?: string;
    [key: string]: any;
  };
  suggestions?: string[];
  improvements?: string[];
}

const scoreColor = (score: number) =>
  score >= 75 ? 'text-green-600 border-green-600' : score >= 50 ? 'text-yellow-600 border-yellow-600' : 'text-red-600 border-red-600';

const scoreBg = (score: number) =>
  score >= 75 ? 'bg-green-50' : score >= 50 ? 'bg-yellow-50' : 'bg-red-50';

const isPassed = (item: SEOCheckItem) =>
  item.passed === true || item.present === true || item.status === 'pass' || item.status === 'good' || item.result === 'pass';

const normalizeCheckItems = (data: SEOCheckItem[] | Record<string, any> | undefined): SEOCheckItem[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  // Convert object like { "keyword_in_title": true, ... } to array
  return Object.entries(data).map(([key, val]) => ({
    check: key.replace(/_/g, ' '),
    passed: val === true || val === 'pass' || val === 'good',
    suggestion: typeof val === 'string' && val !== 'pass' && val !== 'good' ? val : undefined,
  }));
};

const SEODisplay: React.FC<{ data: SEOResult; onApplySuggestions: () => void }> = ({ data, onApplySuggestions }) => {
  const score = data.score ?? data.overall_score;
  const keywordChecks = normalizeCheckItems(data.keyword_analysis);
  const headingChecks = normalizeCheckItems(data.heading_structure);
  const contentSuggestions = (data.content_suggestions || data.suggestions || data.improvements || []) as (string | SEOCheckItem)[];
  const readability = data.readability;
  const hasMeta = data.meta_suggestions?.meta_title || data.meta_suggestions?.meta_description;

  return (
    <div className="space-y-4">
      {score != null && (
        <div className={cn('flex items-center justify-center rounded-md border-2 p-3', scoreColor(score), scoreBg(score))}>
          <div className="text-center">
            <p className="text-2xl font-bold">{score}</p>
            <p className="text-xs">SEO Score</p>
          </div>
        </div>
      )}

      {keywordChecks.length > 0 && (
        <ChecklistSection title="Keyword Analysis" items={keywordChecks} />
      )}

      {headingChecks.length > 0 && (
        <ChecklistSection title="Heading Structure" items={headingChecks} />
      )}

      {contentSuggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions</p>
          <ul className="space-y-2">
            {contentSuggestions.map((item, i) => {
              const text = typeof item === 'string' ? item : (item.suggestion || item.recommendation || item.check || '');
              return (
                <li key={i} className="text-xs flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">&#8226;</span>
                  <span>{text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {readability && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Readability</p>
          <p className="text-xs">{typeof readability === 'string' ? readability : JSON.stringify(readability)}</p>
        </div>
      )}

      {hasMeta && (
        <Button onClick={onApplySuggestions} className="w-full" size="sm" variant="outline">
          Apply Meta Suggestions
        </Button>
      )}
    </div>
  );
};

const ChecklistSection: React.FC<{ title: string; items: SEOCheckItem[] }> = ({ title, items }) => {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1 hover:text-foreground">
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {title}
        <Badge variant="secondary" className="text-[10px] h-4 ml-1">
          {items.filter(isPassed).length}/{items.length}
        </Badge>
      </button>
      {expanded && (
        <ul className="space-y-2">
          {items.map((item, i) => {
            const passed = isPassed(item);
            const label = item.check || item.item || item.label || `Check ${i + 1}`;
            return (
              <li key={i} className="text-xs flex items-start gap-1.5">
                {passed
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />}
                <span className={cn(!passed && 'text-muted-foreground')}>{label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

// --- Main component ---

const BlogAIPanel: React.FC<BlogAIPanelProps> = ({ onInsertContent, onApplyMeta, currentContent, focusKeyword }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('outline');
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [audience, setAudience] = useState('intermediate');
  const [tone, setTone] = useState('educational');
  const [outlineData, setOutlineData] = useState<OutlineResult | null>(null);
  const [outlineJson, setOutlineJson] = useState('');
  const [seoData, setSeoData] = useState<SEOResult | null>(null);
  const [articleGenerated, setArticleGenerated] = useState(false);
  const [showRawOutline, setShowRawOutline] = useState(false);

  const outlineMutation = useMutation({
    mutationFn: async () => {
      const res = await blogService.aiGenerate({
        mode: 'generate_outline',
        topic,
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        target_audience: audience,
      });
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      setOutlineData(data);
      setOutlineJson(JSON.stringify(data, null, 2));
      setArticleGenerated(false);
      toast({ title: 'Outline generated' });
    },
    onError: (err: Error) => {
      toast({ title: 'Outline generation failed', description: err.message, variant: 'destructive' });
    },
  });

  const articleMutation = useMutation({
    mutationFn: async () => {
      const res = await blogService.aiGenerate({
        mode: 'generate_article',
        outline: outlineJson,
        tone,
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        include_wefund_cta: true,
      });
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.content && onInsertContent) onInsertContent(data.content);

      const applied: string[] = [];
      if (data && onApplyMeta) {
        const meta: any = {};
        if (data.title) { meta.title = data.title; applied.push('Title'); }
        if (data.meta_title) { meta.meta_title = data.meta_title; applied.push('Meta Title'); }
        if (data.meta_description) { meta.meta_description = data.meta_description; applied.push('Meta Description'); }
        if (data.excerpt) { meta.excerpt = data.excerpt; applied.push('Excerpt'); }
        if (Object.keys(meta).length > 0) onApplyMeta(meta);
      }

      setArticleGenerated(true);
      toast({
        title: 'Article generated & inserted',
        description: applied.length > 0 ? `Applied: ${applied.join(', ')}` : undefined,
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Article generation failed', description: err.message, variant: 'destructive' });
    },
  });

  const seoMutation = useMutation({
    mutationFn: async () => {
      const res = await blogService.aiGenerate({
        mode: 'improve_seo',
        content: currentContent || '',
        focus_keyword: focusKeyword || '',
      });
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      setSeoData(data);
      toast({ title: 'SEO analysis complete' });
    },
    onError: (err: Error) => {
      toast({ title: 'SEO analysis failed', description: err.message, variant: 'destructive' });
    },
  });

  const handleUseOutline = () => {
    setActiveTab('article');
  };

  const handleApplySeoSuggestions = () => {
    if (seoData?.meta_suggestions && onApplyMeta) {
      const meta: any = {};
      const applied: string[] = [];
      if (seoData.meta_suggestions.meta_title) { meta.meta_title = seoData.meta_suggestions.meta_title.slice(0, 60); applied.push('Meta Title'); }
      if (seoData.meta_suggestions.meta_description) { meta.meta_description = seoData.meta_suggestions.meta_description.slice(0, 155); applied.push('Meta Description'); }
      if (Object.keys(meta).length > 0) {
        onApplyMeta(meta);
        toast({ title: 'SEO suggestions applied', description: `Updated: ${applied.join(', ')}` });
      }
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        AI Assistant
      </h3>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="outline" className="text-xs">
            <span className="flex items-center gap-1">
              1. Outline
              {outlineData && <CheckCircle2 className="h-3 w-3 text-green-600" />}
            </span>
          </TabsTrigger>
          <TabsTrigger value="article" className="text-xs">
            <span className="flex items-center gap-1">
              2. Article
              {articleGenerated && <CheckCircle2 className="h-3 w-3 text-green-600" />}
            </span>
          </TabsTrigger>
          <TabsTrigger value="seo" className="text-xs">
            <span className="flex items-center gap-1">
              3. SEO
              {seoData && <CheckCircle2 className="h-3 w-3 text-green-600" />}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* --- Outline Tab --- */}
        <TabsContent value="outline" className="space-y-3 mt-3">
          <div>
            <Label className="text-xs">Topic</Label>
            <Input placeholder="e.g. How to Pass a Prop Firm Challenge" value={topic} onChange={e => setTopic(e.target.value)} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs">Keywords (comma-separated)</Label>
            <Input placeholder="prop firm challenge, funded trader" value={keywords} onChange={e => setKeywords(e.target.value)} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs">Target Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => outlineMutation.mutate()} disabled={outlineMutation.isPending || !topic} className="w-full" size="sm">
            {outlineMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            Generate Outline
          </Button>

          {outlineData && (
            <div className="max-h-[350px] overflow-y-auto rounded-md border p-3">
              <OutlineDisplay data={outlineData} onUseOutline={handleUseOutline} />
              <div className="mt-3">
                <button
                  onClick={() => setShowRawOutline(!showRawOutline)}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  {showRawOutline ? 'Hide' : 'Show'} raw outline
                </button>
                {showRawOutline && (
                  <Textarea value={outlineJson} onChange={e => setOutlineJson(e.target.value)} rows={6} className="text-xs font-mono mt-1" />
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* --- Article Tab --- */}
        <TabsContent value="article" className="space-y-3 mt-3">
          {outlineJson ? (
            <div className="rounded-md border p-2.5 bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <p className="text-xs font-medium">Outline loaded</p>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {outlineData?.title || outlineData?.suggested_title || 'Custom outline'}
                {outlineData?.sections && ` \u2014 ${outlineData.sections.length} sections`}
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2.5 flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-yellow-600 mt-0.5" />
              <p className="text-xs text-muted-foreground">No outline loaded. Generate one in the Outline tab first, or paste custom JSON.</p>
            </div>
          )}

          <div>
            <Label className="text-xs">Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="educational">Educational</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
                <SelectItem value="authoritative">Authoritative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => articleMutation.mutate()} disabled={articleMutation.isPending || !outlineJson} className="w-full" size="sm">
            {articleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate Article
          </Button>

          {articleGenerated && (
            <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-medium">Article inserted into editor</p>
                <p className="text-muted-foreground">Title, meta fields, and excerpt have been applied. Review and edit as needed.</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* --- SEO Tab --- */}
        <TabsContent value="seo" className="space-y-3 mt-3">
          <p className="text-xs text-muted-foreground">Analyze your content for SEO improvements and get actionable suggestions.</p>
          {!currentContent && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2.5 flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-yellow-600 mt-0.5" />
              <p className="text-xs text-muted-foreground">Write some content first before running SEO analysis.</p>
            </div>
          )}
          <Button onClick={() => seoMutation.mutate()} disabled={seoMutation.isPending || !currentContent} className="w-full" size="sm">
            {seoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Analyze SEO
          </Button>

          {seoData && (
            <div className="max-h-[400px] overflow-y-auto rounded-md border p-3">
              <SEODisplay data={seoData} onApplySuggestions={handleApplySeoSuggestions} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BlogAIPanel;
