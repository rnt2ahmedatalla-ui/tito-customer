import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { extractErrorCode, getErrorReferenceId, mapErrorToI18nKey } from '@/lib/errors';
import { canAttempt, recordAttempt } from '@/lib/rate-limit';
import type { Booking, PaymentMethod, Service } from '@/types/database';

export type BookingDetail = Booking & { service: Service | null };

type RpcUntyped = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export interface StaffMember {
  id: string;
  name: string;
  bio: string | null;
  bio_en: string | null;
  socials: Record<string, string> | null;
  experience_years: number | null;
  photo: string | null;
}

/** الحلاقين الشغالين (فاضية لو الجدول لسه مش موجود أو مفيش طاقم) */
export function useActiveStaff() {
  return useQuery({
    queryKey: ['staff-active'],
    queryFn: async (): Promise<StaffMember[]> => {
      const db = supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (k: string, v: boolean) => { order: (c: string) => Promise<{ data: unknown; error: unknown }> };
          };
        };
      };
      const { data, error } = await db
        .from('staff')
        .select('id, name, bio, bio_en, socials, experience_years, photo')
        .eq('is_active', true)
        .order('sort');
      if (error) return [];
      return (data ?? []) as StaffMember[];
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export interface StaffServiceRow {
  staff_id: string;
  service_id: string;
  is_offered: boolean;
  price_egp: number | string | null;
}

/** الاستثناءات: خدمات الحلاق مش بيقدمها أو بسعر مختلف */
export function useStaffServices() {
  return useQuery({
    queryKey: ['staff-services'],
    queryFn: async (): Promise<StaffServiceRow[]> => {
      const db = supabase as unknown as {
        from: (t: string) => { select: (c: string) => Promise<{ data: unknown; error: unknown }> };
      };
      const { data, error } = await db.from('staff_services').select('staff_id, service_id, is_offered, price_egp');
      if (error) return [];
      return (data ?? []) as StaffServiceRow[];
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useAvailableSlots(
  serviceId: string | null,
  date: string | null,
  staffId: string | null = null,
  enabled = true,
  durationMin: number | null = null,
) {
  return useQuery({
    queryKey: ['slots', serviceId, date, staffId, durationMin],
    queryFn: async (): Promise<string[]> => {
      if (!serviceId || !date) return [];
      // الوقت الكلي (حلاقة + إضافات ليها وقت) بنبعته بس لو فيه إضافة بوقت، غير كده الطلب زي ما كان
      const dur: Record<string, unknown> = durationMin ? { p_duration_min: durationMin } : {};
      if (staffId) {
        const rpcUntyped = supabase.rpc.bind(supabase) as unknown as RpcUntyped;
        const { data, error } = await rpcUntyped(
          staffId === 'any' ? 'get_available_slots_any' : 'get_available_slots_staff',
          staffId === 'any'
            ? { p_service_id: serviceId, p_date: date, ...dur }
            : { p_service_id: serviceId, p_date: date, p_staff_id: staffId, ...dur },
        );
        if (error) throw error;
        return ((data ?? []) as Array<{ start_at: string }>).map((s) => s.start_at);
      }
      const rpcPlain = supabase.rpc.bind(supabase) as unknown as RpcUntyped;
      const { data, error } = await rpcPlain('get_available_slots', { p_service_id: serviceId, p_date: date, ...dur });
      if (error) throw error;
      return ((data ?? []) as Array<{ start_at: string }>).map((s) => s.start_at);
    },
    enabled: enabled && !!serviceId && !!date,
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
      extraIds = [],
      notes,
      coupon = null,
      staffId = null,
    }: {
      serviceId: string;
      startAt: string;
      payAtShop?: boolean;
      extraIds?: string[];
      notes?: string | null;
      coupon?: string | null;
      staffId?: string | null;
    }): Promise<string> => {
      if (!canAttempt('create_booking')) throw new Error('RATE_LIMITED');
      recordAttempt('create_booking');

      if (staffId) {
        const rpcUntyped = supabase.rpc.bind(supabase) as unknown as RpcUntyped;
        const { data, error } = await rpcUntyped('create_booking_staff', {
          p_service_id: serviceId,
          p_start_at: startAt,
          p_pay_at_shop: payAtShop,
          p_extra_ids: extraIds,
          p_notes: notes?.trim() || null,
          p_staff_id: staffId === 'any' ? null : staffId,
          p_coupon: coupon,
        });
        if (error) throw error;
        return data as string;
      }
      if (coupon) {
        // الدالة الجديدة مش في أنواع المشروع، فبنعدّي النوع يدوياً
        const rpcUntyped = supabase.rpc.bind(supabase) as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: string | null; error: { message: string } | null }>;
        const { data, error } = await rpcUntyped('create_booking_with_coupon', {
          p_service_id: serviceId,
          p_start_at: startAt,
          p_pay_at_shop: payAtShop,
          p_extra_ids: extraIds,
          p_notes: notes?.trim() || null,
          p_coupon: coupon,
        });
        if (error) throw error;
        return data as string;
      }
      const { data, error } = await supabase.rpc('create_booking', {
        p_service_id: serviceId,
        p_start_at: startAt,
        p_pay_at_shop: payAtShop,
        p_extra_ids: extraIds,
        p_notes: notes?.trim() || null,
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
