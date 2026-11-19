import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/profile/useAuth';

export interface LoyaltySettings {
  enabled: boolean;
  points_per_100_egp: number;
  egp_per_point: number;
  min_redeem_points: number;
  max_redeem_percent: number;
}
export interface LedgerRow {
  id: string;
  booking_id: string | null;
  kind: 'earn' | 'redeem' | 'refund' | 'adjust';
  points: number;
  note: string | null;
  created_at: string;
}

// الجداول دي مش في أنواع المشروع، فبنتعامل معاها بشكل عام
const db = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => {
      eq: (k: string, v: unknown) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
      order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

export function useLoyaltySettings() {
  return useQuery({
    queryKey: ['loyalty-settings'],
    queryFn: async (): Promise<LoyaltySettings | null> => {
      const { data, error } = await db.from('loyalty_settings').select('*').eq('id', 1).maybeSingle();
      if (error || !data) return null;
      const r = data as Record<string, unknown>;
      return {
        enabled: !!r.enabled,
        points_per_100_egp: Number(r.points_per_100_egp),
        egp_per_point: Number(r.egp_per_point),
        min_redeem_points: Number(r.min_redeem_points),
        max_redeem_percent: Number(r.max_redeem_percent),
      };
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useLoyaltyLedger() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['loyalty-ledger', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LedgerRow[]> => {
      const { data, error } = await db.from('loyalty_ledger').select('id, booking_id, kind, points, note, created_at').order('created_at', { ascending: false });
      if (error) return [];
      return (data ?? []) as LedgerRow[];
    },
    staleTime: 0,
    retry: false,
  });
}
