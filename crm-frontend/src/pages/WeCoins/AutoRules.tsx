import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { autoRewardRuleService } from '@/services/autoRewardRuleService';
import type { AutoRewardRule, AutoRewardTriggerType, CreateAutoRewardRuleData } from '@/lib/types/autoRewardRule';
import { TRIGGER_TYPE_LABELS } from '@/lib/types/autoRewardRule';

const AutoRules = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutoRewardRule | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    trigger_type: 'purchase' as AutoRewardTriggerType,
    threshold: '',
    reward_amount: '',
    is_active: true,
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['auto-reward-rules', searchQuery],
    queryFn: () => autoRewardRuleService.getRules({
      search: searchQuery || undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAutoRewardRuleData) => autoRewardRuleService.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reward-rules'] });
      toast({ title: 'Success', description: 'Auto reward rule created successfully' });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create rule', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateAutoRewardRuleData }) =>
      autoRewardRuleService.updateRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reward-rules'] });
      toast({ title: 'Success', description: 'Rule updated successfully' });
      setIsEditDialogOpen(false);
      setSelectedRule(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update rule', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => autoRewardRuleService.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reward-rules'] });
      toast({ title: 'Success', description: 'Rule deleted successfully' });
      setIsDeleteDialogOpen(false);
      setSelectedRule(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete rule', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      trigger_type: 'purchase',
      threshold: '',
      reward_amount: '',
      is_active: true,
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      title: formData.title,
      description: formData.description || undefined,
      trigger_type: formData.trigger_type,
      threshold: parseInt(formData.threshold),
      reward_amount: parseFloat(formData.reward_amount),
      is_active: formData.is_active,
    });
  };

  const handleEdit = (rule: AutoRewardRule) => {
    setSelectedRule(rule);
    setFormData({
      title: rule.title,
      description: rule.description || '',
      trigger_type: rule.trigger_type,
      threshold: rule.threshold.toString(),
      reward_amount: rule.reward_amount.toString(),
      is_active: rule.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedRule) return;
    updateMutation.mutate({
      id: selectedRule.id,
      data: {
        title: formData.title,
        description: formData.description || undefined,
        trigger_type: formData.trigger_type,
        threshold: parseInt(formData.threshold),
        reward_amount: parseFloat(formData.reward_amount),
        is_active: formData.is_active,
      },
    });
  };

  const handleDelete = (rule: AutoRewardRule) => {
    setSelectedRule(rule);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRule) {
      deleteMutation.mutate(selectedRule.id);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader title="Auto Reward Rules" />

      <Card>
        <CardContent className="p-3 sm:p-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Grants</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading rules...
                    </TableCell>
                  </TableRow>
                ) : rules?.data && rules.data.length > 0 ? (
                  rules.data.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.title}</TableCell>
                      <TableCell>
                        <Badge variant={rule.trigger_type === 'purchase' ? 'default' : 'secondary'}>
                          {TRIGGER_TYPE_LABELS[rule.trigger_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {rule.threshold}x
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {rule.reward_amount} WeCoins
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {rule.grants_count} users
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(rule.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(rule)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rule)}
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
                      No auto reward rules found. Create one to get started.
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
          setSelectedRule(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? 'Edit Rule' : 'Create Auto Reward Rule'}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen
                ? 'Update the rule details below'
                : 'Define a milestone that automatically grants WeCoins when reached'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Buy 5 Challenges Milestone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this rule"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trigger Type *</Label>
                <Select
                  value={formData.trigger_type}
                  onValueChange={(value: AutoRewardTriggerType) => setFormData({ ...formData, trigger_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGER_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">Threshold *</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                  placeholder="e.g. 5"
                />
                <p className="text-xs text-muted-foreground">
                  Number of {formData.trigger_type === 'purchase' ? 'purchases' : 'approved payouts'} to trigger
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reward_amount">Reward Amount *</Label>
                <Input
                  id="reward_amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.reward_amount}
                  onChange={(e) => setFormData({ ...formData, reward_amount: e.target.value })}
                  placeholder="e.g. 50"
                />
                <p className="text-xs text-muted-foreground">WeCoins to grant</p>
              </div>

              <div className="space-y-2">
                <Label>Active</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label className="cursor-pointer">
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedRule(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleUpdate : handleCreate}
              disabled={!formData.title || !formData.threshold || !formData.reward_amount}
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
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedRule?.title}"? This will also remove all grant records. This action cannot be undone.
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

export default AutoRules;
