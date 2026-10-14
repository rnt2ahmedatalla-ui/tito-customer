import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Providers } from './providers';
import { AppRouter } from './router';
import { ErrorBoundary } from './ErrorBoundary';
import { useSettings } from '@/features/home/useHomeData';

function DocumentTitle() {
  const { t } = useTranslation();
  const settings = useSettings();
  useEffect(() => {
    const shopName = settings.data?.shop_name;
    if (shopName) {
      document.title = `${shopName} | ${t('app.tagline')}`;
    } else {
      document.title = t('app.title');
    }
  }, [t, settings.data?.shop_name]);
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
