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
type Method = 'in_shop' | 'instapay' | 'vodafone_cash';
type Step = 'services' | 'times' | 'review' | 'pay' | 'done';

// دوال الحجز مش في أنواع المشروع، فبنعدّي النوع يدوياً
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

  const [step, setStep] = useState<Step>('services');
  const [picks, setPicks] = useState<Pick[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<Method | null>(null);
  const [doneMethod, setDoneMethod] = useState<Method | null>(null);
  const [copied, setCopied] = useState(false);

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

  const lineTotal = (p: Pick) =>
    Number(byId.get(p.serviceId)?.price_egp ?? 0) +
    p.extras.reduce((s, id) => s + Number(extrasById.get(id)?.price_egp ?? 0), 0);
  const total = picks.reduce((sum, p) => sum + lineTotal(p), 0);

  const nameOf = (s: Service) => (isAr ? s.name_ar : s.name_en);
  const extraName = (id: string) => {
    const x = extrasById.get(id);
    return x ? (isAr ? x.name_ar : x.name_en) : '';
  };
  const durationOf = (serviceId: string) => Number(byId.get(serviceId)?.duration_minutes ?? 0);
  const endOf = (p: Pick): number | null =>
    p.slot ? new Date(p.slot).getTime() + durationOf(p.serviceId) * 60000 : null;

  const toggleService = (id: string) => {
    setError(null);
    setPicks((prev) => {
      if (prev.some((p) => p.serviceId === id)) return prev.filter((p) => p.serviceId !== id);
      if (prev.length >= 3) return prev;
      return [...prev, { serviceId: id, date: todayStr(), slot: null, extras: [] }];
    });
  };

  // لو الشخص الأول اختار يوم، الباقيين بيتحدثوا لنفس اليوم.
  // ولو معاد حد اتغيّر، أي معاد بعده لازم يتمسح لو بقى قبل نهاية اللي قبله.
  const updatePick = (idx: number, patch: Partial<Pick>) =>
    setPicks((prev) => {
      let next = prev.map((p, i) => (i === idx ? { ...p, ...patch } : p));
      if (idx === 0 && patch.date !== undefined) {
        const d = patch.date;
        next = next.map((p) => ({ ...p, date: d, slot: null }));
      }
      let prevEnd = endOf(next[idx]);
      for (let j = idx + 1; j < next.length; j++) {
        if (prevEnd !== null && next[j].slot && new Date(next[j].slot as string).getTime() < prevEnd) {
          next[j] = { ...next[j], slot: null };
        }
        prevEnd = endOf(next[j]);
      }
      return next;
    });

  const minStartFor = (idx: number): { waitForPrev: boolean; minMs: number | null } => {
    if (idx === 0) return { waitForPrev: false, minMs: null };
    const prev = picks[idx - 1];
    if (!prev.slot) return { waitForPrev: true, minMs: null };
    return { waitForPrev: false, minMs: endOf(prev) };
  };

  // أكتر رسالة مفهومة للعميل، ومعاها الكود عشان نعرف المشكلة لو لسه فيه
  const errorText = (msg: string) => {
    if (msg.includes('SLOT_TAKEN'))
      return isAr ? 'واحد من المعادات اتحجز قبل كده، اختار معاد تاني' : 'One of the times was just booked, pick another';
    if (msg.includes('TOO_MANY_PENDING'))
      return isAr
        ? 'عندك حجوزات كتير مستنية الدفع. ادفع أو ألغي اللي قبل كده الأول'
        : 'You have too many bookings waiting for payment. Pay or cancel them first';
    if (msg.includes('PROFILE_INCOMPLETE'))
      return isAr ? 'كمّل بيانات حسابك الأول من صفحة الحجز' : 'Complete your profile first from the booking page';
    if (msg.includes('BOOKING_CLOSED')) return isAr ? 'الحجز مقفول دلوقتي' : 'Booking is closed right now';
    if (msg.includes('TOO_SOON')) return isAr ? 'واحد من المعادات قريب أوي، اختار وقت أبعد' : 'One time is too soon, pick a later time';
    if (msg.includes('TOO_FAR')) return isAr ? 'واحد من المعادات بعيد أوي' : 'One time is too far away';
    if (msg.includes('PAY_AT_SHOP_DISABLED'))
      return isAr ? 'الدفع في المحل مش متاح دلوقتي' : 'Paying at the shop is not available right now';
    if (msg.includes('BLOCKED_USER')) return isAr ? 'حسابك مش مسموح له يحجز' : 'Your account cannot book';
    return isAr ? `حصلت مشكلة: ${msg || 'حاول تاني'}` : `Something went wrong: ${msg || 'try again'}`;
  };

  // كل الحجوزات بتتسجل في خطوة واحدة في السيرفر: لو حاجة وقعت، ما بيتسجلش أي حاجة
  const payload = () =>
    picks.map((p) => ({ service_id: p.serviceId, start_at: p.slot, extra_ids: p.extras }));

  const confirmInShop = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await rpcAny('create_group_booking', { p_items: payload(), p_method: 'in_shop' });
      if (e) throw e;
      setDoneMethod('in_shop');
      setStep('done');
    } catch (e) {
      setError(errorText((e as { message?: string })?.message ?? ''));
    } finally {
      setBusy(false);
    }
  };

  // نفس الحجز العادي: الحجز بيتسجل ويتبعت للمحل لما العميل يبعت على واتساب
  const submitOnline = async (m: Method) => {
    // نفتح الواتساب بشكل متزامن عشان المتصفح ما يمنعوش، ونحدد الرابط بعد النجاح
    const win = window.open('', '_blank');
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await rpcAny('create_group_booking', { p_items: payload(), p_method: m });
      if (e) throw e;
      const url = buildWhatsAppUrl(settings.data?.shop_whatsapp ?? '', summaryMessage(m));
      if (win && url) win.location.href = url;
      else win?.close();
      setDoneMethod(m);
      setStep('done');
    } catch (e) {
      win?.close();
      setError(errorText((e as { message?: string })?.message ?? ''));
    } finally {
      setBusy(false);
    }
  };

  const summaryMessage = (m: Method) => {
    const shopName = settings.data?.shop_name || 'tito';
    const lines = picks.map((p) => {
      const extrasText = p.extras.length ? ` (+ ${p.extras.map(extraName).join(' + ')})` : '';
      return `• ${nameOf(byId.get(p.serviceId) ?? { id: '', name_ar: '', name_en: '', price_egp: 0, duration_minutes: 0 })}${extrasText} — ${p.slot ? formatCairoTime(p.slot, i18n.language) : ''}`;
    });
    const methodLabel =
      m === 'in_shop' ? (isAr ? 'الدفع في المحل' : 'Pay at the shop') : m === 'instapay' ? 'InstaPay' : isAr ? 'فودافون كاش' : 'Vodafone Cash';
    return isAr
      ? `أهلاً ${shopName} 👋\nحجزت ${picks.length} ${picks.length > 1 ? 'مواعيد' : 'ميعاد'}:\n${lines.join('\n')}\nالإجمالي: ${formatEGP(total)}\nطريقة الدفع: ${methodLabel}${m === 'in_shop' ? '' : '\nهبعتلكم صورة التحويل هنا 🧾'}`
      : `Hi ${shopName} 👋\nI booked ${picks.length} appointment(s):\n${lines.join('\n')}\nTotal: ${formatEGP(total)}\nPayment: ${methodLabel}${m === 'in_shop' ? '' : '\nI will send the transfer screenshot here 🧾'}`;
  };

  const openWhatsApp = (m: Method) => {
    const url = buildWhatsAppUrl(settings.data?.shop_whatsapp ?? '', summaryMessage(m));
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyNumber = (num: string) => {
    void navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const instapayLink = (settings.data?.instapay_number ?? '').trim();
  const instapayReady = /^https?:\/\//.test(instapayLink);
  const vodafoneNumber = (settings.data?.vodafone_cash_number ?? '').trim();
  const allowInShop = !!settings.data?.allow_pay_at_shop;

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
          <p className="font-semibold text-espresso">
            {isAr ? 'سجّل دخول عشان تحجز لأكتر من شخص' : 'Sign in to book for more than one person'}
          </p>
          <GoogleSignInButton variant="gold" label={isAr ? 'سجّل بجوجل' : 'Sign in with Google'} onClick={() => void signIn()} />
        </div>
      </PageShell>
    );
  }

  const stepNumber = { services: 1, times: 2, review: 3, pay: 4, done: 4 }[step];

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-espresso">{isAr ? 'احجز لأكتر من شخص' : 'Book for more than one person'}</h1>
          <Link to="/book" className="shrink-0 text-sm text-gold underline">
            {isAr ? 'حجز عادي' : 'Regular booking'}
          </Link>
        </div>

        {step !== 'done' ? (
          <p className="text-sm text-ink-70">{isAr ? `الخطوة ${stepNumber} من 4` : `Step ${stepNumber} of 4`}</p>
        ) : null}

        {step === 'services' ? (
          <section className="space-y-3">
            <p className="font-semibold text-espresso">
              {isAr ? 'اختار الخدمات (لحد 3، كل خدمة لشخص)' : 'Pick services (up to 3, one per person)'}
            </p>
            {servicesQuery.isLoading ? (
              <Skeleton className="h-32" />
            ) : (
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
              <Button variant="secondary" className="w-full" onClick={() => setStep('services')}>
                {isAr ? 'رجوع' : 'Back'}
              </Button>
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
                  <li key={p.serviceId} className="flex items-start justify-between gap-3 p-3 text-sm">
                    <span className="min-w-0 break-words">
                      <span className="font-semibold text-espresso">{s ? nameOf(s) : ''}</span>
                      <span className="block text-ink-70">
                        {p.slot ? formatCairoTime(p.slot, i18n.language) : ''}
                      </span>
                      {p.extras.length > 0 ? (
                        <span className="block text-xs text-ink-70">+ {p.extras.map(extraName).join(' · ')}</span>
                      ) : null}
                    </span>
                    <span className="font-latin shrink-0">{formatEGP(lineTotal(p))}</span>
                  </li>
                );
              })}
              <li className="flex items-center justify-between p-3 font-bold text-espresso">
                <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                <span className="font-latin">{formatEGP(total)}</span>
              </li>
            </ul>
            <div className="flex gap-2">
              <Button variant="secondary" className="w-full" onClick={() => setStep('times')}>
                {isAr ? 'رجوع' : 'Back'}
              </Button>
              <Button className="w-full" onClick={() => setStep('pay')}>
                {isAr ? 'كمّل للدفع' : 'Continue to payment'}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 'pay' ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between rounded-card border border-gold/40 bg-gold/10 p-4">
              <span className="font-semibold text-espresso">{isAr ? 'الإجمالي' : 'Total'}</span>
              <span className="font-latin text-xl font-bold text-espresso">{formatEGP(total)}</span>
            </div>

            <p className="font-semibold text-espresso">{isAr ? 'اختار طريقة الدفع' : 'Choose how to pay'}</p>
            <div className="grid gap-2">
              {allowInShop ? (
                <PayOption active={method === 'in_shop'} onClick={() => setMethod('in_shop')} title={isAr ? 'ادفع في المحل' : 'Pay at the shop'} />
              ) : null}
              {instapayReady ? (
                <PayOption active={method === 'instapay'} onClick={() => setMethod('instapay')} title="InstaPay" />
              ) : null}
              {vodafoneNumber ? (
                <PayOption active={method === 'vodafone_cash'} onClick={() => setMethod('vodafone_cash')} title={isAr ? 'فودافون كاش' : 'Vodafone Cash'} />
              ) : null}
            </div>

            {method === 'instapay' && instapayReady ? (
              <a href={instapayLink} target="_blank" rel="noopener noreferrer" className="block rounded-btn border border-gold/50 bg-white p-3 text-center text-sm font-semibold text-gold">
                {isAr ? 'افتح إنستاباي وادفع' : 'Open InstaPay and pay'}
              </a>
            ) : null}
            {method === 'vodafone_cash' && vodafoneNumber ? (
              <div className="flex items-center justify-between gap-2 rounded-btn border border-default bg-white p-3">
                <span className="font-latin font-bold text-espresso">{vodafoneNumber}</span>
                <button type="button" onClick={() => copyNumber(vodafoneNumber)} className="rounded bg-gold/20 px-3 py-1.5 text-xs font-medium text-espresso">
                  {copied ? (isAr ? 'اتنسخ' : 'Copied') : isAr ? 'نسخ' : 'Copy'}
                </button>
              </div>
            ) : null}

            {method ? (
              <p className="text-xs text-ink-70">
                {method === 'in_shop'
                  ? isAr ? 'هتدفع لما تيجي المحل، والحجز هيتأكد دلوقتي.' : 'You pay when you come to the shop. The booking is confirmed now.'
                  : isAr ? 'الحجز هيتسجل، وبعدها ابعت صورة التحويل على واتساب، والمحل هيأكد الحجز.' : 'The booking is saved, then send the transfer screenshot on WhatsApp and the shop will confirm it.'}
              </p>
            ) : null}

            {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}

            <div className="flex gap-2">
              <Button variant="secondary" className="w-full" disabled={busy} onClick={() => setStep('review')}>
                {isAr ? 'رجوع' : 'Back'}
              </Button>
              {method === 'in_shop' ? (
                <Button className="w-full" disabled={busy} loading={busy} onClick={() => void confirmInShop()}>
                  {isAr ? 'أكد الحجز' : 'Confirm booking'}
                </Button>
              ) : (
                <Button className="w-full" disabled={!method || busy} loading={busy} onClick={() => method && void submitOnline(method)}>
                  {isAr ? 'أكد وابعت على واتساب' : 'Confirm and send on WhatsApp'}
                </Button>
              )}
            </div>
          </section>
        ) : null}

        {step === 'done' && doneMethod ? (
          <section className="space-y-4 rounded-card border border-gold/40 bg-white p-5">
            <div className="text-center">
              <p className="text-xl font-bold text-espresso">{isAr ? 'حجزك وصل ✅' : 'Your booking is in ✅'}</p>
              <p className="mt-1 text-sm text-ink-70">
                {doneMethod === 'in_shop'
                  ? isAr ? 'هتدفع في المحل لما تيجي.' : 'You pay at the shop when you come.'
                  : isAr ? 'ابعت صورة التحويل على واتساب عشان المحل يأكد.' : 'Send the transfer screenshot on WhatsApp so the shop confirms.'}
              </p>
            </div>

            <ul className="divide-y divide-bark/10 rounded-btn border border-bark/10">
              {picks.map((p) => (
                <li key={p.serviceId} className="p-3 text-sm">
                  <p className="font-semibold text-espresso">{nameOf(byId.get(p.serviceId) ?? { id: '', name_ar: '', name_en: '', price_egp: 0, duration_minutes: 0 })}</p>
                  <p className="font-latin text-ink-70">{p.slot ? formatCairoTime(p.slot, i18n.language) : ''}</p>
                  {p.extras.length > 0 ? <p className="text-xs text-ink-70">+ {p.extras.map(extraName).join(' · ')}</p> : null}
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between font-bold text-espresso">
              <span>{isAr ? 'الإجمالي' : 'Total'}</span>
              <span className="font-latin">{formatEGP(total)}</span>
            </div>

            <Button className="w-full" onClick={() => openWhatsApp(doneMethod)}>
              {isAr ? 'ابعت تفاصيل الحجز على واتساب' : 'Send booking details on WhatsApp'}
            </Button>
            <Link to="/bookings" className="block text-center text-sm text-gold underline">
              {isAr ? 'حجوزاتي' : 'My bookings'}
            </Link>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}

function PayOption({ active, onClick, title }: { active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-card border p-3 text-start text-sm font-semibold transition-colors',
        active ? 'border-gold bg-gold/15 text-espresso' : 'border-default bg-white text-espresso',
      )}
    >
      {title}
    </button>
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
