import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Plus, Trash2, Edit, Lock, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { rbacService } from '@/services/rbacService';
import { Role, Permission, PermissionsByCategory } from '@/lib/types/rbac';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RoleFormData {
  name: string;
  slug: string;
  description: string;
  permissions: string[];
}

const CategoryAccordion: React.FC<{
  category: string;
  permissions: Permission[];
  selectedPermissions: string[];
  onToggle: (codename: string, checked: boolean) => void;
}> = ({ category, permissions, selectedPermissions, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCount = permissions.filter(p => selectedPermissions.includes(p.codename)).length;
  const allSelected = selectedCount === permissions.length;

  const handleSelectAll = () => {
    const allCodes = permissions.map(p => p.codename);
    if (allSelected) {
      allCodes.forEach(c => onToggle(c, false));
    } else {
      allCodes.forEach(c => onToggle(c, true));
    }
  };

  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium text-sm">{categoryLabel}</span>
          <Badge variant="secondary" className="text-xs">
            {selectedCount}/{permissions.length}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={(e) => { e.stopPropagation(); handleSelectAll(); }}
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </Button>
      </button>
      {isOpen && (
        <div className="px-4 pb-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {permissions.map((perm) => (
            <div key={perm.codename} className="flex items-start space-x-3 rounded-md border p-3">
              <Checkbox
                checked={selectedPermissions.includes(perm.codename)}
                onCheckedChange={(checked) => onToggle(perm.codename, !!checked)}
              />
              <div className="space-y-0.5 leading-none">
                <label className="text-sm font-medium leading-none cursor-pointer">{perm.name}</label>
                <p className="text-xs text-muted-foreground">{perm.codename}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PermissionPicker: React.FC<{
  permissionsByCategory: PermissionsByCategory;
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
}> = ({ permissionsByCategory, selectedPermissions, onChange }) => {
  const handleToggle = (codename: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedPermissions, codename]);
    } else {
      onChange(selectedPermissions.filter(c => c !== codename));
    }
  };

  return (
    <div className="space-y-2">
      {Object.entries(permissionsByCategory).map(([category, perms]) => (
        <CategoryAccordion
          key={category}
          category={category}
          permissions={perms}
          selectedPermissions={selectedPermissions}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
};

const RolePermissions = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: () => rbacService.getRoles(),
  });

  const { data: permissionsByCategory = {} } = useQuery({
    queryKey: ['rbac-permissions'],
    queryFn: () => rbacService.getPermissions(),
  });

  const createMutation = useMutation({
    mutationFn: (data: RoleFormData) => rbacService.createRole(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Role created", description: `Role "${data.name}" has been created.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create role.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RoleFormData> }) => rbacService.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      setIsEditDialogOpen(false);
      setEditingRole(null);
      toast({ title: "Role updated", description: "Role has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update role.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rbacService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rbac-roles'] });
      setDeleteTarget(null);
      toast({ title: "Role deleted", description: "Role has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete role.", variant: "destructive" });
    },
  });

  const form = useForm<RoleFormData>({
    defaultValues: { name: '', slug: '', description: '', permissions: [] },
  });

  const editForm = useForm<RoleFormData>({
    defaultValues: { name: '', slug: '', description: '', permissions: [] },
  });

  const onSubmit = (data: RoleFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: RoleFormData) => {
    if (!editingRole) return;
    const payload: Partial<RoleFormData> = { permissions: data.permissions };
    if (!editingRole.is_system) {
      payload.name = data.name;
      payload.slug = data.slug;
      payload.description = data.description;
    } else {
      payload.description = data.description;
    }
    updateMutation.mutate({ id: editingRole.id, data: payload });
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    editForm.reset({
      name: role.name,
      slug: role.slug,
      description: role.description,
      permissions: role.permissions,
    });
    setIsEditDialogOpen(true);
  };

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Roles Management
              </CardTitle>
              <CardDescription>
                Create and manage roles with granular permissions
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                  <DialogDescription>
                    Define a new role with specific permissions.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          rules={{ required: "Role name is required" }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Marketing Manager" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="slug"
                          rules={{ required: "Slug is required", pattern: { value: /^[a-z0-9_-]+$/, message: "Lowercase letters, numbers, hyphens, underscores only" } }}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slug</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. marketing_manager" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Brief description of this role" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="permissions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Permissions ({field.value?.length || 0} selected)</FormLabel>
                            <PermissionPicker
                              permissionsByCategory={permissionsByCategory}
                              selectedPermissions={field.value || []}
                              onChange={field.onChange}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                          {createMutation.isPending ? 'Creating...' : 'Create Role'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{role.name}</p>
                          {role.is_system && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.is_system ? "default" : "outline"} className="text-xs">
                        {role.is_system ? 'System' : 'Custom'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                        {role.permissions.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{role.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{role.user_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {new Date(role.created_at).toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => openEditDialog(role)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        {!role.is_system && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => setDeleteTarget(role)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Edit Role{editingRole?.is_system ? ' (System)' : ''}
            </DialogTitle>
            <DialogDescription>
              {editingRole?.is_system
                ? 'System roles: you can edit permissions and description, but not the name or slug.'
                : 'Update the role and its permissions.'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    rules={{ required: "Role name is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={editingRole?.is_system} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={editingRole?.is_system} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="permissions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permissions ({field.value?.length || 0} selected)</FormLabel>
                      <PermissionPicker
                        permissionsByCategory={permissionsByCategory}
                        selectedPermissions={field.value || []}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Updating...' : 'Update Role'}
                  </Button>
                </div>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{deleteTarget?.name}"?
              {(deleteTarget?.user_count ?? 0) > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: {deleteTarget?.user_count} user(s) are currently assigned to this role. They will lose their role assignment.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RolePermissions;
