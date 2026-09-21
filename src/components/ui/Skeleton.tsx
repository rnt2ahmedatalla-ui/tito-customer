import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-btn bg-sand motion-reduce:animate-none', className)}
      aria-hidden
    />
  );
}
