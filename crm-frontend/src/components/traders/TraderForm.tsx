import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { traderService, CreateTraderRequest } from '@/services/traderService';

// Define the form schema using zod - matching the API structure
const traderFormSchema = z.object({
  first_name: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  last_name: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  country: z.string().optional(),
});

type TraderFormValues = z.infer<typeof traderFormSchema>;

interface TraderFormProps {
  onSuccess: () => void;
}

const TraderForm: React.FC<TraderFormProps> = ({ onSuccess }) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<TraderFormValues>({
    resolver: zodResolver(traderFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      country: "",
    },
  });

  const onSubmit = async (data: TraderFormValues) => {
    setIsSubmitting(true);
    
    try {
      console.log('Submitting trader data:', data);
      
      const traderData: CreateTraderRequest = {
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        country: data.country || undefined,
      };

      console.log('Final payload to API:', JSON.stringify(traderData, null, 2));

      const result = await traderService.createTrader(traderData);
      console.log('Trader created successfully:', result);
      
      form.reset();
      onSuccess();
      
      toast({
        title: t('traders.traderAdded') || 'Trader Added',
        description: `${data.first_name} ${data.last_name} ${t('traders.traderAddedDesc') || 'has been added successfully'}`,
      });
    } catch (error: any) {
      console.error('Error creating trader:', error);
      toast({
        title: t('traders.addTraderError') || 'Error adding trader',
        description: error.message || t('traders.addTraderErrorDesc') || 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">{t('traders.firstName') || 'First Name'}</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} className="h-10" />
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
                  <Input placeholder="Doe" {...field} className="h-10" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">{t('traders.email') || 'Email'}</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john.doe@example.com" {...field} className="h-10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Min 8 characters" {...field} className="h-10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">Country (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. United States" {...field} className="h-10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <DialogFooter className="pt-6">
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Adding...' : t('traders.addTrader') || 'Add Trader'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default TraderForm;