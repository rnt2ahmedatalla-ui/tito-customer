import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GalleryGrid } from './GalleryGrid';
import { useGallery } from './useGallery';
import { useFeatureFlags } from '@/features/extras/useExtras';

/** جزء "من شغلنا" في الرئيسية: أول 6 صور + لينك للمعرض كله. مبيظهرش لو مفيش صور */
export function HomeGallery() {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const q = useGallery(60);
  const flags = useFeatureFlags();
  const photos = q.data ?? [];
  if (!photos.length || flags.data?.gallery !== true) return null;
  return (
    <section className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <p className="font-latin text-sm font-medium uppercase tracking-[0.2em] text-gold">{isAr ? 'Gallery' : 'Gallery'}</p>
      <h2 className="mt-3 text-3xl font-bold text-espresso sm:text-4xl">{isAr ? 'من شغلنا' : 'Our work'}</h2>
      <div className="gold-rule my-8 max-w-xs" />
      <GalleryGrid photos={photos.slice(0, 6)} className="grid grid-cols-3 gap-1.5 sm:gap-2" />
      {photos.length > 0 ? (
        <Link to="/gallery" className="mt-5 inline-flex min-h-11 items-center rounded-btn border border-gold px-5 font-semibold text-espresso hover:bg-gold/10">
          {isAr ? `شوف كل الشغل (${photos.length})` : `See all work (${photos.length})`}
        </Link>
      ) : null}
    </section>
  );
}
