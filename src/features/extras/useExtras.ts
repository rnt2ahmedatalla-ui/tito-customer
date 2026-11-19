import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/profile/useAuth';

// الجداول والدوال دي مش في أنواع المشروع، فبنتعامل معاها بشكل عام
/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: { message: string } | null }> };
/* eslint-enable @typescript-eslint/no-explicit-any */

export type FeatureFlags = { waitlist: boolean; packages: boolean; waitEstimate: boolean };

export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-settings'],
    queryFn: async (): Promise<FeatureFlags> => {
      const { data, error } = await db.from('feature_settings').select('*').eq('id', 1).maybeSingle();
      if (error || !data) return { waitlist: false, packages: false, waitEstimate: false };
      return { waitlist: !!data.waitlist_enabled, packages: !!data.packages_enabled, waitEstimate: !!data.wait_estimate_enabled };
    },
    staleTime: 60_000,
    retry: false,
  });
}

/** لو جيت دلوقتي هتستنى كام دقيقة (null لو المميزة مقفولة) */
export function useQueueEstimate(enabled: boolean) {
  return useQuery({
    queryKey: ['queue-estimate'],
    enabled,
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await db.rpc('queue_estimate');
      if (error || !data || !data.enabled) return null;
      return Number(data.minutes ?? 0);
    },
    refetchInterval: 60_000,
    retry: false,
  });
}

export type MyPackage = {
  id: string;
  name_ar: string;
  name_en: string;
  sessions_left: number;
  sessions_total: number;
  expires_at: string;
};

export function useMyPackages(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-packages', user?.id],
    enabled: enabled && !!user,
    queryFn: async (): Promise<MyPackage[]> => {
      const { data, error } = await db
        .from('customer_packages')
        .select('id, name_ar, name_en, sessions_left, sessions_total, expires_at')
        .gt('sessions_left', 0)
        .order('expires_at');
      if (error) return [];
      return (data ?? []) as MyPackage[];
    },
    retry: false,
  });
}

export type WaitEntry = { id: string; day: string; status: string };

export function useMyWaitlist(day: string | null, enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-waitlist', user?.id, day],
    enabled: enabled && !!user && !!day,
    queryFn: async (): Promise<WaitEntry | null> => {
      const { data, error } = await db
        .from('waitlist')
        .select('id, day, status')
        .eq('day', day)
        .in('status', ['waiting', 'notified'])
        .maybeSingle();
      if (error) return null;
      return (data ?? null) as WaitEntry | null;
    },
    retry: false,
  });
}

export function useWaitlistActions() {
  const qc = useQueryClient();
  const join = useMutation({
    mutationFn: async (v: { service: string | null; day: string; note: string }) => {
      const { error } = await db.rpc('waitlist_join', { p_service: v.service, p_day: v.day, p_note: v.note || null });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-waitlist'] }),
  });
  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc('waitlist_cancel', { p_id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-waitlist'] }),
  });
  return { join, cancel };
}

export type VisitStatus = {
  enabled: boolean;
  after_days?: number;
  has_upcoming?: boolean;
  days_since?: number | null;
  last_service_id?: string | null;
  last_staff_id?: string | null;
};

/** حالة العميل: بقاله كام يوم من آخر حلاقة (للبانر "وحشتنا") */
export function useVisitStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['visit-status', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<VisitStatus> => {
      const { data, error } = await db.rpc('my_visit_status');
      if (error || !data) return { enabled: false };
      return data as VisitStatus;
    },
    staleTime: 60_000,
    retry: false,
  });
}

/** العميل غاب كذا مرة وبقى لازم يدفع مقدماً (من إعدادات الأدمن) */
export function usePrepayRequired() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['prepay-required', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await db.rpc('my_prepay_required');
      if (error) return false;
      return data === true;
    },
    staleTime: 60_000,
    retry: false,
  });
}

export type RateableBooking = { id: string; rate_token: string; service_name_ar: string; service_name_en: string; start_at: string };

/** آخر حلاقة اكتملت ولسه العميل مقيّمهاش (خلال 14 يوم) */
export function useRateableBooking() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['rateable-latest', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<RateableBooking | null> => {
      const since = new Date(Date.now() - 14 * 86400_000).toISOString();
      const { data, error } = await db
        .from('bookings')
        .select('id, rate_token, service_name_ar, service_name_en, start_at')
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .gte('start_at', since)
        .not('rate_token', 'is', null)
        .order('start_at', { ascending: false })
        .limit(3);
      if (error || !data || data.length === 0) return null;
      const rows = data as RateableBooking[];
      const { data: used } = await db.from('reviews').select('rate_token').in('rate_token', rows.map((r) => r.rate_token));
      const usedSet = new Set(((used ?? []) as Array<{ rate_token: string }>).map((r) => r.rate_token));
      return rows.find((r) => !usedSet.has(r.rate_token)) ?? null;
    },
    staleTime: 60_000,
    retry: false,
  });
}
