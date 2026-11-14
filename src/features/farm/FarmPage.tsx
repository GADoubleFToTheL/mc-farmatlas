import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { NotFoundPage } from '../../app/NotFoundPage';
import { findFarm } from '../../data/farms';
import { toggleFavorite, useFarmState, useSettings } from '../../db/store';
import { CATEGORY_LABELS, EDITION_LABELS, versionFit } from '../../lib/catalog';
import { Button, cx } from '../../ui/controls';
import { Icon, type IconName } from '../../ui/Icon';
import { MaterialsPanel } from '../materials/MaterialsPanel';
import { BlueprintView } from '../viewer/BlueprintView';
import { useBlueprint } from '../viewer/useBlueprint';
import { FarmInfo } from './FarmInfo';

const TABS: ReadonlyArray<{ id: 'info' | 'bauplan' | 'material'; label: string; icon: IconName }> = [
  { id: 'info', label: 'Info', icon: 'info' },
  { id: 'bauplan', label: 'Bauplan', icon: 'layers' },
  { id: 'material', label: 'Material', icon: 'list' },
];
type TabId = (typeof TABS)[number]['id'];

function MissingBlueprint() {
  return (
    <div className="rounded-xl border border-warn/40 bg-warn/10 p-4">
      <p className="flex items-center gap-2 font-semibold">
        <Icon name="warn" className="text-warn" />
        Bauplan fehlt
      </p>
      <p className="mt-1.5 text-sm leading-relaxed">
        Für diese Farm gibt es noch keinen gesicherten Bauplan – und geraten wird hier nicht. Lade die Schematic-Datei
        aus der Quelle herunter; der Import in der App folgt in Phase 2.
      </p>
    </div>
  );
}

export function FarmPage() {
  const { id, tab: tabParam } = useParams();
  const summary = findFarm(id);
  if (!summary) return <NotFoundPage />;
  return <FarmPageContent key={summary.farm.id} farmId={summary.farm.id} tab={tabParam} />;
}

function FarmPageContent({ farmId, tab: tabParam }: { farmId: string; tab: string | undefined }) {
  const summary = findFarm(farmId)!;
  const { farm } = summary;
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const settings = useSettings();
  const farmState = useFarmState(farm.id);
  const blueprint = useBlueprint(farm);

  const tab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'info';
  const total = blueprint?.structure.size.y ?? 1;
  const layer = Math.max(0, Math.min(total - 1, (Number(search.get('ebene')) || 1) - 1));
  const setLayer = (next: number) => setSearch({ ebene: String(next + 1) }, { replace: true });

  const fit = versionFit(farm, settings.edition, settings.versions[settings.edition]);
  const stepsForLayer = farm.steps.filter((s) => s.layers?.includes(layer + 1)).map((s) => s.text);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-1">
        <Link to="/" aria-label="Zurück zur Übersicht" className="-ml-2 grid size-11 shrink-0 place-items-center rounded-lg hover:bg-surface-2">
          <Icon name="back" className="size-6" />
        </Link>
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{CATEGORY_LABELS[farm.category]}</p>
          <h1 className="text-xl leading-snug font-semibold">{farm.name}</h1>
        </div>
        <button
          type="button"
          onClick={() => toggleFavorite(farm.id)}
          aria-pressed={farmState.favorite}
          aria-label={farmState.favorite ? 'Aus den Favoriten entfernen' : 'Als Favorit merken'}
          className={cx('grid size-12 shrink-0 place-items-center rounded-lg', farmState.favorite ? 'text-warn' : 'text-muted hover:text-ink')}
        >
          <Icon name="star" className="size-6" filled={farmState.favorite} />
        </button>
      </div>

      {fit !== 'passt' && (
        <p className="flex gap-2.5 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm leading-relaxed">
          <Icon name="warn" className="mt-0.5 size-4 shrink-0 text-warn" />
          {fit === 'andere-edition'
            ? `Diese Farm ist nicht für ${EDITION_LABELS[settings.edition]} ausgelegt.`
            : `Für ${EDITION_LABELS[settings.edition]} ${settings.versions[settings.edition]} ist diese Farm nicht bestätigt (Bereich: ${farm.editions[settings.edition]!.from} – ${farm.editions[settings.edition]!.to}).`}
        </p>
      )}

      <nav aria-label="Ansicht" className="sticky top-14 z-10 -mx-4 flex gap-1 border-b border-line bg-bg/95 px-4 backdrop-blur">
        {TABS.map((t) => (
          <Link
            key={t.id}
            to={{ pathname: t.id === 'info' ? `/farm/${farm.id}` : `/farm/${farm.id}/${t.id}`, search: search.toString() }}
            replace
            aria-current={tab === t.id ? 'page' : undefined}
            className={cx(
              'flex min-h-12 flex-1 items-center justify-center gap-2 border-b-2 text-sm font-semibold',
              tab === t.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            <Icon name={t.icon} className="size-4.5" />
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'info' && (
        <>
          {!blueprint && <MissingBlueprint />}
          <FarmInfo
            summary={summary}
            myEdition={settings.edition}
            onOpenLayer={(l) => navigate({ pathname: `/farm/${farm.id}/bauplan`, search: `?ebene=${l + 1}` }, { replace: true })}
          />
        </>
      )}

      {tab === 'bauplan' &&
        (blueprint ? (
          <BlueprintView
            blueprint={blueprint}
            layer={layer}
            onLayerChange={setLayer}
            doneLayers={farmState.doneLayers}
            stepsForLayer={stepsForLayer}
          />
        ) : (
          <MissingBlueprint />
        ))}

      {tab === 'material' && (
        <MaterialsPanel
          farm={farm}
          structure={blueprint?.structure ?? null}
          farmState={farmState}
          layer={layer}
          onLayerChange={setLayer}
        />
      )}

      {blueprint && (
        <div className="sticky bottom-0 -mx-4 border-t border-line bg-bg/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur">
          <Button variant="primary" className="h-13 w-full text-base" onClick={() => navigate(`/farm/${farm.id}/bauen`)}>
            <Icon name="hammer" />
            {farmState.doneLayers.length > 0
              ? `Weiterbauen (${farmState.doneLayers.length} von ${total} Ebenen fertig)`
              : 'Bau-Modus starten'}
          </Button>
        </div>
      )}
    </div>
  );
}
