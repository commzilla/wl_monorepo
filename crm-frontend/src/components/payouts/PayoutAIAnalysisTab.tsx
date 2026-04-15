import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Brain, RefreshCw, Loader2, AlertCircle, CheckCircle, XCircle, HelpCircle, TrendingUp, Shield, BarChart3, ThumbsUp, ThumbsDown, Send, Sparkles, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { riskScanService, PayoutAIAnalysisResponse } from '@/services/riskScanService';
import { useAuth } from '@/hooks/useAuth';

interface PayoutAIAnalysisTabProps {
  payoutId: string;
}

const PayoutAIAnalysisTab = ({ payoutId }: PayoutAIAnalysisTabProps) => {
  const { toast } = useToast();
  const { isAdmin, isRisk, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const { data: analysis, isLoading, error, refetch } = useQuery({
    queryKey: ['payout-ai-analysis', payoutId],
    queryFn: () => riskScanService.getPayoutAIAnalysis(payoutId),
    enabled: !!payoutId,
    retry: false,
  });

  const refreshMutation = useMutation({
    mutationFn: () => riskScanService.refreshPayoutAIAnalysis(payoutId),
    onSuccess: () => {
      toast({
        title: "AI Analysis Started",
        description: "The analysis is being regenerated. Please wait a moment and refresh.",
      });
      setTimeout(() => refetch(), 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start AI analysis",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running</Badge>;
      case 'pending':
        return <Badge variant="secondary"><HelpCircle className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRecommendationStyles = (decision?: string) => {
    switch (decision) {
      case 'approve':
        return {
          container: 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20',
          badge: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25',
          icon: <CheckCircle className="h-5 w-5" />,
          label: 'Approve'
        };
      case 'reject':
        return {
          container: 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/20',
          badge: 'bg-red-500 text-white shadow-lg shadow-red-500/25',
          icon: <XCircle className="h-5 w-5" />,
          label: 'Reject'
        };
      case 'manual_review':
        return {
          container: 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20',
          badge: 'bg-amber-500 text-white shadow-lg shadow-amber-500/25',
          icon: <HelpCircle className="h-5 w-5" />,
          label: 'Manual Review'
        };
      default:
        return {
          container: 'bg-muted/30 border-muted',
          badge: 'bg-muted text-muted-foreground',
          icon: <HelpCircle className="h-5 w-5" />,
          label: 'N/A'
        };
    }
  };

  const formatKey = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderAnalysisSection = (data: any) => {
    if (typeof data === 'string') {
      return <p className="text-muted-foreground text-sm">{data}</p>;
    }
    if (typeof data === 'object' && data !== null) {
      return Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex justify-between items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
          <span className="text-muted-foreground text-xs">{formatKey(key)}</span>
          <span className="text-xs font-medium text-right">
            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
          </span>
        </div>
      ));
    }
    return <p className="text-muted-foreground">{String(data)}</p>;
  };

  const renderRecommendations = (data: any) => {
    if (Array.isArray(data)) {
      return data.map((rec: string, idx: number) => (
        <div key={idx} className="flex items-start gap-3 text-sm p-3 rounded-lg bg-muted/40 border border-border/50 transition-colors hover:bg-muted/60">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">{idx + 1}</span>
          <span className="text-muted-foreground leading-relaxed">{typeof rec === 'string' ? rec : JSON.stringify(rec)}</span>
        </div>
      ));
    }
    if (typeof data === 'string') {
      return <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/40 border border-border/50">{data}</p>;
    }
    if (typeof data === 'object' && data !== null) {
      return Object.entries(data).map(([key, value]) => (
        <div key={key} className="space-y-2 p-4 rounded-xl bg-muted/30 border border-border/50">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {formatKey(key)}
          </h4>
          {Array.isArray(value) ? (
            <ul className="space-y-2 pl-1">
              {value.map((item: any, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-1">•</span>
                  <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                </li>
              ))}
            </ul>
          ) : typeof value === 'object' && value !== null ? (
            <div className="space-y-1 pl-1">
              {Object.entries(value).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{formatKey(k)}</span>
                  <span className="font-medium">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{String(value)}</p>
          )}
        </div>
      ));
    }
    return null;
  };

  const renderStats = (stats: any) => {
    if (typeof stats !== 'object' || stats === null) {
      return <p className="text-muted-foreground col-span-full">{String(stats)}</p>;
    }
    return Object.entries(stats).map(([key, value]) => (
      <div key={key} className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 transition-all hover:shadow-md hover:border-border">
        <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">{formatKey(key)}</p>
        <p className="text-lg font-bold">
          {typeof value === 'number' 
            ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : typeof value === 'boolean'
              ? (value ? 'Yes' : 'No')
              : String(value)}
        </p>
      </div>
    ));
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Brain className="h-12 w-12 text-primary relative animate-pulse" />
          </div>
          <span className="mt-4 text-muted-foreground">Analyzing trading patterns...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Analysis
            </CardTitle>
            <Button 
              onClick={() => refreshMutation.mutate()} 
              disabled={refreshMutation.isPending}
              size="sm"
            >
              {refreshMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Generate Analysis</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI analysis not available for this payout. Click "Generate Analysis" to run one.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const recommendationStyles = getRecommendationStyles(analysis?.recommendation?.decision);

  return (
    <Card className="border-none shadow-lg overflow-hidden">
      {/* Header with gradient */}
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">AI Analysis</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2">
                {analysis?.llm_model && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{analysis.llm_model}</span>}
                {analysis?.llm_prompt_version && <span className="text-xs text-muted-foreground">v{analysis.llm_prompt_version}</span>}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(analysis?.status)}
            <Button 
              onClick={() => refreshMutation.mutate()} 
              disabled={refreshMutation.isPending || analysis?.status === 'running'}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {refreshMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Refreshing</>
              ) : (
                <><RefreshCw className="h-4 w-4" /> Refresh</>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {analysis?.error_message && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{analysis.error_message}</AlertDescription>
          </Alert>
        )}

        {/* Recommendation Section - Enhanced */}
        {analysis?.recommendation && (
          <div className={`rounded-2xl border-2 p-6 transition-all ${recommendationStyles.container}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Recommendation
              </h3>
              {analysis.recommendation.confidence && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${analysis.recommendation.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{(analysis.recommendation.confidence * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold ${recommendationStyles.badge}`}>
                {recommendationStyles.icon}
                <span className="text-lg">{recommendationStyles.label}</span>
              </div>
            </div>
            {analysis.recommendation.rationale && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-4">
                {analysis.recommendation.rationale}
              </p>
            )}
          </div>
        )}

        {/* AI Summary - Enhanced */}
        {analysis?.ai_summary && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Summary
            </h3>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <p className="text-sm leading-relaxed">{analysis.ai_summary}</p>
            </div>
          </div>
        )}

        {/* Grid of Analysis Sections - Enhanced */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analysis?.ai_trading_style && (
            <Card className="border border-border/50 bg-gradient-to-br from-blue-500/5 to-transparent hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </div>
                  Trading Style
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {renderAnalysisSection(analysis.ai_trading_style)}
              </CardContent>
            </Card>
          )}

          {analysis?.ai_risk_profile && (
            <Card className="border border-border/50 bg-gradient-to-br from-orange-500/5 to-transparent hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-orange-500/10">
                    <Shield className="h-4 w-4 text-orange-500" />
                  </div>
                  Risk Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {renderAnalysisSection(analysis.ai_risk_profile)}
              </CardContent>
            </Card>
          )}

          {analysis?.ai_consistency && (
            <Card className="border border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <BarChart3 className="h-4 w-4 text-emerald-500" />
                  </div>
                  Consistency
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {renderAnalysisSection(analysis.ai_consistency)}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Feedback Section - Only visible to users with AI analysis permission */}
        {hasPermission('risk.ai_analysis') && (
        <div className="mt-8 pt-6 border-t border-border/50">
          <div className="rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Was this analysis helpful?</h3>
                  <p className="text-xs text-muted-foreground">Your feedback helps improve our AI</p>
                </div>
              </div>
              
              {feedbackSubmitted ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Thanks for your feedback!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant={feedback === 'like' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setFeedback('like');
                      setShowFeedbackInput(true);
                    }}
                    className={`gap-2 transition-all ${feedback === 'like' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25' : 'hover:border-emerald-500 hover:text-emerald-500'}`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Helpful
                  </Button>
                  <Button
                    variant={feedback === 'dislike' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setFeedback('dislike');
                      setShowFeedbackInput(true);
                    }}
                    className={`gap-2 transition-all ${feedback === 'dislike' ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25' : 'hover:border-red-500 hover:text-red-500'}`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Not Helpful
                  </Button>
                </div>
              )}
            </div>

            {showFeedbackInput && !feedbackSubmitted && (
              <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <Textarea
                  placeholder={feedback === 'like' 
                    ? "What did you find most useful? (optional)" 
                    : "How can we improve the analysis? (optional)"}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="min-h-[100px] bg-background/50 border-border/50 focus:border-primary/50 resize-none"
                />
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowFeedbackInput(false);
                      setFeedback(null);
                      setFeedbackText('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Feedback Submitted",
                        description: "Thank you for helping us improve our AI analysis!",
                      });
                      setFeedbackSubmitted(true);
                      setShowFeedbackInput(false);
                    }}
                    className="gap-2 bg-primary hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4" />
                    Submit Feedback
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PayoutAIAnalysisTab;
