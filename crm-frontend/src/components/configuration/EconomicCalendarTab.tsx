import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { economicCalendarService } from '@/services/economicCalendarService';
import type {
  EconomicEvent,
  EconomicEventCreateData,
  EconomicEventUpdateData,
  ImpactLevel,
} from '@/lib/types/economicCalendar';

// GMT+2 offset in milliseconds (MT5 server time)
const GMT2_OFFSET = 2 * 60 * 60 * 1000;

// Format datetime in GMT+2
const formatInGMT2 = (dateString: string, formatStr: string = 'HH:mm'): string => {
  const date = parseISO(dateString);
  const gmt2Date = new Date(date.getTime() + GMT2_OFFSET);
  return format(gmt2Date, formatStr);
};

// Format full date in GMT+2
const formatDateInGMT2 = (dateString: string): string => {
  const date = parseISO(dateString);
  const gmt2Date = new Date(date.getTime() + GMT2_OFFSET);
  return format(gmt2Date, 'MMM dd, yyyy');
};

// Format datetime in GMT+2 for display
const formatDateTimeGMT2 = (dateString: string): string => {
  const date = parseISO(dateString);
  const gmt2Date = new Date(date.getTime() + GMT2_OFFSET);
  return format(gmt2Date, 'MMM dd, yyyy HH:mm');
};

// Get impact badge variant
const getImpactBadgeClass = (impact: ImpactLevel): string => {
  switch (impact) {
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'low':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    default:
      return '';
  }
};

// Available currencies
const AVAILABLE_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD', 'CNY', 'XAU', 'OIL'
];

export const EconomicCalendarTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [activeSubTab, setActiveSubTab] = useState('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EconomicEvent | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [formData, setFormData] = useState({
    event_name: '',
    currency: 'USD',
    impact: 'high' as ImpactLevel,
    event_datetime: '',
    time_window_minutes: 5,
    forecast_value: '',
    previous_value: '',
    actual_value: '',
  });

  // Fetch high-impact events for Events tab
  const { data: highImpactEvents, isLoading: isLoadingHighImpact } = useQuery({
    queryKey: ['economic-calendar', 'high-impact', currencyFilter],
    queryFn: () => economicCalendarService.getHighImpactEvents(
      currencyFilter !== 'all' ? currencyFilter : undefined
    ),
    enabled: activeSubTab === 'events',
  });

  // Fetch all events for Manage tab
  const { data: allEvents, isLoading: isLoadingAll } = useQuery({
    queryKey: ['economic-calendar', 'all', currencyFilter, impactFilter, searchQuery],
    queryFn: () => economicCalendarService.getAll({
      currency: currencyFilter !== 'all' ? currencyFilter : undefined,
      impact: impactFilter !== 'all' ? impactFilter as ImpactLevel : undefined,
    }),
    enabled: activeSubTab === 'manage',
  });

  // Fetch sync status
  const { data: syncStatus } = useQuery({
    queryKey: ['economic-calendar', 'sync-status'],
    queryFn: () => economicCalendarService.getSyncStatus(),
  });

  // Filtered events for manage tab
  const filteredEvents = useMemo(() => {
    if (!allEvents) return [];
    if (!searchQuery) return allEvents;
    const query = searchQuery.toLowerCase();
    return allEvents.filter(
      (event) =>
        event.event_name.toLowerCase().includes(query) ||
        event.currency.toLowerCase().includes(query)
    );
  }, [allEvents, searchQuery]);

  // Group upcoming events by date
  const groupedUpcoming = useMemo(() => {
    if (!highImpactEvents?.upcoming) return {};
    const groups: Record<string, EconomicEvent[]> = {};
    highImpactEvents.upcoming.forEach((event) => {
      const dateKey = formatDateInGMT2(event.event_datetime);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });
    return groups;
  }, [highImpactEvents?.upcoming]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: EconomicEventCreateData) => economicCalendarService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['economic-calendar'] });
      toast({ title: 'Success', description: 'Event created successfully' });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create event', variant: 'destructive' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EconomicEventUpdateData }) =>
      economicCalendarService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['economic-calendar'] });
      toast({ title: 'Success', description: 'Event updated successfully' });
      setIsEditDialogOpen(false);
      setSelectedEvent(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update event', variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => economicCalendarService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['economic-calendar'] });
      toast({ title: 'Success', description: 'Event deleted successfully' });
      setIsDeleteDialogOpen(false);
      setSelectedEvent(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete event', variant: 'destructive' });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => economicCalendarService.toggleActive(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['economic-calendar'] });
      toast({ title: 'Success', description: data.message });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to toggle status', variant: 'destructive' });
    },
  });

  // Sync handler
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await economicCalendarService.triggerSync();
      queryClient.invalidateQueries({ queryKey: ['economic-calendar'] });
      toast({
        title: 'Sync Complete',
        description: `Created: ${result.result.created}, Updated: ${result.result.updated}, Skipped: ${result.result.skipped}`,
      });
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync from Forex Factory',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      event_name: '',
      currency: 'USD',
      impact: 'high',
      event_datetime: '',
      time_window_minutes: 5,
      forecast_value: '',
      previous_value: '',
      actual_value: '',
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      event_name: formData.event_name,
      currency: formData.currency,
      impact: formData.impact,
      event_datetime: formData.event_datetime,
      time_window_minutes: formData.time_window_minutes,
      forecast_value: formData.forecast_value || undefined,
      previous_value: formData.previous_value || undefined,
      actual_value: formData.actual_value || undefined,
    });
  };

  const handleEdit = (event: EconomicEvent) => {
    setSelectedEvent(event);
    setFormData({
      event_name: event.event_name,
      currency: event.currency,
      impact: event.impact,
      event_datetime: event.event_datetime.slice(0, 16),
      time_window_minutes: event.time_window_minutes,
      forecast_value: event.forecast_value || '',
      previous_value: event.previous_value || '',
      actual_value: event.actual_value || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedEvent) return;
    updateMutation.mutate({
      id: selectedEvent.id,
      data: {
        event_name: formData.event_name,
        currency: formData.currency,
        impact: formData.impact,
        event_datetime: formData.event_datetime,
        time_window_minutes: formData.time_window_minutes,
        forecast_value: formData.forecast_value || null,
        previous_value: formData.previous_value || null,
        actual_value: formData.actual_value || null,
      },
    });
  };

  const handleDelete = (event: EconomicEvent) => {
    setSelectedEvent(event);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedEvent) {
      deleteMutation.mutate(selectedEvent.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sync Status Card */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
        <div className="space-y-1">
          <p className="text-sm font-medium">Forex Factory Sync</p>
          <p className="text-sm text-muted-foreground">
            {syncStatus?.last_sync_at
              ? `Last synced: ${formatDateTimeGMT2(syncStatus.last_sync_at)}`
              : 'Never synced'}
            {syncStatus?.next_sync_at &&
              ` | Next: ${formatDateTimeGMT2(syncStatus.next_sync_at)}`}
          </p>
        </div>
        <Button onClick={handleSync} disabled={isSyncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync from API'}
        </Button>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="events">View Events</TabsTrigger>
          <TabsTrigger value="manage">Manage Events</TabsTrigger>
        </TabsList>

        {/* Events Sub-Tab */}
        <TabsContent value="events" className="space-y-6">
          {/* Currency Filter */}
          <div className="flex gap-4 items-center">
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Currencies</SelectItem>
                {AVAILABLE_CURRENCIES.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Times displayed in GMT+2 (MT5 Server Time)
            </span>
          </div>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Upcoming High-Impact Events
              </CardTitle>
              <CardDescription>
                Scheduled economic news events that may affect trading
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHighImpact ? (
                <div className="text-center py-8 text-muted-foreground">Loading events...</div>
              ) : Object.keys(groupedUpcoming).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupedUpcoming).map(([date, events]) => (
                    <div key={date}>
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {date}
                      </h3>
                      <div className="space-y-2">
                        {events.map((event) => (
                          <TooltipProvider key={event.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                  <div className="flex items-center gap-4">
                                    <Badge className={getImpactBadgeClass(event.impact)}>
                                      {event.impact.toUpperCase()}
                                    </Badge>
                                    <span className="font-mono text-sm">
                                      {formatInGMT2(event.event_datetime)}
                                    </span>
                                    <Badge variant="outline">{event.currency}</Badge>
                                    <span className="font-medium">{event.event_name}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    {event.forecast_value && (
                                      <span>Forecast: {event.forecast_value}</span>
                                    )}
                                    {event.previous_value && (
                                      <span>Previous: {event.previous_value}</span>
                                    )}
                                    <Clock className="h-4 w-4" />
                                    <span>{event.time_window_minutes}min</span>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Time shown in GMT+2 (MT5 Server Time)</p>
                                <p className="text-xs text-muted-foreground">
                                  UTC: {format(parseISO(event.event_datetime), 'HH:mm')}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming high-impact events found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Events (Past 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHighImpact ? (
                <div className="text-center py-8 text-muted-foreground">Loading events...</div>
              ) : highImpactEvents?.past && highImpactEvents.past.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time (GMT+2)</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Forecast</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Previous</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {highImpactEvents.past.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-mono text-sm">
                            {formatDateTimeGMT2(event.event_datetime)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{event.currency}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{event.event_name}</TableCell>
                          <TableCell>{event.forecast_value || '-'}</TableCell>
                          <TableCell className="font-semibold">
                            {event.actual_value || '-'}
                          </TableCell>
                          <TableCell>{event.previous_value || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent events found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Sub-Tab */}
        <TabsContent value="manage" className="space-y-6">
          {/* Filters and Actions */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Currencies</SelectItem>
                {AVAILABLE_CURRENCIES.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={impactFilter} onValueChange={setImpactFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Impact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Impact</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>

          {/* Events Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time (GMT+2)</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAll ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading events...
                    </TableCell>
                  </TableRow>
                ) : filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDateTimeGMT2(event.event_datetime)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{event.currency}</Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {event.event_name}
                      </TableCell>
                      <TableCell>
                        <Badge className={getImpactBadgeClass(event.impact)}>
                          {event.impact}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.time_window_minutes}min</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {event.source === 'forex_factory' ? 'FF' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.is_active ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActiveMutation.mutate(event.id)}
                            title={event.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {event.is_active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(event)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(event)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No events found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedEvent(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? 'Edit Event' : 'Add Event'}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen
                ? 'Update the economic event details'
                : 'Add a new economic event manually'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event_name">Event Name *</Label>
              <Input
                id="event_name"
                value={formData.event_name}
                onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                placeholder="e.g., Non-Farm Payrolls"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="impact">Impact *</Label>
                <Select
                  value={formData.impact}
                  onValueChange={(value: ImpactLevel) =>
                    setFormData({ ...formData, impact: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_datetime">Date & Time (UTC) *</Label>
                <Input
                  id="event_datetime"
                  type="datetime-local"
                  value={formData.event_datetime}
                  onChange={(e) => setFormData({ ...formData, event_datetime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_window_minutes">Time Window (minutes)</Label>
                <Input
                  id="time_window_minutes"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.time_window_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, time_window_minutes: parseInt(e.target.value) || 5 })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="forecast_value">Forecast</Label>
                <Input
                  id="forecast_value"
                  value={formData.forecast_value}
                  onChange={(e) => setFormData({ ...formData, forecast_value: e.target.value })}
                  placeholder="e.g., 3.5%"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previous_value">Previous</Label>
                <Input
                  id="previous_value"
                  value={formData.previous_value}
                  onChange={(e) => setFormData({ ...formData, previous_value: e.target.value })}
                  placeholder="e.g., 3.2%"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actual_value">Actual</Label>
                <Input
                  id="actual_value"
                  value={formData.actual_value}
                  onChange={(e) => setFormData({ ...formData, actual_value: e.target.value })}
                  placeholder="e.g., 3.7%"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedEvent(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleUpdate : handleCreate}
              disabled={!formData.event_name || !formData.event_datetime}
            >
              {isEditDialogOpen ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedEvent?.event_name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
