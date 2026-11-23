import type { Json } from '@/types/database';

/* ───────── إعدادات الشاشة (بتتحفظ من لوحة التحكم) ───────── */

export type NameStyle = 'first' | 'full' | 'initial' | 'hidden';
export type TextSize = 'm' | 'l' | 'xl';

export type ScreenLayout = {
  /** مين في الكرسي دلوقتي */
  show_now: boolean;
  /** اللي عليه الدور + العدّ التنازلي */
  show_next: boolean;
  /** قايمة اللي بعده */
  show_list: boolean;
  /** الساعة جنب كل اسم */
  show_times: boolean;
  /** وقت الانتظار التقريبي */
  show_wait: boolean;
  name_style: NameStyle;
  /** الخدمة والإضافات تحت اسم العميل */
  show_services: boolean;
  /** العمود الجانبي (صور / تقييمات / عروض) */
  show_side: boolean;
  side: { gallery: boolean; reviews: boolean; offers: boolean; products: boolean };
  show_waitlist: boolean;
  /** شريط آخر الحجوزات تحت */
  show_activity: boolean;
  /** شريط الإعلانات تحت */
  show_ticker: boolean;
  /** QR للحجز */
  show_qr: boolean;
  ticker_ar: string;
  ticker_en: string;
  closed_ar: string;
  closed_en: string;
  idle_ar: string;
  idle_en: string;
  slide_seconds: number;
  text_size: TextSize;
  reviews_min: number;
  lang: 'ar' | 'en';
};

export const DEFAULT_LAYOUT: ScreenLayout = {
  show_now: true,
  show_next: true,
  show_list: true,
  show_times: true,
  show_wait: true,
  name_style: 'first',
  show_services: true,
  show_side: true,
  side: { gallery: true, reviews: true, offers: true, products: true },
  show_waitlist: true,
  show_activity: true,
  show_ticker: true,
  show_qr: true,
  ticker_ar: '',
  ticker_en: '',
  closed_ar: '',
  closed_en: '',
  idle_ar: '',
  idle_en: '',
  slide_seconds: 9,
  text_size: 'l',
  reviews_min: 4,
  lang: 'ar',
};

type Obj = { [k: string]: Json | undefined };
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** بيكمّل أي إعداد ناقص بالقيمة الافتراضية */
export function normalizeLayout(raw: unknown): ScreenLayout {
  const r = isObj(raw) ? raw : {};
  const d = DEFAULT_LAYOUT;
  const side = isObj(r.side) ? r.side : {};
  const ns = str(r.name_style);
  const ts = str(r.text_size);
  return {
    show_now: bool(r.show_now, d.show_now),
    show_next: bool(r.show_next, d.show_next),
    show_list: bool(r.show_list, d.show_list),
    show_times: bool(r.show_times, d.show_times),
    show_wait: bool(r.show_wait, d.show_wait),
    name_style: ns === 'initial' || ns === 'hidden' || ns === 'full' ? ns : 'first',
    show_services: bool(r.show_services, d.show_services),
    show_side: bool(r.show_side, d.show_side),
    side: { gallery: bool(side.gallery, true), reviews: bool(side.reviews, true), offers: bool(side.offers, true), products: bool(side.products, true) },
    show_waitlist: bool(r.show_waitlist, d.show_waitlist),
    show_activity: bool(r.show_activity, d.show_activity),
    show_ticker: bool(r.show_ticker, d.show_ticker),
    show_qr: bool(r.show_qr, d.show_qr),
    ticker_ar: str(r.ticker_ar).slice(0, 600),
    ticker_en: str(r.ticker_en).slice(0, 600),
    closed_ar: str(r.closed_ar).slice(0, 120),
    closed_en: str(r.closed_en).slice(0, 120),
    idle_ar: str(r.idle_ar).slice(0, 120),
    idle_en: str(r.idle_en).slice(0, 120),
    slide_seconds: clamp(Math.round(num(r.slide_seconds) || d.slide_seconds), 4, 60),
    text_size: ts === 'm' || ts === 'xl' ? ts : 'l',
    reviews_min: clamp(Math.round(num(r.reviews_min) || d.reviews_min), 1, 5),
    lang: str(r.lang) === 'en' ? 'en' : 'ar',
  };
}

/* ───────── بيانات الشاشة ───────── */

export type BarberState = 'busy' | 'open' | 'off' | 'closed';
export type BoardSvc = { ar: string; en: string; x_ar: string[]; x_en: string[] };
export type BoardPerson = { name: string | null; at: string; end: string | null; svc: BoardSvc | null };
export type BoardBarber = {
  id: string;
  name: string;
  name_en?: string | null;
  photo: string | null;
  state: BarberState;
  open: string | null;
  close: string | null;
  reopen: string | null;
  now: { name: string | null; start: string | null; until: string; svc: BoardSvc | null } | null;
  next: BoardPerson[];
  wait_min: number | null;
  /** فاضي فعلاً لزبون من غير حجز (الوقت لحد اللي بعده يكفي أقصر خدمة) */
  free_now: boolean;
  /** بين زبونين / استراحة قصيرة: نعرض الدور عادي */
  ready: boolean;
  /** أقرب معاد يتحجز أونلاين النهارده */
  slot: string | null;
  /** مفيش مواعيد تانية النهارده */
  day_full: boolean;
};
export type Board = {
  shop: string;
  shopState: 'open' | 'closed';
  reopen: string | null;
  /** أقرب معاد متاح للحجز (أي يوم) */
  nextSlot: string | null;
  barbers: BoardBarber[];
  gallery: Array<{ thumb: string; full: string; caption_ar: string | null; caption_en: string | null }>;
  packages: Array<{ name_ar: string; name_en: string | null; sessions: number; price: number }>;
  products: Array<{ name_ar: string; name_en: string | null; price: number; image: string; featured: boolean }>;
  reviews: Array<{ name: string; rating: number; comment: string }>;
  waitlist: Array<{ name: string | null; at: string }>;
  activity: Array<{ name: string | null; at: string; created: string }>;
  offers_ar: string | null;
  offers_en: string | null;
  layout: ScreenLayout;
};

const STATES: BarberState[] = ['busy', 'open', 'off', 'closed'];

const strs = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === 'string' && !!x.trim());
function parseSvc(v: unknown): BoardSvc | null {
  if (!isObj(v) || !str(v.ar)) return null;
  return { ar: str(v.ar), en: str(v.en) || str(v.ar), x_ar: strs(v.x_ar), x_en: strs(v.x_en) };
}

/** «حلاقة + لحية · ماسك» */
export function svcText(svc: BoardSvc | null | undefined, ar: boolean): string {
  if (!svc) return '';
  const main = ar ? svc.ar : svc.en;
  const extra = ar ? svc.x_ar : svc.x_en;
  return extra.length ? `${main} + ${extra.join(' + ')}` : main;
}

/** بيقرا رد queue_board بأمان. null لو اللينك غلط أو الشاشة مقفولة */
export function parseBoard(data: Json | null): Board | null {
  if (!isObj(data) || data.ok !== true) return null;
  const barbers = arr(data.barbers).filter(isObj).map((b): BoardBarber => {
    const st = str(b.state) as BarberState;
    const now = isObj(b.now) && str(b.now.until) ? { name: strOrNull(b.now.name), start: strOrNull(b.now.start), until: str(b.now.until), svc: parseSvc(b.now.svc) } : null;
    const waitRaw = numOrNull(b.wait_min);
    return {
      id: str(b.id),
      name: str(b.name),
      name_en: strOrNull(b.name_en),
      photo: strOrNull(b.photo),
      // البيانات القديمة (قبل التحديث) مكانش فيها state
      state: STATES.includes(st) ? st : now ? 'busy' : 'open',
      open: strOrNull(b.open),
      close: strOrNull(b.close),
      reopen: strOrNull(b.reopen),
      now,
      next: arr(b.next).filter(isObj).map((n) => ({ name: strOrNull(n.name), at: str(n.at), end: strOrNull(n.end), svc: parseSvc(n.svc) })).filter((n) => n.at),
      wait_min: waitRaw === null ? null : Math.max(0, Math.round(waitRaw)),
      // البيانات القديمة: «فاضي» = مفيش انتظار
      free_now: typeof b.free_now === 'boolean' ? b.free_now : st === 'open' && waitRaw === 0,
      ready: b.ready === true,
      slot: strOrNull(b.slot),
      day_full: b.day_full === true,
    };
  });
  const anyOpen = barbers.some((b) => b.state === 'busy' || b.state === 'open');
  const ss = str(data.shop_state);
  return {
    shop: str(data.shop),
    shopState: ss === 'open' || ss === 'closed' ? ss : anyOpen ? 'open' : 'closed',
    reopen: strOrNull(data.reopen),
    nextSlot: strOrNull(data.next_slot),
    barbers,
    gallery: arr(data.gallery).filter(isObj).map((g) => ({ thumb: str(g.thumb), full: str(g.full), caption_ar: strOrNull(g.caption_ar), caption_en: strOrNull(g.caption_en) })).filter((g) => g.full),
    products: arr(data.products).filter(isObj).map((p) => ({ name_ar: str(p.name_ar), name_en: strOrNull(p.name_en), price: num(p.price), image: str(p.image), featured: p.featured === true })).filter((p) => p.image && p.name_ar),
    packages: arr(data.packages).filter(isObj).map((p) => ({ name_ar: str(p.name_ar), name_en: strOrNull(p.name_en), sessions: num(p.sessions), price: num(p.price) })),
    reviews: arr(data.reviews).filter(isObj).map((r) => ({ name: str(r.name), rating: clamp(Math.round(num(r.rating)), 1, 5), comment: str(r.comment) })).filter((r) => r.comment),
    waitlist: arr(data.waitlist).filter(isObj).map((w) => ({ name: strOrNull(w.name), at: str(w.at) })),
    activity: arr(data.activity).filter(isObj).map((a) => ({ name: strOrNull(a.name), at: str(a.at), created: str(a.created) })).filter((a) => a.at),
    offers_ar: strOrNull(data.offers_ar),
    offers_en: strOrNull(data.offers_en),
    layout: normalizeLayout(data.layout),
  };
}

/** المحل فاضي: مفيش حد بيحلق ومفيش حد مستني النهارده */
export function isIdle(b: Board): boolean {
  return b.barbers.every((x) => !x.now && x.next.length === 0);
}

/** عدد الدقايق الباقية (لأقرب دقيقة لفوق)، ومش أقل من صفر */
export function minutesUntil(iso: string | null | undefined, nowMs: number): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.ceil((t - nowMs) / 60000));
}

/** "١٢ دقيقة" / "ساعة و١٠ د" / "٣ ساعات" — بأرقام عادية علشان تتقري من بعيد */
export function formatDuration(min: number, ar: boolean): string {
  if (min <= 0) return ar ? 'دلوقتي' : 'now';
  if (min < 60) return ar ? `${min} دقيقة` : `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (ar) {
    const hs = h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${h} ساعات`;
    return m ? `${hs} و${m} د` : hs;
  }
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** نسبة اللي خلص من الحلاقة الحالية (0..1) */
export function progress(start: string | null, end: string, nowMs: number): number {
  const s = start ? new Date(start).getTime() : NaN;
  const e = new Date(end).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  return clamp((nowMs - s) / (e - s), 0, 1);
}

/** اسم يتعرض على الشاشة (لو الأسامي مخفية: "عميل") */
export function displayName(name: string | null, ar: boolean): string {
  return name || (ar ? 'عميل' : 'Guest');
}
