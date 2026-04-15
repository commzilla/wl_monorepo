import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrentPhase, Phase } from '@/lib/types/enrollmentReview';
import { Target, TrendingDown, Calendar, DollarSign, AlertTriangle, CheckCircle, Clock as ClockIcon, TrendingUp, Shield, Zap, BarChart3 } from 'lucide-react';
import { enrollmentReviewService, AccountMetrics } from '@/services/enrollmentReviewService';
import { toast } from 'sonner';

interface CurrentPhaseTabProps {
  currentPhase: CurrentPhase | null;
  phases?: Phase[];
  enrollmentStatus?: string;
  accountSize?: number;
  enrollmentId?: string;
}

const CurrentPhaseTab: React.FC<CurrentPhaseTabProps> = ({ currentPhase, phases = [], enrollmentStatus, accountSize: propAccountSize, enrollmentId }) => {
  const [metrics, setMetrics] = useState<AccountMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!enrollmentId) return;
      
      setLoadingMetrics(true);
      try {
        const response = await enrollmentReviewService.getAccountMetrics(enrollmentId);
        setMetrics(response.metrics);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        toast.error('Failed to load account metrics');
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchMetrics();
  }, [enrollmentId]);
  const formatPhaseType = (phaseType: string) => {
    switch (phaseType) {
      case 'phase-1': return 'Phase 1';
      case 'phase-2': return 'Phase 2';
      case 'live-trader': return 'Live Trader';
      case 'failed': return 'Failed';
      default: return phaseType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getPhaseIcon = (phaseType: string, isCurrent: boolean, isCompleted: boolean = false) => {
    if (phaseType === 'failed') {
      return <AlertTriangle className="h-6 w-6 text-destructive" />;
    }
    
    if (isCurrent) {
      return <Zap className="h-6 w-6 text-warning" />;
    }
    
    if (isCompleted) {
      return <CheckCircle className="h-6 w-6 text-success" />;
    }
    
    switch (phaseType) {
      case 'phase-1':
        return <Target className="h-6 w-6 text-primary" />;
      case 'phase-2':
        return <Shield className="h-6 w-6 text-secondary" />;
      case 'live-trader':
        return <CheckCircle className="h-6 w-6 text-success" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getPhaseStatusText = (phase: Phase, isFailedEnrollment: boolean, allPhases: Phase[]) => {
    if (isFailedEnrollment && phase.is_current) {
      return 'Failed';
    }
    if (phase.is_current) {
      return 'In Progress';
    }
    
    // Check if this phase should be marked as completed
    const currentPhase = allPhases.find(p => p.is_current);
    if (currentPhase) {
      const phaseOrder = ['phase-1', 'phase-2', 'live-trader'];
      const currentPhaseIndex = phaseOrder.indexOf(currentPhase.phase_type);
      const thisPhaseIndex = phaseOrder.indexOf(phase.phase_type);
      
      if (thisPhaseIndex < currentPhaseIndex) {
        return 'Completed';
      }
    }
    
    return 'Pending';
  };

  const formatCurrency = (amount: number, percentage: number) => {
    return `${percentage}% ($${amount.toLocaleString()})`;
  };

  const isFailedEnrollment = enrollmentStatus === 'failed' || enrollmentStatus === 'breached';
  
  // For failed enrollments, only show current phase or create a failed phase
  let displayPhases = phases;
  if (isFailedEnrollment) {
    const currentPhaseData = phases.find(phase => phase.is_current);
    if (currentPhaseData) {
      displayPhases = [currentPhaseData];
    } else {
      // Create a synthetic failed phase if no current phase exists
      displayPhases = [{
        phase_type: 'failed',
        trading_period: 'N/A',
        min_trading_days: 'N/A',
        max_daily_loss: 0,
        max_loss: 0,
        is_current: true
      }];
    }
  }

  // Use the account size from props, fallback to a reasonable default
  const accountSize = propAccountSize || 50000;

  const sortedPhases = [...displayPhases].sort((a, b) => {
    // Define phase order for proper progression
    const phaseOrder = { 'phase-1': 1, 'phase-2': 2, 'live-trader': 3, 'failed': 4 };
    return (phaseOrder[a.phase_type as keyof typeof phaseOrder] || 999) - 
           (phaseOrder[b.phase_type as keyof typeof phaseOrder] || 999);
  });

  // Determine challenge type from phases
  const getChallengeType = () => {
    const hasPhase2 = phases.some(phase => phase.phase_type === 'phase-2');
    const hasPhase1 = phases.some(phase => phase.phase_type === 'phase-1');
    const onlyLiveTrader = phases.length === 1 && phases.some(phase => phase.phase_type === 'live-trader');
    
    if (onlyLiveTrader) {
      return '10x Program (1-Step Challenge)';
    } else if (hasPhase2) {
      return '2-Step Challenge';
    } else {
      return '1-Step Challenge';
    }
  };

  const challengeType = getChallengeType();
  
  // Get progression flow
  const getProgressionFlow = () => {
    const hasPhase2 = phases.some(phase => phase.phase_type === 'phase-2');
    const hasPhase1 = phases.some(phase => phase.phase_type === 'phase-1');
    const onlyLiveTrader = phases.length === 1 && phases.some(phase => phase.phase_type === 'live-trader');
    
    if (onlyLiveTrader) {
      return ['Live Trader'];
    } else if (hasPhase2) {
      return ['Phase 1', 'Phase 2', 'Live Trader'];
    } else {
      return ['Phase 1', 'Live Trader'];
    }
  };

  const progressionFlow = getProgressionFlow();

  const currentPhaseData = displayPhases.find(phase => phase.is_current);

  // Calculate daily drawdown when API returns null but phase data exists
  const getDisplayDailyDrawdown = () => {
    if (metrics?.daily_drawdown?.amount !== null && metrics?.daily_drawdown?.percentage !== null) {
      return `$${metrics.daily_drawdown.amount.toLocaleString()} (${metrics.daily_drawdown.percentage.toFixed(4)}%)`;
    }
    
    // Fallback calculation when API returns null but we have phase data
    if (currentPhaseData && typeof currentPhaseData.max_daily_loss === 'number' && metrics?.daily_starting_balance) {
      const percentage = currentPhaseData.max_daily_loss;
      const amount = (metrics.daily_starting_balance * percentage) / 100;
      return `$${amount.toFixed(2)} (${percentage.toFixed(4)}%)`;
    }
    
    return '-';
  };

  // Calculate profit target when API returns null but phase data exists
  const getDisplayProfitTarget = () => {
    if (metrics?.profit_target?.amount !== null && metrics?.profit_target?.percentage !== null) {
      return `$${metrics.profit_target.amount.toLocaleString()} (${metrics.profit_target.percentage.toFixed(4)}%)`;
    }
    
    // Fallback calculation when API returns null but we have phase data
    if (currentPhaseData && typeof currentPhaseData.profit_target === 'number' && metrics?.initial_balance) {
      const percentage = currentPhaseData.profit_target;
      const amount = (metrics.initial_balance * percentage) / 100;
      return `$${amount.toFixed(2)} (${percentage.toFixed(4)}%)`;
    }
    
    // Show $0.00 (0.0000%) when profit_target is null (like for live traders)
    return '$0.00 (0.0000%)';
  };

  return (
    <div className="space-y-8">
      {/* Challenge Rules Table - Primary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-6 w-6" />
            Challenge Rules & Limits
          </CardTitle>
          <div className="mt-4 space-y-3">
            <div className="text-lg font-semibold text-primary">
              {challengeType} Accounts
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Progression Flow:</span>
              {progressionFlow.map((phase, index) => (
                <React.Fragment key={phase}>
                  <span className={`px-2 py-1 rounded-md font-medium ${
                    sortedPhases.some(p => formatPhaseType(p.phase_type) === phase && p.is_current)
                      ? 'bg-warning text-warning-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {phase}
                  </span>
                  {index < progressionFlow.length - 1 && (
                    <span className="text-muted-foreground">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Phase</TableHead>
                <TableHead className="font-semibold">Profit Target</TableHead>
                <TableHead className="font-semibold">Max Daily Loss</TableHead>
                <TableHead className="font-semibold">Max Total Loss</TableHead>
                <TableHead className="font-semibold">Min Days</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPhases.map((phase) => (
                <TableRow key={phase.phase_type} className={`
                  ${isFailedEnrollment && phase.is_current ? 'bg-destructive/10' : ''}
                  ${!isFailedEnrollment && phase.is_current ? 'bg-warning/10' : ''}
                `}>
                  <TableCell className="font-medium">
                    {formatPhaseType(phase.phase_type)}
                  </TableCell>
                  <TableCell>
                    {phase.profit_target ? (
                      <span className="text-success font-medium">
                        {formatCurrency(accountSize * (phase.profit_target / 100), phase.profit_target)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No Target</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-destructive font-medium">
                      {formatCurrency(accountSize * (phase.max_daily_loss / 100), phase.max_daily_loss)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-destructive font-medium">
                      {formatCurrency(accountSize * (phase.max_loss / 100), phase.max_loss)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{phase.min_trading_days}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`
                      ${isFailedEnrollment && phase.is_current ? 'bg-destructive text-destructive-foreground' : ''}
                      ${!isFailedEnrollment && phase.is_current ? 'bg-warning text-warning-foreground' : ''}
                      ${getPhaseStatusText(phase, isFailedEnrollment, phases) === 'Completed' ? 'bg-success text-success-foreground' : ''}
                      ${getPhaseStatusText(phase, isFailedEnrollment, phases) === 'Pending' ? 'bg-muted text-muted-foreground' : ''}
                    `}>
                      {getPhaseStatusText(phase, isFailedEnrollment, phases)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Account Metrics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Account Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMetrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-card/50 rounded-lg p-4 border">
                  <div className="h-4 bg-muted animate-pulse rounded mb-2"></div>
                  <div className="h-8 bg-muted animate-pulse rounded"></div>
                </div>
              ))}
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Initial Balance */}
              <div className="bg-card/80 rounded-lg p-4 border hover:bg-card/90 transition-colors">
                <div className="text-sm font-medium text-muted-foreground mb-1">Initial balance</div>
                <div className="text-lg font-bold">${metrics.initial_balance?.toLocaleString() || '0.00'}</div>
              </div>

              {/* Live Account Balance */}
              <div className="bg-card/80 rounded-lg p-4 border hover:bg-card/90 transition-colors">
                <div className="text-sm font-medium text-muted-foreground mb-1">Live account balance</div>
                <div className="text-lg font-bold">${metrics.live_balance?.toLocaleString() || '0.00'}</div>
              </div>

              {/* Live Account Equity */}
              <div className="bg-card/80 rounded-lg p-4 border hover:bg-card/90 transition-colors">
                <div className="text-sm font-medium text-muted-foreground mb-1">Live account equity</div>
                <div className="text-lg font-bold">${metrics.live_equity?.toLocaleString() || '0.00'}</div>
              </div>

              {/* Profit Loss */}
              <div className="bg-card/80 rounded-lg p-4 border hover:bg-card/90 transition-colors">
                <div className="text-sm font-medium text-muted-foreground mb-1">Profit loss</div>
                <div className={`text-lg font-bold ${(metrics.profit_loss || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ${metrics.profit_loss?.toLocaleString() || '0.00'}
                </div>
              </div>

              {/* Daily Starting Balance */}
              <div className="bg-card/80 rounded-lg p-4 border hover:bg-card/90 transition-colors">
                <div className="text-sm font-medium text-muted-foreground mb-1">Daily starting balance</div>
                <div className="text-lg font-bold">
                  {metrics.daily_starting_balance ? `$${metrics.daily_starting_balance.toLocaleString()}` : '-'}
                </div>
              </div>

              {/* Daily Drawdown Amount */}
              <div className="bg-card/80 rounded-lg p-4 border hover:bg-card/90 transition-colors">
                <div className="text-sm font-medium text-muted-foreground mb-1">Daily Drawdown Amount</div>
                <div className="text-lg font-bold">
                  {getDisplayDailyDrawdown()}
                </div>
              </div>

              {/* Profit Target Amount */}
              <div className="bg-card/80 rounded-lg p-4 border hover:bg-card/90 transition-colors">
                <div className="text-sm font-medium text-muted-foreground mb-1">Profit Target Amount</div>
                <div className="text-lg font-bold">
                  {getDisplayProfitTarget()}
                </div>
              </div>

              {/* Global Drawdown Amount */}
              <div className="bg-card/80 rounded-lg p-4 border hover:bg-card/90 transition-colors">
                <div className="text-sm font-medium text-muted-foreground mb-1">Global Drawdown Amount</div>
                <div className="text-lg font-bold">
                  {metrics.global_drawdown?.amount !== null && metrics.global_drawdown?.percentage !== null
                    ? `$${metrics.global_drawdown.amount.toLocaleString()} (${metrics.global_drawdown.percentage.toFixed(4)}%)`
                    : '-'
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load metrics data
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Management & Progress */}
      {currentPhaseData && !isFailedEnrollment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Management & Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Starting Balances Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily Starting Balance */}
                {currentPhaseData.daily_starting_balance !== null && currentPhaseData.daily_starting_balance !== undefined && (
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Daily Starting Balance</h4>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      ${currentPhaseData.daily_starting_balance?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                )}

                {/* Daily Starting Equity */}
                {currentPhaseData.daily_starting_equity !== null && currentPhaseData.daily_starting_equity !== undefined && (
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Daily Starting Equity</h4>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      ${currentPhaseData.daily_starting_equity?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              {/* Risk Progress Bars */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Daily Loss Progress */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <h4 className="font-semibold">Daily Loss Limit</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span className="font-semibold">{currentPhaseData.max_daily_loss}% Max</span>
                    </div>
                    <Progress 
                      value={currentPhaseData.max_daily_loss_left && currentPhaseData.current_balance 
                        ? Math.max(0, 100 - (currentPhaseData.max_daily_loss_left / (currentPhaseData.current_balance * currentPhaseData.max_daily_loss / 100)) * 100)
                        : 0} 
                      className="h-3"
                    />
                    <p className="text-sm text-muted-foreground">
                      Buffer: ${currentPhaseData.max_daily_loss_left?.toLocaleString() || 'N/A'}
                    </p>
                    {currentPhaseData.max_daily_loss_time_remaining && (
                      <div className="flex items-center gap-2 text-sm">
                        <ClockIcon className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Resets in: {currentPhaseData.max_daily_loss_time_remaining}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Total Loss Progress */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    <h4 className="font-semibold">Total Loss Limit</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span className="font-semibold">{currentPhaseData.max_loss}% Max</span>
                    </div>
                    <Progress 
                      value={currentPhaseData.max_total_loss_left && currentPhaseData.current_balance 
                        ? Math.max(0, 100 - (currentPhaseData.max_total_loss_left / (currentPhaseData.current_balance * currentPhaseData.max_loss / 100)) * 100)
                        : 0} 
                      className="h-3"
                    />
                    <p className="text-sm text-muted-foreground">
                      Buffer: ${currentPhaseData.max_total_loss_left?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Profit Target Progress */}
                {currentPhaseData.profit_target && currentPhaseData.profit_target_left !== null && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-success" />
                      <h4 className="font-semibold">Profit Target</h4>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-semibold">{currentPhaseData.profit_target}% Target</span>
                      </div>
                      <Progress 
                        value={currentPhaseData.current_balance && currentPhaseData.profit_target_left 
                          ? Math.max(0, 100 - (currentPhaseData.profit_target_left / (currentPhaseData.current_balance * currentPhaseData.profit_target / 100)) * 100)
                          : 0} 
                        className="h-3"
                      />
                      <p className="text-sm text-muted-foreground">
                        Remaining: ${currentPhaseData.profit_target_left?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CurrentPhaseTab;