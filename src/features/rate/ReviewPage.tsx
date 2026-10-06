import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth, useSignIn } from '@/features/profile/useAuth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';

export default function ReviewPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const signIn = useSignIn();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);

  const rateable = useQuery({
    queryKey: ['rateable-bookings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, service_name_ar, service_name_en, start_at, rate_token, status')
        .eq('user_id', user!.id)
        .eq('status', 'completed')
        .not('rate_token', 'is', null)
        .order('start_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      // Filter already reviewed
      const tokens = (data ?? []).map((b) => b.rate_token!).filter(Boolean);
      if (tokens.length === 0) return [];
      const { data: existing } = await supabase
        .from('reviews')
        .select('rate_token')
        .in('rate_token', tokens);
      const used = new Set((existing ?? []).map((r) => r.rate_token));
      return (data ?? []).filter((b) => b.rate_token && !used.has(b.rate_token));
    },
  });

  const submitOpen = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('customer_add_review', {
        p_rating: rating,
        p_comment: comment.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setDone(true);
      void queryClient.invalidateQueries({ queryKey: ['recent-reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['review-stats'] });
      toast.success(t('rate.thanks'));
    },
    onError: (error) => {
      toast.error(t('rate.submitError'));
      console.error(error);
    },
  });

  if (authLoading) {
    return (
      <PageShell>
        <Skeleton className="mt-6 h-40" />
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <h1 className="text-2xl font-bold text-espresso">{t('rate.title')}</h1>
        <p className="mt-4 text-ink">{t('rate.loginToReview')}</p>
        <Button className="mt-6" onClick={() => void signIn()}>
          {t('booking.signInGoogle')}
        </Button>
      </PageShell>
    );
  }

  if (done) {
    return (
      <PageShell>
        <h1 className="text-2xl font-bold text-espresso">{t('rate.title')}</h1>
        <p className="mt-6 text-lg text-espresso">{t('rate.thanks')}</p>
        <Link to="/" className="mt-6 inline-flex">
          <Button>{t('nav.home')}</Button>
        </Link>
      </PageShell>
    );
  }

  const pendingVisit = rateable.data?.[0];

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-espresso">{t('rate.title')}</h1>
      <p className="mt-2 text-sm text-ink">{t('rate.homeHint')}</p>

      {rateable.isLoading ? (
        <Skeleton className="mt-6 h-24" />
      ) : pendingVisit?.rate_token ? (
        <div className="mt-6 rounded-card border border-default bg-white p-4">
          <p className="font-medium text-espresso">
            {i18n.language === 'ar' ? pendingVisit.service_name_ar : pendingVisit.service_name_en}
          </p>
          <Link to={`/rate/${pendingVisit.rate_token}`} className="mt-3 inline-flex">
            <Button>{t('bookings.rateOffer')}</Button>
          </Link>
          {(rateable.data?.length ?? 0) > 1 ? (
            <ul className="mt-4 space-y-2 border-t border-default pt-3">
              {rateable.data!.slice(1).map((b) => (
                <li key={b.id}>
                  <Link to={`/rate/${b.rate_token}`} className="text-sm font-medium text-gold underline">
                    {i18n.language === 'ar' ? b.service_name_ar : b.service_name_en}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-espresso">{t('rate.writeReview')}</h2>
        <p className="text-sm text-ink">{t('rate.writeReviewHint')}</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} className="p-1" aria-label={`${n}`}>
              <Star className={cn('size-8', n <= rating ? 'fill-gold text-gold' : 'text-bark/30')} />
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
          loading={submitOpen.isPending}
          onClick={() => void submitOpen.mutate()}
        >
          {t('rate.submit')}
        </Button>
      </div>
    </PageShell>
  );
}
