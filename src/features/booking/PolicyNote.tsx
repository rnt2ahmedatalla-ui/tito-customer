import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { usePolicyText } from '@/lib/policy';

/** سياسة الحجز: مطوية في خطوة التأكيد (العميل يفتحها لو عايز)، وتأكيد الحجز = موافقة عليها */
export function PolicyNote() {
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const { text, ready } = usePolicyText(isAr);
  if (!ready) return null;
  return (
    <details className="group mt-4 rounded-btn border border-gold/40 bg-gold/10 p-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-espresso [&::-webkit-details-marker]:hidden">
        <ShieldCheck className="size-4 shrink-0 text-gold" aria-hidden />
        <span className="min-w-0 flex-1">{isAr ? 'سياسة الحجز' : 'Booking policy'}</span>
        <span className="text-xs font-normal text-ink group-open:hidden">{isAr ? 'اقرأها' : 'Read'}</span>
      </summary>
      <p className="mt-2 whitespace-pre-line leading-relaxed text-ink">{text}</p>
      <p className="mt-2 text-xs text-ink">{isAr ? 'بتأكيد الحجز إنت موافق على السياسة دي.' : 'By confirming your booking you agree to this policy.'}</p>
    </details>
  );
}
