import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RefreshCw,
  Database,
  HardDrive,
  Server,
  Clock,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  BarChart3,
  Cable,
  GitBranch,
  Users,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { healthService, type HealthCheckDetail, type SystemHealthResponse } from '@/services/healthService';

// --- Check metadata ---

const CHECK_META: Record<string, { label: string; icon: React.ElementType }> = {
  postgresql: { label: 'PostgreSQL', icon: Database },
  redis: { label: 'Redis', icon: Zap },
  disk_space: { label: 'Disk Space', icon: HardDrive },
  celery_worker: { label: 'Celery Worker', icon: Server },
  celery_beat: { label: 'Celery Beat', icon: Clock },
  task_challenge_engine: { label: 'Challenge Engine', icon: Activity },
  task_risk_evaluation: { label: 'Risk Evaluation', icon: Shield },
  task_mt5_trades: { label: 'MT5 Trade Sync', icon: BarChart3 },
  task_track_stoploss_changes: { label: 'Stop Loss Tracker', icon: AlertTriangle },
  task_create_daily_snapshots: { label: 'Daily Snapshots', icon: Clock },
  mt5_api: { label: 'MT5 API', icon: Cable },
  stuck_enrollments: { label: 'Stuck Enrollments', icon: Users },
  pending_migrations: { label: 'Pending Migrations', icon: GitBranch },
};

// --- Category groups ---

const CHECK_CATEGORIES: { label: string; keys: string[] }[] = [
  { label: 'Infrastructure', keys: ['postgresql', 'redis', 'disk_space'] },
  { label: 'Celery', keys: ['celery_worker', 'celery_beat'] },
  { label: 'Task Freshness', keys: ['task_challenge_engine', 'task_risk_evaluation', 'task_mt5_trades', 'task_track_stoploss_changes', 'task_create_daily_snapshots'] },
  { label: 'External Services', keys: ['mt5_api'] },
  { label: 'Data Integrity', keys: ['stuck_enrollments', 'pending_migrations'] },
];

// --- Status styling ---

const STATUS_CONFIG = {
  healthy: { color: 'bg-green-500/15 border-green-500/30', text: 'text-green-600 dark:text-green-400', badge: 'success' as const, icon: CheckCircle2, label: 'All Systems Operational' },
  degraded: { color: 'bg-yellow-500/15 border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', badge: 'warning' as const, icon: AlertTriangle, label: 'Degraded Performance' },
  critical: { color: 'bg-red-500/15 border-red-500/30', text: 'text-red-600 dark:text-red-400', badge: 'destructive' as const, icon: XCircle, label: 'Critical Issues Detected' },
};

const CHECK_STATUS_BADGE = {
  ok: 'success' as const,
  warn: 'warning' as const,
  critical: 'destructive' as const,
};

// --- Helpers ---

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

function formatCheckDetail(key: string, check: HealthCheckDetail): string {
  if (check.latency_ms !== undefined) return `${check.latency_ms}ms latency`;
  if (check.free_pct !== undefined) return `${check.free_pct}% free`;
  if (check.workers !== undefined) return `${check.workers} worker${check.workers !== 1 ? 's' : ''} active`;
  if (check.tasks_run_recently !== undefined) return `${check.tasks_run_recently} tasks ran recently`;
  if (check.stale_seconds !== undefined && check.threshold_seconds !== undefined) {
    return `Last run: ${formatDuration(check.stale_seconds)} ago (threshold: ${formatDuration(check.threshold_seconds)})`;
  }
  if (check.reachable !== undefined) return check.reachable ? 'Reachable' : 'Unreachable';
  if (check.count !== undefined) return `${check.count} found`;
  if (check.detail) return check.detail;
  return '';
}

function getLatencyColor(ms: number): string {
  if (ms < 50) return 'text-green-600 dark:text-green-400';
  if (ms < 200) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getCategorySummary(keys: string[], checks: Record<string, HealthCheckDetail>): 'ok' | 'warn' | 'critical' {
  let worst: 'ok' | 'warn' | 'critical' = 'ok';
  for (const key of keys) {
    const check = checks[key];
    if (!check) continue;
    if (check.status === 'critical') return 'critical';
    if (check.status === 'warn') worst = 'warn';
  }
  return worst;
}

const INTERVAL_OPTIONS = [
  { value: '15000', label: '15s' },
  { value: '30000', label: '30s' },
  { value: '60000', label: '60s' },
  { value: '0', label: 'Off' },
];

// --- Check card component ---

const CheckCard: React.FC<{ checkKey: string; check: HealthCheckDetail }> = ({ checkKey, check }) => {
  const meta = CHECK_META[checkKey] || { label: checkKey, icon: Activity };
  const Icon = meta.icon;
  const badgeVariant = CHECK_STATUS_BADGE[check.status];
  const detail = formatCheckDetail(checkKey, check);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{meta.label}</CardTitle>
          </div>
          <Badge variant={badgeVariant}>
            {check.status === 'ok' ? 'OK' : check.status === 'warn' ? 'WARN' : 'CRITICAL'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Latency with color coding */}
        {check.latency_ms !== undefined && (
          <p className={`text-sm font-medium ${getLatencyColor(check.latency_ms)}`}>
            {check.latency_ms}ms latency
          </p>
        )}

        {/* Disk space with progress bar */}
        {check.free_pct !== undefined && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Disk usage</span>
              <span className="font-medium">{check.free_pct}% free</span>
            </div>
            <Progress
              value={100 - check.free_pct}
              className="h-2"
            />
          </div>
        )}

        {/* Other details */}
        {check.latency_ms === undefined && check.free_pct === undefined && detail && (
          <p className="text-sm text-muted-foreground">{detail}</p>
        )}

        {/* Error detail for non-ok checks */}
        {check.detail && check.status !== 'ok' && (
          <p className="text-xs text-muted-foreground/70 mt-1 break-words">{check.detail}</p>
        )}
      </CardContent>
    </Card>
  );
};

// --- Main page ---

const SystemHealth: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);
  const prevStatusRef = useRef<string | null>(null);

  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery<SystemHealthResponse>({
    queryKey: ['system-health'],
    queryFn: () => healthService.getSystemHealth(),
    refetchInterval: refreshInterval || false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });

  // Toast on status change
  useEffect(() => {
    if (!data) return;
    const prev = prevStatusRef.current;
    if (prev !== null && prev !== data.status) {
      const config = STATUS_CONFIG[data.status];
      toast({
        title: `System status changed to ${data.status.toUpperCase()}`,
        description: config.label,
        variant: data.status === 'critical' ? 'destructive' : 'default',
      });
    }
    prevStatusRef.current = data.status;
  }, [data?.status]);

  const overallConfig = data ? STATUS_CONFIG[data.status] : null;
  const OverallIcon = overallConfig?.icon;

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <PageHeader
        title="System Health"
        subtitle="Real-time infrastructure and service monitoring"
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {dataUpdatedAt > 0 && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
              </span>
            )}
            <Select
              value={String(refreshInterval)}
              onValueChange={(v) => setRefreshInterval(Number(v))}
            >
              <SelectTrigger className="w-[90px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Loading state */}
      {isLoading && !data && (
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading health status...</p>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && !data && (
        <Card className="border-red-500/30">
          <CardContent className="p-12 text-center">
            <XCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <p className="text-red-500 font-medium">Failed to fetch health status</p>
            <p className="text-sm text-muted-foreground mt-1">{(error as Error)?.message || 'Unknown error'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Overall Status Banner */}
          <Card className={`border ${overallConfig!.color}`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                {OverallIcon && <OverallIcon className={`h-8 w-8 sm:h-10 sm:w-10 ${overallConfig!.text}`} />}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h2 className={`text-lg sm:text-2xl font-bold ${overallConfig!.text}`}>
                      {overallConfig!.label}
                    </h2>
                    <Badge variant={overallConfig!.badge} className="text-xs sm:text-sm px-2 sm:px-3">
                      {data.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(data.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold">{data.summary.total}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Checks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{data.summary.ok}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Passing</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400">{data.summary.warn}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Warnings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">{data.summary.critical}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Critical</p>
              </CardContent>
            </Card>
          </div>

          {/* Check Cards grouped by category */}
          {CHECK_CATEGORIES.map((category) => {
            const availableKeys = category.keys.filter((k) => k in data.checks);
            if (availableKeys.length === 0) return null;
            const catStatus = getCategorySummary(availableKeys, data.checks);
            const catBadge = CHECK_STATUS_BADGE[catStatus];

            return (
              <div key={category.label} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{category.label}</h3>
                  <Badge variant={catBadge} className="text-xs">
                    {catStatus === 'ok' ? 'ALL OK' : catStatus === 'warn' ? 'WARNING' : 'CRITICAL'}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {availableKeys.map((key) => (
                    <CheckCard key={key} checkKey={key} check={data.checks[key]} />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default SystemHealth;
