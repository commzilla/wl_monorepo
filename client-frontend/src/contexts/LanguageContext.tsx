import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from '@/i18n/config';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  countryCode: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', countryCode: 'GB' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', countryCode: 'ES' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', countryCode: 'DE' },
  { code: 'fr', name: 'French', nativeName: 'Français', countryCode: 'FR' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', countryCode: 'CZ' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', countryCode: 'IT' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', countryCode: 'VN' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', countryCode: 'PT' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', countryCode: 'SA' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', countryCode: 'TR' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', countryCode: 'IN' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', countryCode: 'RU' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', countryCode: 'PL' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', countryCode: 'JP' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', countryCode: 'KR' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', countryCode: 'CN' },
];

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (languageCode: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('app-language');
    return LANGUAGES.find(lang => lang.code === savedLanguage) || LANGUAGES[0];
  });

  useEffect(() => {
    localStorage.setItem('app-language', currentLanguage.code);
    document.documentElement.lang = currentLanguage.code;
    i18n.changeLanguage(currentLanguage.code);
  }, [currentLanguage]);

  const setLanguage = (languageCode: string) => {
    const language = LANGUAGES.find(lang => lang.code === languageCode);
    if (language) {
      setCurrentLanguage(language);
    }
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
