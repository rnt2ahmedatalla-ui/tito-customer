import { type ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { OfflineBanner } from './OfflineBanner';
import { PwaHint } from './PwaHint';
import { cn } from '@/lib/cn';

interface PageShellProps {
  children: ReactNode;
  /** Full-bleed marketing layout (home) */
  marketing?: boolean;
  /** Transparent header over dark hero */
  darkHeader?: boolean;
  noPadding?: boolean;
  /** Extra space so a sticky action bar clears the mobile tab bar */
  withActionBar?: boolean;
}

export function PageShell({
  children,
  marketing = false,
  darkHeader = false,
  noPadding = false,
  withActionBar = false,
}: PageShellProps) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-cream font-arabic text-espresso">
      <OfflineBanner />
      <Header dark={darkHeader} />
      <main
        className={cn(
          marketing ? 'w-full' : 'mx-auto w-full max-w-5xl',
          !marketing &&
            !noPadding &&
            (withActionBar
              ? 'px-4 py-6 pb-[calc(13rem+env(safe-area-inset-bottom))] sm:pb-8'
              : 'px-4 py-6 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:pb-8'),
          marketing && 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0',
        )}
      >
        {children}
      </main>
      <BottomNav />
      <PwaHint />
    </div>
  );
}
