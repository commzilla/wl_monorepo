import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import EconomicCalender from '@/components/economicCalender/EconomicCalender'

export const EconomicCalenderPage: React.FC = () => {
  const { t } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-0 flex-col overflow-hidden grow bg-[#080808] w-full pt-10 pb-24 md:pb-40 rounded-[16px_0px_0px_0px] border-t border-solid md:border-l">
        <header className="flex w-full items-center justify-between flex-wrap max-md:max-w-full px-4 md:px-8">
          <div className="self-stretch flex min-w-60 items-center gap-2 text-[32px] text-[#E4EEF5] font-medium whitespace-nowrap tracking-[-0.96px] flex-wrap flex-1 shrink basis-7 my-auto max-md:max-w-full">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#1A2633] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset]">
              <CalendarDays
                size={29}
                color="#4EC1FF"
              />
            </div>
            <h1 className="text-[#E4EEF5] self-stretch my-auto">
              {t('economicCalendar.title')}
            </h1>
          </div>
        </header>
        <section className="mt-10 px-4 md:px-8">
          <EconomicCalender />
        </section>
      </main>
  );
};
