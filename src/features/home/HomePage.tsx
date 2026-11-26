import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, MapPin, AlertTriangle, Clock, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';
import { LeatherPattern } from '@/components/brand/Pattern';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePolicyText } from '@/lib/policy';
import { useSettings, useNextSlot } from './useHomeData';
import { formatCairoTime, formatCairoDate, getCairoNow } from '@/lib/time';
import { format } from 'date-fns';
import { buildWhatsAppUrl, isSafeUrl } from '@/lib/urls';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { ConnectSection, DiscoverSection, OffersSection, ServicesProductsSection } from '@/features/home/Showcase';
import { openHowToBook, PushFloat } from '@/features/home/HowToBook';
import { QuickRebook } from '@/features/home/QuickActions';
import { HomeRebook, useHomeCardVariant } from '@/features/home/HomeRebook';
import { PhotoPromptCard, VisitProgressCard } from '@/features/home/GrowthCards';
import { WaitEstimateCard, InactiveBanner, RatePrompt } from '@/features/extras/ExtrasCards';


export default function HomePage() {
  const homeCard = useHomeCardVariant();
  const { t, i18n } = useTranslation();
  const settings = useSettings();
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

  const bookingOpen = settings.data?.booking_open ?? true;
  const ar = i18n.language?.startsWith('ar');
  const headline =
    (ar ? settings.data?.hero_headline_ar : settings.data?.hero_headline_en) || t('home.heroHeadline');
  const support =
    (ar ? settings.data?.hero_support_ar : settings.data?.hero_support_en) || t('home.heroSupport');
  const tagline =
    (ar ? settings.data?.tagline_ar : settings.data?.tagline_en) || t('app.tagline');

  const { text: policyText } = usePolicyText(!!ar);
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
      <section className="relative flex min-h-[calc(100svh-3.5rem)] flex-col justify-end overflow-hidden bg-espresso text-cream">
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
          <div className="mb-5 space-y-2 empty:hidden">{homeCard === 'current' ? <><InactiveBanner /><QuickRebook /></> : <HomeRebook variant={homeCard} />}</div>
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

      {/* للعميل المسجّل: هداياه ونقاطه */}
      <section className="mx-auto max-w-5xl space-y-3 px-5 pt-6 empty:hidden">
        <VisitProgressCard />
        <PhotoPromptCard />
        <RatePrompt />
      </section>

      <ServicesProductsSection />
      <OffersSection />
      <DiscoverSection />
      <ConnectSection />

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


      <section className="mx-auto max-w-5xl px-5 py-6">
        <details className="group rounded-card border border-gold/40 bg-gold/10 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-espresso [&::-webkit-details-marker]:hidden">
            <span>{ar ? 'سياسة الحجز' : 'Booking policy'}</span>
            <span className="text-xs font-normal text-ink group-open:hidden">{ar ? 'اقرأها' : 'Read'}</span>
          </summary>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-ink">{policyText}</p>
        </details>
        <button type="button" onClick={openHowToBook} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-bark underline-offset-4 hover:underline">
          {ar ? 'خطوات الحجز' : 'How to book'}
        </button>
      </section>

      <PushFloat />

      <footer className="bg-espresso py-8 text-center text-sm text-cream/40">
        <Logo variant="dark" mark height={40} className="mx-auto opacity-90" />
        <p className="mt-3 font-latin tracking-wide">{settings.data?.shop_name || 'tito'}</p>
      </footer>
    </PageShell>
  );
}
