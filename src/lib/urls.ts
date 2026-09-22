const EGYPT_MOBILE_RE = /^01[0125]\d{8}$/;

const ALLOWED_SCHEMES = ['https:'];

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/** Normalize Egyptian mobile to international digits for wa.me */
export function toWhatsAppDigits(phone: string): string | null {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('20') && cleaned.length === 12) return cleaned;
  if (EGYPT_MOBILE_RE.test(cleaned)) return `20${cleaned.slice(1)}`;
  if (cleaned.length >= 10) return cleaned;
  return null;
}

export function buildWhatsAppUrl(phone: string, message?: string): string | null {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message.slice(0, 900))}`;
  }
  return base;
}
