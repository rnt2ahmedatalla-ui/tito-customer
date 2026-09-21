import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Service, Settings, WorkingHours } from '@/types/database';

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async (): Promise<Service[]> => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<Settings | null> => {
      const { data, error } = await supabase.from('settings').select('*').limit(1).single();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

export function useWorkingHours() {
  return useQuery({
    queryKey: ['working_hours'],
    queryFn: async (): Promise<WorkingHours[]> => {
      const { data, error } = await supabase
        .from('working_hours')
        .select('*')
        .order('day_of_week');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useNextSlot() {
  return useQuery({
    queryKey: ['next_slot'],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.rpc('get_next_available_slot');
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
