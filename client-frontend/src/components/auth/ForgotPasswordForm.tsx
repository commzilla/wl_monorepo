import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { requestPasswordReset } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordForm: React.FC = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    try {
      await requestPasswordReset({ email: data.email });
      setIsSuccess(true);
      toast({
        title: 'Reset link sent',
        description: 'Please check your email for password reset instructions.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send reset link',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-[#0A1114] rounded-2xl p-4 md:p-8 w-full max-w-md mx-auto">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-full flex items-center justify-center mb-6">
            <Mail className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-medium text-white mb-3">{t('auth.checkYourEmail')}</h1>
          <p className="text-[#85A8C3] mb-6 leading-relaxed">
            {t('auth.resetLinkSent')}{' '}
            <span className="font-medium text-white">{getValues('email')}</span>
          </p>
          
          <div className="bg-[#0A1016] border border-[#23353E] rounded-lg p-4 mb-6">
            <p className="text-sm text-[#85A8C3] leading-relaxed">
              {t('auth.checkSpamFolder')}
            </p>
          </div>
          
          <Link to="/login" className="block">
            <button className="w-full flex items-center justify-center py-3 px-4 border border-[#23353E] rounded-lg text-sm font-medium text-[#85A8C3] bg-transparent hover:bg-[#0A1016] focus:outline-none focus:ring-1 focus:ring-[#3AB3FF] transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('auth.backToLogin')}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A1114] rounded-2xl p-4 md:p-8 w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-[#00A5E4]/20 to-[#3AB3FF]/20 rounded-full flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-[#00A5E4]" />
        </div>
        <h1 className="text-2xl font-medium text-white mb-2">{t('auth.forgotYourPassword')}</h1>
        <p className="text-[#85A8C3] text-sm leading-relaxed">
          {t('auth.enterEmailForReset')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#85A8C3] mb-2">
            {t('auth.emailAddress')}
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              placeholder={t('auth.placeholderEmailReset')}
              {...register('email')}
              disabled={isLoading}
              className="appearance-none block w-full px-4 py-3 border border-[#23353E] rounded-lg bg-[#0A1016] text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#3AB3FF] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          {errors.email && (
            <p className="text-sm text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-[#E4EEF5] bg-[color:var(--border-primary-color,#3AB3FF)] shadow-[0px_3px_1px_0px_rgba(255,255,255,0.35)_inset] hover:bg-[rgba(58,179,255,0.9)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00A5E4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('auth.sending')}
            </>
          ) : t('auth.sendResetLink')}
        </button>

        <div className="text-center">
          <Link to="/login" className="inline-flex items-center text-sm font-medium text-[#00A5E4] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t('auth.backToLogin')}
          </Link>
        </div>
      </form>
    </div>
  );
};