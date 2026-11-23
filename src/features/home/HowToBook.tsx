import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { HelpCircle, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { POLICY_KEY, usePolicyText } from '@/lib/policy';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/profile/useAuth';
import { PushOptIn } from '@/features/home/PushOptIn';
import { cn } from '@/lib/cn';

const SEEN_KEY = 'tito.howto.seen';
const OPEN_EVENT = 'tito:howto';
// الصفحات اللي العميل بيوصلها من لينك (تأكيد حضور، تقييم، نقل معاد، شاشة الدور): منقاطعهوش بنافذة
const QUIET = /^\/(attend|rate|move|screen)\//;

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

/** يفتح نافذة «احجز إزاي؟» من أي مكان */
export function openHowToBook() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** هل العميل شاف «احجز إزاي؟» ووافق؟ (بيتحدّث لحظياً) */
function useSeen(): boolean {
  const [seen, setSeen] = useState(readSeen);
  useEffect(() => {
    const on = () => setSeen(readSeen());
    window.addEventListener('tito:howto-seen', on);
    return () => window.removeEventListener('tito:howto-seen', on);
  }, []);
  return seen;
}

/**
 * «احجز إزاي؟»: نافذة بتطلع أول زيارة بس (فيها الخطوات + سياسة الحجز)، وبعد «موافق»
 * بتفضل علامة صغيرة عائمة فوق زرار الواتساب لو حد عايز يقراها تاني.
 */
export function HowToBookFab({ hidden = false }: { hidden?: boolean }) {
  const { t, i18n } = useTranslation();
  const ar = !!i18n.language?.startsWith('ar');
  const L = (a: string, e: string) => (ar ? a : e);
  const location = useLocation();
  const navigate = useNavigate();
  const seen = useSeen();
  const { text: policy, version, ready } = usePolicyText(ar);
  const [open, setOpen] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const quiet = QUIET.test(location.pathname);

  // أول زيارة: تفتح لوحدها (بعد ثانية علشان الصفحة تبان الأول)
  useEffect(() => {
    if (seen || quiet || !ready) return;
    const id = window.setTimeout(() => setOpen(true), 900);
    return () => window.clearTimeout(id);
  }, [seen, quiet, ready]);

  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, on);
    return () => window.removeEventListener(OPEN_EVENT, on);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const accept = (goBook: boolean) => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
      localStorage.setItem(POLICY_KEY, version);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('tito:howto-seen'));
    setOpen(false);
    setShowPolicy(false);
    if (goBook) navigate('/book');
  };

  const steps = [
    [t('home.step1'), t('home.step1Desc')],
    [t('home.step2'), t('home.step2Desc')],
    [t('home.step3'), t('home.step3Desc')],
  ];

  return (
    <>
      {seen && !hidden && !quiet ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'fixed end-3 z-30 inline-flex h-9 items-center gap-1.5 rounded-full border border-gold/60 bg-cream/95 px-3 text-xs font-semibold text-espresso shadow-warm backdrop-blur-sm transition-transform active:scale-95',
            'bottom-[calc(8.5rem+env(safe-area-inset-bottom))] sm:bottom-[5.25rem] sm:end-6',
          )}
        >
          <HelpCircle className="size-4 text-gold" aria-hidden />
          {L('احجز إزاي؟', 'How to book')}
        </button>
      ) : null}

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[115] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="howto-title">
              <div className="absolute inset-0 bg-espresso/60 backdrop-blur-xs" onClick={() => (seen ? setOpen(false) : undefined)} aria-hidden />
              <div className="relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-t-[1.5rem] bg-cream shadow-warm-raised sm:rounded-card">
                <div className="relative bg-espresso px-5 pb-5 pt-6 text-cream">
                  <p className="font-latin text-xs font-medium uppercase tracking-[0.25em] text-gold">{t('home.howEyebrow')}</p>
                  <h2 id="howto-title" className="mt-1 text-2xl font-bold">{L('احجز إزاي؟', 'How to book')}</h2>
                  <p className="mt-1 text-sm text-cream/70">{t('home.howSupport')}</p>
                  {seen ? (
                    <button type="button" onClick={() => setOpen(false)} aria-label={L('قفل', 'Close')} className="absolute end-3 top-3 flex size-9 items-center justify-center rounded-full text-cream/70 hover:bg-cream/10">
                      <X className="size-5" />
                    </button>
                  ) : null}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                  <ol className="space-y-3">
                    {steps.map(([title, desc], i) => (
                      <li key={title} className="flex gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold font-latin text-sm font-bold text-espresso">{i + 1}</span>
                        <div className="min-w-0 pt-0.5">
                          <p className="font-semibold text-espresso">{title}</p>
                          <p className="text-sm text-ink">{desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 rounded-btn border border-gold/40 bg-gold/10 p-3">
                    <button type="button" onClick={() => setShowPolicy((v) => !v)} className="flex w-full items-center justify-between gap-2 text-start text-sm font-semibold text-espresso" aria-expanded={showPolicy}>
                      <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-gold" aria-hidden />{L('سياسة الحجز', 'Booking policy')}</span>
                      <span className="text-xs font-normal text-ink">{showPolicy ? L('إخفاء', 'Hide') : L('اقرأها', 'Read')}</span>
                    </button>
                    {showPolicy ? <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">{policy}</p> : null}
                  </div>
                  {!seen ? <p className="mt-3 text-xs text-ink">{L('بالضغط على «موافق» إنت موافق على سياسة الحجز.', 'By tapping “OK” you agree to the booking policy.')}</p> : null}
                </div>
                <div className="flex gap-2 border-t border-default px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
                  <Button className="flex-1" onClick={() => accept(true)}>{L('موافق، يلا أحجز', 'OK, book now')}</Button>
                  <Button variant="secondary" onClick={() => accept(false)}>{L('موافق', 'OK')}</Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** «فعّل التذكيرات» كنافذة صغيرة عائمة: بتطلع بعد «احجز إزاي؟» وبعد أول حجز للعميل بس */
export function PushFloat() {
  const { user } = useAuth();
  const seen = useSeen();
  const has = useQuery({
    queryKey: ['has-booking', user?.id],
    enabled: !!user && seen,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { count, error } = await supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', user!.id);
      if (error) return false;
      return (count ?? 0) > 0;
    },
  });
  if (!user || !seen || !has.data) return null;
  return (
    <div className="pointer-events-none fixed inset-x-3 z-30 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] empty:hidden sm:inset-x-auto sm:bottom-6 sm:start-6 sm:w-[22rem] [&>*]:pointer-events-auto">
      <PushOptIn />
    </div>
  );
}
