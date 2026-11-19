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
