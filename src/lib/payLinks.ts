/** Build a clickable href for InstaPay / Vodafone Cash values (URL or phone). */
export function paymentHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^upi:\/\//i.test(v) || /^instapay:\/\//i.test(v)) return v;
  // Common cash / deep-link schemes
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  // Egyptian mobile → tel: (opens dialer / cash apps that register tel)
  if (/^01[0125]\d{8}$/.test(v)) return `tel:${v}`;
  // Bare domain/path payment links (vodafone / ipn style)
  if (/^(www\.)?[\w-]+\.[\w.-]+(\/[\S]*)?$/i.test(v)) return `https://${v.replace(/^\/\//, '')}`;
  // InstaPay IPA / email-like handle
  if (v.includes('@') && !v.includes(' ')) {
    return `https://ipn.eg/IPN/PaymentRequest?recipient=${encodeURIComponent(v)}`;
  }
  return null;
}

/**
 * Returns a safe https link for InstaPay ONLY when the saved value is really a link
 * (https://... or ipn.eg/...). Phone numbers / InstaPay addresses return null,
 * so the customer sees the value with a copy button instead of a wrong link.
 */
export function instapayLink(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  let url: string | null = null;
  if (/^https:\/\//i.test(v)) url = v;
  else if (/^http:\/\//i.test(v)) url = v.replace(/^http:/i, 'https:');
  else if (/^(www\.)?ipn\.eg(\/|$)/i.test(v)) url = `https://${v}`;
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
