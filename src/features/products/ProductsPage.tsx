import { useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { CalendarClock, PackageSearch, ShoppingBag } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCairoDate, formatCairoTime } from '@/lib/time';
import { useFeatureFlags } from '@/features/extras/useExtras';
import { CategoryTabs, MyStorePanel, ProductCard, RequestSheet } from './StoreParts';
import { useLang, useStoreCategories, useStoreProducts, useUpcomingBookings } from './useStore';

/** متجر المنتجات: أقسام + شبكة منتجات + طلباتي + «اطلب منتج مش موجود» */
export default function ProductsPage() {
  const { ar, L } = useLang();
  const [sp] = useSearchParams();
  const bookingId = sp.get('booking');
  const flags = useFeatureFlags();
  const cats = useStoreCategories();
  const products = useStoreProducts();
  const upcoming = useUpcomingBookings();
  const [cat, setCat] = useState('all');
  const [reqOpen, setReqOpen] = useState(false);

  const list = useMemo(() => (products.data ?? []).filter((p) => cat === 'all' || p.category_id === cat), [products.data, cat]);
  // الأقسام اللي فيها منتجات بس
  const usedCats = useMemo(() => (cats.data ?? []).filter((c) => (products.data ?? []).some((p) => p.category_id === c.id)), [cats.data, products.data]);
  const forBooking = bookingId ? (upcoming.data ?? []).find((b) => b.id === bookingId) : null;

  if (flags.data && !flags.data.products) return <Navigate to="/" replace />;

  return (
    <PageShell>
      <header className="animate-rise relative mb-5 overflow-hidden rounded-card bg-espresso p-5 text-cream shadow-warm sm:p-7">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(204,149,66,0.28),transparent_60%)]" />
        <div className="relative flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/30"><ShoppingBag className="size-6" /></span>
          <div className="min-w-0">
            <p className="font-latin text-[11px] font-medium uppercase tracking-[0.25em] text-gold">Shop</p>
            <h1 className="text-2xl font-bold sm:text-3xl">{L('منتجاتنا', 'Our products')}</h1>
          </div>
        </div>
        <p className="relative mt-3 text-sm text-cream/75">{L('احجز المنتج وخده مع حلاقتك — ادفع كاش وإنت بتستلم أو أونلاين.', 'Reserve a product and pick it up with your cut — pay cash on pickup or online.')}</p>
      </header>

      {forBooking ? (
        <p className="mb-4 flex items-center gap-2 rounded-btn bg-espresso px-3 py-2.5 text-sm text-cream">
          <CalendarClock className="size-4 shrink-0 text-gold" />
          {L('هتاخد اللي تختاره مع حلاقتك', 'Pick-up with your cut on')} {formatCairoDate(forBooking.start_at, ar ? 'ar' : 'en')} · <span className="font-latin" dir="ltr">{formatCairoTime(forBooking.start_at, ar ? 'ar' : 'en')}</span>
        </p>
      ) : null}

      <div className="mb-4 empty:hidden"><MyStorePanel /></div>

      {usedCats.length > 0 ? <div className="mb-4"><CategoryTabs cats={usedCats} value={cat} onChange={setCat} /></div> : null}

      {products.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-card border border-dashed border-default bg-white/60 p-8 text-center text-ink">{L('مفيش منتجات هنا دلوقتي', 'No products here yet')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p, i) => <ProductCard key={p.id} p={p} bookingId={bookingId} className="animate-rise" style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }} />)}
        </div>
      )}

      <button
        type="button"
        onClick={() => setReqOpen(true)}
        className="mt-6 flex w-full items-center gap-3 rounded-card border border-default bg-white p-4 text-start shadow-warm transition hover:border-gold/60"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-espresso text-gold"><PackageSearch className="size-5" /></span>
        <span className="min-w-0">
          <span className="block font-semibold text-espresso">{L('مش لاقي اللي بتدوّر عليه؟', 'Can’t find what you need?')}</span>
          <span className="block text-sm text-ink">{L('اطلبه وهنبلّغك أول ما يوصل المحل', 'Request it and we’ll notify you when it’s in')}</span>
        </span>
      </button>

      <RequestSheet open={reqOpen} onClose={() => setReqOpen(false)} cats={cats.data ?? []} />
    </PageShell>
  );
}
