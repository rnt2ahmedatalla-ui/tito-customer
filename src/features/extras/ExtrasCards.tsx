import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Star, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatInTimeZone } from 'date-fns-tz';
import { useFeatureFlags, useMyPackages, useBarbersNow, type BarberNow, useRateableBooking, useVisitStatus } from './useExtras';

/** حالة كل حلاق دلوقتي: لو دست على حلاق بتروح تحجز معاه (بتختفي لو المحل مقفول أو فيه حلاق واحد بس) */
export function WaitEstimateCard() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const L = (ar: string, en: string) => (isAr ? ar : en);
  const flags = useFeatureFlags();
  const on = !!flags.data?.waitEstimate;
  const list = useBarbersNow(on);
  if (!on || !list.data || list.data.length < 2) return null;
  const fmt = (iso: string) => {
    const f = formatInTimeZone(iso, 'Africa/Cairo', 'h:mm a');
    return isAr ? f.replace('AM', 'ص').replace('PM', 'م') : f;
  };
  const text = (b: BarberNow): string => {
    const n = b.next_start ? fmt(b.next_start) : null;
    switch (b.state) {
      case 'free':
        return n ? L(`فاضي دلوقتي · لحد ${n}`, `Free now · until ${n}`) : L('فاضي دلوقتي · لحد آخر اليوم', 'Free now · rest of the day');
      case 'busy':
        return (b.until ? L(`مشغول لحد ${fmt(b.until)}`, `Busy until ${fmt(b.until)}`) : L('مشغول', 'Busy')) +
          (n ? L(` · وبعدها فاضي لحد ${n}`, ` · then free until ${n}`) : L(' · وبعدها فاضي', ' · then free'));
      case 'break': {
        const brk = b.reason_until ?? b.until;
        const head = brk ? L(`في استراحة لحد ${fmt(brk)}`, `On break until ${fmt(brk)}`) : L('في استراحة', 'On break');
        // لو بعد الاستراحة على طول فيه حجز، نقول الوقت اللي هيفضى فيه فعلاً
        return b.until && brk && new Date(b.until).getTime() - new Date(brk).getTime() > 60_000
          ? head + L(` · وبعدها عنده حجوزات لحد ${fmt(b.until)}`, ` · then booked until ${fmt(b.until)}`)
          : head;
      }
      case 'not_started':
        return b.until ? L(`بيبدأ شغله الساعة ${fmt(b.until)}`, `Starts at ${fmt(b.until)}`) : L('لسه مبدأش', 'Not started yet');
      case 'finished':
        return L('خلّص شغل النهاردة', 'Done for today');
      default:
        return L('إجازة النهاردة', 'Off today');
    }
  };
  return (
    <div className="w-full max-w-md rounded-card border border-cream/20 bg-cream/10 p-3 text-cream backdrop-blur-sm">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gold-soft">
        {L('الحلاقين دلوقتي — دوس على حلاق واحجز معاه', 'Barbers right now — tap one to book')}
      </p>
      <ul className="space-y-1.5">
        {list.data.map((b) => {
          const bookable = b.state !== 'off' && b.state !== 'finished';
          const inner = (
            <>
              <span
                className={`mt-1.5 size-2.5 shrink-0 rounded-full ${b.state === 'free' ? 'bg-emerald-400' : bookable ? 'bg-gold' : 'bg-cream/40'}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{b.name}</p>
                <p className="text-cream/80">{text(b)}</p>
              </div>
            </>
          );
          return (
            <li key={b.id}>
              {bookable ? (
                <Link to={`/book?staff=${b.id}`} className="flex min-w-0 items-start gap-2.5 rounded-btn bg-black/15 px-3 py-2 text-sm transition hover:bg-black/25">
                  {inner}
                </Link>
              ) : (
                <div className="flex min-w-0 items-start gap-2.5 rounded-btn bg-black/10 px-3 py-2 text-sm opacity-70">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 px-1 text-xs text-cream/60">
        {L('مفيش معاد يناسبك؟ كمّل الحجز وسجّل في قايمة الانتظار.', 'No suitable time? Continue booking and join the waiting list.')}
      </p>
    </div>
  );
}

/** باقاتي: الحصص اللي فاضلة */
export function MyPackagesCard() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const flags = useFeatureFlags();
  const pk = useMyPackages(!!flags.data?.packages);
  if (!flags.data?.packages || !pk.data || pk.data.length === 0) return null;
  return (
    <div className="mt-8">
      <p className="mb-2 text-sm font-medium text-espresso">{isAr ? 'باقاتي' : 'My packages'}</p>
      <div className="space-y-2">
        {pk.data.map((p) => (
          <div key={p.id} className="flex min-w-0 items-center justify-between gap-3 rounded-card border border-gold/40 bg-gold/10 p-3">
            <div className="flex min-w-0 items-center gap-2">
              <Ticket className="size-5 shrink-0 text-gold" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-espresso">{isAr ? p.name_ar : p.name_en || p.name_ar}</p>
                <p className="text-xs text-ink">
                  {isAr ? 'صالحة لحد' : 'Valid until'} <span className="font-latin">{p.expires_at}</span>
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-espresso px-3 py-1 font-latin text-sm font-bold text-cream">
              {p.sessions_left}/{p.sessions_total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** بانر "وحشتنا": بيعد الأيام من آخر حلاقة ويختفي أول ما العميل يحجز */
export function InactiveBanner() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const st = useVisitStatus();
  const d = st.data;
  if (!d || !d.enabled || d.has_upcoming || d.days_since == null || d.days_since < (d.after_days ?? 28)) return null;
  const q = new URLSearchParams({ step: 'datetime' });
  if (d.last_service_id) q.set('service', d.last_service_id);
  if (d.last_service_id && d.last_staff_id) q.set('staff', d.last_staff_id);
  const to = d.last_service_id ? `/book?${q.toString()}` : '/book';
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-card border border-gold/50 bg-gold/15 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-espresso">
          {isAr ? `وحشتنا! عدّى ${d.days_since} يوم على آخر حلاقة ✂️` : `We miss you! It's been ${d.days_since} days since your last cut ✂️`}
        </p>
        <p className="mt-0.5 text-sm text-ink">{isAr ? 'احجز دلوقتي في ثواني.' : 'Book in seconds.'}</p>
      </div>
      <Link to={to} className="shrink-0">
        <Button className="w-full sm:w-auto">{isAr ? 'احجز نفس الحلاقة' : 'Book the same again'}</Button>
      </Link>
    </div>
  );
}

/** تقييم سريع: العميل يضغط على النجمة وبيروح لصفحة التقييم وهي متحددة */
export function RatePrompt() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const r = useRateableBooking();
  if (!r.data) return null;
  const name = isAr ? r.data.service_name_ar : r.data.service_name_en;
  return (
    <div className="rounded-card border border-default bg-white p-4 shadow-warm">
      <p className="text-sm font-semibold text-espresso">{isAr ? `إيه رأيك في ${name}؟` : `How was your ${name}?`}</p>
      <div className="mt-2 flex gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <Link key={n} to={`/rate/${r.data!.rate_token}?r=${n}`} aria-label={`${n}`} className="p-1">
            <Star className="size-8 text-gold hover:fill-gold" />
          </Link>
        ))}
      </div>
    </div>
  );
}
