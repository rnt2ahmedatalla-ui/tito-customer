import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { POLICY_KEY, usePolicyText } from '@/lib/policy';

/** أول زيارة: العميل لازم يوافق على سياسة الحجز. بعد الموافقة بتفضل في الرئيسية بس. */
export function PolicyGate() {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const { text, version, ready } = usePolicyText(isAr);
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setAccepted(localStorage.getItem(POLICY_KEY) === version);
    } catch {
      setAccepted(false);
    }
  }, [version]);

  useEffect(() => {
    if (!ready || accepted !== false) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [ready, accepted]);

  if (!ready || accepted !== false) return null;

  const accept = () => {
    try {
      localStorage.setItem(POLICY_KEY, version);
    } catch {
      /* ignore */
    }
    setAccepted(true);
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="policy-title">
      <div className="absolute inset-0 bg-espresso/70" />
      <div className="relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col rounded-t-card bg-cream p-6 shadow-warm-raised sm:rounded-card">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/20 text-espresso">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <h2 id="policy-title" className="text-lg font-bold text-espresso">
            {isAr ? 'سياسة الحجز' : 'Booking policy'}
          </h2>
        </div>
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <p className="whitespace-pre-line leading-relaxed text-ink">{text}</p>
        </div>
        <Button className="mt-5 w-full pb-[env(safe-area-inset-bottom)]" onClick={accept}>
          {isAr ? 'موافق وفاهم' : 'I agree'}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
