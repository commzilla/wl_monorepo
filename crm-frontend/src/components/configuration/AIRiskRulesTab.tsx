import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Power, PowerOff, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { aiRiskRuleService } from '@/services/aiRiskRuleService';
import { AIRiskRuleDialog } from './AIRiskRuleDialog';
import type { AIRiskRule, AIRiskRuleFormData } from '@/lib/types/aiRiskRule';

export const AIRiskRulesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AIRiskRule | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['ai-risk-rules'],
    queryFn: aiRiskRuleService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: aiRiskRuleService.create,
    onSuccess: () => {
      toast.success('Rule created successfully');
      queryClient.invalidateQueries({ queryKey: ['ai-risk-rules'] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create rule');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AIRiskRuleFormData> }) =>
      aiRiskRuleService.update(id, data),
    onSuccess: () => {
      toast.success('Rule updated successfully');
      queryClient.invalidateQueries({ queryKey: ['ai-risk-rules'] });
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update rule');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: aiRiskRuleService.delete,
    onSuccess: () => {
      toast.success('Rule deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['ai-risk-rules'] });
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete rule');
    },
  });

  const activateMutation = useMutation({
    mutationFn: aiRiskRuleService.activate,
    onSuccess: () => {
      toast.success('Rule activated');
      queryClient.invalidateQueries({ queryKey: ['ai-risk-rules'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to activate rule');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: aiRiskRuleService.deactivate,
    onSuccess: () => {
      toast.success('Rule deactivated');
      queryClient.invalidateQueries({ queryKey: ['ai-risk-rules'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate rule');
    },
  });

  const handleCreate = () => {
    setSelectedRule(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (rule: AIRiskRule) => {
    setSelectedRule(rule);
    setDialogOpen(true);
  };

  const handleDelete = (rule: AIRiskRule) => {
    setSelectedRule(rule);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (data: AIRiskRuleFormData) => {
    if (selectedRule) {
      updateMutation.mutate({ id: selectedRule.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggleActive = (rule: AIRiskRule) => {
    if (rule.is_active) {
      deactivateMutation.mutate(rule.id);
    } else {
      activateMutation.mutate(rule.id);
    }
  };

  // Filter rules based on search and filters
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          rule.code.toLowerCase().includes(query) ||
          rule.name.toLowerCase().includes(query) ||
          rule.description.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Severity filter
      if (severityFilter !== 'all' && rule.severity !== severityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const isActive = statusFilter === 'active';
        if (rule.is_active !== isActive) return false;
      }

      return true;
    });
  }, [rules, searchQuery, severityFilter, statusFilter]);

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      low: 'secondary',
      medium: 'default',
      high: 'destructive',
      critical: 'destructive',
    };
    const colors: Record<string, string> = {
      low: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
      medium: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20',
      high: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
      critical: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
    };
    return (
      <Badge className={colors[severity] || ''} variant={variants[severity] || 'default'}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with count and add button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {filteredRules.length} of {rules.length} rule{rules.length !== 1 ? 's' : ''} shown
        </p>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, name, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {rules.length === 0
                    ? 'No AI risk rules configured yet'
                    : 'No rules match your filters'}
                </TableCell>
              </TableRow>
            ) : (
              filteredRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-mono text-sm">{rule.code}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {rule.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                  <TableCell>v{rule.version}</TableCell>
                  <TableCell>
                    <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(rule)}
                        title={rule.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {rule.is_active ? (
                          <PowerOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Power className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(rule)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rule)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AIRiskRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={selectedRule}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI Risk Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the rule "{selectedRule?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRule && deleteMutation.mutate(selectedRule.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
