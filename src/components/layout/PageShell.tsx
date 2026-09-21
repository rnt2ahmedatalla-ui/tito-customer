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
}

export function PageShell({
  children,
  marketing = false,
  darkHeader = false,
  noPadding = false,
}: PageShellProps) {
  return (
    <div className="min-h-dvh bg-cream font-arabic text-espresso">
      <OfflineBanner />
      <Header dark={darkHeader} />
      <main
        className={cn(
          marketing ? 'w-full' : 'mx-auto max-w-5xl',
          !marketing && !noPadding && 'px-4 py-6 pb-24 sm:pb-8',
          marketing && 'pb-24 sm:pb-0',
        )}
      >
        {children}
      </main>
      <BottomNav />
      <PwaHint />
    </div>
  );
}
