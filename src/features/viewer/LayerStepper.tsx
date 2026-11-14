import { Icon } from '../../ui/Icon';
import { cx } from '../../ui/controls';

/** Große ±-Tasten zum Wechseln der Ebene. */
export function LayerStepper({
  layer,
  total,
  onChange,
  done = false,
  className,
}: {
  /** Nullbasiert. */
  layer: number;
  total: number;
  onChange: (layer: number) => void;
  done?: boolean;
  className?: string;
}) {
  const button =
    'grid h-14 w-16 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-ink active:bg-line disabled:opacity-30';
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <button type="button" className={button} disabled={layer <= 0} onClick={() => onChange(layer - 1)} aria-label="Ebene tiefer">
        <Icon name="minus" className="size-7" />
      </button>
      <div className="min-w-0 flex-1 text-center" aria-live="polite">
        <p className="text-lg leading-tight font-semibold">
          Ebene {layer + 1} <span className="font-normal text-muted">von {total}</span>
        </p>
        <p className="text-xs text-muted">
          {done ? 'erledigt ✓' : layer === 0 ? 'unterste Ebene' : layer === total - 1 ? 'oberste Ebene' : `${layer} über dem Boden`}
        </p>
      </div>
      <button
        type="button"
        className={button}
        disabled={layer >= total - 1}
        onClick={() => onChange(layer + 1)}
        aria-label="Ebene höher"
      >
        <Icon name="plus" className="size-7" />
      </button>
    </div>
  );
}
