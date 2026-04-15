
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export type Language = 'en' | 'nl';

export const useLanguage = () => {
  const { i18n, t } = useTranslation();
  const { updateProfile, profile } = useAuth();

  const currentLanguage = i18n.language as Language;

  const changeLanguage = async (language: Language) => {
    // Update i18n
    await i18n.changeLanguage(language);
    
    // Store in localStorage
    localStorage.setItem('i18nextLng', language);
    
    // Update user profile if authenticated
    if (profile) {
      try {
        await updateProfile({ language });
      } catch (error) {
        console.error('Failed to update language in profile:', error);
      }
    }
  };

  const languages = [
    { code: 'en' as Language, name: 'English', nativeName: 'English' },
    { code: 'nl' as Language, name: 'Dutch', nativeName: 'Nederlands' }
  ];

  return {
    currentLanguage,
    changeLanguage,
    languages,
    t
  };
};
