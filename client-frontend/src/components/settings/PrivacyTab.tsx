
import React, { useState, useEffect } from 'react';
import { ChevronDown, HelpCircle, Eye, EyeOff, Lock } from 'lucide-react';
import { fetchUserProfileSettings, updateUserProfileSettings, UserProfileSettings, changePassword } from '@/utils/api';
import { validatePassword, getPasswordStrength, getPasswordStrengthColor } from '@/utils/passwordValidation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export const PrivacyTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState<UserProfileSettings | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Change password form state
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const confirmationMethods = [
    { value: 'email', label: 'Letter at E-mail' },
    { value: 'sms', label: 'SMS' },
    { value: 'auth_app', label: 'Authenticator App' },
    { value: 'phone_call', label: 'Phone Call' }
  ];

  useEffect(() => {
    loadProfileSettings();
  }, []);

  const loadProfileSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchUserProfileSettings();
      setFormData(data);
    } catch (error) {
      console.error('Failed to load profile settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorToggle = async () => {
    if (!formData) return;

    const updatedData = {
      ...formData,
      two_factor_enabled: !formData.two_factor_enabled
    };

    try {
      setUpdating(true);
      await updateUserProfileSettings({ two_factor_enabled: updatedData.two_factor_enabled });
      setFormData(updatedData);
    } catch (error) {
      console.error('Failed to update two-factor authentication:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleMethodChange = async (method: 'email' | 'sms' | 'phone_call' | 'auth_app') => {
    if (!formData) return;

    const updatedData = {
      ...formData,
      two_factor_method: method
    };

    try {
      setUpdating(true);
      await updateUserProfileSettings({ two_factor_method: method });
      setFormData(updatedData);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Failed to update two-factor method:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({
        title: "Password Error",
        description: "New password and confirm password do not match.",
        variant: "destructive"
      });
      return;
    }

    // Validate new password strength
    const validation = validatePassword(passwordForm.new_password);
    if (!validation.isValid) {
      toast({
        title: "Password Error",
        description: validation.errors[0],
        variant: "destructive"
      });
      return;
    }

    try {
      setChangingPassword(true);
      await changePassword(passwordForm);
      
      toast({
        title: "Success",
        description: "Password successfully changed.",
        variant: "default"
      });
      
      // Reset form
      setPasswordForm({
        old_password: '',
        new_password: '',
        confirm_password: ''
      });
      
    } catch (error: any) {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password.",
        variant: "destructive"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field: 'old' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="text-[#85A8C3]">Loading privacy settings...</div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <div className="text-[#85A8C3]">Failed to load privacy settings</div>
      </div>
    );
  }

  const selectedMethod = confirmationMethods.find(m => m.value === formData.two_factor_method);

  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-2xl font-medium text-[#E4EEF5] mb-8">Privacy & Security</h2>
      
      <div className="space-y-8">
        {/* Two-Factor Authentication */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <span className="text-[#E4EEF5] font-medium">Two-factor authentication</span>
            <HelpCircle size={16} className="text-[#85A8C3]" />
          </div>
          <button
            onClick={handleTwoFactorToggle}
            disabled={updating}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4EC1FF] focus:ring-offset-2 focus:ring-offset-[#080808] disabled:opacity-50
              ${formData.two_factor_enabled ? 'bg-[#4EC1FF]' : 'bg-[#23353E]'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${formData.two_factor_enabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Confirmation Method */}
        {formData.two_factor_enabled && (
          <div>
            <label className="block text-sm font-medium text-[#85A8C3] mb-2">Confirmation method</label>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={updating}
                className="w-full px-4 py-3 bg-[#0A1016] border border-[#23353E] rounded-lg text-[#E4EEF5] text-left flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#4EC1FF] focus:border-transparent disabled:opacity-50"
              >
                <span>{selectedMethod?.label || 'Select method'}</span>
                <ChevronDown
                  size={20}
                  className={`text-[#85A8C3] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#0A1016] border border-[#23353E] rounded-lg shadow-lg z-10">
                  {confirmationMethods.map((method) => (
                    <button
                      key={method.value}
                      onClick={() => handleMethodChange(method.value as any)}
                      disabled={updating}
                      className="w-full px-4 py-3 text-left text-[#E4EEF5] hover:bg-[rgba(40,191,255,0.05)] transition-colors first:rounded-t-lg last:rounded-b-lg disabled:opacity-50"
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Change Password */}
        <div className="pt-8 border-t border-[#23353E]">
          <h3 className="text-xl font-medium text-[#E4EEF5] mb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1A2633] flex items-center justify-center">
              <Lock size={16} className="text-[#4EC1FF]" />
            </div>
            Change Password
          </h3>
          
          <form onSubmit={handlePasswordChange} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-[#85A8C3] mb-2">
                Current Password
              </label>
              <div className="relative">
                <Input
                  type={showPasswords.old ? "text" : "password"}
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm(prev => ({
                    ...prev,
                    old_password: e.target.value
                  }))}
                  className="pr-12 bg-[#0A1016] border-[#23353E] text-[#E4EEF5] focus:border-[#4EC1FF]"
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('old')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#85A8C3] hover:text-[#4EC1FF] transition-colors"
                >
                  {showPasswords.old ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-[#85A8C3] mb-2">
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm(prev => ({
                    ...prev,
                    new_password: e.target.value
                  }))}
                  className="pr-12 bg-[#0A1016] border-[#23353E] text-[#E4EEF5] focus:border-[#4EC1FF]"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#85A8C3] hover:text-[#4EC1FF] transition-colors"
                >
                  {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {passwordForm.new_password && (
                <div className="mt-2">
                  <div className={`text-sm ${getPasswordStrengthColor(getPasswordStrength(passwordForm.new_password))}`}>
                    Password strength: {getPasswordStrength(passwordForm.new_password)}
                  </div>
                  {!validatePassword(passwordForm.new_password).isValid && (
                    <div className="mt-1 text-sm text-red-400">
                      {validatePassword(passwordForm.new_password).errors[0]}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-medium text-[#85A8C3] mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm(prev => ({
                    ...prev,
                    confirm_password: e.target.value
                  }))}
                  className="pr-12 bg-[#0A1016] border-[#23353E] text-[#E4EEF5] focus:border-[#4EC1FF]"
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#85A8C3] hover:text-[#4EC1FF] transition-colors"
                >
                  {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {passwordForm.confirm_password && passwordForm.new_password && (
                <div className="mt-2">
                  <div className={`text-sm ${
                    passwordForm.new_password === passwordForm.confirm_password 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {passwordForm.new_password === passwordForm.confirm_password 
                      ? 'Passwords match' 
                      : 'Passwords do not match'
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={changingPassword || !passwordForm.old_password || !passwordForm.new_password || !passwordForm.confirm_password}
                className="bg-[#4EC1FF] hover:bg-[#3AB3FF] text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {changingPassword ? 'Changing Password...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
