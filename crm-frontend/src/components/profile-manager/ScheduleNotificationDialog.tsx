import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimePicker } from '@/components/ui/time-picker';
import { Loader2, Clock, Pencil, Calendar as CalendarIcon, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ScheduledNotification } from '@/services/notificationService';

const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'kyc', label: 'KYC Update' },
  { value: 'challenge', label: 'Challenge Update' },
  { value: 'payout', label: 'Payout Info' },
  { value: 'system', label: 'System Alert' },
];

export interface ScheduleNotificationFormData {
  title: string;
  message: string;
  type: string;
  scheduled_for: string;
  expires_at: string | null;
  action_url: string | null;
  user_email?: string;
}

interface ScheduleNotificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ScheduleNotificationFormData) => Promise<void>;
  notification?: ScheduledNotification | null;
  traderEmail?: string;
}

export default function ScheduleNotificationDialog({
  isOpen,
  onClose,
  onSubmit,
  notification,
  traderEmail,
}: ScheduleNotificationDialogProps) {
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info',
    action_url: '',
  });
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [expiresDate, setExpiresDate] = useState<Date | undefined>(undefined);
  const [expiresTime, setExpiresTime] = useState('17:00');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!notification;

  useEffect(() => {
    if (notification) {
      setForm({
        title: notification.title || '',
        message: notification.message || '',
        type: notification.type || 'info',
        action_url: notification.action_url || '',
      });
      if (notification.scheduled_for) {
        const d = new Date(notification.scheduled_for);
        setScheduledDate(d);
        setScheduledTime(d.toTimeString().slice(0, 5));
      }
      if (notification.expires_at) {
        const d = new Date(notification.expires_at);
        setExpiresDate(d);
        setExpiresTime(d.toTimeString().slice(0, 5));
      } else {
        setExpiresDate(undefined);
        setExpiresTime('17:00');
      }
    } else {
      setForm({ title: '', message: '', type: 'info', action_url: '' });
      setScheduledDate(undefined);
      setScheduledTime('09:00');
      setExpiresDate(undefined);
      setExpiresTime('17:00');
    }
    setErrors({});
  }, [notification, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.message.trim()) errs.message = 'Message is required';
    if (!scheduledDate) errs.scheduled_for = 'Schedule date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const scheduled_for = scheduledDate
        ? `${format(scheduledDate, 'yyyy-MM-dd')}T${scheduledTime}`
        : '';
      const expires_at = expiresDate
        ? `${format(expiresDate, 'yyyy-MM-dd')}T${expiresTime}`
        : null;

      const data: ScheduleNotificationFormData = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        scheduled_for,
        expires_at,
        action_url: form.action_url || null,
      };
      if (traderEmail) {
        data.user_email = traderEmail;
      }
      await onSubmit(data);
    } finally {
      setSaving(false);
    }
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 rounded-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isEdit ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
              {isEdit ? (
                <Pencil size={18} className="text-amber-600 dark:text-amber-400" />
              ) : (
                <Clock size={18} className="text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isEdit ? 'Edit Scheduled Notification' : 'Schedule Notification'}
              </h2>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {isEdit ? 'Update the scheduled notification details' : 'Schedule a notification to be sent at a specific time'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Recipient Card */}
          {traderEmail && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail size={14} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Recipient</p>
                <p className="text-sm font-medium font-mono truncate">{traderEmail}</p>
              </div>
            </div>
          )}

          {/* Title */}
          <Field label="Title" error={errors.title} required>
            <Input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Notification title"
              className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
            />
          </Field>

          {/* Message */}
          <Field label="Message" error={errors.message} required>
            <Textarea
              value={form.message}
              onChange={(e) => update('message', e.target.value)}
              rows={3}
              placeholder="Notification message…"
              className="text-sm bg-muted/30 border-border/50 focus:bg-background resize-none"
            />
          </Field>

          {/* Type */}
          <Field label="Type">
            <Select value={form.type} onValueChange={(v) => update('type', v)}>
              <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Scheduled For */}
          <Field label="Scheduled For" error={errors.scheduled_for} required>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1 justify-start text-left font-normal h-9 text-sm bg-muted/30 border-border/50",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {scheduledDate ? format(scheduledDate, 'PP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={scheduledDate}
                    onSelect={(d) => {
                      setScheduledDate(d);
                      if (errors.scheduled_for) setErrors((prev) => { const n = { ...prev }; delete n.scheduled_for; return n; });
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <TimePicker
                value={scheduledTime}
                onChange={setScheduledTime}
                className="w-[130px]"
              />
            </div>
          </Field>

          {/* Expires At */}
          <Field label="Expires At" optional>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1 justify-start text-left font-normal h-9 text-sm bg-muted/30 border-border/50",
                      !expiresDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {expiresDate ? format(expiresDate, 'PP') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={expiresDate}
                    onSelect={setExpiresDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <TimePicker
                value={expiresTime}
                onChange={setExpiresTime}
                className="w-[130px]"
              />
            </div>
          </Field>

          {/* Action URL */}
          <Field label="Action URL" optional>
            <Input
              type="url"
              value={form.action_url}
              onChange={(e) => update('action_url', e.target.value)}
              placeholder="/dashboard/payouts/"
              className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
            />
          </Field>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
            className="h-9"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 min-w-[140px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                {isEdit ? 'Saving…' : 'Scheduling…'}
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                {isEdit ? 'Save Changes' : 'Schedule'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  required,
  optional,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
        {optional && <span className="text-muted-foreground/60 text-[10px]">(optional)</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
