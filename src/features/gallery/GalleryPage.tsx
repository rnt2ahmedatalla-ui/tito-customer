import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Images } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { GalleryGrid } from './GalleryGrid';
import { useGallery } from './useGallery';

export default function GalleryPage() {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const q = useGallery(120);
  const photos = q.data ?? [];
  return (
    <PageShell>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Images className="size-6 text-gold" aria-hidden />
          <h1 className="text-2xl font-bold text-espresso">{isAr ? 'من شغلنا' : 'Our work'}</h1>
        </div>
        {q.isLoading ? (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">{Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
        ) : photos.length === 0 ? (
          <p className="text-ink">{isAr ? 'قريب هنحط صور من شغلنا هنا ✂️' : 'Photos of our work are coming soon ✂️'}</p>
        ) : (
          <GalleryGrid photos={photos} />
        )}
        <Link to="/book" className="inline-flex min-h-12 items-center justify-center rounded-btn bg-gold px-6 font-semibold text-espresso">
          {isAr ? 'احجز دورك' : 'Book now'}
        </Link>
      </div>
    </PageShell>
  );
}
