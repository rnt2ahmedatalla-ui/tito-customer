import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BellRing, Compass, MoreHorizontal, Share, Smartphone, SquarePlus } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { detectPlatform, isStandalone } from '@/lib/install';
import { cn } from '@/lib/cn';

/** نسخة iOS من الـ user agent (مثلاً 17.4). null لو مش آيفون/آيباد */
export function iosVersion(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): number | null {
  const m = ua.match(/OS (\d+)[_.](\d+)/);
  if (!m || !/iPhone|iPad|iPod|Macintosh/.test(ua)) return null;
  return Number(m[1]) + Number(m[2]) / 100;
}

export function isIosDevice(): boolean {
  const p = detectPlatform();
  return p === 'ios-safari' || p === 'ios-other' || (p === 'in-app' && /iPhone|iPad|iPod/i.test(navigator.userAgent));
}

/** شرح خطوة بخطوة: إضافة الموقع للشاشة الرئيسية على الآيفون عشان إشعارات التذكير توصل */
export function IosInstallGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const L = (a: string, e: string) => (isAr ? a : e);
  const platform = useMemo(() => (typeof navigator !== 'undefined' ? detectPlatform() : 'ios-safari'), []);
  const ver = useMemo(() => iosVersion(), []);
  const oldIos = ver !== null && ver < 16.04;
  const notSafari = platform === 'ios-other' || platform === 'in-app';

  const steps: Array<{ icon: typeof Share; title: string; body: string; highlight?: boolean }> = [
    {
      icon: Compass,
      title: L('افتح الموقع من Safari', 'Open the site in Safari'),
      body: notSafari
        ? L('إنت فاتح من برنامج تاني (زي إنستجرام أو واتساب أو كروم). انسخ اللينك وافتحه في Safari — الإشعارات على الآيفون بتشتغل من Safari بس.', 'You are in another app (Instagram, WhatsApp, Chrome…). Copy the link and open it in Safari — iPhone notifications only work from Safari.')
        : L('إنت فاتح من Safari، تمام 👌', 'You are in Safari, great 👌'),
      highlight: notSafari,
    },
    {
      icon: Share,
      title: L('دوس زرار المشاركة', 'Tap the Share button'),
      body: L('المربع اللي طالع منه سهم لفوق، تحت في نص الشاشة (في الآيباد فوق). لو مش لاقيه: دوس «•••» الأول، وهتلاقي «مشاركة» جواها.', 'The square with an arrow pointing up, at the bottom (top on iPad). If you cannot see it, tap “•••” first and find “Share” inside.'),
    },
    {
      icon: SquarePlus,
      title: L('اختار «إضافة إلى الشاشة الرئيسية»', 'Choose “Add to Home Screen”'),
      body: L('انزل شوية في القايمة لحد ما تلاقيها. لو ظهر اختيار «فتح كتطبيق ويب» خليه شغّال.', 'Scroll down the list to find it. If you see “Open as Web App”, keep it on.'),
    },
    {
      icon: MoreHorizontal,
      title: L('دوس «إضافة»', 'Tap “Add”'),
      body: L('فوق في الركن. هتلاقي أيقونة tito ظهرت على الشاشة الرئيسية زي أي برنامج.', 'Top corner. The tito icon now appears on your home screen like any app.'),
    },
    {
      icon: Smartphone,
      title: L('افتح tito من الأيقونة', 'Open tito from the icon'),
      body: L('مهم: افتحه من الأيقونة اللي على الشاشة الرئيسية، مش من Safari.', 'Important: open it from the home-screen icon, not from Safari.'),
    },
    {
      icon: BellRing,
      title: L('فعّل التذكير', 'Turn on reminders'),
      body: L('سجّل دخول، ودوس «فعّل التذكير» في الرئيسية، ووافق لما يسألك على الإشعارات. كده هيوصلك تذكير قبل معادك.', 'Sign in, tap “Turn on reminders” on the home page and allow notifications. You will now get a reminder before your appointment.'),
    },
  ];

  return (
    <Sheet open={open} onClose={onClose} title={L('الإشعارات على الآيفون', 'Notifications on iPhone')}>
      <div className="space-y-3">
        {oldIos ? (
          <p className="rounded-btn bg-warning/15 p-3 text-sm text-espresso">
            {L('الإشعارات محتاجة iOS 16.4 أو أحدث. حدّث الآيفون من الإعدادات ← عام ← تحديث البرامج.', 'Notifications need iOS 16.4 or newer. Update from Settings → General → Software Update.')}
          </p>
        ) : null}
        <ol className="space-y-2.5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.title} className={cn('flex gap-3 rounded-btn border border-default bg-cream/60 p-3', s.highlight && 'border-warning bg-warning/10')}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold font-latin font-bold text-espresso">{i + 1}</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold text-espresso"><Icon className="size-4 shrink-0 text-gold" aria-hidden />{s.title}</p>
                  <p className="mt-0.5 text-sm text-ink">{s.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={onClose} className="min-h-11 w-full rounded-btn bg-gold font-semibold text-espresso">
          {L('تمام، فهمت', 'Got it')}
        </button>
      </div>
    </Sheet>
  );
}

/** زرار صغير "إزاي توصلك الإشعارات على الآيفون" — بيظهر على الآيفون بس ولو الموقع مش متضاف للشاشة الرئيسية */
export function IosInstallGuideButton({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const [open, setOpen] = useState(false);
  const show = useMemo(() => typeof window !== 'undefined' && isIosDevice() && !isStandalone(), []);
  if (!show) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn('flex w-full items-center gap-3 rounded-card border border-gold/40 bg-white p-3 text-start', className)}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/20 text-espresso"><BellRing className="size-5" /></span>
        <span className="min-w-0">
          <span className="block font-semibold text-espresso">{isAr ? 'عايز التذكير يوصلك على الآيفون؟' : 'Want reminders on your iPhone?'}</span>
          <span className="block text-sm text-ink">{isAr ? 'ضيف tito للشاشة الرئيسية — دوس هنا للشرح' : 'Add tito to your Home Screen — tap for steps'}</span>
        </span>
      </button>
      <IosInstallGuide open={open} onClose={() => setOpen(false)} />
    </>
  );
}
