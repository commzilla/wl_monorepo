import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, LayoutDashboard, List, Calendar, BarChart3, Sparkles, Film, ArrowRight, TrendingUp, Target, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AccountSelector } from '@/components/myStats/AccountSelector';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useJournalDashboard } from '@/hooks/useJournal';
import { Button } from '@/components/ui/button';
import { JournalShareButton } from '@/components/journal/JournalShareButton';

const JournalDashboard = React.lazy(() => import('@/components/journal/JournalDashboard'));
const JournalTradeLog = React.lazy(() => import('@/components/journal/JournalTradeLog'));
const JournalCalendar = React.lazy(() => import('@/components/journal/JournalCalendar'));
const AnalyticsDashboard = React.lazy(() => import('@/components/journal/AnalyticsDashboard'));
const AIInsightsPanel = React.lazy(() => import('@/components/journal/AIInsightsPanel'));
const TradeReplayPlayer = React.lazy(() => import('@/components/journal/TradeReplayPlayer'));

const JournalPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationTimeoutRef = useRef<NodeJS.Timeout>();

  const { data: dashboardData, isLoading, error } = useJournalDashboard(
    selectedEnrollment?.enrollment_id
  );

  // Initialize enrollment with timeout to prevent race conditions
  useEffect(() => {
    if (dashboardData?.selected_enrollment && !isInitialized) {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }

      initializationTimeoutRef.current = setTimeout(() => {
        setSelectedEnrollment(dashboardData.selected_enrollment);
        setIsInitialized(true);
      }, 50);
    }
  }, [dashboardData?.selected_enrollment, isInitialized]);

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
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
            <BookOpen className="w-6 h-6 text-[#3AB3FF]" />
          </div>
          <h1 className="text-[#E4EEF5] self-stretch my-auto">
            Trade Journal
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {selectedEnrollment && (
            <JournalShareButton enrollmentId={selectedEnrollment.enrollment_id} />
          )}
          {selectedEnrollment && dashboardData?.available_enrollments && (
            <AccountSelector
              selectedEnrollment={selectedEnrollment}
              availableEnrollments={dashboardData.available_enrollments}
              onEnrollmentChange={handleEnrollmentChange}
            />
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-[#85A8C3]">
            <div className="animate-pulse">{t('common.loading')}</div>
          </div>
        </div>
      ) : error || !selectedEnrollment || !dashboardData ? (
        <div className="flex items-center justify-center min-h-[500px] px-4 md:px-8">
          <div className="relative max-w-2xl w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-[#3AB3FF]/10 via-transparent to-[#4EC1FF]/5 rounded-3xl blur-3xl" />

            <div className="relative backdrop-blur-xl bg-[#0A1114]/40 border border-[#23353E]/50 rounded-2xl p-8 md:p-12 shadow-2xl shadow-black/20 animate-fade-in">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#3AB3FF]/20 rounded-2xl blur-xl animate-pulse" />
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#3AB3FF]/20 to-[#4EC1FF]/10 border border-[#3AB3FF]/30 shadow-[inset_0_-8px_32px_rgba(78,193,255,0.15)]">
                    <BookOpen className="w-10 h-10 text-[#3AB3FF]" />
                  </div>
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-[#E4EEF5] text-center mb-3">
                No Trading Accounts Available
              </h2>

              <p className="text-[#85A8C3] text-center mb-8 text-base md:text-lg leading-relaxed">
                Start a challenge to unlock your Trade Journal. Track every trade, analyze patterns, and improve your performance with AI-powered insights.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-[#0A1114]/60 border border-[#23353E]/30 hover:border-[#3AB3FF]/30 transition-all duration-300 hover-scale">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#3AB3FF]/10 mb-3">
                    <TrendingUp className="w-6 h-6 text-[#3AB3FF]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#E4EEF5] mb-1">Journal Your Trades</h3>
                  <p className="text-xs text-[#85A8C3]">Log entries, tag setups, and rate executions</p>
                </div>

                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-[#0A1114]/60 border border-[#23353E]/30 hover:border-[#3AB3FF]/30 transition-all duration-300 hover-scale">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#3AB3FF]/10 mb-3">
                    <Target className="w-6 h-6 text-[#3AB3FF]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#E4EEF5] mb-1">Spot Patterns</h3>
                  <p className="text-xs text-[#85A8C3]">Discover what works and what doesn't</p>
                </div>

                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-[#0A1114]/60 border border-[#23353E]/30 hover:border-[#3AB3FF]/30 transition-all duration-300 hover-scale">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#3AB3FF]/10 mb-3">
                    <Zap className="w-6 h-6 text-[#3AB3FF]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#E4EEF5] mb-1">AI Coaching</h3>
                  <p className="text-xs text-[#85A8C3]">Get personalized insights and tips</p>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={() => window.open('https://we-fund.com/#objectives', '_blank')}
                  className="group relative px-8 py-6 text-base font-semibold bg-gradient-to-r from-[#3AB3FF] to-[#4EC1FF] hover:from-[#4EC1FF] hover:to-[#3AB3FF] text-white rounded-xl shadow-lg shadow-[#3AB3FF]/25 hover:shadow-xl hover:shadow-[#3AB3FF]/40 transition-all duration-300 hover-scale"
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
        <section className="mt-8 px-4 md:px-8 w-full">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="bg-transparent border-b border-[#23353E]/50 rounded-none w-full justify-start gap-1 h-auto p-0 mb-6 overflow-x-auto no-scrollbar">
              <TabsTrigger
                value="dashboard"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#3AB3FF] data-[state=active]:text-[#E4EEF5] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#85A8C3] bg-transparent px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="trades"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#3AB3FF] data-[state=active]:text-[#E4EEF5] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#85A8C3] bg-transparent px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <List className="w-4 h-4" />
                Trades
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#3AB3FF] data-[state=active]:text-[#E4EEF5] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#85A8C3] bg-transparent px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#3AB3FF] data-[state=active]:text-[#E4EEF5] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#85A8C3] bg-transparent px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="ai-coach"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#3AB3FF] data-[state=active]:text-[#E4EEF5] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#85A8C3] bg-transparent px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                AI Coach
              </TabsTrigger>
              <TabsTrigger
                value="replay"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#3AB3FF] data-[state=active]:text-[#E4EEF5] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#85A8C3] bg-transparent px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Film className="w-4 h-4" />
                Replay
              </TabsTrigger>
            </TabsList>

            <React.Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[300px]">
                  <div className="text-center text-[#85A8C3]">
                    <div className="animate-pulse">{t('common.loading')}</div>
                  </div>
                </div>
              }
            >
              <TabsContent value="dashboard" className="w-full mt-0">
                <JournalDashboard enrollmentId={selectedEnrollment.enrollment_id} />
              </TabsContent>

              <TabsContent value="trades" className="w-full mt-0">
                <JournalTradeLog enrollmentId={selectedEnrollment.enrollment_id} />
              </TabsContent>

              <TabsContent value="calendar" className="w-full mt-0">
                <JournalCalendar enrollmentId={selectedEnrollment.enrollment_id} />
              </TabsContent>

              <TabsContent value="analytics" className="w-full mt-0">
                <AnalyticsDashboard enrollmentId={selectedEnrollment.enrollment_id} />
              </TabsContent>

              <TabsContent value="ai-coach" className="w-full mt-0">
                <AIInsightsPanel enrollmentId={selectedEnrollment.enrollment_id} />
              </TabsContent>

              <TabsContent value="replay" className="w-full mt-0">
                <TradeReplayPlayer enrollmentId={selectedEnrollment.enrollment_id} />
              </TabsContent>

            </React.Suspense>
          </Tabs>
        </section>
      )}
    </main>
  );
};

export default JournalPage;
