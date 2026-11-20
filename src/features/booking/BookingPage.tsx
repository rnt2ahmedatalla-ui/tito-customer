import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { StickyBottomBar } from '@/components/layout/StickyBottomBar';
import { useCancelBooking } from '../bookings/useBookings';
import { useAvailableSlots, useCreateBooking, useSubmitPayment, useBooking, useActiveStaff, useStaffServices, type StaffMember } from './useBooking';
import { ProfileModal } from '@/components/layout/ProfileModal';
import { InAppBrowserNotice } from '@/components/auth/InAppBrowserNotice';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button } from '@/components/ui/Button';
import { ServiceCard } from '@/components/booking/ServiceCard';
import { ExtraCard } from '@/components/booking/ExtraCard';
import { DateStrip } from '@/components/booking/DateStrip';
import { SeasonNotice } from '@/components/booking/SeasonNotice';
import { useSeasons } from '@/features/booking/useSeasons';
import { SlotGrid } from '@/components/booking/SlotGrid';
import { WaitlistPrompt } from '@/features/extras/WaitlistPrompt';
import { useFeatureFlags, usePrepayRequired } from '@/features/extras/useExtras';
import { AddToCalendar } from '@/components/booking/AddToCalendar';
import { HoldTimer } from '@/components/booking/HoldTimer';
import { PaymentPanel } from '@/components/booking/PaymentPanel';
import { LeatherPattern } from '@/components/brand/Pattern';
import { useServices, useSettings, useWorkingHours } from '@/features/home/useHomeData';
import { useAuth, useProfile, isProfileComplete } from '@/features/profile/useAuth';
import { useSignIn } from '@/features/profile/useAuth';

import { getDateRange, formatCairoDate, formatCairoTime, formatDateKey, isExpired } from '@/lib/time';
import { formatEGP } from '@/lib/money';
import { CouponBox, type AppliedCoupon } from '@/components/booking/CouponBox';
import { StaffAvatar, StaffDetailsSheet, staffBio, expLabel, socialLinks } from '@/components/staff/StaffParts';
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
  const seasons = useSeasons();
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
  const [notes, setNotes] = useState('');
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [staffInfo, setStaffInfo] = useState<StaffMember | null>(null);
  const [payAtShopChosen, setPayAtShopChosen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      params.get('pay_at_shop') === '1' ||
      sessionStorage.getItem('tito_last_pay_mode') === 'pay_at_shop'
    );
  });

  const staffQuery = useActiveStaff();
  const activeStaff = staffQuery.data ?? [];
  const staffServices = useStaffServices().data ?? [];
  const extraIdsEarly = (params.get('extras') ?? '').split(',').filter(Boolean);
  const offers = (staffMemberId: string, ids: string[]) =>
    !staffServices.some((r) => r.staff_id === staffMemberId && r.is_offered === false && ids.includes(r.service_id));
  const wantedIds = serviceId ? [serviceId, ...extraIdsEarly] : extraIdsEarly;
  // الحلاقين اللي بيقدموا الخدمة (والإضافات) اللي العميل اختارها
  const eligibleStaff = activeStaff.filter((m) => offers(m.id, wantedIds));
  const noneOffers = activeStaff.length > 0 && eligibleStaff.length === 0;
  const staffNeeded = eligibleStaff.length >= 2;
  const staffParam = params.get('staff');
  const anyStaff = staffNeeded && staffParam === 'any';
  // لو فيه حلاق واحد بيقدم الخدمة بنحجز عليه تلقائي (علشان جدوله واستراحاته تتطبّق)، ولو أكتر العميل بيختار
  const staffId = staffNeeded
    ? eligibleStaff.some((m) => m.id === staffParam) ? staffParam : null
    : eligibleStaff.length === 1 ? (eligibleStaff[0]?.id ?? null) : null;
  const staffSel = staffId ?? (anyStaff ? 'any' : null);
  const chosenStaff = activeStaff.find((m) => m.id === staffId) ?? null;
  const featureFlags = useFeatureFlags();
  const prepayRequired = usePrepayRequired().data === true;
  // (slots بتتحسب تحت بعد تعريف الخدمة والإضافات)
  const booking = useBooking(bookingId);

  const catalog = services.data ?? [];
  const mainServices = catalog.filter((service) => !service.is_extra);
  const extraServices = catalog.filter((service) => service.is_extra);
  const extraIds = (params.get('extras') ?? '').split(',').filter(Boolean);
  const selectedExtras = extraServices.filter((service) => extraIds.includes(service.id));
  const priceOf = (service: { id: string; price_egp: number | string }, forStaff: string | null) => {
    const o = forStaff
      ? staffServices.find((r) => r.staff_id === forStaff && r.service_id === service.id && r.price_egp != null)
      : undefined;
    return Number(o?.price_egp ?? service.price_egp);
  };
  const extrasTotal = selectedExtras.reduce((sum, service) => sum + priceOf(service, staffId), 0);

  const selectedService =
    mainServices.find((s) => s.id === serviceId) ??
    (booking.data?.service && !booking.data.service.is_extra ? booking.data.service : null) ??
    null;
  const extraMinutes = selectedExtras.reduce((sum, e) => sum + Number((e as { duration_minutes?: number | string | null }).duration_minutes ?? 0), 0);
  const durationMin = extraMinutes > 0 && selectedService ? Number(selectedService.duration_minutes) + extraMinutes : null;
  const slots = useAvailableSlots(serviceId, date, staffSel, !noneOffers && (!staffNeeded || !!staffSel), durationMin);
  const orderSubtotal = (selectedService ? priceOf(selectedService, staffId) : 0) + extrasTotal;
  // لو "أي حلاق" وفيه حلاق ليه سعر مختلف، السعر النهائي بيتحدد حسب الحلاق
  const priceMayVary =
    anyStaff &&
    eligibleStaff.some((m) => staffServices.some((r) => r.staff_id === m.id && r.price_egp != null && wantedIds.includes(r.service_id)));
  const orderTotal = Math.max(0, orderSubtotal - (coupon?.discount ?? 0));
  // لو السعر اتغيّر (إضافات اتزادت/اتشالت) الخصم لازم يتحسب تاني
  useEffect(() => {
    setCoupon(null);
  }, [orderSubtotal]);
  const maxDays = settings.data?.max_days_ahead ?? 14;
  const dates = useMemo(() => getDateRange(maxDays), [maxDays]);

  const closedDays = useMemo(() => {
    const closed = new Set<number>();
    workingHours.data?.forEach((wh) => {
      if (wh.is_closed) closed.add(wh.day_of_week);
    });
    return closed;
  }, [workingHours.data]);

  // الأيام اللي مواعيدها خلصت: بنسأل عن كل يوم مرة واحدة ونخفيه عن العميل
  const dayAvailability = useQueries({
    queries: dates.map((d) => {
      const key = formatDateKey(d);
      return {
        queryKey: ['day-availability', serviceId, key, staffSel, durationMin],
        queryFn: async (): Promise<number> => {
          if (staffSel) {
            const rpcStaff = supabase.rpc.bind(supabase) as unknown as (
              fn: string,
              args: Record<string, unknown>,
            ) => Promise<{ data: unknown; error: { message: string } | null }>;
            const r = await rpcStaff(
              staffSel === 'any' ? 'get_available_slots_any' : 'get_available_slots_staff',
              staffSel === 'any'
                ? { p_service_id: serviceId as string, p_date: key, ...(durationMin ? { p_duration_min: durationMin } : {}) }
                : { p_service_id: serviceId as string, p_date: key, p_staff_id: staffSel, ...(durationMin ? { p_duration_min: durationMin } : {}) },
            );
            if (r.error) throw r.error;
            return ((r.data ?? []) as unknown[]).length;
          }
          const rpcPlain = supabase.rpc.bind(supabase) as unknown as (
            fn: string,
            args: Record<string, unknown>,
          ) => Promise<{ data: unknown; error: { message: string } | null }>;
          const { data, error } = await rpcPlain('get_available_slots', {
            p_service_id: serviceId as string,
            p_date: key,
            ...(durationMin ? { p_duration_min: durationMin } : {}),
          });
          if (error) throw error;
          return ((data ?? []) as unknown[]).length;
        },
        enabled: step === 'datetime' && !!serviceId && !noneOffers && (!staffNeeded || !!staffSel) && !closedDays.has(d.getDay()),
        staleTime: 60_000,
        retry: 0,
      };
    }),
  });
  const fullyBookedDays = useMemo(() => {
    const full = new Set<string>();
    dates.forEach((d, i) => {
      const q = dayAvailability[i];
      if (q?.isSuccess && q.data === 0) full.add(formatDateKey(d));
    });
    return full;
  }, [dates, dayAvailability]);

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

  const toggleExtra = (id: string) => {
    const next = extraIds.includes(id) ? extraIds.filter((item) => item !== id) : [...extraIds, id];
    updateParams({ extras: next.length ? next.join(',') : null });
  };

  const extrasVisible = extraServices.filter((e) => !staffId || offers(staffId, [e.id]));
  const extrasPicker = extrasVisible.length > 0 ? (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-espresso">{t('booking.extras')}</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {extrasVisible.map((extra) => (
          <ExtraCard
            key={extra.id}
            extra={extra}
            selected={extraIds.includes(extra.id)}
            onToggle={() => toggleExtra(extra.id)}
          />
        ))}
      </div>
    </div>
  ) : null;

  useEffect(() => {
    if (booking.data?.hold_expires_at && isExpired(booking.data.hold_expires_at)) {
      setHoldExpired(true);
    }
  }, [booking.data?.hold_expires_at]);

  const cancelHold = useCancelBooking();
  const releaseUnpaidHolds = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('bookings')
        .select('id, pay_at_shop, payment:payments(status)')
        .eq('user_id', user.id)
        .eq('status', 'pending_payment');
      const rows = (data ?? []) as unknown as Array<{ id: string; pay_at_shop: boolean | null; payment: { status?: string | null } | Array<{ status?: string | null }> | null }>;
      for (const r of rows) {
        const pays = Array.isArray(r.payment) ? r.payment : r.payment ? [r.payment] : [];
        const sent = pays.some((p) => p.status === 'submitted' || p.status === 'rejected' || p.status === 'confirmed');
        if (!r.pay_at_shop && !sent) {
          await supabase.rpc('customer_cancel_booking', { p_booking_id: r.id });
        }
      }
    } catch {
      /* مش مشكلة لو معرفناش نلغي، الحجز بينتهي لوحده */
    }
  };

  // الزبون في صفحة الدفع وعايز يرجع/يغيّر طريقة الدفع: بنفك حجز المعاد الأول
  const backFromPayment = async (thenPayAtShop: boolean) => {
    if (!booking.data) return;
    try {
      await cancelHold.mutateAsync(booking.data.id);
    } catch {
      return;
    }
    if (thenPayAtShop) {
      await handleConfirmBooking(true);
    } else {
      updateParams({ step: 'review', booking: null, pay_at_shop: null });
    }
  };

  const handleConfirmBooking = async (payAtShop = false) => {
    setPayAtShopChosen(payAtShop);
    try {
      sessionStorage.setItem('tito_last_pay_mode', payAtShop ? 'pay_at_shop' : 'online');
    } catch {
      /* ignore */
    }
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

    // أي حجز قديم متعلّق مستني دفع (والزبون مدفعش) بنلغيه الأول عشان مايفضلش حاجز المعاد
    await releaseUnpaidHolds();

    try {
      const id = await createBooking.mutateAsync({
        serviceId,
        startAt: slot,
        payAtShop,
        extraIds,
        notes: notes.trim() || null,
        coupon: coupon?.code ?? null,
        staffId: staffSel,
      });
      try {
        sessionStorage.removeItem('tito_pending_book');
        sessionStorage.setItem('tito_last_pay_mode', payAtShop ? 'pay_at_shop' : 'online');
        if (id) {
          sessionStorage.setItem(`tito_pay_mode_${id}`, payAtShop ? 'pay_at_shop' : 'online');
        }
      } catch {
        /* ignore */
      }
      setPendingAction(null);
      if (payAtShop) {
        updateParams({ step: 'success', booking: id, service: null, date: null, slot: null, pay_at_shop: '1' });
      } else {
        updateParams({ step: 'payment', booking: id, pay_at_shop: null });
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
    setPayAtShopChosen(false);

    try {
      sessionStorage.setItem('tito_last_pay_mode', 'online');
      sessionStorage.setItem(`tito_pay_mode_${bookingId}`, 'online');
    } catch {
      /* ignore */
    }

    // تسجيل الدفع للأدمن (الإيصال بيتبعت على واتساب، من غير رفع صورة)
    try {
      await submitPayment.mutateAsync({
        bookingId,
        method: data.method,
      });
    } catch {
      // رسالة الخطأ بتظهر من useSubmitPayment، والعميل يفضل في خطوة الدفع
      return;
    }

    updateParams({ step: 'success', pay_at_shop: null });
  };

  const canProceed = () => {
    if (step === 'service') return !!serviceId;
    if (step === 'datetime') return !!date && !!slot;
    return true;
  };

  const isPayAtShop =
    payAtShopChosen ||
    params.get('pay_at_shop') === '1' ||
    booking.data?.pay_at_shop === true ||
    (bookingId && typeof window !== 'undefined'
      ? sessionStorage.getItem(`tito_pay_mode_${bookingId}`) === 'pay_at_shop'
      : false) ||
    (step === 'success' && typeof window !== 'undefined' && sessionStorage.getItem('tito_last_pay_mode') === 'pay_at_shop');

  const whatsappUrl = (() => {
    if (!settings.data?.shop_whatsapp) return null;
    if (step === 'success' && booking.data && selectedService) {
      const serviceName =
        i18n.language === 'ar' ? selectedService.name_ar : selectedService.name_en;
      const shopName = settings.data?.shop_name || 'tito';
      const dateStr = formatCairoDate(booking.data.start_at, i18n.language);
      const timeStr = formatCairoTime(booking.data.start_at, i18n.language);
      const priceStr = formatEGP(booking.data.price_egp);
      const bookingsLink =
        typeof window !== 'undefined'
          ? `${window.location.origin}/bookings`
          : 'https://titobarber.com/bookings';

      if (isPayAtShop) {
        const msg =
          i18n.language === 'ar'
            ? `مرحباً ${shopName} 👋\nأنا حجزت موعد مع الدفع في المحل 💈\nالخدمة: ${serviceName}\nالموعد: يوم ${dateStr} الساعة ${timeStr}\nالمبلغ: ${priceStr} جنيه (كاش أو إنستاباي في المحل)\nرابط الحجز: ${bookingsLink}`
            : `Hi ${shopName} 👋\nI booked an appointment (Pay at shop) 💈\nService: ${serviceName}\nAppointment: ${dateStr} at ${timeStr}\nTotal: ${priceStr} EGP (to pay at the shop)\nBooking link: ${bookingsLink}`;
        return buildWhatsAppUrl(settings.data.shop_whatsapp, msg);
      }

      const msg =
        i18n.language === 'ar'
          ? `مرحباً ${shopName} 👋\nحجزت ${serviceName}\n${dateStr}\n${timeStr}\n${priceStr}`
          : `Hi ${shopName} 👋\nI booked ${serviceName}\n${dateStr}\n${timeStr}\n${priceStr}`;
      return buildWhatsAppUrl(settings.data.shop_whatsapp, msg);
    }
    return buildWhatsAppUrl(settings.data.shop_whatsapp);
  })();

  return (
    <PageShell withActionBar={step !== 'success' && step !== 'payment'}>
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

      {/* Step 1: Service + extras side by side */}
      {step === 'service' ? (
        <section>
          <h1 className="text-2xl font-bold text-espresso">{t('booking.selectService')}</h1>
          <Link
            to="/book/group"
            className="mt-2 inline-flex items-center gap-2 rounded-btn border border-gold/50 bg-gold/10 px-3 py-2 text-sm font-medium text-espresso hover:bg-gold/20"
          >
            {i18n.language === 'ar' ? 'عايز تحجز لأكتر من شخص؟ اضغط هنا' : 'Booking for more than one person? Tap here'}
          </Link>
          <div className="mt-4 space-y-6">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-ink">{t('booking.stepService')}</h2>
              <div className="grid gap-2.5 md:grid-cols-2">
                {mainServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    selected={serviceId === service.id}
                    onSelect={() => updateParams({ service: service.id })}
                  />
                ))}
              </div>
            </div>
            {extraServices.length > 0 ? (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-ink">{t('booking.extras')}</h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {extraServices.map((extra) => (
                    <ExtraCard
                      key={extra.id}
                      extra={extra}
                      selected={extraIds.includes(extra.id)}
                      onToggle={() => toggleExtra(extra.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="sticky bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-10 mt-6 rounded-card border border-gold/40 bg-cream/95 p-3 shadow-warm backdrop-blur sm:static sm:shadow-none">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink">{t('booking.price')}</span>
              <span className="font-latin text-lg font-bold text-espresso">
                {formatEGP(orderTotal || 0)}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {/* Step 2: Date & Time */}
      {step === 'datetime' ? (
        <section>
          <h1 className="text-2xl font-bold text-espresso">{t('booking.selectDate')}</h1>
          {noneOffers ? (
            <p className="mt-4 rounded-card border border-default bg-white p-4 text-sm text-ink">
              {i18n.language === 'ar' ? 'الخدمة دي مش متاحة حالياً مع الإضافات اللي اخترتها. جرّب تغيّر الاختيار.' : 'This service is not available with the selected add-ons. Try changing your selection.'}
            </p>
          ) : null}
          {staffNeeded ? (
            <div className="mt-4">
              <h2 className="mb-2 text-lg font-semibold text-espresso">{i18n.language === 'ar' ? 'اختار الحلاق' : 'Choose your barber'}</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => updateParams({ staff: 'any', slot: null })}
                  aria-pressed={anyStaff}
                  className={`flex min-w-0 items-center gap-3 rounded-card border-2 p-3 text-start transition-colors sm:col-span-2 ${anyStaff ? 'border-gold bg-gold/10' : 'border-default bg-white'}`}
                >
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-espresso text-xl text-cream" aria-hidden>✂</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-espresso">{i18n.language === 'ar' ? 'أي حلاق متاح' : 'Any available barber'}</span>
                    <span className="block text-xs text-ink">{i18n.language === 'ar' ? 'مش فارق معايا، اختارلي أقرب ميعاد' : 'No preference — show all available times'}</span>
                  </span>
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${anyStaff ? 'border-gold bg-gold text-espresso' : 'border-default'}`} aria-hidden>
                    {anyStaff ? '✓' : ''}
                  </span>
                </button>
                {eligibleStaff.map((m) => {
                  const on = m.id === staffId;
                  const isAr = i18n.language === 'ar';
                  const bio = staffBio(m, isAr);
                  const exp = expLabel(m, isAr);
                  return (
                    <div
                      key={m.id}
                      className={`min-w-0 rounded-card border-2 p-3 transition-colors ${on ? 'border-gold bg-gold/10' : 'border-default bg-white'}`}
                    >
                      <button
                        type="button"
                        onClick={() => updateParams({ staff: m.id, slot: null })}
                        aria-pressed={on}
                        className="flex w-full items-center gap-3 text-start"
                      >
                        <StaffAvatar member={m} className="size-14 text-xl" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-espresso">{m.name}</span>
                          {exp ? <span className="block text-xs text-ink">{exp}</span> : null}
                          {selectedService && priceOf(selectedService, m.id) !== Number(selectedService.price_egp) ? (
                            <span className="mt-0.5 block font-latin text-xs font-semibold text-gold-dark">{formatEGP(priceOf(selectedService, m.id))}</span>
                          ) : null}
                        </span>
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-gold bg-gold text-espresso' : 'border-default'}`}
                          aria-hidden
                        >
                          {on ? '✓' : ''}
                        </span>
                      </button>
                      {bio || socialLinks(m).length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setStaffInfo(m)}
                          className="mt-2 text-sm font-semibold text-gold-dark underline underline-offset-4"
                        >
                          {isAr ? 'اعرف عنه أكتر' : 'Learn more about him'}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {!staffSel ? (
                <p className="mt-3 text-sm text-ink">{i18n.language === 'ar' ? 'اختار الحلاق الأول عشان تشوف المواعيد المتاحة.' : 'Pick a barber first to see available times.'}</p>
              ) : null}
            </div>
          ) : null}
          <div className={`mt-4 ${(staffNeeded && !staffSel) || noneOffers ? 'hidden' : ''}`}>
            <DateStrip
              dates={dates}
              selectedDate={date}
              closedDays={closedDays}
              fullyBookedDays={fullyBookedDays}
              seasons={seasons.data}
              onSelect={(d) => updateParams({ date: d, slot: null })}
            />
            <SeasonNotice dates={dates} seasons={seasons.data} />
          </div>
          {date && !noneOffers && (!staffNeeded || staffSel) ? (
            <div className="mt-6">
              <h2 className="mb-3 text-lg font-semibold text-espresso">{t('booking.selectTime')}</h2>
              <SlotGrid
                slots={slots.data ?? []}
                selectedSlot={slot}
                onSelect={(s) => updateParams({ slot: s })}
                isLoading={slots.isLoading}
                isError={slots.isError}
                errorDetail={slots.error ? String((slots.error as { message?: string }).message ?? slots.error).slice(0, 220) : undefined}
                onRetry={() => slots.refetch()}
              />
              {featureFlags.data?.waitlist && user && !slots.isLoading && !slots.isError ? (
                <div className="mt-4">
                  <WaitlistPrompt day={date} serviceId={serviceId ?? null} defaultOpen={(slots.data ?? []).length === 0} />
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <StaffDetailsSheet
        member={staffInfo}
        onClose={() => setStaffInfo(null)}
        onPick={(m) => updateParams({ staff: m.id, slot: null })}
      />

      {/* Step 3: Review */}
      {step === 'review' && selectedService ? (
        <section>
          <h1 className="text-2xl font-bold text-espresso">{t('booking.reviewTitle')}</h1>
          <div className="mt-6 space-y-3 rounded-card border border-default p-4">
            {(
              [
                [t('booking.service'), i18n.language === 'ar' ? selectedService.name_ar : selectedService.name_en],
                [t('booking.date'), date && slot ? formatCairoDate(slot, i18n.language) : '—'],
                [t('booking.time'), slot ? formatCairoTime(slot, i18n.language) : '—'],
                ...(chosenStaff ? ([[i18n.language === 'ar' ? 'الحلاق' : 'Barber', chosenStaff.name]] as const) : anyStaff ? ([[i18n.language === 'ar' ? 'الحلاق' : 'Barber', i18n.language === 'ar' ? 'أي حلاق متاح (بيتحدد تلقائي)' : 'Any available (assigned automatically)']] as const) : []),
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <span className="text-sm text-ink">{label}</span>
                <span className="break-words font-medium sm:text-end">{value}</span>
              </div>
            ))}
            {selectedExtras.map((extra) => (
              <div key={extra.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <span className="text-sm text-ink">+ {i18n.language === 'ar' ? extra.name_ar : extra.name_en}</span>
                <span className="font-latin font-medium sm:text-end">{formatEGP(extra.price_egp)}</span>
              </div>
            ))}
            {coupon ? (
              <div className="flex items-center justify-between gap-3 text-sm text-success">
                <span>{i18n.language === 'ar' ? 'الخصم' : 'Discount'}</span>
                <span className="font-latin">− {formatEGP(coupon.discount)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-t border-default pt-4">
              <span className="text-ink">{t('booking.price')}</span>
              <span className="text-lg font-bold text-espresso font-latin">{formatEGP(orderTotal)}</span>
            </div>
            {priceMayVary ? (
              <p className="text-xs text-ink">{i18n.language === 'ar' ? 'السعر النهائي بيتحدد حسب الحلاق اللي هيتعيّن لك.' : 'The final price depends on the barber assigned to you.'}</p>
            ) : null}
          </div>
          {extrasPicker}
          <CouponBox price={orderSubtotal} applied={coupon} onApply={setCoupon} onClear={() => setCoupon(null)} />
          <div className="mt-4">
            <label className="mb-1 block text-sm text-ink" htmlFor="booking-notes">
              {t('booking.notes')}
            </label>
            <textarea
              id="booking-notes"
              className="min-h-20 w-full rounded-btn border border-default bg-white px-3 py-2 text-sm"
              placeholder={t('booking.notesPlaceholder')}
              maxLength={300}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {!user && !authLoading ? (
            <div className="mt-6 rounded-card border-2 border-gold/70 bg-white p-5 text-center shadow-warm sm:p-6">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-sand/60 shadow-2xs">
                <GoogleIcon className="size-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-espresso">{t('booking.loginRequired')}</h3>
              <p className="mt-1 text-sm text-ink">{t('profile.completeProfileDesc')}</p>
              <InAppBrowserNotice className="mt-4 text-start" />
              <div className="mt-5 flex justify-center">
                <GoogleSignInButton
                  variant="gold"
                  label={t('booking.signInGoogle')}
                  onClick={() => signIn()}
                  loading={authLoading}
                  className="max-w-md"
                />
              </div>
            </div>
          ) : user && !isProfileComplete(profile.data) ? (
            <div className="mt-6 rounded-card border-2 border-warning/60 bg-warning/10 p-5 text-center shadow-warm">
              <p className="text-base font-semibold text-espresso">{t('profile.completeProfile')}</p>
              <p className="mt-1 text-sm text-ink">{t('profile.completeProfileDesc')}</p>
              <Button size="lg" className="mt-4 w-full sm:w-auto" onClick={() => setShowProfileModal(true)}>
                {t('profile.completeProfile')}
              </Button>
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
              <div className="flex flex-col gap-2 rounded-card border border-default bg-sand/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-70">
                  {i18n.language?.startsWith('ar') ? 'مش عايز تدفع أونلاين؟' : 'Prefer not to pay online?'}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {settings.data.allow_pay_at_shop && !prepayRequired ? (
                    <Button size="sm" variant="secondary" loading={cancelHold.isPending} onClick={() => void backFromPayment(true)}>
                      {i18n.language?.startsWith('ar') ? 'ادفع في المحل بدل كده' : 'Pay at the shop instead'}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" loading={cancelHold.isPending} onClick={() => void backFromPayment(false)}>
                    {i18n.language?.startsWith('ar') ? 'رجوع للتعديل' : 'Go back'}
                  </Button>
                </div>
              </div>
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
        <section className="relative overflow-hidden rounded-card bg-espresso px-4 py-8 text-center text-cream sm:p-8">
          <LeatherPattern />
          <div className="relative">
            <h1 className="text-2xl font-bold">
              {isPayAtShop
                ? t('booking.payAtShopSuccessTitle')
                : t('booking.successTitle')}
            </h1>
            <p className="mt-2 text-base font-medium text-cream/90">
              {isPayAtShop
                ? t('booking.payAtShopSuccessDesc')
                : t('booking.successDesc')}
            </p>
            <p className="mt-3 text-sm text-gold-soft">
              {isPayAtShop
                ? t('booking.payAtShopSuccessHint', {
                    date: booking.data?.start_at ? formatCairoDate(booking.data.start_at, i18n.language) : '',
                    time: booking.data?.start_at ? formatCairoTime(booking.data.start_at, i18n.language) : '',
                  })
                : t('booking.reminderHint')}
            </p>
            {booking.data && selectedService ? (
              <div className="mt-6 space-y-2 text-sm font-latin">
                <p>{i18n.language === 'ar' ? selectedService.name_ar : selectedService.name_en}</p>
                {selectedExtras.map((extra) => (
                  <p key={extra.id}>+ {i18n.language === 'ar' ? extra.name_ar : extra.name_en}</p>
                ))}
                <p>{formatCairoDate(booking.data.start_at, i18n.language)}</p>
                <p>{formatCairoTime(booking.data.start_at, i18n.language)}</p>
                {(booking.data as unknown as { staff_id?: string | null }).staff_id && activeStaff.length > 1 ? (
                  <p>{(i18n.language === 'ar' ? 'الحلاق: ' : 'Barber: ') + (activeStaff.find((m) => m.id === (booking.data as unknown as { staff_id?: string }).staff_id)?.name ?? '')}</p>
                ) : null}
                <p className="text-gold-soft">{formatEGP(booking.data.price_egp)}</p>
              </div>
            ) : null}
            <div className="mt-8 flex flex-col gap-3">
              {booking.data && selectedService ? (
                <div className="rounded-btn bg-white/10 p-3 text-start">
                  <AddToCalendar
                    id={booking.data.id}
                    startAt={booking.data.start_at}
                    endAt={booking.data.end_at}
                    serviceName={i18n.language === 'ar' ? selectedService.name_ar : selectedService.name_en}
                    tone="gold"
                  />
                </div>
              ) : null}
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
          <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-stretch">
            {stepIndex > 0 ? (
              <Button
                variant="secondary"
                onClick={() => goToStep(STEPS[stepIndex - 1])}
                className="w-full min-[420px]:w-auto min-[420px]:flex-1"
              >
                {i18n.language === 'ar' ? (
                  <ChevronRight className="size-4" aria-hidden />
                ) : (
                  <ChevronLeft className="size-4" aria-hidden />
                )}
                {t('common.back')}
              </Button>
            ) : null}
            {step === 'review' ? (
              <div className="flex w-full min-w-0 flex-col gap-2 min-[420px]:flex-1">
                {!user ? (
                  <GoogleSignInButton
                    variant="gold"
                    label={t('booking.signInGoogle')}
                    onClick={() => signIn()}
                    loading={authLoading}
                  />
                ) : !isProfileComplete(profile.data) ? (
                  <Button
                    fullWidth
                    size="lg"
                    onClick={() => setShowProfileModal(true)}
                  >
                    {t('profile.completeProfile')}
                  </Button>
                ) : (
                  <>
                    <Button
                      fullWidth
                      onClick={() => handleConfirmBooking(false)}
                      loading={createBooking.isPending}
                    >
                      {t('booking.payNow')}
                    </Button>
                    {prepayRequired ? (
                      <p className="rounded-btn bg-warning/10 p-2.5 text-center text-xs text-espresso">
                        {i18n.language === 'ar' ? 'بسبب غياب سابق، الحجز ده محتاج دفع مقدّم أونلاين.' : 'Because of a previous no-show, this booking needs online prepayment.'}
                      </p>
                    ) : null}
                    {settings.data?.allow_pay_at_shop && !prepayRequired ? (
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={() => handleConfirmBooking(true)}
                        loading={createBooking.isPending}
                      >
                        {t('booking.payAtShop')}
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            ) : (
              <Button
                className="w-full min-[420px]:flex-1"
                disabled={!canProceed()}
                onClick={() => goToStep(STEPS[stepIndex + 1])}
              >
                {t('common.next')}
                {i18n.language === 'ar' ? (
                  <ChevronLeft className="size-4" aria-hidden />
                ) : (
                  <ChevronRight className="size-4" aria-hidden />
                )}
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
