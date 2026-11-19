import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Star, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getCairoNow } from '@/lib/time';
import { useWorkingHours } from '@/features/home/useHomeData';
import { useFeatureFlags, useMyPackages, useQueueEstimate, useRateableBooking, useVisitStatus } from './useExtras';

/** شريحة صغيرة في أول الصفحة: الانتظار الحالي (بتظهر بس وقت ما المحل مفتوح) */
export function WaitEstimateCard() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const flags = useFeatureFlags();
  const hours = useWorkingHours();
  const est = useQueueEstimate(!!flags.data?.waitEstimate);
  if (!flags.data?.waitEstimate || est.data == null || !hours.data) return null;
  const now = getCairoNow();
  const wh = hours.data.find((h) => h.day_of_week === now.getDay());
  if (!wh || wh.is_closed || !wh.open_time || !wh.close_time) return null;
  const cur = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  if (cur < toMin(wh.open_time) || cur >= toMin(wh.close_time)) return null;
  const m = est.data;
  const free = m <= 5;
  return (
    <Link
      to="/book"
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-cream/25 bg-cream/10 px-4 py-2 text-sm text-cream backdrop-blur-sm transition hover:bg-cream/15"
    >
      <span className={`size-2.5 shrink-0 rounded-full ${free ? 'bg-emerald-400' : 'bg-gold'}`} aria-hidden />
      <span className="min-w-0 truncate">
        {free
          ? isAr ? 'فاضيين دلوقتي — احجز وتعالى' : 'Free right now — book and come in'
          : isAr ? `الانتظار حالياً حوالي ${m} دقيقة` : `Current wait about ${m} min`}
      </span>
    </Link>
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
