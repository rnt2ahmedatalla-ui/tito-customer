import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, MapPin, AlertTriangle, Clock, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';
import { LeatherPattern } from '@/components/brand/Pattern';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShareAndQr } from '@/components/share/ShareAndQr';
import { usePolicyText } from '@/lib/policy';
import { TeamSection } from '@/components/staff/StaffParts';
import { useSettings, useWorkingHours, useNextSlot } from './useHomeData';
import { formatCairoTime, formatCairoDate, getCairoNow } from '@/lib/time';
import { format } from 'date-fns';
import { buildWhatsAppUrl, isSafeUrl } from '@/lib/urls';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { WaitEstimateCard, InactiveBanner, RatePrompt } from '@/features/extras/ExtrasCards';

const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type RecentReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  display_name: string;
};

function RecentReviews() {
  const { t } = useTranslation();
  const list = useQuery({
    queryKey: ['recent-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_recent_reviews', { p_limit: 8 });
      if (error) throw error;
      return (data ?? []) as RecentReview[];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  if (list.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (!list.data?.length) {
    return <p className="text-sm text-ink">{t('home.reviewsEmpty')}</p>;
  }

  return (
    <ul className="space-y-6">
      {list.data.map((r) => (
        <li key={r.id} className="border-b border-default pb-6 last:border-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5" aria-label={`${r.rating}`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn('size-4', i < r.rating ? 'fill-gold text-gold' : 'text-bark/25')}
                  aria-hidden
                />
              ))}
            </div>
            <span className="text-sm font-medium text-espresso">{r.display_name}</span>
          </div>
          {r.comment ? <p className="mt-2 text-ink leading-relaxed">{r.comment}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function SocialIcon({ name }: { name: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (name === 'instagram') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" />
      </svg>
    );
  }
  if (name === 'facebook') {
    return (
      <svg {...common}>
        <path d="M14 8h3V4h-3c-2.2 0-4 1.8-4 4v2H7v4h3v6h4v-6h3l1-4h-4V8z" />
      </svg>
    );
  }
  if (name === 'tiktok') {
    return (
      <svg {...common}>
        <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" />
        <path d="M14 4c.5 2.5 2.2 4 4.5 4.2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" />
    </svg>
  );
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const workingHours = useWorkingHours();
  const nextSlot = useNextSlot();
  const reviews = useQuery({
    queryKey: ['review-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_review_stats');
      if (error) throw error;
      return data as { avg: number; count: number };
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const todayDow = getCairoNow().getDay();
  const bookingOpen = settings.data?.booking_open ?? true;
  const ar = i18n.language?.startsWith('ar');
  const headline =
    (ar ? settings.data?.hero_headline_ar : settings.data?.hero_headline_en) || t('home.heroHeadline');
  const support =
    (ar ? settings.data?.hero_support_ar : settings.data?.hero_support_en) || t('home.heroSupport');
  const about =
    (ar ? settings.data?.about_ar : settings.data?.about_en) || t('home.aboutDefault');
  const tagline =
    (ar ? settings.data?.tagline_ar : settings.data?.tagline_en) || t('app.tagline');

  const extra = settings.data as unknown as Record<string, string | null | undefined> | undefined;
  const { text: policyText } = usePolicyText(!!ar);
  const socialLinks = [
    { key: 'instagram', label: 'Instagram', url: (extra?.social_instagram ?? '').trim() },
    { key: 'facebook', label: 'Facebook', url: (extra?.social_facebook ?? '').trim() },
    { key: 'tiktok', label: 'TikTok', url: (extra?.social_tiktok ?? '').trim() },
    { key: 'youtube', label: 'YouTube', url: (extra?.social_youtube ?? '').trim() },
  ].filter((x) => x.url && isSafeUrl(x.url));

  const nextSlotLabel = (() => {
    if (!nextSlot.data) return t('home.noSlots');
    const slotDate = formatCairoDate(nextSlot.data, i18n.language);
    const slotTime = formatCairoTime(nextSlot.data, i18n.language);
    const today = format(getCairoNow(), 'yyyy-MM-dd');
    if (nextSlot.data.startsWith(today)) {
      return t('home.nextSlotToday', { time: slotTime });
    }
    return t('home.nextSlotDate', { date: slotDate, time: slotTime });
  })();

  const whatsappUrl = settings.data?.shop_whatsapp
    ? buildWhatsAppUrl(settings.data.shop_whatsapp)
    : null;
  const locationUrl =
    settings.data?.shop_location_url && isSafeUrl(settings.data.shop_location_url)
      ? settings.data.shop_location_url
      : null;

  return (
    <PageShell marketing darkHeader>
      {/* Full-bleed hero — brand first */}
      <section className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col justify-end overflow-hidden bg-espresso text-cream">
        <LeatherPattern />
        <div
          className="pointer-events-none absolute inset-0 animate-fade"
          aria-hidden
          style={{
            background:
              'linear-gradient(180deg, rgba(52,26,14,0.2) 0%, rgba(52,26,14,0.55) 45%, #341A0E 100%)',
          }}
        />

        <div className="relative mx-auto w-full max-w-5xl px-4 pb-24 pt-16 sm:px-5 sm:pb-24 sm:pt-28">
          <Logo variant="dark" mark height={56} className="animate-rise sm:!h-[72px]" />
          {settings.isLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-6 w-32 bg-cream/20" />
              <Skeleton className="h-4 w-48 bg-cream/15" />
              <Skeleton className="mt-4 h-12 w-3/4 max-w-lg bg-cream/20 sm:h-16" />
              <Skeleton className="mt-3 h-6 w-1/2 max-w-sm bg-cream/15" />
            </div>
          ) : (
            <>
              <p className="mt-3 text-xl font-bold tracking-wide text-gold font-latin animate-rise sm:mt-4 sm:text-2xl">
                {settings.data?.shop_name || 'tito'}
              </p>
              {tagline ? <p className="mt-1 text-sm text-cream/70 animate-rise">{tagline}</p> : null}

              <h1 className="mt-6 max-w-xl text-balance text-3xl font-bold leading-[1.2] tracking-tight text-cream animate-rise-delay-1 sm:mt-8 sm:text-5xl md:text-6xl">
                {headline}
              </h1>

              <p className="mt-5 max-w-md text-lg text-cream/80 animate-rise-delay-2 sm:text-xl">
                {support}
              </p>
            </>
          )}

          {reviews.data && reviews.data.count > 0 ? (
            <p className="mt-4 flex items-center gap-1.5 text-sm text-gold-soft animate-fade">
              <Star className="size-4 fill-gold text-gold" aria-hidden />
              <span className="font-latin">{Number(reviews.data.avg).toFixed(1)}</span>
              <span className="text-cream/60">({reviews.data.count})</span>
            </p>
          ) : null}

          <div className="mt-8 flex w-full flex-col gap-3 animate-rise-delay-2 sm:mt-10 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Link to="/book" className="w-full sm:w-auto">
              <Button size="lg" className="w-full shadow-warm-raised sm:min-w-[180px]">
                {t('home.heroCta')}
              </Button>
            </Link>
          </div>

          <div className="mt-6 empty:hidden">
            <WaitEstimateCard />
          </div>

          {!nextSlot.isLoading ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-gold-soft font-latin animate-fade">
              <Clock className="size-4 shrink-0" aria-hidden />
              <span>
                {t('home.nextSlot')}: {nextSlotLabel}
              </span>
            </p>
          ) : null}
        </div>

        <div className="gold-rule relative" aria-hidden />
      </section>

      {!bookingOpen ? (
        <div
          className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4 text-warning"
          role="alert"
        >
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          <p className="text-sm font-medium">{t('home.bookingClosed')}</p>
        </div>
      ) : null}

      {/* How it works — editorial, not card grid */}
      <section className="bg-espresso text-cream">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold font-latin">
            {t('home.howEyebrow')}
          </p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{t('home.howItWorks')}</h2>
          <p className="mt-3 max-w-lg text-cream/70">{t('home.howSupport')}</p>

          <ol className="mt-12 space-y-0 divide-y divide-cream/10">
            {[
              { step: '01', title: t('home.step1'), desc: t('home.step1Desc') },
              { step: '02', title: t('home.step2'), desc: t('home.step2Desc') },
              { step: '03', title: t('home.step3'), desc: t('home.step3Desc') },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex gap-6 py-8 first:pt-0 last:pb-0 sm:gap-10">
                <span className="shrink-0 text-3xl font-bold text-gold font-latin tabular-nums">
                  {step}
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-cream">{title}</h3>
                  <p className="mt-2 max-w-md text-cream/65">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-3 px-5 pt-6 empty:hidden">
        <InactiveBanner />
        <RatePrompt />
      </section>

      {/* سياسة الحجز */}
      <section className="mx-auto max-w-5xl px-5 pb-4 pt-2 sm:pb-8">
        <div className="rounded-card border border-gold/40 bg-gold/10 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold font-latin">
            {ar ? 'سياسة الحجز' : 'Booking policy'}
          </p>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-ink">
            {policyText}
          </p>
        </div>
      </section>

      <TeamSection />

      <section id="about" className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold font-latin">
          {t('home.aboutEyebrow')}
        </p>
        <h2 className="mt-3 text-3xl font-bold text-espresso sm:text-4xl">{t('home.aboutTitle')}</h2>
        {settings.isLoading ? (
          <div className="mt-4 max-w-2xl space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : (
          <p className="mt-4 max-w-2xl whitespace-pre-line text-ink leading-relaxed">{about}</p>
        )}
      </section>

      {socialLinks.length > 0 ? (
        <section className="mx-auto max-w-5xl px-5 pb-12 sm:pb-16">
          <div className="flex flex-wrap gap-3">
            {socialLinks.map((x) => (
              <a
                key={x.key}
                href={x.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={x.label}
                title={x.label}
                className="flex size-11 items-center justify-center rounded-btn border border-default bg-white text-espresso transition-colors hover:border-gold hover:text-gold"
              >
                <SocialIcon name={x.key} />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {/* Reviews under services */}
      <section className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold font-latin">
          {t('home.reviewsEyebrow')}
        </p>
        <h2 className="mt-3 text-3xl font-bold text-espresso sm:text-4xl">{t('home.reviewsTitle')}</h2>
        {reviews.data && reviews.data.count > 0 ? (
          <p className="mt-3 flex items-center gap-2 text-ink">
            <Star className="size-5 fill-gold text-gold" aria-hidden />
            <span className="font-latin text-lg font-semibold">{Number(reviews.data.avg).toFixed(1)}</span>
            <span className="text-ink/60">({reviews.data.count})</span>
          </p>
        ) : null}
        <div className="gold-rule my-8 max-w-xs" />
        <RecentReviews />
        <div className="mt-8">
          <Link to="/review">
            <Button variant="secondary" size="lg">
              {t('home.writeReview')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Share + QR — same easy path as write-a-review */}
      <section className="mx-auto max-w-5xl px-5 pb-12 sm:pb-16">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold font-latin">
          {t('home.shareEyebrow')}
        </p>
        <h2 className="mt-3 text-3xl font-bold text-espresso sm:text-4xl">{t('home.shareTitle')}</h2>
        <p className="mt-3 max-w-lg text-ink">{t('home.shareSupport')}</p>
        <div className="gold-rule my-8 max-w-xs" />
        <ShareAndQr compact />
      </section>

      {/* لينكات السوشيال ميديا: هتتضاف هنا في الدفعة الجاية */}

      {/* Hours */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold font-latin">
          {t('home.hoursEyebrow')}
        </p>
        <h2 className="mt-3 text-3xl font-bold text-espresso sm:text-4xl">{t('home.hours')}</h2>
        <p className="mt-3 max-w-lg text-ink">{t('home.hoursSupport')}</p>
        <div className="gold-rule my-8 max-w-xs" />

        {workingHours.isLoading ? (
          <Skeleton className="h-56" />
        ) : (
          <div className="overflow-hidden border-y border-default">
            {workingHours.data?.map((wh) => {
              const dayName =
                i18n.language === 'ar' ? DAY_NAMES_AR[wh.day_of_week] : DAY_NAMES_EN[wh.day_of_week];
              const isToday = wh.day_of_week === todayDow;
              return (
                <div
                  key={wh.id}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 py-4 transition-colors',
                    'border-b border-default last:border-0',
                    isToday && 'bg-gold/10',
                  )}
                >
                  <span className={cn('min-w-0 font-medium text-espresso', isToday && 'text-bark')}>
                    {dayName}
                    {isToday ? (
                      <span className="ms-2 text-sm text-gold">{t('home.today')}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-sm text-ink font-latin" dir="ltr">
                    {wh.is_closed
                      ? t('home.closed')
                      : `${wh.open_time.slice(0, 5)} – ${wh.close_time.slice(0, 5)}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Visit / contact strip */}
      <section className="border-t border-default bg-sand/60">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-espresso">{t('home.visitTitle')}</h2>
            <p className="mt-2 text-ink">{t('home.visitSupport')}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  <MessageCircle className="size-4" aria-hidden />
                  {t('home.whatsapp')}
                </Button>
              </a>
            ) : null}
            {locationUrl ? (
              <a href={locationUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  <MapPin className="size-4" aria-hidden />
                  {t('home.location')}
                </Button>
              </a>
            ) : null}
            <Link to="/book" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">{t('home.heroCta')}</Button>
            </Link>
          </div>
        </div>
      </section>


      <footer className="bg-espresso py-8 text-center text-sm text-cream/40">
        <Logo variant="dark" mark height={40} className="mx-auto opacity-90" />
        <p className="mt-3 font-latin tracking-wide">{settings.data?.shop_name || 'tito'}</p>
      </footer>
    </PageShell>
  );
}
