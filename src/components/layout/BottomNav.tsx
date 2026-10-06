import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Home, User, Scissors, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/cn';

const navItems = [
  { to: '/', icon: Home, labelKey: 'nav.home' },
  { to: '/book', icon: Scissors, labelKey: 'nav.book' },
  { to: '/products', icon: ShoppingBag, labelKey: 'nav.products' },
  { to: '/bookings', icon: Calendar, labelKey: 'nav.bookings' },
  { to: '/profile', icon: User, labelKey: 'nav.profile' },
] as const;

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-cream/95 backdrop-blur-sm sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t('a11y.mainNav')}
    >
      <div className="flex">
        {navItems.map(({ to, icon: Icon, labelKey }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5',
                active ? 'text-gold' : 'text-ink',
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="max-w-full truncate text-center text-[10px] font-medium leading-tight">
                {t(labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
