import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/** بيعرض الصورة الكبيرة على الشاشة كلها. السحب يمين/شمال بيقلّب بين الصور */
export function Lightbox({
  urls,
  index,
  onClose,
  onIndex,
  caption,
}: {
  urls: string[];
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
  caption?: (i: number) => string | null | undefined;
}) {
  const startX = useRef<number | null>(null);
  const n = urls.length;
  const go = (d: number) => index !== null && n > 0 && onIndex((index + d + n) % n);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, n]);

  if (index === null || !urls[index]) return null;
  const cap = caption?.(index);
  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onTouchStart={(e) => (startX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const s = startX.current;
        const x = e.changedTouches[0]?.clientX;
        startX.current = null;
        if (s === null || x === undefined || Math.abs(x - s) < 50) return;
        go(x < s ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] text-[#fff]" dir="ltr">
        <span className="font-latin text-sm opacity-80">{index + 1} / {n}</span>
        <button type="button" aria-label="close" onClick={onClose} className="flex size-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
          <X className="size-6" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2" dir="ltr">
        <img src={urls[index]} alt={cap ?? ''} className="max-h-full max-w-full rounded-md object-contain" onClick={(e) => e.stopPropagation()} />
        {n > 1 ? (
          <>
            <button type="button" aria-label="previous" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-2 hidden size-12 items-center justify-center rounded-full bg-white/15 text-[#fff] hover:bg-white/25 sm:flex">
              <ChevronLeft className="size-7" />
            </button>
            <button type="button" aria-label="next" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-2 hidden size-12 items-center justify-center rounded-full bg-white/15 text-[#fff] hover:bg-white/25 sm:flex">
              <ChevronRight className="size-7" />
            </button>
          </>
        ) : null}
      </div>
      <p className="min-h-12 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] text-center text-sm text-[#fff]/90">{cap}</p>
    </div>,
    document.body,
  );
}
