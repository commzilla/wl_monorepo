import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { traderService, UpdateTraderRequest } from '@/services/traderService';
import {
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  UserPlus,
} from 'lucide-react';

interface DisplayTrader {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  fullAddress: string;
  kycStatus: 'approved' | 'rejected' | 'pending' | 'not_submitted';
  hasLiveAccount: boolean;
  registeredAt: Date;
  challenges: { id: string; status: string }[];
  accounts: { status: string }[];
}

const editProfileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters.'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  phone: z.string().optional(),
  kyc_status: z.enum(['approved', 'rejected', 'pending', 'not_submitted']),
  has_live_account: z.boolean(),
  address_info: z.string().optional(),
  referred_by: z.string().optional(),
});

type EditProfileValues = z.infer<typeof editProfileSchema>;

interface EditProfileDialogProps {
  trader: DisplayTrader;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const kycOptions = [
  { value: 'not_submitted', label: 'Not Submitted', icon: AlertCircle, className: 'text-muted-foreground' },
  { value: 'pending', label: 'Pending Review', icon: Clock, className: 'text-yellow-500' },
  { value: 'approved', label: 'Approved', icon: CheckCircle, className: 'text-emerald-500' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, className: 'text-destructive' },
];

const EditProfileDialog: React.FC<EditProfileDialogProps> = ({
  trader,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      first_name: trader.firstName,
      last_name: trader.lastName,
      email: trader.email,
      phone: trader.phone === 'Not provided' ? '' : trader.phone,
      kyc_status: trader.kycStatus,
      has_live_account: trader.hasLiveAccount,
      address_info: trader.fullAddress === 'Not provided' ? '' : trader.fullAddress,
      referred_by: '',
    },
  });

  // Reset form when trader changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        first_name: trader.firstName,
        last_name: trader.lastName,
        email: trader.email,
        phone: trader.phone === 'Not provided' ? '' : trader.phone,
        kyc_status: trader.kycStatus,
        has_live_account: trader.hasLiveAccount,
        address_info: trader.fullAddress === 'Not provided' ? '' : trader.fullAddress,
        referred_by: '',
      });
    }
  }, [open, trader]);

  const onSubmit = async (data: EditProfileValues) => {
    setIsSubmitting(true);
    try {
      const traderData: Partial<UpdateTraderRequest> = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        kyc_status: data.kyc_status,
        has_live_account: data.has_live_account,
      };

      if (data.phone?.trim()) traderData.phone = data.phone.trim();
      if (data.address_info?.trim()) traderData.address_info = data.address_info.trim();
      if (data.referred_by?.trim()) traderData.referred_by = data.referred_by.trim();

      await traderService.updateTrader(trader.id, traderData);

      onOpenChange(false);
      onSuccess();

      toast({
        title: 'Profile Updated',
        description: `${data.first_name} ${data.last_name} has been updated successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-xl border-border/50">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Edit Profile</h2>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                {trader.firstName} {trader.lastName} · {trader.email}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-5 space-y-6">
            {/* Personal Information */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <User size={12} />
                Personal Information
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">First Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Mail size={12} />
                Contact
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Phone</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="Optional" {...field} className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Account Status */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Shield size={12} />
                Account Status
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="kyc_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">KYC Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {kycOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                <opt.icon size={14} className={opt.className} />
                                {opt.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="has_live_account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Live Account</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === 'true')} value={field.value ? 'true' : 'false'}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="false">
                            <div className="flex items-center gap-2">
                              <XCircle size={14} className="text-destructive" />
                              No Live Account
                            </div>
                          </SelectItem>
                          <SelectItem value="true">
                            <div className="flex items-center gap-2">
                              <CheckCircle size={14} className="text-emerald-500" />
                              Has Live Account
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin size={12} />
                Additional
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="address_info"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="referred_by"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Referred By</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional" {...field} className="h-9 text-sm bg-muted/30 border-border/50 focus:bg-background" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-9"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            onClick={form.handleSubmit(onSubmit)}
            className="h-9 min-w-[100px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
