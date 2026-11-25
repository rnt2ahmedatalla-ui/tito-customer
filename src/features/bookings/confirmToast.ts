// يقرر هل يظهر تنبيه "تم تأكيد حجزك" عند تحديث حجز جاي من الريل تايم.
// cache = آخر قايمة حجوزات عندنا (undefined لو لسه ما اتحمّلتش).
export function shouldToastConfirmed(
  cache: ReadonlyArray<{ id: string; status: string }> | undefined,
  row: { id?: string; status?: string },
): boolean {
  if (row.status !== 'confirmed') return false;
  if (!cache) return false; // القايمة لسه بتتحمّل: مفيش أساس نقارن عليه، نتجنب تنبيه غلط
  const before = cache.find((b) => b.id === row.id)?.status;
  return before !== 'confirmed'; // حجز جديد مش في الكاش أو كان مش مؤكد = تأكيد فعلي
}
