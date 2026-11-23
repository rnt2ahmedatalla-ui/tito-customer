import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** نافذة منبثقة فوق كل حاجة (فوق الشريط السفلي كمان) وبتتظبط على الموبايل والتابلت واللابتوب */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade bg-espresso/50" onClick={onClose} aria-hidden />
      <div className="relative flex animate-pop max-h-[min(85dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-card bg-white shadow-warm-raised">
        <div className="flex items-center justify-between gap-2 border-b border-default px-4 py-3">
          <h2 className="min-w-0 truncate text-lg font-bold text-espresso">{title}</h2>
          <button type="button" aria-label="close" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-sand"><X className="size-5" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
