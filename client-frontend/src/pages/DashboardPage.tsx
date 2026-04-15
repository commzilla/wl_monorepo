
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Achievements from "../components/dashboard/Achievements";
import ChallengeMetrics from "../components/dashboard/ChallengeMetrics";
import TopTradersLeaderboard from "../components/dashboard/TopTradersLeaderboard";
import { FirstLoginModal } from '@/components/auth/FirstLoginModal';
import { fetchDashboardData, fetchClientInit } from '../utils/api';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const [clientInitData, setClientInitData] = useState<any>(null);


  // Fetch client init data to check for first login
  const { data: initData, isLoading: initLoading } = useQuery({
    queryKey: ['clientInit'],
    queryFn: fetchClientInit,
    staleTime: 0, // Always check for first login
  });
  

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],                                                                                
    queryFn: fetchDashboardData,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Check if first login modal should be shown
  useEffect(() => {
    if (initData && initData.is_first_login) {
      setClientInitData(initData);
      setShowFirstLoginModal(true);
    }
  }, [initData]);

  const handleFirstLoginComplete = () => {
    setShowFirstLoginModal(false);
    // Refetch init data to update the first login status
    refetch();
  };

  if (initLoading || isLoading) {
    return (
        <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(58,179,255,0.05))] border-l-[color:var(--border-cards-border,rgba(58,179,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-4 md:px-8 pt-6 md:pt-10 pb-8 md:pb-12 rounded-[16px_0px_0px_0px] border-t border-solid border-l">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-[#3AB3FF]" />
          </div>
        </main>
    );
  }

  if (error) {
    return (
        <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(58,179,255,0.05))] border-l-[color:var(--border-cards-border,rgba(58,179,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-4 md:px-8 pt-6 md:pt-10 pb-8 md:pb-12 rounded-[16px_0px_0px_0px] border-t border-solid border-l">
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <p className="text-[#E4EEF5] text-base md:text-lg mb-4">{t('common.error')}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-[#3AB3FF] text-white rounded-lg hover:bg-[#3AB3FF]/80 transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        </main>
    );
  }

  return (
    <>
      <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(58,179,255,0.05))] border-l-[color:var(--border-cards-border,rgba(58,179,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-4 md:px-8 pt-6 md:pt-10 pb-8 md:pb-12 rounded-[16px_0px_0px_0px] border-t border-solid border-l">
        <header className="flex w-full items-center justify-between flex-wrap">
          <div className="flex items-center gap-2 text-2xl md:text-[32px] text-[#E4EEF5] font-medium tracking-[-0.96px] flex-1">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/ec69efe1121255ccdeab2aa11a34567e858bd2a6?placeholderIfAbsent=true"
              alt="Dashboard"
              className="w-8 h-8 md:w-12 md:h-12 object-contain shadow-[0px_-8px_32px_0px_rgba(58,179,255,0.06)_inset]"
            />
            <h1 className="text-[#E4EEF5]">{t('dashboard.title')}</h1>
          </div>
        </header>
        <section className="mt-6 md:mt-12">
          <Achievements data={dashboardData?.achievements} />
        </section>
        <section className="mt-4 md:mt-6">
          <ChallengeMetrics 
            challengeData={dashboardData?.active_challenges}
          />
        </section>
        <section className="mt-4 md:mt-6">
          <TopTradersLeaderboard 
            currentUserId="5"
          />
        </section>
      </main>

      {/* First Login Modal */}
      {showFirstLoginModal && clientInitData && (
        <FirstLoginModal
          isOpen={showFirstLoginModal}
          initialFirstName={clientInitData.first_name || ''}
          initialLastName={clientInitData.last_name || ''}
          onComplete={handleFirstLoginComplete}
        />
      )}
    </>
  );
}
