import React from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/shared/LanguageSelector';

interface LoginHeaderProps {
  className?: string;
}

export const LoginHeader: React.FC<LoginHeaderProps> = ({ className = "" }) => {
  const { t } = useTranslation();

  return (
    <header className={`w-full ${className}`}>
      <nav className="flex items-center justify-between w-full px-4 py-4 md:px-28 md:py-6">

        {/* Navigation Menu */}
        <div className="flex items-center gap-4 md:gap-8 text-sm text-[#B9BBC1]">
          <img
            src="/LogoWithName.svg"
            alt="Wefund Logo"
            className="h-6 md:h-8"
          />
          <div className="hidden md:flex items-center gap-8">
            <a href="https://we-fund.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              {t('header.howItWorks')}
            </a>
            <a href="https://we-fund.com/features/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              {t('header.features')}
            </a>
            <a href="https://we-fund.com/affiliates/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              {t('header.affiliates')}
            </a>
            <a href="https://we-fund.com/support/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              {t('header.support')}
            </a>
            <a href="https://support.we-fund.com/en/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              {t('header.faq')}
            </a>
          </div>
        </div>

        {/* Language Selector */}
        <LanguageSelector />

      </nav>
    </header>
  );
};
