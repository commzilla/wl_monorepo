import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  ShieldAlert, 
  TrendingDown, 
  TrendingUp, 
  DollarSign,
  Calendar,
  Hash,
  Target,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskViolation {
  rule_code: string;
  rule_name: string;
  category: string;
  severity: number;
  account_id: number;
  order_id: number;
  symbol: string;
  description: string;
  affected_pnl: string;
  meta: Record<string, any>;
}

interface RiskReportData {
  version: string;
  payout_id: string;
  trader_id: string;
  enrollment_id: string;
  account_ids: number[];
  account_size: number;
  currency: string;
  generated_at: string;
  scan_window?: {
    start: string | null;
    end: string | null;
    is_custom?: boolean;
    last_payout_time?: string | null;
  };
  summary: {
    total_violations: number;
    max_severity: number;
    global_score: number;
    recommended_action: string;
  };
  violations: RiskViolation[];
}

interface RiskReportViewerProps {
  report: RiskReportData;
  totalProfit?: number;
  profitShare?: number;
  scanWindow?: {
    start: string | null;
    end: string | null;
    is_custom?: boolean;
    last_payout_time?: string | null;
  };
  challengeStartDate?: string;
}

const RiskReportViewer: React.FC<RiskReportViewerProps> = ({ report, totalProfit, profitShare, scanWindow, challengeStartDate }) => {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());

  const toggleAccount = (accountId: number) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 75) return 'destructive';
    if (severity >= 50) return 'default';
    return 'secondary';
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'reject':
        return 'destructive';
      case 'manual_review':
        return 'default';
      case 'approve':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 5000) return 'text-red-500';
    if (score >= 3000) return 'text-orange-500';
    if (score >= 1000) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Filter out violations with negative P&L impact
  const filteredViolations = useMemo(() => {
    return report.violations.filter((v) => parseFloat(v.affected_pnl) >= 0);
  }, [report.violations]);

  // Group violations by rule
  const groupedViolations = useMemo(() => {
    const grouped: Record<string, RiskViolation[]> = {};
    filteredViolations.forEach((violation) => {
      if (!grouped[violation.rule_name]) {
        grouped[violation.rule_name] = [];
      }
      grouped[violation.rule_name].push(violation);
    });
    return grouped;
  }, [filteredViolations]);

  // Group violations by account
  const accountGroupedViolations = useMemo(() => {
    const grouped: Record<number, RiskViolation[]> = {};
    filteredViolations.forEach((violation) => {
      if (!grouped[violation.account_id]) {
        grouped[violation.account_id] = [];
      }
      grouped[violation.account_id].push(violation);
    });
    return grouped;
  }, [filteredViolations]);

  // Calculate statistics (using filtered violations - only positive P&L)
  const stats = useMemo(() => {
    const totalPnl = filteredViolations.reduce(
      (sum, v) => sum + parseFloat(v.affected_pnl),
      0
    );

    return {
      totalPnl,
      positivePnl: totalPnl, // All filtered violations have positive P&L
      negativePnl: 0,
      violatedOrders: new Set(filteredViolations.map((v) => v.order_id)).size,
    };
  }, [filteredViolations]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Rule Summary */}
      {Object.keys(groupedViolations).length > 0 && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Rule Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead className="text-right">Occurrences</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedViolations).map(([ruleName, violations]) => (
                  <TableRow key={ruleName}>
                    <TableCell className="font-medium">{ruleName}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{violations.length}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* P&L Impact Summary & Recommendation */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            P&L Impact Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Total Affected P&L
              </div>
              <div className="text-3xl font-bold text-red-500">
                -{report.currency} {stats.positivePnl.toFixed(2)}
              </div>
            </div>
            
            {totalProfit && totalProfit > 0 && (
              (() => {
                const deductionPercent = (stats.positivePnl / totalProfit) * 100;
                const isReject = deductionPercent >= 10;
                const isApprove = deductionPercent === 0;
                
                return (
                  <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Deduction Percentage</div>
                      <div className={cn(
                        "text-2xl font-bold",
                        isReject ? "text-red-500" : isApprove ? "text-green-500" : "text-yellow-500"
                      )}>
                        {deductionPercent.toFixed(2)}%
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Recommendation</div>
                      {isApprove ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                          Approve Full Payout
                        </Badge>
                      ) : isReject ? (
                        <Badge variant="destructive">
                          Negate Payout
                        </Badge>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                            Deduct from Total
                          </Badge>
                          {(() => {
                            const sharePercent = profitShare || 100;
                            const deductionAmount = stats.positivePnl * (sharePercent / 100);
                            return (
                              <p className="text-sm text-muted-foreground">
                                Deduct {report.currency} {deductionAmount.toFixed(2)} from payout
                                {profitShare && profitShare !== 100 && (
                                  <span className="text-xs ml-1">
                                    ({stats.positivePnl.toFixed(2)} × {sharePercent}% share)
                                  </span>
                                )}
                              </p>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </CardContent>
      </Card>

      {/* Violations */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Violations Detail</CardTitle>
              <CardDescription>
                Detailed breakdown of all {report.summary.total_violations} detected violations
              </CardDescription>
            </div>
            {(() => {
              const sw = scanWindow || report.scan_window;
              if (!sw || !sw.end) return null;
              
              // Use challengeStartDate as fallback when scan_window.start is null
              const startDate = sw.start || challengeStartDate;
              
              return (
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {startDate ? (
                    <>Analysis from {new Date(startDate).toLocaleDateString('en-GB')} to {new Date(sw.end).toLocaleDateString('en-GB')}</>
                  ) : (
                    <>Analysis until {new Date(sw.end).toLocaleDateString('en-GB')}</>
                  )}
                </div>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-3">
              <TabsTrigger value="account">By Account</TabsTrigger>
              <TabsTrigger value="grouped">By Rule</TabsTrigger>
              <TabsTrigger value="all">All Violations</TabsTrigger>
            </TabsList>

            {/* Account-wise View */}
            <TabsContent value="account" className="space-y-4 mt-4">
              {Object.entries(accountGroupedViolations).map(([accountId, violations]) => {
                const totalPnl = violations.reduce((sum, v) => sum + parseFloat(v.affected_pnl), 0);
                const maxSeverity = Math.max(...violations.map((v) => v.severity));
                const uniqueRules = new Set(violations.map((v) => v.rule_name)).size;
                const hasMultipleAccounts = Object.keys(accountGroupedViolations).length > 1;
                const isExpanded = expandedAccounts.has(Number(accountId));

                const accountCard = (
                  <Card key={accountId} className="border-2 hover-scale">
                    <CardHeader className="bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                            <Hash className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">MT5 Account: {accountId}</CardTitle>
                            <CardDescription className="text-sm">
                              {violations.length} violations • {uniqueRules} rule types
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium text-muted-foreground">Total Impact</div>
                            <div className="text-2xl font-bold text-red-500">
                              -{report.currency} {Math.abs(totalPnl).toFixed(2)}
                            </div>
                          </div>
                          <Badge variant={getSeverityColor(maxSeverity)} className="text-sm px-3 py-1">
                            Max Severity {maxSeverity}
                          </Badge>
                          {hasMultipleAccounts && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleAccount(Number(accountId))}
                            >
                              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <Collapsible open={!hasMultipleAccounts || isExpanded}>
                      <CollapsibleContent>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Rule</TableHead>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Symbol</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">P&L Impact</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {violations.map((violation, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium text-sm">{violation.rule_name}</div>
                                      <div className="text-xs text-muted-foreground">{violation.rule_code}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{violation.order_id}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{violation.symbol}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={getSeverityColor(violation.severity)}>{violation.severity}</Badge>
                                  </TableCell>
                                  <TableCell className="max-w-md">
                                    <p className="text-sm">{violation.description}</p>
                                    {violation.meta && Object.keys(violation.meta).length > 0 && (
                                      <details className="mt-1">
                                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                          View metadata
                                        </summary>
                                        <pre className="text-xs mt-1 p-2 bg-muted rounded">
                                          {JSON.stringify(violation.meta, null, 2)}
                                        </pre>
                                      </details>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className={cn(
                                      "font-semibold",
                                      parseFloat(violation.affected_pnl) >= 0 ? "text-green-500" : "text-red-500"
                                    )}>
                                      {parseFloat(violation.affected_pnl) >= 0 ? "+" : ""}
                                      {report.currency} {parseFloat(violation.affected_pnl).toFixed(2)}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );

                return accountCard;
              })}
            </TabsContent>

            {/* Grouped View */}
            <TabsContent value="grouped" className="space-y-4 mt-4">
              {Object.entries(groupedViolations).map(([ruleName, violations]) => {
                const totalPnl = violations.reduce((sum, v) => sum + parseFloat(v.affected_pnl), 0);
                const avgSeverity = violations.reduce((sum, v) => sum + v.severity, 0) / violations.length;

                return (
                  <Card key={ruleName} className="border-2 hover-scale">
                    <CardHeader className="bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className={cn(
                              "h-6 w-6",
                              avgSeverity >= 75 ? "text-red-500" : avgSeverity >= 50 ? "text-orange-500" : "text-yellow-500"
                            )} />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{ruleName}</CardTitle>
                            <CardDescription className="text-sm">
                              {violations[0].rule_code} • {violations.length} occurrences
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium text-muted-foreground">Total Impact</div>
                            <div className="text-2xl font-bold text-red-500">
                              -{report.currency} {Math.abs(totalPnl).toFixed(2)}
                            </div>
                          </div>
                          <Badge variant={getSeverityColor(avgSeverity)} className="text-sm px-3 py-1">
                            Severity {avgSeverity.toFixed(0)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Symbol</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">P&L Impact</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {violations.map((violation, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">{violation.order_id}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{violation.symbol}</Badge>
                              </TableCell>
                              <TableCell className="max-w-md">
                                <p className="text-sm">{violation.description}</p>
                                {violation.meta && Object.keys(violation.meta).length > 0 && (
                                  <details className="mt-1">
                                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                      View metadata
                                    </summary>
                                    <pre className="text-xs mt-1 p-2 bg-muted rounded">
                                      {JSON.stringify(violation.meta, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={cn(
                                  "font-semibold",
                                  parseFloat(violation.affected_pnl) >= 0 ? "text-green-500" : "text-red-500"
                                )}>
                                  {parseFloat(violation.affected_pnl) >= 0 ? "+" : ""}
                                  {report.currency} {parseFloat(violation.affected_pnl).toFixed(2)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* All Violations View */}
            <TabsContent value="all" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">P&L Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.violations.map((violation, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{violation.rule_name}</div>
                          <div className="text-xs text-muted-foreground">{violation.rule_code}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{violation.order_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{violation.symbol}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(violation.severity)}>{violation.severity}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md text-sm">{violation.description}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-semibold",
                          parseFloat(violation.affected_pnl) >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {parseFloat(violation.affected_pnl) >= 0 ? "+" : ""}
                          {report.currency} {parseFloat(violation.affected_pnl).toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recommendation Alert */}
      <Alert variant={report.summary.recommended_action === 'reject' ? 'destructive' : 'default'}>
        <Target className="h-4 w-4" />
        <AlertTitle>Recommended Action: {report.summary.recommended_action.replace('_', ' ').toUpperCase()}</AlertTitle>
        <AlertDescription>
          {report.summary.recommended_action === 'reject' && (
            <>This payout request should be rejected due to high-severity violations and elevated risk score.</>
          )}
          {report.summary.recommended_action === 'manual_review' && (
            <>This payout request requires manual review before approval. Review all violations carefully.</>
          )}
          {report.summary.recommended_action === 'approve' && (
            <>This payout request can be approved. All violations are within acceptable thresholds.</>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default RiskReportViewer;
