import imageCompression from 'browser-image-compression';

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 200 * 1024;

type AllowedMime = 'image/jpeg' | 'image/png' | 'image/webp';

const MAGIC_BYTES: { mime: AllowedMime; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

export function detectMimeFromBytes(bytes: Uint8Array): AllowedMime | null {
  for (const { mime, bytes: magic } of MAGIC_BYTES) {
    if (magic.every((b, i) => bytes[i] === b)) {
      if (mime === 'image/webp') {
        const webpSig = [0x57, 0x45, 0x42, 0x50];
        if (!webpSig.every((b, i) => bytes[8 + i] === b)) continue;
      }
      return mime;
    }
  }
  return null;
}

export async function detectMimeFromMagicBytes(file: File): Promise<AllowedMime | null> {
  const buffer = await file.arrayBuffer();
  return detectMimeFromBytes(new Uint8Array(buffer).slice(0, 12));
}

export async function reencodeViaCanvas(file: File): Promise<Blob> {
  const mime = await detectMimeFromMagicBytes(file);
  if (!mime) throw new Error('INVALID_IMAGE_TYPE');

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const maxDim = 1280;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('CANVAS_ERROR'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('ENCODE_ERROR'));
        },
        'image/jpeg',
        0.72,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('LOAD_ERROR'));
    };
    img.src = url;
  });
}

export async function compressPaymentProof(file: File): Promise<{ blob: Blob; beforeBytes: number; afterBytes: number }> {
  if (file.size > MAX_INPUT_BYTES) throw new Error('FILE_TOO_LARGE');

  const mime = await detectMimeFromMagicBytes(file);
  if (!mime) throw new Error('INVALID_IMAGE_TYPE');

  const reencoded = await reencodeViaCanvas(file);
  let compressed: Blob = reencoded;

  if (reencoded.size > MAX_OUTPUT_BYTES) {
    const compressedFile = await imageCompression(
      new File([reencoded], 'proof.jpg', { type: 'image/jpeg' }),
      {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        fileType: 'image/jpeg',
      },
    );
    compressed = compressedFile;
  }

  if (compressed.size > MAX_OUTPUT_BYTES) {
    throw new Error('COMPRESSION_FAILED');
  }

  return {
    blob: compressed,
    beforeBytes: file.size,
    afterBytes: compressed.size,
  };
}

export function buildProofPath(userId: string, bookingId: string): string {
  return `${userId}/${bookingId}-${Date.now()}.jpg`;
}
