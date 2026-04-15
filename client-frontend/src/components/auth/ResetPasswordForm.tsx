import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, CheckCircle, ArrowLeft, Shield, Key } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { confirmPasswordReset } from '@/utils/api';
import { validatePassword, getPasswordStrength, getPasswordStrengthColor } from '@/utils/passwordValidation';
import { useToast } from '@/hooks/use-toast';

const resetPasswordSchema = z.object({
  new_password: z.string().min(8, 'Password must be at least 8 characters long'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  uid: string;
  token: string;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ uid, token }) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('new_password', '');
  const passwordValidation = validatePassword(password);
  const passwordStrength = getPasswordStrength(password);
  const strengthColor = getPasswordStrengthColor(passwordStrength);

  const getStrengthPercentage = () => {
    switch (passwordStrength) {
      case 'weak': return 25;
      case 'medium': return 60;
      case 'strong': return 100;
      default: return 0;
    }
  };

  const onSubmit = async (data: ResetPasswordForm) => {
    // Additional client-side validation
    const validation = validatePassword(data.new_password);
    if (!validation.isValid) {
      toast({
        title: 'Invalid password',
        description: validation.errors[0],
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await confirmPasswordReset({
        uid,
        token,
        new_password: data.new_password,
      });
      setIsSuccess(true);
      toast({
        title: 'Password reset successful',
        description: 'Your password has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
        <Card className="w-full max-w-md mx-auto bg-[#0A1114] border-[#23353E] shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              {t('auth.passwordUpdated')}
            </CardTitle>
            <CardDescription className="text-[#85A8C3] text-base leading-relaxed mt-2">
              {t('auth.passwordUpdatedDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full bg-gradient-to-r from-[#3AB3FF] to-[#3AB3FF]/90 hover:from-[#3AB3FF]/90 hover:to-[#3AB3FF] text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-[#3AB3FF]/25"
            >
              {t('auth.continueToLogin')}
            </Button>
          </CardContent>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto bg-[#0A1114] border-[#23353E] shadow-2xl">
      <CardHeader className="text-center pb-6">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#3AB3FF]/20 to-[#3AB3FF]/10 rounded-full flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-[#3AB3FF]" />
        </div>
        <CardTitle className="text-2xl font-bold text-white">
          {t('auth.createNewPassword')}
        </CardTitle>
        <CardDescription className="text-[#85A8C3] text-base leading-relaxed mt-2">
          {t('auth.chooseStrongPassword')}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="new_password" className="text-[#85A8C3] font-medium flex items-center gap-2">
              <Key className="w-4 h-4 text-[#3AB3FF]" />
              {t('auth.newPassword')}
            </Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.placeholderNewPassword')}
                {...register('new_password')}
                disabled={isLoading}
                className="bg-[#0A1016] border-[#23353E] text-white placeholder:text-gray-400 focus:border-[#3AB3FF] focus:ring-1 focus:ring-[#3AB3FF] transition-all duration-200 pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-[#85A8C3] hover:text-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.new_password && (
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertDescription className="text-red-400 text-sm">
                  {errors.new_password.message}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Password strength indicator */}
            {password && (
              <div className="space-y-3 p-4 bg-[#0A1016] rounded-lg border border-[#23353E]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#85A8C3]">{t('auth.passwordStrength')}:</span>
                  <span className={`text-sm font-semibold ${strengthColor}`}>
                    {t(`auth.${passwordStrength}`)}
                  </span>
                </div>
                <Progress value={getStrengthPercentage()} className="h-2" />
                
                {/* Password requirements */}
                {!passwordValidation.isValid && (
                  <div className="space-y-1">
                    <p className="text-xs text-[#85A8C3] mb-2">Requirements:</p>
                    {passwordValidation.errors.map((error, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <div className="w-1 h-1 rounded-full bg-[#85A8C3]/60" />
                        <span className="text-[#85A8C3]">{error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="confirm_password" className="text-[#85A8C3] font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#3AB3FF]" />
              {t('auth.confirmPassword')}
            </Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('auth.placeholderConfirmPassword')}
                {...register('confirm_password')}
                disabled={isLoading}
                className="bg-[#0A1016] border-[#23353E] text-white placeholder:text-gray-400 focus:border-[#3AB3FF] focus:ring-1 focus:ring-[#3AB3FF] transition-all duration-200 pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-[#85A8C3] hover:text-white transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirm_password && (
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertDescription className="text-red-400 text-sm">
                  {errors.confirm_password.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-[#3AB3FF] to-[#3AB3FF]/90 hover:from-[#3AB3FF]/90 hover:to-[#3AB3FF] text-white font-semibold py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-[#3AB3FF]/25 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={isLoading || !passwordValidation.isValid}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('auth.updatingPassword')}
                </div>
              ) : (
                t('auth.updatePassword')
              )}
            </Button>

            <Link to="/login" className="block">
              <Button variant="ghost" className="w-full text-[#85A8C3] hover:text-white hover:bg-[#0A1016] transition-all duration-200">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('auth.backToLogin')}
              </Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};