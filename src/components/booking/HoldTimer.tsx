import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { getRemainingMs, formatCountdown, isExpired } from '@/lib/time';
import { cn } from '@/lib/cn';

interface HoldTimerProps {
  expiresAt: string;
  onExpired: () => void;
}

export function HoldTimer({ expiresAt, onExpired }: HoldTimerProps) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(() => getRemainingMs(expiresAt));

  useEffect(() => {
    const tick = () => {
      const ms = getRemainingMs(expiresAt);
      setRemaining(ms);
      if (isExpired(expiresAt)) onExpired();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);

  const minutes = remaining / 60000;
  const urgency = minutes < 3 ? 'danger' : minutes < 10 ? 'warning' : 'normal';

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 rounded-card px-4 py-3 font-latin text-lg font-semibold',
        urgency === 'danger' && 'bg-danger/10 text-danger',
        urgency === 'warning' && 'bg-warning/10 text-warning',
        urgency === 'normal' && 'bg-sand text-espresso',
      )}
      role="timer"
      aria-live="polite"
    >
      <Clock className="size-5" aria-hidden />
      <span>{t('booking.holdExpires')}: {formatCountdown(remaining)}</span>
    </div>
  );
}
