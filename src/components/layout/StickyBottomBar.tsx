import { type ReactNode } from 'react';

interface StickyBottomBarProps {
  children: ReactNode;
}

export function StickyBottomBar({ children }: StickyBottomBarProps) {
  return (
    <div
      style={{ bottom: 'var(--nav-h, calc(4.5rem + env(safe-area-inset-bottom)))' }}
      className="fixed inset-x-0 z-[45] border-t border-default bg-cream px-4 py-2.5 shadow-[0_-6px_16px_rgba(52,26,14,0.06)] sm:static sm:shadow-none sm:z-auto sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0"
    >
      <div className="mx-auto w-full max-w-lg">{children}</div>
    </div>
  );
}
