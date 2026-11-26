export type TurnBlockKey = 'countdown' | 'ahead' | 'late' | 'hint' | 'message' | 'faith' | 'prayer';
export type TurnConfig = { order: TurnBlockKey[]; hidden: TurnBlockKey[]; message_ar: string; message_en: string };
export const TURN_BLOCKS: TurnBlockKey[] = ['countdown', 'ahead', 'late', 'hint', 'message', 'faith', 'prayer'];
export const DEFAULT_TURN_CONFIG: TurnConfig = { order: TURN_BLOCKS, hidden: ['message'], message_ar: '', message_en: '' };

/** يقبل أي JSON جاي من الداتابيز ويرجّع إعداد سليم: مفاتيح معروفة بس، من غير تكرار، والناقص بيتضاف في الآخر */
export function normalizeTurnConfig(raw: unknown): TurnConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const known = (v: unknown): TurnBlockKey[] => (Array.isArray(v) ? v.filter((k): k is TurnBlockKey => TURN_BLOCKS.includes(k as TurnBlockKey)) : []);
  const seen = new Set<TurnBlockKey>();
  const order: TurnBlockKey[] = [];
  for (const k of [...known(r.order), ...TURN_BLOCKS]) if (!seen.has(k)) { seen.add(k); order.push(k); }
  const hidden = Array.isArray(r.hidden) ? [...new Set(known(r.hidden))] : DEFAULT_TURN_CONFIG.hidden;
  const s = (v: unknown) => (typeof v === 'string' ? v.slice(0, 200) : '');
  return { order, hidden, message_ar: s(r.message_ar), message_en: s(r.message_en) };
}
