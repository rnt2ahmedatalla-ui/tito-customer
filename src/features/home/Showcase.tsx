import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Baby, Brush, Clock, Crown, Droplets, Flame, Gift, Images, Package, Palette, Scissors, Share2,
  Sparkles, Spline, Star, Users, Waves, Wind, BookOpen,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ShareAndQr } from '@/components/share/ShareAndQr';
import { TeamSection, StaffAvatar } from '@/components/staff/StaffParts';
import { useActiveStaff } from '@/features/booking/useBooking';
import { useFeatureFlags } from '@/features/extras/useExtras';
import { useGallery } from '@/features/gallery/useGallery';
import { GalleryGrid } from '@/features/gallery/GalleryGrid';
import { productImg, useStoreProducts } from '@/features/products/useStore';
import { getCairoNow } from '@/lib/time';
import { isSafeUrl } from '@/lib/urls';
import { useServices, useSettings, useWorkingHours } from './useHomeData';

const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function useAr() {
  const { i18n } = useTranslation();
  const ar = !!i18n.language?.startsWith('ar');
  return { ar, L: (a: string, e: string) => (ar ? a : e) };
}

/** موس الحلاقة (مش موجود في مكتبة الأيقونات) */
function RazorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 15.5 14.5 5a2.1 2.1 0 0 1 3 3L7 18.5Z" />
      <path d="m7 18.5 1.8 1.8a1.5 1.5 0 0 0 2.1 0l1.6-1.6" />
      <path d="M15.5 9 19 12.5" />
    </svg>
  );
}

/** أيقونة بسيطة تناسب اسم الخدمة (بالعربي أو الإنجليزي) */
export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const n = name.toLowerCase();
  const has = (...ws: string[]) => ws.some((w) => n.includes(w));
  if (has('متكامل', 'تجربة', 'vip', 'full', 'experience', 'package')) return <Crown className={className} aria-hidden />;
  if (has('طفل', 'أطفال', 'اطفال', 'kid', 'child', 'boy')) return <Baby className={className} aria-hidden />;
  if (has('لحية', 'لحيه', 'دقن', 'ذقن', 'beard', 'shave')) return <RazorIcon className={className} />;
  if (has('شمع', 'wax')) return <Flame className={className} aria-hidden />;
  if (has('خيط', 'thread')) return <Spline className={className} aria-hidden />;
  if (has('صبغ', 'لون', 'dye', 'color', 'colour')) return <Palette className={className} aria-hidden />;
  if (has('كيرل', 'curl', 'perm')) return <Waves className={className} aria-hidden />;
  if (has('فرد', 'بروتين', 'كيراتين', 'straight', 'protein', 'keratin')) return <Brush className={className} aria-hidden />;
  if (has('سشوار', 'استشوار', 'blow', 'dry')) return <Wind className={className} aria-hidden />;
  if (has('ماسك', 'mask', 'غسيل', 'wash')) return <Droplets className={className} aria-hidden />;
  if (has('بشرة', 'تنظيف', 'skin', 'facial', 'clean')) return <Sparkles className={className} aria-hidden />;
  return <Scissors className={className} aria-hidden />;
}

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <p className="font-latin text-xs font-medium uppercase tracking-[0.25em] text-gold">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold text-espresso sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ───────── خدماتنا جنب منتجاتنا ───────── */
export function ServicesProductsSection() {
  const { ar, L } = useAr();
  const services = useServices();
  const products = useStoreProducts();
  const flags = useFeatureFlags();
  const [tab, setTab] = useState<'services' | 'products'>('services');
  const Arrow = ar ? ArrowLeft : ArrowRight;

  const all = (services.data ?? []).filter((s) => !(s as { is_archived?: boolean }).is_archived);
  const mains = all.filter((s) => !s.is_extra);
  const extras = all.filter((s) => s.is_extra);
  const prods = flags.data?.products === false ? [] : (products.data ?? []).filter((p) => p.image_path || p.thumb_path).slice(0, 6);
  const nm = (x: { name_ar: string; name_en?: string | null }) => (ar ? x.name_ar : x.name_en || x.name_ar);
  const both = prods.length > 0;

  const servicesPanel = (
    <div className="h-full rounded-card border border-default bg-white p-4 shadow-warm sm:p-5">
      <p className="mb-3 hidden items-center gap-2 font-semibold text-espresso lg:flex"><Scissors className="size-4 text-gold" aria-hidden />{L('خدماتنا', 'Our services')}</p>
      {services.isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {mains.map((s) => (
              <li key={s.id} className="flex flex-col items-center gap-2 rounded-btn bg-sand/50 px-2 py-3 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-espresso text-gold shadow-warm"><ServiceIcon name={`${s.name_ar} ${s.name_en ?? ''}`} className="size-5" /></span>
                <span className="line-clamp-2 text-sm font-semibold leading-snug text-espresso">{nm(s)}</span>
              </li>
            ))}
          </ul>
          {extras.length ? (
            <>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink">{L('والإضافات', 'Add-ons')}</p>
              <ul className="flex flex-wrap gap-1.5">
                {extras.map((s) => (
                  <li key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium text-espresso">
                    <ServiceIcon name={`${s.name_ar} ${s.name_en ?? ''}`} className="size-3.5 text-bark" />
                    {nm(s)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <Link to="/book" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-btn bg-gold px-4 font-semibold text-espresso hover:bg-gold-soft">
            {L('اختار خدمتك واحجز', 'Pick a service & book')} <Arrow className="size-4" aria-hidden />
          </Link>
        </>
      )}
    </div>
  );

  const productsPanel = (
    <div className="h-full rounded-card border border-default bg-white p-4 shadow-warm sm:p-5">
      <p className="mb-3 hidden items-center gap-2 font-semibold text-espresso lg:flex"><Package className="size-4 text-gold" aria-hidden />{L('منتجاتنا', 'Our products')}</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {prods.map((p) => (
          <li key={p.id}>
            <Link to={`/products/${p.id}`} className="group block overflow-hidden rounded-btn bg-sand/50">
              <div className="aspect-square overflow-hidden">
                <img src={productImg(p.thumb_path ?? p.image_path) ?? ''} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <p className="line-clamp-1 px-2 py-1.5 text-center text-xs font-semibold text-espresso sm:text-sm">{nm(p)}</p>
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/products" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-btn border border-gold px-4 font-semibold text-espresso hover:bg-gold/10">
        {L('كل المنتجات', 'All products')} <Arrow className="size-4" aria-hidden />
      </Link>
    </div>
  );

  if (!services.isLoading && !mains.length && !both) return null;

  return (
    <section className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <SectionHead eyebrow="Services & shop" title={both ? L('خدماتنا ومنتجاتنا', 'Services & products') : L('خدماتنا', 'Our services')} />
      {both ? (
        <>
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-btn bg-sand/60 p-1 lg:hidden" role="tablist">
            {([['services', L('خدماتنا', 'Services'), Scissors], ['products', L('منتجاتنا', 'Products'), Package]] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn('inline-flex min-h-11 items-center justify-center gap-1.5 rounded-btn text-sm font-semibold transition', tab === k ? 'bg-espresso text-cream shadow-warm' : 'text-ink')}>
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
          <div className="lg:hidden">{tab === 'services' ? servicesPanel : productsPanel}</div>
          <div className="hidden gap-4 lg:grid lg:grid-cols-2">{servicesPanel}{productsPanel}</div>
        </>
      ) : (
        servicesPanel
      )}
    </section>
  );
}

/* ───────── العروض والباقات ───────── */
type Pkg = { id: string; name_ar: string; name_en: string | null; sessions: number; price_egp: number; validity_days: number | null };

export function OffersSection() {
  const { ar, L } = useAr();
  const flags = useFeatureFlags();
  const q = useQuery({
    queryKey: ['public-packages'],
    enabled: flags.data?.packages === true,
    staleTime: 60_000,
    queryFn: async (): Promise<Pkg[]> => {
      const { data, error } = await supabase.from('packages').select('id, name_ar, name_en, sessions, price_egp, validity_days').eq('is_active', true).order('price_egp');
      if (error) return [];
      return (data ?? []) as Pkg[];
    },
  });
  const list = q.data ?? [];
  if (flags.data?.packages !== true || !list.length) return null;
  return (
    <section className="bg-espresso text-cream">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <p className="font-latin text-xs font-medium uppercase tracking-[0.25em] text-gold">Offers</p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{L('العروض والباقات', 'Offers & packages')}</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <li key={p.id} className="flex flex-col rounded-card border border-gold/30 bg-cream/5 p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold text-espresso"><Gift className="size-5" aria-hidden /></span>
                <div className="min-w-0">
                  <p className="font-bold">{ar ? p.name_ar : p.name_en || p.name_ar}</p>
                  <p className="text-sm text-cream/70">
                    {L(`${p.sessions} جلسات`, `${p.sessions} sessions`)}
                    {p.validity_days ? L(` · صالحة ${p.validity_days} يوم`, ` · valid ${p.validity_days} days`) : ''}
                  </p>
                </div>
              </div>
              <p className="mt-3 font-latin text-2xl font-bold text-gold">{Math.round(Number(p.price_egp))} <span className="text-sm">{L('ج', 'EGP')}</span></p>
              <Link to="/book" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-btn bg-gold px-4 text-sm font-semibold text-espresso hover:bg-gold-soft">{L('احجز واسأل عليها', 'Book & ask about it')}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────── شغلنا · التقييمات · فريقنا · عنّا (مصغّرين جنب بعض) ───────── */
type RecentReview = { id: string; rating: number; comment: string | null; created_at: string; display_name: string };

function useRecentReviews() {
  return useQuery({
    queryKey: ['recent-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_recent_reviews', { p_limit: 20 });
      if (error) throw error;
      return (data ?? []) as RecentReview[];
    },
    staleTime: 60_000,
  });
}

function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn('flex gap-0.5', className)} aria-label={`${n}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn('size-3.5', i < Math.round(n) ? 'fill-gold text-gold' : 'text-bark/25')} aria-hidden />
      ))}
    </span>
  );
}

function MiniCard({ icon, title, onMore, moreLabel, to, children }: { icon: ReactNode; title: string; onMore?: () => void; moreLabel: string; to?: string; children: ReactNode }) {
  const more = to ? (
    <Link to={to} className="mt-auto inline-flex min-h-9 items-center justify-center rounded-btn border border-gold/60 px-3 text-xs font-semibold text-espresso hover:bg-gold/10">{moreLabel}</Link>
  ) : (
    <button type="button" onClick={onMore} className="mt-auto inline-flex min-h-9 items-center justify-center rounded-btn border border-gold/60 px-3 text-xs font-semibold text-espresso hover:bg-gold/10">{moreLabel}</button>
  );
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-card border border-default bg-white p-3 shadow-warm sm:p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold text-espresso">{icon}{title}</p>
      <div className="min-w-0 flex-1">{children}</div>
      {more}
    </div>
  );
}

export function DiscoverSection() {
  const { ar, L } = useAr();
  const flags = useFeatureFlags();
  const gallery = useGallery(60);
  const reviews = useRecentReviews();
  const stats = useQuery({
    queryKey: ['review-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_review_stats');
      if (error) throw error;
      return data as { avg: number; count: number };
    },
  });
  const staff = useActiveStaff().data ?? [];
  const settings = useSettings();
  const about = (ar ? settings.data?.about_ar : settings.data?.about_en) || '';
  const [sheet, setSheet] = useState<null | 'reviews' | 'team' | 'about'>(null);
  const photos = flags.data?.gallery === true ? gallery.data ?? [] : [];
  const revs = reviews.data ?? [];
  const latest = revs.find((r) => r.comment) ?? revs[0];
  const cards = (photos.length ? 1 : 0) + 1 + (staff.length ? 1 : 0) + (about ? 1 : 0);

  return (
    <section className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <SectionHead eyebrow="About tito" title={L('اعرفنا أكتر', 'Get to know us')} />
      <div className={cn('grid grid-cols-2 gap-3', cards === 4 ? 'lg:grid-cols-4' : cards === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
        {photos.length ? (
          <MiniCard icon={<Images className="size-4 text-gold" aria-hidden />} title={L('شغلنا', 'Our work')} to="/gallery" moreLabel={L(`عرض الكل (${photos.length})`, `See all (${photos.length})`)}>
            <GalleryGrid photos={photos.slice(0, 4)} className="grid grid-cols-2 gap-1" />
          </MiniCard>
        ) : null}

        <MiniCard icon={<Star className="size-4 fill-gold text-gold" aria-hidden />} title={L('التقييمات', 'Reviews')} onMore={() => setSheet('reviews')} moreLabel={L('عرض الكل', 'See all')}>
          {stats.data && stats.data.count > 0 ? (
            <p className="flex items-baseline gap-1.5"><span className="font-latin text-3xl font-bold text-espresso">{Number(stats.data.avg).toFixed(1)}</span><span className="text-xs text-ink">({stats.data.count})</span></p>
          ) : null}
          {latest ? (
            <div className="mt-1">
              <Stars n={latest.rating} />
              {latest.comment ? <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-ink">“{latest.comment}”</p> : null}
              <p className="mt-1 text-[11px] font-medium text-bark">{latest.display_name}</p>
            </div>
          ) : stats.data && stats.data.count > 0 ? null : (
            <p className="text-xs text-ink">{L('كن أول واحد يقيّمنا ⭐', 'Be the first to review ⭐')}</p>
          )}
        </MiniCard>

        {staff.length ? (
          <MiniCard icon={<Users className="size-4 text-gold" aria-hidden />} title={L('فريقنا', 'Our team')} onMore={() => setSheet('team')} moreLabel={L('عرض الكل', 'See all')}>
            <div className="flex -space-x-2 rtl:space-x-reverse">
              {staff.slice(0, 4).map((m) => <StaffAvatar key={m.id} member={m} className="size-12 text-lg ring-2 ring-white" />)}
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-ink">{staff.map((m) => m.name).join('، ')}</p>
          </MiniCard>
        ) : null}

        {about ? (
          <MiniCard icon={<BookOpen className="size-4 text-gold" aria-hidden />} title={L('عنّا', 'About us')} onMore={() => setSheet('about')} moreLabel={L('اقرأ أكتر', 'Read more')}>
            <p className="line-clamp-5 whitespace-pre-line text-xs leading-relaxed text-ink">{about}</p>
          </MiniCard>
        ) : null}
      </div>

      <Sheet open={sheet === 'reviews'} onClose={() => setSheet(null)} title={L('التقييمات', 'Reviews')}>
        {revs.length ? (
          <ul className="space-y-4">
            {revs.map((r) => (
              <li key={r.id} className="border-b border-default pb-4 last:border-0">
                <div className="flex items-center gap-2"><Stars n={r.rating} /><span className="text-sm font-medium text-espresso">{r.display_name}</span></div>
                {r.comment ? <p className="mt-1.5 text-sm leading-relaxed text-ink">{r.comment}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink">{L('لسه مفيش تقييمات.', 'No reviews yet.')}</p>
        )}
        <Link to="/review" onClick={() => setSheet(null)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-btn bg-gold font-semibold text-espresso">{L('اكتب تقييمك', 'Write a review')}</Link>
      </Sheet>
      <Sheet open={sheet === 'team'} onClose={() => setSheet(null)} title={L('فريقنا', 'Our team')}>
        <div className="-mx-5 -mt-6"><TeamSection /></div>
      </Sheet>
      <Sheet open={sheet === 'about'} onClose={() => setSheet(null)} title={L('عنّا', 'About us')}>
        <p className="whitespace-pre-line leading-relaxed text-ink">{about}</p>
      </Sheet>
    </section>
  );
}

/* ───────── السوشيال والمشاركة ومواعيد العمل ───────── */
function SocialIcon({ name }: { name: string }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (name === 'instagram') return (<svg {...common}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" /></svg>);
  if (name === 'facebook') return (<svg {...common}><path d="M14 8h3V4h-3c-2.2 0-4 1.8-4 4v2H7v4h3v6h4v-6h3l1-4h-4V8z" /></svg>);
  if (name === 'tiktok') return (<svg {...common}><path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 4c.5 2.5 2.2 4 4.5 4.2" /></svg>);
  return (<svg {...common}><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" /></svg>);
}

export function ConnectSection() {
  const { ar, L } = useAr();
  const settings = useSettings();
  const hours = useWorkingHours();
  const [share, setShare] = useState(false);
  const extra = settings.data;
  const socials = [
    { key: 'instagram', label: 'Instagram', url: (extra?.social_instagram ?? '').trim() },
    { key: 'facebook', label: 'Facebook', url: (extra?.social_facebook ?? '').trim() },
    { key: 'tiktok', label: 'TikTok', url: (extra?.social_tiktok ?? '').trim() },
    { key: 'youtube', label: 'YouTube', url: (extra?.social_youtube ?? '').trim() },
  ].filter((x) => x.url && isSafeUrl(x.url));
  const todayDow = getCairoNow().getDay();

  return (
    <section className="mx-auto max-w-5xl px-5 pb-10 sm:pb-14">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-card border border-default bg-white p-4 shadow-warm">
          <p className="flex items-center gap-1.5 font-bold text-espresso"><Share2 className="size-4 text-gold" aria-hidden />{L('تابعنا وشاركنا', 'Follow & share')}</p>
          {socials.length ? (
            <div className="flex flex-wrap gap-2">
              {socials.map((x) => (
                <a key={x.key} href={x.url} target="_blank" rel="noopener noreferrer" aria-label={x.label} title={x.label} className="flex size-11 items-center justify-center rounded-btn border border-default bg-cream text-espresso transition-colors hover:border-gold hover:text-gold">
                  <SocialIcon name={x.key} />
                </a>
              ))}
            </div>
          ) : null}
          <p className="text-sm text-ink">{L('عجبك المكان؟ ابعت اللينك لصاحبك أو ورّيله الكود يمسحه.', 'Like us? Send the link to a friend or show them the QR code.')}</p>
          <Button variant="secondary" className="mt-auto" onClick={() => setShare(true)}><Share2 className="size-4" aria-hidden />{L('شارك الموقع', 'Share the site')}</Button>
        </div>

        <div className="rounded-card border border-default bg-white p-4 shadow-warm">
          <p className="mb-2 flex items-center gap-1.5 font-bold text-espresso"><Clock className="size-4 text-gold" aria-hidden />{L('مواعيد العمل', 'Opening hours')}</p>
          {hours.isLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <ul className="divide-y divide-default text-sm">
              {(hours.data ?? []).map((wh) => {
                const isToday = wh.day_of_week === todayDow;
                return (
                  <li key={wh.id} className={cn('flex items-center justify-between gap-2 px-1 py-1.5', isToday && 'rounded-btn bg-gold/15 font-semibold')}>
                    <span className="text-espresso">{(ar ? DAY_NAMES_AR : DAY_NAMES_EN)[wh.day_of_week]}{isToday ? <span className="ms-1.5 text-xs text-gold-dark">{L('النهارده', 'Today')}</span> : null}</span>
                    <span className="font-latin text-ink" dir="ltr">{wh.is_closed ? L('مقفول', 'Closed') : `${wh.open_time.slice(0, 5)} – ${wh.close_time.slice(0, 5)}`}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <Sheet open={share} onClose={() => setShare(false)} title={L('شارك الموقع', 'Share the site')}>
        <ShareAndQr compact />
      </Sheet>
    </section>
  );
}
