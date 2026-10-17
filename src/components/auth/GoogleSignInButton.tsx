import { type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';
import { cn } from '@/lib/cn';

interface GoogleSignInButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  fullWidth?: boolean;
  variant?: 'white' | 'gold';
  label?: string;
}

export function GoogleSignInButton({
  loading = false,
  fullWidth = true,
  variant = 'white',
  label = 'Sign in with Google',
  className,
  disabled,
  ...props
}: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'group relative inline-flex min-h-12 items-center justify-center gap-3 rounded-btn px-5 py-3 font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60',
        variant === 'white' &&
          'border-2 border-espresso/15 bg-white text-espresso shadow-xs hover:border-gold hover:bg-sand/30 hover:shadow-warm',
        variant === 'gold' &&
          'border border-gold/40 bg-gold text-espresso shadow-warm hover:brightness-105',
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-5 shrink-0 animate-spin text-espresso" />
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white shadow-2xs">
          <GoogleIcon className="size-4 shrink-0" />
        </span>
      )}
      <span className="text-sm font-bold sm:text-base">{label}</span>
    </button>
  );
}
