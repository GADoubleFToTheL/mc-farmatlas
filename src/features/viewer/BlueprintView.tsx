import { useEffect, useMemo, useRef, useState } from 'react';
import { paletteIndexAt } from '../../lib/structure';
import { Button } from '../../ui/controls';
import { Icon } from '../../ui/Icon';
import { BlockInfo } from './BlockInfo';
import { Compass } from './Compass';
import { LayerCanvas, type CellPos, type LayerCanvasHandle } from './LayerCanvas';
import { LayerStepper } from './LayerStepper';
import { Legend, SymbolHelp } from './Legend';
import type { LoadedBlueprint } from './useBlueprint';
import { buildLegend } from './visuals';

/** Ebenen-Viewer mit Bedienelementen, Blockinfo und Legende. */
export function BlueprintView({
  blueprint,
  layer,
  onLayerChange,
  doneLayers,
  stepsForLayer,
}: {
  blueprint: LoadedBlueprint;
  /** Nullbasiert. */
  layer: number;
  onLayerChange: (layer: number) => void;
  doneLayers: readonly number[];
  stepsForLayer: string[];
}) {
  const { structure, visuals, start } = blueprint;
  const canvas = useRef<LayerCanvasHandle>(null);
  const [showBelow, setShowBelow] = useState(true);
  const [selected, setSelected] = useState<CellPos | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const total = structure.size.y;

  const legend = useMemo(() => buildLegend(structure, visuals, layer), [structure, visuals, layer]);
  const highlight = useMemo(() => {
    const entry = legend.find((e) => e.visual.legendKey === highlightKey);
    return entry ? new Set(entry.paletteIndices) : null;
  }, [legend, highlightKey]);

  useEffect(() => {
    setSelected(null);
  }, [layer]);

  const change = (next: number) => onLayerChange(Math.max(0, Math.min(total - 1, next)));
  const aspect = (structure.size.z + 1) / (structure.size.x + 1);

  return (
    <div className="flex flex-col gap-3">
      <LayerCanvas
          ref={canvas}
          structure={structure}
          visuals={visuals}
          layer={layer}
          showBelow={showBelow}
          start={start}
          selected={selected}
          highlight={highlight}
          onSelect={setSelected}
          onSwipe={(d) => change(layer + d)}
          className="block w-full rounded-xl border border-line"
          style={{ height: `clamp(240px, min(${Math.round(aspect * 100)}vw, ${structure.size.z * 56 + 44}px), 62dvh)` }}
        />

      <LayerStepper layer={layer} total={total} onChange={change} done={doneLayers.includes(layer + 1)} />

      <div className="flex flex-wrap gap-2">
        <Button aria-pressed={showBelow} onClick={() => setShowBelow(!showBelow)} className={showBelow ? 'border-accent text-accent' : ''}>
          <Icon name="layers" />
          Ebene darunter {showBelow ? 'an' : 'aus'}
        </Button>
        <Button onClick={() => canvas.current?.resetZoom()}>
          <Icon name="reset" />
          Zoom zurücksetzen
        </Button>
        <Compass className="ml-auto" />
      </div>

      {selected && (
        <BlockInfo
          visual={visuals[paletteIndexAt(structure, selected.x, layer, selected.z)] ?? null}
          cell={selected}
          layer={layer}
          start={start}
          onClose={() => setSelected(null)}
        />
      )}

      {stepsForLayer.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-3">
          <h3 className="mb-1 text-sm font-semibold text-muted">Bauschritt zu dieser Ebene</h3>
          {stepsForLayer.map((s) => (
            <p key={s} className="text-sm leading-relaxed">
              {s}
            </p>
          ))}
        </div>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-muted">Legende – Ebene {layer + 1}</h3>
        <Legend
          entries={legend}
          activeKey={highlightKey}
          onToggle={(e) => setHighlightKey(highlightKey === e.visual.legendKey ? null : e.visual.legendKey)}
        />
      </section>
      <SymbolHelp />
      <p className="text-xs text-muted">
        Wischen wechselt die Ebene, zwei Finger zoomen, Doppeltipp vergrößert (am PC: Doppelklick oder Strg + Mausrad).
        Das Lineal zählt vom Startblock aus.
      </p>
    </div>
  );
}
