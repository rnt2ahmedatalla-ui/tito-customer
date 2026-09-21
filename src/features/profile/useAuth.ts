import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (event === 'SIGNED_OUT') {
          queryClient.clear();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return { session, user: session?.user ?? null, loading };
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function useSignIn() {
  return async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw error;
  };
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  };
}

export function isProfileComplete(profile: Profile | null | undefined): boolean {
  return !!(profile?.full_name && profile?.phone);
}
