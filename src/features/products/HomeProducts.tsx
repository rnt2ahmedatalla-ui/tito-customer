import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { useFeatureFlags } from '@/features/extras/useExtras';
import { ProductCard } from './StoreParts';
import { useLang, useMyStore, useStoreProducts } from './useStore';

/** «منتجاتنا» في الرئيسية: شريط أفقي (المميّز الأول) + لينك للمتجر. مبيظهرش لو مفيش منتجات أو المتجر مقفول */
export function HomeProducts() {
  const { ar, L } = useLang();
  const flags = useFeatureFlags();
  const q = useStoreProducts();
  const list = q.data ?? [];
  if (!list.length || flags.data?.products === false) return null;
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <section className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-latin text-sm font-medium uppercase tracking-[0.2em] text-gold">Shop</p>
          <h2 className="mt-3 text-3xl font-bold text-espresso sm:text-4xl">{L('منتجاتنا', 'Our products')}</h2>
          <p className="mt-2 max-w-md text-ink">{L('احجز المنتج وخده مع حلاقتك — كاش وانت بتستلم أو أونلاين.', 'Reserve it and pick it up with your cut — cash or online.')}</p>
        </div>
        <Link to="/products" className="hidden shrink-0 items-center gap-1 font-semibold text-bark hover:text-gold sm:inline-flex">
          {L('كل المنتجات', 'All products')} <Arrow className="size-4" />
        </Link>
      </div>
      <div className="gold-rule my-6 max-w-xs" />
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
        {list.slice(0, 8).map((p) => (
          <ProductCard key={p.id} p={p} className="w-[42%] shrink-0 snap-start sm:w-auto" />
        ))}
      </div>
      <Link to="/products" className="mt-5 inline-flex min-h-11 items-center gap-1.5 rounded-btn border border-gold px-5 font-semibold text-espresso hover:bg-gold/10 sm:hidden">
        {L(`كل المنتجات (${list.length})`, `All products (${list.length})`)} <Arrow className="size-4" />
      </Link>
    </section>
  );
}

/** قايمة أسعار المنتجات المختصرة في صفحة الحجز */
export function ProductsPriceStrip() {
  const { ar, L } = useLang();
  const flags = useFeatureFlags();
  const q = useStoreProducts();
  const list = (q.data ?? []).filter((p) => p.in_stock);
  if (!list.length || flags.data?.products === false) return null;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{L('منتجات العناية', 'Care products')}</h2>
        <Link to="/products" className="text-xs font-semibold text-bark underline-offset-2 hover:underline">{L('المتجر', 'Shop')}</Link>
      </div>
      <p className="mb-2 text-xs text-ink">{L('بعد ما تأكد الحجز تقدر تحجز أي منتج وتاخده معاك.', 'After booking you can reserve any product to pick up with your cut.')}</p>
      <ul className="divide-y divide-default overflow-hidden rounded-card border border-default bg-white">
        {list.slice(0, 6).map((p) => (
          <li key={p.id}>
            <Link to={`/products/${p.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-sand/40">
              <span className="min-w-0 truncate text-espresso">{ar ? p.name_ar : p.name_en || p.name_ar}</span>
              <span className="shrink-0 font-latin font-semibold text-bark">{p.price_egp} {ar ? 'ج' : 'EGP'}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** بعد تأكيد الحجز: «تاخد منتج معاك؟» */
export function AddProductCta({ bookingId, dark }: { bookingId: string; dark?: boolean }) {
  const { L } = useLang();
  const flags = useFeatureFlags();
  const q = useStoreProducts();
  if (!(q.data ?? []).some((p) => p.in_stock) || flags.data?.products === false) return null;
  return (
    <Link
      to={`/products?booking=${bookingId}`}
      className={dark
        ? 'block rounded-btn border border-gold/50 bg-white/10 px-3 py-2.5 text-start text-sm text-cream hover:bg-white/15'
        : 'inline-flex min-h-9 items-center gap-1 rounded-btn border border-gold/50 bg-gold/10 px-3 text-sm font-medium text-espresso hover:bg-gold/20'}
    >
      {dark ? <><span className="font-semibold text-gold-soft">{L('تاخد منتج معاك؟', 'Grab a product too?')}</span> <span className="text-cream/80">{L('احجزه دلوقتي وهتلاقيه مستنيك مع حلاقتك', 'Reserve it now — it’ll be waiting with your cut')}</span></> : L('+ منتج تاخده معاك', '+ Add a product')}
    </Link>
  );
}

/** في كارت الحجز: المنتجات اللي هياخدها معاه + زرار يضيف */
export function BookingProductsLine({ bookingId }: { bookingId: string }) {
  const { ar, L } = useLang();
  const { orders } = useMyStore();
  const mine = (orders.data ?? []).filter((o) => o.booking_id === bookingId);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 empty:hidden">
      {mine.map((o) => (
        <span key={o.id} className="inline-flex min-h-8 items-center gap-1 rounded-pill bg-gold/15 px-2.5 text-xs font-medium text-bark">
          <Package className="size-3.5" /> {ar ? o.product_name_ar : o.product_name_en || o.product_name_ar}{o.qty > 1 ? ` ×${o.qty}` : ''}
          <span className="text-ink">· {o.pay_mode === 'cash' ? L('كاش', 'cash') : o.status === 'confirmed' ? L('مدفوع', 'paid') : L('أونلاين', 'online')}</span>
        </span>
      ))}
      <AddProductCta bookingId={bookingId} />
    </div>
  );
}
