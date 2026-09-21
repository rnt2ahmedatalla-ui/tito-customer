import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { extractErrorCode, getErrorReferenceId, mapErrorToI18nKey } from '@/lib/errors';
import { canAttempt, recordAttempt } from '@/lib/rate-limit';
import type { BookingWithDetails } from '@/types/database';
import { useAuth } from '@/features/profile/useAuth';

export function useBookings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: ['bookings', user?.id],
    queryFn: async (): Promise<BookingWithDetails[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('bookings')
        .select('*, service:services(*), payments(*)')
        .eq('user_id', user.id)
        .order('start_at', { ascending: false });
      if (error) throw error;

      return (data ?? []).map((row) => ({
        ...row,
        service: row.service as BookingWithDetails['service'],
        payment: Array.isArray(row.payments) ? row.payments[0] ?? null : row.payments ?? null,
      }));
    },
    enabled: !!user,
    staleTime: 0,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`bookings:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status?: string }).status;
          if (newStatus === 'confirmed') {
            toast.success(t('bookings.confirmedToast'));
          }
          queryClient.invalidateQueries({ queryKey: ['bookings', user.id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, t]);

  return query;
}

export function useCancelBooking() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      if (!canAttempt('cancel_booking')) throw new Error('RATE_LIMITED');
      recordAttempt('cancel_booking');

      const { error } = await supabase.rpc('customer_cancel_booking', {
        p_booking_id: bookingId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'RATE_LIMITED') {
        toast.error(t('errors.rateLimited'));
        return;
      }
      const code = extractErrorCode(error);
      toast.error(t(mapErrorToI18nKey(code)), {
        description: code === 'UNKNOWN' ? t('errors.reference', { id: getErrorReferenceId(error) }) : undefined,
      });
    },
  });
}
