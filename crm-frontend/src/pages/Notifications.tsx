import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Filter, Bell, ExternalLink, Eye, EyeOff, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';
import { notificationService } from '@/services/notificationService';
import { ScheduledNotificationsTab } from '@/components/notifications/ScheduledNotificationsTab';

interface Notification {
  id: string;
  user: string | null;
  user_email: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'kyc' | 'challenge' | 'payout' | 'system';
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  expires_at: string | null;
  action_url: string | null;
  is_global?: boolean;
  is_custom?: boolean;
}

interface NotificationGroup {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

interface NotificationResponse {
  global: NotificationGroup;
  custom: NotificationGroup;
  all: NotificationGroup;
}

const NotificationForm: React.FC<{
  notification?: Notification;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  activeTab: string;
}> = ({ notification, onSubmit, onCancel, activeTab }) => {
  const [formData, setFormData] = useState({
    title: notification?.title || '',
    message: notification?.message || '',
    type: notification?.type || 'info',
    user_email: notification?.user_email || '',
    expires_at: notification?.expires_at ? new Date(notification.expires_at).toISOString().slice(0, 16) : '',
    action_url: notification?.action_url || '',
    image_url: notification?.image_url || '',
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      expires_at: formData.expires_at || null,
      action_url: formData.action_url || null,
      image_url: formData.image_url || null,
    };
    
    // For custom notifications, send user_email and let backend resolve to user
    if (activeTab === 'custom' && formData.user_email) {
      submitData.user_email = formData.user_email;
    }
    
    // Remove user_email from global notifications to avoid backend validation error
    if (activeTab === 'global') {
      delete submitData.user_email;
    }
    
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

      {activeTab === 'custom' && (
        <div>
          <Label htmlFor="user_email">User Email *</Label>
          <Input
            id="user_email"
            type="email"
            value={formData.user_email}
            onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
            placeholder="Enter user email for custom notification"
            required
          />
        </div>
      )}

      <div>
        <Label htmlFor="expires_at">Expires At (optional)</Label>
        <Input
          id="expires_at"
          type="datetime-local"
          value={formData.expires_at}
          onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
        />
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
              // upload failed silently
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
          {notification ? 'Update' : 'Create'} Notification
        </Button>
      </div>
    </form>
  );
};

const Notifications: React.FC = () => {
  const [notificationData, setNotificationData] = useState<NotificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [activeTab, setActiveTab] = useState('global');
  const { toast } = useToast();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [globalResponse, customResponse, allResponse] = await Promise.all([
        apiService.get('/notifications/global/'),
        apiService.get('/notifications/custom/'),
        apiService.get('/notifications/all/')
      ]);

      const defaultGroup: NotificationGroup = { count: 0, next: null, previous: null, results: [] };
      
      setNotificationData({
        global: globalResponse.data as NotificationGroup || defaultGroup,
        custom: customResponse.data as NotificationGroup || defaultGroup,
        all: allResponse.data as NotificationGroup || defaultGroup
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleCreate = async (data: any) => {
    try {
      console.log('Creating notification with data:', data);
      console.log('Active tab:', activeTab);
      
      const endpoint = activeTab === 'global' ? '/notifications/global/' : 
                      activeTab === 'custom' ? '/notifications/custom/' : 
                      '/notifications/all/';
      
      console.log('Using endpoint:', endpoint);
      
      const response = await apiService.post(endpoint, data);
      if (response.data) {
        toast({
          title: 'Success',
          description: 'Notification created successfully',
        });
        setDialogOpen(false);
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to create notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to create notification',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingNotification) return;
    
    try {
      const endpoint = activeTab === 'global' ? `/notifications/global/${editingNotification.id}/` : 
                      activeTab === 'custom' ? `/notifications/custom/${editingNotification.id}/` : 
                      `/notifications/all/${editingNotification.id}/`;
      
      const response = await apiService.put(endpoint, data);
      if (response.data) {
        toast({
          title: 'Success',
          description: 'Notification updated successfully',
        });
        setDialogOpen(false);
        setEditingNotification(null);
        fetchNotifications();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    
    try {
      const endpoint = activeTab === 'global' ? `/notifications/global/${id}/` : 
                      activeTab === 'custom' ? `/notifications/custom/${id}/` : 
                      `/notifications/all/${id}/`;
      
      await apiService.delete(endpoint);
      toast({
        title: 'Success',
        description: 'Notification deleted successfully',
      });
      fetchNotifications();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const getCurrentNotifications = () => {
    if (!notificationData) return [];
    
    let notifications: Notification[] = [];
    switch (activeTab) {
      case 'global':
        notifications = notificationData.global.results;
        break;
      case 'custom':
        notifications = notificationData.custom.results;
        break;
      case 'all':
        notifications = notificationData.all.results;
        break;
      default:
        notifications = [];
    }
    
    return notifications.filter(notification => {
      const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           notification.message.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || notification.type === typeFilter;
      const matchesRead = readFilter === 'all' || 
                         (readFilter === 'read' && notification.is_read) ||
                         (readFilter === 'unread' && !notification.is_read);
      
      return matchesSearch && matchesType && matchesRead;
    });
  };

  const getTotalStats = () => {
    if (!notificationData) return { total: 0, unread: 0, custom: 0, global: 0 };
    
    const allNotifications = [
      ...notificationData.global.results,
      ...notificationData.custom.results,
      ...notificationData.all.results
    ];
    
    return {
      total: notificationData.all.count || 0,
      unread: allNotifications.filter(n => !n.is_read).length,
      custom: notificationData.custom.count || 0,
      global: notificationData.global.count || 0
    };
  };

  const filteredNotifications = getCurrentNotifications();
  const stats = getTotalStats();

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Manage system notifications and user alerts"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unread}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Notifications</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.custom}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.global}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle>Notifications Management</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingNotification(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl w-[95vw]">
                <DialogHeader>
                  <DialogTitle>
                    {editingNotification ? 'Edit Notification' : 'Create New Notification'}
                  </DialogTitle>
                </DialogHeader>
                <NotificationForm
                  notification={editingNotification}
                  onSubmit={editingNotification ? handleUpdate : handleCreate}
                  onCancel={() => {
                    setDialogOpen(false);
                    setEditingNotification(null);
                  }}
                  activeTab={activeTab}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
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
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notification Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="global">
                Global ({notificationData?.global.count || 0})
              </TabsTrigger>
              <TabsTrigger value="custom">
                Custom ({notificationData?.custom.count || 0})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({notificationData?.all.count || 0})
              </TabsTrigger>
              <TabsTrigger value="scheduled">
                Scheduled
              </TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="space-y-4">
              <NotificationTable 
                notifications={filteredNotifications}
                loading={loading}
                onEdit={(notification) => {
                  setEditingNotification(notification);
                  setDialogOpen(true);
                }}
                onDelete={handleDelete}
                getTypeColor={getTypeColor}
              />
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <NotificationTable 
                notifications={filteredNotifications}
                loading={loading}
                onEdit={(notification) => {
                  setEditingNotification(notification);
                  setDialogOpen(true);
                }}
                onDelete={handleDelete}
                getTypeColor={getTypeColor}
              />
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              <NotificationTable 
                notifications={filteredNotifications}
                loading={loading}
                onEdit={(notification) => {
                  setEditingNotification(notification);
                  setDialogOpen(true);
                }}
                onDelete={handleDelete}
                getTypeColor={getTypeColor}
              />
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-4">
              <ScheduledNotificationsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const NotificationTable: React.FC<{
  notifications: Notification[];
  loading: boolean;
  onEdit: (notification: Notification) => void;
  onDelete: (id: string) => void;
  getTypeColor: (type: string) => string;
}> = ({ notifications, loading, onEdit, onDelete, getTypeColor }) => {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">Loading...</TableCell>
            </TableRow>
          ) : notifications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">No notifications found</TableCell>
            </TableRow>
          ) : (
            notifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{notification.title}</div>
                    <div className="text-sm text-muted-foreground truncate max-w-xs">
                      {notification.message}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getTypeColor(notification.type)}>
                    {notification.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {notification.user_email ? (
                    <span className="text-sm">{notification.user_email}</span>
                  ) : (
                    <Badge variant="outline">Global</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {notification.is_read ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm">
                      {notification.is_read ? 'Read' : 'Unread'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  {notification.expires_at ? (
                    <div className="text-sm">
                      {new Date(notification.expires_at).toLocaleDateString()}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Never</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {notification.action_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(notification.action_url!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(notification)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(notification.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default Notifications;