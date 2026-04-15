
import React, { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { apiService } from '@/services/apiService';

interface PasswordFormData {
  old_password: string;
  new_password: string;
  confirmPassword: string;
}

const PasswordSection = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const passwordForm = useForm<PasswordFormData>({
    defaultValues: {
      old_password: '',
      new_password: '',
      confirmPassword: '',
    },
  });

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (data.new_password !== data.confirmPassword) {
      toast({
        title: t('settings.passwordMismatch'),
        description: t('settings.passwordMismatchDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await apiService.patch('/superuser/change-password/', {
        old_password: data.old_password,
        new_password: data.new_password,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast({
        title: t('settings.passwordChanged'),
        description: t('settings.passwordChangedDesc'),
      });
      passwordForm.reset();
    } catch (error: any) {
      toast({
        title: t('settings.passwordChangeFailed'),
        description: error.message || t('settings.passwordChangeFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.password.title')}</CardTitle>
        <CardDescription>
          {t('settings.password.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <FormField
              control={passwordForm.control}
              name="old_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.currentPassword')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={`Enter ${t('settings.currentPassword').toLowerCase()}`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={passwordForm.control}
                name="new_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.newPassword')}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={`Enter ${t('settings.newPassword').toLowerCase()}`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.confirmPassword')}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={t('settings.confirmPassword')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? t('settings.changing') : t('settings.changePassword')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PasswordSection;
