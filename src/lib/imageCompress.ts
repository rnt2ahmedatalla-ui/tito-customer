/**
 * ضغط الصور جوه المتصفح قبل الرفع (من غير أي سيرفر أو خدمة مدفوعة).
 * أي صورة بأي حجم بتطلع منها نسختين WebP:
 *  - كبيرة للعرض: أطول ضلع حوالي 1600px وحجمها حوالي 200KB
 *  - صغيرة للشبكة: أطول ضلع حوالي 480px وحجمها حوالي 30KB
 * لو المتصفح مبيعرفش يعمل WebP (آيفون قديم) بنستخدم JPEG بنفس الأحجام.
 */

export type CompressedImage = {
  full: Blob;
  thumb: Blob;
  ext: 'webp' | 'jpg';
  contentType: 'image/webp' | 'image/jpeg';
  width: number;
  height: number;
};

export type CompressOptions = {
  fullMaxSide?: number;
  fullTargetBytes?: number;
  thumbMaxSide?: number;
  thumbTargetBytes?: number;
};

type Source = { el: CanvasImageSource; width: number; height: number; close: () => void };

/** خطأ صورة برسالة مفهومة للمستخدم (عربي أو إنجليزي حسب لغة الصفحة) */
export class ImageError extends Error {
  code: string;
  constructor(code: 'IMAGE_DECODE_FAILED' | 'IMAGE_EMPTY' | 'IMAGE_HEIC') {
    const en = typeof document !== 'undefined' && !!document.documentElement.lang?.startsWith('en');
    const msg: Record<string, [string, string]> = {
      IMAGE_DECODE_FAILED: ['الصورة دي المتصفح مش عارف يقراها. جرّب صورة تانية، أو خد لها screenshot وارفعها.', "This image can't be read. Try another photo, or take a screenshot of it and upload that."],
      IMAGE_EMPTY: ['الصورة لسه متحمّلتش على الموبايل (ممكن تكون على Google Photos). افتحها في المعرض الأول وبعدين اختارها تاني.', "The photo isn't on the phone yet (maybe it's in the cloud). Open it in your gallery first, then pick it again."],
      IMAGE_HEIC: ['الصورة بصيغة HEIC والمتصفح مش بيقراها. خد لها screenshot وارفعها، أو خلّي الكاميرا تصوّر JPG.', "This is a HEIC photo the browser can't read. Take a screenshot of it, or set the camera to JPG."],
    };
    const pair = msg[code] ?? ['', ''];
    super(en ? pair[1] : pair[0]);
    this.name = 'ImageError';
    this.code = code;
  }
}

async function tryDecode(file: Blob): Promise<Source | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      if (bmp.width > 0 && bmp.height > 0) return { el: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
      bmp.close();
    } catch {
      /* نجرب الطريقة التانية */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('EMPTY');
    return { el: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/** نوع الصورة من أول بايتات الملف (مش من الاسم) */
export function sniffImageType(b: Uint8Array): string {
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  const ascii = String.fromCharCode(...Array.from(b.slice(0, 16)));
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'image/webp';
  if (ascii.slice(4, 8) === 'ftyp') {
    const brand = ascii.slice(8, 12);
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(brand)) return 'image/heic';
    if (/^avi[fs]$/.test(brand)) return 'image/avif';
  }
  return '';
}

async function decode(file: Blob): Promise<Source> {
  const first = await tryDecode(file);
  if (first) return first;
  // ساعات الموبايل بيدي الملف من غير نوع أو لسه متحمّلش: نقرا البايتات بنفسنا ونجرب تاني
  let buf: ArrayBuffer;
  try {
    buf = await file.arrayBuffer();
  } catch {
    throw new ImageError('IMAGE_EMPTY');
  }
  if (!buf.byteLength) throw new ImageError('IMAGE_EMPTY');
  const type = sniffImageType(new Uint8Array(buf.slice(0, 32)));
  const second = await tryDecode(new Blob([buf], { type: type || file.type || 'image/jpeg' }));
  if (second) return second;
  throw new ImageError(type === 'image/heic' ? 'IMAGE_HEIC' : 'IMAGE_DECODE_FAILED');
}

/** أبعاد جديدة بحيث أطول ضلع ميزدش عن maxSide (ومنكبّرش الصورة الصغيرة) */
export function fitSize(width: number, height: number, maxSide: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 1, height: 1 };
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function draw(src: Source, maxSide: number): HTMLCanvasElement {
  const { width, height } = fitSize(src.width, src.height, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // خلفية بيضا عشان صور PNG الشفافة متطلعش سودا في JPEG
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(src.el, 0, 0, width, height);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('ENCODE_FAILED'))), type, quality);
  });
}

let webpSupport: boolean | null = null;
async function supportsWebp(): Promise<boolean> {
  if (webpSupport !== null) return webpSupport;
  try {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 2;
    const b = await toBlob(c, 'image/webp', 0.8);
    webpSupport = b.type === 'image/webp';
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

/** بيقلل الجودة (وبعدين المقاس لو لزم) لحد ما الحجم يبقى قريب من المطلوب */
async function encodeUnder(src: Source, maxSide: number, targetBytes: number, type: string): Promise<{ blob: Blob; width: number; height: number }> {
  let side = maxSide;
  let best: { blob: Blob; width: number; height: number } | null = null;
  for (let round = 0; round < 6; round += 1) {
    const canvas = draw(src, side);
    for (const q of [0.82, 0.74, 0.66, 0.58, 0.5, 0.42]) {
      const blob = await toBlob(canvas, type, q);
      if (!best || blob.size < best.blob.size) best = { blob, width: canvas.width, height: canvas.height };
      if (blob.size <= targetBytes) return { blob, width: canvas.width, height: canvas.height };
    }
    side = Math.round(side * 0.8);
    if (side < 200) break;
  }
  if (!best) throw new Error('ENCODE_FAILED');
  return best;
}

export async function compressImage(file: Blob, opts: CompressOptions = {}): Promise<CompressedImage> {
  const { fullMaxSide = 1600, fullTargetBytes = 200_000, thumbMaxSide = 480, thumbTargetBytes = 30_000 } = opts;
  const webp = await supportsWebp();
  const contentType = webp ? 'image/webp' : 'image/jpeg';
  const src = await decode(file);
  try {
    const full = await encodeUnder(src, fullMaxSide, fullTargetBytes, contentType);
    const thumb = await encodeUnder(src, thumbMaxSide, thumbTargetBytes, contentType);
    return { full: full.blob, thumb: thumb.blob, ext: webp ? 'webp' : 'jpg', contentType, width: full.width, height: full.height };
  } finally {
    src.close();
  }
}

/** اسم ملف عشوائي ومش متكرر */
export function randomName(): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return rnd.replace(/-/g, '').slice(0, 20);
}
