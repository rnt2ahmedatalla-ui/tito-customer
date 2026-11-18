import { useSettings } from '@/features/home/useHomeData';

const DEFAULT_POLICY_AR =
  'لو هتتأخر أكتر من ربع ساعة، ممكن نضطر نأجّل معادك أو نلغيه، عشان نحافظ على وقت باقي العملاء. ولو عايز تغيّر أو تلغي الحجز، اعمل ده من حجوزاتك قبل الموعد بوقت كفاية.';
const DEFAULT_POLICY_EN =
  'If you are more than 15 minutes late, we may have to reschedule or cancel your appointment to respect the time of other customers. To change or cancel, do it from your bookings well before your appointment.';

export const POLICY_KEY = 'tito.policy.accepted';

/** نفس نص السياسة اللي في الرئيسية (بيجي من إعدادات الأدمن، وليه نص افتراضي) */
export function usePolicyText(isAr: boolean) {
  const settings = useSettings();
  const extra = settings.data as unknown as Record<string, string | null | undefined> | null | undefined;
  const text =
    (isAr ? extra?.booking_policy_ar : extra?.booking_policy_en)?.trim() ||
    (isAr ? DEFAULT_POLICY_AR : DEFAULT_POLICY_EN);
  // بصمة صغيرة للنص العربي: لو الأدمن غيّر السياسة، العميل يوافق عليها تاني
  const arSource = (extra?.booking_policy_ar ?? '').trim() || DEFAULT_POLICY_AR;
  let h = 0;
  for (let i = 0; i < arSource.length; i++) h = (h * 31 + arSource.charCodeAt(i)) | 0;
  return { text, version: String(h), ready: !!settings.data };
}
