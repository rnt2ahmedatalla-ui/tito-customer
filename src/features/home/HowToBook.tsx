import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { BellRing, CheckCircle2, Download, ShieldCheck, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { POLICY_KEY, usePolicyText } from '@/lib/policy';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/profile/useAuth';
import { PushOptIn } from '@/features/home/PushOptIn';
import { detectPlatform, isStandalone, useInstall } from '@/lib/install';
import { INSTALL_STEPS } from '@/components/layout/InstallButton';
import { preparePush, pushIsOn, pushSupported, resyncPush } from '@/lib/push';
import { cn } from '@/lib/cn';

const SEEN_KEY = 'tito.howto.seen';
const OPEN_EVENT = 'tito:howto';
// الصفحات اللي العميل بيوصلها من لينك (تأكيد حضور، تقييم، نقل معاد، شاشة الدور): منقاطعهوش بنافذة
const QUIET = /^\/(attend|rate|move|screen)\//;

type Step = 'install' | 'notify' | 'policy';

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

/** يفتح «خطوات الحجز والسياسة» من أي مكان (من لينك تحت في الصفحة) */
export function openHowToBook() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

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
 * أول زيارة: ٣ خطوات بالترتيب ده — (١) نزّل التطبيق (٢) فعّل الإشعارات (٣) خطوات الحجز والسياسة بزرار «موافق».
 * أي خطوة مالهاش لازمة بتتشال لوحدها (مثلاً التطبيق متنزّل أو الإشعارات شغالة).
 */
export function HowToBookFab(_props: { hidden?: boolean }) {
  const { t, i18n } = useTranslation();
  const ar = !!i18n.language?.startsWith('ar');
  const L = (a: string, e: string) => (ar ? a : e);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const seen = useSeen();
  const { text: policy, version, ready } = usePolicyText(ar);
  const { installed, canPrompt, promptInstall } = useInstall();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<Step[]>(['policy']);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notifyDone, setNotifyDone] = useState(false);
  const [installDone, setInstallDone] = useState(false);
  const quiet = QUIET.test(location.pathname);
  const platform = detectPlatform();

  // لو الإشعارات اتفعّلت قبل تسجيل الدخول: نسجّل الجهاز أول ما يدخل
  useEffect(() => {
    if (user) void resyncPush(ar ? 'ar' : 'en');
  }, [user, ar]);

  const start = async (onlyPolicy: boolean) => {
    if (onlyPolicy) {
      setSteps(['policy']);
    } else {
      const list: Step[] = [];
      if (!installed && !isStandalone()) list.push('install');
      if (pushSupported() && Notification.permission !== 'denied' && !(await pushIsOn())) list.push('notify');
      list.push('policy');
      setSteps(list);
    }
    setI(0);
    setOpen(true);
  };

  // أول زيارة: تفتح لوحدها بعد ما الصفحة تبان
  useEffect(() => {
    if (seen || quiet || !ready) return;
    const id = window.setTimeout(() => void start(false), 900);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, quiet, ready]);

  useEffect(() => {
    const on = () => void start(true);
    window.addEventListener(OPEN_EVENT, on);
    return () => window.removeEventListener(OPEN_EVENT, on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const finish = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
      localStorage.setItem(POLICY_KEY, version);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('tito:howto-seen'));
    setOpen(false);
  };

  const next = () => (i < steps.length - 1 ? setI(i + 1) : finish());
  const step = steps[i] ?? 'policy';

  const doInstall = async () => {
    setBusy(true);
    try {
      if (await promptInstall()) {
        setInstallDone(true);
        window.setTimeout(next, 700);
      }
    } finally {
      setBusy(false);
    }
  };
  const doNotify = async () => {
    setBusy(true);
    try {
      const ok = await preparePush(ar ? 'ar' : 'en', !!user);
      setNotifyDone(ok);
      window.setTimeout(next, ok ? 700 : 0);
    } finally {
      setBusy(false);
    }
  };

  const bookingSteps = [
    [t('home.step1'), t('home.step1Desc')],
    [t('home.step2'), t('home.step2Desc')],
    [t('home.step3'), t('home.step3Desc')],
  ];
  const installSteps = INSTALL_STEPS[platform][ar ? 'ar' : 'en'];
  const head = {
    install: [L('نزّل tito على موبايلك', 'Get tito on your phone'), L('بيفتح زي أي تطبيق، أسرع، ومن غير ما تدوّر على اللينك.', 'Opens like any app, faster, no need to find the link.')],
    notify: [L('فعّل الإشعارات', 'Turn on notifications'), L('علشان يوصلك تذكير قبل معادك، ولو فضي معاد أبدري، وعروضنا أول بأول.', 'Get a reminder before your appointment, earlier slots and offers.')],
    policy: [L('احجز إزاي؟', 'How to book'), t('home.howSupport')],
  }[step];

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[115] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="howto-title">
      <div className="absolute inset-0 animate-fade bg-espresso/60 backdrop-blur-xs" onClick={() => (seen ? setOpen(false) : undefined)} aria-hidden />
      <div className="relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-md animate-sheet flex-col overflow-hidden rounded-t-[1.5rem] bg-cream shadow-warm-raised sm:rounded-card">
        <div className="relative bg-espresso px-5 pb-5 pt-6 text-cream">
          {steps.length > 1 ? (
            <div className="mb-3 flex gap-1.5" aria-hidden>
              {steps.map((s, k) => (
                <span key={s} className={cn('h-1.5 rounded-full transition-all duration-500', k === i ? 'w-8 bg-gold' : k < i ? 'w-4 bg-gold/60' : 'w-4 bg-cream/25')} />
              ))}
            </div>
          ) : null}
          <h2 id="howto-title" key={step} className="animate-rise text-2xl font-bold">{head[0]}</h2>
          <p className="mt-1 text-sm text-cream/75">{head[1]}</p>
          {seen ? (
            <button type="button" onClick={() => setOpen(false)} aria-label={L('قفل', 'Close')} className="absolute end-3 top-3 flex size-9 items-center justify-center rounded-full text-cream/70 hover:bg-cream/10">
              <X className="size-5" />
            </button>
          ) : null}
        </div>

        <div key={step} className="min-h-0 flex-1 animate-rise overflow-y-auto overscroll-contain px-5 py-4">
          {step === 'install' ? (
            installDone ? (
              <p className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="size-5" />{L('اتنزّل ✓', 'Installed ✓')}</p>
            ) : canPrompt ? (
              <div className="flex items-center gap-3 rounded-card border border-gold/40 bg-gold/10 p-3">
                <Smartphone className="size-8 shrink-0 text-gold" />
                <p className="text-sm text-ink">{L('دوسة واحدة وهيبقى عندك أيقونة tito على الشاشة الرئيسية.', 'One tap and tito is on your home screen.')}</p>
              </div>
            ) : (
              <ol className="space-y-2.5">
                {installSteps.map((s, k) => (
                  <li key={s} className="flex gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold font-latin text-xs font-bold text-espresso">{k + 1}</span>
                    <p className="pt-0.5 text-sm text-espresso">{s}</p>
                  </li>
                ))}
              </ol>
            )
          ) : null}

          {step === 'notify' ? (
            notifyDone ? (
              <p className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="size-5" />{L('الإشعارات اشتغلت ✓', 'Notifications are on ✓')}</p>
            ) : (
              <ul className="space-y-2 text-sm text-espresso">
                {[L('تذكير قبل معادك', 'A reminder before your appointment'), L('لو فضي معاد أبدري نبلّغك', 'Earlier slots when they free up'), L('العروض والهدايا أول بأول', 'Offers and gifts first')].map((x) => (
                  <li key={x} className="flex items-center gap-2"><BellRing className="size-4 shrink-0 text-gold" />{x}</li>
                ))}
              </ul>
            )
          ) : null}

          {step === 'policy' ? (
            <>
              <ol className="space-y-3">
                {bookingSteps.map(([title, desc], k) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold font-latin text-sm font-bold text-espresso">{k + 1}</span>
                    <div className="min-w-0 pt-0.5">
                      <p className="font-semibold text-espresso">{title}</p>
                      <p className="text-sm text-ink">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-4 rounded-btn border border-gold/40 bg-gold/10 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-espresso"><ShieldCheck className="size-4 text-gold" aria-hidden />{L('سياسة الحجز', 'Booking policy')}</p>
                <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-ink">{policy}</p>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-default px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
          {step === 'install' && !installDone ? (
            <>
              {canPrompt ? (
                <Button className="flex-1" loading={busy} onClick={() => void doInstall()}><Download className="size-4" />{L('نزّل التطبيق', 'Install')}</Button>
              ) : (
                <Button className="flex-1" onClick={next}>{L('تمام، التالي', 'Got it, next')}</Button>
              )}
              {canPrompt ? <Button variant="ghost" onClick={next}>{L('بعدين', 'Later')}</Button> : null}
            </>
          ) : step === 'notify' && !notifyDone ? (
            <>
              <Button className="flex-1" loading={busy} onClick={() => void doNotify()}><BellRing className="size-4" />{L('فعّل الإشعارات', 'Turn on')}</Button>
              <Button variant="ghost" onClick={next}>{L('بعدين', 'Later')}</Button>
            </>
          ) : step === 'policy' ? (
            <Button className="flex-1" onClick={finish}>{L('موافق', 'OK')}</Button>
          ) : (
            <Button className="flex-1" onClick={next}>{L('التالي', 'Next')}</Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** «فعّل التذكيرات» كنافذة صغيرة عائمة: بتطلع بعد أول حجز للعميل لو لسه مفعّلهاش */
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
