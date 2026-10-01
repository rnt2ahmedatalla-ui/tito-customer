import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { PaymentPanel } from '@/components/booking/PaymentPanel';
import { useSettings } from '@/features/home/useHomeData';
import { useAuth, useSignIn } from '@/features/profile/useAuth';
import { supabase } from '@/lib/supabase';
import { formatEGP } from '@/lib/money';
import type { PaymentMethod } from '@/types/database';

type Product = {
  id: string;
  name_ar: string;
  name_en: string;
  price_egp: number;
};

export default function ProductOrderPage() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const signIn = useSignIn();
  const settings = useSettings();
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState<string | null>(null);

  const product = useQuery({
    queryKey: ['product', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name_ar, name_en, price_egp')
        .eq('id', id)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data as Product;
    },
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!user) {
        await signIn();
        throw new Error('LOGIN');
      }
      const { data, error } = await supabase.rpc('create_product_order', { p_product_id: id });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (oid) => setOrderId(oid),
    onError: (e) => {
      if (e instanceof Error && e.message === 'LOGIN') return;
      toast.error(t('errors.UNKNOWN'));
    },
  });

  const submitPay = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      if (!orderId) throw new Error('NO_ORDER');
      const { error } = await supabase.rpc('submit_product_payment', {
        p_order_id: orderId,
        p_method: method,
        p_transaction_ref: 'whatsapp',
        p_proof_path: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('products.sent'));
      navigate('/products');
    },
    onError: () => toast.error(t('errors.UNKNOWN')),
  });

  if (product.isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-40" />
      </PageShell>
    );
  }

  if (!product.data || !settings.data) {
    return (
      <PageShell>
        <p>{t('products.empty')}</p>
        <Link to="/products" className="mt-4 inline-block text-sm underline">{t('common.back')}</Link>
      </PageShell>
    );
  }

  const name = i18n.language === 'ar' ? product.data.name_ar : product.data.name_en;

  return (
    <PageShell withActionBar={!orderId}>
      <h1 className="text-2xl font-bold text-espresso">{name}</h1>
      <p className="mt-2 font-latin text-lg font-bold">{formatEGP(product.data.price_egp)}</p>

      {!orderId ? (
        <div className="mt-6">
          <Button
            size="lg"
            fullWidth
            loading={createOrder.isPending}
            onClick={() => void createOrder.mutate()}
          >
            {t('products.order')}
          </Button>
        </div>
      ) : (
        <div className="mt-6">
          <PaymentPanel
            amount={product.data.price_egp}
            settings={settings.data}
            bookingId={orderId}
            serviceName={name}
            whenLabel={t('products.title')}
            loading={submitPay.isPending}
            onMarkedSent={({ method }) => void submitPay.mutate(method)}
          />
        </div>
      )}
    </PageShell>
  );
}
