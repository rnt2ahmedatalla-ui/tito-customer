import { supabase } from '@/lib/supabase';

const VAPID_PUBLIC_KEY = 'BK-_hVyrW02w389B9reVSNKRm7pgua5VuypBvrlHCCMcvyp0uXV27tt6e7VKFMsCg-t0VA8sIgqzDVLkkKXrlj4';

const rpc = supabase.rpc.bind(supabase);

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function b64ToBuffer(b64: string): ArrayBuffer {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

/** وعد بينتهي بعد مدة: أي خطوة في الإشعارات (خدمة الخلفية، إذن، اشتراك) ممنوع تعلّق للأبد */
export function withTimeout<T>(p: PromiseLike<T>, ms: number, tag = 'TIMEOUT'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error(tag)), ms);
    Promise.resolve(p).then(
      (v) => { window.clearTimeout(id); resolve(v); },
      (e) => { window.clearTimeout(id); reject(e); },
    );
  });
}

/**
 * navigator.serviceWorker.ready بيفضل معلّق للأبد لو مفيش خدمة خلفية مسجّلة أو لسه بتتفعّل.
 * هنا: لو مفيش تسجيل بنسجّل بنفسنا، وبنستنى بحد أقصى.
 */
async function swReady(ms = 8000): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing && import.meta.env.PROD) {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`.replace(/\/{2,}/g, '/');
    await navigator.serviceWorker.register(swUrl);
  }
  return withTimeout(navigator.serviceWorker.ready, ms, 'SW_NOT_READY');
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await swReady();
  return reg.pushManager.getSubscription();
}

export type PushResult = 'ok' | 'denied' | 'dismissed' | 'unsupported' | 'timeout' | 'error';

async function subscribeNow(reg: ServiceWorkerRegistration): Promise<PushSubscription> {
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  // الاشتراك ساعات بيعلّق على أندرويد لو خدمات جوجل بطيئة: نحاول مرتين بحد أقصى
  try {
    return await withTimeout(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBuffer(VAPID_PUBLIC_KEY) }), 15000, 'SUBSCRIBE_TIMEOUT');
  } catch (e) {
    if ((e as Error).message !== 'SUBSCRIBE_TIMEOUT') throw e;
    return withTimeout(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBuffer(VAPID_PUBLIC_KEY) }), 15000, 'SUBSCRIBE_TIMEOUT');
  }
}

async function askPermission(): Promise<NotificationPermission> {
  if (Notification.permission !== 'default') return Notification.permission;
  // الإذن بيستنى العميل؛ لكن لو النافذة ما ظهرتش خالص منسيبش الزرار يلف للأبد
  return Notification.requestPermission();
}

export async function pushIsOn(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  try { return !!(await currentSubscription()); } catch { return false; }
}

async function saveToServer(sub: PushSubscription, lang: string) {
  const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) throw new Error('BAD_SUBSCRIPTION');
  const { error } = await rpc('save_push_subscription', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_lang: lang });
  if (error) throw new Error(error.message);
}

const CHANGED = 'tito:push-changed';
export function onPushChanged(cb: () => void): () => void {
  window.addEventListener(CHANGED, cb);
  return () => window.removeEventListener(CHANGED, cb);
}

// عملية تفعيل واحدة بس شغالة في نفس الوقت. لو الزرار انتهت مهلته والعملية لسه شغالة (مثلاً نافذة الإذن مفتوحة)،
// المحاولة التانية بتنضم لنفس العملية بدل ما تطلب إذن أو اشتراك جديد.
let inflight: Promise<PushResult> | null = null;

async function runEnable(lang: string, loggedIn: boolean): Promise<PushResult> {
  try {
    const perm = await askPermission();
    if (perm === 'denied') return 'denied';
    if (perm !== 'granted') return 'dismissed';
    const reg = await swReady();
    const sub = await subscribeNow(reg); // بيرجّع الاشتراك الموجود لو فيه، فمفيش اشتراك مكرر
    if (loggedIn) await withTimeout(saveToServer(sub, lang), 15000, 'SAVE_TIMEOUT');
    return 'ok';
  } catch (e) {
    const m = (e as Error).message ?? '';
    return /TIMEOUT|NOT_READY/.test(m) ? 'timeout' : 'error';
  }
}

/** يطلب إذن الإشعارات ويسجّل الجهاز. بيرجع نتيجة واضحة بدل ما يعلّق */
export async function enablePushDetailed(lang: string, loggedIn = true): Promise<PushResult> {
  if (!pushSupported()) return 'unsupported';
  if (!inflight) {
    inflight = runEnable(lang, loggedIn).then((r) => {
      inflight = null;
      window.dispatchEvent(new Event(CHANGED)); // حتى لو خلصت متأخر، الواجهة تتحدّث
      return r;
    });
  }
  return Promise.race([inflight, new Promise<PushResult>((res) => window.setTimeout(() => res('timeout'), 30000))]);
}

/** يطلب إذن الإشعارات ويسجّل الجهاز. بيرجع true لو اشتغل */
export async function enablePush(lang: string): Promise<boolean> {
  return (await enablePushDetailed(lang, true)) === 'ok';
}

/** لو الإذن متاح، نجدد تسجيل الجهاز بهدوء (لو العنوان اتغير) */
export async function resyncPush(lang: string): Promise<void> {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return;
    const sub = await currentSubscription();
    if (sub) await saveToServer(sub, lang);
  } catch { /* ignore */ }
}

/**
 * أول زيارة (حتى قبل تسجيل الدخول): ناخد إذن الإشعارات ونجهّز الجهاز.
 * لو العميل داخل بحسابه بيتسجّل على طول، ولو لأ بيتسجّل أول ما يدخل (resyncPush).
 */
export async function preparePushDetailed(lang: string, loggedIn: boolean): Promise<PushResult> {
  return enablePushDetailed(lang, loggedIn);
}

export async function preparePush(lang: string, loggedIn: boolean): Promise<boolean> {
  return (await preparePushDetailed(lang, loggedIn)) === 'ok';
}
