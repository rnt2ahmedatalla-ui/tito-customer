import { useTranslation } from 'react-i18next';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { downloadIcs, googleCalendarUrl, type IcsEvent } from '@/lib/ics';
import { useSettings } from '@/features/home/useHomeData';

/** إضافة المعاد لتقويم التليفون مع تنبيه قبله بيوم وبساعتين (من التليفون نفسه، ببلاش) */
export function AddToCalendar({
  id,
  startAt,
  endAt,
  serviceName,
  tone = 'secondary',
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
  const event: IcsEvent = {
    uid: id,
    title: `${shop} — ${serviceName}`,
    description: isAr ? `حجزك في ${shop}: ${serviceName}` : `Your booking at ${shop}: ${serviceName}`,
    location: settings.data?.shop_location_url || shop,
    startAtUtc: startAt,
    endAtUtc: endAt,
    alarmsMinutes: [120, 1440],
  };
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button size="sm" variant={tone === 'gold' ? 'primary' : 'secondary'} className="w-full sm:w-auto" onClick={() => downloadIcs(event, 'tito-booking.ics')}>
        <CalendarPlus className="size-4" aria-hidden />
        {isAr ? 'ضيف للتقويم (مع تذكير)' : 'Add to calendar (with reminder)'}
      </Button>
      <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="sm:w-auto">
        <Button size="sm" variant="ghost" className="w-full sm:w-auto">
          {isAr ? 'جوجل كاليندر' : 'Google Calendar'}
        </Button>
      </a>
    </div>
  );
}
