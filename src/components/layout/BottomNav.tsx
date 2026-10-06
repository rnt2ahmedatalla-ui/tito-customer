import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Home, User, Scissors, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase';
import { buildWhatsAppUrl } from '@/lib/urls';

const navItems = [
  { to: '/', icon: Home, labelKey: 'nav.home', kind: 'link' as const },
  { to: '/book', icon: Scissors, labelKey: 'nav.book', kind: 'link' as const },
  { to: 'whatsapp', icon: MessageCircle, labelKey: 'nav.whatsapp', kind: 'whatsapp' as const },
  { to: '/bookings', icon: Calendar, labelKey: 'nav.bookings', kind: 'link' as const },
  { to: '/profile', icon: User, labelKey: 'nav.profile', kind: 'link' as const },
];

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  const settings = useQuery({
    queryKey: ['settings', 'nav-whatsapp'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('shop_whatsapp')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const whatsappUrl = settings.data?.shop_whatsapp
    ? buildWhatsAppUrl(settings.data.shop_whatsapp)
    : null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-cream/95 backdrop-blur-sm sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t('a11y.mainNav')}
    >
      <div className="flex">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.kind === 'whatsapp') {
            return (
              <a
                key="whatsapp"
                href={whatsappUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5',
                  whatsappUrl ? 'text-ink' : 'pointer-events-none text-ink/40',
                )}
                aria-disabled={!whatsappUrl}
                onClick={(e) => {
                  if (!whatsappUrl) e.preventDefault();
                }}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="max-w-full truncate text-center text-[10px] font-medium leading-tight">
                  {t(item.labelKey)}
                </span>
              </a>
            );
          }

          const active =
            location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5',
                active ? 'text-gold' : 'text-ink',
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="max-w-full truncate text-center text-[10px] font-medium leading-tight">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
