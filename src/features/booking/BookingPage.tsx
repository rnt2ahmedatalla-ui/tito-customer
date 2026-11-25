import { useCallback, useEffect, useMemo, useState } from 'react';
import { GroomRequest } from './GroomRequest';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { BellRing, Check, ChevronLeft, ChevronRight, Crown, Plus, Scissors, Sparkles, Star, type LucideIcon } from 'lucide-react';
import { ServiceIcon } from '@/features/home/Showcase';
import { PageShell } from '@/components/layout/PageShell';
import { StickyBottomBar } from '@/components/layout/StickyBottomBar';
import { useCancelBooking } from '../bookings/useBookings';
import { useAvailableSlots, useCreateBooking, useSubmitPayment, useBooking, useActiveStaff, useStaffServices, type StaffMember } from './useBooking';
import { ProfileModal } from '@/components/layout/ProfileModal';
import { InAppBrowserNotice } from '@/components/auth/InAppBrowserNotice';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button } from '@/components/ui/Button';
import { ExtraCard } from '@/components/booking/ExtraCard';
import { DateStrip } from '@/components/booking/DateStrip';
import { SeasonNotice } from '@/components/booking/SeasonNotice';
import { useSeasons } from '@/features/booking/useSeasons';
import { SlotGrid } from '@/components/booking/SlotGrid';
import { WaitlistPrompt } from '@/features/extras/WaitlistPrompt';
import { PolicyNote } from './PolicyNote';
import { SpecialRequestPrompt } from '@/features/extras/SpecialRequest';
import { useFeatureFlags, usePrepayRequired } from '@/features/extras/useExtras';
import { AddToCalendar } from '@/components/booking/AddToCalendar';
import { AddProductCta, ProductsPicker, parseProductsParam, stringifyProducts, useChosenProducts } from '@/features/products/HomeProducts';
import { useStoreActions } from '@/features/products/useStore';
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
import { appUrl, buildWhatsAppUrl } from '@/lib/urls';
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

/** «مش لاقي معاد مناسب؟» كارت واحد فيه اختيارين واضحين بدل كارتين مختلفين */
function NoTimeHelp({ day, serviceId, waitlist, full, authed, onSignIn }: { day: string; serviceId: string | null; waitlist: boolean; full?: boolean; authed: boolean; onSignIn: () => void }) {
  const { i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);
  const [pick, setPick] = useState<'wait' | 'special' | null>(null);
  useEffect(() => setPick(null), [day]);
  if (pick && !authed) {
    return (
      <div className="mt-5 animate-pop rounded-card border border-gold/50 bg-white p-4 text-center">
        <p className="text-sm font-semibold text-espresso">{L('سجّل دخولك الأول عشان نقدر نبلّغك', 'Sign in first so we can notify you')}</p>
        <div className="mt-3 flex justify-center"><GoogleSignInButton variant="gold" label={L('الدخول بجوجل', 'Sign in with Google')} onClick={onSignIn} className="max-w-md" /></div>
        <button type="button" onClick={() => setPick(null)} className="mt-2 text-xs font-medium text-ink underline-offset-4 hover:underline">{L('رجوع', 'Back')}</button>
      </div>
    );
  }
  if (pick === 'wait') return <div className="mt-5 animate-pop"><WaitlistPrompt day={day} serviceId={serviceId} defaultOpen /><button type="button" onClick={() => setPick(null)} className="mt-2 text-xs font-medium text-ink underline-offset-4 hover:underline">{L('رجوع', 'Back')}</button></div>;
  if (pick === 'special') return <div className="mt-5 animate-pop"><SpecialRequestPrompt day={day} serviceId={serviceId} defaultOpen onClose={() => setPick(null)} /></div>;
  const tile = 'flex min-h-[5.5rem] flex-col items-start gap-1 rounded-card border border-default bg-white p-3 text-start transition-[color,background-color,border-color,box-shadow,transform,opacity] hover:border-gold active:scale-[0.98]';
  return (
    <div className="mt-6 animate-rise">
      <p className="mb-2 text-sm font-semibold text-espresso">{L('مش لاقي معاد مناسب؟', "Can't find a good time?")}</p>
      <div className={cn('grid gap-2', waitlist && full ? 'grid-cols-2' : 'grid-cols-1')}>
        {waitlist && full ? (
          <button type="button" onClick={() => setPick('wait')} className={tile}>
            <span className="flex size-8 items-center justify-center rounded-full bg-gold/15 text-gold"><BellRing className="size-4" /></span>
            <span className="text-sm font-semibold text-espresso">{L('قايمة الانتظار', 'Waiting list')}</span>
            <span className="text-xs leading-snug text-ink">{L('نبلّغك أول ما يفضى معاد', 'We notify you when a slot frees up')}</span>
          </button>
        ) : null}
        <button type="button" onClick={() => setPick('special')} className={tile}>
          <span className="flex size-8 items-center justify-center rounded-full bg-gold/15 text-gold"><Star className="size-4" /></span>
          <span className="text-sm font-semibold text-espresso">{L('معاد خاص', 'Special time')}</span>
          <span className="text-xs leading-snug text-ink">{L('اطلب وقت برّه مواعيد الشغل', 'Ask for a time outside opening hours')}</span>
        </button>
      </div>
    </div>
  );
}

/** قسم في صفحة الحجز بنفس شكل أقسام الرئيسية */
/** «ساعة / ساعتين / ٣ ساعات / ساعة ونص» بدل «2 ساعة» */
function arHours(mins: number, ar: boolean) {
  if (!ar) return mins >= 60 ? `${+(mins / 60).toFixed(1)} h` : `${mins} min`;
  if (mins < 60) return `${mins} دقيقة`;
  const h = Math.floor(mins / 60), half = mins % 60 >= 30;
  const base = h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h <= 10 ? `${h} ساعات` : `${h} ساعة`;
  return half ? `${base} ونص` : base;
}

function BookBlock({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="animate-rise rounded-card border border-default bg-white/60 p-3 shadow-warm sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-gold/15 text-gold"><Icon className="size-4" /></span>
        <h2 className="font-semibold text-espresso">{title}</h2>
        {hint ? <span className="ms-auto text-[11px] text-ink">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

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
  type SpecialFields = { is_special?: boolean; special_group?: string | null; location?: string | null; prep_service_id?: string | null; max_days_ahead?: number | null; description_ar?: string | null; description_en?: string | null };
  const sp = (x: unknown) => x as SpecialFields;
  const mainServices = catalog.filter((service) => !service.is_extra);
  const regularServices = mainServices.filter((service) => !sp(service).is_special);
  const specialGroups = Array.from(new Set(mainServices.filter((x) => sp(x).is_special).map((x) => sp(x).special_group || 'باقات خاصة')));
  const extraServices = catalog.filter((service) => service.is_extra);
  const [svcTabRaw, setSvcTab] = useState<string | null>(null);
  const chosen = mainServices.find((x) => x.id === params.get('service'));
  const svcTab = svcTabRaw ?? (chosen && sp(chosen).is_special ? sp(chosen).special_group || 'باقات خاصة' : 'regular');
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
  const needsAddress = !!selectedService && ['home', 'hall'].includes(String(sp(selectedService).location ?? 'shop'));
  const prepService = selectedService && sp(selectedService).prep_service_id ? mainServices.find((x) => x.id === sp(selectedService).prep_service_id) ?? null : null;
  const renderServiceCard = (service: (typeof mainServices)[number], i: number) => {
                  const on = serviceId === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => updateParams({ service: service.id })}
                      style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                      className={cn(
                        'animate-rise relative flex min-h-[7.5rem] flex-col items-center justify-center gap-1.5 rounded-card border p-2.5 text-center transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 ease-brand active:scale-[0.97]',
                        on ? 'border-gold bg-gold/10 shadow-warm ring-1 ring-gold' : 'border-default bg-white hover:border-gold/50',
                      )}
                    >
                      {on ? <span className="absolute end-2 top-2 flex size-5 animate-pop items-center justify-center rounded-full bg-gold text-espresso"><Check className="size-3" strokeWidth={3} /></span> : null}
                      <span className={cn('flex size-10 items-center justify-center rounded-xl transition-colors duration-300', on ? 'bg-gold text-espresso' : 'bg-espresso text-gold')}>
                        <ServiceIcon name={`${service.name_ar} ${service.name_en ?? ''}`} icon={(service as { icon?: string | null }).icon} className="size-5" />
                      </span>
                      <span className="line-clamp-2 text-[13px] font-semibold leading-tight text-espresso">{i18n.language === 'ar' ? service.name_ar : service.name_en || service.name_ar}</span>
                      {sp(service).location && sp(service).location !== 'shop' ? (
                        <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-bark">{sp(service).location === 'home' ? (i18n.language === 'ar' ? '🏠 في البيت' : '🏠 At home') : (i18n.language === 'ar' ? '🏛️ في القاعة' : '🏛️ At the venue')}</span>
                      ) : null}
                      <span className="flex items-center gap-1.5 font-latin text-[11px] text-ink">
                        <span className="font-bold text-bark">{formatEGP(priceOf(service, staffId))}</span>·<span>{service.duration_minutes}{i18n.language === 'ar' ? 'د' : 'm'}</span>
                      </span>
                    </button>
                  );
                };
  const extraMinutes = selectedExtras.reduce((sum, e) => sum + Number((e as { duration_minutes?: number | string | null }).duration_minutes ?? 0), 0);
  const durationMin = extraMinutes > 0 && selectedService ? Number(selectedService.duration_minutes) + extraMinutes : null;
  const slots = useAvailableSlots(serviceId, date, staffSel, !noneOffers && (!staffNeeded || !!staffSel), durationMin);
  const orderSubtotal = (selectedService ? priceOf(selectedService, staffId) : 0) + extrasTotal;
  // لو "أي حلاق" وفيه حلاق ليه سعر مختلف، السعر النهائي بيتحدد حسب الحلاق
  const priceMayVary =
    anyStaff &&
    eligibleStaff.some((m) => staffServices.some((r) => r.staff_id === m.id && r.price_egp != null && wantedIds.includes(r.service_id)));
  const orderTotal = Math.max(0, orderSubtotal - (coupon?.discount ?? 0));
  // المنتجات اللي هياخدها معاه (بتتحسب مع السعر وتتدفع في المحل)
  const chosenProducts = parseProductsParam(params.get('prods'));
  const prodPick = useChosenProducts(chosenProducts);
  const storeActions = useStoreActions();
  const grandTotal = orderTotal + prodPick.total;
  // لو السعر اتغيّر (إضافات اتزادت/اتشالت) الخصم لازم يتحسب تاني
  useEffect(() => {
    setCoupon(null);
  }, [orderSubtotal]);
  // الباقات الخاصة (زي العريس) ليها مدى حجز أطول من الخدمات العادية
  const maxDays = (selectedService && sp(selectedService).is_special && sp(selectedService).max_days_ahead) || settings.data?.max_days_ahead || 14;
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
            const rpcStaff = supabase.rpc.bind(supabase);
            const r = await rpcStaff(
              staffSel === 'any' ? 'get_available_slots_any' : 'get_available_slots_staff',
              staffSel === 'any'
                ? { p_service_id: serviceId as string, p_date: key, ...(durationMin ? { p_duration_min: durationMin } : {}) }
                : { p_service_id: serviceId as string, p_date: key, p_staff_id: staffSel, ...(durationMin ? { p_duration_min: durationMin } : {}) },
            );
            if (r.error) throw r.error;
            return ((r.data ?? []) as unknown[]).length;
          }
          const rpcPlain = supabase.rpc.bind(supabase);
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
      const rows = (data ?? []) as Array<{ id: string; pay_at_shop: boolean | null; payment: { status?: string | null } | Array<{ status?: string | null }> | null }>;
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
    // الخدمة في البيت أو القاعة: لازم العنوان
    if (needsAddress && notes.trim().length < 6) {
      toast.error(i18n.language === 'ar' ? 'اكتب العنوان بالتفصيل في الملاحظات (المنطقة والشارع وأي علامة)' : 'Please write the full address in the notes');
      document.getElementById('booking-notes')?.focus();
      return;
    }
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
      if (id && prodPick.lines.length) {
        for (const l of prodPick.lines) {
          try {
            await storeActions.order.mutateAsync({ productId: l.p.id, qty: l.qty, pay: 'cash', bookingId: id, note: '' });
          } catch {
            /* المنتج ممكن يكون خلص — الحجز نفسه اتأكد عادي */
          }
        }
      }
      if (payAtShop) {
        updateParams({ step: 'success', booking: id, service: null, date: null, slot: null, pay_at_shop: '1', prods: null });
      } else {
        updateParams({ step: 'payment', booking: id, pay_at_shop: null, prods: null });
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
      const bookingsLink = appUrl('bookings');

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
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h1 className="text-2xl font-bold text-espresso">{t('booking.selectService')}</h1>
            <Link to="/book/group" className="text-xs font-medium text-bark underline-offset-4 hover:underline">
              {i18n.language === 'ar' ? 'حجز لأكتر من شخص؟' : 'Booking for a group?'}
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {specialGroups.length ? (
              <div role="tablist" aria-label={i18n.language === 'ar' ? 'نوع الخدمة' : 'Service type'} className="grid grid-cols-2 gap-1 rounded-full border border-default bg-white p-1 shadow-sm">
                {[{ k: 'regular', label: i18n.language === 'ar' ? 'خدمات المحل' : 'Shop services', icon: Scissors }, ...specialGroups.map((g) => ({ k: g, label: g, icon: Crown }))].slice(0, 2).map((x) => {
                  const on = svcTab === x.k;
                  return (
                    <button key={x.k} type="button" role="tab" aria-selected={on} onClick={() => setSvcTab(x.k)}
                      className={cn('flex min-h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 ease-brand', on ? (x.k === 'regular' ? 'bg-espresso text-cream shadow' : 'keep-light-tokens bg-gradient-to-l from-[#1c0f08] via-[#3a2112] to-[#1c0f08] text-[#E6C878] shadow-[0_6px_20px_-6px_rgba(201,162,75,.6)]') : 'text-ink hover:text-espresso')}>
                      <x.icon className="size-4" />{x.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {svcTab === 'regular' || !specialGroups.length ? (
              <BookBlock icon={Scissors} title={t('booking.stepService')}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {regularServices.map(renderServiceCard)}
                </div>
              </BookBlock>
            ) : (
              specialGroups.filter((g) => g === svcTab).map((g) => (
                <section key={g} className="keep-light-tokens animate-rise relative overflow-hidden rounded-[1.4rem] border border-[#C9A24B]/50 bg-gradient-to-b from-[#1c0f08] via-[#2a160b] to-[#1c0f08] p-4 text-[#FAF6F0] shadow-[0_18px_50px_-20px_rgba(28,15,8,.8)]">
                  <span aria-hidden className="pointer-events-none absolute -top-24 start-1/2 size-64 -translate-x-1/2 rounded-full bg-[#C9A24B]/20 blur-3xl rtl:translate-x-1/2" />
                  <div className="relative mb-4 text-center">
                    <span className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full border border-[#C9A24B]/60 bg-[#C9A24B]/15"><Crown className="size-6 text-[#E6C878]" /></span>
                    <h2 className="text-xl font-bold text-[#E6C878]">{g}</h2>
                    <p className="mt-1 text-sm text-white/70">{i18n.language === 'ar' ? 'ليلة العمر تستاهل أحسن لوك — احجز بدري، المواعيد مفتوحة لحد شهر قدام' : 'Your big night deserves the best look — book early, open up to a month ahead'}</p>
                  </div>
                  <div className="relative space-y-2.5">
                    {mainServices.filter((x) => sp(x).is_special && (sp(x).special_group || 'باقات خاصة') === g).map((service, i) => {
                      const on = serviceId === service.id;
                      const loc = String(sp(service).location ?? 'shop');
                      const desc = i18n.language === 'ar' ? sp(service).description_ar : sp(service).description_en || sp(service).description_ar;
                      const mins = Number(service.duration_minutes);
                      const dur = arHours(mins, i18n.language === 'ar');
                      return (
                        <button key={service.id} type="button" aria-pressed={on} onClick={() => updateParams({ service: service.id })} style={{ animationDelay: `${i * 60}ms` }}
                          className={cn('animate-rise relative flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 ease-brand active:scale-[0.98]', on ? 'border-[#E6C878] bg-[#C9A24B]/20 shadow-[0_0_0_1px_rgba(230,200,120,.6),0_10px_30px_-12px_rgba(201,162,75,.7)]' : 'border-white/10 bg-white/[0.04] hover:border-[#C9A24B]/50 hover:bg-white/[0.07]')}>
                          <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors', on ? 'bg-[#E6C878] text-[#1c0f08]' : 'bg-[#C9A24B]/15 text-[#E6C878]')}>
                            <ServiceIcon name={`${service.name_ar} ${service.name_en ?? ''}`} icon={(service as { icon?: string | null }).icon} className="size-6" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold leading-snug text-white">{i18n.language === 'ar' ? service.name_ar : service.name_en || service.name_ar}</span>
                            {desc ? <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-white/65">{desc}</span> : null}
                            <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/80">⏱ {dur}</span>
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/80">{loc === 'home' ? (i18n.language === 'ar' ? '🏠 في البيت' : '🏠 At home') : loc === 'hall' ? (i18n.language === 'ar' ? '🏛️ في القاعة' : '🏛️ At the venue') : (i18n.language === 'ar' ? '💈 في المحل' : '💈 At the shop')}</span>
                            </span>
                          </span>
                          <span className="shrink-0 text-end">
                            <span className="block font-latin text-lg font-bold text-[#E6C878]">{formatEGP(priceOf(service, staffId))}</span>
                            {on ? <span className="ms-auto mt-1 flex size-6 animate-pop items-center justify-center rounded-full bg-[#E6C878] text-[#1c0f08]"><Check className="size-3.5" strokeWidth={3} /></span> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <GroomRequest
                    serviceId={selectedService && sp(selectedService).is_special ? selectedService.id : null}
                    serviceName={selectedService && sp(selectedService).is_special ? (i18n.language === 'ar' ? selectedService.name_ar : selectedService.name_en || selectedService.name_ar) : g}
                    whatsapp={settings.data?.shop_whatsapp}
                    onSignIn={() => void signIn()}
                  />
                  <p className="relative mt-3 text-center text-[11px] text-white/55">{i18n.language === 'ar' ? '💡 احجز «البروفة» قبل الفرح بأسبوع نتفق فيها على اللوك' : '💡 Book the rehearsal a week before the wedding to agree on the look'}</p>
                </section>
              ))
            )}
            {extraServices.length > 0 ? (
              <BookBlock icon={Sparkles} title={t('booking.extras')} hint={i18n.language === 'ar' ? 'اختياري — تقدر تختار أكتر من واحدة' : 'Optional — pick any'}>
                <div className="flex flex-wrap gap-1.5">
                  {extraServices.map((extra) => {
                    const on = extraIds.includes(extra.id);
                    return (
                      <button
                        key={extra.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleExtra(extra.id)}
                        className={cn(
                          'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 ease-brand active:scale-95',
                          on ? 'border-gold bg-gold font-semibold text-espresso shadow-warm' : 'border-default bg-white text-espresso hover:border-gold/60',
                        )}
                      >
                        {on ? <Check className="size-3.5" strokeWidth={3} /> : <Plus className="size-3.5 text-bark" />}
                        {i18n.language === 'ar' ? extra.name_ar : extra.name_en || extra.name_ar}
                        <span className={cn('font-latin text-xs', on ? 'text-espresso/80' : 'text-bark')}>+{priceOf(extra, staffId)}</span>
                      </button>
                    );
                  })}
                </div>
              </BookBlock>
            ) : null}
            <ProductsPicker value={chosenProducts} onChange={(m) => updateParams({ prods: stringifyProducts(m) })} />
          </div>
          <div className="sticky bottom-[calc(var(--nav-h,4.5rem)+4.25rem)] z-10 mt-6 rounded-card border border-gold/40 bg-cream p-3 shadow-warm sm:static sm:shadow-none">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink">
                {t('booking.price')}
                {prodPick.total ? <span className="ms-1 text-xs">{i18n.language === 'ar' ? `(منها منتجات ${formatEGP(prodPick.total)})` : `(incl. products ${formatEGP(prodPick.total)})`}</span> : null}
              </span>
              <span className="font-latin text-lg font-bold text-espresso">
                {formatEGP(grandTotal || 0)}
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
              waitlistEnabled={!!featureFlags.data?.waitlist}
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
              {!slots.isLoading && !slots.isError ? (
                <NoTimeHelp
                  day={date}
                  serviceId={serviceId ?? null}
                  waitlist={!!featureFlags.data?.waitlist}
                  full={fullyBookedDays.has(date) || (slots.data ?? []).length === 0}
                  authed={!!user}
                  onSignIn={() => void signIn()}
                />
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
                [t('booking.service'), i18n.language === 'ar' ? selectedService.name_ar : selectedService.name_en || selectedService.name_ar],
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
                <span className="text-sm text-ink">+ {i18n.language === 'ar' ? extra.name_ar : extra.name_en || extra.name_ar}</span>
                <span className="font-latin font-medium sm:text-end">{formatEGP(priceOf(extra, staffId))}</span>
              </div>
            ))}
            {prodPick.lines.map((l) => (
              <div key={l.p.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <span className="text-sm text-ink">+ {i18n.language === 'ar' ? l.p.name_ar : l.p.name_en || l.p.name_ar}{l.qty > 1 ? ` ×${l.qty}` : ''}</span>
                <span className="font-latin font-medium sm:text-end">{formatEGP(l.total)}</span>
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
              <span className="text-lg font-bold text-espresso font-latin">{formatEGP(grandTotal)}</span>
            </div>
            {priceMayVary ? (
              <p className="text-xs text-ink">{i18n.language === 'ar' ? 'السعر النهائي بيتحدد حسب الحلاق اللي هيتعيّن لك.' : 'The final price depends on the barber assigned to you.'}</p>
            ) : null}
          </div>
          {extrasPicker}
          <CouponBox price={orderSubtotal} applied={coupon} onApply={setCoupon} onClear={() => setCoupon(null)} />
          <div className="mt-4">
            {prepService ? (
              <Link to={`/book?service=${prepService.id}`} className="mb-3 flex items-center gap-2 rounded-card border border-gold/40 bg-gold/10 p-3 text-sm text-espresso">
                <Crown className="size-4 shrink-0 text-gold" />
                <span className="flex-1">{i18n.language === 'ar' ? `متنساش تحجز «${prepService.name_ar}» قبلها 👌` : `Don't forget to book “${prepService.name_en || prepService.name_ar}” before it 👌`}</span>
              </Link>
            ) : null}
            <label className="mb-1 block text-sm text-ink" htmlFor="booking-notes">
              {needsAddress ? (i18n.language === 'ar' ? 'العنوان بالتفصيل (مطلوب) 📍' : 'Full address (required) 📍') : t('booking.notes')}
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
          <PolicyNote />
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
                {booking.data.staff_id && activeStaff.length > 1 ? (
                  <p>{(i18n.language === 'ar' ? 'الحلاق: ' : 'Barber: ') + (activeStaff.find((m) => m.id === booking.data?.staff_id)?.name ?? '')}</p>
                ) : null}
                <p className="text-gold-soft">{formatEGP(booking.data.price_egp)}</p>
              </div>
            ) : null}
            <div className="mt-8 flex flex-col gap-3">
              {booking.data && selectedService ? (
                <div className="rounded-btn bg-white/10 p-3 text-start empty:hidden">
                  <AddToCalendar
                    id={booking.data.id}
                    startAt={booking.data.start_at}
                    endAt={booking.data.end_at}
                    serviceName={i18n.language === 'ar' ? selectedService.name_ar : selectedService.name_en}
                    tone="gold"
                  />
                </div>
              ) : null}
              {booking.data ? <AddProductCta bookingId={booking.data.id} dark /> : null}
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
          <div className={cn('flex gap-2', step === 'review' ? 'flex-col min-[420px]:flex-row min-[420px]:items-stretch' : 'flex-row items-stretch')}>
            {stepIndex > 0 ? (
              <Button
                variant="secondary"
                onClick={() => goToStep(STEPS[stepIndex - 1])}
                className={step === 'review' ? 'w-full min-[420px]:w-auto min-[420px]:flex-1' : 'w-auto shrink-0 px-4'}
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
                className="min-w-0 flex-1"
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
