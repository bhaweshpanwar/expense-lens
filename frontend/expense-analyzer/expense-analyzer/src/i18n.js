import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEN from './locales/en/translation.json';
import translationHI from './locales/hi/translation.json';

const savedLanguage =
  typeof window !== 'undefined'
    ? localStorage.getItem('sharma_expense_language') || 'en'
    : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: translationEN },
      hi: { translation: translationHI },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('sharma_expense_language', lng);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lng;
    }
  } catch (e) {
    console.error('Failed to save language in localStorage', e);
  }
});

export default i18n;
