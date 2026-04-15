import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { betaFeatureService } from '@/services/betaFeatureService';
import { BetaFeatureDialog } from './BetaFeatureDialog';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BetaFeature, BetaFeatureFormData, BetaFeatureStatus } from '@/lib/types/betaFeature';

export const BetaFeaturesTab: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<BetaFeature | undefined>();
  const [featureToDelete, setFeatureToDelete] = useState<string | null>(null);

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['beta-features'],
    queryFn: betaFeatureService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: betaFeatureService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beta-features'] });
      toast({ title: 'Beta feature created successfully' });
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Failed to create beta feature', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BetaFeatureFormData> }) =>
      betaFeatureService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beta-features'] });
      toast({ title: 'Beta feature updated successfully' });
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Failed to update beta feature', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: betaFeatureService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beta-features'] });
      toast({ title: 'Beta feature deleted successfully' });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Failed to delete beta feature', variant: 'destructive' });
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BetaFeatureStatus }) =>
      betaFeatureService.changeStatus(id, { status }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['beta-features'] });
      toast({ title: data.message });
    },
    onError: () => {
      toast({ title: 'Failed to change status', variant: 'destructive' });
    },
  });

  const handleCreate = () => {
    setSelectedFeature(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (feature: BetaFeature) => {
    setSelectedFeature(feature);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setFeatureToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (data: BetaFeatureFormData) => {
    if (selectedFeature) {
      updateMutation.mutate({ id: selectedFeature.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleStatusChange = (id: string, status: BetaFeatureStatus) => {
    changeStatusMutation.mutate({ id, status });
  };

  const getStatusBadge = (status: BetaFeatureStatus) => {
    const variants: Record<BetaFeatureStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'outline',
      active: 'default',
      closed: 'secondary',
      released: 'destructive',
    };
    const labels: Record<BetaFeatureStatus, string> = {
      draft: 'Draft',
      active: 'Active',
      closed: 'Closed',
      released: 'Released',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Manage beta features and their availability
        </p>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Feature
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requirements</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No beta features found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              features.map((feature) => (
                <TableRow key={feature.id}>
                  <TableCell className="font-mono text-sm">{feature.code}</TableCell>
                  <TableCell className="font-medium">{feature.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{feature.description}</TableCell>
                  <TableCell>{getStatusBadge(feature.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {feature.requires_kya && (
                        <Badge variant="outline" className="text-xs">KYA</Badge>
                      )}
                      {feature.requires_kyc && (
                        <Badge variant="outline" className="text-xs">KYC</Badge>
                      )}
                      {!feature.requires_kya && !feature.requires_kyc && (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(feature.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(feature)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {feature.status !== 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(feature.id, 'active')}
                          title="Set to Active"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(feature.id)}
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

      <BetaFeatureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        feature={selectedFeature}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the beta feature.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => featureToDelete && deleteMutation.mutate(featureToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
