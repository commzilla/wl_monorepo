import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AffiliateUser } from '@/types/affiliate';

const affiliateUserSchema = z.object({
  username: z.string().optional(),
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  status: z.string().default('active'),
  profile_picture: z.string().optional(),
  date_of_birth: z.string().optional(),
  affiliate_profile: z.object({
    approved: z.boolean().default(false),
    website_url: z.string().url().optional().or(z.literal('')),
    promotion_strategy: z.string().optional(),
  }).optional(),
  custom_commission: z.object({
    is_active: z.boolean().default(true),
    commission_rate: z.string().optional(),
    fixed_amount_per_referral: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
});

type AffiliateUserFormData = z.infer<typeof affiliateUserSchema>;

interface AffiliateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AffiliateUser;
  onSubmit: (data: AffiliateUserFormData) => Promise<void>;
  isLoading?: boolean;
}

const AffiliateUserDialog: React.FC<AffiliateUserDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSubmit,
  isLoading = false,
}) => {
  const form = useForm<AffiliateUserFormData>({
    resolver: zodResolver(affiliateUserSchema),
    defaultValues: {
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      status: 'active',
      profile_picture: '',
      date_of_birth: '',
      affiliate_profile: {
        approved: false,
        website_url: '',
        promotion_strategy: '',
      },
      custom_commission: {
        is_active: true,
        commission_rate: '',
        fixed_amount_per_referral: '',
        notes: '',
      },
    },
  });

  // Reset form when user changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        username: user?.username || '',
        email: user?.email || '',
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        phone: user?.phone || '',
        status: user?.status || 'active',
        profile_picture: user?.profile_picture || '',
        date_of_birth: user?.date_of_birth || '',
        affiliate_profile: {
          approved: user?.affiliate_profile?.approved || false,
          website_url: user?.affiliate_profile?.website_url || '',
          promotion_strategy: user?.affiliate_profile?.promotion_strategy || '',
        },
        custom_commission: {
          is_active: user?.custom_commission_info?.is_active ?? false,
          commission_rate: user?.custom_commission_info?.commission_rate || '',
          fixed_amount_per_referral: user?.custom_commission_info?.fixed_amount_per_referral || '',
          notes: user?.custom_commission_info?.notes || '',
        },
      });
    }
  }, [user, open, form]);

  const handleSubmit = async (data: AffiliateUserFormData) => {
    try {
      // Transform empty date strings to null for API compatibility
      const transformedData: any = {
        ...data,
        username: data.email, // Use email as username
        date_of_birth: data.date_of_birth === '' ? undefined : data.date_of_birth,
        phone: data.phone === '' ? undefined : data.phone,
        profile_picture: data.profile_picture === '' ? undefined : data.profile_picture,
        affiliate_profile: data.affiliate_profile ? {
          ...data.affiliate_profile,
          website_url: data.affiliate_profile.website_url === '' ? undefined : data.affiliate_profile.website_url,
          promotion_strategy: data.affiliate_profile.promotion_strategy === '' ? undefined : data.affiliate_profile.promotion_strategy,
        } : undefined,
        custom_commission: data.custom_commission ? {
          is_active: data.custom_commission.is_active,
          commission_rate: data.custom_commission.commission_rate === '' ? undefined : data.custom_commission.commission_rate,
          fixed_amount_per_referral: data.custom_commission.fixed_amount_per_referral === '' ? undefined : data.custom_commission.fixed_amount_per_referral,
          notes: data.custom_commission.notes === '' ? undefined : data.custom_commission.notes,
        } : undefined
      };
      
      await onSubmit(transformedData);
      form.reset();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Edit Affiliate User' : 'Create Affiliate User'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* User Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">User Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} />
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
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
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

            {/* Affiliate Profile */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Affiliate Profile</h3>
              
              {/* Show readonly fields when editing */}
              {user && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Referral Code</label>
                    <div className="mt-1">
                      <code className="text-sm bg-background px-2 py-1 rounded border">
                        {user.affiliate_profile.referral_code}
                      </code>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Referral Count</label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {user.affiliate_profile.referral_count} referrals
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current Tier</label>
                    <div className="mt-1">
                      {user.current_tier_info ? (
                        <div className="text-sm">
                          <div className="font-medium">{user.current_tier_info.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.current_tier_info.commission_rate}% commission
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No tier assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="affiliate_profile.approved"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Approved</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Mark this affiliate as approved for commission payments
                      </div>
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

              <FormField
                control={form.control}
                name="affiliate_profile.website_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="affiliate_profile.promotion_strategy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Promotion Strategy</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the promotion strategy..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Custom Commission */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Custom Commission</h3>
              
              {/* Show readonly fields when editing and custom commission exists */}
              {user?.custom_commission_info && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Created At</span>
                    <span className="text-sm">{new Date(user.custom_commission_info.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
                    <span className="text-sm">{new Date(user.custom_commission_info.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="custom_commission.is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable custom commission for this affiliate
                      </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="custom_commission.commission_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="e.g., 18.50" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="custom_commission.fixed_amount_per_referral"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fixed Amount per Referral</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="e.g., 50.00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="custom_commission.notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Special Q4 affiliate partner program"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4">
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

export default AffiliateUserDialog;