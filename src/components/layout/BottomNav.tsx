import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Home, User, Scissors } from 'lucide-react';
import { cn } from '@/lib/cn';

const navItems = [
  { to: '/', icon: Home, labelKey: 'nav.home' },
  { to: '/book', icon: Scissors, labelKey: 'nav.book' },
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
                'flex flex-1 flex-col items-center gap-0.5 py-2 min-h-[56px] justify-center',
                active ? 'text-gold' : 'text-ink',
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className="text-[10px] font-medium">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
