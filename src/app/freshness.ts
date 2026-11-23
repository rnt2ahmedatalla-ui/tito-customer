import { supabase } from '@/lib/supabase';

// 1) لو في نسخة أحدث من الموقع اتنشرت، الجهاز يحدّث نفسه لوحده (حتى لو التطبيق متنزّل وفاضل مفتوح).
// 2) لو حساب العميل اتمسح من لوحة التحكم، يخرج فوراً بدل ما يفضل شايف بيانات قديمة.
let lastCheck = 0;

async function checkVersion() {
  if (!import.meta.env.PROD) return;
  try {
    const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
    const res = await fetch(`${base}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { v } = (await res.json()) as { v?: string };
    if (v && v !== __BUILD_ID__) {
      const key = `tito.reloaded.${v}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      window.location.reload();
    }
  } catch {
    /* offline — نجرب المرة الجاية */
  }
}

async function checkAccount() {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const { error } = await supabase.auth.getUser();
    // الحساب اتمسح أو الجلسة اتلغت من السيرفر
    if (error && (error.status === 401 || error.status === 403 || /not.*found|does not exist|invalid/i.test(error.message))) {
      await supabase.auth.signOut({ scope: 'local' });
      window.location.replace(import.meta.env.BASE_URL || '/');
    }
  } catch {
    /* ignore */
  }
}

export function runFreshnessChecks(force = false) {
  const now = Date.now();
  if (!force && now - lastCheck < 60_000) return;
  lastCheck = now;
  void checkVersion();
  void checkAccount();
}

export function startFreshnessWatch() {
  runFreshnessChecks(true);
  const onVisible = () => {
    if (document.visibilityState === 'visible') runFreshnessChecks();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  const timer = window.setInterval(() => runFreshnessChecks(), 10 * 60_000);
  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
    window.clearInterval(timer);
  };
}
