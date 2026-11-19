import { usePrepayRequired } from '@/features/extras/useExtras';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Copy, Check, Store, Smartphone, Landmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useAuth, useProfile, useSignIn, isProfileComplete } from '@/features/profile/useAuth';
import { useSettings } from '@/features/home/useHomeData';
import { formatEGP } from '@/lib/money';
import { formatCairoTime } from '@/lib/time';
import { buildWhatsAppUrl } from '@/lib/urls';
import { instapayLink } from '@/lib/payLinks';
import { extractErrorCode } from '@/lib/errors';
import { ProfileModal } from '@/components/layout/ProfileModal';
import { ServiceCard } from '@/components/booking/ServiceCard';
import { ExtraCard } from '@/components/booking/ExtraCard';
import { StaffAvatar } from '@/components/staff/StaffParts';
import { useActiveStaff, useStaffServices, type StaffMember } from './useBooking';
import { cn } from '@/lib/cn';

type Service = {
  id: string;
  name_ar: string;
  name_en: string;
  price_egp: number;
  duration_minutes: number;
  description_ar?: string | null;
  description_en?: string | null;
};
type PayChoice = 'shop' | 'instapay' | 'vodafone_cash';
type Pick = { serviceId: string; date: string; slot: string | null; extras: string[]; staff: string | null };

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
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const profile = useProfile();
  const signIn = useSignIn();
  const settings = useSettings();

  const [step, setStep] = useState<'services' | 'times' | 'review' | 'pay' | 'done'>('services');
  const [picks, setPicks] = useState<Pick[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [method, setMethod] = useState<PayChoice | null>(null);
  const [copied, setCopied] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [result, setResult] = useState<{ method: PayChoice; waUrl: string | null } | null>(null);

  const servicesQuery = useQuery({
    queryKey: ['group-services'],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from('services')
        .select('id, name_ar, name_en, price_egp, duration_minutes, description_ar, description_en')
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

  const nameOf = (s: Service) => (isAr ? s.name_ar : s.name_en);
  // سعر الشخص = الخدمة + إضافاته (كان بيتعرض الأساسي بس وده سبب إن الإجمالي مش بيطابق السطور)
  const activeStaff = useActiveStaff().data ?? [];
  const staffServices = useStaffServices().data ?? [];
  const offers = (staffId: string, ids: string[]) =>
    !staffServices.some((r) => r.staff_id === staffId && r.is_offered === false && ids.includes(r.service_id));
  // الحلاقين اللي بيقدموا خدمة الشخص وإضافاته
  const eligibleFor = (p: Pick, extraIds: string[] = p.extras) =>
    activeStaff.filter((m) => offers(m.id, [p.serviceId, ...extraIds]));
  // الحلاق الفعلي: null = مفيش طاقم (النظام القديم)، 'any' = أي حلاق، أو id
  const resolveStaff = (p: Pick): string | null => {
    if (activeStaff.length === 0) return null;
    const el = eligibleFor(p);
    if (el.length === 0) return null;
    if (el.length === 1) return el[0]?.id ?? null;
    return p.staff && el.some((m) => m.id === p.staff) ? p.staff : 'any';
  };
  const noneOffers = (p: Pick) => activeStaff.length > 0 && eligibleFor(p).length === 0;
  const unitPrice = (serviceId: string, base: number, staffId: string | null) => {
    const o = staffId && staffId !== 'any'
      ? staffServices.find((r) => r.staff_id === staffId && r.service_id === serviceId && r.price_egp != null)
      : undefined;
    return Number(o?.price_egp ?? base);
  };
  const priceOfPick = (p: Pick) => {
    const st = resolveStaff(p);
    return (
      unitPrice(p.serviceId, Number(byId.get(p.serviceId)?.price_egp ?? 0), st) +
      p.extras.reduce((sum, id) => sum + unitPrice(id, Number(extrasById.get(id)?.price_egp ?? 0), st), 0)
    );
  };
  const priceMayVary = (p: Pick) =>
    resolveStaff(p) === 'any' &&
    eligibleFor(p).some((m) => staffServices.some((r) => r.staff_id === m.id && r.price_egp != null && [p.serviceId, ...p.extras].includes(r.service_id)));
  const total = picks.reduce((sum, p) => sum + priceOfPick(p), 0);
  const staffLabel = (p: Pick): string | null => {
    const st = resolveStaff(p);
    if (!st) return null;
    if (st === 'any') return isAr ? 'أي حلاق متاح' : 'Any available barber';
    return activeStaff.find((m) => m.id === st)?.name ?? null;
  };
  
  const prepayRequired = usePrepayRequired().data === true;
  const allowShop = !!settings.data?.allow_pay_at_shop && !prepayRequired;
  const hasInstapay = !!settings.data?.instapay_number?.trim();
  const hasVodafone = !!settings.data?.vodafone_cash_number?.trim();
  const availableMethods: PayChoice[] = [
    ...(allowShop ? (['shop'] as const) : []),
    ...(hasInstapay ? (['instapay'] as const) : []),
    ...(hasVodafone ? (['vodafone_cash'] as const) : []),
  ];
  // لو الأدمن قفل الدفع في المحل والعميل كان مختاره، بنشيله
  const activeMethod = method && availableMethods.includes(method) ? method : null;

  const toggleService = (id: string) => {
    setError(null);
    setPicks((prev) => {
      if (prev.some((p) => p.serviceId === id)) return prev.filter((p) => p.serviceId !== id);
      if (prev.length >= 3) return prev;
      return [...prev, { serviceId: id, date: prev[0]?.date ?? todayStr(), slot: null, extras: [], staff: null }];
    });
  };

  const durationOf = (serviceId: string) => Number(byId.get(serviceId)?.duration_minutes ?? 0);
  const endOf = (p: Pick): number | null =>
    p.slot ? new Date(p.slot).getTime() + durationOf(p.serviceId) * 60000 : null;

  // شخصين ممكن يتعارضوا لو على نفس الحلاق أو لو أي واحد فيهم "أي حلاق" — غير كده (حلاقين مختلفين) ممكن في نفس الوقت
  const conflicts = (a: Pick, b: Pick) => {
    const sa = resolveStaff(a);
    const sb = resolveStaff(b);
    if (!sa || !sb) return true;
    if (sa === 'any' || sb === 'any') return true;
    return sa === sb;
  };

  const updatePick = (idx: number, patch: Partial<Pick>) =>
    setPicks((prev) => {
      let next = prev.map((p, i) => (i === idx ? { ...p, ...patch } : p));
      if (idx === 0 && patch.date !== undefined) {
        const d = patch.date;
        next = next.map((p) => ({ ...p, date: d, slot: null }));
      }
      // أي معاد بقى قبل نهاية شخص متعارض معاه بيتمسح
      for (let j = 0; j < next.length; j++) {
        const cur = next[j] as Pick;
        if (!cur.slot) continue;
        for (let i = 0; i < j; i++) {
          const pr = next[i] as Pick;
          const end = endOf(pr);
          if (end !== null && conflicts(pr, cur) && new Date(cur.slot).getTime() < end) {
            next[j] = { ...cur, slot: null };
            break;
          }
        }
      }
      return next;
    });

  const minStartFor = (idx: number): { waitForPrev: boolean; minMs: number | null } => {
    let minMs: number | null = null;
    for (let i = 0; i < idx; i++) {
      const pr = picks[i] as Pick;
      if (!conflicts(pr, picks[idx] as Pick)) continue;
      const end = endOf(pr);
      if (end === null) return { waitForPrev: true, minMs: null };
      minMs = minMs === null ? end : Math.max(minMs, end);
    }
    return { waitForPrev: false, minMs };
  };

  const friendlyError = (e: unknown) => {
    const code = extractErrorCode(e);
    switch (code) {
      case 'SLOT_TAKEN':
        return isAr ? 'واحد من المعادات اتحجز قبل كده، ارجع اختار معاد تاني' : 'One of the times was just booked, go back and pick another';
      case 'PROFILE_INCOMPLETE':
        return isAr ? 'كمّل بيانات حسابك الأول' : 'Complete your profile first';
      case 'TOO_MANY_PENDING':
        return isAr
          ? 'عندك حجوزات كتير مستنية. كمّل أو ألغي واحدة من حجوزاتي وجرب تاني'
          : 'You have too many pending bookings. Finish or cancel one in My bookings and try again';
      case 'BOOKING_CLOSED':
        return isAr ? 'الحجز مقفول دلوقتي' : 'Booking is closed right now';
      case 'BLOCKED_USER':
        return isAr ? 'حسابك محظور، كلّم المحل' : 'Your account is blocked, contact the shop';
      default:
        return isAr ? 'حصلت مشكلة، حاول تاني' : 'Something went wrong, try again';
    }
  };

  const buildMessage = (choice: PayChoice) => {
    const shopName = settings.data?.shop_name || 'tito';
    const lines = picks.map((p) => {
      const s = byId.get(p.serviceId);
      const ex = p.extras
        .map((id) => (isAr ? extrasById.get(id)?.name_ar : extrasById.get(id)?.name_en))
        .filter(Boolean)
        .join(' + ');
      const sl = staffLabel(p);
      return `• ${s ? nameOf(s) : ''}${ex ? ` + ${ex}` : ''}${sl && sl !== 'أي حلاق متاح' && sl !== 'Any available barber' ? ` (${sl})` : ''} — ${p.slot ? formatCairoTime(p.slot, i18n.language) : ''}`;
    });
    const methodLabel =
      choice === 'shop'
        ? isAr ? 'الدفع في المحل' : 'Pay at the shop'
        : choice === 'instapay'
          ? 'InstaPay'
          : isAr ? 'فودافون كاش' : 'Vodafone Cash';
    const tail =
      choice === 'shop'
        ? isAr ? 'هدفع في المحل لما أجي 💈' : "I'll pay at the shop when I arrive 💈"
        : isAr ? 'هبعتلكم صورة التحويل هنا 🧾' : "I'll send the transfer screenshot here 🧾";
    return isAr
      ? `مرحباً ${shopName} 👋\nحجزت ${picks.length} خدمات:\n${lines.join('\n')}\nالإجمالي: ${formatEGP(total)}\nطريقة الدفع: ${methodLabel}\n${tail}`
      : `Hi ${shopName} 👋\nI booked ${picks.length} services:\n${lines.join('\n')}\nTotal: ${formatEGP(total)}\nPayment: ${methodLabel}\n${tail}`;
  };

  // الحجز مبيتسجل غير لما العميل يختار طريقة الدفع ويدوس تأكيد:
  // الدفع في المحل = حجوزات مؤكدة، إنستا/فودافون = حجوزات + تسجيل الدفع، وأي فشل بيلغي اللي اتعمل
  const confirmAll = async (profileJustSaved = false) => {
    if (!activeMethod) return;
    if (!profileJustSaved && !isProfileComplete(profile.data)) {
      setShowProfileModal(true);
      return;
    }
    setBusy(true);
    setError(null);
    setErrorDetail(null);
    const created: string[] = [];
    let failedIdx = -1;
    try {
      const payAtShop = activeMethod === 'shop';
      for (let pi = 0; pi < picks.length; pi++) {
        failedIdx = pi;
        const p = picks[pi] as Pick;
        const st = resolveStaff(p);
        const { data, error: e } = st
          ? await rpcAny('create_booking_staff', {
              p_service_id: p.serviceId,
              p_start_at: p.slot,
              p_pay_at_shop: payAtShop,
              p_extra_ids: p.extras,
              p_notes: null,
              p_staff_id: st === 'any' ? null : st,
              p_coupon: null,
            })
          : await rpcAny('create_booking', {
              p_service_id: p.serviceId,
              p_start_at: p.slot,
              p_pay_at_shop: payAtShop,
              p_extra_ids: p.extras,
              p_notes: null,
            });
        if (e) throw e;
        created.push(String(data));
      }
      if (!payAtShop) {
        const { error: e } = await rpcAny('submit_group_payment', {
          p_booking_ids: created,
          p_method: activeMethod,
          p_transaction_ref: 'whatsapp',
          p_proof_path: '',
        });
        if (e) throw e;
      }
      const url = buildWhatsAppUrl(settings.data?.shop_whatsapp ?? '', buildMessage(activeMethod));
      setResult({ method: activeMethod, waUrl: url });
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['slots'] });
      void queryClient.invalidateQueries({ queryKey: ['next_slot'] });
      setStep('done');
      // مش كل المتصفحات بتسمح بفتح واتساب تلقائي بعد عملية async، فالزرار في صفحة النجاح هو الأساس
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      let cancelFailed = 0;
      for (const id of created) {
        const r = await rpcAny('customer_cancel_booking', { p_booking_id: id }).catch(() => ({ error: { message: 'x' } }));
        if (r.error) cancelFailed += 1;
      }
      // المواعيد المعروضة ممكن تكون قديمة، فنحدّثها
      void queryClient.invalidateQueries({ queryKey: ['group-slots'] });
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      if (cancelFailed > 0) {
        setError(
          isAr
            ? 'الحجز ماكملش، ومعاد اتسجّل ومتلغاش تلقائي. افتح حجوزاتي وألغيه بإيدك.'
            : 'Booking did not complete and one slot stayed booked. Open My bookings and cancel it.',
        );
        return;
      }
      const base = friendlyError(e);
      setError(
        failedIdx >= 0 && extractErrorCode(e) === 'SLOT_TAKEN'
          ? `${base} (${isAr ? `الشخص ${failedIdx + 1}` : `Person ${failedIdx + 1}`})`
          : base,
      );
      // السبب الحقيقي من قاعدة البيانات، عشان لو حصلت مشكلة نعرف نصلحها بسرعة
      const raw = (e as { message?: string } | null)?.message;
      setErrorDetail(raw && extractErrorCode(e) === 'UNKNOWN' ? String(raw).slice(0, 200) : null);
    } finally {
      setBusy(false);
    }
  };

  const copyNumber = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
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
  const methodLabel = (m: PayChoice) =>
    m === 'shop' ? (isAr ? 'الدفع في المحل' : 'Pay at the shop') : m === 'instapay' ? 'InstaPay' : isAr ? 'فودافون كاش' : 'Vodafone Cash';
  const methodSub = (m: PayChoice) =>
    m === 'shop'
      ? isAr ? 'ادفع كاش أو إنستا لما تيجي' : 'Pay when you arrive'
      : isAr ? 'حوّل الإجمالي وابعت الإيصال على واتساب' : 'Transfer the total and send the receipt on WhatsApp';
  const MethodIcon = ({ m }: { m: PayChoice }) =>
    m === 'shop' ? <Store className="size-5" aria-hidden /> : m === 'instapay' ? <Landmark className="size-5" aria-hidden /> : <Smartphone className="size-5" aria-hidden />;

  const payValue =
    activeMethod === 'instapay'
      ? settings.data?.instapay_number?.trim() ?? ''
      : activeMethod === 'vodafone_cash'
        ? settings.data?.vodafone_cash_number?.trim() ?? ''
        : '';
  const payLink = activeMethod === 'instapay' ? instapayLink(payValue) : null;

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
            <p className="text-xs text-ink-70">
              {isAr ? `اخترت ${picks.length} من 3` : `${picks.length} of 3 selected`}
            </p>
            {servicesQuery.isLoading ? <Skeleton className="h-32" /> : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {services.map((s) => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    selected={picks.some((p) => p.serviceId === s.id)}
                    onSelect={() => toggleService(s.id)}
                  />
                ))}
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
                staffOptions={eligibleFor(p)}
                staffValue={resolveStaff(p)}
                onStaff={(id) => updatePick(idx, { staff: id, slot: null })}
                noneOffers={noneOffers(p)}
                extrasOptions={extras.filter((x) => {
                  const st = resolveStaff(p);
                  if (activeStaff.length === 0) return true;
                  if (st && st !== 'any') return offers(st, [x.id]);
                  return eligibleFor(p, [...p.extras.filter((i) => i !== x.id), x.id]).length > 0;
                })}
                selectedExtras={p.extras}
                onExtras={(ids) => updatePick(idx, { extras: ids })}
                onDate={(d) => updatePick(idx, { date: d, slot: null })}
                onSlot={(s) => updatePick(idx, { slot: s })}
              />
            ))}
            <div className="flex gap-2">
              <Button variant="secondary" className="w-full" onClick={() => setStep('services')}>{isAr ? 'رجوع' : 'Back'}</Button>
              <Button className="w-full" disabled={picks.some((p) => !p.slot || noneOffers(p))} onClick={() => setStep('review')}>
                {isAr ? 'كمّل' : 'Continue'}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 'review' ? (
          <section className="space-y-4">
            <ul className="divide-y divide-bark/10 rounded-card border border-default bg-white">
              {picks.map((p, idx) => {
                const s = byId.get(p.serviceId);
                return (
                  <li key={p.serviceId} className="flex items-start justify-between gap-3 p-3 text-sm">
                    <span className="min-w-0 break-words">
                      <span className="block text-xs text-ink-70">{isAr ? `الشخص ${idx + 1}` : `Person ${idx + 1}`}</span>
                      <span className="font-medium text-espresso">{s ? nameOf(s) : ''}</span>
                      {staffLabel(p) ? <span className="block text-xs text-ink-70">✂ {staffLabel(p)}</span> : null}
                      <span className="block text-xs text-ink-70 font-latin">{p.slot ? formatCairoTime(p.slot, i18n.language) : ''}</span>
                      {p.extras.length > 0 ? (
                        <span className="block text-xs text-ink-70">
                          + {p.extras.map((id) => (isAr ? extrasById.get(id)?.name_ar : extrasById.get(id)?.name_en)).join(' · ')}
                        </span>
                      ) : null}
                    </span>
                    <span className="font-latin shrink-0">{priceMayVary(p) ? '~' : ''}{formatEGP(priceOfPick(p))}</span>
                  </li>
                );
              })}
              <li className="flex items-center justify-between p-3 font-bold text-espresso">
                <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                <span className="font-latin">{formatEGP(total)}</span>
              </li>
            </ul>
            {picks.some(priceMayVary) ? (
              <p className="text-xs text-ink-70">
                {isAr ? '~ السعر النهائي بيتحدد حسب الحلاق اللي هيتعيّن لك، وبيظهر في حجوزاتي.' : '~ The final price depends on the barber assigned to you and shows in My bookings.'}
              </p>
            ) : null}
            <p className="text-xs text-ink-70">
              {isAr ? 'لسه محجوزش حاجة. الحجز بيتسجل لما تختار طريقة الدفع وتأكد في الخطوة الجاية.' : 'Nothing is booked yet. Your booking is saved once you choose a payment method and confirm on the next step.'}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="w-full" onClick={() => setStep('times')}>{isAr ? 'رجوع' : 'Back'}</Button>
              <Button className="w-full" onClick={() => setStep('pay')}>{isAr ? 'اختار طريقة الدفع' : 'Choose payment'}</Button>
            </div>
          </section>
        ) : null}

        {step === 'pay' ? (
          <section className="space-y-4">
            <div className="rounded-card bg-gold p-5 text-center">
              <p className="text-sm text-espresso/80">{isAr ? 'الإجمالي' : 'Total'}</p>
              <p className="font-latin text-3xl font-bold text-espresso">{formatEGP(total)}</p>
            </div>

            {availableMethods.length === 0 ? (
              <p className="rounded-btn bg-sand/50 p-3 text-sm text-ink">
                {isAr ? 'مفيش طرق دفع متاحة دلوقتي، كلّم المحل.' : 'No payment methods are available right now, contact the shop.'}
              </p>
            ) : (
              <div className="grid gap-2">
                {availableMethods.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMethod(m); setError(null); setCopied(false); }}
                    aria-pressed={activeMethod === m}
                    className={cn(
                      'flex items-center gap-3 rounded-card border p-3 text-start transition-colors',
                      activeMethod === m ? 'border-gold bg-gold/15' : 'border-default bg-white',
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sand text-espresso"><MethodIcon m={m} /></span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-espresso">{methodLabel(m)}</span>
                      <span className="block text-xs text-ink-70">{methodSub(m)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {activeMethod && activeMethod !== 'shop' && payValue ? (
              <div className="space-y-3 rounded-card border border-default bg-sand/30 p-4">
                {payLink ? (
                  <a href={payLink} target="_blank" rel="noopener noreferrer" className="block">
                    <span className="inline-flex min-h-12 w-full items-center justify-center rounded-btn bg-gold px-5 font-semibold text-espresso">
                      {isAr ? 'افتح إنستاباي وادفع' : 'Open InstaPay'}
                    </span>
                  </a>
                ) : (
                  <div className="flex items-center justify-between gap-2 rounded-btn border border-default bg-white p-2.5">
                    <span dir="ltr" className="select-all font-latin text-base font-bold text-espresso">{payValue}</span>
                    <button
                      type="button"
                      onClick={() => void copyNumber(payValue)}
                      className="flex items-center gap-1 rounded bg-gold/20 px-3 py-1.5 text-xs font-medium text-espresso"
                    >
                      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                      {copied ? (isAr ? 'اتنسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}
                    </button>
                  </div>
                )}
                <p className="text-xs text-ink-70">
                  {isAr
                    ? 'حوّل الإجمالي كله مرة واحدة، وبعدين دوس الزرار تحت. هيتسجل الحجز ويفتحلك واتساب برسالة جاهزة، ابعت فيها صورة التحويل.'
                    : 'Transfer the whole total once, then tap the button below. Your booking is saved and WhatsApp opens with a ready message, send the transfer screenshot there.'}
                </p>
              </div>
            ) : null}

            {activeMethod === 'shop' ? (
              <p className="rounded-card border border-default bg-sand/30 p-3 text-xs text-ink-70">
                {isAr ? 'هيتأكد حجزك على طول وتدفع في المحل لما تيجي. تقدر تبعتلنا رسالة واتساب بالتفاصيل بعد التأكيد.' : 'Your booking is confirmed right away and you pay at the shop. You can send us the details on WhatsApp after confirming.'}
              </p>
            ) : null}

            {error ? (
              <div role="alert" className="rounded-btn border border-danger/30 bg-danger/5 p-3">
                <p className="text-sm font-medium text-danger">{error}</p>
                {errorDetail ? <p dir="ltr" className="mt-1 break-words font-latin text-[11px] text-ink-70">{errorDetail}</p> : null}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button variant="secondary" className="w-full" disabled={busy} onClick={() => setStep('review')}>{isAr ? 'رجوع' : 'Back'}</Button>
              <Button className="w-full" disabled={!activeMethod} loading={busy} onClick={() => void confirmAll(false)}>
                {activeMethod === 'shop'
                  ? isAr ? 'أكد الحجز' : 'Confirm booking'
                  : isAr ? 'سجّل الحجز وابعت واتساب' : 'Book and send on WhatsApp'}
              </Button>
            </div>
          </section>
        ) : null}

        {step === 'done' && result ? (
          <section className="space-y-4 rounded-card border border-gold/40 bg-white p-5 text-center">
            <p className="text-lg font-bold text-espresso">
              {result.method === 'shop'
                ? isAr ? 'تمام، حجزك اتأكد ✅' : 'Done, your booking is confirmed ✅'
                : isAr ? 'حجزك وصل ✅' : 'Your booking was received ✅'}
            </p>
            <p className="text-sm text-ink-70">
              {result.method === 'shop'
                ? isAr ? 'ادفع في المحل لما تيجي، وهنستناك في المعادات اللي اخترتها.' : 'Pay at the shop when you arrive. We will be waiting at your chosen times.'
                : isAr ? 'ابعت صورة التحويل على واتساب والمحل هيأكد الدفع ويبعتلك تأكيد.' : 'Send the transfer screenshot on WhatsApp and the shop will confirm the payment.'}
            </p>
            <ul className="divide-y divide-bark/10 rounded-card border border-default text-start text-sm">
              {picks.map((p, idx) => {
                const s = byId.get(p.serviceId);
                return (
                  <li key={p.serviceId} className="flex items-center justify-between gap-3 p-3">
                    <span>{isAr ? `الشخص ${idx + 1}` : `Person ${idx + 1}`} · {s ? nameOf(s) : ''}{staffLabel(p) ? ` · ${staffLabel(p)}` : ''}</span>
                    <span className="font-latin text-xs text-ink-70">{p.slot ? formatCairoTime(p.slot, i18n.language) : ''}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-col gap-2">
              {result.waUrl ? (
                <a href={result.waUrl} target="_blank" rel="noopener noreferrer">
                  <span className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-btn bg-espresso px-5 font-semibold text-cream">
                    <MessageCircle className="size-5" aria-hidden />
                    {result.method === 'shop'
                      ? isAr ? 'ابعت التفاصيل على واتساب' : 'Send details on WhatsApp'
                      : isAr ? 'افتح واتساب وابعت الإيصال' : 'Open WhatsApp and send the receipt'}
                  </span>
                </a>
              ) : null}
              <Link to="/bookings" className="text-sm text-gold underline">{isAr ? 'حجوزاتي' : 'My bookings'}</Link>
            </div>
          </section>
        ) : null}
      </div>

      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onComplete={() => { setShowProfileModal(false); void confirmAll(true); }}
        initialName={profile.data?.full_name ?? ''}
        initialPhone={profile.data?.phone ?? ''}
      />
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
  staffOptions,
  staffValue,
  onStaff,
  noneOffers,
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
  staffOptions: StaffMember[];
  staffValue: string | null;
  onStaff: (id: string) => void;
  noneOffers: boolean;
  extrasOptions: Service[];
  selectedExtras: string[];
  onExtras: (ids: string[]) => void;
  onDate: (d: string) => void;
  onSlot: (s: string) => void;
}) {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const slotsQuery = useQuery({
    queryKey: ['group-slots', serviceId, date, staffValue],
    enabled: !!date && !!serviceId && !noneOffers,
    queryFn: async () => {
      const { data, error } = !staffValue
        ? await rpcAny('get_available_slots', { p_service_id: serviceId, p_date: date })
        : staffValue === 'any'
          ? await rpcAny('get_available_slots_any', { p_service_id: serviceId, p_date: date })
          : await rpcAny('get_available_slots_staff', { p_service_id: serviceId, p_date: date, p_staff_id: staffValue });
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
      {noneOffers ? (
        <p className="rounded-btn bg-sand/50 p-2 text-xs text-ink">
          {isAr ? 'مفيش حلاق بيقدم الخدمة والإضافات دي مع بعض. غيّر الإضافات.' : 'No barber offers this service with these add-ons. Change the add-ons.'}
        </p>
      ) : null}
      {staffOptions.length >= 2 ? (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onStaff('any')}
            aria-pressed={staffValue === 'any'}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
              staffValue === 'any' ? 'border-gold bg-gold/20 font-semibold' : 'border-default bg-white',
            )}
          >
            ✂ {isAr ? 'أي حلاق' : 'Any barber'}
          </button>
          {staffOptions.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onStaff(m.id)}
              aria-pressed={staffValue === m.id}
              className={cn(
                'flex min-w-0 max-w-full items-center gap-1.5 rounded-full border py-1 pe-3 ps-1 text-xs transition-colors',
                staffValue === m.id ? 'border-gold bg-gold/20 font-semibold' : 'border-default bg-white',
              )}
            >
              <StaffAvatar member={m} className="size-6 text-[10px]" />
              <span className="truncate">{m.name}</span>
            </button>
          ))}
        </div>
      ) : null}
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
          <div className="grid gap-1.5 sm:grid-cols-2">
            {extrasOptions.map((x) => (
              <ExtraCard
                key={x.id}
                compact
                extra={x}
                selected={selectedExtras.includes(x.id)}
                onToggle={() =>
                  onExtras(selectedExtras.includes(x.id) ? selectedExtras.filter((i) => i !== x.id) : [...selectedExtras, x.id])
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
