import { cn } from '@/lib/cn';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Star, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatInTimeZone } from 'date-fns-tz';
import { useAuth } from '@/features/profile/useAuth';
import { useFeatureFlags, useMyPackages, useBarbersNow, useMyWaitlist, useWaitlistActions, type BarberNow, useRateableBooking, useVisitStatus } from './useExtras';

/** الحلاقين الفاضيين دلوقتي أو اللي هيفضوا خلال كام ساعة (الأدمن بيحددها). بتختفي لو المحل مقفول أو فيه حلاق واحد بس */
export function WaitEstimateCard() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const L = (ar: string, en: string) => (isAr ? ar : en);
  const { user } = useAuth();
  const navigate = useNavigate();
  const flags = useFeatureFlags();
  const on = !!flags.data?.waitEstimate;
  const list = useBarbersNow(on);
  const today = formatInTimeZone(new Date(), 'Africa/Cairo', 'yyyy-MM-dd');
  const mine = useMyWaitlist(today, !!flags.data?.waitlist);
  const { join, cancel } = useWaitlistActions();
  if (!on || !list.data || list.data.length < 2) return null;

  const hours = flags.data?.waitWindowHours ?? 3;
  const limit = Date.now() + hours * 3600_000;
  const fmt = (iso: string) => {
    const f = formatInTimeZone(iso, 'Africa/Cairo', 'h:mm a');
    return isAr ? f.replace('AM', 'ص').replace('PM', 'م') : f;
  };
  // فاضي دلوقتي، أو هيفضى (أو هيبدأ شغله) خلال الساعات المحددة
  const rows = list.data
    .map((b) => {
      if (b.state === 'free') return { b, at: null as string | null, done: false };
      if (b.state === 'finished') return { b, at: null as string | null, done: true };
      if ((b.state === 'busy' || b.state === 'break' || b.state === 'not_started') && b.until && new Date(b.until).getTime() <= limit) {
        return { b, at: b.until, done: false };
      }
      return null;
    })
    .filter((x): x is { b: BarberNow; at: string | null; done: boolean } => x !== null)
    .sort((x, y) => Number(x.done) - Number(y.done) || (x.at ? new Date(x.at).getTime() : 0) - (y.at ? new Date(y.at).getTime() : 0));

  return (
    <div className="w-full max-w-md rounded-card border border-cream/20 bg-cream/10 p-3 text-cream">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gold-soft">
        {L('متاح دلوقتي', 'Available now')}
      </p>
      {rows.length > 0 ? (
        <ul className="space-y-1.5">
          {rows.map(({ b, at, done }) => (
            <li key={b.id}>
              <Link to={`/book?staff=${b.id}`} className="flex min-w-0 items-center gap-2.5 rounded-btn bg-black/15 px-3 py-2.5 text-sm transition hover:bg-black/25">
                <span className={`size-2.5 shrink-0 rounded-full ${done ? 'bg-cream/40' : at ? 'bg-gold' : 'bg-emerald-400'}`} aria-hidden />
                <span className="min-w-0 flex-1 truncate font-semibold">{b.name}</span>
                <span className="shrink-0 text-end text-cream/80">
                  {done ? L('للأسف مش فاضي النهارده — احجز معاه بعدين', 'Not available today — book another day') : at ? L(`هيفضى ${fmt(at)}`, `Free at ${fmt(at)}`) : L('فاضي دلوقتي', 'Free now')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-btn bg-black/15 px-3 py-2.5 text-sm text-cream/85">
          {L(`مفيش حلاق فاضي خلال ${hours} ساعات الجاية.`, `No barber is free within the next ${hours} hours.`)}
        </p>
      )}
      {flags.data?.waitlist ? (
        <div className="mt-2 px-1">
          {mine.data ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-gold-soft">{L('إنت في قايمة الانتظار النهاردة ✅', 'You are on today’s waiting list ✅')}</span>
              <button type="button" className="min-h-9 text-xs text-cream/70 underline" onClick={() => cancel.mutate(mine.data!.id)}>
                {L('إلغاء', 'Leave')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={join.isPending}
              className="min-h-11 w-full rounded-btn border border-gold/60 px-3 text-sm font-medium text-gold-soft transition hover:bg-gold/10 disabled:opacity-60"
              onClick={() => {
                if (!user) {
                  navigate('/book');
                  return;
                }
                join.mutate(
                  { service: null, day: today, note: '' },
                  {
                    onSuccess: () => toast.success(L('اتسجّلت في قايمة الانتظار، هنبلّغك لو فضي معاد', 'Added to the waiting list')),
                    onError: (err) =>
                toast.error(
                  err instanceof Error && /BLOCKED_USER/i.test(err.message)
                    ? L('حسابك محظور — تواصل مع المحل', 'Your account is blocked — contact the shop')
                    : L('مقدرناش نسجّلك، جرّب تاني', 'Could not add you, try again'),
                ),
                  },
                );
              }}
            >
              {L('سجّلني في قايمة الانتظار', 'Join the waiting list')}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** باقاتي: الحصص اللي فاضلة */
export function MyPackagesCard() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const flags = useFeatureFlags();
  const pk = useMyPackages(!!flags.data?.packages);
  const list = (pk.data ?? []).filter((p) => p.status === 'requested' || p.sessions_left > 0);
  if (!flags.data?.packages || list.length === 0) return null;
  return (
    <section className="animate-rise rounded-card border border-default bg-white p-4 shadow-warm">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-espresso">
        <span className="flex size-8 items-center justify-center rounded-full bg-gold/15 text-gold"><Ticket className="size-4" /></span>
        {isAr ? 'باقاتي واشتراكاتي' : 'My packages'}
      </h2>
      <div className="space-y-2">
        {list.map((p) => {
          const pending = p.status === 'requested';
          const pct = p.sessions_total ? (p.sessions_left / p.sessions_total) * 100 : 0;
          return (
            <div key={p.id} className={cn('rounded-card border p-3', pending ? 'border-dashed border-gold/60 bg-gold/5' : 'border-gold/40 bg-gold/10')}>
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-espresso">{isAr ? p.name_ar : p.name_en || p.name_ar}</p>
                {pending ? (
                  <span className="shrink-0 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">{isAr ? 'مستني الدفع' : 'Awaiting payment'}</span>
                ) : (
                  <span className="shrink-0 font-latin text-sm font-bold text-espresso">{p.sessions_left}/{p.sessions_total}</span>
                )}
              </div>
              {pending ? (
                <p className="mt-1 text-xs text-ink">{isAr ? 'ادفع في المحل في زيارتك الجاية وهتتفعّل على طول.' : 'Pay at the shop on your next visit and it will be activated.'}</p>
              ) : (
                <>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${pct}%` }} /></div>
                  <p className="mt-1 text-xs text-ink">
                    {isAr ? `فاضلك ${p.sessions_left} زيارة · صالحة لحد ` : `${p.sessions_left} visits left · valid until `}<span className="font-latin">{p.expires_at}</span>
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
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
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-btn border border-default bg-white px-3 py-2">
      <p className="min-w-0 text-xs font-medium text-ink">{isAr ? `قيّم ${name}` : `Rate your ${name}`}</p>
      <div className="flex" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <Link key={n} to={`/rate/${r.data!.rate_token}?r=${n}`} aria-label={`${n}`} className="p-0.5">
            <Star className="size-5 text-gold hover:fill-gold" />
          </Link>
        ))}
      </div>
    </div>
  );
}
