/**
 * Detects whether the current page is running inside an embedded WebView / in-app browser
 * (e.g. Instagram, Facebook, WhatsApp, TikTok, Snapchat, Twitter/X, etc.).
 *
 * Google blocks OAuth inside these WebViews with HTTP 403 `disallowed_useragent`.
 */
export function isInAppBrowser(): boolean {
  if (typeof window === 'undefined' || !navigator) return false;
  const ua = navigator.userAgent || navigator.vendor || '';
  return /FBAN|FBAV|Instagram|FB_IAB|WhatsApp|TikTok|musical_ly|Bytedance|Snapchat|Twitter|LinkedIn|Line|MicroMessenger|Barcelona/i.test(
    ua,
  );
}
