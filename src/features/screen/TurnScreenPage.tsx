import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BellRing, Moon, CalendarPlus, Clock, Hourglass, Scissors, Share2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/profile/useAuth';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { PRAYER_NAMES, fmtLeft, nextPrayer, usePrayerTimes } from '@/lib/usePrayer';

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;
type Turn = { status: string; start_at: string; ahead: number; busy_now: boolean; eta: string; late_min: number; called_at: string | null; my_eta_minutes: number | null };
type NextB = { id: string; start_at: string; end_at: string; status: string; service_name_ar: string | null; service_name_en: string | null };

const cairoDay = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(ms);

function useWakeLock() {
  useEffect(() => {
    type S = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<S> } };
    let lock: S | null = null;
    const req = () => { if (document.visibilityState === 'visible' && nav.wakeLock) nav.wakeLock.request('screen').then((l) => (lock = l)).catch(() => undefined); };
    req();
    document.addEventListener('visibilitychange', req);
    return () => { document.removeEventListener('visibilitychange', req); void lock?.release().catch(() => undefined); };
  }, []);
}

/** «شاشة الدور» بتاعة العميل — نفس روح شاشة المحل بس على موبايله، وتتثبّت على الشاشة الرئيسية زي الـ widget */
export default function TurnScreenPage() {
  const { id } = useParams();
  const { i18n } = useTranslation();
  const ar = !!i18n.language?.startsWith('ar');
  const L = (a: string, e: string) => (ar ? a : e);
  const { user, loading } = useAuth();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  useWakeLock();

  const next = useQuery({
    queryKey: ['turn-next', user?.id, id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const base = supabase.from('bookings').select('id,start_at,end_at,status,service:services(name_ar,name_en)').eq('user_id', user!.id);
      const { data, error } = id ? await base.eq('id', id).limit(1) : await base.eq('status', 'confirmed').gt('end_at', new Date().toISOString()).order('start_at').limit(1);
      if (error) throw error;
      const row = (data ?? [])[0] as unknown as { id: string; start_at: string; end_at: string; status: string; service: { name_ar: string; name_en: string | null } | Array<{ name_ar: string; name_en: string | null }> | null } | undefined;
      if (!row) return null;
      const sv = Array.isArray(row.service) ? row.service[0] : row.service;
      return { id: row.id, start_at: row.start_at, end_at: row.end_at, status: row.status, service_name_ar: sv?.name_ar ?? null, service_name_en: sv?.name_en ?? null } as NextB;
    },
  });
  const b = next.data;
  const isToday = !!b && cairoDay(Date.parse(b.start_at)) === cairoDay(now);
  const turn = useQuery({
    queryKey: ['my-turn', b?.id],
    enabled: !!b && isToday,
    refetchInterval: 15_000,
    queryFn: async () => {
      const r = await rpc('my_turn', { p_booking_id: b!.id });
      if (r.error) throw new Error(r.error.message);
      return r.data as Turn;
    },
  });
  const t = turn.data;
  const prayers = usePrayerTimes();
  const np = nextPrayer(prayers.data, now);
  const called = !!t?.called_at && now - Date.parse(t.called_at) < 10 * 60_000;
  useEffect(() => { if (called && 'vibrate' in navigator) navigator.vibrate?.([300, 120, 300]); }, [called]);

  const timeFmt = useMemo(() => new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' }), [ar]);
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-US', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long' }), [ar]);
  const target = t ? Date.parse(t.eta) : b ? Date.parse(b.start_at) : 0;
  const left = Math.max(0, target - now);
  const hh = Math.floor(left / 3_600_000), mm = Math.floor((left % 3_600_000) / 60_000), ss = Math.floor((left % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');

  const share = () => {
    const url = window.location.origin + (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/turn';
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) void nav.share({ title: 'tito', url }).catch(() => undefined);
    else void navigator.clipboard?.writeText(url).catch(() => undefined);
  };

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="keep-light-tokens relative flex min-h-dvh flex-col overflow-hidden bg-[#1c0f08] text-[#FAF6F0]">
      <div aria-hidden className="pointer-events-none absolute -top-40 start-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-[#C9A24B]/15 blur-3xl rtl:translate-x-1/2" />
      <header className="relative z-10 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <Link to="/bookings" className="flex size-11 items-center justify-center rounded-full bg-white/10" aria-label={L('رجوع', 'Back')}><ArrowRight className="size-5 ltr:rotate-180" /></Link>
        <img src={`${import.meta.env.BASE_URL}tito-logo-horizontal-gold-on-dark-1200.png`} alt="tito" className="h-7 w-auto" />
        <button type="button" onClick={share} className="flex size-11 items-center justify-center rounded-full bg-white/10" aria-label={L('مشاركة', 'Share')}><Share2 className="size-5" /></button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-5 py-8 text-center">
        {!user && !loading ? (
          <>
            <Scissors className="size-12 text-[#C9A24B]" />
            <p className="text-xl font-bold">{L('سجّل دخول عشان تشوف دورك لايف', 'Sign in to see your live turn')}</p>
            <GoogleSignInButton />
          </>
        ) : next.isLoading || loading ? (
          <div className="size-16 animate-spin rounded-full border-4 border-[#C9A24B]/30 border-t-[#C9A24B]" />
        ) : !b ? (
          <>
            <CalendarPlus className="size-12 text-[#C9A24B]" />
            <p className="text-xl font-bold">{L('مفيش حجز جاي', 'No upcoming booking')}</p>
            <Link to="/book" className="rounded-full bg-[#C9A24B] px-6 py-3 font-bold text-[#1c0f08]">{L('احجز دورك', 'Book now')}</Link>
          </>
        ) : called ? (
          <div className="flex flex-col items-center gap-4">
            <span className="relative flex size-40 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
              <span className="relative flex size-36 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_60px_rgba(16,185,129,.6)]"><BellRing className="size-16 text-white" /></span>
            </span>
            <p className="text-4xl font-black">{L('دورك! 💈', "It's your turn! 💈")}</p>
            <p className="text-lg text-white/80">{L('الحلاق جاهزلك دلوقتي، اتفضل', 'Your barber is ready now')}</p>
          </div>
        ) : (
          <>
            <div>
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-[#C9A24B]">
                {isToday ? <><span className="relative flex size-2.5"><span className="absolute inset-0 animate-ping rounded-full bg-red-500/70" /><span className="relative size-2.5 rounded-full bg-red-500" /></span>{L('لايف', 'LIVE')}</> : dayFmt.format(Date.parse(b.start_at))}
              </p>
              <p className="mt-1 text-white/70">{ar ? b.service_name_ar : b.service_name_en || b.service_name_ar}</p>
            </div>
            <div className="w-full rounded-[2rem] border border-[#C9A24B]/30 bg-white/5 p-6 backdrop-blur">
              <p className="text-sm text-white/70">{L('فاضل على دورك', 'Time to your turn')}</p>
              <p className="font-latin text-6xl font-black tabular-nums tracking-tight text-[#C9A24B]" dir="ltr">{hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`}</p>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-white/80"><Clock className="size-4" />{L('معادك', 'Your time')} <span className="font-latin font-bold">{timeFmt.format(target)}</span></p>
            </div>
            {isToday && t ? (
              <div className="grid w-full grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/5 p-4"><Users className="mx-auto size-5 text-[#C9A24B]" /><p className="mt-1 font-latin text-4xl font-black">{t.ahead}</p><p className="text-xs text-white/70">{L('قدامك', 'Ahead of you')}</p></div>
                <div className="rounded-2xl bg-white/5 p-4"><Hourglass className="mx-auto size-5 text-[#C9A24B]" /><p className="mt-1 text-lg font-bold">{t.busy_now ? L('الكرسي مشغول', 'Chair busy') : L('الكرسي فاضي', 'Chair free')}</p><p className="text-xs text-white/70">{L('دلوقتي', 'Right now')}</p></div>
              </div>
            ) : null}
            {t && t.late_min > 0 ? <p className="rounded-full bg-amber-500/15 px-4 py-2 text-sm text-amber-300">{L(`الشغل متأخر حوالي ${t.late_min} دقيقة — الوقت فوق محسوب`, `Running ~${t.late_min} min late — included above`)}</p> : null}
            <p className="text-xs text-white/50">{L('الشاشة بتتحدّث لوحدها وهتنوّر وتهزّ لما ينادوا عليك. ضيفها على الشاشة الرئيسية من «مشاركة ← إضافة للشاشة الرئيسية».', 'Updates live and lights up when you are called. Add it to your home screen from Share → Add to Home Screen.')}</p>
          </>
        )}
        {np ? (
          <p className="flex items-center justify-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            <Moon className="size-4" />{L(`صلاة ${PRAYER_NAMES[np.key]![0]} بعد`, `${PRAYER_NAMES[np.key]![1]} in`)} <span className="font-latin font-bold tabular-nums" dir="ltr">{fmtLeft(np.at - now)}</span>
          </p>
        ) : null}
      </main>
    </div>
  );
}
