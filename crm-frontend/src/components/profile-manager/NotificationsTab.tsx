import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Bell, Plus, Pencil, Trash2, ExternalLink, AlertTriangle, ShieldAlert, Clock, Pause, Play, X, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/apiService';
import { notificationService, type ScheduledNotification } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';
import NotificationFormDialog, { type NotificationFormData } from '@/components/profile-manager/NotificationFormDialog';
import ScheduleNotificationDialog, { type ScheduleNotificationFormData } from '@/components/profile-manager/ScheduleNotificationDialog';

interface NotificationsTabProps {
  notifications: any[];
  traderEmail?: string;
}

const TYPE_STYLES: Record<string, string> = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  kyc: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  challenge: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  payout: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  system: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  info: 'bg-muted text-muted-foreground border-border/60',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  paused: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  sent: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function NotificationsTab({ notifications, traderEmail }: NotificationsTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Custom notification state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<any | null>(null);
  const [deletingNotification, setDeletingNotification] = useState<any | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Scheduled notification state
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(true);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [editingScheduled, setEditingScheduled] = useState<ScheduledNotification | null>(null);
  const [deletingScheduled, setDeletingScheduled] = useState<ScheduledNotification | null>(null);
  const [scheduleConfirmText, setScheduleConfirmText] = useState('');
  const [isDeletingScheduled, setIsDeletingScheduled] = useState(false);

  // Fetch scheduled notifications
  const fetchScheduled = async () => {
    try {
      setScheduledLoading(true);
      const response = await notificationService.listScheduled();
      // Filter to only this trader's scheduled notifications
      const all = (response.data || []) as ScheduledNotification[];
      const filtered = traderEmail
        ? all.filter(n => n.user_email === traderEmail)
        : all;
      setScheduledNotifications(filtered);
    } catch {
      // Silently fail — scheduled section just shows empty
    } finally {
      setScheduledLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduled();
  }, [traderEmail]);

  // Custom notification handlers
  const getEndpoint = (id?: string) => {
    return id ? `/notifications/custom/${id}/` : '/notifications/custom/';
  };

  const handleCreate = () => {
    setEditingNotification(null);
    setIsFormOpen(true);
  };

  const handleEdit = (notification: any) => {
    setEditingNotification(notification);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: NotificationFormData) => {
    try {
      if (editingNotification) {
        const res = await apiService.put(getEndpoint(editingNotification.id), data);
        if (res.error) throw new Error(res.error);
        toast({ title: 'Success', description: 'Notification updated' });
      } else {
        const res = await apiService.post(getEndpoint(), data);
        if (res.error) throw new Error(res.error);
        toast({ title: 'Success', description: 'Notification created' });
      }
      setIsFormOpen(false);
      setEditingNotification(null);
      queryClient.invalidateQueries({ queryKey: ['trader-full-profile'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save notification', variant: 'destructive' });
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deletingNotification || confirmText !== 'DELETE') return;
    setIsDeleting(true);
    try {
      const res = await apiService.delete(getEndpoint(deletingNotification.id));
      if (res.error) throw new Error(res.error);
      toast({ title: 'Success', description: 'Notification deleted' });
      queryClient.invalidateQueries({ queryKey: ['trader-full-profile'] });
      setDeletingNotification(null);
      setConfirmText('');
    } catch {
      toast({ title: 'Error', description: 'Failed to delete notification', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    if (!open) {
      setDeletingNotification(null);
      setConfirmText('');
    }
  };

  // Scheduled notification handlers
  const handleScheduleSubmit = async (data: ScheduleNotificationFormData) => {
    try {
      if (editingScheduled) {
        await notificationService.updateScheduled(editingScheduled.id, data);
        toast({ title: 'Success', description: 'Scheduled notification updated' });
      } else {
        await notificationService.createScheduled(data);
        toast({ title: 'Success', description: 'Notification scheduled' });
      }
      setIsScheduleOpen(false);
      setEditingScheduled(null);
      fetchScheduled();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to schedule notification', variant: 'destructive' });
      throw err;
    }
  };

  const handleScheduledAction = async (id: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      if (action === 'pause') await notificationService.pauseScheduled(id);
      else if (action === 'resume') await notificationService.resumeScheduled(id);
      else await notificationService.cancelScheduled(id);
      toast({ title: 'Success', description: `Notification ${action}d` });
      fetchScheduled();
    } catch {
      toast({ title: 'Error', description: `Failed to ${action} notification`, variant: 'destructive' });
    }
  };

  const handleDeleteScheduled = async () => {
    if (!deletingScheduled || scheduleConfirmText !== 'DELETE') return;
    setIsDeletingScheduled(true);
    try {
      await notificationService.deleteScheduled(deletingScheduled.id);
      toast({ title: 'Success', description: 'Scheduled notification deleted' });
      setDeletingScheduled(null);
      setScheduleConfirmText('');
      fetchScheduled();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } finally {
      setIsDeletingScheduled(false);
    }
  };

  const handleScheduleDeleteDialogChange = (open: boolean) => {
    if (!open) {
      setDeletingScheduled(null);
      setScheduleConfirmText('');
    }
  };

  return (
    <div className="space-y-8">
      {/* ─── Custom Notifications ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Notifications ({notifications.length})
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEditingScheduled(null); setIsScheduleOpen(true); }}>
              <Clock className="h-4 w-4 mr-1" />
              Schedule
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Send Now
            </Button>
          </div>
        </div>

        {notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification: any, index: number) => (
              <div
                key={notification.id || index}
                className="rounded-xl border border-border/60 bg-card px-5 py-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{notification.title || 'Notification'}</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize border ${TYPE_STYLES[notification.type] || TYPE_STYLES.info}`}
                      >
                        {notification.type || 'info'}
                      </Badge>
                      <Badge variant={notification.is_read ? 'secondary' : 'default'} className="text-[10px]">
                        {notification.is_read ? 'Read' : 'Unread'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message || 'No message'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {notification.action_url && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(notification.action_url, '_blank')} title="Open Action URL">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(notification)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingNotification(notification)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Created: {notification.created_at ? new Date(notification.created_at).toLocaleString() : 'N/A'}</span>
                  {notification.expires_at && <span>Expires: {new Date(notification.expires_at).toLocaleString()}</span>}
                  {notification.read_at && <span>Read: {new Date(notification.read_at).toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No notifications found</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={handleCreate}>
              Send Custom Notification
            </Button>
          </div>
        )}
      </section>

      {/* ─── Scheduled Notifications ─── */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Scheduled ({scheduledNotifications.length})
        </h3>

        {scheduledLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : scheduledNotifications.length > 0 ? (
          <div className="space-y-2">
            {scheduledNotifications.map((sn) => (
              <div
                key={sn.id}
                className="rounded-xl border border-border/60 bg-card px-5 py-3.5 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{sn.title}</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize border ${TYPE_STYLES[sn.type] || TYPE_STYLES.info}`}
                      >
                        {sn.type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize border ${STATUS_STYLES[sn.status] || STATUS_STYLES.pending}`}
                      >
                        {sn.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{sn.message}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {sn.status === 'pending' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleScheduledAction(sn.id, 'pause')} title="Pause">
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {sn.status === 'paused' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleScheduledAction(sn.id, 'resume')} title="Resume">
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {(sn.status === 'pending' || sn.status === 'paused') && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingScheduled(sn); setIsScheduleOpen(true); }} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleScheduledAction(sn.id, 'cancel')} title="Cancel">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingScheduled(sn)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(sn.scheduled_for).toLocaleString()}
                  </span>
                  {sn.expires_at && <span>Expires: {new Date(sn.expires_at).toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground rounded-xl border border-dashed border-border/60">
            <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            No scheduled notifications for this trader
          </div>
        )}
      </section>

      {/* ─── Dialogs ─── */}

      {/* Create/Edit Custom */}
      <NotificationFormDialog
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingNotification(null); }}
        onSubmit={handleFormSubmit}
        notification={editingNotification}
        traderEmail={traderEmail}
      />

      {/* Schedule Create/Edit */}
      <ScheduleNotificationDialog
        isOpen={isScheduleOpen}
        onClose={() => { setIsScheduleOpen(false); setEditingScheduled(null); }}
        onSubmit={handleScheduleSubmit}
        notification={editingScheduled}
        traderEmail={traderEmail}
      />

      {/* Delete Custom Notification */}
      <Dialog open={!!deletingNotification} onOpenChange={handleDeleteDialogChange}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 rounded-xl border-destructive/20">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Trash2 size={18} className="text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Delete Notification</h2>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">This action is permanent and irreversible</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-5">
            <div className="flex gap-3 p-3.5 rounded-lg bg-destructive/5 border border-destructive/15">
              <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-sm">
                <p className="font-medium text-foreground">You are about to permanently delete this notification.</p>
                <p className="text-muted-foreground text-xs leading-relaxed">The notification will be removed and cannot be recovered.</p>
              </div>
            </div>
            {deletingNotification && (
              <div className="rounded-lg bg-muted/30 border border-border/50 divide-y divide-border/50">
                <div className="flex items-center gap-3 p-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bell size={16} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{deletingNotification.title || 'Notification'}</p>
                    <p className="text-xs text-muted-foreground truncate">{deletingNotification.message || 'No message'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Type</span>
                    <p className="font-medium text-foreground capitalize">{deletingNotification.type || 'info'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p className="font-medium text-foreground">{deletingNotification.is_read ? 'Read' : 'Unread'}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <ShieldAlert size={12} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Type <span className="font-mono font-semibold text-destructive">DELETE</span> to confirm</p>
              </div>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE to confirm" className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background font-mono" autoComplete="off" />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20">
            <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteDialogChange(false)} disabled={isDeleting} className="h-9">Cancel</Button>
            <Button type="button" size="sm" variant="destructive" disabled={confirmText !== 'DELETE' || isDeleting} onClick={handleDelete} className="h-9 min-w-[140px]">
              {isDeleting ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Deleting…</> : <><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete Notification</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Scheduled Notification */}
      <Dialog open={!!deletingScheduled} onOpenChange={handleScheduleDeleteDialogChange}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 rounded-xl border-destructive/20">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Trash2 size={18} className="text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Delete Scheduled Notification</h2>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">This action is permanent and irreversible</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-5">
            <div className="flex gap-3 p-3.5 rounded-lg bg-destructive/5 border border-destructive/15">
              <AlertTriangle size={18} className="text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-sm">
                <p className="font-medium text-foreground">You are about to permanently delete this scheduled notification.</p>
                <p className="text-muted-foreground text-xs leading-relaxed">If pending, it will not be sent. This cannot be undone.</p>
              </div>
            </div>
            {deletingScheduled && (
              <div className="rounded-lg bg-muted/30 border border-border/50 divide-y divide-border/50">
                <div className="flex items-center gap-3 p-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock size={16} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{deletingScheduled.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{deletingScheduled.message}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p className="font-medium text-foreground capitalize">{deletingScheduled.status}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Scheduled For</span>
                    <p className="font-medium text-foreground">{new Date(deletingScheduled.scheduled_for).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <ShieldAlert size={12} className="text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Type <span className="font-mono font-semibold text-destructive">DELETE</span> to confirm</p>
              </div>
              <Input value={scheduleConfirmText} onChange={(e) => setScheduleConfirmText(e.target.value)} placeholder="Type DELETE to confirm" className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background font-mono" autoComplete="off" />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20">
            <Button type="button" variant="outline" size="sm" onClick={() => handleScheduleDeleteDialogChange(false)} disabled={isDeletingScheduled} className="h-9">Cancel</Button>
            <Button type="button" size="sm" variant="destructive" disabled={scheduleConfirmText !== 'DELETE' || isDeletingScheduled} onClick={handleDeleteScheduled} className="h-9 min-w-[140px]">
              {isDeletingScheduled ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Deleting…</> : <><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
