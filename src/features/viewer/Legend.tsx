import { cx } from '../../ui/controls';
import { Swatch } from './Swatch';
import type { LegendEntry } from './visuals';

/** Legende mit Anzahl; Antippen hebt die Blöcke im Raster hervor. */
export function Legend({
  entries,
  activeKey,
  onToggle,
}: {
  entries: LegendEntry[];
  activeKey: string | null;
  onToggle: (entry: LegendEntry) => void;
}) {
  if (entries.length === 0) {
    return <p className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">Diese Ebene ist leer.</p>;
  }
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {entries.map((entry) => {
        const active = activeKey === entry.visual.legendKey;
        return (
          <li key={entry.visual.legendKey}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(entry)}
              className={cx(
                'flex min-h-12 w-full items-center gap-3 rounded-lg border px-2.5 py-1.5 text-left',
                active ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:bg-surface-2',
              )}
            >
              <Swatch visual={entry.visual} />
              <span className="min-w-0 flex-1 text-sm leading-snug">{entry.visual.title}</span>
              <span className="font-mono text-sm font-semibold tabular-nums">{entry.count}×</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Erklärung der Symbole – eigene Darstellung, keine Minecraft-Texturen. */
export function SymbolHelp() {
  const rows: Array<[string, string]> = [
    ['↑ ← ↓ →', 'Ausrichtung des Blocks (Norden ist oben)'],
    ['⊙ / ⊗', 'zeigt nach oben / nach unten'],
    ['roter Punkt', 'Beobachter: Signalausgang (Rückseite)'],
    ['Zahl im roten Kreis', 'Verstärker: Verzögerung in Ticks'],
    ['halb gefüllt', 'obere bzw. untere Stufe'],
    ['Rahmen im Blau', 'Wasserquelle – gestreift heißt fließend'],
    ['grüne Ecke', 'Startblock, hier beginnst du'],
    ['blass', 'Ebene darunter (zur Orientierung)'],
  ];
  return (
    <details className="rounded-lg border border-line bg-surface">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">Symbole erklärt</summary>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 px-3 pb-3 text-sm">
        {rows.map(([symbol, meaning]) => (
          <div key={symbol} className="contents">
            <dt className="font-mono text-ink">{symbol}</dt>
            <dd className="text-muted">{meaning}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
