import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SupportService, SupportStats } from '@/services/supportService';
import {
  Clock,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Bot,
  UserCog,
  TrendingUp,
  Timer,
  CalendarDays
} from 'lucide-react';

export const CSStatsPanel: React.FC = () => {
  const [stats, setStats] = useState<SupportStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await SupportService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading CS stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number | null | undefined): string => {
    if (minutes === null || minutes === undefined) return 'N/A';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="text-muted-foreground">No data available</div>;
  }

  const escalationRate = stats.total_conversations > 0
    ? (stats.escalated_count / stats.total_conversations) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Customer Service Statistics
        </h3>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total_conversations}</p>
            <p className="text-xs text-muted-foreground">+{stats.resolved_today} resolved today</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Active</span>
            </div>
            <p className="text-2xl font-bold">{stats.active_conversations}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-500 mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Escalated</span>
            </div>
            <p className="text-2xl font-bold">{stats.escalated_count}</p>
            <p className="text-xs text-muted-foreground">{escalationRate.toFixed(1)}% rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-500 mb-1">
              <UserCog className="h-4 w-4" />
              <span className="text-xs">Needs Review</span>
            </div>
            <p className="text-2xl font-bold">{stats.needs_review_count}</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Timer className="h-4 w-4" />
              <span className="text-xs">Avg Response Time</span>
            </div>
            <p className="text-xl font-bold">{formatDuration(stats.avg_response_time_minutes)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Avg Resolution Time</span>
            </div>
            <p className="text-xl font-bold">{formatDuration(stats.avg_resolution_time_minutes)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Resolved Today</span>
            </div>
            <p className="text-xl font-bold">{stats.resolved_today}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs">By Status</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(stats.by_status || {}).map(([status, count]) => (
                <Badge key={status} variant="outline" className="text-xs">
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority & Source Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">By Priority</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.by_priority || {}).map(([priority, count]) => (
                <Badge
                  key={priority}
                  variant={priority === 'urgent' ? 'destructive' : priority === 'high' ? 'default' : 'outline'}
                >
                  {priority}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">By Source</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.by_source || {}).map(([source, count]) => (
                <Badge key={source} variant="secondary">
                  {source}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CSStatsPanel;
