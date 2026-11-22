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
