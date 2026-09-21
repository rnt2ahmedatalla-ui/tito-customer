import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-danger px-4 py-2 text-sm text-cream" role="alert">
      <WifiOff className="size-4" aria-hidden />
      {t('errors.offline')}
    </div>
  );
}
