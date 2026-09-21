import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label.replace(/\s/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-espresso">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'min-h-[44px] w-full rounded-btn border border-default bg-cream px-4 text-espresso',
            'placeholder:text-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
            'disabled:opacity-50',
            error && 'border-danger',
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
