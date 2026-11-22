import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Maximize, Minimize, Scissors } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCairoTime } from '@/lib/time';
import { galleryUrl } from '@/features/gallery/useGallery';
import { assetUrl } from '@/lib/urls';
import { cn } from '@/lib/cn';
import { parseBoard, isIdle, type Board } from './board';

const POLL_MS = 20_000;

/** عدد الأعمدة حسب عدد الحلاقين ومقاس الشاشة (موبايل/تابلت عمودي: تحت بعض) */
function gridCols(n: number): string {
  if (n <= 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-1 md:grid-cols-2';
  if (n === 3) return 'grid-cols-1 md:grid-cols-3';
  if (n === 4) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
  return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4';
}
const SLIDE_MS = 8_000;

/** لغة الشاشة: ?lang=en للإنجليزي، والعربي هو الأساسي */
function useScreenLang(): 'ar' | 'en' {
  return useMemo(() => (new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'ar'), []);
}

/** الشاشة متطفيش لوحدها (لو المتصفح بيدعم) */
function useWakeLock() {
  useEffect(() => {
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
  }, []);
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

/** شاشة الدور في المحل: لينك سري من غير تسجيل دخول، بتتحدث لوحدها */
export default function QueueScreenPage() {
  const { token = '' } = useParams();
  const lang = useScreenLang();
  const ar = lang === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  useWakeLock();
  useNoIndex();
  const [now, setNow] = useState(() => Date.now());
  const [isFull, setIsFull] = useState(false);

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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
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
  const clock = new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' }).format(now);

  if (token.length < 32 || (q.isFetched && board === null)) {
    return (
      <div dir={ar ? 'rtl' : 'ltr'} className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-espresso p-8 text-center text-cream">
        <img src={assetUrl('brand/tito-logo-horizontal-gold-on-dark-1200.png')} alt="tito" className="w-[min(60vw,420px)]" />
        <p className="text-[clamp(1.2rem,3vw,2rem)]">{L('اللينك ده مش شغال. اطلب اللينك الجديد من صاحب المحل.', 'This link is not active. Ask the shop owner for the new link.')}</p>
      </div>
    );
  }

  const idle = board ? isIdle(board) : false;

  return (
    <div dir={ar ? 'rtl' : 'ltr'} lang={lang} className="flex h-dvh flex-col overflow-hidden bg-espresso font-arabic text-cream">
      <header className="flex shrink-0 items-center justify-between gap-4 px-[3vw] py-[1.6vh]">
        <img src={assetUrl('brand/tito-logo-horizontal-gold-on-dark-1200.png')} alt={board?.shop || 'tito'} className="h-[clamp(2rem,6vh,4.5rem)] w-auto" />
        <div className="flex items-center gap-4">
          <span className="font-latin text-[clamp(1.4rem,4vh,3rem)] font-semibold tabular-nums text-gold-soft">{clock}</span>
          <button type="button" onClick={toggleFull} aria-label={L('شاشة كاملة', 'Full screen')} className="rounded-full bg-white/10 p-3 text-cream/80 hover:bg-white/20">
            {isFull ? <Minimize className="size-6" /> : <Maximize className="size-6" />}
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-[3vw] pb-[3vh]">
        {!board ? (
          <div className="flex h-full items-center justify-center text-[clamp(1.5rem,4vh,3rem)] text-cream/70">{L('بيحمّل…', 'Loading…')}</div>
        ) : idle ? (
          <IdleShow board={board} ar={ar} />
        ) : (
          <div className={cn('grid min-h-full auto-rows-fr gap-[2vh] sm:gap-[1.5vw]', gridCols(board.barbers.length))}>
            {board.barbers.map((b) => (
              <section key={b.id} className="flex min-h-0 flex-col overflow-hidden rounded-[2vh] border border-gold/30 bg-white/[0.04] p-[2.2vh]">
                <div className="flex items-center gap-3 border-b border-gold/20 pb-[1.5vh]">
                  {b.photo ? <img src={b.photo} alt="" className="size-[clamp(2.5rem,7vh,5rem)] rounded-full object-cover ring-2 ring-gold/60" /> : <span className="flex size-[clamp(2.5rem,7vh,5rem)] items-center justify-center rounded-full bg-gold/20 text-gold"><Scissors className="size-1/2" /></span>}
                  <h2 className="min-w-0 truncate text-[clamp(1.4rem,4.4vh,3.2rem)] font-bold text-gold">{b.name}</h2>
                </div>
                <div className="mt-[1.8vh]">
                  <p className="text-[clamp(0.9rem,2.2vh,1.4rem)] uppercase tracking-wide text-cream/60">{L('بيحلق دلوقتي', 'In the chair')}</p>
                  <p className="mt-1 truncate text-[clamp(1.8rem,6.5vh,4.5rem)] font-bold leading-tight">{b.now?.name || (b.now ? L('زبون', 'Guest') : '—')}</p>
                </div>
                <div className="mt-[2vh] min-h-0 flex-1">
                  <p className="text-[clamp(0.9rem,2.2vh,1.4rem)] uppercase tracking-wide text-cream/60">{L('اللي بعده', 'Up next')}</p>
                  {b.next.length ? (
                    <ol className="mt-1 space-y-[0.8vh]">
                      {b.next.map((n, i) => (
                        <li key={`${n.at}-${i}`} className="flex items-baseline justify-between gap-3 text-[clamp(1.2rem,3.8vh,2.6rem)]">
                          <span className="min-w-0 truncate"><span className="font-latin text-gold-soft">{i + 1}.</span> {n.name || L('زبون', 'Guest')}</span>
                          <span className="shrink-0 font-latin text-[0.7em] text-cream/70">{formatCairoTime(n.at, lang)}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-1 text-[clamp(1.1rem,3vh,2rem)] text-cream/50">{L('مفيش حد مستني', 'No one waiting')}</p>
                  )}
                </div>
                <div className={cn('mt-[1.5vh] flex items-center gap-2 rounded-[1.4vh] px-[1.6vh] py-[1.2vh] text-[clamp(1.1rem,3.2vh,2.2rem)] font-semibold', b.wait_min <= 0 ? 'bg-success/25 text-[#9BE7BE]' : 'bg-gold/20 text-gold-soft')}>
                  <Clock className="size-[1.1em] shrink-0" aria-hidden />
                  {b.wait_min <= 0 ? L('فاضي دلوقتي', 'Free now') : ar ? `الانتظار حوالي ${b.wait_min} دقيقة` : `Wait about ${b.wait_min} min`}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/** لما المحل فاضي: صور المعرض والعروض بتتقلّب لوحدها */
function IdleShow({ board, ar }: { board: Board; ar: boolean }) {
  const offers = useMemo(() => {
    const lines = ((ar ? board.offers_ar : board.offers_en) || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const pk = board.packages.map((p) => (ar ? `${p.name_ar}: ${p.sessions} حلاقات بـ ${p.price} ج` : `${p.name_en || p.name_ar}: ${p.sessions} cuts for EGP ${p.price}`));
    return [...lines, ...pk];
  }, [board, ar]);
  const slides = useMemo(() => {
    const out: Array<{ kind: 'photo'; src: string; caption: string | null } | { kind: 'offers' }> = board.gallery.map((g) => ({ kind: 'photo' as const, src: galleryUrl(g.full), caption: (ar ? g.caption_ar : g.caption_en) ?? null }));
    if (offers.length) {
      // العروض بتظهر كل 4 صور
      const withOffers: typeof out = [];
      out.forEach((s, i) => {
        if (i % 4 === 0) withOffers.push({ kind: 'offers' });
        withOffers.push(s);
      });
      return withOffers.length ? withOffers : [{ kind: 'offers' as const }];
    }
    return out;
  }, [board.gallery, offers.length, ar]);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [slides.length]);
  const s = slides[i % Math.max(1, slides.length)];

  if (!s) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
        <Scissors className="size-[12vh] text-gold" aria-hidden />
        <p className="text-[clamp(2rem,7vh,5rem)] font-bold">{ar ? 'أهلاً بيك في ' : 'Welcome to '}{board.shop || 'tito'}</p>
        <p className="text-[clamp(1.2rem,3.5vh,2.4rem)] text-cream/70">{ar ? 'مفيش انتظار دلوقتي — اتفضل' : 'No wait right now — come on in'}</p>
      </div>
    );
  }
  if (s.kind === 'offers') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-[3vh] text-center" key={`o-${i}`}>
        <p className="font-latin text-[clamp(1rem,2.6vh,1.6rem)] uppercase tracking-[0.3em] text-gold">{ar ? 'عروضنا' : 'Offers'}</p>
        <ul className="space-y-[2vh]">
          {offers.map((o) => (
            <li key={o} className="text-[clamp(1.6rem,5.5vh,4rem)] font-bold leading-tight">{o}</li>
          ))}
        </ul>
        <p className="text-[clamp(1.1rem,3vh,2rem)] text-gold-soft">{ar ? 'مفيش انتظار دلوقتي — اتفضل' : 'No wait right now — come on in'}</p>
      </div>
    );
  }
  return (
    <figure className="relative flex h-full items-center justify-center" key={`p-${i}`}>
      <img src={s.src} alt={s.caption ?? ''} className="max-h-full max-w-full rounded-[2vh] object-contain shadow-2xl" />
      <figcaption className="absolute inset-x-0 bottom-0 flex justify-center">
        <span className="rounded-t-[1.5vh] bg-black/55 px-[3vh] py-[1.2vh] text-[clamp(1.1rem,3.2vh,2.2rem)]">
          {s.caption || (ar ? 'من شغلنا ✂️ — مفيش انتظار دلوقتي' : 'Our work ✂️ — no wait right now')}
        </span>
      </figcaption>
    </figure>
  );
}
