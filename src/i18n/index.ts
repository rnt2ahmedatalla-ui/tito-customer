import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '@/locales/ar.json';
import en from '@/locales/en.json';

const STORAGE_KEY = 'tito-lang';

function getStoredLang(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {
    /* ignore */
  }
  return 'ar';
}

export function setLanguage(lang: 'ar' | 'en'): void {
  i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

const initialLang = getStoredLang();

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: initialLang,
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
});

document.documentElement.lang = initialLang;
document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';

export default i18n;
