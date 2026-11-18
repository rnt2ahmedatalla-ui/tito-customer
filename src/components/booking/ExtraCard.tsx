import { Check, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatEGP } from '@/lib/money';
import { cn } from '@/lib/cn';

export interface ExtraCardData {
  id: string;
  name_ar: string;
  name_en: string;
  price_egp: number | string;
}

interface ExtraCardProps {
  extra: ExtraCardData;
  selected: boolean;
  onToggle: () => void;
  compact?: boolean;
}

/** كارت الإضافة: اختيار متعدد (مربع)، أصغر من كارت الخدمة وبنفس الهوية. */
export function ExtraCard({ extra, selected, onToggle, compact = false }: ExtraCardProps) {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-btn border bg-white text-start transition-all duration-brand ease-brand',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1',
        compact ? 'p-2.5' : 'p-3',
        selected ? 'border-gold bg-gold/10 ring-1 ring-gold' : 'border-default hover:border-gold/60 hover:bg-sand/30',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
          selected ? 'border-gold bg-gold text-espresso' : 'border-bark/30 bg-white text-bark/60',
        )}
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : <Plus className="size-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 break-words text-sm font-medium text-espresso">
        {isAr ? extra.name_ar : extra.name_en}
      </span>
      <span className="shrink-0 font-latin text-xs font-semibold text-bark">+{formatEGP(Number(extra.price_egp))}</span>
    </button>
  );
}
