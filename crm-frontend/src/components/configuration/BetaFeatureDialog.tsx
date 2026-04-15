import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { BetaFeature, BetaFeatureStatus } from '@/lib/types/betaFeature';

const formSchema = z.object({
  code: z.string()
    .min(1, 'Code is required')
    .max(100, 'Code must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Code must be lowercase alphanumeric with hyphens'),
  name: z.string()
    .min(1, 'Name is required')
    .max(150, 'Name must be less than 150 characters'),
  description: z.string(),
  status: z.enum(['draft', 'active', 'closed', 'released'] as const),
  requires_kya: z.boolean(),
  requires_kyc: z.boolean(),
});

interface BetaFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: BetaFeature;
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  isSubmitting: boolean;
}

export const BetaFeatureDialog: React.FC<BetaFeatureDialogProps> = ({
  open,
  onOpenChange,
  feature,
  onSubmit,
  isSubmitting,
}) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: feature?.code || '',
      name: feature?.name || '',
      description: feature?.description || '',
      status: feature?.status || 'draft',
      requires_kya: feature?.requires_kya || false,
      requires_kyc: feature?.requires_kyc || false,
    },
  });

  React.useEffect(() => {
    if (feature) {
      form.reset({
        code: feature.code,
        name: feature.name,
        description: feature.description,
        status: feature.status,
        requires_kya: feature.requires_kya,
        requires_kyc: feature.requires_kyc,
      });
    } else {
      form.reset({
        code: '',
        name: '',
        description: '',
        status: 'draft',
        requires_kya: false,
        requires_kyc: false,
      });
    }
  }, [feature, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>{feature ? 'Edit Beta Feature' : 'Create Beta Feature'}</DialogTitle>
          <DialogDescription>
            {feature ? 'Update the beta feature details' : 'Add a new beta feature to the system'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="feature-code (lowercase, hyphens allowed)" 
                      {...field}
                      disabled={!!feature}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Feature name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Feature description"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft (hidden)</SelectItem>
                      <SelectItem value="active">Active (accepting requests)</SelectItem>
                      <SelectItem value="closed">Closed (not accepting new requests)</SelectItem>
                      <SelectItem value="released">Released to Production</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requires_kya"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-input"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Requires KYA</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Know Your Affiliate required
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requires_kyc"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-input"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Requires KYC</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Know Your Client required
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : feature ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
