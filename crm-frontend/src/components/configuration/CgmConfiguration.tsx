import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cgmService, ChallengePhaseGroupMapping } from '@/services/cgmService';
import CgmDialog from './CgmDialog';

const CgmConfiguration = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ChallengePhaseGroupMapping | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mappings, isLoading } = useQuery({
    queryKey: ['cgm-mappings'],
    queryFn: cgmService.getMappings,
  });

  const deleteMutation = useMutation({
    mutationFn: cgmService.deleteMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cgm-mappings'] });
      toast({
        title: "Success",
        description: "Challenge phase group mapping deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete mapping",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this mapping?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (mapping: ChallengePhaseGroupMapping) => {
    setEditingMapping(mapping);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Challenge Phase Group Mappings</CardTitle>
              <CardDescription>
                Manage MT5 group mappings for challenge phases
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challenge</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Step Type</TableHead>
                <TableHead>MT5 Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings?.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>{mapping.challenge_name}</TableCell>
                  <TableCell>{mapping.challenge_phase_name}</TableCell>
                  <TableCell>{mapping.step_type}</TableCell>
                  <TableCell>{mapping.mt5_group}</TableCell>
                  <TableCell>
                    <Badge variant={mapping.is_active ? 'default' : 'secondary'}>
                      {mapping.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(mapping)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(mapping.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CgmDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['cgm-mappings'] });
        }}
      />

      <CgmDialog
        open={!!editingMapping}
        onOpenChange={(open) => !open && setEditingMapping(null)}
        mapping={editingMapping}
        onSuccess={() => {
          setEditingMapping(null);
          queryClient.invalidateQueries({ queryKey: ['cgm-mappings'] });
        }}
      />
    </div>
  );
};

export default CgmConfiguration;