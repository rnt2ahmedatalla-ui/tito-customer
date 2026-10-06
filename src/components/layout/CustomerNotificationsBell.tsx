import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/profile/useAuth';
import { cn } from '@/lib/cn';

export type CustomerNotification = {
  id: string;
  kind: string;
  title_ar: string;
  title_en: string;
  body_ar: string | null;
  body_en: string | null;
  entity: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

export function useCustomerNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['customer-notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as CustomerNotification[];
    },
    staleTime: 15_000,
    refetchInterval: user ? 45_000 : false,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('customer_mark_notifications_read');
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['customer-notifications'] }),
  });

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('customer_mark_notifications_read', { p_ids: [id] });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['customer-notifications'] }),
  });

  const data = query.data ?? [];
  const unread = data.filter((n) => !n.is_read).length;

  return { data, unread, markAll, markOne, isLoading: query.isLoading };
}

export function CustomerNotificationsBell({ dark = false }: { dark?: boolean }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, unread, markAll, markOne } = useCustomerNotifications();
  const [open, setOpen] = useState(false);
  const locale = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  if (!user) return null;

  const openItem = (n: CustomerNotification) => {
    setOpen(false);
    if (!n.is_read) void markOne.mutate(n.id);
    navigate('/bookings');
  };

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          'relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-btn p-2',
          dark
            ? 'border border-cream/20 text-cream hover:bg-cream/10'
            : 'border border-default text-ink hover:bg-sand',
        )}
        aria-label={t('notifications.title')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute -end-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-espresso">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-12 z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-card border border-default bg-white shadow-lg">
            <div className="flex items-center justify-between gap-2 border-b border-default px-3 py-2.5">
              <p className="text-sm font-semibold text-espresso">{t('notifications.title')}</p>
              {unread > 0 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-gold"
                  onClick={() => void markAll.mutate()}
                >
                  {t('notifications.markAll')}
                </button>
              ) : null}
            </div>
            <ul className="max-h-72 divide-y divide-default overflow-y-auto">
              {data.length === 0 ? (
                <li className="px-3 py-5 text-sm text-ink">{t('notifications.empty')}</li>
              ) : (
                data.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full flex-col gap-0.5 px-3 py-3 text-start hover:bg-sand/50',
                        !n.is_read && 'bg-gold/10',
                      )}
                      onClick={() => openItem(n)}
                    >
                      <span className="text-sm font-semibold text-espresso">
                        {locale === 'ar' ? n.title_ar : n.title_en}
                      </span>
                      {(locale === 'ar' ? n.body_ar : n.body_en) ? (
                        <span className="text-xs text-ink">
                          {locale === 'ar' ? n.body_ar : n.body_en}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
