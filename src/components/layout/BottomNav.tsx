import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Home, User, Scissors, MessageCircle, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase';
import { buildWhatsAppUrl } from '@/lib/urls';

type NavItem = { to: string; icon: typeof Home; labelKey: string; primary?: boolean };

const HOME: NavItem = { to: '/', icon: Home, labelKey: 'nav.home' };
const BOOKINGS: NavItem = { to: '/bookings', icon: Calendar, labelKey: 'nav.bookings' };
const BOOK: NavItem = { to: '/book', icon: Scissors, labelKey: 'nav.book', primary: true };
const PRODUCTS: NavItem = { to: '/products', icon: ShoppingBag, labelKey: 'nav.products' };
const PROFILE: NavItem = { to: '/profile', icon: User, labelKey: 'nav.profile' };

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  const settings = useQuery({
    queryKey: ['settings', 'nav-whatsapp'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('shop_whatsapp').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  // "منتجاتنا" بتظهر في الشريط بس لو فيه منتجات شغالة
  const hasProducts = useQuery({
    queryKey: ['nav', 'has-products'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    staleTime: 5 * 60_000,
  });

  const whatsappUrl = settings.data?.shop_whatsapp ? buildWhatsAppUrl(settings.data.shop_whatsapp) : null;

  // "احجز" دايماً في النص (لما فيه منتجات يبقى 5 خانات)
  const items: NavItem[] = hasProducts.data ? [HOME, BOOKINGS, BOOK, PRODUCTS, PROFILE] : [HOME, BOOKINGS, BOOK, PROFILE];

  const onBookingFlow = location.pathname.startsWith('/book');

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
            'bottom-[calc(5.25rem+env(safe-area-inset-bottom))] sm:bottom-6 sm:end-6',
            // في صفحة الحجز على الموبايل فيه شريط تأكيد تحت، فبنخفي الزرار عشان ميغطيش عليه
            onBookingFlow && 'max-sm:hidden',
          )}
        >
          <MessageCircle className="size-6" aria-hidden />
        </a>
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-cream/95 backdrop-blur-sm sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label={t('a11y.mainNav')}
      >
        <div className="flex">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));

            if (item.primary) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-end gap-0.5 pb-1.5"
                >
                  <span
                    className={cn(
                      '-mt-6 flex size-14 items-center justify-center rounded-full bg-gold text-espresso shadow-warm-raised ring-4 ring-cream transition-transform active:scale-95',
                      active && 'bg-gold-soft',
                    )}
                  >
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <span className={cn('max-w-full truncate text-center text-[11px] font-bold leading-tight', active ? 'text-gold' : 'text-espresso')}>
                    {t(item.labelKey)}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5',
                  active ? 'text-gold' : 'text-ink',
                )}
              >
                {active ? <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-gold" aria-hidden /> : null}
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="max-w-full truncate text-center text-[11px] font-medium leading-tight">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
