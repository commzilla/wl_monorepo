import React, { useState } from 'react';
import { FaUsers } from "react-icons/fa";
import { CircleAlert } from 'lucide-react';

export const AffiliateLoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login attempt:', { username, password, rememberMe });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)] mx-auto mb-4">
            <FaUsers className="w-8 h-8 text-[#28BFFF]" />
          </div>
          <h1 className="text-3xl font-semibold text-[#E4EEF5] mb-2">
            Affiliate Login
          </h1>
          <p className="text-[#85A8C3] text-sm">
            Access your affiliate dashboard
          </p>
        </div>

        {/* Alert Message */}
        <div className="bg-[#0A1114] flex w-full gap-4 flex-wrap px-6 py-4 rounded-lg mb-8">
          <span><CircleAlert className='text-[#00A5E4]' /></span>
          <p className="text-sm font-normal tracking-[-0.42px] bg-clip-text flex-1 shrink basis-[0%] text-[#00A5E4]">
            The affiliate area is only available for registered affiliates
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-[#0A1114] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#85A8C3] mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none block w-full px-4 py-3 border border-[#23353E] rounded-lg bg-[#0A1016] text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#3AB3FF] focus:border-transparent"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#85A8C3] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="appearance-none block w-full px-4 py-3 border border-[#23353E] rounded-lg bg-[#0A1016] text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#3AB3FF] focus:border-transparent pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
              
              <div className="mt-4 flex items-center justify-between">
                <label className="flex items-center text-sm text-[#85A8C3]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="form-checkbox h-4 w-4 text-[#00A5E4] bg-[#0A1114] border-[#23353E] rounded focus:ring-[#3AB3FF] transition-all"
                  />
                  <span className="ml-2">Remember me</span>
                </label>
                <a href="#" className="text-sm font-medium text-[#00A5E4] hover:text-white">
                  Lost your password?
                </a>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-[#E4EEF5] bg-[color:var(--border-primary-color,#3AB3FF)] shadow-[0px_3px_1px_0px_rgba(255,255,255,0.35)_inset] hover:bg-[rgba(58,179,255,0.1)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00A5E4] transition-colors"
            >
              Log In
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#85A8C3]">
              Don't you have an account?{' '}
              <a href="#" className="font-medium text-[#00A5E4] hover:text-white">
                Become an Affiliate
              </a>
            </p>
          </div>
        </div>

        {/* Back to main site link */}
        <div className="mt-8 text-center">
          <a 
            href="/" 
            className="text-sm text-[#85A8C3] hover:text-[#00A5E4] transition-colors"
          >
            ← Back to main site
          </a>
        </div>
      </div>
    </div>
  );
}; 