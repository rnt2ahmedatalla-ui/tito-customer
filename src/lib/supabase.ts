import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

/**
 * حد أقصى لطلبات الجلسة بس: تجديد التوكن وقراءة المستخدم. دول اللي بيمسكوا قفل الجلسة،
 * فلو واحد منهم علّق الموقع كله بيستنى. أي طلب تاني (حجز، دفع، RPC، رفع صور) ملوش مهلة هنا
 * عشان الإلغاء ما يتفسّرش إنه فشل والعميل يعيد عملية اتنفذت فعلاً.
 */
const AUTH_TIMEOUT_MS = 10_000;
const isSessionRead = (url: string, method: string) =>
  (method === 'GET' && /\/auth\/v1\/user(\?|$)/.test(url)) ||
  (method === 'POST' && /\/auth\/v1\/token\?grant_type=refresh_token/.test(url));

export const timedFetch: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
  if (!isSessionRead(url, method) || init?.signal?.aborted) return fetch(input, init);
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), AUTH_TIMEOUT_MS);
  const outer = init?.signal;
  if (outer) outer.addEventListener('abort', () => ctrl.abort(), { once: true });
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(id));
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: { fetch: timedFetch },
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    autoRefreshToken: true,
    persistSession: true,
  },
});

export function getSupabaseOrigin(): string {
  return new URL(supabaseUrl).origin;
}

/**
 * دوال قاعدة البيانات بتقبل NULL في بعض الخانات، بس مولّد الأنواع بيكتبها string.
 * الدالة دي بتعدّي null بشكل صريح في المكان ده بس.
 */
export function nullableArg<T>(value: T | null): T {
  return value as T;
}
