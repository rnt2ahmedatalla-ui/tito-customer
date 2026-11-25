import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { BellRing } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDateKey } from '@/lib/time';
import { seasonFor, seasonLocked, type SeasonPeriod } from '@/features/booking/useSeasons';

interface DateStripProps {
  dates: Date[];
  selectedDate: string | null;
  closedDays: Set<number>;
  fullyBookedDays?: Set<string>;
  waitlistEnabled?: boolean;
  seasons?: SeasonPeriod[];
  onSelect: (dateKey: string) => void;
}

export function DateStrip({ dates, selectedDate, closedDays, fullyBookedDays, waitlistEnabled, seasons, onSelect }: DateStripProps) {
  const { t, i18n } = useTranslation();

  return (
    <div
      className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      role="listbox"
      aria-label={t('booking.selectDate')}
    >
      {dates.map((date) => {
        const key = formatDateKey(date);
        const season = seasonFor(seasons, key);
        const locked = seasonLocked(season);
        const isFull = !locked && (fullyBookedDays?.has(key) ?? false);
        // اليوم المكتمل يفضل قابل للضغط لو قايمة الانتظار شغالة (العميل يضيف نفسه منها)
        const fullOpen = isFull && (waitlistEnabled ?? false);
        // اليوم بيتقفل لو إجازة أو مواعيده خلصت وقايمة الانتظار مقفولة (أيام الموسم المفتوحة بتتجاهل الإجازة الأسبوعية)
        const isClosed = locked || (season ? false : closedDays.has(date.getDay())) || (isFull && !fullOpen);
        const isSelected = selectedDate === key;
        const isToday = key === formatDateKey(new Date());
        const weekday = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en', {
          weekday: 'short',
        }).format(date);

        return (
          <button
            key={key}
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={isClosed}
            onClick={() => onSelect(key)}
            className={cn(
              'flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-0.5 rounded-btn border px-1 py-2.5 transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-brand',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
              isSelected && 'border-gold bg-gold text-espresso',
              locked && 'cursor-not-allowed border-gold/40 bg-gold/10 text-ink/60',
              !isSelected && !isClosed && fullOpen && 'border-gold/50 bg-gold/10 text-espresso hover:border-gold',
              !isSelected && !isClosed && !fullOpen && 'border-default bg-cream text-espresso hover:border-gold',
              isClosed && !locked && 'cursor-not-allowed border-default bg-sand/50 text-ink/40',
            )}
          >
            <span className="max-w-full truncate text-[11px] font-medium leading-tight">{weekday}</span>
            <span className="text-lg font-semibold font-latin">{format(date, 'd')}</span>
            {locked ? (
              <span className="text-[10px] font-medium text-gold">{i18n.language === 'ar' ? 'قريباً' : 'Soon'}</span>
            ) : isFull ? (
              fullOpen ? (
                <span className={cn('flex items-center gap-0.5 text-[10px] font-semibold', isSelected ? 'text-espresso' : 'text-gold')}>
                  <BellRing className="size-3" aria-hidden />{i18n.language === 'ar' ? 'مكتمل' : 'Full'}
                </span>
              ) : (
                <span className="text-[10px] font-medium">{i18n.language === 'ar' ? 'مكتمل' : 'Full'}</span>
              )
            ) : isToday ? (
              <span className={cn('text-[10px] font-medium', isSelected ? 'text-espresso' : 'text-gold')}>
                {t('home.today')}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
