import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const GALLERY_BUCKET = 'gallery';

export type GalleryPhoto = { id: string; thumb: string; full: string; caption_ar: string | null; caption_en: string | null; video?: string | null };

export function galleryUrl(path: string): string {
  return supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** صور شغل الصالون (اللي الأدمن مظهّرها بس) */
export function useGallery(limit = 60) {
  return useQuery({
    queryKey: ['gallery', limit],
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async (): Promise<GalleryPhoto[]> => {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('id, thumb_path, full_path, caption_ar, caption_en, kind, video_path' as 'id, thumb_path, full_path, caption_ar, caption_en')
        .eq('is_active', true)
        .order('sort')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return [];
      return (data ?? []).map((r) => {
        const v = (r as { video_path?: string | null }).video_path;
        return { id: r.id, thumb: galleryUrl(r.thumb_path), full: galleryUrl(r.full_path), caption_ar: r.caption_ar, caption_en: r.caption_en,
          video: v ? supabase.storage.from('gallery-video').getPublicUrl(v).data.publicUrl : null };
      });
    },
  });
}
