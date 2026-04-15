import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import cs from './locales/cs.json';
import it from './locales/it.json';
import vi from './locales/vi.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';
import tr from './locales/tr.json';
import hi from './locales/hi.json';
import ru from './locales/ru.json';
import pl from './locales/pl.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      de: { translation: de },
      fr: { translation: fr },
      cs: { translation: cs },
      it: { translation: it },
      vi: { translation: vi },
      pt: { translation: pt },
      ar: { translation: ar },
      tr: { translation: tr },
      hi: { translation: hi },
      ru: { translation: ru },
      pl: { translation: pl },
      ja: { translation: ja },
      ko: { translation: ko },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'app-language',
    },
  });

export default i18n;
