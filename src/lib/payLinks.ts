/** Build a clickable href for InstaPay / Vodafone Cash values (URL or phone). */
export function paymentHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^upi:\/\//i.test(v) || /^instapay:\/\//i.test(v)) return v;
  // Egyptian mobile → tel: (opens dialer / cash apps that register tel)
  if (/^01[0125]\d{8}$/.test(v)) return `tel:${v}`;
  // InstaPay IPA / email-like handle
  if (v.includes('@') && !v.includes(' ')) {
    return `https://ipn.eg/IPN/PaymentRequest?recipient=${encodeURIComponent(v)}`;
  }
  return null;
}
