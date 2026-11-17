import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const DISMISS_KEY = 'tito.installBanner.dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === '1';
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

    setIsIOS(ios);
    setHidden(dismissed || standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(dismissed || standalone);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  // نعرض الرسالة على الموبايل بس، ولو مش متاح تثبيت ولا iPhone مش هنعرضها
  if (hidden || (!deferred && !isIOS)) return null;

  const close = () => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') close();
    setDeferred(null);
  };

  return (
    <div className="fixed inset-x-3 bottom-4 z-40 lg:hidden">
      <div className="flex items-start gap-3 rounded-card border border-bark/30 bg-espresso p-4 text-cream shadow-warm-lg">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gold">
            {isAr ? 'ثبّت تطبيق tito على موبايلك' : 'Install tito on your phone'}
          </p>
          {deferred ? (
            <p className="mt-1 text-sm text-cream/80">
              {isAr ? 'احجز بسرعة من غير ما تفتح المتصفح كل مرة.' : 'Book faster without opening the browser each time.'}
            </p>
          ) : (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-cream/80">
              {isAr ? 'اضغط زرار المشاركة' : 'Tap the Share button'}
              <Share2 className="inline size-4" aria-hidden />
              {isAr ? 'واختار "إضافة إلى الشاشة الرئيسية".' : 'then choose "Add to Home Screen".'}
            </p>
          )}
          {deferred ? (
            <Button size="sm" className="mt-3" onClick={() => void install()}>
              <Download className="size-4" aria-hidden />
              {isAr ? 'ثبّت الآن' : 'Install now'}
            </Button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={isAr ? 'إغلاق' : 'Close'}
          className="shrink-0 rounded-btn p-1 text-cream/70 hover:text-cream"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
