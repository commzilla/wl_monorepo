import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Brain, 
  RefreshCw, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  Bot,
  Grid3X3,
  TrendingUp,
  Zap,
  Layers,
  FileText,
  ThumbsUp,
  MessageSquare,
  Download
} from 'lucide-react';
import { aiRiskAnalysisService } from '@/services/aiRiskAnalysisService';
import { AIRiskAnalysis, AIAnalysisResult, AIDetectedPattern } from '@/lib/types/aiRiskAnalysis';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import AIRiskFeedbackForm from './AIRiskFeedbackForm';

// Pattern icons mapping - extended for all prohibited strategies
const patternIcons: Record<string, React.ReactNode> = {
  'BOT_TRADING': <Bot className="h-4 w-4" />,
  'BOT_DETECTION': <Bot className="h-4 w-4" />,
  'GRID_TRADING': <Grid3X3 className="h-4 w-4" />,
  'GRID': <Grid3X3 className="h-4 w-4" />,
  'MARTINGALE': <TrendingUp className="h-4 w-4" />,
  'HIGH_FREQUENCY_SCALPING': <Zap className="h-4 w-4" />,
  'PYRAMID': <Layers className="h-4 w-4" />,
  'PYRAMID_TRADING': <Layers className="h-4 w-4" />,
  'HEDGING': <Shield className="h-4 w-4" />,
  'ALL_IN': <AlertTriangle className="h-4 w-4" />,
  'ALL_IN_TRADING': <AlertTriangle className="h-4 w-4" />,
  'COPY_TRADING': <RefreshCw className="h-4 w-4" />,
  'NEWS_TRADING': <Clock className="h-4 w-4" />,
  'NEWS_TRADING_EXPLOITATION': <Clock className="h-4 w-4" />,
};

// Try to parse AI analysis text as JSON, returns null if not JSON
const parseAnalysisJSON = (text: string): AIAnalysisResult | null => {
  try {
    const parsed = JSON.parse(text);
    // Validate it has expected structure
    if (parsed && typeof parsed === 'object' && 'recommendation' in parsed) {
      return parsed as AIAnalysisResult;
    }
    return null;
  } catch {
    return null;
  }
};

// Parse the AI analysis text into structured sections
const parseAnalysisText = (text: string) => {
  const sections: { type: string; title?: string; content: string; patterns?: any[] }[] = [];
  
  // Split by ## headers
  const parts = text.split(/^## /gm).filter(Boolean);
  
  for (const part of parts) {
    const lines = part.trim().split('\n');
    const title = lines[0]?.trim();
    const content = lines.slice(1).join('\n').trim();
    
    if (title === 'PATTERNS CHECKED') {
      // Parse table
      const tableLines = content.split('\n').filter(line => line.trim() && !line.startsWith('|--') && !line.startsWith('| Pattern'));
      const patterns = tableLines.map(line => {
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length >= 4) {
          return {
            pattern: cells[0],
            found: cells[1],
            confidence: cells[2],
            evidence: cells[3],
          };
        }
        return null;
      }).filter(Boolean);
      
      sections.push({ type: 'patterns', title, content, patterns });
    } else if (title === 'DETAILED FINDINGS') {
      sections.push({ type: 'findings', title, content });
    } else if (title === 'AI OPINION') {
      sections.push({ type: 'opinion', title, content });
    } else if (title === 'RECOMMENDATION') {
      sections.push({ type: 'recommendation', title, content });
    } else if (title === 'ILLEGAL STRATEGY ANALYSIS') {
      sections.push({ type: 'header', title, content });
    } else {
      sections.push({ type: 'generic', title, content });
    }
  }
  
  return sections;
};

// Analysis Summary Display Component
const AnalysisSummaryDisplay: React.FC<{ text: string }> = ({ text }) => {
  const sections = useMemo(() => parseAnalysisText(text), [text]);
  
  const headerSection = sections.find(s => s.type === 'header');
  const patternsSection = sections.find(s => s.type === 'patterns');
  const findingsSection = sections.find(s => s.type === 'findings');
  const opinionSection = sections.find(s => s.type === 'opinion');
  const recommendationSection = sections.find(s => s.type === 'recommendation');
  
  // Parse header content for account info
  const accountInfo = headerSection?.content?.split('\n').reduce((acc, line) => {
    if (line.includes('Account ID:')) acc.accountId = line.split(':')[1]?.trim();
    if (line.includes('Account Step:')) acc.accountStep = line.split(':')[1]?.trim();
    return acc;
  }, {} as { accountId?: string; accountStep?: string });

  // Parse findings into list
  const findings = findingsSection?.content?.split('\n- ').filter(Boolean).map(f => {
    const match = f.match(/\*\*([^*]+)\*\*:\s*(.*)/);
    if (match) return { pattern: match[1], detail: match[2] };
    return { pattern: '', detail: f.replace(/^- /, '') };
  }) || [];

  // Parse recommendation
  const recommendationLines = recommendationSection?.content?.split('\n').filter(Boolean) || [];
  const recommendation = recommendationLines[0] || '';
  const reason = recommendationLines.find(l => l.startsWith('Reason:'))?.replace('Reason:', '').trim() || '';

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Illegal Strategy Analysis</h3>
            <p className="text-sm text-muted-foreground">
              {accountInfo?.accountId && `Account: ${accountInfo.accountId}`}
              {accountInfo?.accountStep && ` • ${accountInfo.accountStep}`}
            </p>
          </div>
        </div>
      </div>

      {/* Patterns Checked Table */}
      {patternsSection?.patterns && patternsSection.patterns.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="p-4 bg-muted/30 border-b">
            <h4 className="font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Patterns Checked
            </h4>
          </div>
          <div className="divide-y">
            {patternsSection.patterns.map((pattern: any, idx: number) => (
              <div key={idx} className="p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <div className={`p-2 rounded-lg ${pattern.found === 'YES' ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                      {patternIcons[pattern.pattern] || <FileText className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{pattern.pattern?.replace(/_/g, ' ')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {pattern.found === 'YES' ? (
                          <Badge variant="destructive" className="text-xs">Detected</Badge>
                        ) : (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Not Found</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{pattern.confidence} confidence</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground flex-1">{pattern.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Findings */}
      {findings.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="p-4 bg-muted/30 border-b">
            <h4 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Detailed Findings
            </h4>
          </div>
          <div className="p-4 space-y-3">
            {findings.map((finding, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  {finding.pattern && <span className="font-semibold">{finding.pattern}: </span>}
                  <span className="text-muted-foreground">{finding.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Opinion */}
      {opinionSection && (
        <div className="p-5 rounded-xl border bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
          <h4 className="font-semibold flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            AI Opinion
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{opinionSection.content}</p>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className={`p-5 rounded-xl border ${
          recommendation === 'APPROVE'
            ? 'bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30'
            : recommendation === 'REJECT'
            ? 'bg-gradient-to-br from-destructive/10 to-transparent border-destructive/30'
            : 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                recommendation === 'APPROVE' ? 'bg-green-500/20' :
                recommendation === 'REJECT' ? 'bg-destructive/20' : 'bg-amber-500/20'
              }`}>
                {recommendation === 'APPROVE' ? (
                  <ThumbsUp className="h-5 w-5 text-green-600" />
                ) : recommendation === 'REJECT' ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-lg">{recommendation}</h4>
                {reason && <p className="text-sm text-muted-foreground">{reason}</p>}
              </div>
            </div>
            <Badge className={`text-base px-4 py-1 ${
              recommendation === 'APPROVE' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
              recommendation === 'REJECT' ? 'bg-destructive/10 text-destructive border-destructive/20' :
              'bg-amber-500/10 text-amber-600 border-amber-500/20'
            }`}>
              {recommendation}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};

// JSON Analysis Summary Display Component (Gemini format)
const JSONAnalysisSummaryDisplay: React.FC<{ data: AIAnalysisResult }> = ({ data }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'AUTO_REJECT': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'REVIEW': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-green-500/10 text-green-600 border-green-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Prohibited Strategy Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Powered by WeFund Risk AI
            </p>
          </div>
        </div>
      </div>

      {/* Patterns Detected */}
      {data.patterns_detected && data.patterns_detected.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="p-4 bg-destructive/5 border-b border-destructive/20">
            <h4 className="font-semibold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Patterns Detected ({data.patterns_detected.length})
            </h4>
          </div>
          <div className="divide-y">
            {data.patterns_detected.map((pattern: AIDetectedPattern, idx: number) => (
              <div key={idx} className="p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className={`p-2 rounded-lg ${getSeverityColor(pattern.severity)}`}>
                      {patternIcons[pattern.code] || <FileText className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{pattern.code?.replace(/_/g, ' ')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getSeverityColor(pattern.severity)} variant="outline">
                          {pattern.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(pattern.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {pattern.evidence?.map((e, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-destructive mt-1">•</span>
                          {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Patterns Detected */}
      {(!data.patterns_detected || data.patterns_detected.length === 0) && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-600">No Prohibited Patterns Detected</p>
              <p className="text-sm text-muted-foreground">Trading activity appears legitimate</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Findings */}
      {data.key_findings && data.key_findings.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="p-4 bg-muted/30 border-b">
            <h4 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Key Findings
            </h4>
          </div>
          <div className="p-4 space-y-3">
            {data.key_findings.map((finding, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{finding}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Reasoning */}
      {data.reasoning && (
        <div className="p-5 rounded-xl border bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
          <h4 className="font-semibold flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            AI Analysis
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.reasoning}</p>
        </div>
      )}

      {/* Suggested Action */}
      {data.suggested_action && (
        <div className={`p-5 rounded-xl border ${
          data.recommendation === 'APPROVE'
            ? 'bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30'
            : data.recommendation === 'REJECT'
            ? 'bg-gradient-to-br from-destructive/10 to-transparent border-destructive/30'
            : 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                data.recommendation === 'APPROVE' ? 'bg-green-500/20' :
                data.recommendation === 'REJECT' ? 'bg-destructive/20' : 'bg-amber-500/20'
              }`}>
                {data.recommendation === 'APPROVE' ? (
                  <ThumbsUp className="h-5 w-5 text-green-600" />
                ) : data.recommendation === 'REJECT' ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-lg">{data.recommendation}</h4>
                <p className="text-sm text-muted-foreground">{data.suggested_action}</p>
              </div>
            </div>
            <Badge className={`text-base px-4 py-1 ${
              data.recommendation === 'APPROVE' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
              data.recommendation === 'REJECT' ? 'bg-destructive/10 text-destructive border-destructive/20' :
              'bg-amber-500/10 text-amber-600 border-amber-500/20'
            }`}>
              {data.recommendation}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};

// Unified Analysis Summary that handles both JSON and markdown formats
const AnalysisSummary: React.FC<{ text: string }> = ({ text }) => {
  const jsonData = useMemo(() => parseAnalysisJSON(text), [text]);

  if (jsonData) {
    return <JSONAnalysisSummaryDisplay data={jsonData} />;
  }

  // Fallback to markdown parsing for old analyses
  return <AnalysisSummaryDisplay text={text} />;
};

interface AIRiskAnalysisTabProps {
  payoutId: string;
}

const AIRiskAnalysisTab: React.FC<AIRiskAnalysisTabProps> = ({ payoutId }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showDebug, setShowDebug] = useState(false);
  
  // Only show debug to specific user
  const canSeeDebug = user?.email === 'nexada@we-fund.com';

  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-risk-analysis', payoutId],
    queryFn: () => aiRiskAnalysisService.getAnalysis(payoutId),
    retry: false,
  });

  // Fetch existing feedback when analysis exists
  const analysisId = response?.data?.id;
  const { data: feedbackResponse } = useQuery({
    queryKey: ['ai-risk-feedback', analysisId],
    queryFn: () => aiRiskAnalysisService.getFeedback(analysisId!),
    enabled: !!analysisId && response?.data?.status === 'completed',
    retry: false,
  });

  // Determine if analysis is in progress (needs polling)
  const isAnalysisRunning = response?.exists && 
    response?.data?.status && 
    ['queued', 'running'].includes(response.data.status);

  // Poll every 3 seconds while analysis is running
  useEffect(() => {
    if (!isAnalysisRunning) return;
    
    const interval = setInterval(() => {
      refetch();
    }, 3000);

    return () => clearInterval(interval);
  }, [isAnalysisRunning, refetch]);

  const runMutation = useMutation({
    mutationFn: () => aiRiskAnalysisService.runAnalysis(payoutId),
    onSuccess: () => {
      toast.success('Risk analysis queued');
      queryClient.invalidateQueries({ queryKey: ['ai-risk-analysis', payoutId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to run risk analysis');
    },
  });

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case 'APPROVE':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approve</Badge>;
      case 'REJECT':
        return <Badge variant="destructive">Reject</Badge>;
      case 'MANUAL_REVIEW':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Manual Review</Badge>;
      default:
        return <Badge variant="secondary">{recommendation}</Badge>;
    }
  };

  const getFinalDecisionBadge = (decision: string | null) => {
    if (!decision) return null;
    switch (decision) {
      case 'APPROVE':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>;
      case 'REJECT':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'APPROVE_WITH_DEDUCTIONS':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Approved with Deductions</Badge>;
      default:
        return <Badge variant="secondary">{decision}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Queued</Badge>;
      case 'running':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Running</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending Review</Badge>;
      case 'reviewed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"><CheckCircle2 className="h-3 w-3" /> Reviewed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle>AI Risk Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No analysis exists yet
  if (error || !response?.exists) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle>AI Risk Analysis</CardTitle>
            </div>
          </div>
          <CardDescription>AI-powered risk assessment for this payout request</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>No Analysis Available</AlertTitle>
            <AlertDescription>
              No AI risk analysis has been performed for this payout yet. Click the button below to run the analysis.
            </AlertDescription>
          </Alert>
          <div className="mt-6 flex justify-center">
            <Button 
              onClick={() => runMutation.mutate()} 
              disabled={runMutation.isPending}
              className="gap-2"
            >
              {runMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Analysis...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Run Risk Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const analysis = response.data!;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>AI Risk Analysis</CardTitle>
              <CardDescription className="mt-1">
                Version: {analysis.ai_prompt_version}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(analysis.status)}
            {analysis.status === 'completed' && user?.email === 'nexada@we-fund.com' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={async () => {
                  try {
                    toast.info('Generating report...');
                    const blob = await aiRiskAnalysisService.exportReport(payoutId);
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `payout-risk-report-${payoutId}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    toast.success('Report downloaded successfully');
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Failed to export report');
                  }
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending || isAnalysisRunning || !response?.can_scan}
              className="gap-2"
            >
              {runMutation.isPending || isAnalysisRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isAnalysisRunning ? 'Processing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Message - Show when failed */}
        {analysis.status === 'failed' && analysis.error_message && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Analysis Failed</AlertTitle>
            <AlertDescription>{analysis.error_message}</AlertDescription>
          </Alert>
        )}

        {/* Recommendation Section - Only show when completed */}
        {analysis.status === 'completed' && (
          <div className="p-5 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                AI Recommendation
              </h3>
              {analysis.ai_recommendation && getRecommendationBadge(analysis.ai_recommendation)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {analysis.ai_confidence !== null && (
                <div className="p-4 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground mb-1">Confidence Score</p>
                  <div className="flex items-center gap-2">
                    <Progress value={Number(analysis.ai_confidence)} className="flex-1" />
                    <span className="text-sm font-semibold">{analysis.ai_confidence}%</span>
                  </div>
                </div>
              )}
              
              {analysis.consistency_score !== null && (
                <div className="p-4 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground mb-1">Consistency Score</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{analysis.consistency_score}</span>
                    {analysis.consistency_result && (
                      <Badge variant="outline" className="ml-2">{analysis.consistency_result}</Badge>
                    )}
                  </div>
                </div>
              )}
              
              {analysis.final_decision && (
                <div className="p-4 rounded-lg bg-background/50">
                  <p className="text-xs text-muted-foreground mb-1">Final Decision</p>
                  {getFinalDecisionBadge(analysis.final_decision)}
                </div>
              )}
            </div>

            {analysis.requires_human_review && (
              <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/20 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Human Review Required</AlertTitle>
                <AlertDescription>
                  This payout has been flagged for manual review by the AI system.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Analysis Summary - Handles both JSON (Gemini) and markdown (legacy) formats */}
        {analysis.ai_analysis_text && <AnalysisSummary text={analysis.ai_analysis_text} />}

        {/* Detected Patterns */}
        {analysis.ai_patterns_detected && analysis.ai_patterns_detected.length > 0 && (
          <div className="p-5 rounded-xl border border-destructive/20 bg-destructive/5">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Detected Patterns ({analysis.ai_patterns_detected.length})
            </h3>
            <ul className="space-y-2">
              {analysis.ai_patterns_detected.map((pattern, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Account Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border">
            <p className="text-xs text-muted-foreground mb-1">Account ID</p>
            <p className="font-mono text-sm font-medium">{analysis.account_id}</p>
          </div>
          <div className="p-4 rounded-lg border">
            <p className="text-xs text-muted-foreground mb-1">Account Step</p>
            <Badge variant="outline">{analysis.account_step === 'step_1' ? 'Step 1' : 'Step 2'}</Badge>
          </div>
          <div className="p-4 rounded-lg border">
            <p className="text-xs text-muted-foreground mb-1">Created At</p>
            <p className="text-sm">{format(new Date(analysis.created_at), 'PPpp')}</p>
          </div>
          {analysis.started_at && (
            <div className="p-4 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Started At</p>
              <p className="text-sm">{format(new Date(analysis.started_at), 'PPpp')}</p>
            </div>
          )}
          {analysis.completed_at && (
            <div className="p-4 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Completed At</p>
              <p className="text-sm">{format(new Date(analysis.completed_at), 'PPpp')}</p>
            </div>
          )}
          {analysis.reviewed_at && (
            <div className="p-4 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Reviewed At</p>
              <p className="text-sm">{format(new Date(analysis.reviewed_at), 'PPpp')}</p>
            </div>
          )}
        </div>

        {/* Human Review Feedback Section */}
        {analysis.status === 'completed' && analysisId && (
          <AIRiskFeedbackForm
            analysisId={analysisId}
            payoutId={payoutId}
            detectedPatterns={analysis.ai_patterns_detected || []}
            aiRecommendation={analysis.ai_recommendation}
            existingFeedback={feedbackResponse}
            isCompleted={analysis.status === 'completed'}
          />
        )}

        {/* Debug Information - Only for specific user */}
        {canSeeDebug && (
          <div className="border rounded-xl">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-xl"
            >
              <span className="font-semibold text-sm">Debug Information</span>
              {showDebug ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showDebug && (
              <div className="p-4 border-t space-y-4">
                {analysis.ai_model && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">AI Model</p>
                    <p className="text-xs font-mono bg-muted p-2 rounded">{analysis.ai_model}</p>
                  </div>
                )}
                {analysis.ai_raw_request && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">AI Request</p>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-60">
                      {JSON.stringify(analysis.ai_raw_request, null, 2)}
                    </pre>
                  </div>
                )}
                {analysis.ai_raw_response && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">AI Response</p>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-60">
                      {JSON.stringify(analysis.ai_raw_response, null, 2)}
                    </pre>
                  </div>
                )}
                {analysis.account_snapshot && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Account Snapshot</p>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-60">
                      {JSON.stringify(analysis.account_snapshot, null, 2)}
                    </pre>
                  </div>
                )}
                {analysis.trade_data && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Trade Data</p>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-60">
                      {JSON.stringify(analysis.trade_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIRiskAnalysisTab;
