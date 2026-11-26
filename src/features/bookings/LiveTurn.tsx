import { swapOutcome, swapWindowText } from './swapOutcome';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Clock, MonitorSmartphone, Hourglass, Radio, Timer, Users, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { useSettings } from '@/features/home/useHomeData';

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;
type Turn = { status: string; start_at: string; ahead: number; busy_now: boolean; eta: string; late_min: number; called_at: string | null; my_eta_minutes: number | null; eta_request?: number | null; eta_status?: 'pending' | 'approved' | 'declined' | null };

const fmtTime = (iso: string, ar: boolean) => new Intl.DateTimeFormat(ar ? 'ar-EG-u-nu-latn' : 'en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const cairoDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(d);

/** كارت الدور اللايف + «هتأخر / بدري» + «بدّل معادي» — بيظهر يوم الحجز بس */
export function LiveTurn({ bookingId, startAt, endAt }: { bookingId: string; startAt: string; endAt: string }) {
  const { i18n } = useTranslation();
  const ar = !!i18n.language?.startsWith('ar');
  const L = (a: string, e: string) => (ar ? a : e);
  const qc = useQueryClient();
  const isToday = cairoDay(new Date(startAt)) === cairoDay(new Date());
  const active = new Date(endAt).getTime() > Date.now();
  const q = useQuery({
    queryKey: ['my-turn', bookingId],
    enabled: isToday && active,
    refetchInterval: 20_000,
    queryFn: async () => {
      const r = await rpc('my_turn', { p_booking_id: bookingId });
      if (r.error) throw new Error(r.error.message);
      return r.data as Turn;
    },
  });
  const eta = useMutation({
    mutationFn: async (m: number) => {
      const r = await rpc('set_eta', { p_booking_id: bookingId, p_minutes: m });
      if (r.error) throw new Error(r.error.message);
      return m;
    },
    onSuccess: (m) => {
      toast.success(m === 0 ? L('تمام، مستنينك في معادك ✂️', 'See you on time ✂️') : L('اتبعت طلبك للمحل — هنبلغك أول ما يرد', 'Request sent — we’ll notify you'));
      void qc.invalidateQueries({ queryKey: ['my-turn', bookingId] });
      void qc.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (e) => toast.error((e as Error).message.includes('ETA_OFF') ? L('الطلبات دي متوقفة حالياً — تعالى في معادك 🙏', 'These requests are turned off — please come on time') : L('معرفناش نسجّل ده، جرّب تاني', 'Could not save, try again')),
  });
  const [swapOpen, setSwapOpen] = useState(false);
  // مفاتيح من لوحة التحكم (لو العمود لسه مش موجود = شغال زي الأول)
  const st = useSettings().data as (Record<string, unknown> | null | undefined);
  const etaOn = st?.eta_requests_enabled !== false;
  const swapsOn = st?.swaps_enabled !== false;
  if (!active) return null;
  const t = q.data;
  const called = t?.called_at && Date.now() - Date.parse(t.called_at) < 10 * 60_000;
  return (
    <div className="mt-3 space-y-2">
      {isToday && t ? (
        <div className={cn('relative overflow-hidden rounded-card border p-3', called ? 'border-success bg-success/10' : 'border-gold/40 bg-gold/5')}>
          {called ? (
            <p className="flex items-center gap-2 text-base font-bold text-success"><Radio className="size-5 animate-pulse" />{L('دورك! اتفضل 💈', "It's your turn! 💈")}</p>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-bark"><span className="relative flex size-2"><span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" /><span className="relative size-2 rounded-full bg-red-500" /></span>{L('دورك لايف', 'Live turn')}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-btn bg-white p-2"><p className="flex items-center justify-center gap-1 text-[11px] text-ink"><Users className="size-3.5" />{L('قدامك', 'Ahead of you')}</p><p className="font-latin text-xl font-bold text-espresso">{t.ahead}</p></div>
                <div className="rounded-btn bg-white p-2"><p className="flex items-center justify-center gap-1 text-[11px] text-ink"><Hourglass className="size-3.5" />{L('معادك المتوقع', 'Expected time')}</p><p className="font-latin text-xl font-bold text-espresso">{fmtTime(t.eta, ar)}</p></div>
              </div>
              {t.eta_status === 'pending' && t.eta_request ? (
                <p className="mt-2 flex items-center gap-1.5 rounded-btn bg-amber-500/10 px-2 py-1.5 text-xs font-semibold text-warning"><Hourglass className="size-3.5 animate-pulse" />{t.eta_request > 0 ? L(`طلبت تتأخر ${t.eta_request} دقيقة — مستني موافقة المحل`, `Asked for ${t.eta_request} min — waiting for approval`) : L(`طلبت تيجي بدري ${Math.abs(t.eta_request)} دقيقة — مستني موافقة المحل`, `Asked to come ${Math.abs(t.eta_request)} min early — waiting`)}</p>
              ) : t.eta_status === 'approved' && t.eta_request ? (
                <p className="mt-2 rounded-btn bg-success/10 px-2 py-1.5 text-xs font-semibold text-success">✅ {t.eta_request > 0 ? L(`المحل وافق — تقدر تيجي متأخر ${t.eta_request} دقيقة`, `Approved — ${t.eta_request} min later`) : L(`المحل وافق — تقدر تيجي بدري ${Math.abs(t.eta_request)} دقيقة`, `Approved — ${Math.abs(t.eta_request)} min early`)}</p>
              ) : t.eta_status === 'declined' ? (
                <p className="mt-2 rounded-btn bg-sand px-2 py-1.5 text-xs text-ink">{L('المحل مش هيقدر المرة دي — ياريت تيجي في معادك 🙏', 'Not possible this time — please come on time 🙏')}</p>
              ) : null}
              {t.late_min > 0 ? <p className="mt-2 text-xs text-warning">{L(`الشغل متأخر حوالي ${t.late_min} دقيقة النهارده — معلش 🙏`, `Running about ${t.late_min} min late today`)}</p> : null}
            </>
          )}
        </div>
      ) : null}
      {!called ? (
        <div className="flex flex-wrap gap-1.5">
          {etaOn ? [10, 20].map((m) => (
            <button key={m} type="button" disabled={eta.isPending} onClick={() => eta.mutate(m)} className={cn('inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-transform active:scale-95', (t?.eta_status === 'pending' ? t?.eta_request : t?.my_eta_minutes) === m ? 'border-warning bg-warning/15 text-warning' : 'border-default bg-white text-espresso')}><Timer className="size-3.5" />{L(`محتاج أتأخر ${m} د`, `Need ${m} min more`)}</button>
          )) : null}
          {etaOn ? <button type="button" disabled={eta.isPending} onClick={() => eta.mutate(-15)} className={cn('inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-transform active:scale-95', ((t?.eta_status === 'pending' ? t?.eta_request : t?.my_eta_minutes) ?? 0) < 0 ? 'border-success bg-success/10 text-success' : 'border-default bg-white text-espresso')}><Zap className="size-3.5" />{L('ممكن آجي بدري؟', 'Can I come early?')}</button> : null}
          <button type="button" disabled={eta.isPending} onClick={() => eta.mutate(0)} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-default bg-white px-3 text-xs font-semibold text-espresso transition-transform active:scale-95"><Clock className="size-3.5" />{L('في معادي', 'On time')}</button>
          <Link to={`/turn/${bookingId}`} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-espresso px-3 text-xs font-semibold text-cream transition-transform active:scale-95"><MonitorSmartphone className="size-3.5" />{L('افتح شاشة الدور', 'Open turn screen')}</Link>
          {swapsOn ? <button type="button" onClick={() => setSwapOpen((v) => !v)} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-default bg-white px-3 text-xs font-semibold text-espresso transition-transform active:scale-95"><ArrowLeftRight className="size-3.5" />{L('بدّل معادي مع حد', 'Swap with someone')}</button> : null}
        </div>
      ) : null}
      {swapOpen && swapsOn ? <SwapPicker bookingId={bookingId} startAt={startAt} onDone={() => setSwapOpen(false)} /> : null}
    </div>
  );
}

function SwapPicker({ bookingId, startAt, onDone }: { bookingId: string; startAt: string; onDone: () => void }) {
  const { i18n } = useTranslation();
  const ar = !!i18n.language?.startsWith('ar');
  const L = (a: string, e: string) => (ar ? a : e);
  const swapSt = useSettings().data as (Record<string, unknown> | null | undefined);
  const winTxt = swapWindowText(swapSt?.swap_window_min, ar);
  // التبديل بس مع حجوزات قريبة من معادك (في حدود ساعتين قبل/بعد) في نفس اليوم
  const day = cairoDay(new Date(startAt));
  const q = useQuery({
    queryKey: ['swap-candidates', bookingId, day],
    queryFn: async () => {
      const r = await rpc('swap_candidates', { p_booking_id: bookingId, p_date: day });
      if (r.error) throw new Error(r.error.message);
      return ((r.data ?? []) as Array<{ start_at: string }>).map((x) => x.start_at).filter((x) => x !== startAt);
    },
  });
  const req = useMutation({
    mutationFn: async (target: string) => {
      const r = await rpc('request_swap', { p_booking_id: bookingId, p_target_start: target });
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => { toast.success(L('بعتنا الطلب 🔄 — هنبلغك لما يرد', 'Request sent 🔄 — we’ll let you know')); onDone(); },
    onError: (e) => toast.error((e as Error).message.includes('SWAPS_OFF') ? L('التبديل متوقف حالياً', 'Swapping is turned off') : (e as Error).message.includes('PENDING') ? L('فيه طلب تبديل مستني رد بالفعل', 'A swap request is already pending') : L('المعاد ده مش متاح للتبديل', 'That time is not available to swap')),
  });
  return (
    <div className="animate-rise rounded-card border border-default bg-white p-3">
      <p className="text-sm font-semibold text-espresso">{L('اختار معاد قريب من معادك عايز تبدّل معاه', 'Pick a nearby booked time to swap with')}</p>
      <p className="text-[11px] text-ink">{L('هنبعت لصاحب المعاد طلب من غير ما نقوله اسمك، ولو وافق المعادين بيتبدّلوا لوحدهم.', 'We ask the other customer anonymously; if they accept, times swap automatically.')} ({winTxt})</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {q.isLoading ? <span className="text-xs text-ink">…</span> : (q.data ?? []).length === 0 ? <span className="text-xs text-ink">{L('مفيش مواعيد قريبة من معادك متاحة للتبديل دلوقتي', 'No nearby times available to swap right now')}</span>
          : q.data!.map((s) => <button key={s} type="button" disabled={req.isPending} onClick={() => req.mutate(s)} className="min-h-9 rounded-btn border border-gold/50 bg-gold/10 px-3 font-latin text-sm font-semibold text-espresso transition-transform active:scale-95">{fmtTime(s, ar)}</button>)}
      </div>
    </div>
  );
}

/** الرد على طلب تبديل (من الإشعار) */
export function SwapRespond({ swapId, onDone }: { swapId: string; onDone?: () => void }) {
  const { i18n } = useTranslation();
  const ar = !!i18n.language?.startsWith('ar');
  const L = (a: string, e: string) => (ar ? a : e);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (accept: boolean) => {
      const r = await rpc('respond_swap', { p_swap_id: swapId, p_accept: accept });
      if (r.error) throw new Error(r.error.message);
      return swapOutcome(r.data, accept);
    },
    onSuccess: (res) => {
      if (res === 'accepted') toast.success(L('اتبدّل المعاد ✅', 'Swapped ✅'));
      else if (res === 'declined') toast.success(L('تمام، معادك زي ما هو', 'OK, your time stays'));
      else if (res === 'expired') toast.error(L('الطلب ده خلص أو اتلغى', 'This request is no longer available'));
      else toast(L('مش متأكدين من النتيجة، راجع حجوزاتك', 'We could not confirm the result, please check your bookings'));
      void qc.invalidateQueries({ queryKey: ['bookings'] });
      onDone?.();
    },
    onError: () => {
      toast.error(L('الطلب ده خلص أو اتلغى', 'This request is no longer available'));
      // the server raises EXPIRED without saving anything; ask it to close stale requests for real, then refresh this card
      void rpc('expire_stale_swaps').catch(() => undefined).finally(() => { void qc.invalidateQueries({ queryKey: ['swap-status', swapId] }); });
    },
  });
  const status = useQuery({
    queryKey: ['swap-status', swapId],
    queryFn: async () => {
      try {
        const r = await (supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { status?: string } | null }> } } } }).from('booking_swaps').select('status').eq('id', swapId).maybeSingle();
        return r.data?.status ?? null;
      } catch { return null; }
    },
    staleTime: 10_000,
  });
  if (status.data && status.data !== 'pending') {
    return <p data-swap-closed className="mt-3 text-sm font-semibold text-ink">{status.data === 'accepted' ? L('اتبدّل المعاد ✅', 'Swapped ✅') : L('الطلب ده خلص أو اتلغى', 'This request is no longer available')}</p>;
  }
  return (
    <div className="mt-3 flex gap-2">
      <button type="button" disabled={m.isPending} onClick={() => m.mutate(true)} className="min-h-11 flex-1 rounded-btn bg-gold font-semibold text-espresso">{L('موافق أبدّل', 'Accept')}</button>
      <button type="button" disabled={m.isPending} onClick={() => m.mutate(false)} className="min-h-11 flex-1 rounded-btn border border-default bg-white font-semibold text-espresso">{L('لا شكراً', 'Decline')}</button>
    </div>
  );
}
