import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import { formatCairoDate, formatCairoTime } from '@/lib/time';
import { extractErrorCode } from '@/lib/errors';

type MoveView = {
  ok?: boolean;
  status?: string;
  current_start?: string | null;
  proposed_start?: string | null;
  service_name_ar?: string;
  service_name_en?: string;
};

export default function MovePage() {
  const { token = '' } = useParams();
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState<MoveView | null>(null);
  const [taken, setTaken] = useState(false);

  const query = useQuery({
    queryKey: ['booking-move', token],
    enabled: token.length >= 16,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_booking_move', { p_token: token });
      if (error) throw error;
      return (data ?? {}) as MoveView;
    },
  });

  const respond = useMutation({
    mutationFn: async (accept: boolean) => {
      const { data, error } = await supabase.rpc('respond_booking_move', {
        p_token: token,
        p_accept: accept,
      });
      if (error) throw error;
      return (data ?? {}) as MoveView;
    },
    onSuccess: (data) => setResult(data),
    onError: (error) => {
      if (extractErrorCode(error) === 'SLOT_TAKEN') setTaken(true);
    },
  });

  const view = result ?? query.data;
  const locale = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const service = locale === 'ar' ? view?.service_name_ar : view?.service_name_en;
  const status = taken ? 'taken' : token.length < 16 ? 'missing' : (view?.status ?? (query.isError ? 'missing' : 'pending'));
  const waiting = query.isLoading && token.length >= 16 && !result;

  const when = (iso?: string | null) =>
    iso ? `${formatCairoDate(iso, locale)} · ${formatCairoTime(iso, locale)}` : '—';

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-espresso">{t('move.title')}</h1>
      {waiting ? (
        <Skeleton className="mt-6 h-40" />
      ) : status === 'pending' && view ? (
        <div className="mt-6 space-y-4">
          <p className="text-ink">{t('move.busy')}</p>
          {service ? <p className="font-medium text-espresso">{service}</p> : null}
          <div className="rounded-card border border-default bg-white p-4">
            <p className="text-sm text-ink">{t('move.current')}</p>
            <p className="font-latin text-lg font-semibold text-espresso">{when(view.current_start)}</p>
          </div>
          <div className="rounded-card border border-gold bg-gold/10 p-4">
            <p className="text-sm text-ink">{t('move.proposed')}</p>
            <p className="font-latin text-lg font-semibold text-espresso">{when(view.proposed_start)}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button fullWidth loading={respond.isPending} onClick={() => void respond.mutate(true)}>
              {t('move.accept')}
            </Button>
            <Button
              fullWidth
              variant="secondary"
              loading={respond.isPending}
              onClick={() => void respond.mutate(false)}
            >
              {t('move.decline')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-lg text-espresso">
          {t(`move.${status === 'accepted' || status === 'declined' || status === 'expired' || status === 'cancelled' || status === 'taken' ? status : 'missing'}`)}
        </p>
      )}
    </PageShell>
  );
}
