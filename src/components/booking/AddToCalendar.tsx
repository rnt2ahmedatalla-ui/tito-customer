import { useTranslation } from 'react-i18next';
import { CalendarPlus } from 'lucide-react';
import { downloadIcs, googleCalendarUrl, isAndroid, isIOS, addToPhoneCalendar, type IcsEvent } from '@/lib/ics';
import { useSettings } from '@/features/home/useHomeData';

/**
 * إضافة المعاد لتقويم التليفون:
 * - أندرويد: بيفتح تطبيق التقويم اللي عندك على طول والبيانات مكتوبة (من غير ما ينزّل ملف)
 * - آيفون: بيفتح التقويم بتاع آيفون بشاشة "إضافة" (فيها تنبيه قبل الميعاد بيوم وبساعتين)
 * - الكمبيوتر: ملف تقويم أو جوجل كاليندر
 */
export function AddToCalendar({
  id,
  startAt,
  endAt,
  serviceName,
}: {
  id: string;
  startAt: string;
  endAt: string;
  serviceName: string;
  tone?: 'secondary' | 'gold';
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const settings = useSettings();
  const shop = settings.data?.shop_name || 'tito';
  // مقفول افتراضياً — بيتفتح من إعدادات الأدمن («زرار ضيف للتقويم»)
  const enabled = (settings.data as { show_add_to_calendar?: boolean } | null | undefined)?.show_add_to_calendar === true;
  const event: IcsEvent = {
    uid: id,
    title: `${shop} — ${serviceName}`,
    description: isAr ? `حجزك في ${shop}: ${serviceName}` : `Your booking at ${shop}: ${serviceName}`,
    location: settings.data?.shop_location_url || shop,
    startAtUtc: startAt,
    endAtUtc: endAt,
    alarmsMinutes: [120, 1440],
  };
  const phone = isAndroid() || isIOS();
  if (!enabled) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-btn border border-gold/40 bg-gold/10 px-3 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-espresso">
        <CalendarPlus className="size-5 shrink-0 text-gold" aria-hidden />
        <span className="truncate">{isAr ? 'ضيف الميعاد لتقويمك' : 'Add to your calendar'}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => (phone ? void addToPhoneCalendar(event) : downloadIcs(event, 'tito-booking.ics'))}
          className="min-h-9 rounded-full bg-espresso px-3.5 text-xs font-semibold text-cream transition hover:opacity-90"
        >
          {phone ? (isAr ? 'التقويم' : 'Calendar') : isAr ? 'تنزيل' : 'Download'}
        </button>
        <a
          href={googleCalendarUrl(event)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center rounded-full border border-espresso/30 bg-white px-3.5 text-xs font-semibold text-espresso transition hover:bg-sand"
        >
          Google
        </a>
      </span>
    </div>
  );
}
