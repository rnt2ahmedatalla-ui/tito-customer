export type TurnBlockKey = 'countdown' | 'ahead' | 'late' | 'hint' | 'message' | 'faith' | 'prayer';
export type TurnFont = 'plex' | 'tajawal' | 'cairo';
export type TurnConfig = {
  order: TurnBlockKey[];
  hidden: TurnBlockKey[];
  message_ar: string;
  message_en: string;
  /** شكل الشاشة: القيم الافتراضية = الشكل الحالي بالظبط */
  font: TurnFont;
  bg_color: string;
  text_color: string;
  accent_color: string;
  /** حجم الكلام كله % */
  text_pct: number;
  /** حجم كل بلوك % */
  countdown_pct: number;
  ahead_pct: number;
  message_pct: number;
  faith_pct: number;
  prayer_pct: number;
  /** المسافة بين البلوكات % */
  gap_pct: number;
  /** عرض العمود % */
  width_pct: number;
  align: 'center' | 'start';
  show_logo: boolean;
  show_back: boolean;
  show_share: boolean;
  show_glow: boolean;
};
export const TURN_BLOCKS: TurnBlockKey[] = ['countdown', 'ahead', 'late', 'hint', 'message', 'faith', 'prayer'];
export const DEFAULT_TURN_CONFIG: TurnConfig = {
  order: TURN_BLOCKS, hidden: ['message'], message_ar: '', message_en: '',
  font: 'plex', bg_color: '', text_color: '', accent_color: '',
  text_pct: 100, countdown_pct: 100, ahead_pct: 100, message_pct: 100, faith_pct: 100, prayer_pct: 100,
  gap_pct: 100, width_pct: 100, align: 'center',
  show_logo: true, show_back: true, show_share: true, show_glow: true,
};

const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d);
const hex = (v: unknown) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : '');
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

/** يقبل أي JSON جاي من الداتابيز ويرجّع إعداد سليم: مفاتيح معروفة بس، من غير تكرار، والناقص بيتضاف في الآخر */
export function normalizeTurnConfig(raw: unknown): TurnConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_TURN_CONFIG;
  const known = (v: unknown): TurnBlockKey[] => (Array.isArray(v) ? v.filter((k): k is TurnBlockKey => TURN_BLOCKS.includes(k as TurnBlockKey)) : []);
  const seen = new Set<TurnBlockKey>();
  const order: TurnBlockKey[] = [];
  for (const k of [...known(r.order), ...TURN_BLOCKS]) if (!seen.has(k)) { seen.add(k); order.push(k); }
  const hidden = Array.isArray(r.hidden) ? [...new Set(known(r.hidden))] : d.hidden;
  const s = (v: unknown) => (typeof v === 'string' ? v.slice(0, 200) : '');
  return {
    order, hidden, message_ar: s(r.message_ar), message_en: s(r.message_en),
    font: r.font === 'tajawal' || r.font === 'cairo' ? r.font : 'plex',
    bg_color: hex(r.bg_color), text_color: hex(r.text_color), accent_color: hex(r.accent_color),
    text_pct: clamp(r.text_pct, 80, 140, d.text_pct),
    countdown_pct: clamp(r.countdown_pct, 60, 160, d.countdown_pct),
    ahead_pct: clamp(r.ahead_pct, 60, 160, d.ahead_pct),
    message_pct: clamp(r.message_pct, 60, 160, d.message_pct),
    faith_pct: clamp(r.faith_pct, 60, 160, d.faith_pct),
    prayer_pct: clamp(r.prayer_pct, 60, 160, d.prayer_pct),
    gap_pct: clamp(r.gap_pct, 40, 200, d.gap_pct),
    width_pct: clamp(r.width_pct, 80, 130, d.width_pct),
    align: r.align === 'start' ? 'start' : 'center',
    show_logo: bool(r.show_logo, true), show_back: bool(r.show_back, true), show_share: bool(r.show_share, true), show_glow: bool(r.show_glow, true),
  };
}

/** ألوان الشاشة كمتغيرات: الافتراضي هو الدهبي والبني الحاليين */
export function turnVars(c: TurnConfig): Record<string, string> {
  const rgb = (h: string, d: string) => (h ? `${parseInt(h.slice(1, 3), 16)} ${parseInt(h.slice(3, 5), 16)} ${parseInt(h.slice(5, 7), 16)}` : d);
  const fg = rgb(c.text_color, '250 246 240');
  return {
    '--t-bg': rgb(c.bg_color, '28 15 8'),
    '--t-gold': rgb(c.accent_color, '201 162 75'),
    '--t-fg': fg,
    '--t-w': c.text_color ? fg : '255 255 255',
    '--t-gap': String(c.gap_pct / 100),
  };
}
export const TURN_FONTS: Record<TurnFont, string> = { plex: '', tajawal: 'Tajawal, "IBM Plex Sans Arabic", system-ui, sans-serif', cairo: 'Cairo, "IBM Plex Sans Arabic", system-ui, sans-serif' };
