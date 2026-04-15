import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, setHours, setMinutes } from 'date-fns';
import { Calendar, Clock, Mail, User, MessageSquare, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import meetingService, { MeetingProfile } from '@/services/meetingService';

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotData: { date: Date; hour: number; minutes: number } | null;
  profile: MeetingProfile | null;
}

const DURATION_OPTIONS = [15, 30, 60];

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function generateTimeOptions(startHour = 0, endHour = 24) {
  const options: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  return options;
}

export default function CreateBookingDialog({
  open,
  onOpenChange,
  slotData,
  profile,
}: CreateBookingDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [duration, setDuration] = useState('30');
  const [time, setTime] = useState('09:00');
  const [sendEmail, setSendEmail] = useState(true);

  // Pre-fill time when slot data changes
  useEffect(() => {
    if (slotData) {
      setTime(`${pad2(slotData.hour)}:${pad2(slotData.minutes)}`);
    }
  }, [slotData]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setGuestName('');
      setGuestEmail('');
      setGuestNotes('');
      setDuration('30');
      setSendEmail(true);
    }
  }, [open]);

  const createBooking = useMutation({
    mutationFn: (data: {
      guest_name: string;
      guest_email: string;
      guest_notes: string;
      start_time: string;
      duration_minutes: number;
      timezone: string;
      send_email: boolean;
    }) => meetingService.createBooking(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['meeting-bookings'] });
      toast({ title: 'Meeting created', description: sendEmail ? 'Invitation email sent to guest.' : 'Booking created without email.' });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create meeting', description: err.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotData || !guestName.trim() || !guestEmail.trim()) return;

    const [h, m] = time.split(':').map(Number);
    const startDate = setMinutes(setHours(slotData.date, h), m);
    const tz = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    createBooking.mutate({
      guest_name: guestName.trim(),
      guest_email: guestEmail.trim(),
      guest_notes: guestNotes.trim(),
      start_time: format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
      duration_minutes: parseInt(duration),
      timezone: tz,
      send_email: sendEmail,
    });
  };

  const timeOptions = generateTimeOptions(0, 24);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Create Meeting
          </DialogTitle>
          <DialogDescription>
            {slotData ? format(slotData.date, 'EEEE, MMMM d, yyyy') : 'Schedule a new meeting'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Guest Name */}
          <div>
            <Label className="flex items-center gap-1.5 text-xs mb-1.5">
              <User className="h-3 w-3" /> Guest Name
            </Label>
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>

          {/* Guest Email */}
          <div>
            <Label className="flex items-center gap-1.5 text-xs mb-1.5">
              <Mail className="h-3 w-3" /> Guest Email
            </Label>
            <Input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>

          {/* Time + Duration row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1.5 text-xs mb-1.5">
                <Clock className="h-3 w-3" /> Time
              </Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {timeOptions.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="flex items-center gap-1.5 text-xs mb-1.5">
              <MessageSquare className="h-3 w-3" /> Notes (optional)
            </Label>
            <Textarea
              value={guestNotes}
              onChange={(e) => setGuestNotes(e.target.value)}
              placeholder="Meeting agenda or details..."
              rows={2}
            />
          </div>

          {/* Send Email Toggle */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-sm">Send invitation email</Label>
            </div>
            <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={createBooking.isPending || !guestName.trim() || !guestEmail.trim()}
          >
            {createBooking.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Creating...
              </>
            ) : (
              'Create Meeting'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
