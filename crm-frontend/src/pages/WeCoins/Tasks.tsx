import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Upload, ExternalLink, CheckCircle2, XCircle, X, Image, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { useToast } from '@/hooks/use-toast';
import { rewardTaskService } from '@/services/rewardTaskService';
import type { RewardTask, CreateRewardTaskData, UpdateRewardTaskData, RewardTaskStatus, ExpireAction } from '@/lib/types/rewardTask';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Tasks = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<RewardTask | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    url: '',
    reward_amount: '',
    status: 'active' as RewardTaskStatus,
    requires_url_submission: false,
    feature_image_file: null as File | null,
    remove_feature_image: false,
    example_image_file: null as File | null,
    remove_example_image: false,
    starts_at: null as Date | null,
    expires_at: null as Date | null,
    expire_action: 'mark_expired' as ExpireAction,
  });

  // Fetch tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['reward-tasks', statusFilter, searchQuery],
    queryFn: () => rewardTaskService.getTasks({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchQuery || undefined,
    }),
  });

  // Create task mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateRewardTaskData) => rewardTaskService.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-tasks'] });
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task',
        variant: 'destructive',
      });
    },
  });

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRewardTaskData }) =>
      rewardTaskService.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-tasks'] });
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive',
      });
    },
  });

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => rewardTaskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-tasks'] });
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
      setIsDeleteDialogOpen(false);
      setSelectedTask(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete task',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      instructions: '',
      url: '',
      reward_amount: '',
      status: 'active',
      requires_url_submission: false,
      feature_image_file: null,
      remove_feature_image: false,
      example_image_file: null,
      remove_example_image: false,
      starts_at: null,
      expires_at: null,
      expire_action: 'mark_expired',
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      title: formData.title,
      description: formData.description,
      instructions: formData.instructions,
      url: formData.url,
      reward_amount: parseFloat(formData.reward_amount),
      status: formData.status,
      requires_url_submission: formData.requires_url_submission,
      feature_image_file: formData.feature_image_file || undefined,
      example_image_file: formData.example_image_file || undefined,
      starts_at: formData.starts_at ? formData.starts_at.toISOString() : null,
      expires_at: formData.expires_at ? formData.expires_at.toISOString() : null,
      expire_action: formData.expire_action,
    });
  };

  const handleEdit = (task: RewardTask) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      instructions: task.instructions || '',
      url: task.url || '',
      reward_amount: task.reward_amount.toString(),
      status: task.status,
      requires_url_submission: task.requires_url_submission,
      feature_image_file: null,
      remove_feature_image: false,
      example_image_file: null,
      remove_example_image: false,
      starts_at: task.starts_at ? new Date(task.starts_at) : null,
      expires_at: task.expires_at ? new Date(task.expires_at) : null,
      expire_action: task.expire_action || 'mark_expired',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedTask) return;
    updateMutation.mutate({
      id: selectedTask.id,
      data: {
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        url: formData.url,
        reward_amount: parseFloat(formData.reward_amount),
        status: formData.status,
        requires_url_submission: formData.requires_url_submission,
        feature_image_file: formData.feature_image_file || undefined,
        remove_feature_image: formData.remove_feature_image || undefined,
        example_image_file: formData.example_image_file || undefined,
        remove_example_image: formData.remove_example_image || undefined,
        starts_at: formData.starts_at ? formData.starts_at.toISOString() : null,
        expires_at: formData.expires_at ? formData.expires_at.toISOString() : null,
        expire_action: formData.expire_action,
      },
    });
  };

  const handleDelete = (task: RewardTask) => {
    setSelectedTask(task);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedTask) {
      deleteMutation.mutate(selectedTask.id);
    }
  };

  const getStatusBadgeVariant = (status: RewardTaskStatus) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'archived':
        return 'outline';
      case 'expired':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
  };

  const getAvailabilityBadge = (task: RewardTask) => {
    if (task.is_expired) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Expired</Badge>;
    }
    if (task.is_scheduled) {
      return <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-600"><Clock className="h-3 w-3" />Scheduled</Badge>;
    }
    if (task.is_available) {
      return <Badge variant="default" className="gap-1 bg-emerald-600"><CheckCircle2 className="h-3 w-3" />Available</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" />Unavailable</Badge>;
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader title="WeCoins Tasks" />

      <Card>
        <CardContent className="p-3 sm:p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>URL Required</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Starts At</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading tasks...
                    </TableCell>
                  </TableRow>
                ) : tasks?.data && tasks.data.length > 0 ? (
                  tasks.data.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{task.title}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {task.reward_amount} WeCoins
                      </TableCell>
                      <TableCell>
                        {task.requires_url_submission ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(task.status)}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getAvailabilityBadge(task)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(task.starts_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>{formatDateTime(task.expires_at)}</span>
                            </TooltipTrigger>
                            {task.expires_at && (
                              <TooltipContent>
                                <p>On expiry: {task.expire_action === 'mark_expired' ? 'Mark as expired' : task.expire_action === 'archive' ? 'Archive' : 'Set inactive'}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(task.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(task)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(task)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No tasks found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedTask(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? 'Edit Task' : 'Create Task'}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen ? 'Update the task details below' : 'Fill in the details to create a new task'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <RichTextEditor
                id="instructions"
                value={formData.instructions}
                onChange={(value) => setFormData({ ...formData, instructions: value })}
                placeholder="Step-by-step guidance for clients (supports **bold**, • bullets, and paragraphs)"
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            {/* Feature Image */}
            <div className="space-y-2">
              <Label htmlFor="feature_image">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Feature Image
                </div>
              </Label>
              {selectedTask?.feature_image && !formData.remove_feature_image && (
                <div className="flex items-center justify-between gap-2 p-2 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a 
                      href={selectedTask.feature_image} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate"
                    >
                      Current feature image
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, remove_feature_image: true })}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {formData.remove_feature_image && (
                <div className="p-2 border rounded-md bg-destructive/10 text-destructive text-sm">
                  Feature image will be removed on save
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  id="feature_image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setFormData({ ...formData, feature_image_file: file || null, remove_feature_image: false });
                  }}
                  className="cursor-pointer"
                />
                {formData.feature_image_file && (
                  <Badge variant="secondary" className="gap-1">
                    <Upload className="h-3 w-3" />
                    {formData.feature_image_file.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Example Image */}
            <div className="space-y-2">
              <Label htmlFor="example_image">Example Image</Label>
              {selectedTask?.example_image && !formData.remove_example_image && (
                <div className="flex items-center justify-between gap-2 p-2 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a 
                      href={selectedTask.example_image} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate"
                    >
                      Current example image
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, remove_example_image: true })}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {formData.remove_example_image && (
                <div className="p-2 border rounded-md bg-destructive/10 text-destructive text-sm">
                  Example image will be removed on save
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  id="example_image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setFormData({ ...formData, example_image_file: file || null, remove_example_image: false });
                  }}
                  className="cursor-pointer"
                />
                {formData.example_image_file && (
                  <Badge variant="secondary" className="gap-1">
                    <Upload className="h-3 w-3" />
                    {formData.example_image_file.name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_url_submission"
                  checked={formData.requires_url_submission}
                  onChange={(e) => setFormData({ ...formData, requires_url_submission: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="requires_url_submission" className="cursor-pointer">
                  Require URL submission from users
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward_amount">Reward Amount (WeCoins) *</Label>
              <Input
                id="reward_amount"
                type="number"
                step="0.01"
                value={formData.reward_amount}
                onChange={(e) => setFormData({ ...formData, reward_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            {/* Scheduling / Expiration Section */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4" />
                Scheduling & Expiration
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Starts At</Label>
                  <DateTimePicker
                    value={formData.starts_at || undefined}
                    onChange={(date) => setFormData({ ...formData, starts_at: date || null })}
                    placeholder="Immediate (no start date)"
                  />
                  {formData.starts_at && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => setFormData({ ...formData, starts_at: null })}
                    >
                      <X className="h-3 w-3 mr-1" /> Clear
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Expires At</Label>
                  <DateTimePicker
                    value={formData.expires_at || undefined}
                    onChange={(date) => setFormData({ ...formData, expires_at: date || null })}
                    placeholder="No expiry"
                  />
                  {formData.expires_at && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => setFormData({ ...formData, expires_at: null })}
                    >
                      <X className="h-3 w-3 mr-1" /> Clear
                    </Button>
                  )}
                </div>
              </div>
              {formData.expires_at && (
                <div className="space-y-2">
                  <Label>On Expiry Action</Label>
                  <Select
                    value={formData.expire_action}
                    onValueChange={(value: ExpireAction) => setFormData({ ...formData, expire_action: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mark_expired">Mark as Expired</SelectItem>
                      <SelectItem value="archive">Archive</SelectItem>
                      <SelectItem value="inactivate">Set Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: RewardTaskStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedTask(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleUpdate : handleCreate}
              disabled={!formData.title || !formData.reward_amount}
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
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTask?.title}"? This action cannot be undone.
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

export default Tasks;
