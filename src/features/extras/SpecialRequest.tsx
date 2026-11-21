import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Star, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

type Rpc = (fn: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

type Cfg = { is_enabled: boolean; surcharge_pct: number; max_days_ahead: number };

function useCfg() {
  return useQuery({
    queryKey: ['special-config'],
    staleTime: 60_000,
    queryFn: async () => {
      const r = await rpc('get_special_config');
      if (r.error) return null;
      return (r.data ?? null) as Cfg | null;
    },
  });
}

const fmtTime = (iso: string, ar: boolean) =>
  new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const fmtDay = (iso: string, ar: boolean) =>
  new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-US', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));

/** تحت المواعيد: "مفيش معاد يناسبني؟" → يطلب معاد في وقت مقفول بسعر أعلى والأدمن يقبل أو يرفض */
export function SpecialRequestPrompt({ day, serviceId }: { day: string; serviceId: string | null }) {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const L = (ar: string, en: string) => (isAr ? ar : en);
  const qc = useQueryClient();
  const cfg = useCfg();
  const [open, setOpen] = useState(false);
  const [d, setD] = useState(day);
  const [slot, setSlot] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const slots = useQuery({
    queryKey: ['special-slots', serviceId, d],
    enabled: open && !!serviceId && !!d,
    queryFn: async () => {
      const r = await rpc('get_special_slots', { p_service_id: serviceId, p_date: d });
      if (r.error) throw new Error(r.error.message);
      return (r.data ?? []) as Array<{ start_at: string; price_egp: number }>;
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const r = await rpc('create_special_request', { p_service_id: serviceId, p_start_at: slot, p_note: note || null });
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => {
      toast.success(L('اتبعت الطلب ✅ هتوصلك إشعار بالقرار.', 'Request sent ✅ you will be notified of the decision.'));
      setOpen(false); setSlot(null); setNote('');
      void qc.invalidateQueries({ queryKey: ['my-special-requests'] });
      void qc.invalidateQueries({ queryKey: ['special-slots'] });
    },
    onError: (e: Error) => {
      const m = e.message;
      toast.error(m.includes('TOO_MANY') ? L('عندك طلبات معلّقة كتير. استنى القرار.', 'Too many pending requests. Please wait.')
        : m.includes('SLOT_TAKEN') ? L('المعاد ده اتاخد. اختار غيره.', 'That time was taken. Pick another.')
        : L('معرفناش نبعت الطلب. جرّب تاني.', 'Could not send the request. Try again.'));
      void qc.invalidateQueries({ queryKey: ['special-slots'] });
    },
  });

  if (!cfg.data?.is_enabled || !serviceId) return null;
  const maxDate = new Date(Date.now() + cfg.data.max_days_ahead * 86400000).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
  const minDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });

  if (!open) {
    return (
      <button type="button" onClick={() => { setD(day); setOpen(true); }} className="flex w-full items-center gap-3 rounded-card border border-gold/50 bg-gold/10 p-3 text-start transition active:scale-[0.99]">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold text-espresso"><Star className="size-5" aria-hidden /></span>
        <span className="min-w-0">
          <span className="block font-semibold text-espresso">{L('مفيش معاد يناسبني؟', 'No time suits you?')}</span>
          <span className="block text-xs text-ink">{L('اطلب معاد في وقت مقفول (بسعر أعلى) والمحل يرد عليك.', 'Request a closed-hours time (higher price) and the shop will reply.')}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-card border border-gold/50 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-espresso"><Star className="size-4 text-gold" aria-hidden />{L('طلب معاد خاص', 'Special time request')}</h3>
        <button type="button" aria-label={L('إغلاق', 'Close')} onClick={() => setOpen(false)} className="p-1 text-ink"><X className="size-5" /></button>
      </div>
      <p className="mt-1 text-xs text-ink">{L(`المواعيد دي برّه ساعات الشغل العادية، بزيادة ${cfg.data.surcharge_pct}% على السعر. مش مؤكدة غير لما المحل يقبل.`, `These are outside normal hours at +${cfg.data.surcharge_pct}%. Not confirmed until the shop accepts.`)}</p>
      <label className="mt-3 block text-sm font-medium text-espresso">
        {L('اليوم', 'Day')}
        <input type="date" value={d} min={minDate} max={maxDate} onChange={(e) => { setD(e.target.value); setSlot(null); }} className="mt-1 block min-h-11 w-full rounded-btn border border-bark/20 bg-white px-3" />
      </label>
      <div className="mt-3">
        {slots.isLoading ? <p className="text-sm text-ink">…</p>
          : slots.isError ? <p className="text-sm text-danger">{L('حصل خطأ في تحميل المواعيد', 'Could not load times')}</p>
          : (slots.data ?? []).length === 0 ? <p className="text-sm text-ink">{L('مفيش مواعيد خاصة متاحة في اليوم ده. جرّب يوم تاني.', 'No special times available that day. Try another day.')}</p>
          : (
            <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-3 sm:grid-cols-4">
              {(slots.data ?? []).map((s) => (
                <button key={s.start_at} type="button" onClick={() => setSlot(s.start_at)}
                  className={cn('min-h-11 rounded-btn border px-2 py-1.5 text-center text-sm transition', slot === s.start_at ? 'border-gold bg-gold text-espresso' : 'border-bark/20 bg-white text-espresso hover:bg-sand')}>
                  <span className="flex items-center justify-center gap-1 font-latin font-semibold" dir="ltr"><Clock className="size-3" aria-hidden />{fmtTime(s.start_at, false)}</span>
                  <span className="block text-[11px] opacity-80">{s.price_egp} {L('ج', 'EGP')}</span>
                </button>
              ))}
            </div>
          )}
      </div>
      {slot ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-espresso">{fmtDay(slot, isAr)} · <span className="font-latin" dir="ltr">{fmtTime(slot, isAr)}</span></p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} placeholder={L('ملاحظة للمحل (اختياري)', 'Note for the shop (optional)')} className="w-full rounded-btn border border-bark/20 p-2 text-sm" />
          <Button className="w-full" loading={send.isPending} onClick={() => send.mutate()}>{L('ابعت الطلب', 'Send request')}</Button>
        </div>
      ) : null}
    </div>
  );
}

type MyReq = { id: string; start_at: string; price_egp: number; status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled'; reject_reason: string | null; created_at: string };

/** حالة طلباتي الخاصة (في حجوزاتي) */
export function MySpecialRequests() {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const L = (ar: string, en: string) => (isAr ? ar : en);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['my-special-requests'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: unknown; error: unknown }> } } } })
        .from('special_requests').select('id, start_at, price_egp, status, reject_reason, created_at').order('created_at', { ascending: false }).limit(10);
      if (error) return [] as MyReq[];
      return (data ?? []) as MyReq[];
    },
  });
  const cancel = useMutation({
    mutationFn: async (id: string) => { const r = await rpc('cancel_special_request', { p_id: id }); if (r.error) throw new Error(r.error.message); },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-special-requests'] }),
  });
  const weekAgo = Date.now() - 7 * 86400000;
  const rows = (q.data ?? []).filter((r) => r.status === 'pending' || (['accepted', 'rejected'].includes(r.status) && new Date(r.created_at).getTime() > weekAgo));
  if (rows.length === 0) return null;
  const meta: Record<MyReq['status'], [string, string, string]> = {
    pending: ['بانتظار رد المحل', 'Waiting for the shop', 'bg-gold/20 text-espresso'],
    accepted: ['اتقبل ✅ (اتأكد في حجوزاتك)', 'Accepted ✅ (confirmed in your bookings)', 'bg-emerald-100 text-emerald-800'],
    rejected: ['اترفض', 'Rejected', 'bg-red-100 text-red-800'],
    expired: ['انتهى', 'Expired', 'bg-black/10 text-ink'],
    cancelled: ['ملغي', 'Cancelled', 'bg-black/10 text-ink'],
  };
  return (
    <section className="mb-4 space-y-2">
      <h2 className="text-sm font-semibold text-espresso">{L('طلباتي الخاصة', 'My special requests')}</h2>
      {rows.map((r) => (
        <div key={r.id} className="rounded-card border border-default bg-white p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-espresso">{fmtDay(r.start_at, isAr)} · <span className="font-latin" dir="ltr">{fmtTime(r.start_at, isAr)}</span> · {r.price_egp} {L('ج', 'EGP')}</p>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', meta[r.status][2])}>{L(meta[r.status][0], meta[r.status][1])}</span>
          </div>
          {r.status === 'rejected' && r.reject_reason ? <p className="mt-1 text-xs text-ink">{r.reject_reason}</p> : null}
          {r.status === 'pending' ? <Button size="sm" variant="secondary" className="mt-2" loading={cancel.isPending} onClick={() => cancel.mutate(r.id)}>{L('إلغاء الطلب', 'Cancel request')}</Button> : null}
        </div>
      ))}
    </section>
  );
}
