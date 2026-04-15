import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Sparkles, Gift, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/utils/api';

const WeCoinsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  
  const checkWeCoinsAccess = async () => {
    try {
      console.log('Checking WeCoins access...');
      
      const response = await authenticatedFetch(
        'https://api.we-fund.com/client/wecoins/access/',
        {
          method: 'POST',
        }
      );

      console.log('API response status:', response.status);

      if (!response.ok) {
        console.error('API returned error status:', response.status);
        setIsCheckingAccess(false);
        return;
      }

      const data = await response.json();
      console.log('API response data:', data);

      const status = data?.status;
      console.log('Access status:', status);

      if (status === 'approved' || status === 'released') {
        // Redirect to full WeCoins page
        navigate('/wecoins-full');
      } else {
        // Stay on beta page for all other statuses
        setIsCheckingAccess(false);
      }
    } catch (error) {
      console.error('Error checking WeCoins access:', error);
      setIsCheckingAccess(false);
    }
  };

  useEffect(() => {
    checkWeCoinsAccess();
  }, []);

  const handleRequestAccess = async () => {
    setIsRequesting(true);
    try {
      console.log('Requesting WeCoins access...');
      
      const response = await authenticatedFetch(
        'https://api.we-fund.com/client/wecoins/access/',
        {
          method: 'POST',
        }
      );

      console.log('Request response status:', response.status);

      const data = await response.json();
      console.log('Request response data:', data);

      const status = data?.status;

      if (status === 'approved' || status === 'released') {
        toast.success('Access granted! Redirecting...');
        navigate('/wecoins-full');
      } else if (status === 'requested') {
        toast.info('Your WeCoins Beta request is pending approval');
      } else if (status === 'declined' || status === 'revoked') {
        toast.error('Your WeCoins Beta access is not approved');
      } else {
        toast.success('Successfully requested access! We\'ll review your request and notify you.');
      }
    } catch (error) {
      console.error('Error requesting access:', error);
      toast.error(`Failed to request access: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRequesting(false);
    }
  };

  if (isCheckingAccess) {
    return (
        <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-0 flex-col overflow-hidden grow bg-[#080808] w-full rounded-[16px_0px_0px_0px] border-t border-solid md:border-l relative">
          <div className="relative z-10 flex flex-col items-center justify-center min-h-full px-4">
            <div className="text-xl text-[#85A8C3]">{t('wecoins.checkingAccess')}</div>
          </div>
        </main>
    );
  }

  return (
      <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-0 flex-col overflow-hidden grow bg-[#080808] w-full rounded-[16px_0px_0px_0px] border-t border-solid md:border-l relative">
        {/* Background Gradient Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#28BFFF] opacity-[0.03] blur-[120px] rounded-full" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#28BFFF] opacity-[0.02] blur-[100px] rounded-full" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-full px-4 py-16 md:py-24">
          {/* Logo/Icon */}
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-[#28BFFF] opacity-20 blur-3xl rounded-full animate-pulse" />
            <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-[rgba(40,191,255,0.1)] border border-[rgba(40,191,255,0.3)] shadow-[0_0_40px_rgba(40,191,255,0.2)]">
              <Coins className="w-12 h-12 text-[#28BFFF]" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold text-[#E4EEF5] mb-4 text-center tracking-tight">
            {t('wecoins.title')}
          </h1>

          {/* Beta Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(40,191,255,0.1)] border border-[rgba(40,191,255,0.3)] mb-6">
            <Sparkles className="w-4 h-4 text-[#28BFFF]" />
            <span className="text-sm font-medium text-[#28BFFF] tracking-wide">{t('wecoins.beta')}</span>
          </div>

          {/* Description */}
          <p className="text-lg md:text-xl text-[#85A8C3] text-center max-w-2xl mb-12 leading-relaxed">
            {t('wecoins.description')}
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl w-full">
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-[rgba(40,191,255,0.03)] border border-[rgba(40,191,255,0.1)] backdrop-blur-sm">
              <div className="w-12 h-12 rounded-lg bg-[rgba(40,191,255,0.1)] flex items-center justify-center mb-4">
                <Gift className="w-6 h-6 text-[#28BFFF]" />
              </div>
              <h3 className="text-[#E4EEF5] font-semibold mb-2">Earn Rewards</h3>
              <p className="text-[#85A8C3] text-sm">Complete tasks and earn WeCoins that you can redeem for prizes</p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-[rgba(40,191,255,0.03)] border border-[rgba(40,191,255,0.1)] backdrop-blur-sm">
              <div className="w-12 h-12 rounded-lg bg-[rgba(40,191,255,0.1)] flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-[#28BFFF]" />
              </div>
              <h3 className="text-[#E4EEF5] font-semibold mb-2">Track Progress</h3>
              <p className="text-[#85A8C3] text-sm">Monitor your earnings and see your impact on the community</p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-[rgba(40,191,255,0.03)] border border-[rgba(40,191,255,0.1)] backdrop-blur-sm">
              <div className="w-12 h-12 rounded-lg bg-[rgba(40,191,255,0.1)] flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-[#28BFFF]" />
              </div>
              <h3 className="text-[#E4EEF5] font-semibold mb-2">Exclusive Access</h3>
              <p className="text-[#85A8C3] text-sm">Get early access to new features and special promotions</p>
            </div>
          </div>

          {/* Request Access Button */}
          <div className="w-full max-w-md flex flex-col items-center gap-4">
            <Button
              onClick={handleRequestAccess}
              disabled={isRequesting}
              className="h-12 w-full bg-[#28BFFF] hover:bg-[#1EA5E6] text-[#0A0A0A] font-semibold text-base shadow-[0_0_20px_rgba(40,191,255,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRequesting ? 'Joining Waitlist...' : 'Join Waitlist'}
            </Button>

            <p className="text-xs text-[#85A8C3] text-center">
              Be the first to experience WeCoins when we launch. No spam, ever.
            </p>
          </div>
        </div>
      </main>
  );
};

export default WeCoinsPage;
