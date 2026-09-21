import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Home, User } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/cn';

const navItems = [
  { to: '/', icon: Home, labelKey: 'nav.home' },
  { to: '/book', icon: Calendar, labelKey: 'nav.book' },
  { to: '/bookings', icon: Calendar, labelKey: 'nav.bookings' },
  { to: '/profile', icon: User, labelKey: 'nav.profile' },
] as const;

export function Header() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-default bg-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" aria-label={t('a11y.logo')}>
          <Logo variant="light" height={30} />
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label={t('a11y.mainNav')}>
          {navItems.map(({ to, labelKey }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'rounded-btn px-3 py-2 text-sm font-medium transition-colors',
                location.pathname === to ? 'bg-gold text-espresso' : 'text-ink hover:text-espresso',
              )}
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
