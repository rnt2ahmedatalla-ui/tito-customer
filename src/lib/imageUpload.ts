import { supabase } from '@/lib/supabase';
import { compressImage, randomName } from '@/lib/imageCompress';

export type UploadedPair = { full_path: string; thumb_path: string };

/** بيضغط الصورة ويرفع النسختين (الكبيرة والصغيرة). لو أي خطوة فشلت بيمسح اللي اترفع */
export async function uploadImagePair(bucket: string, folder: string, file: File): Promise<UploadedPair> {
  const img = await compressImage(file);
  const name = randomName();
  const base = folder ? `${folder.replace(/\/+$/, '')}/` : '';
  const full_path = `${base}${name}.${img.ext}`;
  const thumb_path = `${base}${name}_t.${img.ext}`;
  const opts = { contentType: img.contentType, cacheControl: '31536000', upsert: false };
  const a = await supabase.storage.from(bucket).upload(full_path, img.full, opts);
  if (a.error) throw a.error;
  const b = await supabase.storage.from(bucket).upload(thumb_path, img.thumb, opts);
  if (b.error) {
    await supabase.storage.from(bucket).remove([full_path]);
    throw b.error;
  }
  return { full_path, thumb_path };
}

export async function removeImagePair(bucket: string, pair: UploadedPair): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([pair.full_path, pair.thumb_path]);
  if (error) throw error;
}

export function publicImageUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
