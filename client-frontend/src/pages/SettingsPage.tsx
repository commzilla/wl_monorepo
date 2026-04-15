import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProfileTab } from '@/components/settings/ProfileTab';
import { PrivacyTab } from '@/components/settings/PrivacyTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { PaymentMethodTab } from '@/components/settings/PaymentMethodTab';
import { Settings, User, Shield, Bell, CreditCard } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const tabs = [
    {
      id: 'profile',
      label: t('settings.profile'),
      icon: User,
      component: ProfileTab
    },
    {
      id: 'privacy',
      label: t('settings.privacy'),
      icon: Shield,
      component: PrivacyTab
    },
    {
      id: 'notifications',
      label: t('settings.notifications'),
      icon: Bell,
      component: NotificationsTab
    },
    {
      id: 'payment',
      label: t('settings.paymentMethod'),
      icon: CreditCard,
      component: PaymentMethodTab
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ProfileTab;

  return (
    <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-[305px] rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:pb-[100px] max-md:px-5">
        <header className="flex w-full items-center justify-between flex-wrap max-md:max-w-full">
          <div className="self-stretch flex min-w-60 items-center gap-2 text-[32px] text-[#E4EEF5] font-medium whitespace-nowrap tracking-[-0.96px] flex-wrap flex-1 shrink basis-7 my-auto max-md:max-w-full">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#1A2633] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset]">
              <Settings 
                size={29}
                color="#4EC1FF"
              />
            </div>
            <h1 className="text-[#E4EEF5] self-stretch my-auto">
              {t('settings.title')}
            </h1>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex flex-col mt-10">
          <nav className="flex gap-4 mb-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-base transition-colors ${activeTab === tab.id ? 'bg-[#1A2633] text-[#4EC1FF]' : 'bg-transparent text-[#85A8C3] hover:bg-[#1A2633]'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="bg-[#101A1F] rounded-xl p-8">
            <ActiveComponent />
          </div>
        </div>
    </main>
  );
};

export default SettingsPage;
