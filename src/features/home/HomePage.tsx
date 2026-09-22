import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, MapPin, AlertTriangle, Clock } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { ServiceCard } from '@/components/booking/ServiceCard';
import { Logo } from '@/components/brand/Logo';
import { LeatherPattern } from '@/components/brand/Pattern';
import { Skeleton } from '@/components/ui/Skeleton';
import { useServices, useSettings, useWorkingHours, useNextSlot } from './useHomeData';
import { formatCairoTime, formatCairoDate, getCairoNow } from '@/lib/time';
import { format } from 'date-fns';
import { buildWhatsAppUrl, isSafeUrl } from '@/lib/urls';
import { cn } from '@/lib/cn';

const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const services = useServices();
  const settings = useSettings();
  const workingHours = useWorkingHours();
  const nextSlot = useNextSlot();

  const todayDow = getCairoNow().getDay();
  const bookingOpen = settings.data?.booking_open ?? true;

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

        <div className="relative mx-auto w-full max-w-5xl px-5 pb-16 pt-24 sm:pb-24 sm:pt-28">
          <Logo variant="dark" mark height={72} className="animate-rise" />
          <p className="mt-4 text-2xl font-bold tracking-wide text-gold font-latin animate-rise">tito</p>

          <h1 className="mt-8 max-w-xl text-balance text-4xl font-bold leading-[1.15] tracking-tight text-cream animate-rise-delay-1 sm:text-5xl md:text-6xl">
            {t('home.heroHeadline')}
          </h1>

          <p className="mt-5 max-w-md text-lg text-cream/80 animate-rise-delay-2 sm:text-xl">
            {t('home.heroSupport')}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3 animate-rise-delay-2">
            <Link to="/book">
              <Button size="lg" className="min-w-[180px] shadow-warm-raised">
                {t('home.heroCta')}
              </Button>
            </Link>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-btn border border-cream/25 px-6 text-lg font-semibold text-cream transition-colors duration-brand hover:bg-cream/10 font-latin"
              >
                <MessageCircle className="size-5" aria-hidden />
                {t('home.whatsapp')}
              </a>
            ) : null}
          </div>

          {!nextSlot.isLoading ? (
            <p className="mt-8 flex items-center gap-2 text-sm text-gold-soft font-latin animate-fade">
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

      {/* Services */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold font-latin">
          {t('home.servicesEyebrow')}
        </p>
        <h2 className="mt-3 text-3xl font-bold text-espresso sm:text-4xl">{t('home.services')}</h2>
        <p className="mt-3 max-w-lg text-ink">{t('home.servicesSupport')}</p>
        <div className="gold-rule my-8 max-w-xs" />

        {services.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {services.data?.map((service) => (
              <Link key={service.id} to={`/book?step=service&service=${service.id}`}>
                <ServiceCard service={service} onSelect={() => {}} />
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10">
          <Link to="/book">
            <Button size="lg">{t('home.heroCta')}</Button>
          </Link>
        </div>
      </section>

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
                    'flex items-center justify-between px-1 py-4 transition-colors',
                    'border-b border-default last:border-0',
                    isToday && 'bg-gold/10',
                  )}
                >
                  <span className={cn('font-medium text-espresso', isToday && 'text-bark')}>
                    {dayName}
                    {isToday ? (
                      <span className="ms-2 text-sm text-gold">{t('home.today')}</span>
                    ) : null}
                  </span>
                  <span className="text-sm text-ink font-latin" dir="ltr">
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
          <div className="flex flex-wrap gap-3">
            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="lg">
                  <MessageCircle className="size-4" aria-hidden />
                  {t('home.whatsapp')}
                </Button>
              </a>
            ) : null}
            {locationUrl ? (
              <a href={locationUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="lg">
                  <MapPin className="size-4" aria-hidden />
                  {t('home.location')}
                </Button>
              </a>
            ) : null}
            <Link to="/book">
              <Button size="lg">{t('home.heroCta')}</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-espresso py-8 text-center text-sm text-cream/40">
        <Logo variant="dark" mark height={40} className="mx-auto opacity-90" />
        <p className="mt-3 font-latin tracking-wide">tito</p>
      </footer>
    </PageShell>
  );
}
