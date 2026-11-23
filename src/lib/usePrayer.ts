import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;
const LAT = 30.5877, LNG = 31.502; // الزقازيق — بني عامر
const KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export const PRAYER_NAMES: Record<string, [string, string]> = { fajr: ['الفجر', 'Fajr'], dhuhr: ['الظهر', 'Dhuhr'], asr: ['العصر', 'Asr'], maghrib: ['المغرب', 'Maghrib'], isha: ['العشاء', 'Isha'] };
const ymd = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(ms);

/** مواعيد الصلاة النهارده وبكرة (محسوبة فلكياً في قاعدة البيانات — مجاني ومن غير API) */
export function usePrayerTimes() {
  return useQuery({
    queryKey: ['prayer-times', ymd(Date.now())],
    staleTime: 60 * 60_000,
    refetchInterval: 60 * 60_000,
    queryFn: async () => {
      const days = [ymd(Date.now()), ymd(Date.now() + 86_400_000)];
      const out: Array<{ key: string; at: number }> = [];
      for (const d of days) {
        const r = await rpc('prayer_times', { p_date: d, p_lat: LAT, p_lng: LNG });
        if (r.error) throw new Error(r.error.message);
        const o = (r.data ?? {}) as Record<string, string>;
        for (const k of KEYS) if (o[k]) out.push({ key: k, at: Date.parse(o[k]!) });
      }
      return out.sort((a, b) => a.at - b.at);
    },
  });
}

export function nextPrayer(list: Array<{ key: string; at: number }> | undefined, now: number) {
  return list?.find((p) => p.at > now) ?? null;
}

export function fmtLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}
