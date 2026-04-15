import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AffiliateUser } from '@/types/affiliate';
import { Tag, Loader2 } from 'lucide-react';

const assignReferralCodeSchema = z.object({
  user_id: z.string().uuid(),
  referral_code: z
    .string()
    .min(1, 'Referral code is required')
    .max(32, 'Referral code must be less than 32 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Only uppercase letters, numbers, underscores, and hyphens allowed')
    .transform((val) => val.toUpperCase()),
});

type AssignReferralCodeFormData = z.infer<typeof assignReferralCodeSchema>;

interface AssignReferralCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AffiliateUser | null;
  onSubmit: (data: AssignReferralCodeFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export const AssignReferralCodeDialog: React.FC<AssignReferralCodeDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSubmit,
  isSubmitting = false,
}) => {
  const form = useForm<AssignReferralCodeFormData>({
    resolver: zodResolver(assignReferralCodeSchema),
    defaultValues: {
      user_id: user?.id || '',
      referral_code: user?.affiliate_profile?.referral_code || '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        user_id: user.id,
        referral_code: user.affiliate_profile?.referral_code || '',
      });
    }
  }, [user, form]);

  const handleSubmit = async (data: AssignReferralCodeFormData) => {
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Tag className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base font-semibold">Assign Referral Code</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Assign or update a custom referral code for {user?.username || 'this user'}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="px-6 pb-5 space-y-4">
              <FormField
                control={form.control}
                name="referral_code"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium">Referral Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="CUSTOM123"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="bg-muted/30 text-sm font-mono uppercase"
                        maxLength={32}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Uppercase letters, numbers, underscores, hyphens only (max 32 chars)
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {user?.affiliate_profile?.referral_code && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    Current code: <code className="bg-background px-2 py-0.5 rounded text-foreground font-mono">{user.affiliate_profile.referral_code}</code>
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 bg-muted/20 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Assign Code
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
