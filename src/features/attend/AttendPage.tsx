import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CalendarCheck2, CalendarX2, CheckCircle2, Clock, Scissors } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import { formatCairoDate, formatCairoTime } from '@/lib/time';
import { extractErrorCode } from '@/lib/errors';

type Info = {
  ok?: boolean;
  name?: string | null;
  start_at?: string;
  status?: string;
  attendance?: string | null;
  service_ar?: string | null;
  service_en?: string | null;
  shop?: string | null;
  past?: boolean;
};

/** تأكيد الحضور من لينك الواتساب — من غير تسجيل دخول */
export default function AttendPage() {
  const { token = '' } = useParams();
  const { i18n } = useTranslation();
  const ar = !i18n.language?.startsWith('en');
  const L = (a: string, e: string) => (ar ? a : e);
  const locale = ar ? 'ar' : 'en';
  const [done, setDone] = useState<'coming' | 'not_coming' | 'inactive' | null>(null);
  const [askCancel, setAskCancel] = useState(false);

  const info = useQuery({
    queryKey: ['attend', token],
    enabled: token.length >= 24,
    retry: 1,
    queryFn: async (): Promise<Info> => {
      const { data, error } = await supabase.rpc('attendance_info', { p_token: token });
      if (error) throw error;
      return (data ?? {}) as Info;
    },
  });

  const answer = useMutation({
    mutationFn: async (coming: boolean) => {
      const { data, error } = await supabase.rpc('attendance_by_token', { p_token: token, p_coming: coming });
      if (error) throw error;
      return data === 'not_coming' ? 'not_coming' : 'coming';
    },
    onSuccess: (r) => {
      setDone(r);
      setAskCancel(false);
    },
    onError: (e) => {
      // NOT_ACTIVE / NOT_FOUND: الحجز اتغيّر أو عدّى. غير كده غالباً النت
      const code = extractErrorCode(e);
      if (code === 'NOT_ACTIVE' || code === 'NOT_FOUND') setDone('inactive');
      else toast.error(L('حصلت مشكلة، اتأكد من النت وجرّب تاني', 'Something went wrong, check your connection and try again'));
    },
  });

  const v = info.data;
  const service = ar ? v?.service_ar : v?.service_en || v?.service_ar;
  const first = (v?.name ?? '').trim().split(/\s+/)[0] ?? '';
  const state: 'loading' | 'missing' | 'cancelled' | 'past' | 'coming' | 'ask' | 'error' =
    token.length < 24 || (v && !v.ok)
      ? 'missing'
      : info.isLoading
        ? 'loading'
        : info.isError
          ? 'error'
          : v?.status === 'cancelled' || v?.attendance === 'not_coming'
            ? 'cancelled'
            : v?.past || v?.status !== 'confirmed'
              ? 'past'
              : v?.attendance === 'coming'
                ? 'coming'
                : 'ask';

  const card = v?.start_at ? (
    <div className="rounded-card border border-default bg-white p-4 shadow-2xs">
      {service ? (
        <p className="flex items-center gap-2 font-semibold text-espresso">
          <Scissors className="size-4 text-gold" aria-hidden /> {service}
        </p>
      ) : null}
      <p className="mt-2 flex items-center gap-2 text-ink">
        <CalendarCheck2 className="size-4 text-gold" aria-hidden /> {formatCairoDate(v.start_at, locale)}
      </p>
      <p className="mt-1 flex items-center gap-2 text-lg font-bold text-espresso">
        <Clock className="size-4 text-gold" aria-hidden /> <span className="font-latin">{formatCairoTime(v.start_at, locale)}</span>
      </p>
    </div>
  ) : null;

  const final = (icon: React.ReactNode, title: string, text: string, showBook = false) => (
    <div className="mt-6 flex flex-col items-center gap-3 text-center">
      {icon}
      <p className="text-xl font-bold text-espresso">{title}</p>
      <p className="max-w-sm text-ink-70">{text}</p>
      {card ? <div className="w-full max-w-sm text-start">{card}</div> : null}
      <div className="mt-2 flex w-full max-w-sm flex-col gap-2">
        {showBook ? (
          <Link to="/book" className="inline-flex min-h-12 items-center justify-center rounded-btn bg-espresso px-4 font-semibold text-cream">
            {L('احجز معاد تاني', 'Book another time')}
          </Link>
        ) : null}
        <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-btn border border-default bg-white px-4 text-espresso">
          {L('الصفحة الرئيسية', 'Home page')}
        </Link>
      </div>
    </div>
  );

  let content: React.ReactNode;
  if (done === 'coming' || (!done && state === 'coming')) {
    content = final(
      <CheckCircle2 className="size-14 text-success" aria-hidden />,
      L('تمام، مستنيينك! ✂️', 'Great, see you then! ✂️'),
      L('اتسجّل إنك جاي في معادك. لو حصل أي ظرف ابعتلنا.', 'Your visit is confirmed. Let us know if anything changes.'),
    );
  } else if (done === 'not_coming' || (!done && state === 'cancelled')) {
    content = final(
      <CalendarX2 className="size-14 text-bark" aria-hidden />,
      L('اتلغى الحجز', 'Booking cancelled'),
      L('ولا يهمك، المعاد اتفضّى. تقدر تحجز معاد تاني يناسبك في أي وقت.', 'No problem, the slot is free now. You can book another time whenever it suits you.'),
      true,
    );
  } else if (done === 'inactive' || (!done && state === 'past')) {
    content = final(
      <Clock className="size-14 text-ink-70" aria-hidden />,
      L('اللينك ده مبقاش شغّال', 'This link has expired'),
      L('الحجز ده معاده عدّى أو اتغيّر. لو محتاج حاجة كلّمنا.', 'This booking already passed or changed. Contact us if you need anything.'),
      true,
    );
  } else if (state === 'missing' || state === 'error') {
    content = final(
      <CalendarX2 className="size-14 text-ink-70" aria-hidden />,
      state === 'error' ? L('حصلت مشكلة في التحميل', 'Could not load') : L('مش لاقيين الحجز ده', 'Booking not found'),
      state === 'error' ? L('اتأكد من النت وجرّب تاني.', 'Check your connection and try again.') : L('اتأكد إنك فاتح اللينك كامل زي ما وصلك.', 'Make sure you opened the full link you received.'),
      true,
    );
  } else if (state === 'loading') {
    content = <Skeleton className="mt-6 h-48" />;
  } else {
    content = (
      <div className="mt-4 space-y-4">
        <p className="text-lg text-ink">
          {first ? L(`أهلاً ${first} 👋`, `Hi ${first} 👋`) : L('أهلاً 👋', 'Hi 👋')}{' '}
          {L('إنت جاي في معادك؟', 'Are you coming to your appointment?')}
        </p>
        {card}
        {askCancel ? (
          <div className="space-y-3 rounded-card border border-danger/30 bg-danger/5 p-4">
            <p className="font-semibold text-espresso">{L('متأكد؟ الحجز هيتلغي والمعاد هيتفضّى لحد تاني.', 'Sure? The booking will be cancelled and the slot freed.')}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="danger" fullWidth loading={answer.isPending} onClick={() => answer.mutate(false)}>
                {L('أيوه، ألغي الحجز', 'Yes, cancel it')}
              </Button>
              <Button variant="secondary" fullWidth disabled={answer.isPending} onClick={() => setAskCancel(false)}>
                {L('لأ، رجوع', 'No, go back')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button fullWidth size="lg" loading={answer.isPending} onClick={() => answer.mutate(true)}>
              <CheckCircle2 className="size-5" /> {L('أيوه، جاي', 'Yes, I’m coming')}
            </Button>
            <Button variant="secondary" fullWidth size="lg" disabled={answer.isPending} onClick={() => setAskCancel(true)}>
              {L('مش هقدر آجي', 'I can’t make it')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-espresso">{L('تأكيد الحضور', 'Confirm your visit')}</h1>
      {content}
    </PageShell>
  );
}
