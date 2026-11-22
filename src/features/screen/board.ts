import type { Json } from '@/types/database';

export type BoardPerson = { name: string; at: string };
export type BoardBarber = { id: string; name: string; photo: string | null; now: { name: string; until: string } | null; next: BoardPerson[]; wait_min: number };
export type Board = {
  shop: string;
  barbers: BoardBarber[];
  gallery: Array<{ thumb: string; full: string; caption_ar: string | null; caption_en: string | null }>;
  packages: Array<{ name_ar: string; name_en: string | null; sessions: number; price: number }>;
  offers_ar: string | null;
  offers_en: string | null;
};

type Obj = { [k: string]: Json | undefined };
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** بيقرا رد queue_board بأمان. null لو اللينك غلط أو الشاشة مقفولة */
export function parseBoard(data: Json | null): Board | null {
  if (!isObj(data) || data.ok !== true) return null;
  return {
    shop: str(data.shop),
    barbers: arr(data.barbers).filter(isObj).map((b) => ({
      id: str(b.id),
      name: str(b.name),
      photo: strOrNull(b.photo),
      now: isObj(b.now) ? { name: str(b.now.name), until: str(b.now.until) } : null,
      next: arr(b.next).filter(isObj).map((n) => ({ name: str(n.name), at: str(n.at) })).filter((n) => n.at),
      wait_min: Math.max(0, Math.round(num(b.wait_min))),
    })),
    gallery: arr(data.gallery).filter(isObj).map((g) => ({ thumb: str(g.thumb), full: str(g.full), caption_ar: strOrNull(g.caption_ar), caption_en: strOrNull(g.caption_en) })).filter((g) => g.full),
    packages: arr(data.packages).filter(isObj).map((p) => ({ name_ar: str(p.name_ar), name_en: strOrNull(p.name_en), sessions: num(p.sessions), price: num(p.price) })),
    offers_ar: strOrNull(data.offers_ar),
    offers_en: strOrNull(data.offers_en),
  };
}

/** المحل فاضي: مفيش حد بيحلق ومفيش حد مستني النهارده */
export function isIdle(b: Board): boolean {
  return b.barbers.every((x) => !x.now && x.next.length === 0);
}
