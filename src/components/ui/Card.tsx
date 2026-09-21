import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
  interactive?: boolean;
}

export function Card({ className, selected, interactive, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-default bg-cream p-4 shadow-warm',
        interactive && 'cursor-pointer transition-all duration-brand ease-brand hover:border-gold hover:shadow-warm-raised motion-reduce:transition-none',
        selected && 'border-gold ring-2 ring-gold/30',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
