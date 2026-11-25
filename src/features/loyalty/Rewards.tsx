import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Copy, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/profile/useAuth';
import { useLoyaltyLedger, useLoyaltySettings } from './useLoyalty';

type Reward = { id: string; title_ar: string; title_en: string | null; points_cost: number; stock: number | null };
type Claim = { id: string; title_ar: string; title_en: string | null; points: number; code: string; status: string; created_at: string };

/** بدّل نقاطك: منتج أو إضافة أو خدمة بقيمة النقاط */
export function RewardsCard() {
  const { i18n } = useTranslation();
  const ar = !!i18n.language?.startsWith('ar');
  const L = (a: string, e: string) => (ar ? a : e);
  const { user } = useAuth();
  const qc = useQueryClient();
  const settings = useLoyaltySettings();
  const ledger = useLoyaltyLedger();
  const balance = (ledger.data ?? []).reduce((a, r) => a + Number(r.points || 0), 0);
  const minRedeem = settings.data?.min_redeem_points ?? 0;
  const q = useQuery({
    queryKey: ['loyalty-rewards', user?.id],
    enabled: !!user && !!settings.data?.enabled,
    queryFn: async () => {
      const [r, c] = await Promise.all([
        supabase.from('loyalty_rewards' as never).select('id, title_ar, title_en, points_cost, stock').eq('is_active', true).order('sort').order('points_cost'),
        supabase.from('loyalty_claims' as never).select('id, title_ar, title_en, points, code, status, created_at').order('created_at', { ascending: false }).limit(10),
      ]);
      return { rewards: (r.data ?? []) as unknown as Reward[], claims: (c.data ?? []) as unknown as Claim[] };
    },
    staleTime: 60_000,
  });
  const claim = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('claim_reward' as never, { p_reward_id: id } as never);
      if (error) throw error;
      return data as unknown as { code: string };
    },
    onSuccess: (d) => {
      toast.success(L(`تمام 🎁 الكود بتاعك ${d.code} — وريه للحلاق`, `Done 🎁 your code is ${d.code} — show it at the shop`));
      void qc.invalidateQueries({ queryKey: ['loyalty-rewards'] });
      void qc.invalidateQueries({ queryKey: ['loyalty-ledger'] });
    },
    onError: (e) => {
      const m = (e as { message?: string }).message ?? '';
      toast.error(m.includes('NOT_ENOUGH') ? L('نقاطك مش كفاية لسه', 'Not enough points yet') : m.includes('OUT_OF_STOCK') ? L('خلصت للأسف', 'Out of stock') : L('حصلت مشكلة، جرّب تاني', 'Something went wrong'));
    },
  });
  if (!user || !settings.data?.enabled || !q.data || (q.data.rewards.length === 0 && q.data.claims.length === 0)) return null;
  const pending = q.data.claims.filter((c) => c.status === 'pending');
  return (
    <section className="rounded-card border border-gold/40 bg-white p-4 shadow-warm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-espresso"><Gift className="size-4 text-gold" />{L('بدّل نقاطك', 'Redeem your points')}</h2>
        <span className="rounded-full bg-gold/20 px-2.5 py-1 font-latin text-xs font-bold text-bark">{balance} {L('نقطة', 'pts')}</span>
      </div>
      {balance < minRedeem && q.data.rewards.length > 0 ? (
        <p className="mb-3 rounded-btn bg-sand/50 px-3 py-2 text-xs text-ink">{L(`لازم رصيدك يوصل ${minRedeem} نقطة عشان تبدّل أي مكافأة، وبعدين بيتخصم منك سعر المكافأة بس`, `You need ${minRedeem} points to redeem any reward, then only the reward cost is deducted`)}</p>
      ) : null}
      {pending.length ? (
        <ul className="mb-3 space-y-1.5">
          {pending.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-btn bg-gold/10 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{ar ? c.title_ar : c.title_en || c.title_ar}</span>
              <button type="button" onClick={() => void navigator.clipboard?.writeText(c.code).then(() => toast.success(L('اتنسخ', 'Copied')))} className="inline-flex items-center gap-1 rounded-btn bg-white px-2 py-1 font-latin text-sm font-bold tracking-wider text-espresso">{c.code}<Copy className="size-3.5 text-bark" /></button>
            </li>
          ))}
          <li className="text-[11px] text-ink">{L('وري الكود للحلاق وانت في المحل.', 'Show the code at the shop.')}</li>
        </ul>
      ) : null}
      <ul className="space-y-2">
        {q.data.rewards.map((r) => {
          const can = balance >= Math.max(r.points_cost, minRedeem) && (r.stock == null || r.stock > 0);
          return (
            <li key={r.id} className="flex items-center gap-2 rounded-btn border border-default p-2.5 text-sm">
              <span className="min-w-0 flex-1"><b className="block truncate text-espresso">{ar ? r.title_ar : r.title_en || r.title_ar}</b><span className="font-latin text-xs text-bark">{r.points_cost} {L('نقطة', 'pts')}</span></span>
              <button type="button" disabled={!can || claim.isPending} onClick={() => claim.mutate(r.id)} className="min-h-9 rounded-btn bg-gold px-3 text-xs font-semibold text-espresso transition-transform active:scale-95 disabled:bg-sand disabled:text-ink">
                {can ? L('بدّل', 'Redeem') : L(`ناقصك ${Math.max(0, Math.max(r.points_cost, minRedeem) - balance)}`, `${Math.max(0, Math.max(r.points_cost, minRedeem) - balance)} more`)}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
