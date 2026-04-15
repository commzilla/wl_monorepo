import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { 
  Scale, Loader2, CheckCircle2, XCircle, MinusCircle, DollarSign, Percent, 
  MessageSquare, RefreshCw, AlertTriangle, Clock, TrendingDown, BarChart3,
  FileText, AlertCircle, Info, ChevronDown, ChevronRight, Code, Bug,
  ThumbsUp, ThumbsDown, Send, CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { consistencyCheckService } from '@/services/consistencyCheckService';
import { ConsistencyCheckResponse } from '@/lib/types/consistencyCheck';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ConsistencyCheckTabProps {
  payoutId: string | undefined;
}

const ConsistencyCheckTab: React.FC<ConsistencyCheckTabProps> = ({ payoutId }) => {
  const { toast } = useToast();
  const { isAdmin, isRisk, profile, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Fetch existing report
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['consistency-report', payoutId],
    queryFn: async () => {
      if (!payoutId) throw new Error('Payout ID is required');
      return await consistencyCheckService.getConsistencyReport(payoutId, false);
    },
    enabled: !!payoutId,
    retry: false,
  });

  // Mutation to refresh/regenerate the report
  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!payoutId) throw new Error('Payout ID is required');
      return await consistencyCheckService.getConsistencyReport(payoutId, true);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['consistency-report', payoutId], data);
      toast({
        title: 'Report Generated',
        description: data.already_generated 
          ? 'Existing consistency report loaded.' 
          : 'New consistency analysis has been generated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate consistency report',
        variant: 'destructive',
      });
    },
  });

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'pass':
        return (
          <Badge className="bg-green-500 hover:bg-green-600 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            PASS
          </Badge>
        );
      case 'reject':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            REJECT
          </Badge>
        );
      case 'not_applicable':
        return (
          <Badge variant="secondary" className="gap-1">
            <MinusCircle className="h-3 w-3" />
            NOT APPLICABLE
          </Badge>
        );
      default:
        return <Badge variant="outline">{verdict}</Badge>;
    }
  };

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'approved_full':
        return <Badge className="bg-green-500 hover:bg-green-600">Approved Full</Badge>;
      case 'approved_reduced':
        return <Badge variant="default">Approved Reduced</Badge>;
      case 'reject':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) return '$0.00';
    const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numValue)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
            <p className="text-muted-foreground">Loading consistency report...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show generate button if no report exists or error occurred
  if (error || !report) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10">
              <Scale className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <CardTitle>Consistency Check</CardTitle>
              <CardDescription className="mt-1">
                Run AI-powered consistency analysis to detect trading pattern violations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Report Available</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md">
              {error?.message || 'Consistency report has not been generated for this payout yet. Click the button below to generate one.'}
            </p>
            <Button
              onClick={handleRefresh}
              disabled={refreshMutation.isPending}
              size="lg"
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              {refreshMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Analysis...
                </>
              ) : (
                <>
                  <Scale className="mr-2 h-4 w-4" />
                  Generate Consistency Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get analysis from the nested structure
  const analysis = report.analysis?.consistency_analysis;

  // Show results
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-indigo-500/20">
        <CardHeader className="bg-gradient-to-r from-indigo-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10">
                <Scale className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <CardTitle>Consistency Check Result</CardTitle>
                <CardDescription className="mt-1 flex flex-col gap-1">
                  <span>Report ID: {report.report_id}</span>
                  {report.created_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Generated: {format(new Date(report.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshMutation.isPending}
            >
              {refreshMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-run
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Account Info & Applicability */}
          <div className="flex flex-wrap gap-4 mb-6 p-3 rounded-lg bg-muted/30">
            {report.account_id && (
              <div>
                <span className="text-xs text-muted-foreground">Account ID:</span>
                <span className="ml-2 font-mono font-medium">{report.account_id}</span>
              </div>
            )}
            {(report.account_type || analysis?.account_type) && (
              <div>
                <span className="text-xs text-muted-foreground">Account Type:</span>
                <span className="ml-2 font-medium">{report.account_type || analysis?.account_type}</span>
              </div>
            )}
            {analysis?.applicable !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Consistency Applicable:</span>
                <Badge variant={analysis.applicable ? "default" : "secondary"} className="gap-1">
                  {analysis.applicable ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Yes
                    </>
                  ) : (
                    <>
                      <MinusCircle className="h-3 w-3" />
                      No
                    </>
                  )}
                </Badge>
              </div>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {/* Applicable Status */}
            {analysis?.applicable !== undefined && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-transparent border hover:shadow-md transition-all">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Applicable</p>
                <Badge variant={analysis.applicable ? "default" : "secondary"} className="gap-1 text-sm">
                  {analysis.applicable ? 'Yes' : 'No'}
                </Badge>
              </div>
            )}

            {/* Verdict */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border hover:shadow-md transition-all">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Verdict</p>
              <div className="mt-1">{getVerdictBadge(report.verdict)}</div>
            </div>

            {/* Approved Amount */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/5 to-transparent border hover:shadow-md transition-all">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Approved Amount
              </p>
              <p className={cn(
                "text-2xl font-bold",
                report.approved_amount > 0 ? "text-green-600" : "text-muted-foreground"
              )}>
                {formatCurrency(report.approved_amount)}
              </p>
            </div>

            {/* Deduction Percentage */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/5 to-transparent border hover:shadow-md transition-all">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                <Percent className="h-3 w-3" />
                Deduction
              </p>
              {(() => {
                const totalProfit = analysis?.financial_summary?.total_cycle_profit || 0;
                const totalDeductions = analysis?.financial_summary?.total_deductions || 0;
                const calculatedDeductionPercent = totalProfit > 0 ? (totalDeductions / totalProfit) * 100 : 0;
                return (
                  <p className={cn(
                    "text-2xl font-bold",
                    calculatedDeductionPercent > 0 ? "text-orange-600" : "text-green-600"
                  )}>
                    {calculatedDeductionPercent.toFixed(2)}%
                  </p>
                );
              })()}
            </div>

            {/* Payout Status */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/5 to-transparent border hover:shadow-md transition-all">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Payout Status</p>
              <div className="mt-1">{getPayoutStatusBadge(report.payout_status)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      {analysis?.financial_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Cycle Profit</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(analysis.financial_summary.total_cycle_profit)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">30% Threshold</p>
                <p className="text-lg font-bold">{formatCurrency(analysis.financial_summary.threshold_30_percent)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Deductions</p>
                <p className={cn("text-lg font-bold", analysis.financial_summary.total_deductions > 0 ? "text-orange-600" : "text-green-600")}>
                  {formatCurrency(analysis.financial_summary.total_deductions)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Deduction %</p>
                {(() => {
                  const calculatedDeductionPercent = analysis.financial_summary.total_cycle_profit > 0
                    ? (analysis.financial_summary.total_deductions / analysis.financial_summary.total_cycle_profit) * 100
                    : 0;
                  return (
                    <p className={cn("text-lg font-bold", calculatedDeductionPercent > 0 ? "text-orange-600" : "text-green-600")}>
                      {calculatedDeductionPercent.toFixed(2)}%
                    </p>
                  );
                })()}
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Adjusted Profit</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(analysis.financial_summary.adjusted_profit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Summary */}
      {analysis?.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Violation Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Daily Violations</p>
                <p className={cn("text-lg font-bold", analysis.summary.total_daily_violations > 0 ? "text-red-600" : "text-green-600")}>
                  {analysis.summary.total_daily_violations}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Single Trade Violations</p>
                <p className={cn("text-lg font-bold", analysis.summary.total_single_trade_violations > 0 ? "text-red-600" : "text-green-600")}>
                  {analysis.summary.total_single_trade_violations}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Aggregated Violations</p>
                <p className={cn("text-lg font-bold", analysis.summary.total_aggregated_violations > 0 ? "text-red-600" : "text-green-600")}>
                  {analysis.summary.total_aggregated_violations}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Lot Size Violations</p>
                <p className={cn("text-lg font-bold", analysis.summary.total_lot_violations > 0 ? "text-red-600" : "text-green-600")}>
                  {analysis.summary.total_lot_violations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Calculation */}
      {analysis?.payout_calculation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-green-500" />
              Payout Calculation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border bg-muted/20">
                <p className="text-xs text-muted-foreground mb-1">Original Profit</p>
                <p className="text-xl font-bold">{formatCurrency(analysis.payout_calculation.original_profit)}</p>
              </div>
              <div className="p-4 rounded-lg border bg-orange-500/10">
                <p className="text-xs text-muted-foreground mb-1">Total Deductions</p>
                <p className="text-xl font-bold text-orange-600">-{formatCurrency(analysis.payout_calculation.total_deductions)}</p>
              </div>
              <div className="p-4 rounded-lg border bg-green-500/10">
                <p className="text-xs text-muted-foreground mb-1">Approved Payout</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(analysis.payout_calculation.approved_payout)}</p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <div className="mt-1">{getPayoutStatusBadge(analysis.payout_calculation.payout_status)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classification */}
      {analysis?.classification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-blue-500" />
              Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className="font-semibold">{analysis.classification.status}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Severity Level</p>
                <Badge variant={analysis.classification.severity_level === 'severe' ? 'destructive' : 'secondary'}>
                  {analysis.classification.severity_level}
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Verdict</p>
                {getVerdictBadge(analysis.classification.verdict)}
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Deduction %</p>
                <p className={cn("font-semibold", parseFloat(String(analysis.classification.deduction_percentage || 0)) > 0 ? "text-orange-600" : "text-green-600")}>
                  {parseFloat(String(analysis.classification.deduction_percentage || 0)).toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Violation Details */}
      {(analysis?.daily_violations?.length > 0 || 
        analysis?.single_trade_violations?.length > 0 ||
        analysis?.aggregated_trade_violations?.length > 0 ||
        analysis?.lot_size_violations?.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Violation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Daily Violations */}
            {analysis.daily_violations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-orange-500" />
                  Daily Violations ({analysis.daily_violations.length})
                </h4>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                        <TableHead className="text-right">Threshold</TableHead>
                        <TableHead className="text-right">Deduction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.daily_violations.map((v, i) => (
                        <TableRow key={i}>
                          <TableCell>{v.date}</TableCell>
                          <TableCell className="text-right">{formatCurrency(parseFloat(String(v.profit || (v as any).daily_profit || 0)))}</TableCell>
                          <TableCell className="text-right text-red-600">{parseFloat(String(v.percentage_of_total || (v as any).percentage || 0)).toFixed(1)}%</TableCell>
                          <TableCell className="text-right">{formatCurrency(v.threshold)}</TableCell>
                          <TableCell className="text-right text-orange-600">{formatCurrency(v.deduction)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Single Trade Violations */}
            {analysis.single_trade_violations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Single Trade Violations ({analysis.single_trade_violations.length})
                </h4>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket ID</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Date/Time</TableHead>
                        <TableHead className="text-right">Trade Profit</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                        <TableHead className="text-right">Threshold</TableHead>
                        <TableHead className="text-right">Exceeded By</TableHead>
                        <TableHead className="text-right">Deduction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.single_trade_violations.map((v, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{v.ticket_id}</TableCell>
                          <TableCell>{v.symbol}</TableCell>
                          <TableCell>{v.date} {v.time}</TableCell>
                          <TableCell className="text-right">{formatCurrency(parseFloat(String(v.trade_profit || 0)))}</TableCell>
                          <TableCell className="text-right text-red-600">{parseFloat(String(v.percentage_of_total || (v as any).percentage || 0)).toFixed(2)}%</TableCell>
                          <TableCell className="text-right">{formatCurrency(parseFloat(String(v.threshold || 0)))}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(parseFloat(String(v.exceeded_by || 0)))}</TableCell>
                          <TableCell className="text-right text-orange-600">{formatCurrency(parseFloat(String(v.deduction || 0)))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Aggregated Trade Violations */}
            {analysis.aggregated_trade_violations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-orange-500" />
                  Aggregated Trade Violations ({analysis.aggregated_trade_violations.length})
                </h4>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tickets</TableHead>
                        <TableHead className="text-right">Combined Profit</TableHead>
                        <TableHead className="text-right">Threshold</TableHead>
                        <TableHead className="text-right">Deduction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.aggregated_trade_violations.map((v, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{v.tickets?.join(', ')}</TableCell>
                          <TableCell className="text-right">{formatCurrency(v.combined_profit)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(v.threshold)}</TableCell>
                          <TableCell className="text-right text-orange-600">{formatCurrency(v.deduction)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Lot Size Violations */}
            {analysis.lot_size_violations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-orange-500" />
                  Lot Size Violations ({analysis.lot_size_violations.length})
                </h4>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket ID</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead className="text-right">Lot Size</TableHead>
                        <TableHead className="text-right">Average Lot</TableHead>
                        <TableHead className="text-right">Min Allowed</TableHead>
                        <TableHead className="text-right">Max Allowed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.lot_size_violations.map((v, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{v.ticket_id}</TableCell>
                          <TableCell>{v.symbol}</TableCell>
                          <TableCell>
                            <Badge variant={v.severity === 'warning' ? 'secondary' : 'destructive'}>
                              {v.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-red-600">{parseFloat(String(v.lot_size || 0)).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{parseFloat(String(v.average_lot || 0)).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{parseFloat(String(v.min_allowed || 0)).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{parseFloat(String(v.max_allowed || 0)).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Violations Message */}
      {analysis && 
        !analysis.daily_violations?.length && 
        !analysis.single_trade_violations?.length &&
        !analysis.aggregated_trade_violations?.length &&
        !analysis.lot_size_violations?.length && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-700">No consistency violations detected.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysis?.recommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.recommendations.internal_notes && (
              <div className="p-4 rounded-lg bg-muted/30 border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Internal Notes</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {analysis.recommendations.internal_notes}
                </p>
              </div>
            )}
            {analysis.recommendations.message_to_trader && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Message to Trader</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {analysis.recommendations.message_to_trader}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reason (Fallback if no analysis) */}
      {report.reason && !analysis?.recommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              Analysis Reason
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {report.reason}
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Debug Section - Only visible to specific user */}
      {profile?.email === 'nexada@we-fund.com' && (report.ai_request || report.ai_raw_response || report.ai_parsed_response) && (
        <Card className="border-dashed border-muted-foreground/30">
          <Collapsible open={isDebugOpen} onOpenChange={setIsDebugOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <Bug className="h-5 w-5 text-muted-foreground" />
                    AI Debug Information
                  </div>
                  {isDebugOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {report.ai_request && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Code className="h-3 w-3" />
                      AI Request
                    </p>
                    <pre className="p-3 rounded-lg bg-muted/50 border text-xs overflow-auto max-h-64">
                      {JSON.stringify(report.ai_request, null, 2)}
                    </pre>
                  </div>
                )}
                {report.ai_raw_response && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      AI Raw Response
                    </p>
                    <pre className="p-3 rounded-lg bg-muted/50 border text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                      {report.ai_raw_response}
                    </pre>
                  </div>
                )}
                {report.ai_parsed_response && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Code className="h-3 w-3" />
                      AI Parsed Response
                    </p>
                    <pre className="p-3 rounded-lg bg-muted/50 border text-xs overflow-auto max-h-64">
                      {JSON.stringify(report.ai_parsed_response, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Feedback Section - Only visible to users with risk dashboard permission */}
      {hasPermission('risk.view_dashboard') && (
        <Card className="border border-border/50">
          <CardContent className="p-6">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConsistencyCheckTab;
