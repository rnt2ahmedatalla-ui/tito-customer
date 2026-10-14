import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { supabase, getSupabaseOrigin } from '@/lib/supabase';
import { AuthProvider } from '@/features/profile/useAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export { queryClient };

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const origin = getSupabaseOrigin();
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    document.head.appendChild(link);

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`.replace(/\/{2,}/g, '/');
      navigator.serviceWorker.register(swUrl).catch(() => {
        /* SW registration optional */
      });
    }

    // Subscribe to realtime database changes so any admin edit reflects immediately
    const channel = supabase
      .channel('customer-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['settings'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['services'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['products'] });
        void queryClient.invalidateQueries({ queryKey: ['product'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'working_hours' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['working_hours'] });
        void queryClient.invalidateQueries({ queryKey: ['next_slot'] });
        void queryClient.invalidateQueries({ queryKey: ['slots'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_breaks' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['slots'] });
        void queryClient.invalidateQueries({ queryKey: ['next_slot'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_off' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['slots'] });
        void queryClient.invalidateQueries({ queryKey: ['next_slot'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['review-stats'] });
        void queryClient.invalidateQueries({ queryKey: ['recent-reviews'] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: 'font-arabic bg-espresso text-cream border border-bark',
            },
          }}
          richColors
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
