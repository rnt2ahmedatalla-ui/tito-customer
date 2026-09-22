import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/Logo';
import { setLanguage } from '@/i18n';
import { cn } from '@/lib/cn';

const navItems = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/book', labelKey: 'nav.book' },
  { to: '/bookings', labelKey: 'nav.bookings' },
  { to: '/profile', labelKey: 'nav.profile' },
] as const;

interface HeaderProps {
  dark?: boolean;
}

export function Header({ dark = false }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-colors duration-brand ease-brand',
        dark
          ? 'border-b border-white/5 bg-espresso/80 text-cream backdrop-blur-md'
          : 'border-b border-default bg-cream/90 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" aria-label={t('a11y.logo')} className="shrink-0">
          <Logo variant={dark ? 'dark' : 'light'} mark height={36} />
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label={t('a11y.mainNav')}>
          {navItems.map(({ to, labelKey }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'rounded-btn px-3.5 py-2 text-sm font-medium transition-colors duration-brand',
                  dark
                    ? active
                      ? 'bg-gold text-espresso'
                      : 'text-cream/75 hover:text-cream'
                    : active
                      ? 'bg-gold text-espresso'
                      : 'text-ink hover:text-espresso',
                )}
              >
                {t(labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
            className={cn(
              'rounded-btn px-3 py-2 text-sm font-semibold transition-colors duration-brand font-latin',
              dark
                ? 'border border-cream/20 text-cream/80 hover:bg-cream/10'
                : 'border border-default text-ink hover:bg-sand',
            )}
            aria-label={t('profile.language')}
          >
            {i18n.language === 'ar' ? 'EN' : 'ع'}
          </button>
          <Link
            to="/book"
            className="hidden rounded-btn bg-gold px-4 py-2 text-sm font-semibold text-espresso transition-colors duration-brand hover:bg-gold-soft sm:inline-flex"
          >
            {t('home.heroCta')}
          </Link>
        </div>
      </div>
    </header>
  );
}
