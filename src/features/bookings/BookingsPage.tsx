import { RebookReminderPicker, VisitProgressCard } from '@/features/home/GrowthCards';
import { useEffect, useMemo, useState } from 'react';
import { Star as StarIcon } from 'lucide-react';
import { SpecialRequestsButton } from '@/features/extras/SpecialRequest';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { InAppBrowserNotice } from '@/components/auth/InAppBrowserNotice';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useBookings, useCancelBooking } from './useBookings';
import { useSettings } from '@/features/home/useHomeData';
import { useAuth, useSignIn } from '@/features/profile/useAuth';
import { useActiveStaff } from '@/features/booking/useBooking';
import { useLoyaltyLedger, useLoyaltySettings } from '@/features/loyalty/useLoyalty';
import { toast } from 'sonner';
import { formatCairoDate, formatCairoTime, isWithinCancelWindow } from '@/lib/time';
import { formatEGP } from '@/lib/money';
import { cn } from '@/lib/cn';
import { AttendanceAsk } from './AttendanceAsk';
import { BookingProductsLine } from '@/features/products/HomeProducts';
import { AddToCalendar } from '@/components/booking/AddToCalendar';
import { InactiveBanner, RatePrompt } from '@/features/extras/ExtrasCards';
import type { BookingWithDetails } from '@/types/database';


const bookingStaff = (b: BookingWithDetails): string | null =>
  b.staff_id ?? null;

function rescheduleMessage(code: string, isAr: boolean): string {
  if (code.includes('SLOT_TAKEN')) return isAr ? 'المعاد ده اتحجز قبل كده، اختار معاد تاني' : 'That time was just booked, pick another';
  if (code.includes('CANCEL_WINDOW_PASSED')) return isAr ? 'وقت تغيير المعاد خلص' : 'The change window has passed';
  if (code.includes('TOO_SOON')) return isAr ? 'المعاد ده قريب أوي، اختار وقت أبعد' : 'That time is too soon';
  if (code.includes('TOO_FAR')) return isAr ? 'المعاد ده بعيد أوي' : 'That time is too far';
  if (code.includes('BOOKING_CLOSED')) return isAr ? 'الحجز مقفول دلوقتي' : 'Booking is closed right now';
  return isAr ? 'حصلت مشكلة، حاول تاني' : 'Something went wrong, try again';
}

function RescheduleBox({
  booking,
  serviceId,
  staffId,
  onClose,
}: {
  booking: BookingWithDetails;
  serviceId: string;
  staffId: string | null;
  onClose: () => void;
}) {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isAr = i18n.language === 'ar';
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
  const [date, setDate] = useState(todayStr);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slotsQuery = useQuery({
    queryKey: ['reschedule-slots', serviceId, date, staffId, booking.duration_minutes],
    enabled: !!date && !!serviceId,
    queryFn: async () => {
      // لو الحجز على حلاق معين، المواعيد البديلة بتبقى بتاعته هو (جدوله واستراحاته)
      const rpcUntyped = supabase.rpc.bind(supabase);
      // لو الحجز فيه إضافات ليها وقت، المواعيد البديلة بتتحسب على مدته الكاملة
      const bookingMin = Number(booking.duration_minutes ?? 0);
      const svcMin = Number(booking.service?.duration_minutes ?? 0);
      const dur: Record<string, unknown> = bookingMin > svcMin && svcMin > 0 ? { p_duration_min: bookingMin } : {};
      const { data, error: rpcErr } = staffId
        ? await rpcUntyped('get_available_slots_staff', { p_service_id: serviceId, p_date: date, p_staff_id: staffId, ...dur })
        : await rpcUntyped('get_available_slots', { p_service_id: serviceId, p_date: date, ...dur });
      if (rpcErr) throw rpcErr;
      return ((data ?? []) as Array<{ start_at: string }>).map((s) => s.start_at);
    },
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (newStart: string) => {
      // الدالة مش موجودة في أنواع المشروع الحالية، فبنعدّي النوع يدوياً
      const rpcUntyped = supabase.rpc.bind(supabase);
      const { error: rpcErr } = await rpcUntyped('customer_reschedule_booking', {
        p_booking_id: booking.id,
        p_new_start_at: newStart,
      });
      if (rpcErr) throw rpcErr;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
      onClose();
    },
    onError: (e) => {
      const code = (e as { message?: string } | null)?.message ?? '';
      setError(rescheduleMessage(code, isAr));
    },
  });

  const slots = slotsQuery.data ?? [];

  return (
    <div className="mt-4 space-y-3 rounded-card border border-default bg-white p-3">
      <p className="text-sm font-semibold text-espresso">{isAr ? 'اختار معاد جديد' : 'Pick a new time'}</p>
      <input
        type="date"
        value={date}
        min={todayStr}
        onChange={(e) => {
          setDate(e.target.value);
          setChosen(null);
          setError(null);
        }}
        className="min-h-11 w-full rounded-btn border border-default bg-white px-3 text-sm font-latin"
      />

      {slotsQuery.isLoading ? (
        <Skeleton className="h-12" />
      ) : slots.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {slots.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setChosen(s);
                setError(null);
              }}
              className={cn(
                'rounded-btn border px-2.5 py-1 font-latin text-xs transition-colors',
                chosen === s ? 'border-gold bg-gold/20 font-semibold' : 'border-default bg-white',
              )}
            >
              {formatCairoTime(s, i18n.language)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-ink">{isAr ? 'مفيش مواعيد فاضية في اليوم ده' : 'No free times on this day'}</p>
      )}

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button size="sm" variant="secondary" className="w-full" onClick={onClose}>
          {isAr ? 'رجوع' : 'Back'}
        </Button>
        <Button
          size="sm"
          className="w-full"
          disabled={!chosen || saveMutation.isPending}
          loading={saveMutation.isPending}
          onClick={() => {
            if (chosen) saveMutation.mutate(chosen);
          }}
        >
          {isAr ? 'أكد المعاد الجديد' : 'Confirm new time'}
        </Button>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const signIn = useSignIn();
  const bookings = useBookings();
  const staffList = useActiveStaff().data ?? [];
  const loyalty = useLoyaltySettings().data;
  const ledger = useLoyaltyLedger().data ?? [];
  const queryClientMain = useQueryClient();
  const balance = ledger.reduce((sum, r) => sum + r.points, 0);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [introSeen, setIntroSeen] = useState(() => { try { return localStorage.getItem('tito_points_intro') === '1'; } catch { return true; } });
  const pointsText = !loyalty
    ? ''
    : i18n.language === 'ar'
      ? `بتكسب ${loyalty.points_per_100_egp} نقطة على كل 100 جنيه بعد ما الحجز يكتمل. كل نقطة بـ ${loyalty.egp_per_point} جنيه خصم (أقل استبدال ${loyalty.min_redeem_points} نقطة).`
      : `Earn ${loyalty.points_per_100_egp} points per 100 EGP once a booking completes. Each point is worth ${loyalty.egp_per_point} EGP (min ${loyalty.min_redeem_points} points).`;
  const redeemedIds = new Set(ledger.filter((r) => r.kind === 'redeem' && r.booking_id).map((r) => r.booking_id as string));
  const redeem = useMutation({
    mutationFn: async ({ id, points }: { id: string; points: number }) => {
      const rpcUntyped = supabase.rpc.bind(supabase);
      const { data, error: e } = await rpcUntyped('loyalty_redeem', { p_booking_id: id, p_points: points });
      if (e) throw e;
      return data as { points: number; discount: number };
    },
    onSuccess: (r) => {
      toast.success(i18n.language === 'ar' ? `اتخصم ${r.discount} جنيه من حجزك بـ ${r.points} نقطة` : `${r.discount} EGP off for ${r.points} points`);
      void queryClientMain.invalidateQueries();
    },
    onError: () => toast.error(i18n.language === 'ar' ? 'مقدرناش نستخدم النقاط، حاول تاني' : 'Could not use points, try again'),
  });
  const settings = useSettings();
  const cancelBooking = useCancelBooking();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  const cancelWindowHours = settings.data?.cancel_window_hours ?? 3;
  const now = new Date();

  const { upcoming, past } = useMemo(() => {
    // الحجز اللي مستني دفع والزبون مدفعش (أو ماتدفعش وانتهى) مبنعرضوش، يظهر بس لما الدفع يتبعت أو يتأكد
    const all = (bookings.data ?? []).filter((b) => {
      if (b.status === 'expired') return false;
      if (b.status === 'pending_payment' && !b.pay_at_shop && !(b.payment && ['submitted', 'rejected', 'confirmed'].includes(String(b.payment.status)))) return false;
      return true;
    });
    const up: BookingWithDetails[] = [];
    const pa: BookingWithDetails[] = [];
    all.forEach((b) => {
      const isPast =
        b.status === 'completed' ||
        b.status === 'cancelled' ||
        b.status === 'expired' ||
        b.status === 'no_show' ||
        new Date(b.start_at) < now;
      if (isPast) pa.push(b);
      else up.push(b);
    });
    return { upcoming: up, past: pa };
  }, [bookings.data, now]);

  const list = tab === 'upcoming' ? upcoming : past;
  // آخر حلاقة خلصت: عليها «فكّرني بالحلاقة الجاية» (لو مفيش حجز جاي)
  const latestCompletedId = useMemo(() => {
    if (upcoming.some((b) => b.status === 'confirmed' || b.status === 'pending_payment')) return null;
    const done = past.filter((b) => b.status === 'completed').sort((a, b) => +new Date(b.start_at) - +new Date(a.start_at));
    return done[0]?.id ?? null;
  }, [upcoming, past]);

  // جاي من إشعار: نفتح التاب اللي فيه الحجز ونوصله وننوّره
  const [focusParams, setFocusParams] = useSearchParams();
  const focusId = focusParams.get('focus');
  useEffect(() => {
    if (!focusId || !bookings.data) return;
    const inPast = past.some((b) => b.id === focusId);
    const inUp = upcoming.some((b) => b.id === focusId);
    if (!inPast && !inUp) return;
    setTab(inPast ? 'past' : 'upcoming');
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-focus="${focusId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('tito-focus');
        window.setTimeout(() => el.classList.remove('tito-focus'), 3200);
      }
      const next = new URLSearchParams(focusParams);
      next.delete('focus');
      setFocusParams(next, { replace: true });
    }, 250);
    return () => window.clearTimeout(t);
  }, [focusId, bookings.data, past, upcoming, focusParams, setFocusParams]);

  if (authLoading) {
    return (
      <PageShell>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center">
          <p className="text-base font-semibold text-espresso">{t('booking.loginRequired')}</p>
          <InAppBrowserNotice className="w-full text-start" />
          <GoogleSignInButton
            variant="gold"
            label={t('booking.signInGoogle')}
            onClick={() => void signIn()}
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-espresso">{t('bookings.title')}</h1>
        <div className="flex items-center gap-2">
          <SpecialRequestsButton />
          {loyalty?.enabled ? (
            <button type="button" onClick={() => setPointsOpen(true)} aria-label={i18n.language === 'ar' ? 'نقاطك' : 'Your points'}
              className="flex min-h-11 items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 text-espresso">
              <StarIcon className="size-5 fill-gold text-gold" aria-hidden />
              <span className="font-latin text-base font-bold">{balance}</span>
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 empty:hidden"><VisitProgressCard compact /></div>
      {loyalty?.enabled && !introSeen ? (
        <div className="mt-3 rounded-card border border-gold/40 bg-gold/10 p-3">
          <p className="text-sm font-semibold text-espresso">{i18n.language === 'ar' ? '⭐ نظام النقاط' : '⭐ Points'}</p>
          <p className="mt-1 text-xs text-ink">{pointsText}</p>
          <Button size="sm" className="mt-2" onClick={() => { try { localStorage.setItem('tito_points_intro', '1'); } catch { /* ignore */ } setIntroSeen(true); }}>
            {i18n.language === 'ar' ? 'فهمت' : 'Got it'}
          </Button>
        </div>
      ) : null}
      <Sheet open={pointsOpen && !!loyalty?.enabled} title={<>{i18n.language === 'ar' ? '⭐ نقاطك' : '⭐ Your points'}: <span className="font-latin">{balance}</span></>} onClose={() => setPointsOpen(false)}>
            <p className="text-xs text-ink">{pointsText}</p>
            {ledger.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-ink">
                {ledger.slice(0, 30).map((r) => (
                  <li key={r.id} className="flex justify-between gap-2">
                    <span>
                      {r.kind === 'earn' ? (i18n.language === 'ar' ? 'كسبت' : 'Earned') : r.kind === 'redeem' ? (i18n.language === 'ar' ? 'استخدمت' : 'Used') : r.kind === 'refund' ? (i18n.language === 'ar' ? 'رجعت (حجز اتلغى)' : 'Refunded') : (i18n.language === 'ar' ? 'تعديل من المحل' : 'Shop adjustment')}
                      {r.note ? ` · ${r.note}` : ''}
                    </span>
                    <span className="font-latin font-semibold">{r.points > 0 ? `+${r.points}` : r.points}</span>
                  </li>
                ))}
              </ul>
            ) : null}
      </Sheet>

      <div className="mt-4 space-y-3">
        <InactiveBanner />
      </div>

      <div className="mt-4 flex gap-2" role="tablist">
        {(['upcoming', 'past'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'min-h-[44px] flex-1 rounded-btn text-sm font-medium transition-colors',
              tab === key ? 'bg-gold text-espresso' : 'bg-sand text-ink',
            )}
          >
            {t(`bookings.${key}`)}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-ink">{t('bookings.refundNote')}</p>

      {bookings.isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : list.length === 0 ? (
        <p className="mt-8 text-center text-ink">
          {tab === 'upcoming' ? t('bookings.emptyUpcoming') : t('bookings.emptyPast')}
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {list.map((booking) => {
            const serviceName = i18n.language === 'ar' ? booking.service.name_ar : booking.service.name_en;
            const canCancel =
              booking.status === 'confirmed' || booking.status === 'pending_payment'
                ? isWithinCancelWindow(booking.start_at, cancelWindowHours)
                : false;
            const isRejected = booking.payment?.status === 'rejected';
            const isAr = i18n.language === 'ar';
            // الدفع اتبعت والمحل لسه مأكدش
            const awaitingShop = booking.status === 'pending_payment' && booking.payment?.status === 'submitted';
            const needsPayment =
              booking.status === 'pending_payment' && !awaitingShop && !isRejected && !booking.pay_at_shop;

            return (
              <article key={booking.id} data-focus={booking.id} className="rounded-card border border-default bg-cream p-4 shadow-warm">
                <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-espresso font-latin">
                      {formatCairoTime(booking.start_at, i18n.language)}
                    </p>
                    <p className="text-sm text-ink font-latin">
                      {formatCairoDate(booking.start_at, i18n.language)}
                    </p>
                  </div>
                  <Badge
                    status={booking.status}
                    label={
                      awaitingShop
                        ? isAr
                          ? 'في انتظار تأكيد المحل'
                          : 'Waiting for shop confirmation'
                        : t(`status.${booking.status}`)
                    }
                    className="max-w-full shrink-0"
                  />
                </div>
                <p className="mt-2 font-medium text-espresso">{serviceName}</p>
                {bookingStaff(booking) ? (
                  <p className="text-sm text-ink">✂ {staffList.find((m) => m.id === bookingStaff(booking))?.name ?? (isAr ? 'حلاقك' : 'Your barber')}</p>
                ) : null}
                {booking.extras.length > 0 ? (
                  <p className="text-sm text-ink">
                    {booking.extras
                      .map((extra) => (i18n.language === 'ar' ? extra.name_ar : extra.name_en))
                      .join(' · ')}
                  </p>
                ) : null}
                <p className="text-sm text-ink font-latin">{formatEGP(booking.price_egp)}</p>

                {booking.move_status === 'pending' && booking.move_token ? (
                  <Link to={`/move/${booking.move_token}`} className="mt-3 inline-flex text-sm font-medium text-espresso underline">
                    {t('bookings.moveOffer')}
                  </Link>
                ) : null}
                {booking.status === 'confirmed' && new Date(booking.start_at) > new Date() ? (
                  <AttendanceAsk
                    bookingId={booking.id}
                    asked={!!booking.attendance_asked_at}
                    attendance={booking.attendance ?? null}
                  />
                ) : null}
                {booking.status === 'confirmed' && new Date(booking.end_at) > new Date() ? (
                  <div className="mt-3">
                    <AddToCalendar id={booking.id} startAt={booking.start_at} endAt={booking.end_at} serviceName={serviceName} />
                  </div>
                ) : null}
                {(booking.status === 'confirmed' || booking.status === 'pending_payment') && new Date(booking.end_at) > new Date() ? (
                  <BookingProductsLine bookingId={booking.id} />
                ) : null}
                {booking.status === 'completed' ? (
                  <Link
                    to={`/book?step=datetime&service=${booking.service_id}${booking.staff_id ? `&staff=${booking.staff_id}` : ''}`}
                    className="mt-3 inline-flex"
                  >
                    <Button size="sm" variant="secondary">{isAr ? 'احجز نفس الحلاقة تاني' : 'Book the same again'}</Button>
                  </Link>
                ) : null}
                {booking.id === latestCompletedId ? <RebookReminderPicker bookingId={booking.id} /> : null}
                {booking.status === 'completed' && booking.rate_token ? (
                  <Link to={`/rate/${booking.rate_token}`} className="mt-3 inline-flex text-sm font-medium text-espresso underline">
                    {t('bookings.rateOffer')}
                  </Link>
                ) : null}

                {isRejected ? (
                  <div className="mt-3 rounded-btn border border-danger/30 bg-danger/5 p-3 text-sm" role="alert">
                    <p className="font-semibold text-danger">
                      {isAr ? 'الدفع اترفض، ابعت إيصال تاني' : 'Payment was rejected, please send a new receipt'}
                    </p>
                    {booking.payment?.rejection_reason ? (
                      <p className="mt-1 text-ink">{t('bookings.rejectionReason', { reason: booking.payment.rejection_reason })}</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {needsPayment ? (
                    <Link to={`/book?step=payment&booking=${booking.id}`} className="sm:w-auto">
                      <Button size="sm" className="w-full sm:w-auto">{isAr ? 'ادفع دلوقتي' : 'Pay now'}</Button>
                    </Link>
                  ) : null}
                  {awaitingShop ? (
                    <p className="w-full rounded-btn bg-sand/60 p-3 text-sm text-espresso">
                      {isAr
                        ? 'وصلنا إيصالك ✅ المحل هيراجع الدفع ويأكد حجزك قريب.'
                        : 'We received your receipt ✅ The shop will review the payment and confirm your booking soon.'}
                    </p>
                  ) : null}
                  {isRejected ? (
                    <Link to={`/book?step=payment&booking=${booking.id}`}>
                      <Button size="sm" variant="secondary" className="w-full sm:w-auto">{t('bookings.resendProof')}</Button>
                    </Link>
                  ) : null}
                  {(booking.status === 'confirmed' || booking.status === 'pending_payment') ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      disabled={!canCancel}
                      onClick={() => setRescheduleId(rescheduleId === booking.id ? null : booking.id)}
                      title={!canCancel ? t('bookings.cancelDisabled', { hours: cancelWindowHours }) : undefined}
                    >
                      {i18n.language === 'ar' ? 'غيّر المعاد' : 'Change time'}
                    </Button>
                  ) : null}
                  {(booking.status === 'confirmed' || booking.status === 'pending_payment') ? (
                    <Button
                      size="sm"
                      variant="danger"
                      className="w-full sm:w-auto"
                      disabled={!canCancel || cancelBooking.isPending}
                      onClick={() => {
                        if (window.confirm(t('bookings.cancelConfirm'))) {
                          cancelBooking.mutate(booking.id);
                        }
                      }}
                      title={!canCancel ? t('bookings.cancelDisabled', { hours: cancelWindowHours }) : undefined}
                    >
                      {t('bookings.cancel')}
                    </Button>
                  ) : null}
                </div>
                {(() => {
                  if (!loyalty?.enabled || !(booking.status === 'confirmed' || booking.status === 'pending_payment')) return null;
                  if (redeemedIds.has(booking.id)) {
                    return <p className="mt-2 text-xs text-ink">{isAr ? '⭐ اتستخدمت نقاط على الحجز ده' : '⭐ Points were used on this booking'}</p>;
                  }
                  const capPts = Math.floor((Number(booking.price_egp) * loyalty.max_redeem_percent) / 100 / loyalty.egp_per_point);
                  const pts = Math.min(balance, capPts);
                  if (pts < loyalty.min_redeem_points || pts <= 0) return null;
                  return (
                    <Button
                      variant="secondary"
                      className="mt-3 w-full"
                      loading={redeem.isPending}
                      onClick={() => redeem.mutate({ id: booking.id, points: pts })}
                    >
                      {isAr ? `⭐ استخدم ${pts} نقطة (خصم ${pts * loyalty.egp_per_point} جنيه)` : `⭐ Use ${pts} points (${pts * loyalty.egp_per_point} EGP off)`}
                    </Button>
                  );
                })()}
                {rescheduleId === booking.id && canCancel ? (
                  <RescheduleBox
                    booking={booking}
                    serviceId={booking.service_id}
                    staffId={bookingStaff(booking)}
                    onClose={() => setRescheduleId(null)}
                  />
                ) : null}
                {!canCancel && (booking.status === 'confirmed' || booking.status === 'pending_payment') ? (
                  <p className="mt-2 text-xs text-ink">
                    {t('bookings.cancelDisabled', { hours: cancelWindowHours })}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      <div className="mt-6"><RatePrompt /></div>
    </PageShell>
  );
}
