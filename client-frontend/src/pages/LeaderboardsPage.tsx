import React, { useState } from 'react';
import { BarChartHorizontalBig } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import TopRankers from '@/components/leaderboards/TopRankers';
import TopTraders from '@/components/leaderboards/TopTraders';

export const LeaderboardsPage: React.FC = () => {
  const { t } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-0 flex-col overflow-hidden grow bg-[#080808] w-full pt-10 pb-24 md:pb-40 rounded-[16px_0px_0px_0px] border-t border-solid md:border-l">
        <header className="flex w-full items-center justify-between flex-wrap max-md:max-w-full mb-5 px-4 md:px-8">
          <div className="self-stretch flex min-w-60 items-center gap-2 text-[32px] text-[#E4EEF5] font-medium whitespace-nowrap tracking-[-0.96px] flex-wrap flex-1 shrink basis-7 my-auto max-md:max-w-full">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
              <BarChartHorizontalBig className="w-6 h-6 text-[#28BFFF]" />
            </div>
            <h1 className="text-[#E4EEF5] self-stretch my-auto">
              {t('leaderboards.title')}
            </h1>
          </div>
        </header>
        <section className="mt-12 max-md:max-w-full max-md:mt-10 px-4 md:px-8">
          <TopRankers />
        </section>
        <section className="mt-12 max-md:max-w-full max-md:mt-10 px-4 md:px-8">
          <TopTraders />
        </section>
    </main>
  );
};
