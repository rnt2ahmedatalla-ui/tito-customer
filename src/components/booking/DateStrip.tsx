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
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" role="listbox" aria-label={t('booking.selectDate')}>
      {dates.map((date) => {
        const key = formatDateKey(date);
        const isClosed = closedDays.has(date.getDay());
        const isSelected = selectedDate === key;
        const isToday = key === formatDateKey(new Date());

        return (
          <button
            key={key}
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={isClosed}
            onClick={() => onSelect(key)}
            className={cn(
              'flex min-w-[72px] shrink-0 flex-col items-center gap-1 rounded-btn border px-3 py-3 transition-all duration-brand',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
              isSelected && 'border-gold bg-gold text-espresso',
              !isSelected && !isClosed && 'border-default bg-cream text-espresso hover:border-gold',
              isClosed && 'cursor-not-allowed border-default bg-sand/50 text-ink/40',
            )}
          >
            <span className="text-xs font-medium">
              {format(date, i18n.language === 'ar' ? 'EEEE' : 'EEE')}
            </span>
            <span className="text-lg font-semibold font-latin">{format(date, 'd')}</span>
            {isToday ? (
              <span className="text-[10px] font-medium text-gold">{t('home.today')}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
