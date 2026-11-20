import { useTranslation } from 'react-i18next';
import { CalendarHeart } from 'lucide-react';
import { formatDateKey } from '@/lib/time';
import { seasonFor, seasonLocked, type SeasonPeriod } from '@/features/booking/useSeasons';

/** كارت لطيف بيظهر لو في الأيام المعروضة موسم/عيد لسه مفتحش للحجز */
export function SeasonNotice({ dates, seasons }: { dates: Date[]; seasons: SeasonPeriod[] | undefined }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const seen = new Set<string>();
  const list: SeasonPeriod[] = [];
  for (const d of dates) {
    const p = seasonFor(seasons, formatDateKey(d));
    if (p && seasonLocked(p) && !seen.has(p.id)) {
      seen.add(p.id);
      list.push(p);
    }
  }
  if (!list.length) return null;
  const fmt = (ymd: string) =>
    new Date(ymd + 'T12:00:00').toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long' });

  return (
    <div className="mt-2 space-y-2">
      {list.map((p) => (
        <div key={p.id} className="flex items-start gap-3 rounded-card border border-gold/40 bg-gold/10 p-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-gold/25 text-espresso">
            <CalendarHeart className="size-5" />
          </span>
          <div className="min-w-0 text-sm leading-relaxed text-espresso">
            <p className="font-semibold">
              {isAr ? `أيام ${p.name_ar} 🌙` : `${p.name_en || p.name_ar} days`}
            </p>
            <p className="text-ink/70">
              {isAr
                ? `من ${fmt(p.start_date)} لـ ${fmt(p.end_date)} بمواعيد شغل خاصة بالموسم، والحجز لها هيتفتح يوم ${fmt(p.release_on ?? p.start_date)}. ارجع في اليوم ده واحجز مكانك.`
                : `${fmt(p.start_date)} – ${fmt(p.end_date)} runs on special hours. Booking opens on ${fmt(p.release_on ?? p.start_date)} — come back then to reserve your spot.`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
