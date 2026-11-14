import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { blockIndex, paletteIndexAt } from '../../lib/structure';
import { composeOrientation, isIdentity, NO_ORIENTATION, type Orientation } from '../../lib/transform';
import { Button, Segmented } from '../../ui/controls';
import { Icon } from '../../ui/Icon';
import { BlockInfo } from './BlockInfo';
import { Compass } from './Compass';
import { LayerCanvas, type CellPos, type LayerCanvasHandle } from './LayerCanvas';
import { LayerStepper } from './LayerStepper';
import { Legend, SymbolHelp } from './Legend';
import type { LoadedBlueprint } from './useBlueprint';
import { buildLegend } from './visuals';

// three.js ist groß – erst laden, wenn die 3D-Ansicht geöffnet wird.
const Preview3D = lazy(() => import('./Preview3D'));

/** Ebenen-Viewer mit Bedienelementen, Blockinfo und Legende. */
export function BlueprintView({
  blueprint,
  layer,
  onLayerChange,
  doneLayers,
  stepsForLayer,
  orientation,
  onOrientationChange,
  children,
}: {
  blueprint: LoadedBlueprint;
  /** Nullbasiert. */
  layer: number;
  onLayerChange: (layer: number) => void;
  doneLayers: readonly number[];
  stepsForLayer: string[];
  orientation: Orientation;
  onOrientationChange: (orientation: Orientation) => void;
  /** Zusätzlicher Inhalt unter der Ausrichtung, z. B. der Export. */
  children?: ReactNode;
}) {
  const { structure, visuals, start, contents, markers } = blueprint;
  const canvas = useRef<LayerCanvasHandle>(null);
  const [showBelow, setShowBelow] = useState(true);
  const [selected, setSelected] = useState<CellPos | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [mode, setMode] = useState<'2d' | '3d'>('2d');
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
      <Segmented
        label="Ansicht"
        className="self-start"
        value={mode}
        onChange={setMode}
        options={[
          { value: '2d', label: 'Ebene' },
          { value: '3d', label: '3D-Vorschau' },
        ]}
      />

      {mode === '2d' ? (
        <LayerCanvas
          ref={canvas}
          structure={structure}
          visuals={visuals}
          layer={layer}
          showBelow={showBelow}
          start={start}
          selected={selected}
          highlight={highlight}
          markers={markers}
          onSelect={setSelected}
          onSwipe={(d) => change(layer + d)}
          className="block w-full rounded-xl border border-line"
          style={{ height: `clamp(240px, min(${Math.round(aspect * 100)}vw, ${structure.size.z * 56 + 44}px), 62dvh)` }}
        />
      ) : (
        <Suspense fallback={<div className="grid h-[52dvh] min-h-64 place-items-center rounded-xl border border-line text-sm text-muted">Lade 3D-Vorschau …</div>}>
          <Preview3D
            structure={structure}
            visuals={visuals}
            maxLayer={layer}
            start={start}
            className="h-[52dvh] min-h-64 overflow-hidden rounded-xl border border-line bg-surface"
          />
        </Suspense>
      )}

      <LayerStepper layer={layer} total={total} onChange={change} done={doneLayers.includes(layer + 1)} />

      {mode === '3d' && (
        <p className="text-xs leading-relaxed text-muted">
          Gezeigt werden die Ebenen 1 bis {layer + 1}. Ziehen dreht, zwei Finger (oder Mausrad) zoomen. Der grüne Pfeil am Boden zeigt
          nach Norden, der kleine grüne Würfel markiert den Startblock.
        </p>
      )}

      <div className={mode === '2d' ? 'flex flex-wrap gap-2' : 'hidden'}>
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

      <div className="rounded-xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto text-sm font-semibold text-muted">Ausrichtung</h3>
          <Button
            aria-label="Bauplan nach links drehen"
            onClick={() => {
              setSelected(null);
              onOrientationChange(composeOrientation(orientation, 'ccw'));
            }}
          >
            ↺ Links
          </Button>
          <Button
            aria-label="Bauplan nach rechts drehen"
            onClick={() => {
              setSelected(null);
              onOrientationChange(composeOrientation(orientation, 'cw'));
            }}
          >
            ↻ Rechts
          </Button>
          <Button
            aria-pressed={orientation.mirror}
            onClick={() => {
              setSelected(null);
              onOrientationChange(composeOrientation(orientation, 'mirror'));
            }}
            className={orientation.mirror ? 'border-accent text-accent' : ''}
          >
            ⇋ Spiegeln
          </Button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {isIdentity(orientation)
            ? 'Der Bauplan steht wie in der Quelle. Drehe ihn, wenn die Farm bei dir in eine andere Richtung zeigen soll – die Pfeile der Blöcke drehen mit.'
            : `Gedreht um ${orientation.rot * 90}°${orientation.mirror ? ', gespiegelt' : ''}. Norden bleibt oben; Ausrichtungen der Blöcke sind angepasst.`}
          {!isIdentity(orientation) && (
            <button type="button" className="ml-2 min-h-8 text-accent underline" onClick={() => onOrientationChange(NO_ORIENTATION)}>
              Zurücksetzen
            </button>
          )}
        </p>
        {orientation.mirror && (
          <p className="mt-1 text-xs leading-relaxed text-warn">
            Achtung: Gespiegelte Redstone-Schaltungen verhalten sich in seltenen Fällen anders als das Original.
          </p>
        )}
      </div>

      {children}

      {selected && mode === '2d' && (
        <BlockInfo
          visual={visuals[paletteIndexAt(structure, selected.x, layer, selected.z)] ?? null}
          note={structure.paletteNotes?.[paletteIndexAt(structure, selected.x, layer, selected.z)]}
          content={contents.get(blockIndex(structure.size, selected.x, layer, selected.z))}
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
          {!isIdentity(orientation) && (
            <p className="mt-1.5 text-xs text-warn">
              Du hast den Bauplan gedreht oder gespiegelt: Himmelsrichtungen im Text gelten für das Original.
            </p>
          )}
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
