import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Monitor, Moon, Sun } from 'lucide-react';
import { getThemePref, setThemePref, subscribeTheme, type ThemePref } from '@/lib/theme';
import { cn } from '@/lib/cn';

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribeTheme, getThemePref, () => 'system');
}

const NEXT: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };

/** زرار صغير في الهيدر: نهاري ← ليلي ← زي الموبايل */
export function ThemeToggle({ dark }: { dark?: boolean }) {
  const { i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const pref = useThemePref();
  const Icon = pref === 'dark' ? Moon : pref === 'light' ? Sun : Monitor;
  const label = { light: ar ? 'نهاري' : 'Light', dark: ar ? 'ليلي' : 'Dark', system: ar ? 'زي الموبايل' : 'System' }[pref];
  return (
    <button
      type="button"
      onClick={() => setThemePref(NEXT[pref])}
      aria-label={(ar ? 'الشكل: ' : 'Theme: ') + label}
      title={label}
      className={cn(
        'inline-flex size-10 items-center justify-center rounded-btn transition-all duration-brand active:scale-90',
        dark ? 'border border-cream/20 text-cream/80 hover:bg-cream/10' : 'border border-default text-ink hover:bg-sand',
      )}
    >
      <Icon key={pref} className="size-4 animate-[spin-in_.35s_ease-out]" aria-hidden />
    </button>
  );
}

/** اختيار الشكل في «حسابي» */
export function ThemePicker() {
  const { i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const pref = useThemePref();
  const opts: Array<[ThemePref, string, typeof Sun]> = [
    ['light', ar ? 'نهاري' : 'Light', Sun],
    ['dark', ar ? 'ليلي' : 'Dark', Moon],
    ['system', ar ? 'زي الموبايل' : 'System', Monitor],
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-btn bg-sand/60 p-1">
      {opts.map(([k, l, I]) => (
        <button
          key={k}
          type="button"
          onClick={() => setThemePref(k)}
          className={cn('flex min-h-11 items-center justify-center gap-1.5 rounded-btn text-sm font-medium transition-all', pref === k ? 'bg-white text-espresso shadow-warm' : 'text-ink')}
        >
          <I className="size-4" aria-hidden />
          {l}
        </button>
      ))}
    </div>
  );
}
