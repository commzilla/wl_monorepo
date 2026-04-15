import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Clock, Pause, Play, X, Pencil, Trash2, Calendar as CalendarIcon, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimePicker } from '@/components/ui/time-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { notificationService, ScheduledNotification } from '@/services/notificationService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ScheduledNotificationFormProps {
  notification?: ScheduledNotification;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const ScheduledNotificationForm: React.FC<ScheduledNotificationFormProps> = ({ 
  notification, 
  onSubmit, 
  onCancel 
}) => {
  const [scheduledDate, setScheduledDate] = React.useState<Date | undefined>(
    notification?.scheduled_for ? new Date(notification.scheduled_for) : undefined
  );
  const [scheduledTime, setScheduledTime] = React.useState(
    notification?.scheduled_for 
      ? new Date(notification.scheduled_for).toTimeString().slice(0, 5)
      : '09:00'
  );
  const [expiresDate, setExpiresDate] = React.useState<Date | undefined>(
    notification?.expires_at ? new Date(notification.expires_at) : undefined
  );
  const [expiresTime, setExpiresTime] = React.useState(
    notification?.expires_at 
      ? new Date(notification.expires_at).toTimeString().slice(0, 5)
      : '17:00'
  );
  
  const [formData, setFormData] = React.useState({
    title: notification?.title || '',
    message: notification?.message || '',
    type: notification?.type || 'info',
    user_email: notification?.user_email || '',
    action_url: notification?.action_url || '',
    image_url: notification?.image_url || '',
  });
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScheduledDateChange = (date: Date | undefined) => {
    setScheduledDate(date);
  };

  const handleExpiresDateChange = (date: Date | undefined) => {
    setExpiresDate(date);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let scheduled_for_str = '';
    if (scheduledDate) {
      scheduled_for_str = `${format(scheduledDate, 'yyyy-MM-dd')}T${scheduledTime}`;
    }
    
    let expires_at_str = '';
    if (expiresDate) {
      expires_at_str = `${format(expiresDate, 'yyyy-MM-dd')}T${expiresTime}`;
    }
    
    const submitData = {
      ...formData,
      scheduled_for: scheduled_for_str,
      expires_at: expires_at_str || null,
      action_url: formData.action_url || null,
      image_url: formData.image_url || null,
      user_email: formData.user_email || undefined,
    };
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="message">Message *</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          rows={4}
          required
        />
      </div>

      <div>
        <Label htmlFor="type">Type</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="kyc">KYC Update</SelectItem>
            <SelectItem value="challenge">Challenge Update</SelectItem>
            <SelectItem value="payout">Payout Info</SelectItem>
            <SelectItem value="system">System Alert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Scheduled For *</Label>
        <div className="flex gap-2 mt-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 justify-start text-left font-normal",
                  !scheduledDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {scheduledDate ? format(scheduledDate, 'PP') : 'Pick date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={scheduledDate}
                onSelect={handleScheduledDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <TimePicker
            value={scheduledTime}
            onChange={setScheduledTime}
            className="w-[140px]"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="user_email">User Email (optional, leave empty for global)</Label>
        <Input
          id="user_email"
          type="email"
          value={formData.user_email}
          onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
          placeholder="Leave empty for all users"
        />
      </div>

      <div>
        <Label>Expires At (optional)</Label>
        <div className="flex gap-2 mt-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 justify-start text-left font-normal",
                  !expiresDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expiresDate ? format(expiresDate, 'PP') : 'Pick date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={expiresDate}
                onSelect={handleExpiresDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <TimePicker
            value={expiresTime}
            onChange={setExpiresTime}
            className="w-[140px]"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="action_url">Action URL (optional)</Label>
        <Input
          id="action_url"
          type="url"
          value={formData.action_url}
          onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
          placeholder="e.g., /dashboard/payouts/"
        />
      </div>

      <div>
        <Label>Image (optional)</Label>
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
                setFormData(prev => ({ ...prev, image_url: res.data!.url }));
              }
            } catch {
              // upload failed
            } finally {
              setUploading(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }
          }}
        />
        {formData.image_url ? (
          <div className="flex items-center gap-3 mt-1">
            <img src={formData.image_url} alt="Preview" className="h-12 w-12 rounded object-cover" />
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}>
              <X className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {notification ? 'Update' : 'Schedule'} Notification
        </Button>
      </div>
    </form>
  );
};

export const ScheduledNotificationsTab: React.FC = () => {
  const [notifications, setNotifications] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<ScheduledNotification | null>(null);
  const { toast } = useToast();

  const fetchScheduledNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.listScheduled();
      setNotifications(response.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch scheduled notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduledNotifications();
  }, []);

  const handleCreate = async (data: any) => {
    try {
      await notificationService.createScheduled(data);
      toast({
        title: 'Success',
        description: 'Notification scheduled successfully',
      });
      setDialogOpen(false);
      fetchScheduledNotifications();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to schedule notification',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingNotification) return;
    
    try {
      await notificationService.updateScheduled(editingNotification.id, data);
      toast({
        title: 'Success',
        description: 'Notification updated successfully',
      });
      setDialogOpen(false);
      setEditingNotification(null);
      fetchScheduledNotifications();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled notification?')) return;
    
    try {
      await notificationService.deleteScheduled(id);
      toast({
        title: 'Success',
        description: 'Notification deleted successfully',
      });
      fetchScheduledNotifications();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const handlePause = async (id: string) => {
    try {
      await notificationService.pauseScheduled(id);
      toast({
        title: 'Success',
        description: 'Notification paused successfully',
      });
      fetchScheduledNotifications();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to pause notification',
        variant: 'destructive',
      });
    }
  };

  const handleResume = async (id: string) => {
    try {
      await notificationService.resumeScheduled(id);
      toast({
        title: 'Success',
        description: 'Notification resumed successfully',
      });
      fetchScheduledNotifications();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resume notification',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this notification?')) return;
    
    try {
      await notificationService.cancelScheduled(id);
      toast({
        title: 'Success',
        description: 'Notification cancelled successfully',
      });
      fetchScheduledNotifications();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel notification',
        variant: 'destructive',
      });
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || notification.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'kyc': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'challenge': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'payout': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'system': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusStats = () => {
    return {
      pending: notifications.filter(n => n.status === 'pending').length,
      paused: notifications.filter(n => n.status === 'paused').length,
      sent: notifications.filter(n => n.status === 'sent').length,
      cancelled: notifications.filter(n => n.status === 'cancelled').length,
    };
  };

  const stats = getStatusStats();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paused</CardTitle>
            <Pause className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paused}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <X className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Scheduled Notifications</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <Button onClick={() => {
                setEditingNotification(null);
                setDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Notification
              </Button>
              <DialogContent className="max-w-2xl w-[95vw]">
                <DialogHeader>
                  <DialogTitle>
                    {editingNotification ? 'Edit Scheduled Notification' : 'Schedule New Notification'}
                  </DialogTitle>
                </DialogHeader>
                <ScheduledNotificationForm
                  notification={editingNotification || undefined}
                  onSubmit={editingNotification ? handleUpdate : handleCreate}
                  onCancel={() => {
                    setDialogOpen(false);
                    setEditingNotification(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search scheduled notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredNotifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No scheduled notifications found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="font-medium">{notification.title}</TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(notification.type)}>
                          {notification.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {notification.user_email || 'All Users'}
                      </TableCell>
                      <TableCell>
                        {new Date(notification.scheduled_for).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(notification.status)}>
                          {notification.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(notification.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {notification.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePause(notification.id)}
                              title="Pause"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {notification.status === 'paused' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResume(notification.id)}
                              title="Resume"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {(notification.status === 'pending' || notification.status === 'paused') && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingNotification(notification);
                                  setDialogOpen(true);
                                }}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancel(notification.id)}
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(notification.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
