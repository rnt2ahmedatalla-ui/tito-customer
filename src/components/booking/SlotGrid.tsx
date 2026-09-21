import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { formatCairoTime } from '@/lib/time';
import { cn } from '@/lib/cn';

interface SlotGridProps {
  slots: string[];
  selectedSlot: string | null;
  onSelect: (slot: string) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function SlotGrid({ slots, selectedSlot, onSelect, isLoading, isError, onRetry }: SlotGridProps) {
  const { t, i18n } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-live="polite" aria-busy="true">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center" role="alert">
        <p className="text-ink">{t('errors.UNKNOWN')}</p>
        <Button variant="secondary" onClick={onRetry}>{t('booking.retry')}</Button>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="py-8 text-center text-ink" aria-live="polite">
        {t('booking.noSlots')}
      </p>
    );
  }

  return (
    <div
      className="grid grid-cols-3 gap-2 sm:grid-cols-4"
      role="listbox"
      aria-label={t('a11y.slotGrid')}
      aria-live="polite"
    >
      {slots.map((slot) => {
        const isSelected = selectedSlot === slot;
        return (
          <button
            key={slot}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(slot)}
            className={cn(
              'min-h-[44px] rounded-btn border text-sm font-semibold font-latin transition-all duration-brand',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
              isSelected ? 'border-gold bg-gold text-espresso' : 'border-default bg-cream text-espresso hover:border-gold',
            )}
          >
            {formatCairoTime(slot, i18n.language)}
          </button>
        );
      })}
    </div>
  );
}
