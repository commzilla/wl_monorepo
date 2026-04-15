import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminUser } from '@/lib/types/userManagement';
import { rbacService } from '@/services/rbacService';
import { Eye, EyeOff } from 'lucide-react';

const baseUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'support', 'risk', 'content_creator', 'discord_manager']),
  status: z.string().default('active'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  password: z.string().optional(),
  rbac_role_id: z.string().optional(),
});

const createUserSchema = baseUserSchema.extend({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number and special character')
});

const editUserSchema = baseUserSchema.refine((data) => {
  // Only validate password strength when it's provided for editing
  if (data.password && data.password.length > 0) {
    return data.password.length >= 8 && 
           /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(data.password);
  }
  return true;
}, {
  message: "Password must be at least 8 characters and contain uppercase, lowercase, number and special character",
  path: ["password"]
});

type UserFormData = z.infer<typeof createUserSchema>;

interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AdminUser;
  onSubmit: (data: UserFormData) => Promise<void>;
  isLoading: boolean;
}

export const UserManagementDialog: React.FC<UserManagementDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSubmit,
  isLoading,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const { data: rbacRoles = [] } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: () => rbacService.getRoles(),
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(user ? editUserSchema : createUserSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      role: 'support',
      status: 'active',
      phone: '',
      date_of_birth: '',
      password: '',
      rbac_role_id: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (user) {
        // Editing existing user
        form.reset({
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          status: user.status,
          phone: user.phone || '',
          date_of_birth: user.date_of_birth || '',
          password: '', // Don't pre-fill password
          rbac_role_id: user.rbac_role?.id || '',
        });
      } else {
        // Creating new user
        form.reset({
          email: '',
          first_name: '',
          last_name: '',
          role: 'support',
          status: 'active',
          phone: '',
          date_of_birth: '',
          password: '',
          rbac_role_id: '',
        });
      }
    }
  }, [user, open, form]);

  const handleSubmit = async (data: UserFormData) => {
    try {
      // Convert empty strings to undefined for optional fields
      const formattedData = {
        ...data,
        username: data.email, // Set username as email
        phone: data.phone || undefined,
        date_of_birth: data.date_of_birth || undefined,
        rbac_role_id: data.rbac_role_id || undefined,
      };

      if (user && !data.password) {
        // If editing and no password provided, remove password from data
        const { password, ...updateData } = formattedData;
        await onSubmit(updateData as UserFormData);
      } else {
        await onSubmit(formattedData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {user ? 'Update user information and settings' : 'Create a new admin, support, or risk user'}
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Username) *</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rbac_role_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Sync legacy role field from RBAC role slug
                        const selectedRole = rbacRoles.find(r => r.id === value);
                        if (selectedRole) {
                          const validSlugs = ['admin', 'support', 'risk', 'content_creator', 'discord_manager'];
                          if (validSlugs.includes(selectedRole.slug)) {
                            form.setValue('role', selectedRole.slug as any);
                          }
                        }
                      }}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rbacRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                            {role.is_system && ' (System)'}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{user ? 'New Password (leave empty to keep current)' : 'Password *'}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        {...field} 
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                  {!user && (
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters and contain uppercase, lowercase, number and special character.
                    </p>
                  )}
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : user ? 'Update User' : 'Create User'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};