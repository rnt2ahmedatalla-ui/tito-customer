import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Banknote, CalendarClock, Check, CreditCard, Minus, Package, Plus, Store } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { PaymentPanel } from '@/components/booking/PaymentPanel';
import { useSettings } from '@/features/home/useHomeData';
import { useAuth, useSignIn } from '@/features/profile/useAuth';
import { nullableArg, supabase } from '@/lib/supabase';
import { formatEGP } from '@/lib/money';
import { formatCairoDate, formatCairoTime } from '@/lib/time';
import { extractErrorCode, mapErrorToI18nKey } from '@/lib/errors';
import { cn } from '@/lib/cn';
import type { PaymentMethod } from '@/types/database';
import { ProductCard, RequestSheet } from './StoreParts';
import { pName, productImg, useLang, useStoreActions, useStoreCategories, useStoreProducts, useUpcomingBookings } from './useStore';

type Pay = 'cash' | 'online';

export default function ProductOrderPage() {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const { t } = useTranslation();
  const { ar, L } = useLang();
  const { user } = useAuth();
  const signIn = useSignIn();
  const settings = useSettings();
  const navigate = useNavigate();
  const products = useStoreProducts();
  const cats = useStoreCategories();
  const upcoming = useUpcomingBookings();
  const { order } = useStoreActions();

  const [qty, setQty] = useState(1);
  const [pay, setPay] = useState<Pay>('cash');
  // null = لسه ماختارش (بنختار أقرب حجز)، '' = «هعدّي آخده»
  const [chosen, setChosen] = useState<string | null>(sp.get('booking'));
  const [orderId, setOrderId] = useState<string | null>(sp.get('order'));
  const [done, setDone] = useState<{ total: number; booking: string | null } | null>(null);
  const [reqOpen, setReqOpen] = useState(false);

  const p = (products.data ?? []).find((x) => x.id === id) ?? null;
  const bookings = upcoming.data ?? [];

  const pickup = chosen ?? bookings[0]?.id ?? '';
  const setPickup = setChosen;

  // فتح منتج تاني من «ممكن يعجبك»: نبدأ من الأول
  useEffect(() => {
    setQty(1);
    setDone(null);
  }, [id]);

  // طلب أونلاين قديم لسه مدفعش
  const existing = useQuery({
    queryKey: ['my-product-order', orderId],
    enabled: !!orderId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('product_orders').select('id, price_egp, status').eq('id', orderId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const submitPay = useMutation({
    mutationFn: async (method: PaymentMethod) => {
      if (!orderId) throw new Error('NO_ORDER');
      const { error } = await supabase.rpc('submit_product_payment', {
        p_order_id: orderId,
        p_method: method,
        p_transaction_ref: 'whatsapp',
        p_proof_path: nullableArg<string>(null),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(L('تمام — هنأكد التحويل ونبلّغك', 'Done — we’ll confirm the transfer and let you know'));
      navigate('/products');
    },
    onError: () => toast.error(t('errors.UNKNOWN')),
  });

  const others = useMemo(() => (products.data ?? []).filter((x) => x.id !== id && x.in_stock && (!p?.category_id || x.category_id === p.category_id)).slice(0, 4), [products.data, id, p]);

  if (products.isLoading) {
    return <PageShell><Skeleton className="aspect-square w-full max-w-md" /><Skeleton className="mt-4 h-8 w-2/3" /></PageShell>;
  }
  if (!p) {
    return (
      <PageShell>
        <p className="text-ink">{L('المنتج ده مش متاح دلوقتي.', 'This product is not available.')}</p>
        <Link to="/products" className="mt-4 inline-block font-semibold text-bark underline">{L('شوف كل المنتجات', 'See all products')}</Link>
      </PageShell>
    );
  }

  const total = p.price_egp * qty;
  const img = productImg(p.image_path);
  const desc = ar ? p.description_ar : p.description_en || p.description_ar;
  const pickedBooking = bookings.find((b) => b.id === pickup) ?? null;

  const reserve = async () => {
    if (!user) { await signIn(); return; }
    try {
      const oid = await order.mutateAsync({ productId: p.id, qty, pay, bookingId: pickup || null, note: '' });
      if (pay === 'online') setOrderId(oid);
      else setDone({ total, booking: pickedBooking?.start_at ?? null });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? '');
      if (msg.includes('OUT_OF_STOCK')) toast.error(L('المنتج خلص للأسف — اطلبه وهنبلّغك', 'Sold out — request it and we’ll notify you'));
      else if (msg.includes('TOO_MANY')) toast.error(L('عندك طلبات كتير مستنية — استلمها الأول', 'You have many pending orders'));
      else toast.error(t(mapErrorToI18nKey(extractErrorCode(e))));
    }
  };

  /* ───── بعد الحجز كاش ───── */
  if (done) {
    return (
      <PageShell>
        <section className="mx-auto max-w-md rounded-card bg-espresso px-5 py-8 text-center text-cream shadow-warm-raised">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-gold text-espresso"><Check className="size-7" /></span>
          <h1 className="mt-4 text-2xl font-bold">{L('اتحجزلك ✓', 'Reserved ✓')}</h1>
          <p className="mt-2 text-cream/85">{pName(p, ar)}{qty > 1 ? ` ×${qty}` : ''}</p>
          <p className="mt-3 text-gold-soft">
            {done.booking
              ? L(`هتلاقيه مستنيك مع حلاقتك ${formatCairoDate(done.booking, 'ar')} الساعة ${formatCairoTime(done.booking, 'ar')}`, `It’ll be waiting with your cut on ${formatCairoDate(done.booking, 'en')} at ${formatCairoTime(done.booking, 'en')}`)
              : L('عدّي خده في أي وقت المحل فاتح', 'Drop by any time we’re open')}
          </p>
          <p className="mt-4 rounded-btn bg-white/10 px-3 py-2 text-sm">{L('ادفع كاش وانت بتستلم:', 'Pay cash on pickup:')} <span className="font-latin font-bold">{formatEGP(done.total)}</span></p>
          <div className="mt-6 grid gap-2">
            <Link to="/products"><Button fullWidth>{L('كمّل تسوّق', 'Keep shopping')}</Button></Link>
            <Link to="/bookings"><Button variant="secondary" fullWidth>{L('حجوزاتي', 'My bookings')}</Button></Link>
          </div>
        </section>
      </PageShell>
    );
  }

  /* ───── دفع أونلاين ───── */
  if (orderId && settings.data) {
    const amount = Number(existing.data?.price_egp ?? total);
    return (
      <PageShell>
        <h1 className="mb-3 text-xl font-bold text-espresso">{L('ادفع أونلاين', 'Pay online')}</h1>
        <PaymentPanel
          amount={amount}
          settings={settings.data}
          bookingId={orderId}
          serviceName={pName(p, ar)}
          whenLabel={L('منتجاتنا', 'Our products')}
          loading={submitPay.isPending}
          onMarkedSent={({ method }) => void submitPay.mutate(method)}
        />
      </PageShell>
    );
  }

  const choice = (on: boolean) => cn('flex w-full items-center gap-3 rounded-btn border p-3 text-start transition', on ? 'border-gold bg-gold/10 ring-1 ring-gold' : 'border-default bg-white hover:bg-sand/40');
  const dot = (on: boolean) => <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border-2', on ? 'border-gold bg-gold' : 'border-bark/30')}>{on ? <span className="size-2 rounded-full bg-white" /> : null}</span>;

  return (
    <PageShell withActionBar>
      <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2 md:gap-8">
        <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-sand shadow-warm md:aspect-square">
          {img ? <img src={img} alt={pName(p, ar)} className="size-full object-cover" /> : <Package className="absolute inset-0 m-auto size-16 text-gold/50" />}
          {!p.in_stock ? <span className="absolute inset-x-0 bottom-0 bg-espresso/85 py-2 text-center font-semibold text-cream">{L('خلص دلوقتي', 'Sold out')}</span> : null}
        </div>

        <div className="space-y-4">
          <div>
            {p.category_id ? <p className="text-xs font-medium text-gold">{(cats.data ?? []).find((c) => c.id === p.category_id)?.[ar ? 'name_ar' : 'name_en'] ?? ''}</p> : null}
            <h1 className="text-2xl font-bold text-espresso">{pName(p, ar)}</h1>
            <p className="mt-1 font-latin text-xl font-bold text-bark">{formatEGP(p.price_egp)}</p>
            {desc ? <p className="mt-2 leading-relaxed text-ink">{desc}</p> : null}
          </div>

          {!p.in_stock ? (
            <Button size="lg" fullWidth onClick={() => setReqOpen(true)}>{L('بلّغني لما يوصل', 'Notify me when it’s back')}</Button>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-btn border border-default bg-white p-2">
                <span className="ps-1 text-sm font-medium text-espresso">{L('الكمية', 'Quantity')}</span>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="-" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex size-10 items-center justify-center rounded-btn bg-sand text-espresso disabled:opacity-40"><Minus className="size-4" /></button>
                  <span className="w-10 text-center font-latin text-lg font-bold">{qty}</span>
                  <button type="button" aria-label="+" disabled={qty >= 10} onClick={() => setQty((q) => Math.min(10, q + 1))} className="flex size-10 items-center justify-center rounded-btn bg-sand text-espresso disabled:opacity-40"><Plus className="size-4" /></button>
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="mb-1.5 text-sm font-semibold text-espresso">{L('هتاخده إمتى؟', 'When will you pick it up?')}</legend>
                {bookings.map((b) => (
                  <button key={b.id} type="button" className={choice(pickup === b.id)} onClick={() => setPickup(b.id)}>
                    {dot(pickup === b.id)}
                    <CalendarClock className="size-5 shrink-0 text-bark" />
                    <span className="min-w-0 text-sm">
                      <span className="block font-semibold text-espresso">{L('مع حلاقتي', 'With my cut')}</span>
                      <span className="block text-ink">{formatCairoDate(b.start_at, ar ? 'ar' : 'en')} · <span className="font-latin" dir="ltr">{formatCairoTime(b.start_at, ar ? 'ar' : 'en')}</span></span>
                    </span>
                  </button>
                ))}
                <button type="button" className={choice(!pickup)} onClick={() => setPickup('')}>
                  {dot(!pickup)}
                  <Store className="size-5 shrink-0 text-bark" />
                  <span className="text-sm">
                    <span className="block font-semibold text-espresso">{L('هعدّي آخده', 'I’ll drop by')}</span>
                    <span className="block text-ink">{bookings.length ? L('في أي وقت المحل فاتح', 'Any time we’re open') : L('مفيش حجز جاي — تقدر تحجز حلاقة وتاخده معاها', 'No upcoming booking — book a cut and pick it up then')}</span>
                  </span>
                </button>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="mb-1.5 text-sm font-semibold text-espresso">{L('هتدفع إزاي؟', 'How will you pay?')}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([['cash', Banknote, 'كاش وانت بتستلم', 'Cash on pickup'], ['online', CreditCard, 'أونلاين دلوقتي', 'Online now']] as const).map(([k, Icon, a, e]) => (
                    <button key={k} type="button" onClick={() => setPay(k)} className={cn(choice(pay === k), 'flex-col justify-center gap-1 py-3 text-center')}>
                      <Icon className="size-5 text-bark" />
                      <span className="text-sm font-semibold text-espresso">{L(a, e)}</span>
                    </button>
                  ))}
                </div>
                {pay === 'online' ? <p className="text-xs text-ink">{L('InstaPay أو فودافون كاش، وبعدها تبعت صورة التحويل على واتساب.', 'InstaPay or Vodafone Cash, then send the screenshot on WhatsApp.')}</p> : null}
              </fieldset>

              <div className="sticky bottom-[calc(var(--nav-h,4.5rem)+0.5rem)] z-10 rounded-card border border-gold/40 bg-cream p-3 shadow-warm sm:static sm:bg-transparent sm:p-0 sm:shadow-none sm:border-0">
                <Button size="lg" fullWidth loading={order.isPending} onClick={() => void reserve()}>
                  {user ? (pay === 'cash' ? L('احجزه', 'Reserve') : L('كمّل للدفع', 'Continue to pay')) : L('سجّل دخول واحجز', 'Sign in & reserve')}
                  <span className="font-latin">· {formatEGP(total)}</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {others.length ? (
        <section className="mx-auto mt-10 max-w-4xl">
          <h2 className="mb-3 text-lg font-bold text-espresso">{L('ممكن يعجبك كمان', 'You may also like')}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {others.map((x) => <ProductCard key={x.id} p={x} bookingId={pickup || null} />)}
          </div>
        </section>
      ) : null}

      <RequestSheet open={reqOpen} onClose={() => setReqOpen(false)} cats={cats.data ?? []} product={p} />
    </PageShell>
  );
}
