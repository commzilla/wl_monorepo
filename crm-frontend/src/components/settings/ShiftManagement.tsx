import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Clock, Plus, Trash2, UserCheck, CalendarOff, RefreshCw, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { shiftService, ShiftSchedule, ShiftOverride, OnDutyResponse } from '@/services/shiftService';
import { apiService } from '@/services/apiService';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIMEZONE_OPTIONS = [
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Athens',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

const ShiftManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>('');

  // --- New shift form state ---
  const [newDay, setNewDay] = useState<string>('0');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');
  const [newTz, setNewTz] = useState('UTC');

  // --- Override form state ---
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideBlocked, setOverrideBlocked] = useState(true);
  const [overrideStart, setOverrideStart] = useState('09:00');
  const [overrideEnd, setOverrideEnd] = useState('17:00');
  const [overrideTz, setOverrideTz] = useState('UTC');
  const [overrideReason, setOverrideReason] = useState('');

  // ---- Queries ----
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['support-agents'],
    queryFn: async () => {
      const res = await apiService.get<Agent[]>('/admin/support/agents/');
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const { data: onDuty, isLoading: onDutyLoading } = useQuery<OnDutyResponse>({
    queryKey: ['shifts-on-duty'],
    queryFn: () => shiftService.getOnDuty(),
    refetchInterval: 60000,
  });

  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<ShiftSchedule[]>({
    queryKey: ['shift-schedules', selectedAgent],
    queryFn: () => shiftService.getSchedules(selectedAgent || undefined),
  });

  const { data: overrides = [], isLoading: overridesLoading } = useQuery<ShiftOverride[]>({
    queryKey: ['shift-overrides', selectedAgent],
    queryFn: () => shiftService.getOverrides(selectedAgent || undefined),
  });

  // ---- Mutations ----
  const createSchedule = useMutation({
    mutationFn: (data: Parameters<typeof shiftService.createSchedule>[0]) =>
      shiftService.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['shifts-on-duty'] });
      toast.success('Shift schedule added');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add schedule'),
  });

  const deleteSchedule = useMutation({
    mutationFn: (id: string) => shiftService.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['shifts-on-duty'] });
      toast.success('Shift schedule deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete schedule'),
  });

  const createOverride = useMutation({
    mutationFn: (data: Parameters<typeof shiftService.createOverride>[0]) =>
      shiftService.createOverride(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['shifts-on-duty'] });
      toast.success('Override added');
      setOverrideDate('');
      setOverrideReason('');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add override'),
  });

  const deleteOverride = useMutation({
    mutationFn: (id: string) => shiftService.deleteOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['shifts-on-duty'] });
      toast.success('Override deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete override'),
  });

  // ---- Handlers ----
  const handleAddSchedule = () => {
    if (!selectedAgent) {
      toast.error('Please select an agent first');
      return;
    }
    createSchedule.mutate({
      agent: selectedAgent,
      day_of_week: parseInt(newDay),
      start_time: newStart,
      end_time: newEnd,
      timezone: newTz,
      is_active: true,
    });
  };

  const handleAddOverride = () => {
    if (!selectedAgent) {
      toast.error('Please select an agent first');
      return;
    }
    if (!overrideDate) {
      toast.error('Please select a date');
      return;
    }
    createOverride.mutate({
      agent: selectedAgent,
      date: overrideDate,
      is_blocked: overrideBlocked,
      start_time: overrideBlocked ? null : overrideStart,
      end_time: overrideBlocked ? null : overrideEnd,
      timezone: overrideTz,
      reason: overrideReason,
    });
  };

  // Group schedules by day
  const schedulesByDay = DAY_NAMES.map((_, idx) =>
    schedules.filter((s) => s.day_of_week === idx)
  );

  return (
    <div className="space-y-6">
      {/* On-Duty Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">Currently On Duty</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['shifts-on-duty'] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          {onDuty && !onDuty.has_schedules && (
            <CardDescription className="text-yellow-600">
              No shift schedules configured — all support agents receive escalations.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {onDutyLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : onDuty && onDuty.agents.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {onDuty.agents.map((a) => (
                <Badge key={a.id} variant="default" className="bg-green-600 text-white px-3 py-1 text-sm">
                  {a.first_name} {a.last_name}
                  <span className="ml-1 opacity-70 text-xs">({a.role})</span>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-sm text-orange-600 font-medium">
              No agents currently on shift — AI will handle and flag for review.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Manage Shifts</CardTitle>
          </div>
          <CardDescription>Select an agent to view and manage their shift schedule.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select an agent..." />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.first_name} {a.last_name} — {a.email} ({a.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedAgent && (
        <>
          {/* Weekly Schedule Grid */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Weekly Schedule</CardTitle>
              </div>
              <CardDescription>Recurring weekly shifts for this agent.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Schedule Grid */}
              {schedulesLoading ? (
                <div className="text-sm text-muted-foreground">Loading schedules...</div>
              ) : (
                <div className="space-y-2">
                  {DAY_NAMES.map((day, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <span className="w-24 font-medium text-sm shrink-0">{day}</span>
                      <div className="flex flex-wrap gap-2 flex-1">
                        {schedulesByDay[idx].length === 0 ? (
                          <span className="text-sm text-muted-foreground">No shifts</span>
                        ) : (
                          schedulesByDay[idx].map((s) => (
                            <Badge
                              key={s.id}
                              variant="secondary"
                              className="flex items-center gap-1.5 px-2.5 py-1"
                            >
                              {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                              <span className="text-xs opacity-60">{s.timezone}</span>
                              <button
                                onClick={() => s.id && deleteSchedule.mutate(s.id)}
                                className="ml-1 hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Shift Form */}
              <div className="border-t border-border pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Add Shift</h4>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Day</label>
                    <Select value={newDay} onValueChange={setNewDay}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_NAMES.map((d, i) => (
                          <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Start</label>
                    <Input
                      type="time"
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                      className="w-[130px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">End</label>
                    <Input
                      type="time"
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                      className="w-[130px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Timezone</label>
                    <Select value={newTz} onValueChange={setNewTz}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddSchedule} disabled={createSchedule.isPending}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date Overrides */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CalendarOff className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg">Date Overrides</CardTitle>
              </div>
              <CardDescription>One-time exceptions: days off or custom hours for specific dates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing overrides */}
              {overridesLoading ? (
                <div className="text-sm text-muted-foreground">Loading overrides...</div>
              ) : overrides.length === 0 ? (
                <div className="text-sm text-muted-foreground">No upcoming overrides.</div>
              ) : (
                <div className="space-y-2">
                  {overrides.map((o) => (
                    <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <Badge variant={o.is_blocked ? 'destructive' : 'secondary'}>
                          {o.date}
                        </Badge>
                        <span className="text-sm">
                          {o.is_blocked
                            ? 'Day off'
                            : `${o.start_time?.slice(0, 5)} - ${o.end_time?.slice(0, 5)} (${o.timezone})`}
                        </span>
                        {o.reason && (
                          <span className="text-xs text-muted-foreground">— {o.reason}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => o.id && deleteOverride.mutate(o.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Override Form */}
              <div className="border-t border-border pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Add Override</h4>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Date</label>
                      <Input
                        type="date"
                        value={overrideDate}
                        onChange={(e) => setOverrideDate(e.target.value)}
                        className="w-[180px]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={overrideBlocked}
                        onCheckedChange={setOverrideBlocked}
                      />
                      <span className="text-sm">
                        {overrideBlocked ? 'Day off' : 'Custom hours'}
                      </span>
                    </div>
                  </div>

                  {!overrideBlocked && (
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Start</label>
                        <Input
                          type="time"
                          value={overrideStart}
                          onChange={(e) => setOverrideStart(e.target.value)}
                          className="w-[130px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">End</label>
                        <Input
                          type="time"
                          value={overrideEnd}
                          onChange={(e) => setOverrideEnd(e.target.value)}
                          className="w-[130px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Timezone</label>
                        <Select value={overrideTz} onValueChange={setOverrideTz}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONE_OPTIONS.map((tz) => (
                              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs text-muted-foreground block mb-1">Reason (optional)</label>
                      <Input
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="e.g. Sick day, Holiday..."
                      />
                    </div>
                    <Button onClick={handleAddOverride} disabled={createOverride.isPending}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Override
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ShiftManagement;
