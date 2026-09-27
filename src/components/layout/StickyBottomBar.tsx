import { type ReactNode } from 'react';

interface StickyBottomBarProps {
  children: ReactNode;
}

export function StickyBottomBar({ children }: StickyBottomBarProps) {
  return (
    <div
      className="fixed inset-x-0 z-40 border-t border-default bg-cream/95 px-4 py-3 backdrop-blur-sm bottom-[calc(3.5rem+env(safe-area-inset-bottom))] sm:static sm:z-auto sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
    >
      <div className="mx-auto w-full max-w-lg">{children}</div>
    </div>
  );
}
