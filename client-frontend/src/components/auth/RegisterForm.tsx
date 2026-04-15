import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Eye, EyeOff, Mail, User, Phone, Calendar, Lock, MapPin, Home, Check, X } from 'lucide-react';
import { validatePassword, getPasswordStrength } from '@/utils/passwordValidation';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Validation schemas
const registrationSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required').max(20),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirm_password: z.string(),
  referral_code: z.string().optional(),
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State/Province is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export const RegisterForm: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<'register' | 'otp' | 'complete'>('register');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationFormData | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    password: '',
    confirm_password: '',
    referral_code: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    terms_accepted: false,
  });

  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Real-time password validation
    if (name === 'password') {
      const strength = getPasswordStrength(value);
      setPasswordStrength(value.length > 0 ? strength : null);
      setPasswordValidation({
        minLength: value.length >= 8,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasNumber: /\d/.test(value),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(value),
      });
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, terms_accepted: checked }));
    if (errors.terms_accepted) {
      setErrors(prev => ({ ...prev, terms_accepted: '' }));
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data
    const result = registrationSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const address_info = {
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
      };

      const requestData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        password: formData.password,
        referral_code: formData.referral_code || '',
        address_info,
      };

      const response = await fetch(`${API_BASE_URL}/auth/client/register/request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.email) {
          toast.error(data.email[0] || 'Email already registered');
        } else {
          toast.error(data.detail || 'Registration failed');
        }
        return;
      }

      setRegistrationData(result.data);
      setStep('otp');
      toast.success('OTP sent to your email!');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = otpSchema.safeParse({ otp });
    if (!result.success) {
      setErrors({ otp: result.error.errors[0].message });
      return;
    }

    if (!registrationData) {
      toast.error('Registration data not found');
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Verify OTP
      const verifyResponse = await fetch(`${API_BASE_URL}/auth/client/register/verify-otp/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registrationData.email,
          otp,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        toast.error(verifyData.detail || verifyData.non_field_errors?.[0] || 'OTP verification failed');
        return;
      }

      // Step 2: Complete registration
      const address_info = {
        address_line1: registrationData.address_line1,
        address_line2: registrationData.address_line2,
        city: registrationData.city,
        state: registrationData.state,
        postal_code: registrationData.postal_code,
        country: registrationData.country,
      };

      const completeResponse = await fetch(`${API_BASE_URL}/auth/client/register/complete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registrationData.email,
          first_name: registrationData.first_name,
          last_name: registrationData.last_name,
          phone: registrationData.phone,
          date_of_birth: registrationData.date_of_birth,
          password: registrationData.password,
          referral_code: registrationData.referral_code || '',
          address_info,
        }),
      });

      const completeData = await completeResponse.json();

      if (!completeResponse.ok) {
        toast.error(completeData.detail || 'Registration completion failed');
        return;
      }

      setStep('complete');
      toast.success('Registration completed successfully!');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!registrationData) return;

    setIsLoading(true);
    try {
      const address_info = {
        address_line1: registrationData.address_line1,
        address_line2: registrationData.address_line2,
        city: registrationData.city,
        state: registrationData.state,
        postal_code: registrationData.postal_code,
        country: registrationData.country,
      };

      const response = await fetch(`${API_BASE_URL}/auth/client/register/request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: registrationData.first_name,
          last_name: registrationData.last_name,
          email: registrationData.email,
          phone: registrationData.phone,
          date_of_birth: registrationData.date_of_birth,
          password: registrationData.password,
          referral_code: registrationData.referral_code || '',
          address_info,
        }),
      });

      if (response.ok) {
        toast.success('OTP resent to your email!');
      } else {
        toast.error('Failed to resend OTP');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'complete') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#00A5E4]/20 to-[#3AB3FF]/20 rounded-3xl blur-xl" />
          
          <div className="relative bg-[#0A1114]/90 backdrop-blur-sm border border-[#23353E]/50 rounded-3xl p-8 md:p-12 text-center animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-3">
              {t('auth.registrationComplete')}
            </h2>
            <p className="text-[#85A8C3] text-base mb-6">
              {t('auth.accountCreated')}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-[#3AB3FF]">
              <div className="w-2 h-2 bg-[#3AB3FF] rounded-full animate-pulse" />
              {t('auth.redirectingToLogin')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#00A5E4]/20 to-[#3AB3FF]/20 rounded-3xl blur-xl" />
          
          <div className="relative bg-[#0A1114]/90 backdrop-blur-sm border border-[#23353E]/50 rounded-3xl p-8 md:p-10 animate-fade-in">
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-full bg-[#3AB3FF] flex items-center justify-center text-white text-sm font-semibold">
                ✓
              </div>
              <div className="w-12 h-0.5 bg-[#3AB3FF]" />
              <div className="w-8 h-8 rounded-full bg-[#3AB3FF] flex items-center justify-center text-white text-sm font-semibold">
                2
              </div>
              <div className="w-12 h-0.5 bg-[#23353E]" />
              <div className="w-8 h-8 rounded-full bg-[#23353E] flex items-center justify-center text-[#85A8C3] text-sm font-semibold">
                3
              </div>
            </div>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#3AB3FF]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-[#3AB3FF]" />
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold text-white mb-2">{t('auth.verifyEmail')}</h1>
              <p className="text-[#85A8C3] text-sm">
                {t('auth.enterCodeSent')}<br />
                <span className="text-white font-medium">{registrationData?.email}</span>
              </p>
            </div>
            
            <form onSubmit={handleOTPSubmit} className="space-y-6">
              <div>
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    maxLength={6}
                    placeholder={t('auth.placeholderOTP')}
                  required
                  disabled={isLoading}
                  className="text-center text-3xl tracking-[0.5em] font-semibold h-14 bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF]"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    if (errors.otp) setErrors(prev => ({ ...prev, otp: '' }));
                  }}
                />
                {errors.otp && (
                  <p className="text-red-400 text-sm mt-2 text-center">{errors.otp}</p>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={isLoading || otp.length !== 6}
                className="w-full h-12 bg-gradient-to-r from-[#00A5E4] to-[#3AB3FF] hover:from-[#00A5E4]/90 hover:to-[#3AB3FF]/90 text-white font-semibold rounded-xl transition-all"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('auth.verifying')}
                  </div>
                ) : (
                  t('auth.verifyAndContinue')
                )}
              </Button>

              <div className="text-center space-y-3">
                <p className="text-sm text-[#85A8C3]">
                  {t('auth.didntReceiveCode')}
                </p>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isLoading}
                  className="text-sm text-[#00A5E4] hover:text-[#3AB3FF] font-medium disabled:opacity-50 transition-colors"
                >
                  {t('auth.resendCode')}
                </button>
              </div>

              <div className="pt-4 border-t border-[#23353E]">
                <button
                  type="button"
                  onClick={() => setStep('register')}
                  disabled={isLoading}
                  className="text-sm text-[#85A8C3] hover:text-white transition-colors w-full"
                >
                  {t('auth.backToRegistration')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#00A5E4]/20 to-[#3AB3FF]/20 rounded-3xl blur-xl" />
        
        <div className="relative bg-[#0A1114]/90 backdrop-blur-sm border border-[#23353E]/50 rounded-3xl p-6 md:p-10 animate-fade-in">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-full bg-[#3AB3FF] flex items-center justify-center text-white text-sm font-semibold">
              1
            </div>
            <div className="w-12 h-0.5 bg-[#23353E]" />
            <div className="w-8 h-8 rounded-full bg-[#23353E] flex items-center justify-center text-[#85A8C3] text-sm font-semibold">
              2
            </div>
            <div className="w-12 h-0.5 bg-[#23353E]" />
            <div className="w-8 h-8 rounded-full bg-[#23353E] flex items-center justify-center text-[#85A8C3] text-sm font-semibold">
              3
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold text-white mb-2">{t('auth.createAccount')}</h1>
            <p className="text-[#85A8C3]">{t('auth.joinTradingJourney')}</p>
          </div>
          
          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-[#3AB3FF]" />
                {t('auth.personalInformation')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name" className="text-[#85A8C3]">{t('auth.firstName')} {t('auth.requiredField')}</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    disabled={isLoading}
                    className="mt-1.5 bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11"
                    placeholder={t('auth.placeholderFirstName')}
                    value={formData.first_name}
                    onChange={handleInputChange}
                  />
                  {errors.first_name && <p className="text-red-400 text-xs mt-1.5">{errors.first_name}</p>}
                </div>

                <div>
                  <Label htmlFor="last_name" className="text-[#85A8C3]">{t('auth.lastName')} {t('auth.requiredField')}</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    disabled={isLoading}
                    className="mt-1.5 bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11"
                    placeholder={t('auth.placeholderLastName')}
                    value={formData.last_name}
                    onChange={handleInputChange}
                  />
                  {errors.last_name && <p className="text-red-400 text-xs mt-1.5">{errors.last_name}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-[#85A8C3] flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t('auth.emailAddress')} {t('auth.requiredField')}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  disabled={isLoading}
                  className="mt-1.5 bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11"
                  placeholder={t('auth.placeholderEmail')}
                  value={formData.email}
                  onChange={handleInputChange}
                />
                {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone" className="text-[#85A8C3] flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {t('auth.phone')} {t('auth.requiredField')}
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  disabled={isLoading}
                  className="mt-1.5 bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11"
                  placeholder={t('auth.placeholderPhone')}
                  value={formData.phone}
                  onChange={handleInputChange}
                />
                {errors.phone && <p className="text-red-400 text-xs mt-1.5">{errors.phone}</p>}
              </div>

              <div>
                <Label htmlFor="date_of_birth" className="text-[#85A8C3] flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('auth.dateOfBirth')} {t('auth.requiredField')}
                </Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  required
                  disabled={isLoading}
                  className="mt-1.5 bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                />
                {errors.date_of_birth && <p className="text-red-400 text-xs mt-1.5">{errors.date_of_birth}</p>}
              </div>
            </div>

            {/* Security Section */}
            <div className="space-y-4 pt-6 border-t border-[#23353E]">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#3AB3FF]" />
                {t('auth.security')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="password" className="text-[#85A8C3]">{t('auth.password')} {t('auth.requiredField')}</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      disabled={isLoading}
                      className="bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11 pr-10"
                      placeholder={t('auth.placeholderPassword')}
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#85A8C3] hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-3 space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#85A8C3]">{t('auth.passwordStrengthLabel')}</span>
                          <span className={`font-semibold capitalize ${
                            passwordStrength === 'weak' ? 'text-red-400' :
                            passwordStrength === 'medium' ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {t(`auth.${passwordStrength}`)}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength ? 'bg-red-400' : 'bg-[#23353E]'
                          }`} />
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength === 'medium' || passwordStrength === 'strong' ? 'bg-yellow-400' : 'bg-[#23353E]'
                          }`} />
                          <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            passwordStrength === 'strong' ? 'bg-green-400' : 'bg-[#23353E]'
                          }`} />
                        </div>
                      </div>

                      {/* Password Requirements */}
                      <div className="bg-[#0B1D26]/30 border border-[#23353E] rounded-lg p-3 space-y-2">
                        <p className="text-xs text-[#85A8C3] font-medium mb-2">{t('auth.passwordRequirementsLabel')}</p>
                        <div className="grid grid-cols-1 gap-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            {passwordValidation.minLength ? (
                              <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-[#4A6572] flex-shrink-0" />
                            )}
                            <span className={`transition-colors ${passwordValidation.minLength ? 'text-green-400' : 'text-[#85A8C3]'}`}>
                              {t('auth.minLengthDetail')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {passwordValidation.hasUppercase ? (
                              <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-[#4A6572] flex-shrink-0" />
                            )}
                            <span className={`transition-colors ${passwordValidation.hasUppercase ? 'text-green-400' : 'text-[#85A8C3]'}`}>
                              {t('auth.hasUppercaseDetail')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {passwordValidation.hasLowercase ? (
                              <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-[#4A6572] flex-shrink-0" />
                            )}
                            <span className={`transition-colors ${passwordValidation.hasLowercase ? 'text-green-400' : 'text-[#85A8C3]'}`}>
                              {t('auth.hasLowercaseDetail')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {passwordValidation.hasNumber ? (
                              <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-[#4A6572] flex-shrink-0" />
                            )}
                            <span className={`transition-colors ${passwordValidation.hasNumber ? 'text-green-400' : 'text-[#85A8C3]'}`}>
                              {t('auth.hasNumberDetail')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {passwordValidation.hasSpecialChar ? (
                              <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-[#4A6572] flex-shrink-0" />
                            )}
                            <span className={`transition-colors ${passwordValidation.hasSpecialChar ? 'text-green-400' : 'text-[#85A8C3]'}`}>
                              {t('auth.hasSpecialCharDetail')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password}</p>}
                </div>

                <div>
                  <Label htmlFor="confirm_password" className="text-[#85A8C3]">{t('auth.confirmPassword')} {t('auth.requiredField')}</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      disabled={isLoading}
                      className="bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11 pr-10"
                      placeholder={t('auth.placeholderPassword')}
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#85A8C3] hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirm_password && <p className="text-red-400 text-xs mt-1.5">{errors.confirm_password}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="referral_code" className="text-[#85A8C3]">{t('auth.referralCode')}</Label>
                <Input
                  id="referral_code"
                  name="referral_code"
                  type="text"
                  disabled={isLoading}
                  className="mt-1.5 bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11"
                  placeholder={t('auth.placeholderReferral')}
                  value={formData.referral_code}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4 pt-6 border-t border-[#23353E]">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#3AB3FF]" />
                {t('auth.addressInformation')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address_line1" className="text-[#85A8C3] flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    {t('auth.addressLine1')} {t('auth.requiredField')}
                  </Label>
                  <Input
                    id="address_line1"
                    name="address_line1"
                    type="text"
                    required
                    disabled={isLoading}
                    className="mt-1.5 bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11"
                    placeholder={t('auth.placeholderAddress1')}
                    value={formData.address_line1}
                    onChange={handleInputChange}
                  />
                  {errors.address_line1 && <p className="text-red-400 text-xs mt-1.5">{errors.address_line1}</p>}
                </div>

                <div>
                  <Label htmlFor="address_line2" className="text-[#85A8C3]">{t('auth.addressLine2')}</Label>
                  <Input
                    id="address_line2"
                    name="address_line2"
                    type="text"
                    disabled={isLoading}
                    className="mt-1.5 bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11"
                    placeholder={t('auth.placeholderAddress2')}
                    value={formData.address_line2}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-[#85A8C3]">{t('auth.city')} {t('auth.requiredField')}</Label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      required
                      disabled={isLoading}
                      className="mt-1.5 bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11"
                      placeholder={t('auth.placeholderCity')}
                      value={formData.city}
                      onChange={handleInputChange}
                    />
                    {errors.city && <p className="text-red-400 text-xs mt-1.5">{errors.city}</p>}
                  </div>

                  <div>
                    <Label htmlFor="state" className="text-[#85A8C3]">{t('auth.state')} {t('auth.requiredField')}</Label>
                    <Input
                      id="state"
                      name="state"
                      type="text"
                      required
                      disabled={isLoading}
                      className="mt-1.5 bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11"
                      placeholder={t('auth.placeholderState')}
                      value={formData.state}
                      onChange={handleInputChange}
                    />
                    {errors.state && <p className="text-red-400 text-xs mt-1.5">{errors.state}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postal_code" className="text-[#85A8C3]">{t('auth.postalCode')} {t('auth.requiredField')}</Label>
                    <Input
                      id="postal_code"
                      name="postal_code"
                      type="text"
                      required
                      disabled={isLoading}
                      className="mt-1.5 bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11"
                      placeholder={t('auth.placeholderPostalCode')}
                      value={formData.postal_code}
                      onChange={handleInputChange}
                    />
                    {errors.postal_code && <p className="text-red-400 text-xs mt-1.5">{errors.postal_code}</p>}
                  </div>

                  <div>
                    <Label htmlFor="country" className="text-[#85A8C3]">{t('auth.country')} {t('auth.requiredField')}</Label>
                    <Input
                      id="country"
                      name="country"
                      type="text"
                      required
                      disabled={isLoading}
                      className="mt-1.5 bg-[#0A1016] border-[#23353E] focus:border-[#3AB3FF] h-11"
                      placeholder={t('auth.placeholderCountry')}
                      value={formData.country}
                      onChange={handleInputChange}
                    />
                    {errors.country && <p className="text-red-400 text-xs mt-1.5">{errors.country}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="pt-6 border-t border-[#23353E]">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms_accepted"
                  checked={formData.terms_accepted}
                  onCheckedChange={handleCheckboxChange}
                  disabled={isLoading}
                  className="mt-1 border-[#23353E] data-[state=checked]:bg-[#3AB3FF] data-[state=checked]:border-[#3AB3FF]"
                />
                <div className="flex-1">
                  <label
                    htmlFor="terms_accepted"
                    className="text-sm text-[#85A8C3] leading-relaxed cursor-pointer"
                  >
                    {t('auth.termsAgreement')}{' '}
                    <a
                      href="https://we-fund.com/terms-and-conditions/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00A5E4] hover:text-[#3AB3FF] font-medium transition-colors underline"
                    >
                      {t('auth.termsAndConditionsLink')}
                    </a>
                    {' '}{t('auth.and')}{' '}
                    <a
                      href="https://we-fund.com/privacy-and-cookie-policy/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00A5E4] hover:text-[#3AB3FF] font-medium transition-colors underline"
                    >
                      {t('auth.privacyPolicyLink')}
                    </a>
                  </label>
                  {errors.terms_accepted && (
                    <p className="text-red-400 text-xs mt-1.5">{errors.terms_accepted}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button 
                type="submit" 
                disabled={isLoading || !formData.terms_accepted}
                className="w-full h-12 bg-gradient-to-r from-[#00A5E4] to-[#3AB3FF] hover:from-[#00A5E4]/90 hover:to-[#3AB3FF]/90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('auth.creatingAccount')}
                  </div>
                ) : (
                  t('auth.createAccountButton')
                )}
              </Button>
            </div>

            <div className="text-center pt-6 border-t border-[#23353E]">
              <p className="text-sm text-[#85A8C3]">
                {t('auth.alreadyHaveAccount')}{' '}
                <Link to="/login" className="text-[#00A5E4] hover:text-[#3AB3FF] font-medium transition-colors">
                  {t('auth.logIn')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
