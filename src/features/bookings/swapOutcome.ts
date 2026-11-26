/** نتيجة respond_swap الفعلية. أي قيمة مش معروفة أو مش متطابقة مع اللي العميل ضغطه = unknown، ومايتعرضش نجاح. */
export type SwapOutcome = 'accepted' | 'declined' | 'expired' | 'unknown';
export function swapOutcome(data: unknown, accept: boolean): SwapOutcome {
  if (data === 'expired') return 'expired';
  if (accept && data === 'accepted') return 'accepted';
  if (!accept && data === 'declined') return 'declined';
  return 'unknown';
}

/** Help text for the swap picker from the real swap_window_min setting (minutes). Falls back to the neutral wording when unknown. */
export function swapWindowText(min: unknown, ar: boolean): string {
  const m = typeof min === 'number' && Number.isFinite(min) && min > 0 ? Math.round(min) : null;
  if (m === null) return ar ? 'مواعيد قريبة من معادك' : 'nearby times';
  const h = m % 60 === 0 ? m / 60 : null;
  if (ar) return h === 1 ? 'في حدود ساعة قبل/بعد معادك' : h === 2 ? 'في حدود ساعتين قبل/بعد معادك' : h ? `في حدود ${h} ساعات قبل/بعد معادك` : `في حدود ${m} دقيقة قبل/بعد معادك`;
  return h ? `within ${h} hour${h === 1 ? '' : 's'} before/after your time` : `within ${m} minutes before/after your time`;
}
