import React from 'react';
import { useTranslation } from 'react-i18next';

const SimpleStatsFallback: React.FC<{ selectedEnrollment?: any }> = ({ selectedEnrollment }) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-8 p-6 rounded-2xl border border-[rgba(40,191,255,0.05)] bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)]">
      <div className="text-center text-[#85A8C3]">
        <div className="text-lg font-medium mb-4">{t('myStatsComponents.tradingStats')}</div>
        <div className="text-sm">
          {t('myStatsComponents.enrollment')}: {selectedEnrollment?.enrollment_id || 'None'}
        </div>
        <div className="text-sm mt-2">
          {t('myStatsComponents.account')}: {selectedEnrollment?.account_id || 'None'}
        </div>
        <div className="text-xs mt-4 text-yellow-400">
          {t('myStatsComponents.fallbackMessage')}
        </div>
      </div>
    </div>
  );
};

export default SimpleStatsFallback;
