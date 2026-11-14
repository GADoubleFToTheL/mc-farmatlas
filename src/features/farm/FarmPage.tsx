import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { NotFoundPage } from '../../app/NotFoundPage';
import { useCatalog } from '../../data/farms';
import { deleteLocalFarm, toggleFavorite, updateFarmState, useFarmState, useSettings } from '../../db/store';
import { CATEGORY_LABELS, EDITION_LABELS, versionFit, type FarmSummary } from '../../lib/catalog';
import { Button, cx } from '../../ui/controls';
import { Icon, type IconName } from '../../ui/Icon';
import { MaterialsPanel } from '../materials/MaterialsPanel';
import { BlueprintView } from '../viewer/BlueprintView';
import { useBlueprint } from '../viewer/useBlueprint';
import { isIdentity } from '../../lib/transform';
import { ExportCard } from './ExportCard';
import { FarmInfo } from './FarmInfo';
import { MyNotes } from './MyNotes';

const TABS: ReadonlyArray<{ id: 'info' | 'bauplan' | 'material'; label: string; icon: IconName }> = [
  { id: 'info', label: 'Info', icon: 'info' },
  { id: 'bauplan', label: 'Bauplan', icon: 'layers' },
  { id: 'material', label: 'Material', icon: 'list' },
];
type TabId = (typeof TABS)[number]['id'];

const FORMAT_NAMES = { litematic: '.litematic', schem: '.schem', nbt: '.nbt', mcstructure: '.mcstructure' } as const;

function MissingBlueprint({ farmId }: { farmId: string }) {
  return (
    <div className="rounded-xl border border-warn/40 bg-warn/10 p-4">
      <p className="flex items-center gap-2 font-semibold">
        <Icon name="warn" className="size-5 shrink-0 text-warn" />
        Bauplan fehlt
      </p>
      <p className="mt-1.5 text-sm leading-relaxed">
        Für diese Farm gibt es noch keinen gesicherten Bauplan – und geraten wird hier nicht. Lade die Schematic-Datei
        aus der Quelle herunter und importiere sie. Die Datei bleibt auf diesem Gerät.
      </p>
      <Link
        to={`/import?fuer=${encodeURIComponent(farmId)}`}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink"
      >
        <Icon name="upload" />
        Schematic importieren
      </Link>
    </div>
  );
}

/** Hinweise zu einem lokalen Import: Herkunft, Warnungen, Löschen. */
function ImportNotice({ summary }: { summary: FarmSummary }) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const local = summary.local;
  if (!local) return null;
  const { info } = local;
  const edition = EDITION_LABELS[info.edition];

  const remove = async () => {
    await deleteLocalFarm(local.recordId);
    if (local.kind === 'eigen') navigate('/', { replace: true });
    else setConfirm(false);
  };

  return (
    <section className="rounded-xl border border-accent/40 bg-accent/5 p-4">
      <h2 className="text-sm font-semibold tracking-wide text-accent uppercase">
        {local.kind === 'eigen' ? 'Eigener Import' : 'Bauplan aus eigenem Import'}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed">
        Aus <span className="font-mono text-xs break-all">{info.fileName}</span> · {FORMAT_NAMES[info.format]} ·{' '}
        {info.blockCount.toLocaleString('de-DE')} Blöcke
        {info.mcVersion && ` · gespeichert mit ${edition} ${info.mcVersionExact ? '' : 'ca. '}${info.mcVersion}`}
        {info.author && ` · Ersteller laut Datei: ${info.author}`}. Liegt nur auf diesem Gerät.
      </p>
      {info.warnings.map((w) => (
        <p key={w} className="mt-2 flex gap-2 text-sm leading-relaxed">
          <Icon name="warn" className="mt-0.5 size-4 shrink-0 text-warn" />
          {w}
        </p>
      ))}
      <div className="mt-3 flex flex-wrap gap-2">
        {confirm ? (
          <>
            <Button onClick={() => void remove()} className="border-danger/60 text-danger">
              Wirklich löschen
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Abbrechen
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => setConfirm(true)}>
            {local.kind === 'eigen' ? 'Import löschen' : 'Importierten Bauplan entfernen'}
          </Button>
        )}
      </div>
    </section>
  );
}

export function FarmPage() {
  const { id, tab: tabParam } = useParams();
  const summary = useCatalog().find(id);
  if (!summary) return <NotFoundPage />;
  return <FarmPageContent key={summary.farm.id} summary={summary} tab={tabParam} />;
}

function FarmPageContent({ summary, tab: tabParam }: { summary: FarmSummary; tab: string | undefined }) {
  const { farm } = summary;
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const settings = useSettings();
  const farmState = useFarmState(farm.id);
  const blueprint = useBlueprint(farm, farmState.orientation);

  const tab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'info';
  const total = blueprint?.structure.size.y ?? 1;
  const layer = Math.max(0, Math.min(total - 1, (Number(search.get('ebene')) || 1) - 1));
  const setLayer = (next: number) => setSearch({ ebene: String(next + 1) }, { replace: true });

  const fit = versionFit(farm, settings.edition, settings.versions[settings.edition]);
  const stepsForLayer = farm.steps.filter((s) => s.layers?.includes(layer + 1)).map((s) => s.text);
  const doneCount = farmState.doneLayers.filter((l) => l <= total).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-1">
        <Link to="/" aria-label="Zurück zur Übersicht" className="-ml-2 grid size-11 shrink-0 place-items-center rounded-lg hover:bg-surface-2">
          <Icon name="back" className="size-6" />
        </Link>
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{CATEGORY_LABELS[farm.category]}</p>
          <h1 className="text-xl leading-snug font-semibold break-words">{farm.name}</h1>
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
          {!blueprint && <MissingBlueprint farmId={farm.id} />}
          <ImportNotice summary={summary} />
          <MyNotes farmState={farmState} />
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
            orientation={farmState.orientation}
            onOrientationChange={(orientation) => updateFarmState(farm.id, { orientation })}
          >
            <ExportCard
              structure={blueprint.structure}
              name={farm.name}
              bedrockVersion={settings.versions.bedrock}
              rotated={!isIdentity(farmState.orientation)}
            />
          </BlueprintView>
        ) : (
          <MissingBlueprint farmId={farm.id} />
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
            {doneCount > 0 ? `Weiterbauen (${doneCount} von ${total} Ebenen fertig)` : 'Bau-Modus starten'}
          </Button>
        </div>
      )}
    </div>
  );
}
