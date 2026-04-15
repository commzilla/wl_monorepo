import React, { useState, useEffect, useRef } from 'react';
import { BarChart, TrendingUp, Target, Zap, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TradingStatsOverview from "../components/myStats/TradingStatsOverview";
import SimpleStatsFallback from "../components/myStats/SimpleStatsFallback";
import ErrorBoundary from "../components/myStats/ErrorBoundary";
import DailyTradingSummary from "../components/myStats/DailyTradingSummary";
import OpenHoldingsTable from "../components/myStats/OpenHoldingsTable";
import TradeHistoryTable from "../components/myStats/TradeHistoryTable";
import { AccountSelector } from "../components/myStats/AccountSelector";

import { fetchMyStats } from '@/utils/api';
import { getBrowserInfo } from '@/utils/browserCompat';
import { Button } from '@/components/ui/button';


export const MyStatsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout>();
  const browserInfo = getBrowserInfo();
  const isMacChrome = (browserInfo.isChrome || browserInfo.isBrave) && browserInfo.isMacOS;

  // Optimized query for better performance
  const { data: myStatsResponse, isLoading: isLoadingStats, error } = useQuery({
    queryKey: ['myStats', selectedEnrollment?.enrollment_id],
    queryFn: () => fetchMyStats(1, 100, selectedEnrollment?.enrollment_id),
    enabled: true,
    staleTime: 30000, // 30 seconds stale time
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Initialize enrollment with timeout to prevent race conditions
  useEffect(() => {
    if (myStatsResponse?.results?.selected_enrollment && !isInitialized) {
      // Clear any existing timeout
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }

      // Use timeout to ensure stable initialization
      initializationTimeoutRef.current = setTimeout(() => {
        setSelectedEnrollment(myStatsResponse.results.selected_enrollment);
        setIsInitialized(true);
      }, 50);
    }
  }, [myStatsResponse?.results?.selected_enrollment, isInitialized]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, []);

  const handleEnrollmentChange = (enrollment: any) => {
    setSelectedEnrollment(enrollment);
  };

  // Removed performance-heavy DOM manipulation

  return (
    <main
        className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-0 flex-col overflow-hidden grow bg-[#080808] w-full pt-10 pb-24 md:pb-40 rounded-[16px_0px_0px_0px] border-t border-solid md:border-l"
        style={{
          willChange: 'scroll-position',
          transform: 'translateZ(0)',
        }}
      >
        <header className="flex w-full items-center justify-between flex-wrap max-md:max-w-full px-4 md:px-8">
          <div className="self-stretch flex min-w-60 items-center gap-2 text-[32px] text-[#E4EEF5] font-medium whitespace-nowrap tracking-[-0.96px] flex-wrap flex-1 shrink basis-7 my-auto max-md:max-w-full">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg  bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
              <BarChart className="w-6 h-6 text-[#28BFFF]" />
            </div>
            <h1 className="text-[#E4EEF5] self-stretch my-auto">
              {t('myStats.title')}
            </h1>
          </div>
          {selectedEnrollment && myStatsResponse?.results?.available_enrollments && (
            <AccountSelector
              selectedEnrollment={selectedEnrollment}
              availableEnrollments={myStatsResponse.results.available_enrollments}
              onEnrollmentChange={handleEnrollmentChange}
            />
          )}
        </header>
        
        {/* Show loading state, error state, or no challenges state */}
        {isLoadingStats ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center text-[#85A8C3]">
              <div className="animate-pulse">{t('common.loading')}</div>
            </div>
          </div>
        ) : error || !selectedEnrollment || !myStatsResponse?.results ? (
          <div className="flex items-center justify-center min-h-[500px] px-4 md:px-8">
            <div className="relative max-w-2xl w-full">
              {/* Decorative gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#28BFFF]/10 via-transparent to-[#4EC1FF]/5 rounded-3xl blur-3xl" />
              
              {/* Main content card */}
              <div className="relative backdrop-blur-xl bg-[#0A1114]/40 border border-[#23353E]/50 rounded-2xl p-8 md:p-12 shadow-2xl shadow-black/20 animate-fade-in">
                {/* Icon container with pulse animation */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#28BFFF]/20 rounded-2xl blur-xl animate-pulse" />
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#28BFFF]/20 to-[#4EC1FF]/10 border border-[#28BFFF]/30 shadow-[inset_0_-8px_32px_rgba(78,193,255,0.15)]">
                      <BarChart className="w-10 h-10 text-[#28BFFF]" />
                    </div>
                  </div>
                </div>

                {/* Heading */}
                <h2 className="text-2xl md:text-3xl font-bold text-[#E4EEF5] text-center mb-3">
                  {t('myStats.noAccountsAvailable')}
                </h2>
                
                {/* Description */}
                <p className="text-[#85A8C3] text-center mb-8 text-base md:text-lg leading-relaxed">
                  {t('dashboard.noChallengesDescription')}
                </p>

                {/* Features grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="flex flex-col items-center text-center p-4 rounded-xl bg-[#0A1114]/60 border border-[#23353E]/30 hover:border-[#28BFFF]/30 transition-all duration-300 hover-scale">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#28BFFF]/10 mb-3">
                      <TrendingUp className="w-6 h-6 text-[#28BFFF]" />
                    </div>
                    <h3 className="text-sm font-semibold text-[#E4EEF5] mb-1">Track Performance</h3>
                    <p className="text-xs text-[#85A8C3]">Real-time analytics and insights</p>
                  </div>
                  
                  <div className="flex flex-col items-center text-center p-4 rounded-xl bg-[#0A1114]/60 border border-[#23353E]/30 hover:border-[#28BFFF]/30 transition-all duration-300 hover-scale">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#28BFFF]/10 mb-3">
                      <Target className="w-6 h-6 text-[#28BFFF]" />
                    </div>
                    <h3 className="text-sm font-semibold text-[#E4EEF5] mb-1">Achieve Goals</h3>
                    <p className="text-xs text-[#85A8C3]">Meet targets and get funded</p>
                  </div>
                  
                  <div className="flex flex-col items-center text-center p-4 rounded-xl bg-[#0A1114]/60 border border-[#23353E]/30 hover:border-[#28BFFF]/30 transition-all duration-300 hover-scale">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#28BFFF]/10 mb-3">
                      <Zap className="w-6 h-6 text-[#28BFFF]" />
                    </div>
                    <h3 className="text-sm font-semibold text-[#E4EEF5] mb-1">Grow Fast</h3>
                    <p className="text-xs text-[#85A8C3]">Scale your trading career</p>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={() => window.open('https://we-fund.com/#objectives', '_blank')}
                    className="group relative px-8 py-6 text-base font-semibold bg-gradient-to-r from-[#28BFFF] to-[#4EC1FF] hover:from-[#4EC1FF] hover:to-[#28BFFF] text-white rounded-xl shadow-lg shadow-[#28BFFF]/25 hover:shadow-xl hover:shadow-[#28BFFF]/40 transition-all duration-300 hover-scale"
                  >
                    <span className="flex items-center gap-2">
                      Start Your First Challenge
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <section className="mt-12 max-md:max-w-full max-md:mt-10 px-4 md:px-8">
              <ErrorBoundary selectedEnrollment={selectedEnrollment}>
                <TradingStatsOverview 
                  key={`stats-${selectedEnrollment?.enrollment_id}`}
                  selectedEnrollment={selectedEnrollment} 
                />
              </ErrorBoundary>
            </section>
            <section className="mt-6 max-md:max-w-full max-md:mt-3 px-4 md:px-8">
              <DailyTradingSummary 
                key={`daily-${selectedEnrollment?.enrollment_id}`}
                selectedEnrollment={selectedEnrollment} 
              />
            </section>
            <section className="mt-6 max-md:max-w-full max-md:mt-3 px-4 md:px-8">
              <OpenHoldingsTable 
                key={`holdings-${selectedEnrollment?.account_id}`}
                selectedEnrollment={selectedEnrollment} 
              />
            </section>
            <section className="mt-6 max-md:max-w-full max-md:mt-3 px-4 md:px-8">
              <TradeHistoryTable 
                key={`history-${selectedEnrollment?.enrollment_id}`}
                selectedEnrollment={selectedEnrollment} 
              />
            </section>
          </>
        )}
    </main>
  );
};


