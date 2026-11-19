import { useTranslation } from 'react-i18next';
import { Clock, Ticket } from 'lucide-react';
import { useFeatureFlags, useMyPackages, useQueueEstimate } from './useExtras';

/** "لو جيت دلوقتي هتستنى تقريباً X دقيقة" (بيظهر لو الأدمن شغّل المميزة) */
export function WaitEstimateCard() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const flags = useFeatureFlags();
  const est = useQueueEstimate(!!flags.data?.waitEstimate);
  if (!flags.data?.waitEstimate || est.data == null) return null;
  const m = est.data;
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-card border border-gold/40 bg-gold/10 p-4">
      <Clock className="size-6 shrink-0 text-gold" aria-hidden />
      <p className="min-w-0 text-sm font-medium text-espresso">
        {m <= 0
          ? isAr ? 'الحلاق فاضي دلوقتي، تقدر تيجي على طول 💈' : 'The barber is free right now, come on in 💈'
          : isAr ? `لو جيت دلوقتي هتستنى تقريباً ${m} دقيقة` : `If you come now, expect about ${m} min wait`}
      </p>
    </div>
  );
}

/** باقاتي: الحصص اللي فاضلة */
export function MyPackagesCard() {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const flags = useFeatureFlags();
  const pk = useMyPackages(!!flags.data?.packages);
  if (!flags.data?.packages || !pk.data || pk.data.length === 0) return null;
  return (
    <div className="mt-8">
      <p className="mb-2 text-sm font-medium text-espresso">{isAr ? 'باقاتي' : 'My packages'}</p>
      <div className="space-y-2">
        {pk.data.map((p) => (
          <div key={p.id} className="flex min-w-0 items-center justify-between gap-3 rounded-card border border-gold/40 bg-gold/10 p-3">
            <div className="flex min-w-0 items-center gap-2">
              <Ticket className="size-5 shrink-0 text-gold" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-espresso">{isAr ? p.name_ar : p.name_en || p.name_ar}</p>
                <p className="text-xs text-ink">
                  {isAr ? 'صالحة لحد' : 'Valid until'} <span className="font-latin">{p.expires_at}</span>
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-espresso px-3 py-1 font-latin text-sm font-bold text-cream">
              {p.sessions_left}/{p.sessions_total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
