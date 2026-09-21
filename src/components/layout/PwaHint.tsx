import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'tito-pwa-hint-dismissed';

export function PwaHint() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      if (!isStandalone && /Android|iPhone/i.test(navigator.userAgent)) {
        setShow(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-40 rounded-card border border-default bg-espresso p-4 text-cream shadow-warm-raised sm:bottom-4 sm:start-auto sm:end-4 sm:max-w-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm">{t('common.pwaHint')}</p>
        <button type="button" onClick={dismiss} className="shrink-0 p-1" aria-label={t('common.close')}>
          <X className="size-4" />
        </button>
      </div>
      <Button variant="secondary" size="sm" className="mt-3" onClick={dismiss}>
        {t('common.pwaDismiss')}
      </Button>
    </div>
  );
}
