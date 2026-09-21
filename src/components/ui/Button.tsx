import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-gold text-espresso hover:bg-gold-soft font-semibold',
  secondary: 'bg-sand text-espresso border border-default hover:bg-cream',
  ghost: 'bg-transparent text-espresso hover:bg-sand/60',
  danger: 'bg-danger text-cream hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-[36px] px-3 text-sm',
  md: 'min-h-[44px] px-5 text-base',
  lg: 'min-h-[52px] px-6 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', fullWidth, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-btn font-latin transition-all duration-brand ease-brand',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        'motion-reduce:transition-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      ) : null}
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
