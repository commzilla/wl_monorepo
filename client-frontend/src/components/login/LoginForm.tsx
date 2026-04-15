import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormProps {
  onSubmit?: (username: string, password: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { isLoading } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(username, password);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="bg-[#0A1114] rounded-2xl p-4 md:p-8 w-full max-w-md mx-auto">
      <h1 className="text-2xl font-medium text-white text-center mb-8">{t('auth.welcomeBack')}</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-[#85A8C3] mb-1">
            {t('auth.username')}
          </label>
          <div className="mt-1">
            <input
              id="username"
              name="username"
              type="text"
              required
              disabled={isLoading}
              className="appearance-none block w-full px-4 py-3 border border-[#23353E] rounded-lg bg-[#0A1016] text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#3AB3FF] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-[#85A8C3] mb-1">
              {t('auth.password')}
            </label>
          </div>
          <div className="mt-1 relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              disabled={isLoading}
              className="appearance-none block w-full px-4 py-3 border border-[#23353E] rounded-lg bg-[#0A1016] text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#3AB3FF] focus:border-transparent pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              disabled={isLoading}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white disabled:opacity-50"
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-[#00A5E4] hover:text-white">
              {t('auth.forgotPassword')}
            </Link>
          </div>
        </div>

        <div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-[#E4EEF5] bg-[color:var(--border-primary-color,#3AB3FF)] shadow-[0px_3px_1px_0px_rgba(255,255,255,0.35)_inset] hover:bg-[rgba(58,179,255,0.1)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00A5E4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('auth.loggingIn') : t('auth.signIn')}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-[#85A8C3]">
          {t('auth.dontHaveAccount')}{' '}
          <Link to="/register" className="text-[#00A5E4] hover:text-white font-medium">
            {t('auth.signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
};
