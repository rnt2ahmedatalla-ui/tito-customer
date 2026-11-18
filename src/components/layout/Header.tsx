import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/brand/Logo';
import { CustomerNotificationsBell } from './CustomerNotificationsBell';
import { InstallButton } from './InstallButton';
import { isStandalone } from '@/lib/install';
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
  const navigate = useNavigate();
  const isAr = !!i18n.language?.startsWith('ar');
  const BackIcon = isAr ? ArrowRight : ArrowLeft;
  const showBack = location.pathname !== '/';
  // لو مفيش صفحة قبلها (فتح لينك مباشر) نرجع للرئيسية
  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/');
  };
  // الموبايل في المتصفح عنده رجوع جاهز، فبنظهر الزرار هناك بس لو التطبيق متثبّت (مفيش شريط متصفح)
  const backOnMobile = isStandalone();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-colors duration-brand ease-brand',
        dark
          ? 'border-b border-white/5 bg-espresso/80 text-cream backdrop-blur-md'
          : 'border-b border-default bg-cream/90 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex shrink-0 items-center gap-1.5">
          {showBack ? (
            <button
              type="button"
              onClick={goBack}
              aria-label={t('common.back')}
              title={t('common.back')}
              className={cn(
                'size-10 items-center justify-center rounded-btn transition-colors duration-brand',
                backOnMobile ? 'inline-flex' : 'hidden sm:inline-flex',
                dark ? 'text-cream hover:bg-cream/10' : 'text-espresso hover:bg-sand',
              )}
            >
              <BackIcon className="size-5" aria-hidden />
            </button>
          ) : null}
          <Link to="/" aria-label={t('a11y.logo')} className="shrink-0">
            <Logo variant={dark ? 'dark' : 'light'} mark height={36} />
          </Link>
        </div>

        <nav className="hidden items-center gap-1 sm:flex" aria-label={t('a11y.mainNav')}>
          {navItems.map(({ to, labelKey }) => {
            const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
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
          <InstallButton dark={dark} />
          <CustomerNotificationsBell dark={dark} />
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
