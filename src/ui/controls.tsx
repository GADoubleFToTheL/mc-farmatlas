import type { ButtonHTMLAttributes, ReactNode } from 'react';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export { cx };

/** Auswahl-Chip (Filter, Kategorien). Mindestens 44 px hoch. */
export function Chip({
  active,
  children,
  className,
  ...rest
}: { active: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors',
        active ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface text-ink hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Button({
  variant = 'secondary',
  className,
  children,
  ...rest
}: { variant?: 'primary' | 'secondary' | 'ghost' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-40',
        variant === 'primary' && 'bg-accent text-accent-ink hover:brightness-110',
        variant === 'secondary' && 'border border-line bg-surface-2 text-ink hover:bg-line/60',
        variant === 'ghost' && 'text-ink hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Umschalter aus zwei bis vier Optionen. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cx('inline-flex rounded-lg border border-line bg-surface p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-10 flex-1 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
            o.value === value ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'accent' | 'warn' | 'danger'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium',
        tone === 'neutral' && 'border-line text-muted',
        tone === 'accent' && 'border-accent/50 text-accent',
        tone === 'warn' && 'border-warn/50 text-warn',
        tone === 'danger' && 'border-danger/50 text-danger',
      )}
    >
      {children}
    </span>
  );
}

/** Schwierigkeit 1–5 als gefüllte Kästchen. */
export function Difficulty({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Schwierigkeit ${value} von 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={cx('size-2.5 rounded-[2px]', n <= value ? 'bg-accent' : 'bg-line')} />
      ))}
    </span>
  );
}
