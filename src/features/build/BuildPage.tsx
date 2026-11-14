import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NotFoundPage } from '../../app/NotFoundPage';
import { findFarm } from '../../data/farms';
import { updateFarmState, useFarmState } from '../../db/store';
import { paletteIndexAt } from '../../lib/structure';
import { Button, cx } from '../../ui/controls';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { MaterialsPanel } from '../materials/MaterialsPanel';
import { BlockInfo } from '../viewer/BlockInfo';
import { LayerCanvas, type CellPos, type LayerCanvasHandle } from '../viewer/LayerCanvas';
import { LayerStepper } from '../viewer/LayerStepper';
import { Legend } from '../viewer/Legend';
import { useBlueprint, type LoadedBlueprint } from '../viewer/useBlueprint';
import { buildLegend } from '../viewer/visuals';
import type { FarmSummary } from '../../lib/catalog';
import { useWakeLock } from './useWakeLock';

export function BuildPage() {
  const { id } = useParams();
  const summary = findFarm(id);
  const blueprint = useBlueprintOrNull(summary);
  if (!summary || !blueprint) return <NotFoundPage />;
  return <BuildMode key={summary.farm.id} summary={summary} blueprint={blueprint} />;
}

const EMPTY_FARM = { blueprint: null } as unknown as FarmSummary['farm'];

function useBlueprintOrNull(summary: FarmSummary | undefined): LoadedBlueprint | null {
  return useBlueprint(summary?.farm ?? EMPTY_FARM);
}

function firstOpenLayer(done: readonly number[], total: number): number {
  for (let i = 0; i < total; i++) if (!done.includes(i + 1)) return i;
  return total - 1;
}

const WAKE_TEXT = {
  aktiv: 'Bildschirm bleibt an',
  ersatz: 'Bildschirm bleibt an',
  aus: 'Bildschirm kann ausgehen',
} as const;

function BuildMode({ summary, blueprint }: { summary: FarmSummary; blueprint: LoadedBlueprint }) {
  const { farm } = summary;
  const { structure, visuals, start } = blueprint;
  const total = structure.size.y;
  const navigate = useNavigate();
  const farmState = useFarmState(farm.id);
  const wake = useWakeLock(true);
  const canvas = useRef<LayerCanvasHandle>(null);

  const [layer, setLayerRaw] = useState(() => firstOpenLayer(farmState.doneLayers, total));
  const [showBelow, setShowBelow] = useState(true);
  const [selected, setSelected] = useState<CellPos | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const setLayer = (next: number) => {
    setLayerRaw(Math.max(0, Math.min(total - 1, next)));
    setSelected(null);
  };

  const legend = useMemo(() => buildLegend(structure, visuals, layer), [structure, visuals, layer]);
  const highlight = useMemo(() => {
    const entry = legend.find((e) => e.visual.legendKey === highlightKey);
    return entry ? new Set(entry.paletteIndices) : null;
  }, [legend, highlightKey]);

  const done = farmState.doneLayers.includes(layer + 1);
  const doneCount = farmState.doneLayers.filter((l) => l <= total).length;
  const allDone = doneCount >= total;
  const steps = farm.steps.filter((s) => s.layers?.includes(layer + 1)).map((s) => s.text);

  const toggleDone = () => {
    const doneLayers = done
      ? farmState.doneLayers.filter((l) => l !== layer + 1)
      : [...farmState.doneLayers, layer + 1].sort((a, b) => a - b);
    updateFarmState(farm.id, { doneLayers });
    if (!done && layer < total - 1) setLayer(layer + 1);
  };

  // Vollbild (wo der Browser es erlaubt; auf dem iPhone füllt die Ansicht ohnehin den Bildschirm)
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, []);
  const canFullscreen = typeof document.documentElement.requestFullscreen === 'function';
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  };

  const iconButton = 'grid size-11 shrink-0 place-items-center rounded-lg hover:bg-surface-2';

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg pt-[env(safe-area-inset-top)]">
      <header className="flex items-center gap-1 px-2">
        <button type="button" className={iconButton} onClick={() => navigate(`/farm/${farm.id}/bauplan?ebene=${layer + 1}`)} aria-label="Bau-Modus beenden">
          <Icon name="close" className="size-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{farm.name}</h1>
          <p className={cx('flex items-center gap-1 text-xs', wake === 'aus' ? 'text-warn' : 'text-muted')}>
            <Icon name="sun" className="size-3.5" />
            {WAKE_TEXT[wake]}
          </p>
        </div>
        <span className="px-1 font-mono text-sm tabular-nums" aria-label={`${doneCount} von ${total} Ebenen fertig`}>
          {doneCount}/{total}
        </span>
        {canFullscreen && (
          <button type="button" className={iconButton} onClick={toggleFullscreen} aria-pressed={fullscreen} aria-label="Vollbild umschalten">
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </header>
      <div className="h-1 bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneCount} aria-label="Baufortschritt">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${(doneCount / total) * 100}%` }} />
      </div>

      <div className="relative min-h-0 flex-1">
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
          onSwipe={(d) => setLayer(layer + d)}
          lockScroll
          className="absolute inset-0 block size-full"
        />
        {highlightKey && highlight && (
          <button
            type="button"
            onClick={() => setHighlightKey(null)}
            className="absolute top-2 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-accent bg-bg/95 px-4 text-sm"
          >
            Hervorhebung aus
            <Icon name="close" className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {selected ? (
          <BlockInfo
            visual={visuals[paletteIndexAt(structure, selected.x, layer, selected.z)] ?? null}
            cell={selected}
            layer={layer}
            start={start}
            onClose={() => setSelected(null)}
          />
        ) : allDone ? (
          <p className="rounded-lg bg-accent/15 px-3 py-2 text-sm font-medium text-accent">
            Alle Ebenen sind abgehakt – die Farm ist fertig gebaut.
          </p>
        ) : (
          steps.length > 0 && <p className="max-h-20 overflow-y-auto text-sm leading-snug text-muted">{steps.join(' ')}</p>
        )}

        <LayerStepper layer={layer} total={total} onChange={setLayer} done={done} />

        <div className="flex gap-2">
          <Button
            aria-pressed={showBelow}
            aria-label={`Ebene darunter ${showBelow ? 'ausblenden' : 'einblenden'}`}
            onClick={() => setShowBelow(!showBelow)}
            className={cx('h-13 px-3.5', showBelow && 'border-accent text-accent')}
          >
            <Icon name="layers" className="size-6" />
          </Button>
          <Button onClick={() => setSheetOpen(true)} className="h-13">
            <Icon name="list" />
            Blöcke
          </Button>
          <Button variant={done ? 'secondary' : 'primary'} onClick={toggleDone} className="h-13 flex-1 text-base">
            <Icon name="check" />
            {done ? 'Erledigt – zurücknehmen' : 'Ebene fertig'}
          </Button>
        </div>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={`Ebene ${layer + 1}: Blöcke und Material`}>
        <h3 className="mb-2 text-sm font-semibold text-muted">Was wird gesetzt? (Antippen hebt hervor)</h3>
        <Legend
          entries={legend}
          activeKey={highlightKey}
          onToggle={(e) => {
            setHighlightKey(highlightKey === e.visual.legendKey ? null : e.visual.legendKey);
            setSheetOpen(false);
          }}
        />
        <h3 className="mt-5 mb-2 text-sm font-semibold text-muted">Material für diese Ebene</h3>
        <MaterialsPanel farm={farm} structure={structure} farmState={farmState} layer={layer} fixedScope="ebene" />
      </Sheet>
    </div>
  );
}
