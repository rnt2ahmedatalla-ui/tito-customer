import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BellRing, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/profile/useAuth';
import { enablePush, pushIsOn, pushSupported, resyncPush } from '@/lib/push';
import { IosInstallGuide } from '@/components/layout/IosInstallGuide';

const KEY = 'tito_push_snooze_until';
const SNOOZE_DAYS = 3;

/** كارت في الرئيسية: فعّل تذكيرات المواعيد على موبايلك (إشعار قبل المعاد) */
export function PushOptIn() {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const { user } = useAuth();
  const [state, setState] = useState<'hidden' | 'ask' | 'busy' | 'ios' | 'denied' | 'unsupported'>('hidden');
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    if (!user) { setState('hidden'); return; }
    // «مش دلوقتي» بيخفيها 3 أيام بس، وبعدين بترجع لحد ما يفعّلها
    let dismissed = false;
    try { dismissed = Number(localStorage.getItem(KEY) || 0) > Date.now(); } catch { /* ignore */ }
    void (async () => {
      if (!pushSupported()) {
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
        if (dismissed) { setState('hidden'); return; }
        setState(ios && !standalone ? 'ios' : 'unsupported');
        return;
      }
      if (await pushIsOn()) { void resyncPush(isAr ? 'ar' : 'en'); setState('hidden'); return; }
      if (dismissed) { setState('hidden'); return; }
      setState(Notification.permission === 'denied' ? 'denied' : 'ask');
    })();
  }, [user, isAr]);

  if (state === 'hidden') return null;
  const hide = () => { try { localStorage.setItem(KEY, String(Date.now() + SNOOZE_DAYS * 86400000)); } catch { /* ignore */ } setState('hidden'); };

  return (
    <div className="relative animate-rise rounded-2xl border border-gold/40 bg-cream p-3.5 pe-11 shadow-warm-raised">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/25 text-espresso"><BellRing className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-espresso">{isAr ? 'فعّل الإشعارات 🔔' : 'Turn on notifications 🔔'}</p>
          {state === 'denied' ? (
            <p className="mt-0.5 text-sm text-ink">
              {isAr ? 'الإشعارات مقفولة من المتصفح. اضغط على علامة القفل 🔒 جنب اللينك فوق ← الإشعارات ← «سماح»، وبعدين ارجع هنا. عشان يوصلك تذكير قبل معادك وأي تغيير فيه.' : 'Notifications are blocked in your browser. Tap the 🔒 next to the address → Notifications → Allow, then come back — so you get reminders and updates about your appointment.'}
            </p>
          ) : state === 'unsupported' ? (
            <p className="mt-0.5 text-sm text-ink">
              {isAr ? 'المتصفح ده مش بيدعم الإشعارات (غالباً فاتح من فيسبوك أو إنستجرام). افتح الموقع من Chrome عشان توصلك تذكيرات مواعيدك.' : "This browser can't show notifications (likely opened inside Facebook/Instagram). Open the site in Chrome to get reminders."}
            </p>
          ) : state === 'ios' ? (
            <>
              <p className="mt-0.5 text-sm text-ink">
                {isAr ? 'على الآيفون لازم تضيف tito للشاشة الرئيسية الأول عشان التذكير يوصلك.' : 'On iPhone, add tito to your Home Screen first so reminders can reach you.'}
              </p>
              <button type="button" onClick={() => setGuide(true)} className="mt-2 inline-flex min-h-10 items-center justify-center rounded-btn bg-gold px-4 text-sm font-semibold text-espresso">
                {isAr ? 'اشرحلي خطوة بخطوة' : 'Show me how'}
              </button>
              <IosInstallGuide open={guide} onClose={() => setGuide(false)} />
            </>
          ) : (
            <>
              <p className="mt-0.5 text-sm text-ink">{isAr ? 'فعّلها عشان توصلك تذكيرات مواعيدك وأي تغيير فيها والعروض — حتى والموقع مقفول.' : 'Turn them on to get appointment reminders, changes and offers — even when the site is closed.'}</p>
              <button
                type="button"
                disabled={state === 'busy'}
                onClick={async () => {
                  setState('busy');
                  try {
                    const ok = await enablePush(isAr ? 'ar' : 'en');
                    if (ok) { toast.success(isAr ? 'تمام! هنفكّرك قبل كل معاد 🔔' : 'Done! We will remind you 🔔'); setState('hidden'); }
                    else { toast.error(isAr ? 'لازم تسمح بالإشعارات من المتصفح' : 'Please allow notifications in your browser'); setState('ask'); }
                  } catch { toast.error(isAr ? 'حصل خطأ، جرّب تاني' : 'Something went wrong, try again'); setState('ask'); }
                }}
                className="mt-2 inline-flex min-h-10 items-center justify-center rounded-btn bg-gold px-4 text-sm font-semibold text-espresso disabled:opacity-60"
              >
                {isAr ? 'فعّل التذكير' : 'Turn on'}
              </button>
            </>
          )}
        </div>
      </div>
      <button type="button" onClick={hide} aria-label={isAr ? 'إخفاء' : 'Dismiss'} className="absolute end-2 top-2 flex size-8 items-center justify-center rounded-full text-ink/60 hover:bg-sand">
        <X className="size-4" />
      </button>
    </div>
  );
}
