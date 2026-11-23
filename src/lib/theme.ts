// الوضع الليلي / النهاري / زي الموبايل — الاختيار بيتحفظ على الجهاز
export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'tito.theme';
const listeners = new Set<() => void>();

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

const systemDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export function isDark(pref = getThemePref()) {
  return pref === 'dark' || (pref === 'system' && systemDark());
}

export function applyTheme(animate = false) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-anim');
    window.setTimeout(() => root.classList.remove('theme-anim'), 450);
  }
  const dark = isDark();
  root.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#120B08' : '#341A0E');
  listeners.forEach((l) => l());
}

export function setThemePref(p: ThemePref) {
  try {
    if (p === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, p);
  } catch {
    /* ignore */
  }
  applyTheme(true);
}

export function subscribeTheme(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function initTheme() {
  applyTheme();
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (getThemePref() === 'system') applyTheme(true);
  });
}
