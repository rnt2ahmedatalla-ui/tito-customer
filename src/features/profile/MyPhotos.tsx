import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Check, Clock, Globe, ImagePlus, Lock, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { uploadImagePair, removeImagePair } from '@/lib/imageUpload';
import { cn } from '@/lib/cn';
import { Lightbox } from '@/components/ui/Lightbox';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/profile/useAuth';

const BUCKET = 'customer-photos';
type Photo = {
  id: string; full_path: string; thumb_path: string; note: string | null; taken_at: string;
  uploaded_by: string; status: string; share_consent: boolean; gallery_item_id: string | null;
  thumb?: string; full?: string;
};

/** «صوري»: صور الحلاقة بتاعتي + أرفع صورة + أوافق تتنشر في «شغلنا» */
export function MyPhotos() {
  const { i18n } = useTranslation();
  const ar = !!i18n.language?.startsWith('ar');
  const L = (a: string, e: string) => (ar ? a : e);
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<number | null>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [share, setShare] = useState(true);
  const [note, setNote] = useState('');
  const previewUrl = useMemo(() => (pending ? URL.createObjectURL(pending) : null), [pending]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const q = useQuery({
    queryKey: ['my-photos', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Photo[]> => {
      const { data, error } = await supabase
        .from('customer_photos')
        .select('id, full_path, thumb_path, note, taken_at, uploaded_by, status, share_consent, gallery_item_id')
        .eq('user_id', user!.id)
        .neq('status', 'rejected')
        .order('taken_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      const rows = (data ?? []) as Photo[];
      if (!rows.length) return rows;
      const paths = rows.flatMap((r) => [r.thumb_path, r.full_path]);
      const signed = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      const map = new Map((signed.data ?? []).map((x) => [x.path, x.signedUrl]));
      return rows.map((r) => ({ ...r, thumb: map.get(r.thumb_path) ?? undefined, full: map.get(r.full_path) ?? undefined }));
    },
    staleTime: 30 * 60_000,
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ['my-photos'] });

  const upload = useMutation({
    mutationFn: async () => {
      if (!pending || !user) return;
      const pair = await uploadImagePair(BUCKET, user.id, pending);
      const { error } = await supabase.rpc('customer_add_photo', { p_full: pair.full_path, p_thumb: pair.thumb_path, p_note: note.trim() || null, p_share: share });
      if (error) {
        await removeImagePair(BUCKET, pair).catch(() => undefined);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success(L('وصلت ✓ هتظهر بعد موافقة المحل', 'Sent ✓ it will show after the shop approves'));
      setPending(null); setNote(''); setShare(true);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error && e.name === 'ImageError' ? e.message : String((e as { message?: string })?.message ?? '').includes('TOO_MANY')
      ? L('عندك صور كتير مستنية موافقة — استنى شوية', 'You have many photos waiting for approval')
      : L('مقدرناش نرفع الصورة، جرّب تاني', 'Could not upload, try again')),
  });

  const setConsent = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: boolean }) => {
      const { error } = await supabase.rpc('customer_set_photo_share', { p_id: id, p_share: v });
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const del = useMutation({
    mutationFn: async (p: Photo) => {
      const { data, error } = await supabase.rpc('customer_delete_photo', { p_id: p.id });
      if (error) throw error;
      const r = (data ?? {}) as { full?: string; thumb?: string };
      await supabase.storage.from(BUCKET).remove([r.full, r.thumb].filter(Boolean) as string[]).catch(() => undefined);
    },
    onSuccess: () => { toast.success(L('اتمسحت', 'Deleted')); refresh(); },
  });

  if (!user) return null;
  const photos = q.data ?? [];

  return (
    <section id="photos" className="mt-8 rounded-card border border-default bg-white p-4 shadow-warm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-espresso"><Camera className="size-5 text-gold" /> {L('صوري', 'My photos')}</h2>
          <p className="mt-0.5 text-sm text-ink">{L('صوّر حلاقتك وارفعها هنا 📸 لو اخترت «تظهر للكل» ووافقنا عليها، هتظهر في «شغلنا» وعلى شاشة المحل باسمك. وتقدر كمان ترفع صورة للقَصّة اللي نفسك فيها.', 'Snap your cut and upload it 📸 If you choose “public” and we approve it, it shows in “Our work” and on the shop screen. You can also upload a style you want.')}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}><ImagePlus className="size-4" /> {L('ارفع', 'Upload')}</Button>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => { setPending(e.target.files?.[0] ?? null); e.target.value = ''; }} />
      </div>

      {photos.length === 0 ? (
        <p className="mt-4 rounded-btn bg-sand/50 p-4 text-center text-sm text-ink">{L('لسه مفيش صور. بعد حلاقتك الجاية ممكن الحلاق يصوّرهالك، أو ارفع صورة بنفسك.', 'No photos yet. Your barber can add one after your next cut, or upload one yourself.')}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-btn border border-default bg-cream">
              <button type="button" onClick={() => setView(i)} className="relative block aspect-square w-full bg-sand">
                {p.thumb ? <img src={p.thumb} alt="" loading="lazy" className="size-full object-cover" /> : null}
                {p.status === 'pending' ? (
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-espresso/75 py-0.5 text-[10px] font-medium text-cream"><Clock className="size-3" /> {L('مستنية موافقة', 'Awaiting OK')}</span>
                ) : p.gallery_item_id ? (
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gold/90 py-0.5 text-[10px] font-bold text-espresso"><Check className="size-3" /> {L('في شغلنا', 'In gallery')}</span>
                ) : null}
              </button>
              <div className="flex items-center justify-between gap-1 px-1.5 py-1">
                <button
                  type="button"
                  disabled={!!p.gallery_item_id || setConsent.isPending}
                  onClick={() => setConsent.mutate({ id: p.id, v: !p.share_consent })}
                  title={p.share_consent ? L('موافق تتنشر', 'OK to publish') : L('خاصة', 'Private')}
                  className={cn('flex min-h-7 items-center gap-1 rounded-pill px-1.5 text-[10px] font-medium', p.share_consent ? 'bg-gold/20 text-bark' : 'bg-sand text-ink')}
                >
                  {p.share_consent ? <Globe className="size-3" /> : <Lock className="size-3" />}
                  {p.share_consent ? L('تتنشر', 'Public') : L('خاصة', 'Private')}
                </button>
                {p.uploaded_by === 'customer' && !p.gallery_item_id ? (
                  <button type="button" aria-label={L('مسح', 'Delete')} onClick={() => { if (window.confirm(L('تمسح الصورة؟', 'Delete this photo?'))) del.mutate(p); }} className="flex size-7 items-center justify-center rounded-full text-ink hover:bg-sand">
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 flex items-start gap-1.5 text-xs text-ink"><Lock className="mt-0.5 size-3.5 shrink-0" /> {L('صورك خاصة ليك وللمحل بس. لو اخترت «تتنشر» المحل ممكن ينشرها في «شغلنا» بعد ما يوافق.', 'Your photos are private to you and the shop. If you choose “Public”, the shop may add it to “Our work” after approving.')}</p>

      <Lightbox urls={photos.map((p) => p.full ?? p.thumb ?? '')} index={view} onClose={() => setView(null)} onIndex={setView} caption={(i) => photos[i]?.note ?? null} />

      <Sheet open={!!pending} onClose={() => setPending(null)} title={L('ارفع صورة', 'Upload a photo')}>
        {pending ? (
          <div className="space-y-3">
            <img src={previewUrl ?? ''} alt="" className="max-h-64 w-full rounded-btn object-contain bg-sand" />
            <textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder={L('ملاحظة للحلاق (اختياري): عايز القَصّة دي…', 'Note for the barber (optional)')}
              className="w-full rounded-btn border border-default p-3 text-base focus:border-gold focus:outline-none" />
            <label className="flex items-start gap-3 rounded-btn bg-sand/50 p-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-5 accent-[#CC9542]" checked={share} onChange={(e) => setShare(e.target.checked)} />
              <span><span className="block font-semibold text-espresso">{L('موافق تتنشر في «شغلنا»', 'OK to publish in “Our work”')}</span><span className="text-ink">{L('مش هتتنشر غير لما المحل يوافق.', 'Only after the shop approves.')}</span></span>
            </label>
            <Button fullWidth loading={upload.isPending} onClick={() => upload.mutate()}>{L('ابعت الصورة', 'Send photo')}</Button>
          </div>
        ) : null}
      </Sheet>
    </section>
  );
}
