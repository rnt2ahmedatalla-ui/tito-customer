import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, MapPin, AlertTriangle } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { ServiceCard } from '@/components/booking/ServiceCard';
import { Logo } from '@/components/brand/Logo';
import { LeatherPattern, GoldDivider } from '@/components/brand/Pattern';
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
    const slotDay = formatCairoDate(nextSlot.data, 'en').includes(format(getCairoNow(), 'MMMM'))
      ? today
      : '';
    if (slotDay === today || nextSlot.data.startsWith(today)) {
      return t('home.nextSlotToday', { time: slotTime });
    }
    return t('home.nextSlotDate', { date: slotDate, time: slotTime });
  })();

  const whatsappUrl = settings.data?.shop_whatsapp
    ? buildWhatsAppUrl(settings.data.shop_whatsapp)
    : null;
  const locationUrl = settings.data?.shop_location_url && isSafeUrl(settings.data.shop_location_url)
    ? settings.data.shop_location_url
    : null;

  return (
    <PageShell noPadding>
      {/* Hero */}
      <section className="relative overflow-hidden bg-espresso px-4 pb-12 pt-8 text-cream">
        <LeatherPattern />
        <div className="relative mx-auto max-w-5xl text-center">
          <Logo variant="dark" height={48} className="mx-auto" />
          <p className="mt-4 text-lg text-cream/90">{t('app.tagline')}</p>

          {nextSlot.isLoading ? (
            <Skeleton className="mx-auto mt-6 h-6 w-48 bg-bark" />
          ) : (
            <p className="mt-6 text-sm text-gold-soft font-latin">
              {t('home.nextSlot')}: {nextSlotLabel}
            </p>
          )}

          <Link to="/book" className="mt-8 inline-block">
            <Button size="lg" className="min-w-[200px]">
              {t('home.heroCta')}
            </Button>
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {!bookingOpen ? (
          <div className="mb-8 flex items-center gap-3 rounded-card border border-warning/30 bg-warning/10 p-4 text-warning" role="alert">
            <AlertTriangle className="size-5 shrink-0" aria-hidden />
            <p className="text-sm font-medium">{t('home.bookingClosed')}</p>
          </div>
        ) : null}

        {/* Services */}
        <section>
          <h2 className="text-2xl font-bold text-espresso">{t('home.services')}</h2>
          <GoldDivider />
          {services.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {services.data?.map((service) => (
                <Link key={service.id} to={`/book?step=service&service=${service.id}`}>
                  <ServiceCard service={service} onSelect={() => {}} />
                </Link>
              ))}
            </div>
          )}
          <div className="mt-4 text-center">
            <Link to="/book">
              <Button variant="secondary">{t('home.heroCta')}</Button>
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-espresso">{t('home.howItWorks')}</h2>
          <GoldDivider />
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { step: '1', title: t('home.step1'), desc: t('home.step1Desc') },
              { step: '2', title: t('home.step2'), desc: t('home.step2Desc') },
              { step: '3', title: t('home.step3'), desc: t('home.step3Desc') },
            ].map(({ step, title, desc }) => (
              <div key={step} className="rounded-card border border-default bg-sand/50 p-4 text-center">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-gold text-lg font-bold text-espresso font-latin">
                  {step}
                </span>
                <h3 className="mt-3 font-semibold text-espresso">{title}</h3>
                <p className="mt-1 text-sm text-ink">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hours */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-espresso">{t('home.hours')}</h2>
          <GoldDivider />
          {workingHours.isLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="rounded-card border border-default overflow-hidden">
              {workingHours.data?.map((wh) => {
                const dayName = i18n.language === 'ar' ? DAY_NAMES_AR[wh.day_of_week] : DAY_NAMES_EN[wh.day_of_week];
                const isToday = wh.day_of_week === todayDow;
                return (
                  <div
                    key={wh.id}
                    className={cn(
                      'flex items-center justify-between border-b border-default px-4 py-3 last:border-0',
                      isToday && 'bg-gold/10',
                    )}
                  >
                    <span className={cn('font-medium', isToday && 'text-gold')}>
                      {dayName}
                      {isToday ? ` (${t('home.today')})` : ''}
                    </span>
                    <span className="text-sm text-ink font-latin" dir="ltr">
                      {wh.is_closed ? t('home.closed') : `${wh.open_time.slice(0, 5)} – ${wh.close_time.slice(0, 5)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Contact */}
        <section className="mt-12 flex flex-wrap gap-3 justify-center pb-8">
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                <MessageCircle className="size-4" />
                {t('home.whatsapp')}
              </Button>
            </a>
          ) : null}
          {locationUrl ? (
            <a href={locationUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                <MapPin className="size-4" />
                {t('home.location')}
              </Button>
            </a>
          ) : null}
        </section>
      </div>
    </PageShell>
  );
}
