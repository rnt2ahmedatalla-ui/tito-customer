import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { StickyBottomBar } from '@/components/layout/StickyBottomBar';
import { ProfileModal } from '@/components/layout/ProfileModal';
import { Button } from '@/components/ui/Button';
import { ServiceCard } from '@/components/booking/ServiceCard';
import { DateStrip } from '@/components/booking/DateStrip';
import { SlotGrid } from '@/components/booking/SlotGrid';
import { HoldTimer } from '@/components/booking/HoldTimer';
import { PaymentPanel } from '@/components/booking/PaymentPanel';
import { LeatherPattern } from '@/components/brand/Pattern';
import { useServices, useSettings, useWorkingHours } from '@/features/home/useHomeData';
import { useAuth, useProfile, isProfileComplete } from '@/features/profile/useAuth';
import { useSignIn } from '@/features/profile/useAuth';
import { useAvailableSlots, useCreateBooking, useSubmitPayment, useBooking } from './useBooking';
import { getDateRange, formatCairoDate, formatCairoTime, isExpired } from '@/lib/time';
import { formatEGP } from '@/lib/money';
import { buildWhatsAppUrl } from '@/lib/urls';
import { extractErrorCode } from '@/lib/errors';
import type { PaymentMethod } from '@/types/database';
import { cn } from '@/lib/cn';

const STEPS = ['service', 'datetime', 'review', 'payment', 'success'] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<string, string> = {
  service: 'booking.stepService',
  datetime: 'booking.stepDate',
  review: 'booking.stepReview',
  payment: 'booking.stepPayment',
};

export default function BookingPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const profile = useProfile();
  const signIn = useSignIn();
  const services = useServices();
  const settings = useSettings();
  const workingHours = useWorkingHours();
  const createBooking = useCreateBooking();
  const submitPayment = useSubmitPayment();

  const step = (params.get('step') as Step) || 'service';
  const serviceId = params.get('service');
  const date = params.get('date');
  const slot = params.get('slot');
  const bookingId = params.get('booking');

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [holdExpired, setHoldExpired] = useState(false);
  const [pendingAction, setPendingAction] = useState<'book' | 'pay_at_shop' | null>(null);

  const slots = useAvailableSlots(serviceId, date);
  const booking = useBooking(bookingId);

  const selectedService =
    services.data?.find((s) => s.id === serviceId) ??
    booking.data?.service ??
    null;
  const maxDays = settings.data?.max_days_ahead ?? 14;
  const dates = useMemo(() => getDateRange(maxDays), [maxDays]);

  const closedDays = useMemo(() => {
    const closed = new Set<number>();
    workingHours.data?.forEach((wh) => {
      if (wh.is_closed) closed.add(wh.day_of_week);
    });
    return closed;
  }, [workingHours.data]);

  const stepIndex = STEPS.indexOf(step);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null) next.delete(k);
        else next.set(k, v);
      });
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const goToStep = (s: Step) => updateParams({ step: s });

  useEffect(() => {
    if (booking.data?.hold_expires_at && isExpired(booking.data.hold_expires_at)) {
      setHoldExpired(true);
    }
  }, [booking.data?.hold_expires_at]);

  const handleConfirmBooking = async (payAtShop = false) => {
    if (!user) {
      const action = payAtShop ? 'pay_at_shop' : 'book';
      setPendingAction(action);
      try {
        sessionStorage.setItem('tito_pending_book', action);
      } catch {
        /* ignore */
      }
      await signIn();
      return;
    }
    if (profile.isLoading || profile.isFetching) return;
    if (!isProfileComplete(profile.data)) {
      setPendingAction(payAtShop ? 'pay_at_shop' : 'book');
      setShowProfileModal(true);
      return;
    }
    if (!serviceId || !slot) return;

    try {
      const id = await createBooking.mutateAsync({
        serviceId,
        startAt: slot,
        payAtShop,
      });
      try {
        sessionStorage.removeItem('tito_pending_book');
      } catch {
        /* ignore */
      }
      setPendingAction(null);
      if (payAtShop) {
        updateParams({ step: 'success', booking: id, service: null, date: null, slot: null });
      } else {
        updateParams({ step: 'payment', booking: id });
      }
    } catch (err) {
      if (extractErrorCode(err) === 'SLOT_TAKEN') {
        slots.refetch();
      }
    }
  };

  // After Google OAuth return: restore pending book intent and open profile gate if needed
  useEffect(() => {
    if (authLoading || !user || profile.isLoading) return;
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem('tito_pending_book');
    } catch {
      pending = null;
    }
    if (!pending) return;
    setPendingAction(pending as 'book' | 'pay_at_shop');
    if (!isProfileComplete(profile.data)) {
      setShowProfileModal(true);
    }
  }, [authLoading, user, profile.isLoading, profile.data]);

  const handleProfileComplete = () => {
    const action = pendingAction;
    setPendingAction(null);
    try {
      sessionStorage.removeItem('tito_pending_book');
    } catch {
      /* ignore */
    }
    if (action === 'pay_at_shop') void handleConfirmBooking(true);
    else if (action === 'book') void handleConfirmBooking(false);
  };

  const handlePaymentMarkedSent = async (data: { method: PaymentMethod }) => {
    if (!bookingId || !user) return;
    await submitPayment.mutateAsync({
      bookingId,
      method: data.method,
    });
    updateParams({ step: 'success' });
  };

  const canProceed = () => {
    if (step === 'service') return !!serviceId;
    if (step === 'datetime') return !!date && !!slot;
    return true;
  };

  const whatsappUrl = (() => {
    if (!settings.data?.shop_whatsapp) return null;
    if (step === 'success' && booking.data && selectedService) {
      const serviceName =
        i18n.language === 'ar' ? selectedService.name_ar : selectedService.name_en;
      const msg =
        i18n.language === 'ar'
          ? `مرحباً tito 👋\nحجزت ${serviceName}\n${formatCairoDate(booking.data.start_at, 'ar')}\n${formatCairoTime(booking.data.start_at, 'ar')}\n${formatEGP(booking.data.price_egp)}`
          : `Hi tito 👋\nI booked ${serviceName}\n${formatCairoDate(booking.data.start_at, 'en')}\n${formatCairoTime(booking.data.start_at, 'en')}\n${formatEGP(booking.data.price_egp)}`;
      return buildWhatsAppUrl(settings.data.shop_whatsapp, msg);
    }
    return buildWhatsAppUrl(settings.data.shop_whatsapp);
  })();

  return (
    <PageShell>
      {/* Step indicator */}
      {step !== 'success' ? (
        <nav className="mb-6" aria-label={t('a11y.stepIndicator')}>
          <ol className="flex gap-1">
            {STEPS.slice(0, 4).map((s, i) => (
              <li
                key={s}
                className={cn(
                  'h-1 flex-1 rounded-pill transition-colors',
                  i <= stepIndex ? 'bg-gold' : 'bg-sand',
                )}
                aria-current={s === step ? 'step' : undefined}
              />
            ))}
          </ol>
          <p className="mt-2 text-sm text-ink">
            {t(STEP_LABELS[step] ?? 'booking.stepService')}
          </p>
        </nav>
      ) : null}

      {/* Step 1: Service */}
      {step === 'service' ? (
        <section>
          <h1 className="text-2xl font-bold text-espresso">{t('booking.selectService')}</h1>
          <div className="mt-4 grid gap-3">
            {services.data?.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                selected={serviceId === service.id}
                onSelect={() => updateParams({ service: service.id })}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Step 2: Date & Time */}
      {step === 'datetime' ? (
        <section>
          <h1 className="text-2xl font-bold text-espresso">{t('booking.selectDate')}</h1>
          <div className="mt-4">
            <DateStrip
              dates={dates}
              selectedDate={date}
              closedDays={closedDays}
              onSelect={(d) => updateParams({ date: d, slot: null })}
            />
          </div>
          {date ? (
            <div className="mt-6">
              <h2 className="mb-3 text-lg font-semibold text-espresso">{t('booking.selectTime')}</h2>
              <SlotGrid
                slots={slots.data ?? []}
                selectedSlot={slot}
                onSelect={(s) => updateParams({ slot: s })}
                isLoading={slots.isLoading}
                isError={slots.isError}
                onRetry={() => slots.refetch()}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Step 3: Review */}
      {step === 'review' && selectedService ? (
        <section>
          <h1 className="text-2xl font-bold text-espresso">{t('booking.reviewTitle')}</h1>
          <div className="mt-6 space-y-4 rounded-card border border-default p-4">
            <div className="flex justify-between">
              <span className="text-ink">{t('booking.service')}</span>
              <span className="font-medium">{i18n.language === 'ar' ? selectedService.name_ar : selectedService.name_en}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink">{t('booking.date')}</span>
              <span className="font-latin">{date && slot ? formatCairoDate(slot, i18n.language) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink">{t('booking.time')}</span>
              <span className="font-latin">{slot ? formatCairoTime(slot, i18n.language) : '—'}</span>
            </div>
            <div className="flex justify-between border-t border-default pt-4">
              <span className="text-ink">{t('booking.price')}</span>
              <span className="text-lg font-bold text-espresso font-latin">{formatEGP(selectedService.price_egp)}</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-ink">
            {t('booking.cancelRule', { hours: settings.data?.cancel_window_hours ?? 3 })}
          </p>

          {!user && !authLoading ? (
            <div className="mt-6 rounded-card bg-sand/50 p-4 text-center">
              <p className="mb-3 text-sm text-ink">{t('booking.loginRequired')}</p>
              <Button onClick={() => signIn()}>{t('booking.signInGoogle')}</Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Step 4: Payment */}
      {step === 'payment' && booking.data && settings.data ? (
        <section>
          <h1 className="text-2xl font-bold text-espresso">{t('booking.paymentTitle')}</h1>
          {holdExpired || (booking.data.hold_expires_at && isExpired(booking.data.hold_expires_at)) ? (
            <div className="mt-6 text-center">
              <h2 className="text-xl font-bold text-danger">{t('booking.holdExpired')}</h2>
              <p className="mt-2 text-ink">{t('booking.holdExpiredDesc')}</p>
              <Button className="mt-4" onClick={() => navigate('/book')}>
                {t('booking.bookAgain')}
              </Button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {booking.data.hold_expires_at ? (
                <HoldTimer
                  expiresAt={booking.data.hold_expires_at}
                  onExpired={() => setHoldExpired(true)}
                />
              ) : null}
              <PaymentPanel
                amount={booking.data.price_egp}
                settings={settings.data}
                bookingId={booking.data.id}
                serviceName={
                  i18n.language === 'ar'
                    ? selectedService?.name_ar ?? booking.data.service_name_ar
                    : selectedService?.name_en ?? booking.data.service_name_en
                }
                whenLabel={`${formatCairoDate(booking.data.start_at, i18n.language)} · ${formatCairoTime(booking.data.start_at, i18n.language)}`}
                onMarkedSent={handlePaymentMarkedSent}
                loading={submitPayment.isPending}
              />
            </div>
          )}
        </section>
      ) : null}

      {/* Step 5: Success */}
      {step === 'success' ? (
        <section className="relative overflow-hidden rounded-card bg-espresso p-8 text-center text-cream">
          <LeatherPattern />
          <div className="relative">
            <h1 className="text-2xl font-bold">{t('booking.successTitle')}</h1>
            <p className="mt-2 text-cream/80">{t('booking.successDesc')}</p>
            <p className="mt-3 text-sm text-gold-soft">{t('booking.reminderHint')}</p>
            {booking.data && selectedService ? (
              <div className="mt-6 space-y-2 text-sm font-latin">
                <p>{i18n.language === 'ar' ? selectedService.name_ar : selectedService.name_en}</p>
                <p>{formatCairoDate(booking.data.start_at, i18n.language)}</p>
                <p>{formatCairoTime(booking.data.start_at, i18n.language)}</p>
                <p className="text-gold-soft">{formatEGP(booking.data.price_egp)}</p>
              </div>
            ) : null}
            <div className="mt-8 flex flex-col gap-3">
              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" fullWidth>
                    {t('booking.contactShop')}
                  </Button>
                </a>
              ) : null}
              <Link to="/bookings">
                <Button fullWidth>{t('booking.viewBookings')}</Button>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Navigation */}
      {step !== 'success' && step !== 'payment' ? (
        <StickyBottomBar>
          <div className="flex gap-3">
            {stepIndex > 0 ? (
              <Button
                variant="secondary"
                onClick={() => goToStep(STEPS[stepIndex - 1])}
                className="flex-1"
              >
                <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden />
                {t('common.back')}
              </Button>
            ) : null}
            {step === 'review' ? (
              <div className="flex flex-1 flex-col gap-2">
                <Button
                  fullWidth
                  onClick={() => handleConfirmBooking(false)}
                  loading={createBooking.isPending}
                  disabled={!user && authLoading}
                >
                  {t('booking.confirmBooking')}
                </Button>
                {settings.data?.allow_pay_at_shop ? (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => handleConfirmBooking(true)}
                    loading={createBooking.isPending}
                  >
                    {t('booking.payAtShop')}
                  </Button>
                ) : null}
              </div>
            ) : (
              <Button
                className="flex-1"
                disabled={!canProceed()}
                onClick={() => goToStep(STEPS[stepIndex + 1])}
              >
                {t('common.next')}
                <ChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden />
              </Button>
            )}
          </div>
        </StickyBottomBar>
      ) : null}

      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onComplete={handleProfileComplete}
        initialName={profile.data?.full_name ?? ''}
        initialPhone={profile.data?.phone ?? ''}
      />
    </PageShell>
  );
}
