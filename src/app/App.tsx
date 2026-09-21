import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Providers } from './providers';
import { AppRouter } from './router';
import { ErrorBoundary } from './ErrorBoundary';

function DocumentTitle() {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = t('app.title');
  }, [t]);
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
