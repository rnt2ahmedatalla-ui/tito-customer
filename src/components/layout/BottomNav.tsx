import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Home, ShoppingBag, User, Scissors, MessageCircle } from 'lucide-react';
import { HowToBookFab } from '@/features/home/HowToBook';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase';
import { buildWhatsAppUrl } from '@/lib/urls';
import { useFeatureFlags } from '@/features/extras/useExtras';

const items = [
  { to: '/', icon: Home, labelKey: 'nav.home', primary: false },
  { to: '/bookings', icon: Calendar, labelKey: 'nav.bookings', primary: false },
  { to: '/book', icon: Scissors, labelKey: 'nav.book', primary: true },
  { to: '/products', icon: ShoppingBag, labelKey: 'nav.products', primary: false },
  { to: '/profile', icon: User, labelKey: 'nav.profile', primary: false },
] as const;

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  // «منتجاتنا» بيظهر بس لو المتجر شغّال من لوحة التحكم (و«شغلنا» موجود في الرئيسية)
  const showProducts = useFeatureFlags().data?.products !== false;
  const visible = items.filter((i) => i.to !== '/products' || showProducts);

  const settings = useQuery({
    queryKey: ['settings', 'nav-whatsapp'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('shop_whatsapp').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const whatsappUrl = settings.data?.shop_whatsapp ? buildWhatsAppUrl(settings.data.shop_whatsapp) : null;
  const onBookingFlow = location.pathname.startsWith('/book') || /^\/products\/[^/]+/.test(location.pathname);

  return (
    <>
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('nav.whatsapp')}
          title={t('nav.whatsapp')}
          className={cn(
            'fixed end-3 z-30 flex size-12 items-center justify-center rounded-full bg-espresso text-gold shadow-warm-raised ring-2 ring-gold/60 transition-transform active:scale-95',
            'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-6 sm:end-6',
            // في صفحة الحجز على الموبايل فيه شريط تأكيد تحت، فبنخفي الزرار عشان ميغطيش عليه
            onBookingFlow && 'max-sm:hidden',
          )}
        >
          <MessageCircle className="size-6" aria-hidden />
        </a>
      ) : null}

      <HowToBookFab hidden={onBookingFlow} />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 rounded-t-[1.25rem] border-t border-default bg-cream/95 shadow-[0_-6px_20px_rgba(52,26,14,0.08)] sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label={t('a11y.mainNav')}
      >
        <div className={cn('grid items-center', visible.length === 5 ? 'grid-cols-5 px-1' : 'grid-cols-4 px-2')}>
          {visible.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 py-1.5"
              >
                <span
                  className={cn(
                    'flex h-8 items-center justify-center rounded-full transition-colors',
                    // "احجز" دايماً بارز بالذهبي، والصفحة الحالية بتتلوّن بخفيف
                    item.primary ? 'bg-gold px-4 text-espresso shadow-warm' : active ? 'bg-gold/20 px-3 text-bark' : 'px-3 text-ink',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span
                  className={cn(
                    'max-w-full truncate text-center text-[11px] leading-tight',
                    item.primary ? 'font-bold text-espresso' : active ? 'font-semibold text-bark' : 'font-medium text-ink',
                  )}
                >
                  {t(item.labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
