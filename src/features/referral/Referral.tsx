import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Gift, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/profile/useAuth';

const KEY = 'tito.ref';
const sb = supabase as unknown as {
  from: (t: string) => { select: (c: string) => { eq: (k: string, v: unknown) => { maybeSingle: () => Promise<{ data: unknown }> } } & Promise<{ data: unknown }> };
  rpc: (f: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

type Cfg = { is_active: boolean; friend_percent: number; referrer_percent: number; valid_days: number; share_ar: string; share_en: string };

/** لو حد فتح الموقع بلينك ?ref=CODE بنحفظ الكود لحد ما يسجّل دخول */
export function captureReferral() {
  try {
    const u = new URL(window.location.href);
    const code = u.searchParams.get('ref');
    if (code && /^[A-Za-z0-9]{4,12}$/.test(code)) {
      localStorage.setItem(KEY, code.toUpperCase());
      u.searchParams.delete('ref');
      window.history.replaceState(window.history.state, '', u.pathname + (u.search ? u.search : '') + u.hash);
    }
  } catch { /* ignore */ }
}

export function useReferralConfig() {
  return useQuery({
    queryKey: ['referral-config'],
    staleTime: 5 * 60_000,
    queryFn: async () => ((await sb.from('referral_config').select('is_active, friend_percent, referrer_percent, valid_days, share_ar, share_en').eq('id', 1).maybeSingle()).data ?? null) as Cfg | null,
  });
}

/** بعد تسجيل الدخول: لو فيه كود محفوظ نطالب بيه مرة واحدة ونوري الكوبون */
export function ReferralClaimer() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const ar = !i18n.language?.startsWith('en');
  const done = useRef(false);
  useEffect(() => {
    if (!user || done.current) return;
    let code: string | null = null;
    try { code = localStorage.getItem(KEY); } catch { code = null; }
    if (!code) return;
    done.current = true;
    void (async () => {
      const { data } = await sb.rpc('claim_referral', { p_code: code });
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
      const r = data as { ok?: boolean; code?: string; percent?: number; days?: number } | null;
      if (r?.ok && r.code) {
        toast.success(ar ? `🎁 أهلاً بيك! خصم ${r.percent}% على أول حلاقة بالكود ${r.code} (صالح ${r.days} يوم)` : `🎁 Welcome! ${r.percent}% off your first cut with code ${r.code} (valid ${r.days} days)`, { duration: 9000 });
      }
    })();
  }, [user, ar]);
  return null;
}

/** كارت «هات صاحبك» في حسابي */
export function ReferralCard() {
  const { i18n } = useTranslation();
  const ar = !i18n.language?.startsWith('en');
  const L = (a: string, e: string) => (ar ? a : e);
  const { user } = useAuth();
  const cfg = useReferralConfig();
  const qc = useQueryClient();
  const code = useQuery({
    queryKey: ['my-ref-code', user?.id],
    enabled: !!user && !!cfg.data?.is_active,
    queryFn: async () => {
      const { data, error } = await sb.rpc('my_referral_code');
      if (error) throw error;
      return String(data);
    },
  });
  const stats = useQuery({
    queryKey: ['my-referrals', user?.id],
    enabled: !!user && !!cfg.data?.is_active,
    queryFn: async () => {
      const { data } = await (sb.from('referrals').select('status') as unknown as Promise<{ data: Array<{ status: string }> | null }>);
      const rows = (data ?? []) as Array<{ status: string }>;
      return { all: rows.length, rewarded: rows.filter((r) => r.status === 'rewarded').length };
    },
  });
  void qc;
  if (!user || !cfg.data?.is_active || !code.data) return null;
  const c = cfg.data;
  const link = `${window.location.origin}${import.meta.env.BASE_URL || '/'}?ref=${code.data}`.replace(/([^:])\/\//g, '$1/');
  const text = `${(ar ? c.share_ar : c.share_en).replace(/\{percent\}/g, String(c.friend_percent))}\n${link}`;
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch { return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast.success(L('اللينك اتنسخ', 'Link copied')); } catch { toast.error(L('مقدرتش أنسخ', "Couldn't copy")); }
  };
  return (
    <section className="animate-rise overflow-hidden rounded-card bg-espresso p-4 text-cream shadow-warm">
      <h2 className="flex items-center gap-2 text-base font-bold"><span className="flex size-8 items-center justify-center rounded-full bg-gold/20 text-gold"><Gift className="size-4" /></span>{L('هات صاحبك', 'Bring a friend')}</h2>
      <p className="mt-2 text-sm text-cream/80">
        {L(`صاحبك ياخد خصم ${c.friend_percent}% على أول حلاقة، ولما يحلق إنت تاخد خصم ${c.referrer_percent}% على حلاقتك الجاية.`, `Your friend gets ${c.friend_percent}% off the first cut; once they’re done you get ${c.referrer_percent}% off your next one.`)}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 rounded-btn bg-cream/10 px-3 py-2">
        <span className="font-latin text-lg font-bold tracking-wider text-gold" dir="ltr">{code.data}</span>
        <span className="text-xs text-cream/70">{L(`${stats.data?.rewarded ?? 0} صاحب حلق من عندك`, `${stats.data?.rewarded ?? 0} friends came`)}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void share()} className="flex min-h-11 items-center justify-center gap-2 rounded-btn bg-gold font-semibold text-espresso"><Share2 className="size-4" />{L('ابعت لصاحبك', 'Share')}</button>
        <button type="button" onClick={() => void copy()} className="flex min-h-11 items-center justify-center gap-2 rounded-btn border border-cream/20 font-semibold text-cream"><Copy className="size-4" />{L('انسخ اللينك', 'Copy link')}</button>
      </div>
    </section>
  );
}
