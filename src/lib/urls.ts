const ALLOWED_SCHEMES = ['https:'];

export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function buildWhatsAppUrl(phone: string, message?: string): string | null {
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return null;
  const base = `https://wa.me/${cleaned}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
}
