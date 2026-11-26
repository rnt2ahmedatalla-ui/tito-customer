import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RotateCcw, Scissors, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/profile/useAuth';
import { useBookings } from '@/features/bookings/useBookings';
import { useActiveStaff } from '@/features/booking/useBooking';
import { useVisitStatus } from '@/features/extras/useExtras';

export type HomeCardVariant = 'current' | 'A' | 'B' | 'C';

/** معاينة: ?homecard=A|B|C بتتحفظ على الموبايل، و ?homecard=off بترجّع الشكل الحالي */
export function useHomeCardVariant(): HomeCardVariant {
  const { search } = useLocation();
  return useMemo(() => {
    try {
      const q = new URLSearchParams(search).get('homecard');
      if (q === 'off') localStorage.removeItem('tito_homecard');
      else if (q === 'A' || q === 'B' || q === 'C') localStorage.setItem('tito_homecard', q);
      const v = localStorage.getItem('tito_homecard');
      return v === 'A' || v === 'B' || v === 'C' ? v : 'current';
    } catch { return 'current'; }
  }, [search]);
}

/** آخر صورة حلاقة للعميل (من «صوري»: اللي رفعها هو أو الحلاق، بعد ما اتقبلت أو لسه مستنية) */
function useCutPhoto() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['home-cut-photo', user?.id],
    enabled: !!user,
    staleTime: 30 * 60_000,
    retry: false,
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase.from('customer_photos').select('thumb_path').eq('user_id', user!.id).neq('status', 'rejected').order('taken_at', { ascending: false }).limit(1);
      const p = (data as Array<{ thumb_path: string }> | null)?.[0]?.thumb_path;
      if (!p) return null;
      const s = await supabase.storage.from('customer-photos').createSignedUrl(p, 3600);
      return s.data?.signedUrl ?? null;
    },
  });
}

function useLastCut() {
  const cut = useCutPhoto();
  const { i18n } = useTranslation();
  const isAr = !!i18n.language?.startsWith('ar');
  const { user } = useAuth();
  const q = useBookings();
  const staff = useActiveStaff();
  const vs = useVisitStatus();
  const rows = (user ? q.data ?? [] : []) as Array<{ id: string; status: string; service_id?: string | null; staff_id?: string | null; start_at: string; service_name_ar?: string | null; service_name_en?: string | null; service?: { name_ar?: string; name_en?: string | null } | null }>;
  const hasUpcoming = rows.some((r) => r.status === 'confirmed' && new Date(r.start_at) > new Date());
  const last = rows.find((r) => r.status === 'completed' || (r.status === 'confirmed' && new Date(r.start_at) <= new Date()));
  if (!last || !last.service_id || hasUpcoming) return null;
  const qs = new URLSearchParams({ step: 'datetime', service: last.service_id });
  if (last.staff_id) qs.set('staff', last.staff_id);
  const nameAr = last.service_name_ar ?? last.service?.name_ar ?? '';
  const nameEn = last.service_name_en ?? last.service?.name_en ?? nameAr;
  const barber = (staff.data ?? []).find((s) => s.id === last.staff_id);
  const multi = (staff.data ?? []).length > 1;
  const d = vs.data;
  const days = d?.days_since ?? Math.floor((Date.now() - new Date(last.start_at).getTime()) / 86_400_000);
  const missing = !!d && d.enabled && d.days_since != null && d.days_since >= (d.after_days ?? 28);
  const date = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(last.start_at));
  const first = String((user?.user_metadata as { full_name?: string } | undefined)?.full_name ?? '').trim().split(/\s+/)[0] ?? '';
  return { id: last.id, to: `/book?${qs.toString()}`, name: isAr ? nameAr : nameEn || nameAr, barber: barber && multi ? barber : null, photo: cut.data ?? null, days, missing, date, first, isAr };
}

function Pic({ photo, name }: { photo: string | null; name?: string }) {
  return photo
    ? <img src={photo} alt={name ?? ''} className="size-12 shrink-0 rounded-full object-cover ring-2 ring-gold ring-offset-2 ring-offset-[#341A0E]" />
    : <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold ring-2 ring-gold ring-offset-2 ring-offset-[#341A0E]"><Scissors className="size-5" /></span>;
}

const CARD = 'group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-[#4a2a17] to-[#2b1409] px-3 py-2.5 pe-11 shadow-warm-raised transition-transform active:scale-[0.985]';

/** A و B و C: بدائل لكارت «وحشتنا» + «زي آخر مرة» (بدون تكرار كلام) */
export function HomeRebook({ variant }: { variant: 'A' | 'B' | 'C' }) {
  const c = useLastCut();
  const [hidden, setHidden] = useState<string | null>(() => { try { return localStorage.getItem('tito_rebook_hidden'); } catch { return null; } });
  if (!c || hidden === c.id) return null;
  const { isAr } = c;
  const hide = () => { setHidden(c.id); try { localStorage.setItem('tito_rebook_hidden', c.id); } catch { /* ignore */ } };
  const miss = isAr ? `وحشتنا، عدّى ${c.days} يوم` : `We miss you, ${c.days} days`;
  const detail = isAr ? `${c.name} · ${c.date}${c.barber ? ` · مع ${c.barber.name}` : ''}` : `${c.name} · ${c.date}${c.barber ? ` · with ${c.barber.name}` : ''}`;
  const btn = <span className="shrink-0 rounded-full bg-gold px-3.5 py-1.5 text-xs font-bold text-espresso">{isAr ? 'احجز نفس الحلاقة' : 'Book again'}</span>;
  const close = <button type="button" onClick={hide} aria-label={isAr ? 'إخفاء' : 'Dismiss'} className="absolute end-1.5 top-1.5 flex size-7 items-center justify-center rounded-full text-cream/60 hover:bg-cream/10"><X className="size-3.5" /></button>;

  if (variant === 'A') {
    return (
      <div className="relative animate-rise">
        <Link to={c.to} className={CARD}>
          <Pic photo={c.photo} name={c.barber?.name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-semibold tracking-wide text-gold">{c.missing ? `${miss} ✂️` : isAr ? 'زي آخر مرة' : 'Like last time'}</span>
            <span className="block line-clamp-2 text-sm font-bold leading-snug text-cream">{detail}</span>
          </span>
          {btn}
        </Link>
        {close}
      </div>
    );
  }
  const lastCard = (
    <div className="relative animate-rise">
      <Link to={c.to} className={CARD}>
        <Pic photo={c.photo} name={c.barber?.name} />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold tracking-wide text-gold">{isAr ? 'زي آخر مرة' : 'Like last time'}</span>
          <span className="block line-clamp-2 text-sm font-bold leading-snug text-cream">{c.name}{c.barber ? (isAr ? ` · مع ${c.barber.name}` : ` · with ${c.barber.name}`) : ''}</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-cream/65">{c.date} <ArrowLeft className="size-3 rtl:rotate-0 ltr:rotate-180" /></span>
        </span>
        {btn}
      </Link>
      {close}
    </div>
  );
  if (variant === 'B') {
    return (
      <div className="space-y-1.5">
        {c.missing ? (
          <div className="animate-rise flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-sm font-semibold text-cream">
            <RotateCcw className="size-3.5 shrink-0 text-gold" />
            <span className="truncate">{isAr ? `وحشتنا يا ${c.first || 'غالي'}، عدّى ${c.days} يوم ✂️` : `We miss you${c.first ? `, ${c.first}` : ''}, it's been ${c.days} days ✂️`}</span>
          </div>
        ) : null}
        {lastCard}
      </div>
    );
  }
  // C: سطر ترحيب صغير من غير صندوق وفوق كارت واحد
  return (
    <div className="space-y-1.5">
      {c.missing ? <p className="animate-rise px-1 text-sm font-semibold text-cream/90">{isAr ? `وحشتنا يا ${c.first || 'غالي'}، بقالك ${c.days} يوم` : `We miss you${c.first ? `, ${c.first}` : ''}, it's been ${c.days} days`}</p> : null}
      {lastCard}
    </div>
  );
}
