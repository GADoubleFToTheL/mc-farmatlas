import { DIRECTION_DE } from '../../lib/traits';
import { Icon } from '../../ui/Icon';
import type { CellPos } from './LayerCanvas';
import { Swatch } from './Swatch';
import type { BlockVisual } from './visuals';

function offsetText(dx: number, dz: number): string {
  const parts: string[] = [];
  if (dx !== 0) parts.push(`${Math.abs(dx)} nach ${dx > 0 ? DIRECTION_DE.east : DIRECTION_DE.west}`);
  if (dz !== 0) parts.push(`${Math.abs(dz)} nach ${dz > 0 ? DIRECTION_DE.south : DIRECTION_DE.north}`);
  return parts.length === 0 ? 'in der Spalte des Startblocks' : `${parts.join(', ')} vom Startblock`;
}

/** Zeigt Name und Zustand des angetippten Blocks. */
export function BlockInfo({
  visual,
  cell,
  layer,
  start,
  onClose,
}: {
  visual: BlockVisual | null;
  cell: CellPos;
  layer: number;
  start: { x: number; y: number; z: number };
  onClose: () => void;
}) {
  const isStart = cell.x === start.x && cell.z === start.z && layer === start.y;
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-line bg-surface-2 p-3">
      {visual ? <Swatch visual={visual} size={40} /> : <div className="size-10 shrink-0 rounded-[3px] border border-dashed border-line" />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {visual ? visual.title : 'Luft (kein Block)'}
          {isStart && <span className="ml-2 text-sm font-medium text-accent">Startblock</span>}
        </p>
        {visual?.traits.details.map((d) => (
          <p key={d} className="text-sm">
            {d}
          </p>
        ))}
        <p className="mt-1 text-sm text-muted">
          Ebene {layer + 1} · {offsetText(cell.x - start.x, cell.z - start.z)}
        </p>
        {visual && <p className="mt-1 font-mono text-xs break-all text-muted">{visual.raw}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label="Blockinfo schließen" className="-m-1 grid size-11 shrink-0 place-items-center rounded-lg hover:bg-line/60">
        <Icon name="close" />
      </button>
    </div>
  );
}
