import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Absolute redirect target for OAuth — always inside this SPA (respects Vite base). */
export function getOAuthRedirectTo(): string {
  const base = import.meta.env.BASE_URL || '/';
  const url = new URL(window.location.href);
  // Drop leftover OAuth params so a mid-booking return URL stays clean
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  url.hash = '';

  // If somehow outside the app base (e.g. GH Pages root), force base home
  const basePath = base.endsWith('/') ? base.slice(0, -1) : base;
  if (basePath && basePath !== '/' && !url.pathname.startsWith(basePath)) {
    return `${url.origin}${basePath}/`;
  }
  return url.toString();
}

function stripOAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  let dirty = false;
  for (const key of ['code', 'state', 'error', 'error_description']) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      dirty = true;
    }
  }
  if (dirty) {
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    const applySession = (next: Session | null) => {
      if (cancelled) return;
      setSession(next);
      setLoading(false);
      if (next) stripOAuthParamsFromUrl();
    };

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error('[auth] getSession', error.message);
          applySession(null);
          return;
        }
        applySession(data.session);
      })
      .catch((err) => {
        console.error('[auth] getSession failed', err);
        applySession(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      applySession(newSession);
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signIn = useCallback(async () => {
    const redirectTo = getOAuthRedirectTo();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    setSession(null);
  }, [queryClient]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signOut,
    }),
    [session, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
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
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
    retry: 2,
  });
}

/** @deprecated Prefer useAuth().signIn — kept for call-site compatibility */
export function useSignIn() {
  const { signIn } = useAuth();
  return signIn;
}

/** @deprecated Prefer useAuth().signOut */
export function useSignOut() {
  const { signOut } = useAuth();
  return signOut;
}

export function isProfileComplete(profile: Profile | null | undefined): boolean {
  return !!(profile?.full_name?.trim() && profile?.phone?.trim());
}
