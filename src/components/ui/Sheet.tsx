import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button
        type="button"
        className="absolute inset-0 bg-espresso/60"
        onClick={onClose}
        aria-label={t('common.close')}
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-t-card bg-cream p-6 shadow-warm-raised sm:rounded-card',
          'max-h-[90vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]',
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="sheet-title" className="text-lg font-semibold text-espresso">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-btn text-ink hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label={t('common.close')}
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
