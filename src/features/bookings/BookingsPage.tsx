import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBookings, useCancelBooking } from './useBookings';
import { useSettings } from '@/features/home/useHomeData';
import { useAuth, useSignIn } from '@/features/profile/useAuth';
import { formatCairoDate, formatCairoTime, isWithinCancelWindow } from '@/lib/time';
import { formatEGP } from '@/lib/money';
import { cn } from '@/lib/cn';
import type { BookingWithDetails } from '@/types/database';

export default function BookingsPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const signIn = useSignIn();
  const bookings = useBookings();
  const settings = useSettings();
  const cancelBooking = useCancelBooking();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const cancelWindowHours = settings.data?.cancel_window_hours ?? 3;
  const now = new Date();

  const { upcoming, past } = useMemo(() => {
    const all = bookings.data ?? [];
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
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-ink">{t('booking.loginRequired')}</p>
          <Button onClick={() => void signIn()}>{t('booking.signInGoogle')}</Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-espresso">{t('bookings.title')}</h1>

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

            return (
              <article key={booking.id} className="rounded-card border border-default bg-cream p-4 shadow-warm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold text-espresso font-latin">
                      {formatCairoTime(booking.start_at, i18n.language)}
                    </p>
                    <p className="text-sm text-ink font-latin">
                      {formatCairoDate(booking.start_at, i18n.language)}
                    </p>
                  </div>
                  <Badge status={booking.status} label={t(`status.${booking.status}`)} />
                </div>
                <p className="mt-2 font-medium text-espresso">{serviceName}</p>
                <p className="text-sm text-ink font-latin">{formatEGP(booking.price_egp)}</p>

                {isRejected && booking.payment?.rejection_reason ? (
                  <p className="mt-2 text-sm text-danger" role="alert">
                    {t('bookings.rejectionReason', { reason: booking.payment.rejection_reason })}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {booking.status === 'pending_payment' ? (
                    <Link to={`/book?step=payment&booking=${booking.id}`}>
                      <Button size="sm">{t('bookings.completePayment')}</Button>
                    </Link>
                  ) : null}
                  {isRejected ? (
                    <Link to={`/book?step=payment&booking=${booking.id}`}>
                      <Button size="sm" variant="secondary">{t('bookings.resendProof')}</Button>
                    </Link>
                  ) : null}
                  {(booking.status === 'confirmed' || booking.status === 'pending_payment') ? (
                    <Button
                      size="sm"
                      variant="danger"
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
    </PageShell>
  );
}
