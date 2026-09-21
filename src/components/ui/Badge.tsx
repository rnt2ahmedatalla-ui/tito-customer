import { cn } from '@/lib/cn';
import type { BookingStatus } from '@/types/database';

const statusStyles: Record<BookingStatus, string> = {
  pending_payment: 'bg-warning/15 text-warning',
  confirmed: 'bg-success/15 text-success',
  completed: 'bg-info/15 text-info',
  cancelled: 'bg-ink/10 text-ink',
  expired: 'bg-ink/10 text-ink',
  no_show: 'bg-danger/15 text-danger',
};

interface BadgeProps {
  status: BookingStatus;
  label: string;
  className?: string;
}

export function Badge({ status, label, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center rounded-pill px-3 text-xs font-semibold font-latin',
        statusStyles[status],
        className,
      )}
    >
      {label}
    </span>
  );
}
