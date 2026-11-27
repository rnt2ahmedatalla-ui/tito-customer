import { Logo } from '@/components/brand/Logo';
import { useHomeCardCfg } from '@/features/home/HomeRebook';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, RotateCcw, X } from 'lucide-react';
import { useAuth } from '@/features/profile/useAuth';
import { useBookings, useCancelBooking } from '@/features/bookings/useBookings';
import { useActiveStaff } from '@/features/booking/useBooking';

type Row = {
  id: string;
  status: string;
  service_id?: string | null;
  staff_id?: string | null;
  start_at: string;
  hold_expires_at?: string | null;
  pay_at_shop?: boolean | null;
  service_name_ar?: string | null;
  service_name_en?: string | null;
  payment?: { status?: string } | null;
};

function useRows(): Row[] {
  const { user } = useAuth();
  const q = useBookings();
  if (!user) return [];
  return (q.data ?? []) as Row[];
}

/** كارت أعلى الرئيسية: احجز نفس آخر حلاقة بضغطة (نفس الخدمة ونفس الحلاق). ينفع تخفيه بـ ✕ */
export function QuickRebook() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const rows = useRows();
  const staff = useActiveStaff();
  const imgCfg = useHomeCardCfg();
  const [hidden, setHidden] = useState<string | null>(() => {
    try { return localStorage.getItem('tito_rebook_hidden'); } catch { return null; }
  });
  const hasUpcoming = rows.some((r) => r.status === 'confirmed' && new Date(r.start_at) > new Date());
  const last = rows.find((r) => r.status === 'completed' || (r.status === 'confirmed' && new Date(r.start_at) <= new Date()));
  if (!last || !last.service_id || hasUpcoming || hidden === last.id) return null;
  const qs = new URLSearchParams({ step: 'datetime', service: last.service_id });
  if (last.staff_id) qs.set('staff', last.staff_id);
  const name = isAr ? last.service_name_ar : last.service_name_en || last.service_name_ar;
  const hide = () => {
    setHidden(last.id);
    try { localStorage.setItem('tito_rebook_hidden', last.id); } catch { /* ignore */ }
  };
  const barber = (staff.data ?? []).find((s) => s.id === last.staff_id);
  const multi = (staff.data ?? []).length > 1;
  return (
    <div className="relative animate-rise">
      <Link
        to={`/book?${qs.toString()}`}
        className="group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-[#4a2a17] to-[#2b1409] p-3.5 pe-12 shadow-warm-raised transition-transform active:scale-[0.985]"
      >
        <span className="pointer-events-none absolute -start-6 -top-8 size-28 rounded-full bg-gold/10 blur-2xl" aria-hidden />
        <span className="relative shrink-0">
          {barber?.photo && imgCfg.data?.image !== 'logo' ? (
            <img src={barber.photo} alt={barber.name} className="size-14 rounded-full object-cover ring-2 ring-gold ring-offset-2 ring-offset-[#341A0E]" />
          ) : imgCfg.data?.image === 'logo' ? (
            <Logo mark height={56} className="size-14 rounded-full" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-full bg-gold/20 font-latin text-xl font-bold text-gold ring-2 ring-gold ring-offset-2 ring-offset-[#341A0E]">
              {barber ? barber.name.slice(0, 1).toUpperCase() : <RotateCcw className="size-6" />}
            </span>
          )}
          <span className="absolute -bottom-1 -end-1 flex size-6 items-center justify-center rounded-full bg-gold text-espresso shadow">
            <RotateCcw className="size-3.5" />
          </span>
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-[11px] font-medium tracking-wide text-gold">{isAr ? 'زي آخر مرة' : 'Like last time'}</span>
          <span className="block truncate text-base font-bold text-cream">
            {name}{barber && multi ? (isAr ? ` مع ${barber.name}` : ` with ${barber.name}`) : ''}
          </span>
          <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-cream/70">
            {isAr ? 'اختار الميعاد بس' : 'Just pick a time'} <ArrowLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={hide}
        aria-label={isAr ? 'إخفاء' : 'Dismiss'}
        className="absolute end-2 top-2 flex size-8 items-center justify-center rounded-full text-cream/60 hover:bg-cream/10"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/** رسالة عائمة: عندك حجز مستني الدفع — كمّل أو الغي */
export function PendingHoldCard() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const loc = useLocation();
  const rows = useRows();
  const cancel = useCancelBooking();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);
  if (loc.pathname.startsWith('/book')) return null;
  const hold = rows.find(
    (r) =>
      r.status === 'pending_payment' &&
      !r.pay_at_shop &&
      r.hold_expires_at &&
      new Date(r.hold_expires_at).getTime() > Date.now() &&
      !(r.payment && ['submitted', 'rejected', 'confirmed'].includes(String(r.payment.status))),
  );
  if (!hold) return null;
  const mins = Math.max(1, Math.ceil((new Date(hold.hold_expires_at as string).getTime() - Date.now()) / 60000));
  const qs = new URLSearchParams({ step: 'payment', booking: hold.id });
  if (hold.service_id) qs.set('service', hold.service_id);
  return (
    <div className="fixed inset-x-3 bottom-[calc(5.2rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-card border border-gold/60 bg-espresso p-3 text-cream shadow-warm-raised animate-rise sm:bottom-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-gold/25 text-gold">
          <Clock className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{isAr ? 'عندك حجز مستني الدفع' : 'You have a booking awaiting payment'}</p>
          <p className="text-xs text-cream/70">{isAr ? `هيتلغي لوحده بعد ${mins} دقيقة` : `Releases automatically in ${mins} min`}</p>
          <div className="mt-2 flex gap-2">
            <Link to={`/book?${qs.toString()}`} className="inline-flex min-h-9 flex-1 items-center justify-center rounded-btn bg-gold px-3 text-sm font-semibold text-espresso">
              {isAr ? 'كمّل الحجز' : 'Continue'}
            </Link>
            <button
              type="button"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(hold.id)}
              className="inline-flex min-h-9 items-center justify-center gap-1 rounded-btn border border-cream/30 px-3 text-sm disabled:opacity-50"
            >
              <X className="size-4" /> {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
