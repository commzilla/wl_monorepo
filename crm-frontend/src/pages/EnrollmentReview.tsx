import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import OverviewTab from '@/components/enrollment-review/OverviewTab';
import CurrentPhaseTab from '@/components/enrollment-review/CurrentPhaseTab';
import AccountsTradesTab from '@/components/enrollment-review/AccountsTradesTab';
import OpenPositionsTab from '@/components/enrollment-review/OpenPositionsTab';
import { DepositWithdrawalTab } from '@/components/enrollment-review/DepositWithdrawalTab';
import { BlockAccountTab } from '@/components/enrollment-review/BlockAccountTab';
import BrokerDetailsTab from '@/components/enrollment-review/BrokerDetailsTab';
import EventLogTab from '@/components/enrollment-review/EventLogTab';
import EnrollmentEventLogsTab from '@/components/enrollment-review/EnrollmentEventLogsTab';
import SnapshotTab from '@/components/enrollment-review/SnapshotTab';
import ScanBreachTab from '@/components/enrollment-review/ScanBreachTab';
import PayoutTab from '@/components/enrollment-review/PayoutTab';
import PayoutHistoryTab from '@/components/enrollment-review/PayoutHistoryTab';
import BreachHistoryTab from '@/components/enrollment-review/BreachHistoryTab';
import MT5TradesTab from '@/components/enrollment-review/MT5TradesTab';
import ManualUpgradeDialog from '@/components/enrollment-review/ManualUpgradeDialog';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { traderService } from '@/services/traderService';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Building, Target, Activity, Eye, TrendingUp, ArrowUpDown, Ban, ScrollText, Camera, Shield, DollarSign, History, UserCheck, Loader2, AlertTriangle, Copy, BarChart3, FileText } from 'lucide-react';
import { toast } from 'sonner';

const TAB_PERMISSIONS: Record<string, string | null> = {
  'accounts': 'enrollments.review',
  'open-positions': 'enrollments.view',
  'phase': 'trades.view',
  'funds': 'trades.view',
  'events': 'system.view_event_logs',
  'broker-details': null,  // no RBAC required
  'block-account': 'mt5.disable_account',
  'snapshot': 'enrollments.view',
  'scan-breach': 'risk.view_dashboard',
  'payout': 'payouts.view_config',
  'payout-history': 'payouts.view',
  'breach-history': 'risk.view_dashboard',
  'event-logs': 'system.view_event_logs',
  'mt5-trades': 'trades.view',
  'overview': 'enrollments.review',
};

const EnrollmentReview: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canAccessTab = (tab: string) => {
    const perm = TAB_PERMISSIONS[tab];
    return perm === null || hasPermission(perm);
  };

  const availableTabs = Object.keys(TAB_PERMISSIONS).filter(canAccessTab);
  const [activeTab, setActiveTab] = useState(availableTabs[0] || 'accounts');

  // Impersonate mutation
  const impersonateMutation = useMutation({
    mutationFn: (userId: string) => traderService.impersonateTrader(userId),
    onSuccess: (data) => {
      const clientUrl = `https://dashboard.we-fund.com/impersonate?ticket=${data.ticket}`;
      window.open(clientUrl, "_blank");
      toast.success(`Successfully impersonating ${enrollmentData?.client_profile.full_name || 'Trader'}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to impersonate trader. Please try again.");
    }
  });

  const handleImpersonate = () => {
    if (enrollmentData?.client_profile.user_id) {
      impersonateMutation.mutate(enrollmentData.client_profile.user_id);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const {
    data: enrollmentData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['enrollment-review', enrollmentId],
    queryFn: () => enrollmentReviewService.getEnrollmentReview(enrollmentId!),
    enabled: !!enrollmentId,
    retry: false
  });

  useEffect(() => {
    if (error) {
      toast.error('Failed to load enrollment data');
    }
  }, [error]);

  if (!enrollmentId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-destructive">Invalid enrollment ID</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const getStatusDisplay = (status: string) => {
    const statusMap = {
      'phase_1_in_progress': 'Phase 1 - In Progress',
      'phase_1_passed': 'Phase 1 - Passed',
      'phase_2_in_progress': 'Phase 2 - In Progress',
      'phase_2_passed': 'Phase 2 - Passed',
      'live_in_progress': 'Live - In Progress',
      'completed': 'Completed',
      'failed': 'Failed',
      'payout_limit_reached': 'Payout Limit Reached',
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getCurrentPhaseDisplay = (phases: any[], status: string, latestBreach?: any) => {
    // If status is failed and we have breach data with previous_state, show that status
    if (status === 'failed' && latestBreach?.previous_state?.status) {
      const prevStatus = latestBreach.previous_state.status;
      return prevStatus.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
    
    const currentPhase = phases.find(phase => phase.is_current);
    if (!currentPhase) {
      // Extract phase from status if no current phase
      if (status.includes('phase_1')) return 'Phase 1';
      if (status.includes('phase_2')) return 'Phase 2';
      if (status.includes('live')) return 'Live';
      return 'Phase 1';
    }
    
    // Map phase_type to display format
    if (currentPhase.phase_type === 'phase-1') return 'Phase 1';
    if (currentPhase.phase_type === 'phase-2') return 'Phase 2';
    if (currentPhase.phase_type === 'live') return 'Live';
    return currentPhase.phase_type;
  };

  const getStatusOnly = (status: string) => {
    const statusMap = {
      'phase_1_in_progress': 'In Progress',
      'phase_1_passed': 'Passed',
      'phase_2_in_progress': 'In Progress',
      'phase_2_passed': 'Passed',
      'live_in_progress': 'In Progress',
      'completed': 'Completed',
      'failed': 'Failed',
      'payout_limit_reached': 'Limit Reached',
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  if (error || !enrollmentData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-4">
          <p className="text-destructive">Failed to load enrollment data</p>
          <div className="space-x-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Button onClick={() => navigate('/')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div className="space-y-2 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold">Challenge Enrollment Manager</h1>
          <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
            <div>{enrollmentData.client_profile.full_name}&apos;s Challenge Enrollment</div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1.5">
                Email: <span className="truncate max-w-[150px] sm:max-w-none inline-block align-bottom">{enrollmentData.client_profile.email}</span>
                <button
                  onClick={() => copyToClipboard(enrollmentData.client_profile.email, 'Email')}
                  className="inline-flex items-center justify-center hover:bg-muted rounded p-1 transition-colors"
                  title="Copy email"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </span>
              {enrollmentData.accounts[0]?.mt5_account_id && (
                <>
                  <span className="hidden sm:inline text-muted-foreground/50">|</span>
                  <span className="flex items-center gap-1.5">
                    MT5 ID: {enrollmentData.accounts[0].mt5_account_id}
                    <button
                      onClick={() => copyToClipboard(enrollmentData.accounts[0].mt5_account_id, 'MT5 ID')}
                      className="inline-flex items-center justify-center hover:bg-muted rounded p-1 transition-colors"
                      title="Copy MT5 ID"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium bg-muted/50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border">
            <span>${enrollmentData.enrollment.account_size?.toLocaleString() || 'N/A'}</span>
            <span className="text-muted-foreground">|</span>
            <span>{enrollmentData.enrollment.challenge_name || enrollmentData.enrollment.step_type} ({enrollmentData.enrollment.step_type})</span>
            <span className="text-muted-foreground">|</span>
            <span>{getCurrentPhaseDisplay(enrollmentData.phases, enrollmentData.enrollment.status, enrollmentData.latest_breach)}</span>
            <span className="text-muted-foreground">|</span>
            <span>{getStatusOnly(enrollmentData.enrollment.status)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <ManualUpgradeDialog 
            enrollmentId={enrollmentId} 
            currentStatus={enrollmentData.enrollment.status}
          />
          <Button
            onClick={handleImpersonate}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={impersonateMutation.isPending || !enrollmentData?.client_profile.user_id}
          >
            {impersonateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            Impersonate
          </Button>
          <Button
            onClick={() => {
              if (enrollmentData?.client_profile.user_id) {
                traderService.impersonateTrader(enrollmentData.client_profile.user_id)
                  .then((data) => {
                    const clientUrl = `https://dashboard.we-fund.com/impersonate?ticket=${data.ticket}`;
                    copyToClipboard(clientUrl, 'Impersonate link');
                  })
                  .catch((error) => {
                    toast.error(error.message || "Failed to get impersonate link");
                  });
              }
            }}
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={!enrollmentData?.client_profile.user_id}
            title="Copy impersonate link"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-8">
        <div className="overflow-x-auto">
        <TabsList className="flex flex-wrap w-full h-auto p-1.5 sm:p-2 bg-muted/20 rounded-lg border gap-1">
          {canAccessTab('accounts') && (
          <TabsTrigger value="accounts" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <Activity className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Accounts & Trades</span>
            <span className="sm:hidden">Accounts</span>
          </TabsTrigger>
          )}
          {canAccessTab('open-positions') && (
          <TabsTrigger value="open-positions" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <TrendingUp className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Open Positions</span>
            <span className="sm:hidden">Positions</span>
          </TabsTrigger>
          )}
          {canAccessTab('phase') && (
          <TabsTrigger value="phase" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <Target className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Phase Overview</span>
            <span className="sm:hidden">Phase</span>
          </TabsTrigger>
          )}
          {canAccessTab('funds') && (
          <TabsTrigger value="funds" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <ArrowUpDown className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Deposit/Withdrawal</span>
            <span className="sm:hidden">Funds</span>
          </TabsTrigger>
          )}
          {canAccessTab('events') && (
          <TabsTrigger value="events" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <ScrollText className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Transition Log</span>
            <span className="sm:hidden">Transition</span>
          </TabsTrigger>
          )}
          {canAccessTab('broker-details') && (
          <TabsTrigger value="broker-details" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <Building className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Broker Details</span>
            <span className="sm:hidden">Broker</span>
          </TabsTrigger>
          )}
          {canAccessTab('block-account') && (
          <TabsTrigger value="block-account" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <Ban className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Block Account</span>
            <span className="sm:hidden">Block</span>
          </TabsTrigger>
          )}
          {canAccessTab('snapshot') && (
          <TabsTrigger value="snapshot" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <Camera className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Snapshot</span>
            <span className="sm:hidden">Snapshot</span>
          </TabsTrigger>
          )}
          {canAccessTab('scan-breach') && (
          <TabsTrigger value="scan-breach" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Scan Breach</span>
            <span className="sm:hidden">Scan</span>
          </TabsTrigger>
          )}
          {canAccessTab('payout') && (
          <TabsTrigger value="payout" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <DollarSign className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Payout Config</span>
            <span className="sm:hidden">Payout</span>
          </TabsTrigger>
          )}
          {canAccessTab('payout-history') && (
          <TabsTrigger value="payout-history" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <History className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Payout History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
          )}
          {canAccessTab('breach-history') && (
          <TabsTrigger value="breach-history" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Breach History</span>
            <span className="sm:hidden">Breaches</span>
          </TabsTrigger>
          )}
          {canAccessTab('event-logs') && (
          <TabsTrigger value="event-logs" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Event Logs</span>
            <span className="sm:hidden">Events</span>
          </TabsTrigger>
          )}
          {canAccessTab('mt5-trades') && (
          <TabsTrigger value="mt5-trades" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <BarChart3 className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Sync Status</span>
            <span className="sm:hidden">Sync</span>
          </TabsTrigger>
          )}
          {canAccessTab('overview') && (
          <TabsTrigger value="overview" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md min-w-fit">
            <Eye className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          )}
        </TabsList>
        </div>

        {canAccessTab('accounts') && (
        <TabsContent value="accounts" className="space-y-4 sm:space-y-6">
          <AccountsTradesTab
            accounts={enrollmentData.accounts}
            enrollmentId={enrollmentId}
            latestBreach={enrollmentData.latest_breach}
          />
        </TabsContent>
        )}

        {canAccessTab('open-positions') && (
        <TabsContent value="open-positions" className="space-y-6">
          <OpenPositionsTab enrollmentId={enrollmentId} />
        </TabsContent>
        )}

        {canAccessTab('phase') && (
        <TabsContent value="phase" className="space-y-6">
          <CurrentPhaseTab
            currentPhase={enrollmentData.phases.find(phase => phase.is_current)}
            phases={enrollmentData.phases}
            enrollmentStatus={enrollmentData.enrollment.status}
            accountSize={enrollmentData.enrollment.account_size}
            enrollmentId={enrollmentId}
          />
        </TabsContent>
        )}

        {canAccessTab('funds') && (
        <TabsContent value="funds" className="space-y-6">
          <DepositWithdrawalTab data={enrollmentData} />
        </TabsContent>
        )}

        {canAccessTab('events') && (
        <TabsContent value="events" className="space-y-6">
          <EventLogTab enrollmentId={enrollmentId} />
        </TabsContent>
        )}

        {canAccessTab('broker-details') && (
        <TabsContent value="broker-details" className="space-y-6">
          <BrokerDetailsTab enrollmentId={enrollmentId} />
        </TabsContent>
        )}

        {canAccessTab('block-account') && (
        <TabsContent value="block-account" className="space-y-6">
          <BlockAccountTab data={enrollmentData} enrollmentId={enrollmentId} />
        </TabsContent>
        )}

        {canAccessTab('snapshot') && (
        <TabsContent value="snapshot" className="space-y-6">
          <SnapshotTab enrollmentId={enrollmentId} />
        </TabsContent>
        )}

        {canAccessTab('scan-breach') && (
        <TabsContent value="scan-breach" className="space-y-6">
          <ScanBreachTab enrollmentId={enrollmentId} />
        </TabsContent>
        )}

        {canAccessTab('payout') && (
        <TabsContent value="payout" className="space-y-6">
          <PayoutTab enrollmentId={enrollmentId} />
        </TabsContent>
        )}

        {canAccessTab('payout-history') && (
        <TabsContent value="payout-history" className="space-y-6">
          <PayoutHistoryTab enrollmentId={enrollmentId} />
        </TabsContent>
        )}

        {canAccessTab('breach-history') && (
        <TabsContent value="breach-history" className="space-y-6">
          <BreachHistoryTab enrollmentId={enrollmentId} />
        </TabsContent>
        )}

        {canAccessTab('event-logs') && (
        <TabsContent value="event-logs" className="space-y-6">
          <EnrollmentEventLogsTab enrollmentId={enrollmentId} />
        </TabsContent>
        )}

        {canAccessTab('mt5-trades') && (
        <TabsContent value="mt5-trades" className="space-y-6">
          <MT5TradesTab accounts={enrollmentData.accounts} />
        </TabsContent>
        )}

        {canAccessTab('overview') && (
        <TabsContent value="overview" className="space-y-6">
          <OverviewTab
            enrollment={enrollmentData.enrollment}
            clientProfile={enrollmentData.client_profile}
            currentPhase={enrollmentData.phases.find(phase => phase.is_current)}
            phases={enrollmentData.phases}
          />
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default EnrollmentReview;