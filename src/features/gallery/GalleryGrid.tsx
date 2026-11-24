import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbox } from '@/components/ui/Lightbox';
import type { GalleryPhoto } from './useGallery';

/** شبكة الصور الصغيرة؛ لما تدوس تفتح الكبيرة */
export function GalleryGrid({ photos, className }: { photos: GalleryPhoto[]; className?: string }) {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <div className={className ?? 'grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5'}>
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label={(isAr ? p.caption_ar : p.caption_en) || (isAr ? `صورة ${i + 1}` : `Photo ${i + 1}`)}
          >
            <img src={p.thumb} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
            {p.video ? <span className="absolute inset-0 flex items-center justify-center"><span className="flex size-10 items-center justify-center rounded-full bg-black/55 text-lg text-[#fff]">▶</span></span> : null}
          </button>
        ))}
      </div>
      <Lightbox
        urls={photos.map((p) => p.full)}
        videos={photos.map((p) => p.video)}
        index={open}
        onClose={() => setOpen(null)}
        onIndex={setOpen}
        caption={(i) => (isAr ? photos[i]?.caption_ar : photos[i]?.caption_en)}
      />
    </>
  );
}
