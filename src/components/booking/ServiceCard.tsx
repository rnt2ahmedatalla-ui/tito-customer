import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { formatEGP } from '@/lib/money';
import { cn } from '@/lib/cn';
import type { Service } from '@/types/database';

interface ServiceCardProps {
  service: Service;
  selected?: boolean;
  onSelect: () => void;
}

export function ServiceCard({ service, selected, onSelect }: ServiceCardProps) {
  const { t, i18n } = useTranslation();
  const name = i18n.language === 'ar' ? service.name_ar : service.name_en;

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
        'group relative w-full cursor-pointer border-b border-default py-5 text-start transition-colors duration-brand ease-brand',
        'hover:bg-sand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
        selected && 'bg-gold/10',
      )}
    >
      <div className="flex items-start justify-between gap-4 px-1">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-espresso transition-colors group-hover:text-bark">
            {name}
          </h3>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-ink">
            <Clock className="size-4 shrink-0" aria-hidden />
            <span className="font-latin">{t('home.duration', { min: service.duration_minutes })}</span>
          </div>
        </div>
        <span className="shrink-0 bg-gold px-3.5 py-1.5 text-sm font-semibold text-espresso font-latin">
          {formatEGP(service.price_egp)}
        </span>
      </div>
      {selected ? (
        <span className="absolute inset-y-0 start-0 w-1 bg-gold" aria-hidden />
      ) : null}
    </div>
  );
}
