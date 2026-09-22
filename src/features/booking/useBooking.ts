import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { extractErrorCode, getErrorReferenceId, mapErrorToI18nKey } from '@/lib/errors';
import { canAttempt, recordAttempt } from '@/lib/rate-limit';
import type { Booking, PaymentMethod, Service } from '@/types/database';

export type BookingDetail = Booking & { service: Service | null };

export function useAvailableSlots(serviceId: string | null, date: string | null) {
  return useQuery({
    queryKey: ['slots', serviceId, date],
    queryFn: async (): Promise<string[]> => {
      if (!serviceId || !date) return [];
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_service_id: serviceId,
        p_date: date,
      });
      if (error) throw error;
      return (data ?? []).map((s) => s.start_at);
    },
    enabled: !!serviceId && !!date,
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateBooking() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serviceId,
      startAt,
      payAtShop = false,
    }: {
      serviceId: string;
      startAt: string;
      payAtShop?: boolean;
    }): Promise<string> => {
      if (!canAttempt('create_booking')) throw new Error('RATE_LIMITED');
      recordAttempt('create_booking');

      const { data, error } = await supabase.rpc('create_booking', {
        p_service_id: serviceId,
        p_start_at: startAt,
        p_pay_at_shop: payAtShop,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['next_slot'] });
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

export function useSubmitPayment() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      method,
    }: {
      bookingId: string;
      method: PaymentMethod;
      /** @deprecated proof upload removed — WhatsApp only */
      transactionRef?: string;
      proofBlob?: Blob | null;
      userId?: string;
    }) => {
      if (!canAttempt('submit_payment')) throw new Error('RATE_LIMITED');
      recordAttempt('submit_payment');

      const { error } = await supabase.rpc('submit_payment', {
        p_booking_id: bookingId,
        p_method: method,
        p_transaction_ref: 'whatsapp',
        p_proof_path: '',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking'] });
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

export function useBooking(bookingId: string | null) {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async (): Promise<BookingDetail | null> => {
      if (!bookingId) return null;
      const { data, error } = await supabase
        .from('bookings')
        .select('*, service:services(*)')
        .eq('id', bookingId)
        .single();
      if (error) throw error;
      return {
        ...data,
        service: data.service as Service | null,
      };
    },
    enabled: !!bookingId,
  });
}
