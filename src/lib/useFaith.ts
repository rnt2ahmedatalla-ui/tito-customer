import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type FaithItem =
  | { kind: 'ayah'; text: string; tafsir: string; surah: string; num: number; source: string; pool_id?: string }
  | { kind: 'hadith'; id?: string; text: string; attribution: string; grade: string; explanation: string; hints: string[]; source: string; pool_id?: string };

type Rpc = (fn: string, a?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

/** المناسبة حسب التقويم الهجري (أم القرى) + يوم الجمعة — عشان المحتوى يبقى مناسب للوقت */
export function hijriTags(d = new Date()): string[] {
  const tags: string[] = [];
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'numeric' }).formatToParts(d);
    const m = Number(parts.find((p) => p.type === 'month')?.value), day = Number(parts.find((p) => p.type === 'day')?.value);
    if (m === 9) tags.push('ramadan');
    if (m === 12 && day <= 13) tags.push('hajj');
    if (m === 1 && day >= 8 && day <= 11) tags.push('muharram');
  } catch { /* متصفح قديم */ }
  if (new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', weekday: 'short' }).format(d) === 'Fri') tags.push('friday');
  return tags;
}

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());

/** احتياطي لو المخزن مش متاح: آية وحديث اليوم */
function useFallback(enabled: boolean) {
  return useQuery({
    queryKey: ['faith-daily', today()],
    enabled,
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<FaithItem[]> => {
      const { data } = await supabase.from('faith_daily' as never).select('payload').order('day', { ascending: false }).limit(1).maybeSingle();
      return ((data as { payload?: { items?: FaithItem[] } } | null)?.payload?.items ?? []);
    },
  });
}

/** آية/حديث متجددين: كل ضغطة «التالي» أو كل intervalSec ثانية بيجي واحد جديد ومن غير تكرار */
export function useFaithRotator(opts: { intervalSec?: number; auto?: boolean; enabled?: boolean; fetch?: boolean } = {}) {
  const { intervalSec = 30, auto = true, enabled = true, fetch = true } = opts;
  const [item, setItem] = useState<FaithItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [off, setOff] = useState(false);
  const fb = useFallback(enabled && off);
  const fbIdx = useRef(0);
  const busy = useRef(false);
  const next = useCallback(async () => {
    if (busy.current || !enabled) return;
    busy.current = true; setLoading(true);
    try {
      const r = await rpc('faith_next', { p_tags: hijriTags() });
      if (r.error || !r.data) throw new Error('empty');
      setItem(r.data as FaithItem);
    } catch {
      setOff(true);
    } finally { busy.current = false; setLoading(false); }
  }, [enabled]);
  // مفتاح تشغيل/إيقاف المحتوى من الإعدادات
  const toggle = useQuery({
    queryKey: ['faith-screens-flag'],
    staleTime: 10 * 60_000,
    enabled,
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('faith_screens, faith_interval_sec' as never).eq('id', 1).maybeSingle();
      const d = data as { faith_screens?: boolean; faith_interval_sec?: number } | null;
      return { on: d?.faith_screens !== false, interval: Math.max(10, Math.min(3600, Number(d?.faith_interval_sec ?? 120))) };
    },
  });
  const on = enabled && toggle.data?.on !== false;
  useEffect(() => { if (on && fetch) void next(); }, [on, fetch, next]);
  useEffect(() => {
    if (!on || !auto) return;
    const id = window.setTimeout(() => void next(), intervalSec * 1000);
    return () => window.clearTimeout(id);
  }, [on, auto, intervalSec, item, next]);
  // احتياطي: نلف على آيات/أحاديث اليوم
  const fbItem = off && fb.data?.length ? fb.data[fbIdx.current % fb.data.length] ?? null : null;
  const nextAny = useCallback(() => { if (off) { fbIdx.current += 1; setItem((x) => (x ? { ...x } : x)); } else void next(); }, [off, next]);
  return { item: on ? (item ?? fbItem) : null, next: nextAny, loading, enabled: on, interval: toggle.data?.interval ?? 40 };
}

export const stripAyahMarks = (s: string) => s.replace(/^[۞\s]+/, '');
