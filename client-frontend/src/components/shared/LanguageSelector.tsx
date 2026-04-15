import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage, LANGUAGES } from '@/contexts/LanguageContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as flags from 'country-flag-icons/react/3x2';

// Helper to get flag component by country code
const getFlagComponent = (countryCode: string) => {
  return (flags as any)[countryCode];
};

export const LanguageSelector: React.FC = () => {
  const { t } = useTranslation();
  const { currentLanguage, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (languageCode: string) => {
    setLanguage(languageCode);
    setIsOpen(false);
  };

  const CurrentFlag = getFlagComponent(currentLanguage.countryCode);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#3AB3FF]/10 border border-[#3AB3FF]/20 hover:bg-[#3AB3FF]/20 transition-colors"
          aria-label="Select language"
        >
          {CurrentFlag && <CurrentFlag className="w-5 h-4 rounded-sm" />}
          <Globe size={16} className="text-[#3AB3FF]" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0 bg-[#0A1114] border-[#3AB3FF]/20 shadow-[0px_8px_32px_0px_rgba(0,0,0,0.3)]"
        align="end"
        sideOffset={8}
      >
        <div className="px-3 py-2 border-b border-[#3AB3FF]/10">
          <p className="text-sm font-semibold text-[#E4EEF5]">{t('header.selectLanguage')}</p>
        </div>
        <ScrollArea className="h-[320px]">
          <div className="p-1">
            {LANGUAGES.map((language) => {
              const FlagComponent = getFlagComponent(language.countryCode);
              return (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    currentLanguage.code === language.code
                      ? 'bg-[#3AB3FF]/20 text-[#E4EEF5]'
                      : 'text-[#85A8C3] hover:bg-[#3AB3FF]/10 hover:text-[#E4EEF5]'
                  }`}
                >
                  {FlagComponent && <FlagComponent className="w-7 h-5 rounded-sm flex-shrink-0" />}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{language.name}</span>
                    <span className="text-xs opacity-70 truncate">{language.nativeName}</span>
                  </div>
                  {currentLanguage.code === language.code && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3AB3FF]" />
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
