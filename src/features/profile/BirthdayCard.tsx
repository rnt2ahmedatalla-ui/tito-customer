import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Cake } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { useAuth, useProfile } from './useAuth';

function useBirthdayOffer() {
  return useQuery({
    queryKey: ['birthday-config'],
    staleTime: 10 * 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('birthday_config').select('is_active, percent_off').eq('id', 1).maybeSingle();
      if (error) return null;
      return data;
    },
  });
}

/** تاريخ الميلاد: الزبون بيكتبه مرة واحدة بس، ويوم عيد ميلاده يوصله كوبون */
export function BirthdayCard() {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const L = (a: string, e: string) => (isAr ? a : e);
  const { user } = useAuth();
  const profile = useProfile();
  const offer = useBirthdayOffer().data;
  const qc = useQueryClient();
  const [value, setValue] = useState('');
  const [confirm, setConfirm] = useState(false);
  const max = new Date(Date.now() - 5 * 365.25 * 86400_000).toISOString().slice(0, 10);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('set_my_birth_date', { p_date: value });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(L('اتحفظ 🎂', 'Saved 🎂'));
      setConfirm(false);
      void qc.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
    onError: (e) => {
      const m = (e as { message?: string }).message ?? '';
      toast.error(m.includes('LOCKED') ? L('تاريخ الميلاد اتسجل قبل كده. كلّم المحل لو محتاج تغيّره.', 'Birthday already saved. Contact the shop to change it.') : m.includes('INVALID') ? L('التاريخ ده مش مظبوط', 'Invalid date') : L('حصل خطأ، جرّب تاني', 'Something went wrong'));
    },
  });

  if (!user || !profile.data || !('birth_date' in profile.data)) return null;
  const saved = profile.data.birth_date;
  const gift = offer?.is_active ? (isAr ? `هيوصلك كوبون خصم ${offer.percent_off}% يوم عيد ميلادك 🎁` : `You will get a ${offer.percent_off}% coupon on your birthday 🎁`) : null;

  return (
    <div className="mt-6 rounded-card border border-gold/40 bg-gold/10 p-4">
      <p className="flex items-center gap-2 font-semibold text-espresso"><Cake className="size-5 text-gold" aria-hidden />{L('عيد ميلادك', 'Your birthday')}</p>
      {saved ? (
        <p className="mt-1 text-sm text-ink">
          <span className="font-latin" dir="ltr">{new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${saved}T00:00:00Z`))}</span>
          {gift ? <> — {gift}</> : null}
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-ink">{gift ?? L('اكتب تاريخ ميلادك عشان نفتكرك 🎂', 'Add your birthday so we can celebrate you 🎂')}</p>
          <div className="flex flex-wrap items-end gap-2">
            <input type="date" dir="ltr" value={value} max={max} min="1920-01-01" onChange={(e) => { setValue(e.target.value); setConfirm(false); }} className="min-h-11 rounded-btn border border-bark/20 bg-white px-3 font-latin" aria-label={L('تاريخ الميلاد', 'Birth date')} />
            {confirm ? (
              <Button size="sm" variant="primary" loading={save.isPending} onClick={() => save.mutate()}>{L('أيوه، احفظ', 'Yes, save')}</Button>
            ) : (
              <Button size="sm" variant="secondary" disabled={!value} onClick={() => setConfirm(true)}>{L('حفظ', 'Save')}</Button>
            )}
          </div>
          {confirm ? <p className="text-xs text-warning">{L('اتأكد من التاريخ: بيتكتب مرة واحدة بس ومش هتقدر تغيّره بعد كده.', 'Double-check: it can be saved only once.')}</p> : null}
        </div>
      )}
    </div>
  );
}
