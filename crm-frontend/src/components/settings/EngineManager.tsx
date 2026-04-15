import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings, Play, Pause, Edit3, Clock, Calendar } from 'lucide-react';
import { engineService } from '@/services/engineService';
import { PeriodicTask } from '@/lib/types/engine';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Task descriptions and user-friendly names mapping
const TASK_MAPPING: Record<string, { displayName: string; description: string }> = {
  'celery.backend_cleanup': {
    displayName: 'Celery Backend Cleanup',
    description: 'Cleans up expired task results and maintains database health by removing old celery task records'
  },
  'wefund.tasks.snapshot_tasks.create_daily_snapshots': {
    displayName: 'Create Daily Snapshots',
    description: 'Creates daily snapshots of account balances and trading statistics for reporting and analysis'
  },
  'create-daily-snapshots': {
    displayName: 'Create Daily Snapshots',
    description: 'Creates daily snapshots of account balances and trading statistics for reporting and analysis'
  },
  'wefund.tasks.mt5_tasks.fetch_and_store_mt5_trades': {
    displayName: 'Fetch MT5 Trades Every Minute',
    description: 'Continuously fetches and stores trading data from MetaTrader 5 servers for real-time monitoring'
  },
  'Fetch MT5 Trades Every Minute': {
    displayName: 'Fetch MT5 Trades Every Minute',
    description: 'Continuously fetches and stores trading data from MetaTrader 5 servers for real-time monitoring'
  },
  'wefund.tasks.challenge_tasks.run_challenge_engine': {
    displayName: 'Run Challenge Engine Every Minute',
    description: 'Processes challenge evaluations, updates trader progress, and manages challenge phase transitions'
  },
  'Run Challenge Engine Every Minute': {
    displayName: 'Run Challenge Engine Every Minute',
    description: 'Processes challenge evaluations, updates trader progress, and manages challenge phase transitions'
  },
  'wefund.tasks.risk_tasks.run_risk_evaluation': {
    displayName: 'Run Risk Evaluation Every 5 Minutes',
    description: 'Analyzes trading patterns, detects rule violations, and calculates risk scores for all active accounts'
  },
  'Run Risk Evaluation Every 5 Minutes': {
    displayName: 'Run Risk Evaluation Every 5 Minutes',
    description: 'Analyzes trading patterns, detects rule violations, and calculates risk scores for all active accounts'
  },
  'wefund.tasks.snapshot_tasks.update_daily_snapshots': {
    displayName: 'Update Daily Snapshots',
    description: 'Updates existing daily snapshots with the latest account data and trading metrics'
  },
  'update-daily-snapshots': {
    displayName: 'Update Daily Snapshots',
    description: 'Updates existing daily snapshots with the latest account data and trading metrics'
  },
  'wefund.tasks.mt5_tasks.track_sl_changes': {
    displayName: 'Real-Time Stop Loss Monitor',
    description: 'Tracks and records stop loss modifications every 15 seconds to detect trading rule violations and ensure compliance'
  },
  'Track SL changes every 15s': {
    displayName: 'Real-Time Stop Loss Monitor',
    description: 'Tracks and records stop loss modifications every 15 seconds to detect trading rule violations and ensure compliance'
  },
  'track-sl-changes': {
    displayName: 'Real-Time Stop Loss Monitor',
    description: 'Tracks and record stop loss modifications every 15 seconds to detect trading rule violations and ensure compliance'
  }
};

const EngineManager = () => {
  const [tasks, setTasks] = useState<PeriodicTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<PeriodicTask | null>(null);
  const [editDialog, setEditDialog] = useState(false);
  const [scheduleType, setScheduleType] = useState<'interval' | 'crontab'>('interval');
  const [intervalData, setIntervalData] = useState({ every: 1, period: 'minutes' });
  const [crontabData, setCrontabData] = useState({
    minute: '0',
    hour: '*',
    day_of_week: '*',
    day_of_month: '*',
    month_of_year: '*'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await engineService.getTasks();
      setTasks(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load engine tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (task: PeriodicTask) => {
    try {
      const action = task.enabled ? 'stop' : 'start';
      const updatedTask = await engineService.toggleTask(task.id, action);
      setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
      toast({
        title: "Success",
        description: `Task ${action === 'start' ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle task",
        variant: "destructive",
      });
    }
  };

  const handleEditTask = async () => {
    if (!selectedTask) return;

    try {
      const editData = scheduleType === 'interval' 
        ? { type: 'interval' as const, ...intervalData }
        : { type: 'crontab' as const, ...crontabData };
      
      const updatedTask = await engineService.editTask(selectedTask.id, editData);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      setEditDialog(false);
      toast({
        title: "Success",
        description: "Task schedule updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task schedule",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (task: PeriodicTask) => {
    setSelectedTask(task);
    // Default to interval since we don't have the detailed schedule info from backend
    setScheduleType('interval');
    setIntervalData({ every: 1, period: 'minutes' });
    setCrontabData({
      minute: '0',
      hour: '*',
      day_of_week: '*',
      day_of_month: '*',
      month_of_year: '*'
    });
    setEditDialog(true);
  };

  const getTaskDisplayInfo = (task: PeriodicTask) => {
    // Try to find mapping by task name, task path, or fallback to original name
    const mapping = TASK_MAPPING[task.name] || TASK_MAPPING[task.task] || {
      displayName: task.name,
      description: task.task
    };
    return mapping;
  };

  const getScheduleDisplay = (task: PeriodicTask) => {
    return task.schedule || 'No schedule';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading engine tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Engine Manager</h2>
          <p className="text-muted-foreground">Manage periodic tasks and schedules</p>
        </div>
      </div>

      <div className="grid gap-4">
        {tasks.map((task) => {
          const taskInfo = getTaskDisplayInfo(task);
          return (
          <Card key={task.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{taskInfo.displayName}</CardTitle>
                  <Badge variant={task.enabled ? "default" : "secondary"}>
                    {task.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={task.enabled}
                    onCheckedChange={() => handleToggleTask(task)}
                  />
                  <Dialog open={editDialog && selectedTask?.id === task.id} onOpenChange={setEditDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(task)}
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit Schedule
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              </div>
              <CardDescription>{taskInfo.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Schedule: {getScheduleDisplay(task)}</span>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task Schedule</DialogTitle>
            <DialogDescription>
              Update the schedule for "{selectedTask?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Schedule Type</Label>
              <RadioGroup value={scheduleType} onValueChange={(value) => setScheduleType(value as 'interval' | 'crontab')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="interval" id="interval" />
                  <Label htmlFor="interval">Interval</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="crontab" id="crontab" />
                  <Label htmlFor="crontab">Crontab</Label>
                </div>
              </RadioGroup>
            </div>

            {scheduleType === 'interval' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="every">Every</Label>
                  <Input
                    id="every"
                    type="number"
                    min="1"
                    value={intervalData.every}
                    onChange={(e) => setIntervalData(prev => ({ ...prev, every: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="period">Period</Label>
                  <Select value={intervalData.period} onValueChange={(value) => setIntervalData(prev => ({ ...prev, period: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">Seconds</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {scheduleType === 'crontab' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="minute">Minute</Label>
                  <Input
                    id="minute"
                    value={crontabData.minute}
                    onChange={(e) => setCrontabData(prev => ({ ...prev, minute: e.target.value }))}
                    placeholder="0-59 or *"
                  />
                </div>
                <div>
                  <Label htmlFor="hour">Hour</Label>
                  <Input
                    id="hour"
                    value={crontabData.hour}
                    onChange={(e) => setCrontabData(prev => ({ ...prev, hour: e.target.value }))}
                    placeholder="0-23 or *"
                  />
                </div>
                <div>
                  <Label htmlFor="day_of_week">Day of Week</Label>
                  <Input
                    id="day_of_week"
                    value={crontabData.day_of_week}
                    onChange={(e) => setCrontabData(prev => ({ ...prev, day_of_week: e.target.value }))}
                    placeholder="0-6 or *"
                  />
                </div>
                <div>
                  <Label htmlFor="day_of_month">Day of Month</Label>
                  <Input
                    id="day_of_month"
                    value={crontabData.day_of_month}
                    onChange={(e) => setCrontabData(prev => ({ ...prev, day_of_month: e.target.value }))}
                    placeholder="1-31 or *"
                  />
                </div>
                <div>
                  <Label htmlFor="month_of_year">Month</Label>
                  <Input
                    id="month_of_year"
                    value={crontabData.month_of_year}
                    onChange={(e) => setCrontabData(prev => ({ ...prev, month_of_year: e.target.value }))}
                    placeholder="1-12 or *"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditTask}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EngineManager;