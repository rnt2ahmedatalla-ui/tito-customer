import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { cn } from '@/lib/cn';
import { formatDateKey } from '@/lib/time';

interface DateStripProps {
  dates: Date[];
  selectedDate: string | null;
  closedDays: Set<number>;
  onSelect: (dateKey: string) => void;
}

export function DateStrip({ dates, selectedDate, closedDays, onSelect }: DateStripProps) {
  const { t, i18n } = useTranslation();

  return (
    <div
      className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      role="listbox"
      aria-label={t('booking.selectDate')}
    >
      {dates.map((date) => {
        const key = formatDateKey(date);
        const isClosed = closedDays.has(date.getDay());
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
              'flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-0.5 rounded-btn border px-1 py-2.5 transition-all duration-brand',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
              isSelected && 'border-gold bg-gold text-espresso',
              !isSelected && !isClosed && 'border-default bg-cream text-espresso hover:border-gold',
              isClosed && 'cursor-not-allowed border-default bg-sand/50 text-ink/40',
            )}
          >
            <span className="max-w-full truncate text-[11px] font-medium leading-tight">{weekday}</span>
            <span className="text-lg font-semibold font-latin">{format(date, 'd')}</span>
            {isToday ? (
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
