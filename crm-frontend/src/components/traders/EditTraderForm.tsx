
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { traderService, UpdateTraderRequest } from '@/services/traderService';
import { Clock, CheckCircle, XCircle, AlertCircle, User, Phone, FileText } from 'lucide-react';

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

// Define the form schema using zod
const editTraderFormSchema = z.object({
  first_name: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  last_name: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().optional(),
  kyc_status: z.enum(['approved', 'rejected', 'pending', 'not_submitted']),
  has_live_account: z.boolean(),
  address_info: z.string().optional(),
  referred_by: z.string().optional(),
});

type EditTraderFormValues = z.infer<typeof editTraderFormSchema>;

interface EditTraderFormProps {
  trader: DisplayTrader;
  onSuccess: () => void;
}

const EditTraderForm: React.FC<EditTraderFormProps> = ({ trader, onSuccess }) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<EditTraderFormValues>({
    resolver: zodResolver(editTraderFormSchema),
    defaultValues: {
      first_name: trader.firstName,
      last_name: trader.lastName,
      email: trader.email,
      phone: trader.phone === 'Not provided' ? '' : trader.phone,
      kyc_status: trader.kycStatus,
      has_live_account: trader.hasLiveAccount,
      address_info: trader.fullAddress === 'Not provided' ? '' : trader.fullAddress,
      referred_by: "",
    },
  });

  const onSubmit = async (data: EditTraderFormValues) => {
    setIsSubmitting(true);
    
    try {
      console.log('Updating trader data:', data);
      
      // Clean the data - remove empty strings and convert to proper format
      const traderData: Partial<UpdateTraderRequest> = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        kyc_status: data.kyc_status,
        has_live_account: data.has_live_account,
      };

      // Only include optional fields if they have values
      if (data.phone && data.phone.trim() !== '') {
        traderData.phone = data.phone.trim();
      }
      
      if (data.address_info && data.address_info.trim() !== '') {
        traderData.address_info = data.address_info.trim();
      }
      
      if (data.referred_by && data.referred_by.trim() !== '') {
        traderData.referred_by = data.referred_by.trim();
      }

      console.log('Cleaned trader data for API:', traderData);

      const result = await traderService.updateTrader(trader.id, traderData);
      console.log('Trader updated successfully:', result);
      
      onSuccess();
      
      toast({
        title: t('traders.traderUpdated') || 'Trader Updated',
        description: `${data.first_name} ${data.last_name} ${t('traders.traderUpdatedDesc') || 'has been updated successfully'}`,
      });
    } catch (error: any) {
      console.error('Error updating trader:', error);
      toast({
        title: t('traders.updateTraderError') || 'Error updating trader',
        description: error.message || t('traders.updateTraderErrorDesc') || 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary border-b pb-2 flex items-center gap-2">
            <User size={18} />
            {t('traders.personalInfo') || 'Personal Information'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('traders.firstName') || 'First Name'}</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} className="h-11" />
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
                  <FormLabel className="text-sm font-medium">{t('traders.lastName') || 'Last Name'}</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary border-b pb-2 flex items-center gap-2">
            <Phone size={18} />
            {t('traders.contactInfo') || 'Contact Information'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('traders.email') || 'Email'}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john.doe@example.com" {...field} className="h-11" />
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
                  <FormLabel className="text-sm font-medium">{t('traders.phoneOptional') || 'Phone (Optional)'}</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+1 (555) 123-4567" {...field} className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Account Status Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary border-b pb-2 flex items-center gap-2">
            <CheckCircle size={18} />
            {t('traders.accountStatus') || 'Account Status'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="kyc_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('traders.kycStatusLabel') || 'KYC Status'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={t('traders.selectKycStatus') || 'Select KYC status'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="not_submitted">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={16} className="text-muted-foreground" />
                          {t('traders.kycNotSubmitted') || 'Not Submitted'}
                        </div>
                      </SelectItem>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-yellow-500" />
                          {t('traders.kycPending') || 'Pending Review'}
                        </div>
                      </SelectItem>
                      <SelectItem value="approved">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-500" />
                          {t('traders.kycApproved') || 'Approved'}
                        </div>
                      </SelectItem>
                      <SelectItem value="rejected">
                        <div className="flex items-center gap-2">
                          <XCircle size={16} className="text-red-500" />
                          {t('traders.kycRejected') || 'Rejected'}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="has_live_account"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('traders.liveAccountStatus') || 'Live Account Status'}</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === 'true')} value={field.value ? 'true' : 'false'}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={t('traders.selectLiveAccountStatus') || 'Select live account status'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="false">
                        <div className="flex items-center gap-2">
                          <XCircle size={16} className="text-red-500" />
                          {t('traders.noLiveAccount') || 'No Live Account'}
                        </div>
                      </SelectItem>
                      <SelectItem value="true">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-500" />
                          {t('traders.hasLiveAccount') || 'Has Live Account'}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary border-b pb-2 flex items-center gap-2">
            <FileText size={18} />
            {t('traders.additionalInfo') || 'Additional Information'}
          </h3>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="address_info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('traders.fullAddressOptional') || 'Full Address (Optional)'}</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, City, State, Country" {...field} className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referred_by"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">{t('traders.referredByOptional') || 'Referred By (Optional)'}</FormLabel>
                  <FormControl>
                    <Input placeholder="Referrer name or ID" {...field} className="h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <DialogFooter className="pt-8 border-t">
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full sm:w-auto min-w-[120px] h-11"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Updating...
              </>
            ) : (
              t('traders.updateTrader') || 'Update Trader'
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default EditTraderForm;
