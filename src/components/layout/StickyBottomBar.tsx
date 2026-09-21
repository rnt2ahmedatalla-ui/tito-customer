import { type ReactNode } from 'react';

interface StickyBottomBarProps {
  children: ReactNode;
}

export function StickyBottomBar({ children }: StickyBottomBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-default bg-cream/95 p-4 backdrop-blur-sm sm:bottom-auto sm:relative sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-lg">{children}</div>
    </div>
  );
}
