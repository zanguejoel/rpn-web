import { useId } from 'react';
import { cn } from '@/lib/cn';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string;
  trailing?: React.ReactNode;
}

export function TextField({ label, error, hint, trailing, className, id, ...rest }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[11px] font-extrabold text-ink">
        {label}
      </label>
      <div
        className={cn(
          'flex items-center gap-2 rounded-[var(--radius-input)] border-[1.5px] bg-surface-raised px-3',
          'focus-within:border-accent',
          error ? 'border-urgent-ink' : 'border-border-subtle',
        )}
      >
        <input
          {...rest}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            'h-12 flex-1 bg-transparent text-sm font-semibold text-ink outline-none',
            'placeholder:font-normal placeholder:text-ink-faint',
            className,
          )}
        />
        {trailing}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-[11px] text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[11px] font-semibold text-urgent-ink">
          {error}
        </p>
      )}
    </div>
  );
}
