import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatEGP } from '@/lib/money';
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
    <Card
      interactive
      selected={selected}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-espresso">{name}</h3>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-ink">
            <Clock className="size-4" aria-hidden />
            <span className="font-latin">{t('home.duration', { min: service.duration_minutes })}</span>
          </div>
        </div>
        <span className="rounded-pill bg-gold px-3 py-1 text-sm font-semibold text-espresso font-latin">
          {formatEGP(service.price_egp)}
        </span>
      </div>
    </Card>
  );
}
