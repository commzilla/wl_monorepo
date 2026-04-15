import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import StatsCard from '@/components/dashboard/StatsCard';
import { useToast } from '@/hooks/use-toast';
import { challengeAnalyticsService, type ChallengeAnalyticsData, type ChallengeStepStats } from '@/services/challengeAnalyticsService';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  chartGradientDefs,
  FuturisticTooltip,
  getGradientFill,
  GRID_PROPS,
  AXIS_TICK_STYLE,
  AXIS_LINE_STYLE,
} from './chartTheme';

const ChallengesTab: React.FC = () => {
  const { toast } = useToast();
  const [data, setData] = useState<ChallengeAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const analyticsData = await challengeAnalyticsService.getChallengeAnalytics();
        setData(analyticsData);
      } catch (error) {
        console.error('Error loading challenge analytics:', error);
        toast({
          title: "Error",
          description: "Failed to load challenge analytics. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const renderStepStats = (stepStats: ChallengeStepStats[], title: string) => (
    <Card className="chart-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <span className="chart-title-accent" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {stepStats.map((step, index) => {
            const passRate = step.total > 0 ? ((step.passes / step.total) * 100) : 0;
            const failRate = parseFloat(step.fail_rate.replace('%', ''));

            return (
              <div key={index} className="glass-card p-6 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,112,255,0.15))', border: '1px solid rgba(0,212,255,0.2)' }}>
                      <span className="text-sm font-semibold" style={{ color: '#00d4ff' }}>
                        {index + 1}
                      </span>
                    </div>
                    <h4 className="font-semibold text-foreground">
                      {step.label}
                    </h4>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Pass Rate</div>
                    <div className="text-lg font-bold" style={{ color: '#00ff88', textShadow: '0 0 10px rgba(0,255,136,0.3)' }}>
                      {passRate.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">{step.entered.toLocaleString()} entered</span>
                    <span className="text-muted-foreground">{step.in_progress.toLocaleString()} in progress</span>
                  </div>
                  <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.08)' }}>
                    <div
                      className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                      style={{ width: `${passRate}%`, background: 'linear-gradient(90deg, #00ff88, #10b981)', boxShadow: '0 0 10px rgba(0,255,136,0.3)' }}
                    />
                    <div
                      className="absolute top-0 right-0 h-full rounded-full transition-all duration-500"
                      style={{ width: `${failRate}%`, background: 'linear-gradient(90deg, #ff3d8f, #e11d48)', boxShadow: '0 0 10px rgba(255,61,143,0.3)' }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.15)' }}>
                    <div className="text-2xl font-bold mb-1" style={{ color: '#00ff88' }}>
                      {step.passes.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Passed
                    </div>
                    <div className="text-xs font-medium mt-1" style={{ color: '#00ff88' }}>
                      {passRate.toFixed(1)}%
                    </div>
                  </div>

                  <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,61,143,0.05)', border: '1px solid rgba(255,61,143,0.15)' }}>
                    <div className="text-2xl font-bold mb-1" style={{ color: '#ff3d8f' }}>
                      {step.fails.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Failed
                    </div>
                    <div className="text-xs font-medium mt-1" style={{ color: '#ff3d8f' }}>
                      {step.fail_rate}
                    </div>
                  </div>

                  <div className="text-center p-3 rounded-lg" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}>
                    <div className="text-2xl font-bold mb-1" style={{ color: '#00d4ff' }}>
                      {step.entered.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      Entered
                    </div>
                    <div className="text-xs font-medium mt-1 text-muted-foreground">
                      {step.in_progress.toLocaleString()} active
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load challenge analytics data.
      </div>
    );
  }

  const phaseData = [
    { name: 'Phase 1', value: data.phase1_count },
    { name: 'Phase 2', value: data.phase2_count },
    { name: 'Live Traders', value: data.live_traders },
  ].filter(d => d.value > 0);

  const accountStatsData = [
    { name: 'Passed P1', value: parseFloat(data.passed_phase1_pct.toFixed(1)) },
    { name: 'Passed P2', value: parseFloat(data.passed_phase2_pct.toFixed(1)) },
    { name: 'Reached Live', value: parseFloat(data.reached_live_pct.toFixed(1)) },
    { name: 'Blocked', value: parseFloat(data.blocked_accounts_pct.toFixed(1)) },
    { name: 'Daily DD', value: parseFloat(data.daily_dd_breached_pct.toFixed(1)) },
    { name: 'Max DD', value: parseFloat(data.max_dd_breached_pct.toFixed(1)) },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Statistics */}
      <Card className="chart-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center">
            <span className="chart-title-accent" />
            Challenge Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Challenges"
              value={data.total_challenges}
            />
            <StatsCard
              title="Phase 1 Active"
              value={data.phase1_count}
            />
            <StatsCard
              title="Phase 2 Active"
              value={data.phase2_count}
            />
            <StatsCard
              title="Live Traders"
              value={data.live_traders}
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts: Phase Distribution + Account Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="chart-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center">
              <span className="chart-title-accent" />
              Challenge Phase Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto chart-container">
            <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <PieChart>
                {chartGradientDefs()}
                <Pie
                  data={phaseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {phaseData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getGradientFill(index)} />
                  ))}
                </Pie>
                <Tooltip content={<FuturisticTooltip />} />
                <Legend
                  formatter={(value: string, entry: any) => (
                    <span style={{ color: 'rgba(148,163,184,0.8)', fontSize: '12px' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="chart-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center">
              <span className="chart-title-accent" />
              Account Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto chart-container">
            <ResponsiveContainer width="100%" height={300} minWidth={300}>
              <BarChart data={accountStatsData}>
                {chartGradientDefs()}
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="name" tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={AXIS_TICK_STYLE} axisLine={AXIS_LINE_STYLE} tickLine={false} />
                <Tooltip content={<FuturisticTooltip />} />
                <Bar dataKey="value" name="Percentage" radius={[6, 6, 0, 0]}>
                  {accountStatsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getGradientFill(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Account Statistics Cards */}
      <Card className="chart-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center">
            <span className="chart-title-accent" />
            Account Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard
              title="Passed Phase 1"
              value={`${data.passed_phase1_pct.toFixed(1)}%`}
              description="From total buyers"
            />
            <StatsCard
              title="Passed Phase 2"
              value={`${data.passed_phase2_pct.toFixed(1)}%`}
              description="From Phase 1 passers"
            />
            <StatsCard
              title="Reached Live"
              value={`${data.reached_live_pct.toFixed(1)}%`}
              description="From eligible passers"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <StatsCard
              title="Blocked Accounts %"
              value={`${data.blocked_accounts_pct.toFixed(1)}%`}
            />
            <StatsCard
              title="Daily DD Breached %"
              value={`${data.daily_dd_breached_pct.toFixed(1)}%`}
            />
            <StatsCard
              title="Max DD Breached %"
              value={`${data.max_dd_breached_pct.toFixed(1)}%`}
            />
          </div>
        </CardContent>
      </Card>

      {/* User Metrics */}
      <Card className="chart-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center">
            <span className="chart-title-accent" />
            User Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Users"
              value={data.total_users}
            />
            <StatsCard
              title="Avg Accounts/User"
              value={data.avg_accounts_per_user}
            />
            <StatsCard
              title="Avg Pass Time"
              value={data.avg_pass_time ? `${data.avg_pass_time} days` : 'N/A'}
            />
            <StatsCard
              title="Avg Breach Time"
              value={data.avg_breach_time ? `${data.avg_breach_time} days` : 'N/A'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderStepStats(data.one_step_stats, "One-Step Challenge Performance")}
        {renderStepStats(data.two_step_stats, "Two-Step Challenge Performance")}
      </div>
    </div>
  );
};

export default ChallengesTab;
