import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const db = supabase;

export type SeasonPeriod = {
  id: string;
  name_ar: string;
  name_en: string | null;
  start_date: string;
  end_date: string;
  release_on: string | null;
  open_time: string;
  close_time: string;
};

/** مواسم/أعياد شغالة ولسه نهايتها ماجتش. فاضية لو الجدول مش موجود (قبل تشغيل SQL). */
export function useSeasons() {
  return useQuery({
    queryKey: ['special-periods'],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<SeasonPeriod[]> => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
      const { data, error } = await db
        .from('special_periods')
        .select('id,name_ar,name_en,start_date,end_date,release_on,open_time,close_time')
        .eq('is_active', true)
        .gte('end_date', today)
        .order('start_date');
      if (error || !data) return [];
      return data as SeasonPeriod[];
    },
  });
}

export function seasonFor(periods: SeasonPeriod[] | undefined, key: string): SeasonPeriod | undefined {
  return (periods ?? []).find((p) => key >= p.start_date && key <= p.end_date);
}

/** الموسم لسه مقفول للحجز (معاد الفتح ماجاش)؟ */
export function seasonLocked(p: SeasonPeriod | undefined): boolean {
  if (!p || !p.release_on) return false;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
  return today < p.release_on;
}
