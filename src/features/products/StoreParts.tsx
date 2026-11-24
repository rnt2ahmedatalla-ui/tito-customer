import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Banknote, Brush, CalendarClock, CreditCard, Droplets, Gift, Package, PackageSearch, Scissors, Smile, Tag, Wrench, X, type LucideIcon } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { formatEGP } from '@/lib/money';
import { formatCairoDate, formatCairoTime } from '@/lib/time';
import { extractErrorCode, mapErrorToI18nKey } from '@/lib/errors';
import { cn } from '@/lib/cn';
import { useAuth, useSignIn } from '@/features/profile/useAuth';
import { pName, productImg, useLang, useMyStore, useStoreActions, type StoreCategory, type StoreProduct } from './useStore';

const ICONS: Record<string, LucideIcon> = { hair: Scissors, beard: Brush, face: Smile, body: Droplets, tools: Wrench, gift: Gift, tag: Tag };
export function CatIcon({ icon, className }: { icon: string | null | undefined; className?: string }) {
  const I = ICONS[icon ?? 'tag'] ?? Tag;
  return <I className={className ?? 'size-4'} aria-hidden />;
}

/** كارت منتج (شبكة المتجر والشريط الأفقي في الرئيسية) */
export function ProductCard({ p, bookingId, className, style }: { p: StoreProduct; bookingId?: string | null; className?: string; style?: React.CSSProperties }) {
  const { ar, L } = useLang();
  const src = productImg(p.thumb_path || p.image_path);
  return (
    <Link
      to={`/products/${p.id}${bookingId ? `?booking=${bookingId}` : ''}`}
      style={style}
      className={cn('group flex flex-col overflow-hidden rounded-card border border-default bg-white p-1.5 shadow-warm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 ease-brand hover:-translate-y-0.5 hover:border-gold/50 active:scale-[0.97]', className)}
    >
      <div className="relative aspect-square overflow-hidden rounded-[0.9rem] bg-[#f7f2ea]">
        {src ? (
          <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-contain p-2 mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.06]" />
        ) : (
          <Package className="absolute inset-0 m-auto size-8 text-gold/50" aria-hidden />
        )}
        {!p.in_stock ? (
          <span className="absolute inset-x-0 bottom-0 bg-espresso/85 py-0.5 text-center text-[10px] font-semibold text-cream">{L('خلص — اطلبه', 'Sold out')}</span>
        ) : p.is_featured ? (
          <span className="absolute start-1.5 top-1.5 rounded-pill bg-gold px-1.5 py-px text-[10px] font-bold text-espresso">{L('مميّز', 'Top')}</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col px-1 pb-0.5 pt-1.5">
        <p className="line-clamp-2 text-[12.5px] font-semibold leading-tight text-espresso">{pName(p, ar)}</p>
        <div className="mt-auto flex items-center justify-between gap-1 pt-1.5">
          <p className="font-latin text-[13px] font-bold text-bark">{Math.round(Number(p.price_egp))} <span className="text-[10px] font-semibold">{ar ? 'ج' : 'EGP'}</span></p>
          <span className="flex size-6 items-center justify-center rounded-full bg-gold text-sm font-bold leading-none text-espresso transition-transform duration-300 group-hover:scale-110" aria-hidden>+</span>
        </div>
      </div>
    </Link>
  );
}

export function CategoryTabs({ cats, value, onChange }: { cats: StoreCategory[]; value: string; onChange: (v: string) => void }) {
  const { ar, L } = useLang();
  const item = (id: string, label: string, icon?: string) => (
    <button
      key={id}
      type="button"
      onClick={() => onChange(id)}
      aria-pressed={value === id}
      className={cn('inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-pill px-4 text-sm font-medium transition-colors',
        value === id ? 'bg-espresso text-cream shadow-warm' : 'bg-white text-ink ring-1 ring-bark/15 hover:bg-sand/60')}
    >
      {icon ? <CatIcon icon={icon} className="size-4" /> : null}
      {label}
    </button>
  );
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      {item('all', L('الكل', 'All'))}
      {cats.map((c) => item(c.id, ar ? c.name_ar : c.name_en || c.name_ar, c.icon))}
    </div>
  );
}

/** «مش لاقي اللي بتدوّر عليه؟» — طلب منتج مش موجود */
export function RequestSheet({ open, onClose, cats, product }: { open: boolean; onClose: () => void; cats: StoreCategory[]; product?: StoreProduct | null }) {
  const { ar, L } = useLang();
  const { t } = useTranslation();
  const { user } = useAuth();
  const signIn = useSignIn();
  const { request } = useStoreActions();
  const [name, setName] = useState('');
  const [cat, setCat] = useState<string>('');
  const [note, setNote] = useState('');

  const submit = async () => {
    if (!user) { await signIn(); return; }
    if (!product && !name.trim()) { toast.error(L('اكتب اسم المنتج', 'Enter the product name')); return; }
    try {
      await request.mutateAsync({ productId: product?.id ?? null, name, categoryId: cat || null, note });
      toast.success(L('وصلنا طلبك ✓ هنبلّغك أول ما يوصل', 'Got it ✓ we’ll let you know when it arrives'));
      setName(''); setNote(''); setCat('');
      onClose();
    } catch (e) {
      const code = extractErrorCode(e);
      toast.error(code === 'UNKNOWN' && String((e as { message?: string })?.message ?? '').includes('TOO_MANY')
        ? L('عندك طلبات كتير مستنية — استنى لما توصل', 'You have many pending requests')
        : t(mapErrorToI18nKey(code)));
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={product ? L('بلّغني لما يوصل', 'Notify me when it’s back') : L('اطلب منتج', 'Request a product')}>
      <div className="space-y-3">
        {product ? (
          <p className="rounded-btn bg-sand/60 p-3 text-sm text-ink">
            {L(`«${pName(product, true)}» خلص دلوقتي. سجّل طلبك وأول ما يوصل هيوصلك إشعار.`, `“${pName(product, false)}” is sold out. Request it and we’ll notify you when it’s back.`)}
          </p>
        ) : (
          <>
            <p className="text-sm text-ink">{L('قولنا إنت عايز إيه وهنحاول نجيبهولك، وأول ما يوصل هيوصلك إشعار.', 'Tell us what you need — we’ll try to stock it and notify you.')}</p>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-espresso">{L('اسم المنتج أو نوعه', 'Product name or type')}</span>
              <input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder={L('مثلاً: واكس مطفي، زيت دقن…', 'e.g. matte wax, beard oil…')}
                className="min-h-11 w-full rounded-btn border border-default bg-white px-3 text-base focus:border-gold focus:outline-none" />
            </label>
            {cats.length ? (
              <div className="flex flex-wrap gap-1.5">
                {cats.map((c) => (
                  <button key={c.id} type="button" onClick={() => setCat(cat === c.id ? '' : c.id)}
                    className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-pill px-3 text-sm', cat === c.id ? 'bg-gold text-espresso' : 'bg-sand/70 text-ink')}>
                    <CatIcon icon={c.icon} className="size-3.5" /> {ar ? c.name_ar : c.name_en || c.name_ar}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-espresso">{L('ملاحظة (اختياري)', 'Note (optional)')}</span>
          <textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder={L('ماركة معيّنة، حجم…', 'Brand, size…')}
            className="w-full rounded-btn border border-default bg-white p-3 text-base focus:border-gold focus:outline-none" />
        </label>
        <Button fullWidth loading={request.isPending} onClick={() => void submit()}>
          {user ? L('ابعت الطلب', 'Send request') : L('سجّل دخول وابعت', 'Sign in & send')}
        </Button>
      </div>
    </Sheet>
  );
}

/** طلباتي: المنتجات المحجوزة والطلبات المستنية */
export function MyStorePanel() {
  const { ar, L } = useLang();
  const { orders, requests } = useMyStore(true);
  const { cancelOrder, cancelRequest } = useStoreActions();
  const o = orders.data ?? [];
  const r = requests.data ?? [];
  if (!o.length && !r.length) return null;
  const status: Record<string, [string, string, string]> = {
    reserved: ['محجوز — ادفع كاش وانت بتستلم', 'Reserved — pay cash on pickup', 'text-bark'],
    awaiting: ['مستني الدفع أونلاين', 'Awaiting online payment', 'text-warning'],
    submitted: ['بنراجع التحويل', 'Checking your transfer', 'text-info'],
    confirmed: ['مدفوع — جاهز تستلمه', 'Paid — ready for pickup', 'text-success'],
    rejected: ['التحويل محتاج مراجعة — كلّمنا', 'Transfer needs a check — contact us', 'text-danger'],
  };
  return (
    <section className="rounded-card border border-gold/40 bg-gold/10 p-3 sm:p-4">
      <h2 className="mb-2 flex items-center gap-2 font-bold text-espresso"><Package className="size-4 text-bark" /> {L('طلباتي', 'My orders')}</h2>
      <ul className="space-y-2">
        {o.map((x) => {
          const [sa, se, cls] = status[x.status] ?? [x.status, x.status, 'text-ink'];
          return (
            <li key={x.id} className="flex items-start gap-2 rounded-btn bg-white p-2.5 shadow-warm">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sand text-bark">
                {x.pay_mode === 'cash' ? <Banknote className="size-4" /> : <CreditCard className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-espresso">
                  {pName({ name_ar: x.product_name_ar, name_en: x.product_name_en }, ar)}{x.qty > 1 ? <span className="font-latin text-ink"> ×{x.qty}</span> : null}
                  <span className="ms-1.5 font-latin text-bark">{formatEGP(x.price_egp)}</span>
                </p>
                <p className={cn('text-xs font-medium', cls)}>{L(sa, se)}</p>
                {x.booking ? (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink">
                    <CalendarClock className="size-3.5" /> {L('هتاخده مع حلاقتك', 'With your cut on')} {formatCairoDate(x.booking.start_at, ar ? 'ar' : 'en')} · <span className="font-latin" dir="ltr">{formatCairoTime(x.booking.start_at, ar ? 'ar' : 'en')}</span>
                  </p>
                ) : null}
              </div>
              {x.status === 'awaiting' && x.product_id ? (
                <Link to={`/products/${x.product_id}?order=${x.id}`} className="shrink-0 rounded-btn bg-gold px-2.5 py-1.5 text-xs font-semibold text-espresso">{L('ادفع', 'Pay')}</Link>
              ) : null}
              {['reserved', 'awaiting', 'rejected'].includes(x.status) ? (
                <button type="button" aria-label={L('إلغاء', 'Cancel')} disabled={cancelOrder.isPending}
                  onClick={() => { if (window.confirm(L('تلغي الطلب ده؟', 'Cancel this order?'))) cancelOrder.mutate(x.id, { onSuccess: () => toast.success(L('اتلغى', 'Cancelled')) }); }}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink hover:bg-sand"><X className="size-4" /></button>
              ) : null}
            </li>
          );
        })}
        {r.map((x) => (
          <li key={x.id} className="flex items-center gap-2 rounded-btn bg-white/70 p-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sand text-bark"><PackageSearch className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-espresso">{x.product_name}</p>
              <p className={cn('text-xs', x.status === 'notified' ? 'font-semibold text-success' : 'text-ink')}>
                {x.status === 'notified' ? L('وصل 🎉 احجزه دلوقتي', 'It’s in 🎉 reserve it now') : L('طلبته — هنبلّغك أول ما يوصل', 'Requested — we’ll notify you')}
              </p>
            </div>
            {x.status === 'notified' && x.product_id ? (
              <Link to={`/products/${x.product_id}`} className="shrink-0 rounded-btn bg-gold px-2.5 py-1.5 text-xs font-semibold text-espresso">{L('احجزه', 'Reserve')}</Link>
            ) : null}
            <button type="button" aria-label={L('إلغاء', 'Cancel')} onClick={() => cancelRequest.mutate(x.id)} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink hover:bg-sand"><X className="size-4" /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}
