import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { detectPlatform, useInstall, type InstallPlatform } from '@/lib/install';
import { cn } from '@/lib/cn';

const STEPS: Record<InstallPlatform, { ar: string[]; en: string[] }> = {
  'ios-safari': {
    ar: ['دوس على زرار المشاركة (المربع اللي فيه سهم لفوق) تحت في سفاري', 'انزل واختار "إضافة إلى الشاشة الرئيسية"', 'دوس "إضافة"'],
    en: ['Tap the Share button (square with an arrow) at the bottom of Safari', 'Scroll and choose "Add to Home Screen"', 'Tap "Add"'],
  },
  'ios-other': {
    ar: ['دوس على زرار المشاركة أو ⋯ في المتصفح', 'اختار "إضافة إلى الشاشة الرئيسية"', 'لو مش ظاهرة، افتح الموقع في سفاري وكمّل بنفس الخطوات'],
    en: ['Tap the Share or ⋯ button in your browser', 'Choose "Add to Home Screen"', 'If you do not see it, open this site in Safari and repeat'],
  },
  'android-samsung': {
    ar: ['دوس على قايمة المتصفح (الثلاث شرط ☰)', 'اختار "إضافة الصفحة إلى" ثم "الشاشة الرئيسية"', 'دوس "إضافة"'],
    en: ['Tap the browser menu (☰)', 'Choose "Add page to" then "Home screen"', 'Tap "Add"'],
  },
  'android-firefox': {
    ar: ['دوس على قايمة فايرفوكس (⋮)', 'اختار "تثبيت" أو "إضافة إلى الشاشة الرئيسية"', 'أكّد'],
    en: ['Tap the Firefox menu (⋮)', 'Choose "Install" or "Add to Home screen"', 'Confirm'],
  },
  'android-chrome': {
    ar: ['دوس على قايمة المتصفح (⋮) فوق', 'اختار "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"', 'أكّد'],
    en: ['Tap the browser menu (⋮) at the top', 'Choose "Install app" or "Add to Home screen"', 'Confirm'],
  },
  'desktop-safari': {
    ar: ['من شريط القايمة فوق اختار ملف أو مشاركة', 'دوس "إضافة إلى Dock"'],
    en: ['From the menu bar choose File or Share', 'Click "Add to Dock"'],
  },
  'desktop-firefox': {
    ar: ['فايرفوكس على الكمبيوتر مش بيدعم تثبيت التطبيقات', 'افتح الموقع في كروم أو إيدج وهتلاقي أيقونة التثبيت في شريط العنوان'],
    en: ['Firefox on desktop does not support installing apps', 'Open this site in Chrome or Edge and use the install icon in the address bar'],
  },
  'desktop-chromium': {
    ar: ['دوس على أيقونة التثبيت في آخر شريط العنوان', 'أو من قايمة المتصفح (⋮) اختار "تثبيت tito"', 'أكّد'],
    en: ['Click the install icon at the end of the address bar', 'Or open the browser menu (⋮) and choose "Install tito"', 'Confirm'],
  },
  'in-app': {
    ar: ['إنت فاتح الموقع من جوه تطبيق (فيسبوك/إنستجرام)، والتثبيت مش بيشتغل من هنا', 'دوس على ⋯ واختار "فتح في المتصفح"', 'وبعدين دوس "ثبّت التطبيق" تاني'],
    en: ['You opened the site inside an app (Facebook/Instagram) where install does not work', 'Tap ⋯ and choose "Open in browser"', 'Then tap "Install app" again'],
  },
};

export function InstallButton({ className, dark = false }: { className?: string; dark?: boolean }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const { installed, canPrompt, promptInstall } = useInstall();
  const [open, setOpen] = useState(false);

  if (installed) return null;

  const label = isAr ? 'نزّل كتطبيق' : 'Get the app';
  const steps = STEPS[detectPlatform()][isAr ? 'ar' : 'en'];

  const onClick = async () => {
    // لو المتصفح بيدعم التثبيت بضغطة، نثبّت على طول. غير كده نفتح الشرح.
    if (canPrompt) {
      await promptInstall();
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void onClick()}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-btn border px-2.5 text-sm font-semibold transition-colors duration-brand',
          dark ? 'border-cream/20 text-cream/80 hover:bg-cream/10' : 'border-default text-ink hover:bg-sand',
          className,
        )}
      >
        <Download className="size-4" aria-hidden />
        <span className="whitespace-nowrap text-xs sm:text-sm">{label}</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <p className="text-sm text-ink">
          {isAr ? 'اتبع الخطوات دي مرة واحدة وهيبقى عندك أيقونة tito على الشاشة:' : 'Follow these steps once and tito will have its own icon:'}
        </p>
        <ol className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold font-latin text-sm font-bold text-espresso">
                {i + 1}
              </span>
              <span className="min-w-0 pt-0.5 text-sm text-espresso">{s}</span>
            </li>
          ))}
        </ol>
        <Button className="mt-6 w-full" onClick={() => setOpen(false)}>
          {isAr ? 'تمام' : 'Got it'}
        </Button>
      </Sheet>
    </>
  );
}
