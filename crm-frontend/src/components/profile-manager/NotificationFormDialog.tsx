import { useState, useEffect, useRef } from 'react';
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
import { Loader2, Bell, Pencil, Mail, Send, Upload, X } from 'lucide-react';
import { notificationService } from '@/services/notificationService';

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

export interface NotificationFormData {
  title: string;
  message: string;
  type: string;
  expires_at: string | null;
  action_url: string | null;
  image_url: string | null;
  user_email?: string;
}

interface NotificationFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NotificationFormData) => Promise<void>;
  notification?: any | null;
  traderEmail?: string;
}

export default function NotificationFormDialog({
  isOpen,
  onClose,
  onSubmit,
  notification,
  traderEmail,
}: NotificationFormDialogProps) {
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info',
    expires_at: '',
    action_url: '',
    image_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!notification;

  useEffect(() => {
    if (notification) {
      setForm({
        title: notification.title || '',
        message: notification.message || '',
        type: notification.type || 'info',
        expires_at: notification.expires_at
          ? new Date(notification.expires_at).toISOString().slice(0, 16)
          : '',
        action_url: notification.action_url || '',
        image_url: notification.image_url || '',
      });
    } else {
      setForm({ title: '', message: '', type: 'info', expires_at: '', action_url: '', image_url: '' });
    }
    setErrors({});
  }, [notification, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.message.trim()) errs.message = 'Message is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const data: NotificationFormData = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        expires_at: form.expires_at || null,
        action_url: form.action_url || null,
        image_url: form.image_url || null,
      };
      if (!isEdit && traderEmail) {
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
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 rounded-xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isEdit ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
              {isEdit ? (
                <Pencil size={18} className="text-amber-600 dark:text-amber-400" />
              ) : (
                <Bell size={18} className="text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isEdit ? 'Edit Notification' : 'Send Custom Notification'}
              </h2>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {isEdit ? 'Modify the notification details below' : 'Create a personalized notification for this trader'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {/* Recipient Card (Create only) */}
          {traderEmail && !isEdit && (
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

          {/* Optional Fields */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expires At" optional>
              <Input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => update('expires_at', e.target.value)}
                className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background"
              />
            </Field>
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

          {/* Image Upload */}
          <Field label="Image" optional>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  const res = await notificationService.uploadImage(file);
                  if (res.data?.url) {
                    update('image_url', res.data.url);
                  }
                } catch {
                  // upload failed
                } finally {
                  setUploading(false);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
              }}
            />
            {form.image_url ? (
              <div className="flex items-center gap-3 mt-1">
                <img src={form.image_url} alt="Preview" className="h-10 w-10 rounded object-cover" />
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => update('image_url', '')}>
                  <X className="h-3.5 w-3.5 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs mt-1"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                {uploading ? 'Uploading...' : 'Upload Image'}
              </Button>
            )}
          </Field>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20">
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
                {isEdit ? 'Saving…' : 'Sending…'}
              </>
            ) : (
              <>
                {isEdit ? (
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                )}
                {isEdit ? 'Save Changes' : 'Send Notification'}
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
