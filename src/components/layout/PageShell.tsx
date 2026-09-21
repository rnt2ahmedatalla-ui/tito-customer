import { type ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { OfflineBanner } from './OfflineBanner';
import { PwaHint } from './PwaHint';

interface PageShellProps {
  children: ReactNode;
  noPadding?: boolean;
}

export function PageShell({ children, noPadding = false }: PageShellProps) {
  return (
    <div className="min-h-dvh bg-cream font-arabic text-espresso">
      <OfflineBanner />
      <Header />
      <main className={`mx-auto max-w-5xl ${noPadding ? '' : 'px-4 py-6 pb-24 sm:pb-8'}`}>
        {children}
      </main>
      <BottomNav />
      <PwaHint />
    </div>
  );
}
