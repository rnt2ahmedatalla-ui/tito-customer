import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Providers } from './providers';
import { AppRouter } from './router';
import { ErrorBoundary } from './ErrorBoundary';
import { useSettings } from '@/features/home/useHomeData';

function DocumentTitle() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  useEffect(() => {
    const shopName = settings.data?.shop_name;
    const ar = i18n.language?.startsWith('ar');
    const tagline = (ar ? settings.data?.tagline_ar : settings.data?.tagline_en) || t('app.tagline');
    if (shopName) {
      document.title = `${shopName} | ${tagline}`;
    } else {
      document.title = t('app.title');
    }
  }, [t, i18n.language, settings.data?.shop_name, settings.data?.tagline_ar, settings.data?.tagline_en]);
  return null;
}

export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <DocumentTitle />
        <AppRouter />
      </Providers>
    </ErrorBoundary>
  );
}
