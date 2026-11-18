import { useTranslation } from 'react-i18next';
import { Check, Clock } from 'lucide-react';
import { formatEGP } from '@/lib/money';
import { cn } from '@/lib/cn';

export interface ServiceCardData {
  id: string;
  name_ar: string;
  name_en: string;
  price_egp: number | string;
  duration_minutes: number;
  description_ar?: string | null;
  description_en?: string | null;
}

interface ServiceCardProps {
  service: ServiceCardData;
  selected?: boolean;
  onSelect: () => void;
}

/** كارت الخدمة الأساسية: اختيار واحد (دايرة). نفس الشكل في الحجز العادي والجماعي. */
export function ServiceCard({ service, selected, onSelect }: ServiceCardProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const name = isAr ? service.name_ar : service.name_en;
  const description = (isAr ? service.description_ar : service.description_en)?.trim();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={selected}
      className={cn(
        'group relative flex w-full cursor-pointer items-start gap-3 rounded-card border bg-white p-4 text-start shadow-warm transition-all duration-brand ease-brand',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
        selected ? 'border-gold bg-gold/10 ring-1 ring-gold' : 'border-default hover:border-gold/60 hover:bg-sand/30',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          selected ? 'border-gold bg-gold text-espresso' : 'border-bark/30 bg-white',
        )}
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="break-words text-base font-semibold text-espresso sm:text-lg">{name}</h3>
        {description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink">{description}</p>
        ) : null}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-ink">
          <Clock className="size-3.5 shrink-0" aria-hidden />
          <span className="font-latin">{t('home.duration', { min: service.duration_minutes })}</span>
        </div>
      </div>
      <span className="shrink-0 rounded-pill bg-gold px-3 py-1 font-latin text-sm font-bold text-espresso">
        {formatEGP(Number(service.price_egp))}
      </span>
    </div>
  );
}
