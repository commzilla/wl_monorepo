import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Eye,
  BookOpen,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/layout/PageHeader';
import { aiLearningService } from '@/services/aiLearningService';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { AIAnalysisWithFeedback, AITrainingExample, AILearningStats } from '@/lib/types/aiLearning';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const getRecommendationBadge = (recommendation: string) => {
  switch (recommendation?.toLowerCase()) {
    case 'approve':
      return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Approve</Badge>;
    case 'reject':
      return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">Reject</Badge>;
    case 'review':
    case 'manual_review':
      return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Review</Badge>;
    default:
      return <Badge variant="outline">{recommendation || 'N/A'}</Badge>;
  }
};

const getAgreementBadge = (agrees?: boolean) => {
  if (agrees === undefined || agrees === null) {
    return <Badge variant="outline">Pending</Badge>;
  }
  return agrees ? (
    <Badge className="bg-green-500/10 text-green-500">
      <ThumbsUp className="h-3 w-3 mr-1" />
      Agreed
    </Badge>
  ) : (
    <Badge className="bg-red-500/10 text-red-500">
      <ThumbsDown className="h-3 w-3 mr-1" />
      Disagreed
    </Badge>
  );
};

const AILearningCenter: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendationFilter, setRecommendationFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AIAnalysisWithFeedback | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['ai-learning-stats'],
    queryFn: aiLearningService.getStats,
  });

  // Fetch analyses with filters based on active tab
  const analysesFilters = useMemo(() => {
    const filters: any = { page, page_size: 20 };

    if (activeTab === 'review-queue') {
      filters.has_feedback = false;
    } else if (activeTab === 'training-data') {
      filters.is_training_example = true;
    }

    if (recommendationFilter !== 'all') {
      filters.ai_recommendation = recommendationFilter;
    }

    return filters;
  }, [activeTab, recommendationFilter, page]);

  const { data: analysesResponse, isLoading: analysesLoading, refetch: refetchAnalyses } = useQuery({
    queryKey: ['ai-learning-analyses', analysesFilters],
    queryFn: () => aiLearningService.getAnalyses(analysesFilters),
    enabled: activeTab !== 'overview',
  });

  // Fetch training examples
  const { data: trainingExamples, isLoading: trainingLoading, refetch: refetchTraining } = useQuery({
    queryKey: ['ai-learning-training'],
    queryFn: aiLearningService.getTrainingExamples,
    enabled: activeTab === 'training-data',
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: aiLearningService.approveForTraining,
    onSuccess: () => {
      toast.success('Approved for training');
      queryClient.invalidateQueries({ queryKey: ['ai-learning'] });
      refetchAnalyses();
      refetchTraining();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      aiLearningService.rejectFromTraining(id, reason),
    onSuccess: () => {
      toast.success('Rejected from training');
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedAnalysis(null);
      queryClient.invalidateQueries({ queryKey: ['ai-learning'] });
      refetchAnalyses();
      refetchTraining();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject');
    },
  });

  // Filter analyses by search
  const filteredAnalyses = useMemo(() => {
    const results = analysesResponse?.results || [];
    if (!searchQuery) return results;

    const query = searchQuery.toLowerCase();
    return results.filter(
      (a) =>
        a.payout_id?.toLowerCase().includes(query) ||
        a.account_id?.toLowerCase().includes(query) ||
        a.ai_recommendation?.toLowerCase().includes(query)
    );
  }, [analysesResponse?.results, searchQuery]);

  // Prepare chart data
  const patternsChartData = useMemo(() => {
    if (!stats?.patterns_by_type) return [];
    return Object.entries(stats.patterns_by_type).map(([name, value], idx) => ({
      name,
      value,
      fill: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [stats?.patterns_by_type]);

  const decisionsChartData = useMemo(() => {
    if (!stats?.decisions_by_type) return [];
    return Object.entries(stats.decisions_by_type).map(([name, value], idx) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [stats?.decisions_by_type]);

  const handleApproveForTraining = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleRejectFromTraining = (analysis: AIAnalysisWithFeedback) => {
    setSelectedAnalysis(analysis);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (selectedAnalysis) {
      rejectMutation.mutate({ id: selectedAnalysis.id, reason: rejectReason });
    }
  };

  const handleRefreshAll = () => {
    refetchStats();
    refetchAnalyses();
    if (activeTab === 'training-data') {
      refetchTraining();
    }
    toast.success('Data refreshed');
  };

  // Stats cards data
  const statsCards = [
    {
      title: 'Total Analyses',
      value: stats?.total_analyses || 0,
      icon: Brain,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Reviewed',
      value: stats?.total_reviewed || 0,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'AI Accuracy',
      value: stats?.ai_accuracy ? `${(stats.ai_accuracy * 100).toFixed(1)}%` : 'N/A',
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Pending Review',
      value: (stats?.total_analyses || 0) - (stats?.total_reviewed || 0),
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="page-container space-y-4 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="AI Learning Center"
        subtitle="Monitor AI accuracy, review feedback, and manage training data"
        actions={
          <Button onClick={handleRefreshAll} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="review-queue" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Review Queue</span>
          </TabsTrigger>
          <TabsTrigger value="training-data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Training Data</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((stat) => (
              <Card key={stat.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl sm:text-3xl font-bold mt-2">{statsLoading ? '...' : stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Accuracy Progress */}
          {stats?.ai_accuracy !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  AI Accuracy Rate
                </CardTitle>
                <CardDescription>
                  Percentage of AI recommendations that align with human decisions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Accuracy</span>
                    <span className="font-semibold">{(stats.ai_accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.ai_accuracy * 100} className="h-3" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Patterns Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Patterns Detected</CardTitle>
                <CardDescription>Distribution of AI-detected risk patterns</CardDescription>
              </CardHeader>
              <CardContent>
                {patternsChartData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={patternsChartData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No pattern data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Decisions Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Decision Distribution</CardTitle>
                <CardDescription>Breakdown of AI recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                {decisionsChartData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={decisionsChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {decisionsChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No decision data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Review Queue Tab */}
        <TabsContent value="review-queue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Pending Human Review
              </CardTitle>
              <CardDescription>
                AI analyses that need human feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by payout ID or account..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={recommendationFilter} onValueChange={setRecommendationFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by recommendation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Recommendations</SelectItem>
                    <SelectItem value="approve">Approve</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              {analysesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payout ID</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>AI Recommendation</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Patterns</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAnalyses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No analyses pending review
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAnalyses.map((analysis) => (
                          <TableRow key={analysis.id}>
                            <TableCell className="font-mono text-sm">
                              {analysis.payout_id?.slice(0, 8)}...
                            </TableCell>
                            <TableCell>{analysis.account_id}</TableCell>
                            <TableCell>{getRecommendationBadge(analysis.ai_recommendation)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={analysis.ai_confidence * 100} className="h-2 w-16" />
                                <span className="text-sm">{(analysis.ai_confidence * 100).toFixed(0)}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {analysis.ai_patterns_detected?.slice(0, 2).map((pattern, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {pattern}
                                  </Badge>
                                ))}
                                {(analysis.ai_patterns_detected?.length || 0) > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{analysis.ai_patterns_detected!.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(analysis.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleApproveForTraining(analysis.id)}
                                  title="Approve for Training"
                                >
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRejectFromTraining(analysis)}
                                  title="Reject from Training"
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {analysesResponse && analysesResponse.count > 20 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Showing {filteredAnalyses.length} of {analysesResponse.count} analyses
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!analysesResponse.next}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Data Tab */}
        <TabsContent value="training-data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Approved Training Examples
              </CardTitle>
              <CardDescription>
                High-quality examples used for AI model training
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trainingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payout ID</TableHead>
                        <TableHead>AI Recommendation</TableHead>
                        <TableHead>Human Decision</TableHead>
                        <TableHead>Agreement</TableHead>
                        <TableHead>Patterns</TableHead>
                        <TableHead>Approved At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!trainingExamples || trainingExamples.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No training examples yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        trainingExamples.map((example) => (
                          <TableRow key={example.id}>
                            <TableCell className="font-mono text-sm">
                              {example.payout_id?.slice(0, 8)}...
                            </TableCell>
                            <TableCell>{getRecommendationBadge(example.ai_recommendation)}</TableCell>
                            <TableCell>{getRecommendationBadge(example.human_decision || '')}</TableCell>
                            <TableCell>{getAgreementBadge(example.human_agrees_with_ai)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {example.ai_patterns_detected?.slice(0, 2).map((pattern, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {pattern}
                                  </Badge>
                                ))}
                                {(example.ai_patterns_detected?.length || 0) > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{example.ai_patterns_detected!.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {example.approved_at
                                ? new Date(example.approved_at).toLocaleDateString()
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRejectFromTraining(example)}
                                title="Remove from Training"
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                All Analyses History
              </CardTitle>
              <CardDescription>
                Complete history of AI analyses with feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by payout ID or account..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={recommendationFilter} onValueChange={setRecommendationFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by recommendation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Recommendations</SelectItem>
                    <SelectItem value="approve">Approve</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              {analysesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payout ID</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>AI Recommendation</TableHead>
                        <TableHead>Human Decision</TableHead>
                        <TableHead>Agreement</TableHead>
                        <TableHead>Training Example</TableHead>
                        <TableHead>Reviewed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAnalyses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No analyses found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAnalyses.map((analysis) => (
                          <TableRow key={analysis.id}>
                            <TableCell className="font-mono text-sm">
                              {analysis.payout_id?.slice(0, 8)}...
                            </TableCell>
                            <TableCell>{analysis.account_id}</TableCell>
                            <TableCell>{getRecommendationBadge(analysis.ai_recommendation)}</TableCell>
                            <TableCell>
                              {analysis.human_decision
                                ? getRecommendationBadge(analysis.human_decision)
                                : <Badge variant="outline">Pending</Badge>}
                            </TableCell>
                            <TableCell>{getAgreementBadge(analysis.human_agrees_with_ai)}</TableCell>
                            <TableCell>
                              {analysis.is_training_example ? (
                                <Badge className="bg-primary/10 text-primary">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Yes
                                </Badge>
                              ) : (
                                <Badge variant="outline">No</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {analysis.reviewed_at
                                ? new Date(analysis.reviewed_at).toLocaleDateString()
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {analysesResponse && analysesResponse.count > 20 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Showing {filteredAnalyses.length} of {analysesResponse.count} analyses
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!analysesResponse.next}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject from Training</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this analysis from training data?
              You can optionally provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Optional: Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRejectDialogOpen(false);
              setRejectReason('');
              setSelectedAnalysis(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AILearningCenter;
