import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { BellRing, CalendarCheck, Clock, Hourglass, ListPlus, Maximize, Minimize, Moon, Scissors, Sparkles, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCairoTime } from '@/lib/time';
import { galleryUrl } from '@/features/gallery/useGallery';
import { productImg } from '@/features/products/useStore';
import { appUrl, assetUrl } from '@/lib/urls';
import { cn } from '@/lib/cn';
import { PRAYER_NAMES, fmtLeft, nextPrayer, usePrayerTimes } from '@/lib/usePrayer';
import { stripAyahMarks, useFaithRotator } from '@/lib/useFaith';
import {
  displayName,
  formatDuration,
  minutesUntil,
  normalizeLayout,
  parseBoard,
  progress,
  svcText,
  type Board,
  type BoardBarber,
  type ScreenLayout,
} from './board';

const POLL_MS = 20_000;
const TICK_MS = 5_000;
const SIZE: Record<ScreenLayout['text_size'], number> = { m: 0.9, l: 1, xl: 1.15 };
const ADMIN_ORIGIN = (() => {
  try {
    return new URL(import.meta.env.VITE_ADMIN_URL || 'https://tito-admin-4q8m.pages.dev').origin;
  } catch {
    return '';
  }
})();

/** حجم الخط بوحدة الشاشة (بيكبر ويصغر مع مقاس التلفزيون) */
const fs = (n: number): CSSProperties => ({ fontSize: `calc(var(--u) * ${n})` });

function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    type Sentinel = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } };
    let lock: Sentinel | null = null;
    const req = () => {
      if (document.visibilityState === 'visible' && nav.wakeLock) {
        nav.wakeLock.request('screen').then((l) => (lock = l)).catch(() => undefined);
      }
    };
    req();
    document.addEventListener('visibilitychange', req);
    return () => {
      document.removeEventListener('visibilitychange', req);
      void lock?.release().catch(() => undefined);
    };
  }, [on]);
}

function useNoIndex() {
  useEffect(() => {
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex,nofollow';
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
}

function cairoYmd(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(ms);
}

/** "النهارده" / "بكرة" / "يوم التلات" */
function dayLabel(iso: string, nowMs: number, ar: boolean): string {
  const d = cairoYmd(new Date(iso).getTime());
  if (d === cairoYmd(nowMs)) return ar ? 'النهارده' : 'today';
  if (d === cairoYmd(nowMs + 86_400_000)) return ar ? 'بكرة' : 'tomorrow';
  const wd = new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-US', { timeZone: 'Africa/Cairo', weekday: 'long' }).format(new Date(iso));
  return ar ? `يوم ${wd}` : `on ${wd}`;
}

/** شاشة الدور في المحل: لينك سري من غير تسجيل دخول، بتتحدث لوحدها */
export default function QueueScreenPage() {
  const { token = '' } = useParams();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const preview = params.get('preview') === '1';
  useWakeLock(!preview);
  useNoIndex();
  const [now, setNow] = useState(() => Date.now());
  const [isFull, setIsFull] = useState(false);
  const [override, setOverride] = useState<ScreenLayout | null>(null);

  const callQ = useQuery({
    queryKey: ['queue-called', token],
    enabled: token.length >= 32 && !preview,
    refetchInterval: 8_000,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      const r = await (supabase.rpc.bind(supabase) as unknown as (f: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)('queue_called', { p_token: token });
      if (r.error) return null;
      return (r.data ?? {}) as { name?: string | null; called_at?: string | null; late_min?: number | null };
    },
  });
  const prayers = usePrayerTimes();
  const np = nextPrayer(prayers.data, now);
  const calledName = callQ.data?.called_at && now - Date.parse(callQ.data.called_at) < 45_000 ? (callQ.data.name || '—') : null;

  const q = useQuery({
    queryKey: ['queue-board', token],
    enabled: token.length >= 32,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: 3,
    queryFn: async (): Promise<Board | null> => {
      const { data, error } = await supabase.rpc('queue_board', { p_token: token });
      if (error) throw error;
      return parseBoard(data);
    },
  });
  const { refetch } = q;

  // أي تغيير في الحجوزات بيوصل لحظياً على قناة باسم اللينك السري
  useEffect(() => {
    if (token.length < 32) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`queue-${token}`)
      .on('broadcast', { event: 'changed' }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => void refetch(), 800);
      })
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [token, refetch]);

  // معاينة من لوحة التحكم: الإعدادات بتتغير قبل الحفظ
  useEffect(() => {
    if (!preview) return;
    const on = (e: MessageEvent) => {
      if (e.origin !== ADMIN_ORIGIN) return;
      const d = e.data as { type?: string; layout?: unknown } | null;
      if (d && d.type === 'tito-screen-layout') setOverride(normalizeLayout(d.layout));
    };
    window.addEventListener('message', on);
    window.parent?.postMessage({ type: 'tito-screen-ready' }, ADMIN_ORIGIN || '*');
    return () => window.removeEventListener('message', on);
  }, [preview]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const on = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  const board = q.data;
  const layout = override ?? board?.layout ?? normalizeLayout({});
  const qLang = params.get('lang');
  const ar = (qLang === 'en' || qLang === 'ar' ? qLang : layout.lang) === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  if (token.length < 32 || (q.isFetched && board === null)) {
    return (
      <div dir={ar ? 'rtl' : 'ltr'} className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-espresso p-8 text-center font-arabic text-cream">
        <img src={assetUrl('brand/tito-logo-horizontal-gold-on-dark-1200.png')} alt="tito" className="w-[min(60vw,420px)]" />
        <p className="text-[clamp(1.2rem,3vw,2rem)]">{L('اللينك ده مش شغال. اطلب اللينك الجديد من صاحب المحل.', 'This link is not active. Ask the shop owner for the new link.')}</p>
      </div>
    );
  }

  const rootStyle = { '--f': String(SIZE[layout.text_size]) } as CSSProperties;
  const clock = new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' }).format(now);
  const date = new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long' }).format(now);

  return (
    <div
      dir={ar ? 'rtl' : 'ltr'}
      lang={ar ? 'ar' : 'en'}
      style={rootStyle}
      className="tito-screen relative flex h-dvh flex-col overflow-hidden bg-espresso font-arabic text-cream"
    >
      <ScreenStyles />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(204,149,66,0.22),transparent_60%)]" />

      {/* الشريط العلوي */}
      <header className="relative flex shrink-0 items-center justify-between gap-[calc(var(--u)*2)] px-[calc(var(--u)*3.5)] py-[calc(var(--u)*1.8)]">
        <div className="flex items-center gap-[calc(var(--u)*1.4)]">
          <img src={assetUrl('brand/tito-icon-gold-on-dark-512.png')} alt="" style={{ height: 'calc(var(--u) * 6.5)' }} className="w-auto rounded-full" />
          <span style={fs(5.2)} className="font-latin font-bold lowercase tracking-wide text-gold">tito</span>
        </div>
        {board ? <ShopStatus board={board} now={now} ar={ar} /> : null}
        <div className="flex items-center gap-[calc(var(--u)*2)]">
          <div className="text-end leading-tight">
            {layout.show_clock ? <p style={fs(5)} className="font-latin font-semibold tabular-nums text-gold-soft">{clock}</p> : null}
            {layout.show_clock ? <p style={fs(2)} className="text-cream/60">{date}</p> : null}
            {np && layout.show_prayer ? (
              <p style={fs(2.1)} className="mt-[0.2em] flex items-center justify-end gap-[0.35em] font-semibold text-emerald-300">
                <Moon style={{ width: '1em', height: '1em' }} />{L(`${PRAYER_NAMES[np.key]![0]} بعد`, `${PRAYER_NAMES[np.key]![1]} in`)} <span className="font-latin tabular-nums" dir="ltr">{fmtLeft(np.at - now)}</span>
              </p>
            ) : null}
          </div>
          {!preview ? (
            <button type="button" onClick={toggleFull} aria-label={L('شاشة كاملة', 'Full screen')} className="rounded-full bg-white/5 p-[calc(var(--u)*1.2)] text-cream/40 transition hover:bg-white/15 hover:text-cream">
              {isFull ? <Minimize style={{ width: 'calc(var(--u)*2.6)', height: 'calc(var(--u)*2.6)' }} /> : <Maximize style={{ width: 'calc(var(--u)*2.6)', height: 'calc(var(--u)*2.6)' }} />}
            </button>
          ) : null}
        </div>
      </header>

      {!board ? (
        <div style={fs(4)} className="flex flex-1 items-center justify-center text-cream/70">{L('بيحمّل…', 'Loading…')}</div>
      ) : (
        <main className="relative flex min-h-0 flex-1 flex-col gap-[calc(var(--u)*2)] px-[calc(var(--u)*3.5)] pb-[calc(var(--u)*2)] landscape:flex-row">
          <section className={cn('flex min-h-0 flex-col gap-[calc(var(--u)*2)]', layout.show_side ? 'flex-1 landscape:w-[58%] landscape:flex-none' : 'flex-1')}>
            <div className={cn('grid min-h-0 flex-1 gap-[calc(var(--u)*2)]', board.barbers.length > 1 ? 'landscape:grid-cols-2' : 'grid-cols-1')}>
              {board.barbers.map((b) => (
                <BarberPanel key={b.id} b={b} layout={layout} now={now} ar={ar} compact={board.barbers.length > 1} nextSlot={board.nextSlot} />
              ))}
            </div>
          </section>

          {!layout.show_side && (layout.show_qr || (layout.show_waitlist && board.waitlist.length > 0)) ? (
            <aside className="flex shrink-0 flex-col justify-end gap-[calc(var(--u)*2)] landscape:w-[28%]">
              {layout.show_waitlist && board.waitlist.length > 0 ? <div className="flex"><WaitlistCard board={board} ar={ar} /></div> : null}
              {layout.show_qr ? <QrCard ar={ar} /> : null}
            </aside>
          ) : null}

          {layout.show_side ? (
            <aside className="flex min-h-0 flex-1 flex-col gap-[calc(var(--u)*2)]">
              <SideShow board={board} layout={layout} ar={ar} />
              {layout.show_qr || (layout.show_waitlist && board.waitlist.length > 0) ? (
                <div className="flex shrink-0 gap-[calc(var(--u)*2)]">
                  {layout.show_waitlist && board.waitlist.length > 0 ? <WaitlistCard board={board} ar={ar} /> : null}
                  {layout.show_qr ? <QrCard ar={ar} /> : null}
                </div>
              ) : null}
            </aside>
          ) : null}
        </main>
      )}

      {callQ.data?.late_min ? (
        <div style={fs(2.4)} className="relative shrink-0 bg-amber-500/15 py-[0.35em] text-center font-semibold text-amber-200">
          {L(`⏱️ الشغل متأخر حوالي ${callQ.data.late_min} دقيقة — شكراً لصبركم`, `⏱️ Running about ${callQ.data.late_min} min late — thanks for your patience`)}
        </div>
      ) : null}
      {board ? <Ticker board={board} layout={layout} now={now} ar={ar} /> : null}
      {calledName ? (
        <div className="absolute inset-0 z-50 flex animate-[tito-fade_.4s_ease-out] flex-col items-center justify-center gap-[calc(var(--u)*2)] bg-espresso/95 backdrop-blur">
          <span className="relative flex items-center justify-center" style={{ width: 'calc(var(--u)*22)', height: 'calc(var(--u)*22)' }}>
            <span className="absolute inset-0 animate-ping rounded-full bg-gold/25" />
            <span className="relative flex size-full items-center justify-center rounded-full bg-gold text-espresso shadow-[0_0_80px_rgba(204,149,66,.55)]"><BellRing style={{ width: '45%', height: '45%' }} /></span>
          </span>
          <p style={fs(5)} className="text-cream/80">{L('الدور على', 'Now serving')}</p>
          <p style={fs(11)} className="font-black text-gold">{calledName === '—' ? L('العميل التالي', 'Next customer') : calledName}</p>
          <p style={fs(3)} className="text-cream/70">{L('اتفضل على الكرسي 💈', 'Please take the chair 💈')}</p>
        </div>
      ) : null}
    </div>
  );
}

function ScreenStyles() {
  return (
    <style>{`
      @keyframes tito-fade { from { opacity: 0; transform: scale(1.015) } to { opacity: 1; transform: none } }
      @keyframes tito-marquee-ltr { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      @keyframes tito-marquee-rtl { from { transform: translateX(0) } to { transform: translateX(50%) } }
      @keyframes tito-pulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }
      .tito-screen { --u: calc(min(1vh, 0.5625vw) * var(--f, 1)) }
      @media (orientation: portrait) { .tito-screen { --u: calc(min(0.72vh, 1.75vw) * var(--f, 1)) } }
      .tito-fade { animation: tito-fade .7s ease-out both }
      .tito-pulse { animation: tito-pulse 2s ease-in-out infinite }
      @media (prefers-reduced-motion: reduce) { .tito-fade, .tito-pulse { animation: none } }
    `}</style>
  );
}

function ShopStatus({ board, now, ar }: { board: Board; now: number; ar: boolean }) {
  const open = board.shopState === 'open';
  const text = open
    ? ar ? 'مفتوحين دلوقتي' : 'Open now'
    : board.reopen
      ? ar ? `راجعين ${dayLabel(board.reopen, now, true)} ${formatCairoTime(board.reopen, 'ar')}` : `Back ${dayLabel(board.reopen, now, false)} at ${formatCairoTime(board.reopen, 'en')}`
      : ar ? 'مقفولين دلوقتي' : 'Closed now';
  return (
    <div style={fs(2.6)} className={cn('hidden items-center gap-[calc(var(--u)*1.2)] rounded-full px-[calc(var(--u)*2.4)] py-[calc(var(--u)*0.9)] font-semibold sm:flex', open ? 'bg-success/25 text-[#9BE7BE]' : 'bg-danger/25 text-[#FFB4AB]')}>
      <span className={cn('inline-block rounded-full', open ? 'tito-pulse bg-[#5EE0A0]' : 'bg-[#FF8A80]')} style={{ width: 'calc(var(--u)*1.3)', height: 'calc(var(--u)*1.3)' }} />
      {text}
    </div>
  );
}

function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p style={fs(2.1)} className={cn('font-medium tracking-wide text-cream/55', className)}>{children}</p>;
}

function BarberPanel({ b, layout, now, ar, compact, nextSlot }: { b: BoardBarber; layout: ScreenLayout; now: number; ar: boolean; compact: boolean; nextSlot: string | null }) {
  const k = compact ? 0.8 : 1;
  const nextUp = b.next[0] ?? null;
  const rest = b.next.slice(1);
  const away = (b.state === 'closed' || b.state === 'off') && !b.now;
  const stateText: Record<BoardBarber['state'], [string, string, string]> = {
    busy: ['شغّال', 'Busy', 'bg-gold/25 text-gold-soft'],
    open: ['فاضي', 'Free', 'bg-success/25 text-[#9BE7BE]'],
    off: ['استراحة', 'On a break', 'bg-white/10 text-cream/70'],
    closed: ['مقفول', 'Closed', 'bg-danger/25 text-[#FFB4AB]'],
  };
  let [sAr, sEn, sCls] = stateText[b.state];
  // مش فاضي فعلاً (دقايق قبل حجز / تظبيط المحل): «جاهز للدور» بدل «فاضي»
  if (b.state === 'open' && !b.free_now) [sAr, sEn, sCls] = ['جاهز للدور', 'Ready for next', 'bg-gold/20 text-gold-soft'];
  if (b.state === 'off' && b.reopen && cairoYmd(new Date(b.reopen).getTime()) !== cairoYmd(now)) [sAr, sEn] = ['إجازة', 'On leave'];
  const showSvc = layout.show_services;

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[calc(var(--u)*2.4)] border border-gold/25 bg-white/[0.04] p-[calc(var(--u)*2.6)] shadow-2xl">
      {/* الحلاق */}
      <div className="flex items-center gap-[calc(var(--u)*1.8)] border-b border-gold/15 pb-[calc(var(--u)*1.6)]">
        {b.photo ? (
          <img src={b.photo} alt="" className="rounded-full object-cover ring-2 ring-gold/60" style={{ width: `calc(var(--u)*${7 * k})`, height: `calc(var(--u)*${7 * k})` }} />
        ) : (
          <span className="flex items-center justify-center rounded-full bg-gold/20 text-gold" style={{ width: `calc(var(--u)*${7 * k})`, height: `calc(var(--u)*${7 * k})` }}><Scissors className="size-1/2" /></span>
        )}
        <h2 style={fs(4.2 * k)} className="min-w-0 flex-1 truncate font-bold text-gold">{(!ar && b.name_en) || b.name}</h2>
        <span style={fs(2.2 * k)} className={cn('shrink-0 rounded-full px-[calc(var(--u)*1.8)] py-[calc(var(--u)*0.6)] font-semibold', sCls)}>{ar ? sAr : sEn}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[calc(var(--u)*1.4)] pt-[calc(var(--u)*1.4)]">
        {away ? (
          <AwayBlock b={b} layout={layout} now={now} ar={ar} k={k} nextSlot={nextSlot} />
        ) : layout.show_now ? (
          <NowBlock b={b} layout={layout} now={now} ar={ar} k={k} />
        ) : null}

        {layout.show_next && nextUp ? (
          <div className="shrink-0 rounded-[calc(var(--u)*1.8)] bg-gradient-to-l from-gold/30 to-gold/10 px-[calc(var(--u)*2)] py-[calc(var(--u)*1.5)] ring-1 ring-gold/40">
            <Label className="text-gold-soft">{away ? (ar ? 'أول حجز' : 'First booking') : ar ? 'عليه الدور' : 'Up next'}</Label>
            <div className="flex items-end justify-between gap-[calc(var(--u)*2)]">
              <div className="min-w-0">
                <p style={fs((layout.name_style === 'full' ? 5.6 : 6.8) * k)} className="truncate font-bold leading-[1.15] text-cream">{displayName(nextUp.name, ar)}</p>
                {showSvc && nextUp.svc ? <SvcLine text={svcText(nextUp.svc, ar)} size={2.6 * k} /> : null}
              </div>
              <div className="shrink-0 text-end leading-tight">
                <p style={fs(4.2 * k)} className="font-bold text-gold-soft">
                  {minutesUntil(nextUp.at, now) <= 0 ? (ar ? 'دلوقتي' : 'Now') : `${ar ? 'بعد' : 'in'} ${formatDuration(minutesUntil(nextUp.at, now), ar)}`}
                </p>
                {layout.show_times ? <p style={fs(2.4 * k)} className="font-latin text-cream/65">{formatCairoTime(nextUp.at, ar ? 'ar' : 'en')}</p> : null}
              </div>
            </div>
          </div>
        ) : null}

        {layout.show_list && rest.length ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Label>{ar ? 'بعده' : 'After that'}</Label>
            {/* اللي مش هيلحق يظهر كامل بيتخبى بدل ما يتقص من النص */}
            <ol className="mt-[calc(var(--u)*0.4)] flex min-h-0 flex-1 flex-col flex-wrap content-start overflow-hidden">
              {rest.map((n, i) => (
                <li key={`${n.at}-${i}`} className="flex w-full items-baseline justify-between gap-[calc(var(--u)*2)] border-b border-[#fff]/10 py-[calc(var(--u)*0.7)]">
                  <span className="min-w-0">
                    <span style={fs(3.3 * k)} className="block truncate">
                      <span className="font-latin text-gold-soft">{i + 2}.</span> {displayName(n.name, ar)}
                    </span>
                    {showSvc && n.svc ? <span style={fs(2 * k)} className="block truncate text-cream/55">{svcText(n.svc, ar)}</span> : null}
                  </span>
                  <span style={fs(2.3 * k)} className="shrink-0 text-cream/65">
                    {layout.show_times ? <span className="font-latin">{formatCairoTime(n.at, ar ? 'ar' : 'en')}</span> : null}
                    {layout.show_times ? ' · ' : ''}
                    {`${ar ? 'بعد' : 'in'} ${formatDuration(minutesUntil(n.at, now), ar)}`}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {layout.show_wait && !away ? <StatusBar b={b} layout={layout} now={now} ar={ar} k={k} /> : null}
      </div>
    </section>
  );
}

function NowBlock({ b, layout, now, ar, k }: { b: BoardBarber; layout: ScreenLayout; now: number; ar: boolean; k: number }) {
  if (!b.now) {
    if (!b.free_now) return null;
    const idle = (ar ? layout.idle_ar : layout.idle_en) || (ar ? 'الكرسي فاضي — اتفضل' : 'Chair is free — come on in');
    return (
      <div className="flex items-center gap-[calc(var(--u)*1.6)] rounded-[calc(var(--u)*1.8)] bg-success/15 p-[calc(var(--u)*2)] ring-1 ring-success/40">
        <Sparkles className="shrink-0 text-[#9BE7BE]" style={{ width: `calc(var(--u)*${5 * k})`, height: `calc(var(--u)*${5 * k})` }} aria-hidden />
        <p style={fs(5 * k)} className="font-bold leading-tight text-[#CFF5E1]">{idle}</p>
      </div>
    );
  }
  const left = minutesUntil(b.now.until, now);
  const pct = progress(b.now.start, b.now.until, now);
  return (
    <div className="shrink-0 rounded-[calc(var(--u)*1.8)] bg-white/[0.05] px-[calc(var(--u)*2)] py-[calc(var(--u)*1.5)]">
      <Label>{ar ? 'في الكرسي دلوقتي' : 'In the chair'}</Label>
      <div className="flex items-end justify-between gap-[calc(var(--u)*2)]">
        <div className="min-w-0">
          <p style={fs((layout.name_style === 'full' ? 4.6 : 5.4) * k)} className="truncate font-bold leading-[1.15]">{displayName(b.now.name, ar)}</p>
          {layout.show_services && b.now.svc ? <SvcLine text={svcText(b.now.svc, ar)} size={2.4 * k} /> : null}
        </div>
        <p style={fs(3 * k)} className="shrink-0 font-semibold text-cream/75">{left <= 0 ? (ar ? 'بيخلّص' : 'Finishing') : `${ar ? 'فاضل' : ''} ${formatDuration(left, ar)}${ar ? '' : ' left'}`}</p>
      </div>
      <div className="mt-[calc(var(--u)*1.2)] overflow-hidden rounded-full bg-white/10" style={{ height: 'calc(var(--u)*0.9)' }}>
        <div className="h-full rounded-full bg-gradient-to-l from-gold-soft to-gold transition-[width] duration-1000" style={{ width: `${Math.round(pct * 100)}%` }} />
      </div>
    </div>
  );
}

function AwayBlock({ b, layout, now, ar, k, nextSlot }: { b: BoardBarber; layout: ScreenLayout; now: number; ar: boolean; k: number; nextSlot: string | null }) {
  const mins = b.reopen ? minutesUntil(b.reopen, now) : 0;
  const sameDay = b.reopen ? cairoYmd(new Date(b.reopen).getTime()) === cairoYmd(now) : false;
  // راجع يوم تاني وهو المفروض شغال النهارده = إجازة مش استراحة
  const vacation = b.state === 'off' && !!b.reopen && !sameDay;
  const title = (ar ? layout.closed_ar : layout.closed_en)
    || (vacation ? (ar ? 'في إجازة' : 'On leave') : b.state === 'off' ? (ar ? 'في استراحة دلوقتي' : 'On a break') : ar ? 'مقفولين دلوقتي' : 'Closed now');
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-[calc(var(--u)*0.9)] rounded-[calc(var(--u)*1.8)] bg-white/[0.04] p-[calc(var(--u)*2)] text-center">
      <Moon className="text-gold" style={{ width: `calc(var(--u)*${4.5 * k})`, height: `calc(var(--u)*${4.5 * k})` }} aria-hidden />
      <p style={fs(5 * k)} className="font-bold leading-tight">{title}</p>
      {b.reopen ? (
        <>
          <p style={fs(3.4 * k)} className="text-gold-soft">
            {ar ? `راجعين ${dayLabel(b.reopen, now, true)} الساعة ${formatCairoTime(b.reopen, 'ar')}` : `Back ${dayLabel(b.reopen, now, false)} at ${formatCairoTime(b.reopen, 'en')}`}
          </p>
          {sameDay && mins > 0 ? <p style={fs(2.6 * k)} className="text-cream/60">{ar ? `بعد ${formatDuration(mins, true)}` : `in ${formatDuration(mins, false)}`}</p> : null}
        </>
      ) : null}
      {layout.show_qr && (b.slot || nextSlot) ? <p style={fs(2.4 * k)} className="text-cream/55">{ar ? 'تقدر تحجز من موبايلك دلوقتي' : 'You can book from your phone now'}</p> : null}
    </div>
  );
}

function SvcLine({ text, size }: { text: string; size: number }) {
  return (
    <p style={fs(size)} className="mt-[calc(var(--u)*0.3)] flex min-w-0 items-center gap-[calc(var(--u)*0.8)] text-gold-soft/90">
      <Scissors className="size-[0.9em] shrink-0 opacity-70" aria-hidden />
      <span className="truncate">{text}</span>
    </p>
  );
}

/** الشريط اللي تحت: «اتفضل» بس لو فاضي فعلاً، وإلا أقرب معاد يتحجز، وإلا قايمة الانتظار */
function StatusBar({ b, layout, now, ar, k }: { b: BoardBarber; layout: ScreenLayout; now: number; ar: boolean; k: number }) {
  const base = 'flex shrink-0 items-center gap-[calc(var(--u)*1.2)] rounded-[calc(var(--u)*1.4)] px-[calc(var(--u)*2)] py-[calc(var(--u)*1.2)] font-semibold';
  const icon = 'size-[1.1em] shrink-0';
  if (b.free_now && !b.now) {
    return (
      <div style={fs(3 * k)} className={cn(base, 'bg-success/25 text-[#9BE7BE]')}>
        <Clock className={icon} aria-hidden />
        {ar ? 'مفيش انتظار — اتفضل' : 'No wait — come on in'}
      </div>
    );
  }
  if (b.slot) {
    const mins = minutesUntil(b.slot, now);
    return (
      <div style={fs(3 * k)} className={cn(base, 'bg-white/[0.06] text-gold-soft')}>
        <CalendarCheck className={icon} aria-hidden />
        <span className="min-w-0 truncate">
          {ar ? `أقرب معاد متاح الساعة ${formatCairoTime(b.slot, 'ar')}` : `Next free slot at ${formatCairoTime(b.slot, 'en')}`}
          {mins > 0 ? <span className="font-normal text-cream/55">{ar ? ` · بعد ${formatDuration(mins, true)}` : ` · in ${formatDuration(mins, false)}`}</span> : null}
        </span>
      </div>
    );
  }
  if (b.day_full && layout.show_waitlist) {
    return (
      <div style={fs(2.8 * k)} className={cn(base, 'bg-white/[0.06] text-cream/80')}>
        <ListPlus className={cn(icon, 'text-gold-soft')} aria-hidden />
        <span className="min-w-0 truncate">{ar ? 'المواعيد النهارده خلصت — سجّل في قايمة الانتظار' : 'Fully booked today — join the waitlist'}</span>
      </div>
    );
  }
  return null;
}

type Slide =
  | { kind: 'photo'; src: string; caption: string | null }
  | { kind: 'review'; name: string; rating: number; comment: string }
  | { kind: 'offers'; lines: string[] }
  | { kind: 'products'; items: Board['products'] }
  | { kind: 'faith'; n: number };

/** العمود الجانبي: صور الشغل والتقييمات والعروض بتتقلّب لوحدها */
function SideShow({ board, layout, ar }: { board: Board; layout: ScreenLayout; ar: boolean }) {
  const faithCfg = useFaithRotator({ auto: false, fetch: false });
  const faithOn = faithCfg.enabled;
  const slides0 = useMemo<Slide[]>(() => {
    const photos: Slide[] = layout.side.gallery ? board.gallery.map((g) => ({ kind: 'photo', src: galleryUrl(g.full), caption: (ar ? g.caption_ar : g.caption_en) ?? null })) : [];
    const reviews: Slide[] = layout.side.reviews ? board.reviews.filter((r) => r.rating >= layout.reviews_min).map((r) => ({ kind: 'review', ...r })) : [];
    const offerLines = layout.side.offers
      ? [
          ...((ar ? board.offers_ar : board.offers_en) || '').split('\n').map((s) => s.trim()).filter(Boolean),
          ...board.packages.map((p) => (ar ? `${p.name_ar}: ${p.sessions} حلاقات بـ ${p.price} ج` : `${p.name_en || p.name_ar}: ${p.sessions} cuts for EGP ${p.price}`)),
        ]
      : [];
    // المنتجات: كل صفحة فيها لحد 4 منتجات
    const prodPages: Slide[] = [];
    if (layout.side.products) for (let k = 0; k < board.products.length; k += 4) prodPages.push({ kind: 'products', items: board.products.slice(k, k + 4) });
    // ترتيب: صورتين ← تقييم ← ... والعروض كل 5 والمنتجات كل 4
    const out: Slide[] = [];
    let mi = 0;
    let pi = 0;
    let ri = 0;
    const total = photos.length + reviews.length;
    for (let i = 0; i < total; i++) {
      if (offerLines.length && i % 5 === 0) out.push({ kind: 'offers', lines: offerLines });
      if (prodPages.length && i % 4 === 3) out.push(prodPages[mi++ % prodPages.length]!);
      const wantReview = (i % 3 === 2 && ri < reviews.length) || pi >= photos.length;
      const s = wantReview ? reviews[ri++] : photos[pi++];
      if (s) out.push(s);
    }
    if (!out.length && offerLines.length) out.push({ kind: 'offers', lines: offerLines });
    // لو مفيش صور ولا تقييمات كفاية: المنتجات كلها تتعرض برضه
    if (out.length < 4) for (const pp of prodPages) if (!out.includes(pp)) out.push(pp);
    return out;
  }, [board, layout, ar]);
  // آية / حديث بالشرح
  const slides = useMemo<Slide[]>(() => {
    const f = faithOn ? [0, 1, 2].map((n) => ({ kind: 'faith', n }) as Slide) : [];
    if (!f.length) return slides0;
    if (!slides0.length) return f;
    // بتبدأ بآية/حديث، وبعدها واحدة كل شريحتين
    const out: Slide[] = [f[0]!];
    let k = 1;
    slides0.forEach((sl, n) => { out.push(sl); if (n % 2 === 1) out.push(f[k++ % f.length]!); });
    return out;
  }, [slides0, faithOn]);

  const [i, setI] = useState(0);
  const count = slides.length;
  const s = slides[i % Math.max(1, count)];
  // الآية/الحديث بياخدوا وقت أطول عشان الشرح يتقري
  const dwell = s?.kind === 'faith' ? faithCfg.interval : layout.slide_seconds;
  useEffect(() => {
    if (count < 2) return;
    const id = setTimeout(() => setI((x) => (x + 1) % count), dwell * 1000);
    return () => clearTimeout(id);
  }, [count, dwell, i]);

  // نحمّل الصورة الجاية بدري علشان التقليب يبقى ناعم
  const nextSlide = slides[(i + 1) % Math.max(1, count)];
  const preloaded = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (nextSlide?.kind === 'photo') {
      const im = new Image();
      im.src = nextSlide.src;
      preloaded.current = im;
    }
  }, [nextSlide]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[calc(var(--u)*2.4)] border border-gold/20 bg-black/25">
      {!s ? (
        <div className="flex h-full flex-col items-center justify-center gap-[calc(var(--u)*2)] p-[calc(var(--u)*3)] text-center">
          <Scissors className="text-gold" style={{ width: 'calc(var(--u)*9)', height: 'calc(var(--u)*9)' }} aria-hidden />
          <p style={fs(4.5)} className="font-bold">{ar ? 'أهلاً بيك في ' : 'Welcome to '}{board.shop || 'tito'}</p>
        </div>
      ) : s.kind === 'photo' ? (
        <figure key={`p-${i}`} className="tito-fade absolute inset-0">
          <img src={s.src} alt="" aria-hidden className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-2xl" />
          <img src={s.src} alt={s.caption ?? ''} className="relative size-full object-contain" />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-[calc(var(--u)*2.4)] pt-[calc(var(--u)*6)]">
            <p style={fs(3)} className="font-semibold">{s.caption || (ar ? 'من شغلنا ✂️' : 'Our work ✂️')}</p>
          </figcaption>
        </figure>
      ) : s.kind === 'products' ? (
        <div key={`m-${i}`} className="tito-fade flex h-full flex-col gap-[calc(var(--u)*1.6)] p-[calc(var(--u)*2.4)]">
          <div className="text-center">
            <p style={fs(2.4)} className="font-latin uppercase tracking-[0.3em] text-gold">{ar ? 'منتجاتنا' : 'Our products'}</p>
            <p style={fs(2.6)} className="text-cream/70">{ar ? 'احجزها من الموقع وخدها مع حلاقتك' : 'Reserve on our site, pick up with your cut'}</p>
          </div>
          <ul className={cn('grid min-h-0 flex-1 gap-[calc(var(--u)*1.4)]', s.items.length > 1 ? 'grid-cols-2' : 'grid-cols-1')} style={{ gridAutoRows: '1fr' }}>
            {s.items.map((p) => (
              <li key={p.image} className="relative min-h-0 overflow-hidden rounded-[calc(var(--u)*1.6)] bg-black/30">
                <img src={productImg(p.image) ?? ''} alt="" className="absolute inset-0 size-full object-cover" />
                {p.featured ? <span style={fs(1.8)} className="absolute start-[calc(var(--u)*1)] top-[calc(var(--u)*1)] rounded-full bg-gold px-[calc(var(--u)*1.2)] font-bold text-espresso">{ar ? 'مميّز' : 'Featured'}</span> : null}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-[calc(var(--u)*1.4)] pt-[calc(var(--u)*5)]">
                  <p style={fs(2.6)} className="line-clamp-1 font-bold">{ar ? p.name_ar : p.name_en || p.name_ar}</p>
                  <p style={fs(2.8)} className="font-latin font-bold text-gold">{Math.round(p.price)} {ar ? 'ج' : 'EGP'}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : s.kind === 'faith' ? (
        <FaithSlide key={`f-${i}`} ar={ar} />
      ) : s.kind === 'review' ? (
        <div key={`r-${i}`} className="tito-fade flex h-full flex-col items-center justify-center gap-[calc(var(--u)*2.4)] p-[calc(var(--u)*4)] text-center">
          <div className="flex gap-[calc(var(--u)*0.6)]" aria-label={`${s.rating}/5`}>
            {Array.from({ length: 5 }).map((_, n) => (
              <Star key={n} className={n < s.rating ? 'fill-gold text-gold' : 'text-[#fff]/20'} style={{ width: 'calc(var(--u)*4.4)', height: 'calc(var(--u)*4.4)' }} aria-hidden />
            ))}
          </div>
          <blockquote style={fs(4.6)} className="font-bold leading-snug">“{s.comment}”</blockquote>
          {s.name ? <p style={fs(3)} className="text-gold-soft">— {s.name}</p> : null}
          <p style={fs(2)} className="font-latin uppercase tracking-[0.3em] text-cream/40">{ar ? 'آراء زباينّا' : 'Our customers say'}</p>
        </div>
      ) : (
        <div key={`o-${i}`} className="tito-fade flex h-full flex-col items-center justify-center gap-[calc(var(--u)*2.4)] p-[calc(var(--u)*4)] text-center">
          <p style={fs(2.4)} className="font-latin uppercase tracking-[0.3em] text-gold">{ar ? 'عروضنا' : 'Offers'}</p>
          <ul className="space-y-[calc(var(--u)*1.6)]">
            {s.lines.slice(0, 5).map((o) => (
              <li key={o} style={fs(4.4)} className="font-bold leading-tight">{o}</li>
            ))}
          </ul>
        </div>
      )}
      {count > 1 ? (
        <div className="absolute inset-x-0 top-[calc(var(--u)*1.4)] flex justify-center gap-[calc(var(--u)*0.6)]">
          {slides.slice(0, 24).map((_, n) => (
            <span key={n} className={cn('rounded-full transition-all', n === i % count ? 'bg-gold' : 'bg-white/25')} style={{ height: 'calc(var(--u)*0.6)', width: n === i % count ? 'calc(var(--u)*3)' : 'calc(var(--u)*0.6)' }} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** كل ما الشريحة تظهر بتجيب آية/حديث جديد من المخزن (من غير تكرار، وحسب المناسبة الهجرية) */
/** بيصغّر الكلام لحد ما يدخل في المساحة كله (من غير قص) — مهم للأحاديث الطويلة والشاشات الصغيرة */
function FitBox({ children, dep }: { children: ReactNode; dep: unknown }) {
  const box = useRef<HTMLDivElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const b = box.current, i = inner.current; if (!b || !i) return;
    const base = parseFloat(getComputedStyle(b.parentElement ?? b).getPropertyValue('--u')) || 8;
    let k = 1;
    i.style.setProperty('--u', `${base}px`);
    for (let n = 0; n < 12 && i.scrollHeight > b.clientHeight + 2 && k > 0.4; n++) { k *= 0.9; i.style.setProperty('--u', `${base * k}px`); }
  }, [dep]);
  return <div ref={box} className="h-full overflow-hidden"><div ref={inner} className="flex min-h-full flex-col justify-center">{children}</div></div>;
}

function FaithSlide({ ar }: { ar: boolean }) {
  const { item } = useFaithRotator({ auto: false });
  if (!item) return <div className="h-full" />;
  const main = item.kind === 'ayah' ? stripAyahMarks(item.text) : item.text;
  const expl = item.kind === 'ayah' ? item.tafsir : item.explanation;
  const big = main.length > 220 ? 3 : main.length > 130 ? 3.6 : 4.4;
  return (
    <FitBox dep={item.text}>
    <div dir="rtl" className="tito-fade flex flex-col justify-center gap-[calc(var(--u)*1.8)] bg-gradient-to-b from-emerald-950/40 to-transparent p-[calc(var(--u)*3.2)] pb-[calc(var(--u)*4.5)] text-center">
      <p style={fs(2.3)} className="font-semibold tracking-wide text-emerald-300">
        {item.kind === 'ayah' ? `﴿ ${item.surah} · ${item.num} ﴾` : (ar ? 'حديث شريف' : 'Hadith')}
      </p>
      <p style={fs(big)} className={cn('font-bold leading-[1.75] text-cream', item.kind === 'ayah' && 'font-arabic')}>
        {item.kind === 'ayah' ? `﴿${main}﴾` : main}
      </p>
      {expl ? (
        <div className="rounded-[calc(var(--u)*1.6)] bg-white/[0.06] p-[calc(var(--u)*1.8)] text-start">
          <p style={fs(1.9)} className="mb-[calc(var(--u)*0.5)] font-semibold text-gold">{item.kind === 'ayah' ? 'التفسير الميسّر' : 'الشرح'}</p>
          <p style={fs(2.3)} className="line-clamp-5 leading-relaxed text-cream/85">{expl}</p>
        </div>
      ) : null}
      <p style={fs(1.8)} className="text-cream/50">{item.kind === 'hadith' ? `${item.attribution} · ${item.grade}` : item.source}</p>
    </div>
    </FitBox>
  );
}

function WaitlistCard({ board, ar }: { board: Board; ar: boolean }) {
  return (
    <div className="min-w-0 flex-1 rounded-[calc(var(--u)*2)] border border-gold/20 bg-white/[0.04] p-[calc(var(--u)*2)]">
      <div style={fs(2.4)} className="flex items-center gap-[calc(var(--u)*1)] font-semibold text-gold-soft">
        <Hourglass className="size-[1.1em]" aria-hidden />
        {ar ? `مستنيين معاد (${board.waitlist.length})` : `Waiting list (${board.waitlist.length})`}
      </div>
      <div className="mt-[calc(var(--u)*1.2)] flex flex-wrap gap-[calc(var(--u)*0.8)]">
        {board.waitlist.slice(0, 8).map((w, n) => (
          <span key={`${w.at}-${n}`} style={fs(2.6)} className="rounded-full bg-white/10 px-[calc(var(--u)*1.6)] py-[calc(var(--u)*0.4)]">
            {w.name || (ar ? `عميل ${n + 1}` : `Guest ${n + 1}`)}
          </span>
        ))}
      </div>
      <p style={fs(1.9)} className="mt-[calc(var(--u)*1)] text-cream/50">{ar ? 'أول ما يفضى معاد هنبلّغكم' : "We'll notify you as soon as a slot opens"}</p>
    </div>
  );
}

function QrCard({ ar }: { ar: boolean }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    void QRCode.toDataURL(appUrl('book'), { margin: 1, width: 320, color: { dark: '#341A0E', light: '#FAF6F0' } })
      .then(setSrc)
      .catch(() => setSrc(''));
  }, []);
  if (!src) return null;
  return (
    <div className="flex shrink-0 items-center gap-[calc(var(--u)*1.6)] rounded-[calc(var(--u)*2)] border border-gold/20 bg-white/[0.04] p-[calc(var(--u)*1.6)]">
      <img src={src} alt="" className="rounded-[calc(var(--u)*0.8)]" style={{ width: 'calc(var(--u)*13)', height: 'calc(var(--u)*13)' }} />
      <div className="leading-tight">
        <p style={fs(3)} className="font-bold">{ar ? 'احجز من موبايلك' : 'Book from your phone'}</p>
        <p style={fs(2)} className="mt-[calc(var(--u)*0.6)] text-cream/60">{ar ? 'صوّر الكود بالكاميرا' : 'Scan with your camera'}</p>
      </div>
    </div>
  );
}

/** الشريط اللي تحت: إعلاناتك + آخر الحجوزات */
function Ticker({ board, layout, now, ar }: { board: Board; layout: ScreenLayout; now: number; ar: boolean }) {
  const items = useMemo(() => {
    const out: string[] = [];
    if (layout.show_ticker) {
      out.push(...((ar ? layout.ticker_ar : layout.ticker_en) || '').split('\n').map((s) => s.trim()).filter(Boolean));
    }
    if (layout.show_activity) {
      for (const a of board.activity.slice(0, 6)) {
        const who = a.name || (ar ? 'عميل' : 'A customer');
        out.push(ar ? `✂️ ${who} حجز ${dayLabel(a.at, now, true)} ${formatCairoTime(a.at, 'ar')}` : `✂️ ${who} booked ${dayLabel(a.at, now, false)} ${formatCairoTime(a.at, 'en')}`);
      }
    }
    return out;
  }, [board.activity, layout, ar, Math.floor(now / 60_000)]);
  if (!items.length) return null;
  const text = items.join('   •   ');
  const seconds = Math.max(25, Math.round(text.length / 4));
  const content = (
    <span className="inline-flex shrink-0 items-center gap-[calc(var(--u)*4)] pe-[calc(var(--u)*4)]">
      {items.map((t, n) => (
        <span key={n} className="whitespace-nowrap">{t}</span>
      ))}
    </span>
  );
  return (
    <footer className="relative flex shrink-0 items-center overflow-hidden border-t border-gold/20 bg-black/30" style={{ height: 'calc(var(--u)*6.5)' }}>
      <span style={fs(2.4)} className="z-10 flex h-full shrink-0 items-center gap-[calc(var(--u)*0.8)] bg-gold px-[calc(var(--u)*2.4)] font-bold text-espresso">
        <img src={assetUrl('brand/tito-icon-gold-on-dark-512.png')} alt="" className="h-[1.3em] w-[1.3em] rounded-full object-contain" />
        <span className="flex items-center gap-[0.3em] text-[0.62em] font-bold uppercase tracking-wide">
          <span className="relative flex size-[0.55em]"><span className="absolute inset-0 animate-ping rounded-full bg-red-600/70" /><span className="relative size-full rounded-full bg-red-600" /></span>
          {ar ? 'مباشر' : 'LIVE'}
        </span>
      </span>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div
          style={{ ...fs(2.8), animation: `${ar ? 'tito-marquee-rtl' : 'tito-marquee-ltr'} ${seconds}s linear infinite` }}
          className="flex w-max text-cream/90"
        >
          {content}
          <span aria-hidden className="contents">{content}</span>
        </div>
      </div>
    </footer>
  );
}
