import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useAuth, useSignIn } from '@/features/profile/useAuth';
import { useSettings } from '@/features/home/useHomeData';
import { formatEGP } from '@/lib/money';
import { formatCairoTime } from '@/lib/time';
import { buildWhatsAppUrl } from '@/lib/urls';
import { cn } from '@/lib/cn';

type Service = { id: string; name_ar: string; name_en: string; price_egp: number; duration_minutes: number };
type Pick = { serviceId: string; date: string; slot: string | null; extras: string[] };

// دوال الحجز الجديدة مش في أنواع المشروع، فبنعدّي النوع يدوياً
const rpcAny = (name: string, args: Record<string, unknown>) =>
  (supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(name, args);

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });

export default function GroupBookingPage() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const { user, loading: authLoading } = useAuth();
  const signIn = useSignIn();
  const settings = useSettings();

  const [step, setStep] = useState<'services' | 'times' | 'review' | 'pay' | 'done'>('services');
  const [picks, setPicks] = useState<Pick[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingIds, setBookingIds] = useState<string[]>([]);
  const [method, setMethod] = useState<'instapay' | 'vodafone_cash' | null>(null);

  const servicesQuery = useQuery({
    queryKey: ['group-services'],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from('services')
        .select('id, name_ar, name_en, price_egp, duration_minutes')
        .eq('is_active', true)
        .eq('is_extra', false)
        .order('sort_order');
      if (e) throw e;
      return (data ?? []) as Service[];
    },
    staleTime: 60_000,
  });
  const services = servicesQuery.data ?? [];
  const byId = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const extrasQuery = useQuery({
    queryKey: ['group-extras'],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from('services')
        .select('id, name_ar, name_en, price_egp, duration_minutes')
        .eq('is_active', true)
        .eq('is_extra', true)
        .order('sort_order');
      if (e) throw e;
      return (data ?? []) as Service[];
    },
    staleTime: 60_000,
  });
  const extras = extrasQuery.data ?? [];
  const extrasById = useMemo(() => new Map(extras.map((x) => [x.id, x])), [extras]);

  const total = picks.reduce(
    (sum, p) =>
      sum +
      Number(byId.get(p.serviceId)?.price_egp ?? 0) +
      p.extras.reduce((s, id) => s + Number(extrasById.get(id)?.price_egp ?? 0), 0),
    0,
  );
  const nameOf = (s: Service) => (isAr ? s.name_ar : s.name_en);

  const toggleService = (id: string) => {
    setError(null);
    setPicks((prev) => {
      if (prev.some((p) => p.serviceId === id)) return prev.filter((p) => p.serviceId !== id);
      if (prev.length >= 3) return prev;
      return [...prev, { serviceId: id, date: todayStr(), slot: null, extras: [] }];
    });
  };

  const durationOf = (serviceId: string) => Number(byId.get(serviceId)?.duration_minutes ?? 0);
  const endOf = (p: Pick): number | null =>
    p.slot ? new Date(p.slot).getTime() + durationOf(p.serviceId) * 60000 : null;

  // كل شخص بعد اللي قبله: لو معاد حد اتغيّر، أي معاد بعده لازم يتمسح لو بقى قبل نهايته
  const updatePick = (idx: number, patch: Partial<Pick>) =>
    setPicks((prev) => {
      const next = prev.map((p, i) => (i === idx ? { ...p, ...patch } : p));
      let prevEnd = endOf(next[idx]);
      for (let j = idx + 1; j < next.length; j++) {
        if (prevEnd !== null && next[j].slot && new Date(next[j].slot as string).getTime() < prevEnd) {
          next[j] = { ...next[j], slot: null };
        }
        prevEnd = endOf(next[j]);
      }
      return next;
    });

  // أقل وقت مسموح للشخص ده: بعد نهاية اللي قبله
  const minStartFor = (idx: number): { waitForPrev: boolean; minMs: number | null } => {
    if (idx === 0) return { waitForPrev: false, minMs: null };
    const prev = picks[idx - 1];
    if (!prev.slot) return { waitForPrev: true, minMs: null };
    return { waitForPrev: false, minMs: endOf(prev) };
  };

  // بنحجز كل خدمة بمعادها، ولو حاجة وقعت بنلغي اللي اتحجز قبلها
  const createAll = async () => {
    setBusy(true);
    setError(null);
    const created: string[] = [];
    try {
      for (const p of picks) {
        const { data, error: e } = await rpcAny('create_booking', {
          p_service_id: p.serviceId,
          p_start_at: p.slot,
          p_pay_at_shop: false,
          p_extra_ids: p.extras,
          p_notes: null,
        });
        if (e) throw e;
        created.push(String(data));
      }
      setBookingIds(created);
      setStep('pay');
    } catch (e) {
      for (const id of created) {
        await rpcAny('customer_cancel_booking', { p_booking_id: id }).catch(() => undefined);
      }
      const msg = (e as { message?: string })?.message ?? '';
      setError(
        msg.includes('SLOT_TAKEN')
          ? isAr ? 'واحد من المعادات اتحجز قبل كده، اختار معاد تاني' : 'One of the times was just booked, pick another'
          : msg.includes('PROFILE_INCOMPLETE')
            ? isAr ? 'كمّل بيانات حسابك الأول من صفحة الحجز' : 'Complete your profile first from the booking page'
            : isAr ? 'حصلت مشكلة، حاول تاني' : 'Something went wrong, try again',
      );
    } finally {
      setBusy(false);
    }
  };

  const sendPaymentWhatsApp = async () => {
    if (!method || bookingIds.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await rpcAny('submit_group_payment', {
        p_booking_ids: bookingIds,
        p_method: method,
        p_transaction_ref: null,
        p_proof_path: null,
      });
      if (e) throw e;

      const lines = picks.map((p) => {
        const s = byId.get(p.serviceId);
        return `• ${s ? nameOf(s) : ''} — ${p.slot ? formatCairoTime(p.slot, i18n.language) : ''}`;
      });
      const shopName = settings.data?.shop_name || 'tito';
      const methodLabel = method === 'instapay' ? 'InstaPay' : isAr ? 'فودافون كاش' : 'Vodafone Cash';
      const msg = isAr
        ? `مرحباً ${shopName} 👋\nحجزت ${picks.length} خدمات:\n${lines.join('\n')}\nالإجمالي: ${formatEGP(total)}\nطريقة الدفع: ${methodLabel}\nهبعتلكم صورة التحويل هنا 🧾`
        : `Hi ${shopName} 👋\nI booked ${picks.length} services:\n${lines.join('\n')}\nTotal: ${formatEGP(total)}\nPayment: ${methodLabel}\nI'll send the transfer screenshot here 🧾`;
      const url = buildWhatsAppUrl(settings.data?.shop_whatsapp ?? '', msg);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      setStep('done');
    } catch (e) {
      setError((e as { message?: string })?.message ?? (isAr ? 'حصلت مشكلة' : 'Something went wrong'));
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) {
    return (
      <PageShell>
        <Skeleton className="h-40" />
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-16 text-center">
          <p className="font-semibold text-espresso">{isAr ? 'سجّل دخول عشان تحجز لأكتر من شخص' : 'Sign in to book for more than one person'}</p>
          <GoogleSignInButton variant="gold" label={isAr ? 'سجّل بجوجل' : 'Sign in with Google'} onClick={() => void signIn()} />
        </div>
      </PageShell>
    );
  }

  const stepIdx = ['services', 'times', 'review', 'pay'].indexOf(step);

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-espresso">{isAr ? 'احجز لأكتر من شخص' : 'Book for more than one person'}</h1>
          <Link to="/book" className="text-sm text-gold underline">{isAr ? 'حجز عادي' : 'Regular booking'}</Link>
        </div>

        {step !== 'done' ? (
          <p className="text-sm text-ink-70">
            {isAr ? `الخطوة ${stepIdx + 1} من 4` : `Step ${stepIdx + 1} of 4`}
          </p>
        ) : null}

        {step === 'services' ? (
          <section className="space-y-3">
            <p className="font-semibold text-espresso">{isAr ? 'اختار الخدمات (لحد 3، كل خدمة لشخص)' : 'Pick services (up to 3, one per person)'}</p>
            {servicesQuery.isLoading ? <Skeleton className="h-32" /> : (
              <div className="grid gap-2">
                {services.map((s) => {
                  const on = picks.some((p) => p.serviceId === s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      className={cn(
                        'flex items-center justify-between rounded-card border p-3 text-start transition-colors',
                        on ? 'border-gold bg-gold/15' : 'border-default bg-white',
                      )}
                    >
                      <span className="font-medium text-espresso">{nameOf(s)}</span>
                      <span className="font-latin text-sm text-ink-70">{formatEGP(s.price_egp)}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <Button className="w-full" disabled={picks.length === 0} onClick={() => setStep('times')}>
              {isAr ? 'كمّل' : 'Continue'}
            </Button>
          </section>
        ) : null}

        {step === 'times' ? (
          <section className="space-y-5">
            {picks.map((p, idx) => (
              <SlotPicker
                key={p.serviceId}
                index={idx}
                serviceId={p.serviceId}
                label={nameOf(byId.get(p.serviceId) ?? { id: '', name_ar: '', name_en: '', price_egp: 0, duration_minutes: 0 })}
                date={p.date}
                slot={p.slot}
                rules={minStartFor(idx)}
                extrasOptions={extras}
                selectedExtras={p.extras}
                onExtras={(ids) => updatePick(idx, { extras: ids })}
                onDate={(d) => updatePick(idx, { date: d, slot: null })}
                onSlot={(s) => updatePick(idx, { slot: s })}
              />
            ))}
            <div className="flex gap-2">
              <Button variant="secondary" className="w-full" onClick={() => setStep('services')}>{isAr ? 'رجوع' : 'Back'}</Button>
              <Button className="w-full" disabled={picks.some((p) => !p.slot)} onClick={() => setStep('review')}>
                {isAr ? 'كمّل' : 'Continue'}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 'review' ? (
          <section className="space-y-4">
            <ul className="divide-y divide-bark/10 rounded-card border border-default bg-white">
              {picks.map((p) => {
                const s = byId.get(p.serviceId);
                return (
                  <li key={p.serviceId} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span className="min-w-0 break-words">
                      {s ? nameOf(s) : ''} · {p.slot ? formatCairoTime(p.slot, i18n.language) : ''}
                      {p.extras.length > 0 ? (
                        <span className="block text-xs text-ink-70">
                          + {p.extras.map((id) => (isAr ? extrasById.get(id)?.name_ar : extrasById.get(id)?.name_en)).join(' · ')}
                        </span>
                      ) : null}
                    </span>
                    <span className="font-latin shrink-0">{formatEGP(s?.price_egp ?? 0)}</span>
                  </li>
                );
              })}
              <li className="flex items-center justify-between p-3 font-bold text-espresso">
                <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                <span className="font-latin">{formatEGP(total)}</span>
              </li>
            </ul>
            {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
            <div className="flex gap-2">
              <Button variant="secondary" className="w-full" onClick={() => setStep('times')}>{isAr ? 'رجوع' : 'Back'}</Button>
              <Button className="w-full" loading={busy} onClick={() => void createAll()}>
                {isAr ? 'أكد الحجز' : 'Confirm booking'}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 'pay' ? (
          <section className="space-y-4">
            <p className="font-semibold text-espresso">{isAr ? 'ادفع الإجمالي مرة واحدة' : 'Pay the total once'}</p>
            <p className="font-latin text-2xl font-bold text-espresso">{formatEGP(total)}</p>
            <div className="grid grid-cols-2 gap-2">
              {(['instapay', 'vodafone_cash'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    'rounded-btn border px-3 py-2.5 text-sm transition-colors',
                    method === m ? 'border-gold bg-gold/20 font-semibold' : 'border-default bg-white',
                  )}
                >
                  {m === 'instapay' ? 'InstaPay' : isAr ? 'فودافون كاش' : 'Vodafone Cash'}
                </button>
              ))}
            </div>
            {method === 'instapay' && settings.data?.instapay_number ? (
              <a href={settings.data.instapay_number} target="_blank" rel="noopener noreferrer" className="block text-sm text-gold underline">
                {isAr ? 'افتح لينك إنستاباي' : 'Open InstaPay link'}
              </a>
            ) : null}
            {method === 'vodafone_cash' && settings.data?.vodafone_cash_number ? (
              <p className="font-latin text-sm text-espresso">{settings.data.vodafone_cash_number}</p>
            ) : null}
            <p className="text-xs text-ink-70">
              {isAr
                ? 'بعد ما تدفع، اضغط الزرار ده، وهيفتحلك واتساب برسالة جاهزة بكل الحجوزات. ابعت صورة التحويل فيها.'
                : 'After paying, tap the button to open WhatsApp with a ready message listing all bookings. Send the transfer screenshot there.'}
            </p>
            {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
            <Button className="w-full" disabled={!method} loading={busy} onClick={() => void sendPaymentWhatsApp()}>
              {isAr ? 'ابعت على واتساب' : 'Send on WhatsApp'}
            </Button>
          </section>
        ) : null}

        {step === 'done' ? (
          <section className="space-y-3 rounded-card border border-gold/40 bg-white p-5 text-center">
            <p className="text-lg font-bold text-espresso">{isAr ? 'تمام، حجوزاتك اتسجلت ✅' : 'Done, your bookings are saved ✅'}</p>
            <p className="text-sm text-ink-70">
              {isAr ? 'المحل هيأكد الدفع ويبعتلك تأكيد. تقدر تتابع حجوزاتك من صفحة الحجوزات.' : 'The shop will confirm the payment. You can follow your bookings from the bookings page.'}
            </p>
            <Link to="/bookings" className="inline-block text-sm text-gold underline">{isAr ? 'حجوزاتي' : 'My bookings'}</Link>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}

function SlotPicker({
  index,
  serviceId,
  label,
  date,
  slot,
  rules,
  extrasOptions,
  selectedExtras,
  onExtras,
  onDate,
  onSlot,
}: {
  index: number;
  serviceId: string;
  label: string;
  date: string;
  slot: string | null;
  rules: { waitForPrev: boolean; minMs: number | null };
  extrasOptions: Service[];
  selectedExtras: string[];
  onExtras: (ids: string[]) => void;
  onDate: (d: string) => void;
  onSlot: (s: string) => void;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const slotsQuery = useQuery({
    queryKey: ['group-slots', serviceId, date],
    enabled: !!date && !!serviceId,
    queryFn: async () => {
      const { data, error } = await rpcAny('get_available_slots', { p_service_id: serviceId, p_date: date });
      if (error) throw error;
      return ((data ?? []) as Array<{ start_at: string }>).map((s) => s.start_at);
    },
    staleTime: 30_000,
  });
  const allSlots = slotsQuery.data ?? [];
  const slots = rules.minMs ? allSlots.filter((s) => new Date(s).getTime() >= (rules.minMs as number)) : allSlots;

  return (
    <div className="space-y-2 rounded-card border border-default bg-white p-4">
      <p className="font-semibold text-espresso">
        {isAr ? `الشخص ${index + 1}: ` : `Person ${index + 1}: `}
        <span className="font-normal">{label}</span>
      </p>
      <input
        type="date"
        value={date}
        min={todayStr()}
        onChange={(e) => onDate(e.target.value)}
        className="min-h-11 w-full rounded-btn border border-default bg-white px-3 text-sm font-latin"
      />
      {rules.waitForPrev ? (
        <p className="text-xs text-ink-70">
          {isAr ? 'اختار معاد الشخص اللي قبله الأول' : 'Pick the previous person\'s time first'}
        </p>
      ) : slotsQuery.isLoading ? (
        <Skeleton className="h-10" />
      ) : slots.length === 0 ? (
        <p className="text-xs text-ink-70">
          {isAr ? 'مفيش مواعيد متاحة بعد اللي قبله في اليوم ده' : 'No times available after the previous person on this day'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {slots.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSlot(s)}
              className={cn(
                'rounded-btn border px-2.5 py-1 font-latin text-xs transition-colors',
                slot === s ? 'border-gold bg-gold/20 font-semibold' : 'border-default bg-white',
              )}
            >
              {formatCairoTime(s, i18n.language)}
            </button>
          ))}
        </div>
      )}

      {extrasOptions.length > 0 ? (
        <div className="pt-2">
          <p className="mb-1 text-xs font-medium text-ink-70">
            {isAr ? 'إضافات لهذا الشخص (اختياري، ممكن أكتر من واحدة)' : 'Add-ons for this person (optional, pick several)'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {extrasOptions.map((x) => {
              const on = selectedExtras.includes(x.id);
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() =>
                    onExtras(on ? selectedExtras.filter((i) => i !== x.id) : [...selectedExtras, x.id])
                  }
                  className={cn(
                    'rounded-btn border px-2.5 py-1 text-xs transition-colors',
                    on ? 'border-gold bg-gold/20 font-semibold' : 'border-default bg-white',
                  )}
                >
                  {isAr ? x.name_ar : x.name_en} · <span className="font-latin">{formatEGP(x.price_egp)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
