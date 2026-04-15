import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, RefreshCw, Loader2, AlertTriangle, Clock, DollarSign, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { riskScanService } from '@/services/riskScanService';
import RiskReportViewer from '@/components/risk/RiskReportViewer';
import { cn } from '@/lib/utils';

interface RiskEngineTabProps {
  payoutId: string | undefined;
  challengeStartDate?: string;
  totalProfit?: number;
}

const RiskEngineTab: React.FC<RiskEngineTabProps> = ({ payoutId, challengeStartDate, totalProfit: externalTotalProfit }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing risk engine report
  const { data: riskEngineReport, isLoading, error, refetch } = useQuery({
    queryKey: ['risk-engine-report', payoutId],
    queryFn: async () => {
      if (!payoutId) throw new Error('Payout ID is required');
      return await riskScanService.getRiskEngineReport(payoutId, false);
    },
    enabled: !!payoutId,
    retry: false,
  });

  // Mutation to refresh/regenerate the report
  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!payoutId) throw new Error('Payout ID is required');
      return await riskScanService.getRiskEngineReport(payoutId, true);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['risk-engine-report', payoutId], data);
      toast({
        title: 'Report Generated',
        description: 'Risk Engine v2 report has been successfully generated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate risk report',
        variant: 'destructive',
      });
    },
  });

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const getSeverityBadge = (severity: string | number | null) => {
    if (severity === null || severity === undefined) return <Badge variant="secondary">Unknown</Badge>;
    const severityStr = String(severity);
    const severityLower = severityStr.toLowerCase();
    if (severityLower === 'high' || parseInt(severityStr) >= 75) {
      return <Badge variant="destructive">{severityStr}</Badge>;
    }
    if (severityLower === 'medium' || parseInt(severityStr) >= 50) {
      return <Badge variant="default">{severityStr}</Badge>;
    }
    return <Badge variant="secondary">{severityStr}</Badge>;
  };

  const getActionBadge = (action: string | null) => {
    if (!action) return <Badge variant="outline">Unknown</Badge>;
    switch (action.toLowerCase()) {
      case 'reject':
        return <Badge variant="destructive">{action.replace('_', ' ').toUpperCase()}</Badge>;
      case 'manual_review':
        return <Badge variant="default">{action.replace('_', ' ').toUpperCase()}</Badge>;
      case 'approve':
        return <Badge className="bg-green-500 hover:bg-green-600">{action.replace('_', ' ').toUpperCase()}</Badge>;
      default:
        return <Badge variant="outline">{action.replace('_', ' ').toUpperCase()}</Badge>;
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 5000) return 'text-red-500';
    if (score >= 3000) return 'text-orange-500';
    if (score >= 1000) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading Risk Engine report...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show generate button if no report exists (using has_report flag from backend)
  const hasValidReport = riskEngineReport?.has_report === true;
  
  if (error || !hasValidReport) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Risk Engine v2</CardTitle>
              <CardDescription className="mt-1">
                Generate comprehensive risk analysis using Risk Engine v2
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
              {error?.message || 'Risk Engine v2 report has not been generated for this payout yet. Click the button below to generate one.'}
            </p>
            <Button
              onClick={handleRefresh}
              disabled={refreshMutation.isPending}
              size="lg"
            >
              {refreshMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Generate Risk Engine Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const scanStart = riskEngineReport.scan_window?.start || challengeStartDate;
  const scanEnd = riskEngineReport.scan_window?.end;

  // Calculate P&L impact and deduction recommendation
  const report = riskEngineReport.report;
  const totalAffectedPnL = Number(report?.summary?.total_affected_pnl || 0);
  
  // Get total profit - prefer external prop, fallback to report data
  const totalProfit = externalTotalProfit ?? (
    report?.violations?.[0]?.meta?.total_cycle_profit 
      ? Number(report.violations[0].meta.total_cycle_profit) 
      : 0
  );
  
  // Calculate deduction percentage
  const deductionPercent = totalProfit > 0 
    ? (totalAffectedPnL / totalProfit) * 100 
    : 0;
  
  // Default profit share percentage (typically 80% for funded accounts)
  const profitSharePercent = 80;
  const deductionAmount = totalAffectedPnL * (profitSharePercent / 100);

  // Get recommendation based on deduction percentage
  const getDeductionRecommendation = () => {
    if (deductionPercent === 0) {
      return {
        label: 'Approve Full Payout',
        variant: 'success' as const,
        icon: CheckCircle,
      };
    } else if (deductionPercent >= 10) {
      return {
        label: 'Negate Payout',
        variant: 'destructive' as const,
        icon: XCircle,
      };
    } else {
      return {
        label: 'Deduct from Total',
        variant: 'warning' as const,
        icon: AlertCircle,
      };
    }
  };

  const recommendation = getDeductionRecommendation();

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Risk Engine v2 Report
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Clock className="h-3 w-3" />
                Generated: {riskEngineReport.generated_at 
                  ? new Date(riskEngineReport.generated_at).toLocaleString() 
                  : 'Unknown'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {/* Analysis Date Range */}
              {scanEnd && (
                <div className="text-sm text-muted-foreground">
                  Analysis from {formatDate(scanStart) || 'N/A'} to {formatDate(scanEnd)}
                </div>
              )}
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
                    Re-scan
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Global Score</p>
              <p className={cn("text-3xl font-bold", getRiskScoreColor(riskEngineReport.global_score || 0))}>
                {(riskEngineReport.global_score || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Max Severity</p>
              <div className="mt-1">
                {getSeverityBadge(riskEngineReport.max_severity)}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Recommended Action</p>
              <div className="mt-1">
                {getActionBadge(riskEngineReport.recommended_action)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Detailed Report */}
      {riskEngineReport.report && (
        <RiskReportViewer 
          report={riskEngineReport.report} 
          totalProfit={totalProfit}
          profitShare={profitSharePercent}
          scanWindow={riskEngineReport.scan_window}
          challengeStartDate={challengeStartDate}
        />
      )}
    </div>
  );
};

export default RiskEngineTab;
