import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type FaithItem =
  | { kind: 'ayah'; text: string; tafsir: string; surah: string; num: number; source: string }
  | { kind: 'hadith'; id: string; text: string; attribution: string; grade: string; explanation: string; hints: string[]; source: string };

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());

/** آية وحديث اليوم بالشرح — بتتجهّز مرة واحدة في اليوم على السيرفر (مصادر موثوقة ومجانية) */
export function useFaithDaily(enabled = true) {
  return useQuery({
    queryKey: ['faith-daily', today()],
    enabled,
    staleTime: 60 * 60_000,
    refetchInterval: 2 * 60 * 60_000,
    retry: 1,
    queryFn: async (): Promise<FaithItem[]> => {
      const settings = await supabase.from('settings').select('faith_screens' as never).eq('id', 1).maybeSingle();
      if ((settings.data as { faith_screens?: boolean } | null)?.faith_screens === false) return [];
      const { data } = await supabase.from('faith_daily' as never).select('payload').order('day', { ascending: false }).limit(1).maybeSingle();
      const row = data as { payload?: { day: string; items: FaithItem[] } } | null;
      if (row?.payload?.day === today() && row.payload.items?.length) return row.payload.items;
      try {
        const r = await supabase.functions.invoke('faith-daily', { body: {} });
        const items = (r.data as { items?: FaithItem[] } | null)?.items;
        if (items?.length) return items;
      } catch {
        /* نرجع لآخر يوم متخزّن */
      }
      return row?.payload?.items ?? [];
    },
  });
}

export const stripAyahMarks = (s: string) => s.replace(/^[۞\s]+/, '');
