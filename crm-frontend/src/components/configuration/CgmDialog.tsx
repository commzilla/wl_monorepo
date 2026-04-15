import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { cgmService, ChallengePhaseGroupMapping, CgmCreateData } from '@/services/cgmService';

interface CgmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping?: ChallengePhaseGroupMapping | null;
  onSuccess: () => void;
}

const CgmDialog: React.FC<CgmDialogProps> = ({
  open,
  onOpenChange,
  mapping,
  onSuccess,
}) => {
  const { toast } = useToast();
  const isEdit = !!mapping;

  const form = useForm<CgmCreateData>({
    defaultValues: {
      challenge_phase: 0,
      mt5_group: '',
      is_active: true,
    },
  });

  const { data: challengePhases } = useQuery({
    queryKey: ['challenge-phases'],
    queryFn: cgmService.getChallengePhases,
    enabled: open,
  });

  const { data: availableGroups } = useQuery({
    queryKey: ['available-groups'],
    queryFn: cgmService.getAvailableGroups,
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: cgmService.createMapping,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Challenge phase group mapping created successfully",
      });
      onSuccess();
      form.reset();
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to create mapping";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CgmCreateData> }) =>
      cgmService.updateMapping(id, data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Challenge phase group mapping updated successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to update mapping";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (mapping && open) {
      form.reset({
        challenge_phase: mapping.challenge_phase,
        mt5_group: mapping.mt5_group,
        is_active: mapping.is_active,
      });
    } else if (open && !mapping) {
      form.reset({
        challenge_phase: 0,
        mt5_group: '',
        is_active: true,
      });
    }
  }, [mapping, open, form]);

  const onSubmit = (data: CgmCreateData) => {
    if (isEdit && mapping) {
      updateMutation.mutate({ id: mapping.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit' : 'Create'} Challenge Phase Group Mapping
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the' : 'Create a new'} mapping between challenge phase and MT5 group.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="challenge_phase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Challenge Phase</FormLabel>
                  <Select
                    value={field.value.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select challenge phase" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {challengePhases?.map((phase) => (
                        <SelectItem key={phase.id} value={phase.id.toString()}>
                          {phase.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mt5_group"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MT5 Group</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select MT5 group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableGroups?.map((group) => (
                        <SelectItem key={group.group} value={group.group}>
                          {group.group} {group.description && `- ${group.description}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <DialogDescription>
                      Enable this mapping to make it active
                    </DialogDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CgmDialog;