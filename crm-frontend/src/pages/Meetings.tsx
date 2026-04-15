import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import {
  Video, Calendar, Settings, Clock, Plus, Trash2, Copy, Check,
  ExternalLink, X, Globe, Link2,
  AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import meetingService, { MeetingProfile, MeetingBooking, MeetingAvailability, MeetingDateOverride } from '@/services/meetingService';
import WeekCalendar from '@/components/meetings/WeekCalendar';
import CreateBookingDialog from '@/components/meetings/CreateBookingDialog';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIMEZONES = [
  'UTC', 'Europe/London', 'Europe/Amsterdam', 'Europe/Berlin', 'Europe/Paris',
  'Europe/Helsinki', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland',
];

export default function Meetings() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedLink, setCopiedLink] = useState(false);
  const [instantMeetingLoading, setInstantMeetingLoading] = useState(false);
  const [instantGuestLink, setInstantGuestLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('bookings');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [slotData, setSlotData] = useState<{ date: Date; hour: number; minutes: number } | null>(null);

  const handleSlotClick = (day: Date, hour: number, minutes: number) => {
    setSlotData({ date: day, hour, minutes });
    setCreateDialogOpen(true);
  };

  // Check for Google Calendar callback
  useEffect(() => {
    if (searchParams.get('google') === 'connected') {
      toast({ title: 'Google Calendar Connected', description: 'Your calendar is now synced.' });
      queryClient.invalidateQueries({ queryKey: ['meeting-profile'] });
    }
  }, [searchParams]);

  // Queries
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['meeting-profile'],
    queryFn: () => meetingService.getProfile(),
  });

  const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['meeting-bookings', format(weekStart, 'yyyy-MM-dd')],
    queryFn: () => meetingService.getBookings({
      date_from: format(weekStart, 'yyyy-MM-dd'),
      date_to: format(weekEnd, 'yyyy-MM-dd'),
    }),
  });

  const { data: availability = [] } = useQuery({
    queryKey: ['meeting-availability'],
    queryFn: () => meetingService.getAvailability(),
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['meeting-overrides'],
    queryFn: () => meetingService.getOverrides(),
  });

  // Mutations
  const updateProfile = useMutation({
    mutationFn: (data: Partial<MeetingProfile>) => meetingService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-profile'] });
      toast({ title: 'Profile updated' });
    },
    onError: () => toast({ title: 'Failed to update profile', variant: 'destructive' }),
  });

  const createAvailability = useMutation({
    mutationFn: (data: Omit<MeetingAvailability, 'id'>) => meetingService.createAvailability(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-availability'] });
      toast({ title: 'Availability added' });
    },
    onError: () => toast({ title: 'Failed to add availability', variant: 'destructive' }),
  });

  const deleteAvailability = useMutation({
    mutationFn: (id: string) => meetingService.deleteAvailability(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-availability'] });
      toast({ title: 'Availability removed' });
    },
  });

  const createOverride = useMutation({
    mutationFn: (data: Omit<MeetingDateOverride, 'id'>) => meetingService.createOverride(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-overrides'] });
      toast({ title: 'Override added' });
    },
    onError: () => toast({ title: 'Failed to add override', variant: 'destructive' }),
  });

  const deleteOverride = useMutation({
    mutationFn: (id: string) => meetingService.deleteOverride(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-overrides'] });
      toast({ title: 'Override removed' });
    },
  });

  const updateBookingStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'cancelled' | 'completed' }) =>
      meetingService.updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-bookings'] });
      toast({ title: 'Booking updated' });
    },
    onError: () => toast({ title: 'Failed to update booking', variant: 'destructive' }),
  });

  const handleCopyLink = () => {
    if (profile?.booking_url) {
      navigator.clipboard.writeText(profile.booking_url);
      setCopiedLink(true);
      toast({ title: 'Booking link copied!' });
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleJoinMeeting = async (booking: MeetingBooking) => {
    const meetingWindow = window.open('', '_blank');
    try {
      const data = await meetingService.getHostToken(booking.id);
      if (!data.room_url || !data.room_url.startsWith('http')) {
        throw new Error('Invalid room URL');
      }
      const url = `${data.room_url}?t=${data.token}`;
      if (meetingWindow) {
        meetingWindow.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch {
      if (meetingWindow) meetingWindow.close();
      toast({ title: 'Failed to get meeting link', description: 'The video room could not be created. Please try again.', variant: 'destructive' });
    }
  };

  const handleInstantMeeting = async () => {
    const meetingWindow = window.open('', '_blank');
    setInstantMeetingLoading(true);
    try {
      const data = await meetingService.startInstantMeeting();
      const url = `${data.room_url}?t=${data.token}`;
      if (meetingWindow) {
        meetingWindow.location.href = url;
      } else {
        window.location.href = url;
      }
      setInstantGuestLink(data.guest_link);
      queryClient.invalidateQueries({ queryKey: ['meeting-bookings'] });
      toast({ title: 'Meeting started', description: 'Your instant meeting room is ready.' });
    } catch {
      if (meetingWindow) meetingWindow.close();
      toast({ title: 'Failed to start meeting', variant: 'destructive' });
    } finally {
      setInstantMeetingLoading(false);
    }
  };

  const handleCopyGuestLink = () => {
    if (instantGuestLink) {
      navigator.clipboard.writeText(instantGuestLink);
      toast({ title: 'Guest link copied!' });
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const { auth_url } = await meetingService.getGoogleAuthUrl();
      window.location.href = auth_url;
    } catch {
      toast({ title: 'Failed to get Google auth URL', variant: 'destructive' });
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      await meetingService.disconnectGoogle();
      queryClient.invalidateQueries({ queryKey: ['meeting-profile'] });
      toast({ title: 'Google Calendar disconnected' });
    } catch {
      toast({ title: 'Failed to disconnect', variant: 'destructive' });
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Meeting Room</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your booking page, availability, and meetings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleInstantMeeting} disabled={instantMeetingLoading}>
            {instantMeetingLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Video className="h-4 w-4 mr-2" />}
            Start Meeting
          </Button>
          {instantGuestLink && (
            <Button variant="outline" size="sm" onClick={handleCopyGuestLink}>
              <Copy className="h-4 w-4 mr-2" />
              Share Link
            </Button>
          )}
          {profile?.booking_url && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {copiedLink ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(profile.booking_url, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {profile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Booking Page</p>
                <p className="font-semibold text-sm truncate max-w-[150px]">/{profile.slug}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="font-semibold">{bookings.filter((b: MeetingBooking) => b.status === 'confirmed').length} meetings</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durations</p>
                <p className="font-semibold">{profile.durations_offered.join(', ')} min</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${profile.google_calendar_connected ? 'bg-green-500/20' : 'bg-muted'}`}>
                <Globe className={`h-5 w-5 ${profile.google_calendar_connected ? 'text-green-400' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Google Calendar</p>
                <p className="font-semibold">{profile.google_calendar_connected ? 'Connected' : 'Not connected'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Video className="h-4 w-4" /> Bookings
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Availability
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Page Settings
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Bookings — Week Calendar */}
        <TabsContent value="bookings" className="mt-4">
          <WeekCalendar
            bookings={bookings}
            isLoading={bookingsLoading}
            onJoinMeeting={handleJoinMeeting}
            onCancelBooking={(b) => updateBookingStatus.mutate({ id: b.id, status: 'cancelled' })}
            onCompleteMeeting={(b) => updateBookingStatus.mutate({ id: b.id, status: 'completed' })}
            currentWeekStart={currentWeekStart}
            onWeekChange={setCurrentWeekStart}
            availability={availability}
            onSlotClick={handleSlotClick}
          />
          <CreateBookingDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            slotData={slotData}
            profile={profile || null}
          />
        </TabsContent>

        {/* Tab 2: Availability */}
        <TabsContent value="availability" className="space-y-6 mt-4">
          <AvailabilitySection
            availability={availability}
            onAdd={(data) => createAvailability.mutate(data)}
            onDelete={(id) => deleteAvailability.mutate(id)}
          />
          <OverridesSection
            overrides={overrides}
            onAdd={(data) => createOverride.mutate(data)}
            onDelete={(id) => deleteOverride.mutate(id)}
          />
          {profile && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Buffer & Booking Window</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Buffer between meetings (minutes)</Label>
                  <Input
                    type="number"
                    value={profile.buffer_minutes}
                    onChange={(e) => updateProfile.mutate({ buffer_minutes: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Max days ahead</Label>
                  <Input
                    type="number"
                    value={profile.max_days_ahead}
                    onChange={(e) => updateProfile.mutate({ max_days_ahead: parseInt(e.target.value) || 30 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Minimum notice (hours)</Label>
                  <Input
                    type="number"
                    value={profile.min_notice_hours}
                    onChange={(e) => updateProfile.mutate({ min_notice_hours: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Guests cannot book within this many hours</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Page Settings */}
        <TabsContent value="settings" className="space-y-6 mt-4">
          {profile && (
            <ProfileSettingsSection
              profile={profile}
              onUpdate={(data) => updateProfile.mutate(data)}
              onGoogleConnect={handleGoogleConnect}
              onGoogleDisconnect={handleGoogleDisconnect}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


// ============================================================
// Sub-components
// ============================================================

function AvailabilitySection({
  availability,
  onAdd,
  onDelete,
}: {
  availability: MeetingAvailability[];
  onAdd: (data: Omit<MeetingAvailability, 'id'>) => void;
  onDelete: (id: string) => void;
}) {
  const [newDay, setNewDay] = useState('0');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');

  const groupedByDay = DAY_NAMES.map((name, idx) => ({
    name,
    short: DAY_SHORT[idx],
    idx,
    slots: availability.filter(a => a.day_of_week === idx),
  }));

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Weekly Schedule
        </CardTitle>
        <CardDescription>Set your recurring available hours</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
          <div className="flex-1">
            <Label className="text-xs">Day</Label>
            <Select value={newDay} onValueChange={setNewDay}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((d, i) => (
                  <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1 sm:flex-none">
              <Label className="text-xs">From</Label>
              <Input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} className="mt-1 w-full sm:w-32" />
            </div>
            <div className="flex-1 sm:flex-none">
              <Label className="text-xs">To</Label>
              <Input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="mt-1 w-full sm:w-32" />
            </div>
            <Button
              size="sm"
              onClick={() => onAdd({
                day_of_week: parseInt(newDay),
                start_time: newStart,
                end_time: newEnd,
                is_active: true,
              })}
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Schedule grid */}
        <div className="space-y-2">
          {groupedByDay.map(day => (
            <div key={day.idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2 border-b border-border/20 last:border-0">
              <span className="w-24 text-sm font-medium shrink-0">{day.name}</span>
              <div className="flex-1 flex flex-wrap gap-2">
                {day.slots.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Unavailable</span>
                ) : (
                  day.slots.map(slot => (
                    <Badge key={slot.id} variant="outline" className="flex items-center gap-1.5 py-1 px-2">
                      <Clock className="h-3 w-3" />
                      {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                      <button
                        onClick={() => slot.id && onDelete(slot.id)}
                        className="ml-1 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OverridesSection({
  overrides,
  onAdd,
  onDelete,
}: {
  overrides: MeetingDateOverride[];
  onAdd: (data: Omit<MeetingDateOverride, 'id'>) => void;
  onDelete: (id: string) => void;
}) {
  const [newDate, setNewDate] = useState('');
  const [isBlocked, setIsBlocked] = useState(true);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> Date Overrides
        </CardTitle>
        <CardDescription>Block specific dates or set custom hours</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
          <div className="flex-1 sm:flex-none">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="mt-1 w-full sm:w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isBlocked} onCheckedChange={setIsBlocked} />
            <Label className="text-xs">{isBlocked ? 'Block day' : 'Custom hours'}</Label>
          </div>
          {!isBlocked && (
            <div className="flex items-end gap-3">
              <div className="flex-1 sm:flex-none">
                <Label className="text-xs">From</Label>
                <Input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} className="mt-1 w-full sm:w-32" />
              </div>
              <div className="flex-1 sm:flex-none">
                <Label className="text-xs">To</Label>
                <Input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="mt-1 w-full sm:w-32" />
              </div>
            </div>
          )}
          <Button
            size="sm"
            className="self-end"
            onClick={() => {
              if (!newDate) return;
              onAdd({
                date: newDate,
                is_blocked: isBlocked,
                start_time: isBlocked ? null : newStart,
                end_time: isBlocked ? null : newEnd,
              });
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {overrides.length > 0 && (
          <div className="space-y-2">
            {overrides.map(override => (
              <div key={override.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20 border border-border/20">
                <div className="flex items-center gap-3">
                  <Badge variant={override.is_blocked ? 'destructive' : 'outline'} className="text-xs">
                    {override.is_blocked ? 'Blocked' : 'Custom'}
                  </Badge>
                  <span className="text-sm font-medium">{override.date}</span>
                  {!override.is_blocked && override.start_time && (
                    <span className="text-xs text-muted-foreground">
                      {override.start_time?.slice(0, 5)} - {override.end_time?.slice(0, 5)}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 h-7 w-7 p-0"
                  onClick={() => override.id && onDelete(override.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileSettingsSection({
  profile,
  onUpdate,
  onGoogleConnect,
  onGoogleDisconnect,
}: {
  profile: MeetingProfile;
  onUpdate: (data: Partial<MeetingProfile>) => void;
  onGoogleConnect: () => void;
  onGoogleDisconnect: () => void;
}) {
  const [slug, setSlug] = useState(profile.slug);
  const [headline, setHeadline] = useState(profile.headline);
  const [bio, setBio] = useState(profile.bio);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [durations, setDurations] = useState<number[]>(profile.durations_offered);
  const [defaultDuration, setDefaultDuration] = useState(profile.default_duration);
  const [isActive, setIsActive] = useState(profile.is_active);
  const { toast } = useToast();

  const toggleDuration = (d: number) => {
    setDurations(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleSave = () => {
    onUpdate({
      slug,
      headline,
      bio,
      timezone,
      durations_offered: durations,
      default_duration: defaultDuration,
      is_active: isActive,
    });
  };

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Booking Page</CardTitle>
          <CardDescription>Customize what visitors see on your booking page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>URL Slug</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">meet.we-fund.com/</span>
              <Input value={slug} onChange={e => setSlug(e.target.value)} className="flex-1" />
            </div>
          </div>
          <div>
            <Label>Headline</Label>
            <Input value={headline} onChange={e => setHeadline(e.target.value)} className="mt-1" placeholder="Book a call with..." />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} className="mt-1" rows={3} placeholder="A short intro..." />
          </div>
          <div>
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Durations Offered</Label>
            <div className="flex gap-3 mt-2">
              {[15, 30, 60].map(d => (
                <button
                  key={d}
                  onClick={() => toggleDuration(d)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    durations.includes(d)
                      ? 'bg-primary/20 border-primary/40 text-primary'
                      : 'border-border/30 text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Default Duration</Label>
            <Select value={String(defaultDuration)} onValueChange={v => setDefaultDuration(parseInt(v))}>
              <SelectTrigger className="mt-1 w-full sm:w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {durations.map(d => (
                  <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Booking Page Active</Label>
              <p className="text-xs text-muted-foreground">When disabled, your booking page returns 404</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button onClick={handleSave} className="w-full">Save Settings</Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> Google Calendar
          </CardTitle>
          <CardDescription>Sync your calendar to automatically block busy times</CardDescription>
        </CardHeader>
        <CardContent>
          {profile.google_calendar_connected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Connected</p>
                  <p className="text-xs text-muted-foreground">{profile.google_calendar_id || 'Primary calendar'}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onGoogleDisconnect}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={onGoogleConnect} className="w-full">
              <Globe className="h-4 w-4 mr-2" /> Connect Google Calendar
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  );
}
