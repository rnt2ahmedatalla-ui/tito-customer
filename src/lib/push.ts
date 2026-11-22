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

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
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

/** يطلب إذن الإشعارات ويسجّل الجهاز. بيرجع true لو اشتغل */
export async function enablePush(lang: string): Promise<boolean> {
  if (!pushSupported()) return false;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBuffer(VAPID_PUBLIC_KEY) });
  }
  await saveToServer(sub, lang);
  return true;
}

/** لو الإذن متاح، نجدد تسجيل الجهاز بهدوء (لو العنوان اتغير) */
export async function resyncPush(lang: string): Promise<void> {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return;
    const sub = await currentSubscription();
    if (sub) await saveToServer(sub, lang);
  } catch { /* ignore */ }
}
