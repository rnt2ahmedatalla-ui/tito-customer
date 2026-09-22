import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import { getSupabaseOrigin } from '@/lib/supabase';
import { AuthProvider } from '@/features/profile/useAuth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
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
