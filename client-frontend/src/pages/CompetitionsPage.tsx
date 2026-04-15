import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Sparkles, Users, Target, Medal, Zap, Crown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/utils/api';

const CompetitionsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  
  const checkCompetitionsAccess = async () => {
    try {
      console.log('Checking Competitions access...');
      
      const response = await authenticatedFetch(
        'https://api.we-fund.com/client/competitions/access/',
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
        // Redirect to full Competitions page
        navigate('/competitions-full');
      } else {
        // Stay on beta page for all other statuses
        setIsCheckingAccess(false);
      }
    } catch (error) {
      console.error('Error checking Competitions access:', error);
      setIsCheckingAccess(false);
    }
  };

  useEffect(() => {
    checkCompetitionsAccess();
  }, []);

  const handleRequestAccess = async () => {
    setIsRequesting(true);
    try {
      console.log('Requesting Competitions access...');
      
      const response = await authenticatedFetch(
        'https://api.we-fund.com/client/competitions/access/',
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
        navigate('/competitions-full');
      } else if (status === 'requested') {
        toast.info('Your Competitions Beta request is pending approval');
      } else if (status === 'declined' || status === 'revoked') {
        toast.error('Your Competitions Beta access is not approved');
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
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[rgba(58,179,255,0.1)] border border-[rgba(58,179,255,0.3)] flex items-center justify-center animate-pulse">
                <Trophy className="w-8 h-8 text-[#3AB3FF]" />
              </div>
              <div className="text-xl text-[#85A8C3]">Checking access...</div>
            </div>
          </div>
        </main>
    );
  }

  return (
      <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(58,179,255,0.05))] border-l-[color:var(--border-cards-border,rgba(58,179,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-0 flex-col overflow-hidden grow bg-[#080808] w-full rounded-[16px_0px_0px_0px] border-t border-solid md:border-l relative">
        {/* Background Gradient Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-[#3AB3FF] opacity-[0.04] blur-[150px] rounded-full" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#FFD700] opacity-[0.03] blur-[120px] rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#3AB3FF] opacity-[0.02] blur-[100px] rounded-full" />
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 opacity-10 hidden lg:block">
          <Crown className="w-32 h-32 text-[#FFD700]" />
        </div>
        <div className="absolute bottom-20 left-20 opacity-10 hidden lg:block">
          <Medal className="w-24 h-24 text-[#3AB3FF]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-full px-4 py-16 md:py-24">
          {/* Trophy Icon */}
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-[#3AB3FF] opacity-30 blur-3xl rounded-full animate-pulse" />
            <div className="absolute inset-[-8px] bg-gradient-to-br from-[#FFD700]/20 to-[#3AB3FF]/20 rounded-3xl blur-xl" />
            <div className="relative flex items-center justify-center w-28 h-28 rounded-2xl bg-gradient-to-br from-[rgba(58,179,255,0.15)] to-[rgba(255,215,0,0.1)] border border-[rgba(58,179,255,0.4)] shadow-[0_0_60px_rgba(58,179,255,0.3),inset_0_0_30px_rgba(58,179,255,0.1)]">
              <Trophy className="w-14 h-14 text-[#3AB3FF]" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#E4EEF5] mb-4 text-center tracking-tight">
            <span className="bg-gradient-to-r from-[#3AB3FF] via-[#E4EEF5] to-[#FFD700] bg-clip-text text-transparent">
              Competitions
            </span>
          </h1>

          {/* Beta Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[rgba(58,179,255,0.15)] to-[rgba(255,215,0,0.1)] border border-[rgba(58,179,255,0.4)] mb-6 shadow-[0_0_20px_rgba(58,179,255,0.2)]">
            <Sparkles className="w-4 h-4 text-[#FFD700]" />
            <span className="text-sm font-semibold text-[#3AB3FF] tracking-wide uppercase">Beta Access</span>
            <Sparkles className="w-4 h-4 text-[#FFD700]" />
          </div>

          {/* Description */}
          <p className="text-lg md:text-xl text-[#85A8C3] text-center max-w-2xl mb-12 leading-relaxed">
            Compete with traders worldwide in exciting trading competitions. Showcase your skills, 
            climb the leaderboards, and win amazing prizes!
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14 max-w-5xl w-full">
            <div className="group flex flex-col items-center text-center p-6 rounded-2xl bg-gradient-to-b from-[rgba(58,179,255,0.08)] to-[rgba(58,179,255,0.02)] border border-[rgba(58,179,255,0.15)] backdrop-blur-sm hover:border-[rgba(58,179,255,0.4)] hover:shadow-[0_0_30px_rgba(58,179,255,0.15)] transition-all duration-500">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[rgba(58,179,255,0.2)] to-[rgba(58,179,255,0.05)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-[rgba(58,179,255,0.2)]">
                <Users className="w-7 h-7 text-[#3AB3FF]" />
              </div>
              <h3 className="text-[#E4EEF5] font-semibold mb-2 text-lg">Global Traders</h3>
              <p className="text-[#85A8C3] text-sm leading-relaxed">Compete against traders from around the world</p>
            </div>

            <div className="group flex flex-col items-center text-center p-6 rounded-2xl bg-gradient-to-b from-[rgba(255,215,0,0.08)] to-[rgba(255,215,0,0.02)] border border-[rgba(255,215,0,0.15)] backdrop-blur-sm hover:border-[rgba(255,215,0,0.4)] hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] transition-all duration-500">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[rgba(255,215,0,0.2)] to-[rgba(255,215,0,0.05)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-[rgba(255,215,0,0.2)]">
                <Medal className="w-7 h-7 text-[#FFD700]" />
              </div>
              <h3 className="text-[#E4EEF5] font-semibold mb-2 text-lg">Win Prizes</h3>
              <p className="text-[#85A8C3] text-sm leading-relaxed">Earn exciting rewards and recognition</p>
            </div>

            <div className="group flex flex-col items-center text-center p-6 rounded-2xl bg-gradient-to-b from-[rgba(58,179,255,0.08)] to-[rgba(58,179,255,0.02)] border border-[rgba(58,179,255,0.15)] backdrop-blur-sm hover:border-[rgba(58,179,255,0.4)] hover:shadow-[0_0_30px_rgba(58,179,255,0.15)] transition-all duration-500">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[rgba(58,179,255,0.2)] to-[rgba(58,179,255,0.05)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-[rgba(58,179,255,0.2)]">
                <TrendingUp className="w-7 h-7 text-[#3AB3FF]" />
              </div>
              <h3 className="text-[#E4EEF5] font-semibold mb-2 text-lg">Live Leaderboards</h3>
              <p className="text-[#85A8C3] text-sm leading-relaxed">Track your ranking in real-time</p>
            </div>

            <div className="group flex flex-col items-center text-center p-6 rounded-2xl bg-gradient-to-b from-[rgba(255,215,0,0.08)] to-[rgba(255,215,0,0.02)] border border-[rgba(255,215,0,0.15)] backdrop-blur-sm hover:border-[rgba(255,215,0,0.4)] hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] transition-all duration-500">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[rgba(255,215,0,0.2)] to-[rgba(255,215,0,0.05)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-[rgba(255,215,0,0.2)]">
                <Zap className="w-7 h-7 text-[#FFD700]" />
              </div>
              <h3 className="text-[#E4EEF5] font-semibold mb-2 text-lg">Prove Your Skills</h3>
              <p className="text-[#85A8C3] text-sm leading-relaxed">Demonstrate your trading expertise</p>
            </div>
          </div>

          {/* Stats Preview */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#3AB3FF] mb-1">$100K+</div>
              <div className="text-sm text-[#85A8C3]">Prize Pool</div>
            </div>
            <div className="w-px h-16 bg-[rgba(255,255,255,0.1)] hidden sm:block" />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#FFD700] mb-1">500+</div>
              <div className="text-sm text-[#85A8C3]">Participants</div>
            </div>
            <div className="w-px h-16 bg-[rgba(255,255,255,0.1)] hidden sm:block" />
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#3AB3FF] mb-1">24/7</div>
              <div className="text-sm text-[#85A8C3]">Live Tracking</div>
            </div>
          </div>

          {/* Request Access Button */}
          <div className="w-full max-w-md flex flex-col items-center gap-4">
            <Button
              onClick={handleRequestAccess}
              disabled={isRequesting}
              className="h-14 w-full bg-gradient-to-r from-[#3AB3FF] to-[#2A9FE8] hover:from-[#2A9FE8] hover:to-[#1E8DD0] text-white font-semibold text-lg shadow-[0_0_30px_rgba(58,179,255,0.4)] hover:shadow-[0_0_40px_rgba(58,179,255,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl border border-[rgba(255,255,255,0.2)]"
            >
              {isRequesting ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Joining Waitlist...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Join Beta Waitlist
                </span>
              )}
            </Button>

            <p className="text-sm text-[#85A8C3] text-center max-w-sm">
              Be among the first to access our trading competitions. Limited spots available!
            </p>
          </div>

          {/* Bottom decoration */}
          <div className="mt-16 flex items-center gap-3 text-[#85A8C3]/50 text-sm">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#3AB3FF]/30" />
            <span>Coming Soon</span>
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#3AB3FF]/30" />
          </div>
        </div>
      </main>
  );
};

export default CompetitionsPage;
