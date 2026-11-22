import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BellRing, Copy, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/profile/useAuth';
import { cn } from '@/lib/cn';

type Progress = {
  enabled: boolean;
  every?: number;
  total?: number;
  done?: number;
  left?: number;
  reward_ar?: string;
  reward_en?: string;
  coupon?: { code: string; until: string | null } | null;
};

export function useVisitProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['visit-progress', user?.id],
    enabled: !!user,
    retry: false,
    staleTime: 60_000,
    queryFn: async (): Promise<Progress> => {
      const { data, error } = await supabase.rpc('my_visit_progress');
      if (error || !data) return { enabled: false };
      return data as Progress;
    },
  });
}

/** هدية الزيارات: فاضلك كام زيارة على الهدية، والكود لو الهدية وصلت */
export function VisitProgressCard({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const ar = !i18n.language?.startsWith('en');
  const L = (a: string, e: string) => (ar ? a : e);
  const q = useVisitProgress();
  const p = q.data;
  if (!p?.enabled || !p.every) return null;
  const every = p.every;
  const done = p.done ?? 0;
  const left = p.left ?? every;
  const reward = (ar ? p.reward_ar : p.reward_en) || L('هدية', 'a gift');
  const copy = (code: string) =>
    void navigator.clipboard?.writeText(code).then(() => toast.success(L('اتنسخ الكود ✓', 'Code copied ✓'))).catch(() => undefined);

  return (
    <div className={cn('rounded-card border border-gold/50 bg-white p-4 shadow-2xs', compact && 'p-3')}>
      <div className="flex items-start gap-3">
        <Gift className="mt-0.5 size-6 shrink-0 text-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          {p.coupon ? (
            <>
              <p className="font-semibold text-espresso">{L(`هديتك جاهزة: ${reward} 🎁`, `Your gift is ready: ${reward} 🎁`)}</p>
              <p className="mt-0.5 text-sm text-ink">{L('استخدم الكود ده وإنت بتحجز.', 'Use this code when you book.')}</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-espresso">
                {left === 1 ? L(`فاضلك زيارة واحدة وتاخد ${reward} 🎁`, `One more visit to get ${reward} 🎁`) : left === 2 ? L(`فاضلك زيارتين وتاخد ${reward} 🎁`, `2 more visits to get ${reward} 🎁`) : L(`فاضلك ${left} زيارات وتاخد ${reward} 🎁`, `${left} more visits to get ${reward} 🎁`)}
              </p>
              <p className="mt-0.5 text-sm text-ink">{L(`كل ${every} حلاقات ليك هدية.`, `A gift every ${every} haircuts.`)}</p>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-1.5" aria-label={L(`${done} من ${every}`, `${done} of ${every}`)}>
        {Array.from({ length: every }, (_, i) => (
          <span key={i} className={cn('h-2.5 flex-1 rounded-full', i < done || p.coupon ? 'bg-gold' : 'bg-sand')} />
        ))}
      </div>
      {p.coupon ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => copy(p.coupon!.code)} className="flex flex-1 items-center justify-between gap-3 rounded-btn border-2 border-dashed border-gold bg-gold/10 px-4 py-2.5">
            <span className="font-latin text-lg font-bold tracking-widest text-espresso">{p.coupon.code}</span>
            <span className="flex items-center gap-1 text-sm font-medium text-bark"><Copy className="size-4" aria-hidden /> {L('انسخ', 'Copy')}</span>
          </button>
          <Link to="/book" className="inline-flex min-h-11 items-center justify-center rounded-btn bg-espresso px-4 font-semibold text-cream">
            {L('احجز دلوقتي', 'Book now')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

const WEEKS = [2, 3, 4, 6] as const;
const wkAr = (w: number) => (w === 1 ? 'أسبوع' : w === 2 ? 'أسبوعين' : `${w} أسابيع`);

/** «فكّرني بالحلاقة الجاية»: العميل يختار بعد كام أسبوع ويوصله إشعار فيه زرار الحجز */
export function RebookReminderPicker({ bookingId }: { bookingId: string }) {
  const { i18n } = useTranslation();
  const ar = !i18n.language?.startsWith('en');
  const L = (a: string, e: string) => (ar ? a : e);
  const qc = useQueryClient();
  const key = ['rebook-reminder', bookingId];

  const cur = useQuery({
    queryKey: key,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('rebook_reminders').select('weeks, remind_at, sent_at').eq('booking_id', bookingId).maybeSingle();
      if (error) return null;
      return data;
    },
  });

  const set = useMutation({
    mutationFn: async (weeks: number | null) => {
      const { error } = await supabase.rpc('set_rebook_reminder', { p_booking: bookingId, p_weeks: weeks });
      if (error) throw error;
      return weeks;
    },
    onSuccess: (weeks) => {
      toast.success(weeks ? L(`تمام! هنفكّرك بعد ${wkAr(weeks)} ✂️`, `Done! We'll remind you in ${weeks} weeks ✂️`) : L('اتلغى التذكير', 'Reminder removed'));
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: () => toast.error(L('مقدرناش نحفظ، جرّب تاني', 'Could not save, try again')),
  });

  const chosen = cur.data && !cur.data.sent_at ? cur.data.weeks : null;
  const when = cur.data?.remind_at && chosen
    ? new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(cur.data.remind_at))
    : null;
  if (cur.data?.sent_at) return null;

  return (
    <div className="mt-3 rounded-btn bg-sand/50 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-espresso">
        <BellRing className="size-4 text-gold" aria-hidden /> {L('فكّرني بالحلاقة الجاية بعد:', 'Remind me of my next cut in:')}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {WEEKS.map((w) => (
          <button
            key={w}
            type="button"
            aria-pressed={chosen === w}
            disabled={set.isPending}
            onClick={() => set.mutate(chosen === w ? null : w)}
            className={cn(
              'min-h-9 rounded-full border px-3 text-sm transition',
              chosen === w ? 'border-gold bg-gold font-semibold text-espresso' : 'border-default bg-white text-ink',
            )}
          >
            {L(wkAr(w), `${w} weeks`)}
          </button>
        ))}
      </div>
      {when ? <p className="mt-2 text-xs text-ink">{L(`هيوصلك إشعار ${when} الضهر. دوس تاني على نفس الاختيار عشان تلغيه.`, `You'll get a notification on ${when} at noon. Tap it again to cancel.`)}</p> : null}
    </div>
  );
}
