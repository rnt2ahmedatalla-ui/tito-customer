import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { buildWhatsAppUrl } from '@/lib/urls';
import { useAuth } from '@/features/profile/useAuth';
import { cn } from '@/lib/cn';

type Rpc = (fn: string, a?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;
const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(d);

/** للعريس: كلمنا واتساب + اطلب أي معاد حتى لو مش ظاهر (المحل بيشوف ويرد) */
export function GroomRequest({ serviceId, serviceName, whatsapp, onSignIn }: { serviceId: string | null; serviceName: string; whatsapp?: string | null; onSignIn: () => void }) {
  const { i18n } = useTranslation();
  const ar = !!i18n.language?.startsWith('ar');
  const L = (a: string, e: string) => (ar ? a : e);
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('16:00');
  const [note, setNote] = useState('');
  const wa = whatsapp ? buildWhatsAppUrl(whatsapp, L(`أهلاً tito 👋 أنا عريس ومهتم بـ«${serviceName}». عايز أتفق معاكم على التجهيزات والمعاد المناسب.`, `Hi tito 👋 I'm a groom interested in “${serviceName}”. I'd like to agree on the details and timing.`)) : null;
  const m = useMutation({
    mutationFn: async () => {
      // الوقت بتوقيت القاهرة (مصر +02:00 شتاءً و+03:00 صيفاً)
      const guess = new Date(`${day}T${time}:00Z`);
      const cairoH = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', hour: 'numeric', hour12: false }).format(guess));
      const off = (cairoH - guess.getUTCHours() + 24) % 24;
      const start = new Date(guess.getTime() - off * 3_600_000).toISOString();
      const r = await rpc('request_groom_slot', { p_service_id: serviceId, p_start: start, p_note: note });
      if (r.error) throw new Error(r.error.message);
    },
    onSuccess: () => { toast.success(L('اتبعت طلبك 👑 — هنرد عليك في أقرب وقت', 'Request sent 👑 — we’ll reply soon')); setOpen(false); setNote(''); },
    onError: (e) => {
      const msg = (e as Error).message;
      toast.error(msg.includes('TOO_SOON') ? L('اختار معاد بعد ساعتين على الأقل', 'Pick a time at least 2 hours ahead') : msg.includes('TOO_MANY') ? L('عندك ٣ طلبات مستنية رد بالفعل', 'You already have 3 pending requests') : L('معرفناش نبعت الطلب، جرّب تاني', 'Could not send, try again'));
    },
  });
  const today = new Date();
  return (
    <div className="relative mt-3 space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#25D366]/50 bg-[#25D366]/15 px-4 text-sm font-semibold text-[#7CF2A8] transition active:scale-95">
            <MessageCircle className="size-4" />{L('كلمنا واتساب نتفق على التجهيزات', 'WhatsApp us to plan the details')}
          </a>
        ) : null}
        <button type="button" disabled={!serviceId} onClick={() => (user ? setOpen((v) => !v) : onSignIn())}
          className={cn('flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition active:scale-95', serviceId ? 'border-[#C9A24B]/60 bg-[#C9A24B]/10 text-[#E6C878]' : 'border-white/10 text-white/40')}>
          <CalendarClock className="size-4" />{serviceId ? L('المعاد اللي عايزه مش ظاهر؟ اطلبه', 'Time not shown? Request it') : L('اختار باقة الأول عشان تطلب معاد', 'Pick a package to request a time')}
        </button>
      </div>
      {open && serviceId ? (
        <div className="animate-rise space-y-2 rounded-2xl border border-[#C9A24B]/40 bg-white/[0.05] p-3">
          <p className="text-xs text-white/70">{L('اختار اليوم والساعة اللي تناسبك حتى لو مقفولة — المحل هيشوف لو يقدر يظبطها ويرد عليك.', 'Pick any day & time — the shop will check and reply.')}</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-white/70">{L('اليوم', 'Day')}
              <input type="date" dir="ltr" value={day} min={ymd(new Date(today.getTime() + 86_400_000 / 6))} max={ymd(new Date(today.getTime() + 90 * 86_400_000))} onChange={(e) => setDay(e.target.value)} className="h-11 w-full rounded-btn border border-white/15 bg-white/10 px-2 font-latin text-white [color-scheme:dark]" />
            </label>
            <label className="space-y-1 text-xs text-white/70">{L('الساعة', 'Time')}
              <input type="time" dir="ltr" step={900} value={time} onChange={(e) => setTime(e.target.value)} className="h-11 w-full rounded-btn border border-white/15 bg-white/10 px-2 font-latin text-white [color-scheme:dark]" />
            </label>
          </div>
          <textarea rows={2} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} placeholder={L('ملاحظة (اختياري): ميعاد الزفة، المكان…', 'Note (optional): ceremony time, place…')} className="w-full rounded-btn border border-white/15 bg-white/10 p-2 text-sm text-white placeholder:text-white/40" />
          <button type="button" disabled={!day || !time || m.isPending} onClick={() => m.mutate()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#E6C878] font-semibold text-[#1c0f08] transition active:scale-95 disabled:opacity-50">
            <Send className="size-4" />{m.isPending ? '…' : L('ابعت الطلب', 'Send request')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
