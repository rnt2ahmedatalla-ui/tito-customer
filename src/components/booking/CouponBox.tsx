import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ticket, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/profile/useAuth';
import { canAttempt } from '@/lib/rate-limit';
import { formatEGP } from '@/lib/money';

const rpc = supabase.rpc.bind(supabase);

export interface AppliedCoupon {
  code: string;
  discount: number;
}

/** خانة الكوبون: بتظهر بس لو الأدمن عنده كوبون شغّال، وبتحسب الخصم قبل التأكيد */
export function CouponBox({
  price,
  applied,
  onApply,
  onClear,
}: {
  price: number;
  applied: AppliedCoupon | null;
  onApply: (c: AppliedCoupon) => void;
  onClear: () => void;
}) {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const available = useQuery({
    queryKey: ['coupons-available'],
    enabled: !!user,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await rpc('coupons_available');
      if (error) return false;
      return data === true;
    },
  });

  if (!user || !available.data) return null;

  const check = async () => {
    const clean = code.trim().toUpperCase().replace(/\s+/g, '');
    if (!clean) return;
    if (!canAttempt('coupon_preview', { cooldownMs: 800, maxPerMinute: 10 })) return;
    setBusy(true);
    setMsg(null);
    const { data, error } = await rpc('preview_coupon', { p_code: clean, p_price: price });
    setBusy(false);
    const res = data as { ok?: boolean; discount?: number; error?: string } | null;
    if (error || !res?.ok) {
      setMsg(
        res?.error === 'EXPIRED'
          ? isAr ? 'الكوبون ده خلصت مدته' : 'This coupon has expired'
          : res?.error === 'USED'
            ? isAr ? 'الكوبون ده اتستخدم قبل كده' : 'This coupon was already used'
            : isAr ? 'الكوبون مش صحيح' : 'Invalid coupon',
      );
      return;
    }
    onApply({ code: clean, discount: Number(res.discount ?? 0) });
    setCode('');
  };

  if (applied) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-card border border-success/40 bg-success/10 p-3 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium text-espresso">
          <Ticket className="size-4 shrink-0 text-success" aria-hidden />
          <span className="truncate">
            {isAr ? 'كوبون ' : 'Coupon '}
            <span className="font-latin">{applied.code}</span> · − <span className="font-latin">{formatEGP(applied.discount)}</span>
          </span>
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label={isAr ? 'شيل الكوبون' : 'Remove coupon'}
          className="flex size-8 shrink-0 items-center justify-center rounded-btn text-ink hover:bg-white"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <label htmlFor="coupon-code" className="mb-1 block text-sm text-ink">
        {isAr ? 'عندك كوبون خصم؟' : 'Have a discount coupon?'}
      </label>
      <div className="flex gap-2">
        <input
          id="coupon-code"
          dir="ltr"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void check();
          }}
          placeholder="TITO10"
          className="min-h-11 min-w-0 flex-1 rounded-btn border border-default bg-white px-3 font-latin text-sm uppercase"
        />
        <button
          type="button"
          onClick={() => void check()}
          disabled={busy || !code.trim()}
          className="min-h-11 shrink-0 rounded-btn bg-espresso px-4 text-sm font-semibold text-cream disabled:opacity-50"
        >
          {isAr ? 'تطبيق' : 'Apply'}
        </button>
      </div>
      {msg ? <p className="mt-1 text-sm text-danger">{msg}</p> : null}
    </div>
  );
}
