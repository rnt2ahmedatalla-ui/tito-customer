import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { nullableArg, supabase } from '@/lib/supabase';
import { useAuth } from '@/features/profile/useAuth';

export type StoreCategory = { id: string; name_ar: string; name_en: string | null; icon: string; sort: number };
export type StoreProduct = {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price_egp: number;
  image_path: string | null;
  thumb_path: string | null;
  category_id: string | null;
  in_stock: boolean;
  is_featured: boolean;
  sort_order: number;
};
export type MyOrder = {
  id: string;
  product_id: string | null;
  product_name_ar: string;
  product_name_en: string | null;
  qty: number;
  price_egp: number;
  status: string;
  pay_mode: string;
  booking_id: string | null;
  created_at: string;
  booking: { start_at: string } | null;
};
export type MyRequest = { id: string; product_name: string; status: string; created_at: string; product_id: string | null };

export function useLang() {
  const { i18n } = useTranslation();
  const ar = !!i18n.language?.startsWith('ar');
  return { ar, L: (a: string, e: string) => (ar ? a : e) };
}

export function productImg(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}

export const pName = (p: { name_ar: string; name_en?: string | null }, ar: boolean) => (ar ? p.name_ar : p.name_en || p.name_ar);

export function useStoreCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_categories').select('id, name_ar, name_en, icon, sort').eq('is_active', true).order('sort');
      if (error) throw error;
      return (data ?? []) as StoreCategory[];
    },
    staleTime: 60_000,
  });
}

export function useStoreProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name_ar, name_en, description_ar, description_en, price_egp, image_path, thumb_path, category_id, in_stock, is_featured, sort_order')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as StoreProduct[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** حجوزات الزبون الجاية (عشان ياخد المنتج معاها) */
export function useUpcomingBookings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bookings', user?.id, 'upcoming-for-products'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, start_at, service_name_ar, service_name_en, status')
        .eq('user_id', user!.id)
        .in('status', ['confirmed', 'pending_payment'])
        .gt('end_at', new Date().toISOString())
        .order('start_at')
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useMyStore(live = false) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const orders = useQuery({
    queryKey: ['my-product-orders', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_orders')
        .select('id, product_id, product_name_ar, product_name_en, qty, price_egp, status, pay_mode, booking_id, created_at, booking:bookings!product_orders_booking_id_fkey(start_at)')
        .eq('user_id', user!.id)
        .in('status', ['reserved', 'awaiting', 'submitted', 'confirmed', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return ((data ?? []) as unknown as MyOrder[]).map((o) => ({ ...o, booking: Array.isArray(o.booking) ? o.booking[0] ?? null : o.booking }));
    },
  });
  const requests = useQuery({
    queryKey: ['my-product-requests', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_requests')
        .select('id, product_name, status, created_at, product_id')
        .eq('user_id', user!.id)
        .in('status', ['open', 'notified'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as MyRequest[];
    },
  });
  useEffect(() => {
    if (!user || !live) return;
    const ch = supabase
      .channel(`my-store:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_orders', filter: `user_id=eq.${user.id}` }, () => void qc.invalidateQueries({ queryKey: ['my-product-orders'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_requests', filter: `user_id=eq.${user.id}` }, () => void qc.invalidateQueries({ queryKey: ['my-product-requests'] }))
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [user, qc, live]);
  return { orders, requests };
}

export function useStoreActions() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['my-product-orders'] });
    void qc.invalidateQueries({ queryKey: ['my-product-requests'] });
  };
  const order = useMutation({
    mutationFn: async (a: { productId: string; qty: number; pay: 'cash' | 'online'; bookingId: string | null; note: string }) => {
      const { data, error } = await supabase.rpc('create_product_order_v2', {
        p_product_id: a.productId,
        p_qty: a.qty,
        p_pay: a.pay,
        p_booking_id: nullableArg<string>(a.bookingId),
        p_note: nullableArg<string>(a.note.trim() || null),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: refresh,
  });
  const cancelOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('cancel_my_product_order', { p_order_id: id });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  const request = useMutation({
    mutationFn: async (a: { productId?: string | null; name?: string; categoryId?: string | null; note?: string }) => {
      const { data, error } = await supabase.rpc('request_product', {
        p_product_id: nullableArg<string>(a.productId ?? null),
        p_name: nullableArg<string>(a.name?.trim() || null),
        p_category_id: nullableArg<string>(a.categoryId ?? null),
        p_note: nullableArg<string>(a.note?.trim() || null),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: refresh,
  });
  const cancelRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('cancel_my_product_request', { p_id: id });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
  return { order, cancelOrder, request, cancelRequest };
}
