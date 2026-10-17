import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-espresso/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-label={t('common.close')}
      />
      <div
        className={cn(
          'relative z-10 flex w-full max-w-lg flex-col rounded-t-card bg-cream shadow-warm-raised sm:rounded-card',
          'max-h-[calc(100dvh-1rem)] sm:max-h-[min(90dvh,40rem)]',
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-default/50 px-6 py-4">
          <h2 id="sheet-title" className="text-lg font-semibold text-espresso">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-btn text-ink hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label={t('common.close')}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+2rem))]">
          {children}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}

