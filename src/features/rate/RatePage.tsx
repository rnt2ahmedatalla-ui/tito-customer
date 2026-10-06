import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShareAndQr } from '@/components/share/ShareAndQr';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';

type RateView = {
  ok?: boolean;
  status?: string;
  service_name_ar?: string;
  service_name_en?: string;
  rating?: number;
};

export default function RatePage() {
  const { token = '' } = useParams();
  const { t, i18n } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState<RateView | null>(null);

  const query = useQuery({
    queryKey: ['rate', token],
    enabled: token.length >= 16,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_rate_booking', { p_token: token });
      if (error) throw error;
      return (data ?? {}) as RateView;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('submit_review', {
        p_token: token,
        p_rating: rating,
        p_comment: comment,
      });
      if (error) throw error;
      return (data ?? {}) as RateView;
    },
    onSuccess: (data) => setDone({ ...data, status: 'done' }),
  });

  const view = done ?? query.data;
  const status = token.length < 16 ? 'missing' : (view?.status ?? (query.isError ? 'missing' : 'pending'));
  const service =
    i18n.language === 'ar' ? view?.service_name_ar : view?.service_name_en;

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-espresso">{t('rate.title')}</h1>
      {query.isLoading && !done ? (
        <Skeleton className="mt-6 h-40" />
      ) : status === 'pending' ? (
        <div className="mt-6 space-y-4">
          {service ? <p className="text-ink">{service}</p> : null}
          <p className="text-sm text-ink">{t('rate.ask')}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="p-1"
                aria-label={`${n}`}
              >
                <Star
                  className={cn(
                    'size-8',
                    n <= rating ? 'fill-gold text-gold' : 'text-bark/30',
                  )}
                />
              </button>
            ))}
          </div>
          <textarea
            className="min-h-24 w-full rounded-btn border border-default bg-white px-3 py-2"
            placeholder={t('rate.comment')}
            value={comment}
            maxLength={300}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button
            fullWidth
            disabled={rating < 1 || comment.trim().length < 3}
            loading={submit.isPending}
            onClick={() => void submit.mutate()}
          >
            {t('rate.submit')}
          </Button>
          <p className="text-xs text-ink">{t('rate.commentRequired')}</p>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-lg text-espresso">
            {status === 'done'
              ? t('rate.thanks')
              : status === 'not_ready'
                ? t('rate.notReady')
                : t('rate.missing')}
          </p>
          {status === 'done' ? <ShareAndQr /> : null}
        </div>
      )}
    </PageShell>
  );
}
