import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { REPO_FARMS, useCatalog } from '../../data/farms';
import { saveLocalFarm, useLocalFarms, useSettings } from '../../db/store';
import { CATEGORY_LABELS, EDITION_LABELS } from '../../lib/catalog';
import type { ImportedSchematic } from '../../lib/importers/schematic';
import { draftFarm, entityName, importInfo, nameFromFile, slugify } from '../../lib/localfarm';
import { CATEGORIES, type Category } from '../../lib/schema';
import { compareVersions, isValidVersion } from '../../lib/version';
import { Button } from '../../ui/controls';
import { Icon } from '../../ui/Icon';

type Stage =
  | { step: 'waehlen'; error?: string }
  | { step: 'lesen'; fileName: string }
  | { step: 'bereit'; fileName: string; imported: ImportedSchematic };

const FORMAT_NAMES = {
  litematic: 'Litematica (.litematic)',
  schem: 'WorldEdit / Sponge (.schem)',
  nbt: 'Konstruktionsblock Java (.nbt)',
  mcstructure: 'Konstruktionsblock Bedrock (.mcstructure)',
} as const;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function ImportPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const settings = useSettings();
  const catalog = useCatalog();
  const localFarms = useLocalFarms();
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ step: 'waehlen' });
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('sonstiges');
  const [attachTo, setAttachTo] = useState(search.get('fuer') ?? '');
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  // Katalog-Farmen ohne eigenen Bauplan – an sie kann ein Import angehängt werden.
  const stubs = REPO_FARMS.filter((f) => f.blueprint === null).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const target = stubs.find((f) => f.id === attachTo);

  const load = async (file: File | undefined) => {
    if (!file) return;
    setStage({ step: 'lesen', fileName: file.name });
    try {
      // Erst hier laden: Parser und WebAssembly werden nur beim Import gebraucht.
      const { importSchematic } = await import('../../lib/importers/schematic');
      const imported = await importSchematic(new Uint8Array(await file.arrayBuffer()), file.name);
      setName(imported.name && imported.name !== 'Unnamed' ? imported.name : nameFromFile(file.name));
      setStage({ step: 'bereit', fileName: file.name, imported });
    } catch (e) {
      setStage({
        step: 'waehlen',
        error: e instanceof Error && e.name !== 'TypeError' ? e.message : 'Die Datei ließ sich nicht lesen.',
      });
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const save = async () => {
    if (stage.step !== 'bereit' || saving) return;
    setSaving(true);
    const { imported, fileName } = stage;
    const fallbackVersion = settings.versions[imported.edition];
    let id: string;
    if (target) {
      id = `import:${target.id}`;
    } else {
      const base = `lokal-${slugify(name || nameFromFile(fileName))}`;
      id = base;
      for (let n = 2; catalog.find(id) || localFarms.has(id); n++) id = `${base}-${n}`;
    }
    const farm = draftFarm(imported, {
      id: target ? target.id : id,
      name: target ? target.name : name,
      category: target ? target.category : category,
      fileName,
      fallbackVersion,
    });
    await saveLocalFarm({ id, attachedTo: target?.id ?? null, farm, info: importInfo(imported, fileName) });
    navigate(`/farm/${target ? target.id : id}/bauplan`, { replace: true });
  };

  const header = (
    <div className="flex items-center gap-1">
      <Link to={attachTo ? `/farm/${attachTo}` : '/'} aria-label="Zurück" className="-ml-2 grid size-11 place-items-center rounded-lg hover:bg-surface-2">
        <Icon name="back" className="size-6" />
      </Link>
      <h1 className="text-xl font-semibold">Schematic importieren</h1>
    </div>
  );

  if (stage.step !== 'bereit') {
    return (
      <div className="flex flex-col gap-3">
        {header}
        {target && (
          <p className="rounded-xl border border-line bg-surface p-3 text-sm">
            Der Bauplan wird zur Farm <strong>{target.name}</strong> hinzugefügt.
          </p>
        )}
        <button
          type="button"
          disabled={stage.step === 'lesen'}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void load(e.dataTransfer.files[0]);
          }}
          className={`flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center ${
            dragging ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:bg-surface-2'
          }`}
        >
          <Icon name="upload" className="size-10 text-accent" />
          {stage.step === 'lesen' ? (
            <span className="font-semibold">Lese {stage.fileName} …</span>
          ) : (
            <>
              <span className="text-base font-semibold">Datei auswählen</span>
              <span className="text-sm text-muted">.litematic, .schem, .nbt (Java) oder .mcstructure (Bedrock)</span>
            </>
          )}
        </button>
        {/* Bewusst ohne accept: Handys blenden Dateien mit unbekannter Endung sonst aus. */}
        <input ref={fileInput} type="file" className="sr-only" aria-label="Schematic-Datei auswählen" onChange={(e) => void load(e.target.files?.[0])} />

        {stage.step === 'waehlen' && stage.error && (
          <p role="alert" className="flex gap-2.5 rounded-xl border border-danger/50 bg-danger/10 p-3 text-sm leading-relaxed">
            <Icon name="warn" className="mt-0.5 size-4 shrink-0 text-danger" />
            {stage.error}
          </p>
        )}

        <div className="rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-muted">
          <p>
            Die Datei wird nur auf diesem Gerät gelesen und gespeichert – sie wird nirgends hochgeladen. Bauplan und
            Materialliste entstehen automatisch.
          </p>
          <p className="mt-2">
            Über das Backup in den Einstellungen nimmst du importierte Farmen auf ein anderes Gerät mit.
          </p>
        </div>
      </div>
    );
  }

  const { imported, fileName } = stage;
  const { size } = imported.structure;
  const myVersion = settings.versions[imported.edition];
  const otherEdition = imported.edition !== settings.edition;
  const newer =
    imported.mcVersion !== null && isValidVersion(myVersion) && compareVersions(imported.mcVersion, myVersion) > 0;
  const older =
    imported.mcVersion !== null && isValidVersion(myVersion) && compareVersions(imported.mcVersion, myVersion) < 0;
  const containers = imported.structure.containers?.length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {header}

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-2.5 text-sm font-semibold tracking-wide text-muted uppercase">Gelesen</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <Fact label="Datei">
            <span className="font-mono text-xs break-all">{fileName}</span>
          </Fact>
          <Fact label="Format">{FORMAT_NAMES[imported.format]}</Fact>
          <Fact label="Edition">
            {EDITION_LABELS[imported.edition]}
            {imported.mcVersion ? ` ${imported.mcVersionExact ? '' : 'ca. '}${imported.mcVersion}` : ' (Version unbekannt)'}
          </Fact>
          <Fact label="Maße (B × H × T)">
            <span className="font-mono">
              {size.x} × {size.y} × {size.z}
            </span>
          </Fact>
          <Fact label="Blöcke">
            {imported.blockCount.toLocaleString('de-DE')} in {imported.structure.palette.length - 1} Arten
          </Fact>
          {imported.author && <Fact label="Ersteller laut Datei">{imported.author}</Fact>}
          {containers > 0 && <Fact label="Behälter mit Inhalt">{containers}</Fact>}
          {imported.entities.length > 0 && (
            <Fact label="Entitäten">{imported.entities.map((e) => `${e.count}× ${entityName(e.id)}`).join(', ')}</Fact>
          )}
        </dl>
      </section>

      {(otherEdition || newer || older || imported.warnings.length > 0) && (
        <section className="flex flex-col gap-2 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm leading-relaxed">
          {otherEdition && (
            <p className="flex gap-2.5">
              <Icon name="warn" className="mt-0.5 size-4 shrink-0 text-warn" />
              Die Datei stammt aus {EDITION_LABELS[imported.edition]}, du spielst {EDITION_LABELS[settings.edition]}.
              Redstone verhält sich in den Editionen unterschiedlich – viele Farmen funktionieren nicht in der anderen.
            </p>
          )}
          {!otherEdition && newer && (
            <p className="flex gap-2.5">
              <Icon name="warn" className="mt-0.5 size-4 shrink-0 text-warn" />
              Die Datei ist neuer ({imported.mcVersion}) als deine Version ({myVersion}). Einzelne Blöcke gibt es bei dir
              vielleicht noch nicht.
            </p>
          )}
          {!otherEdition && older && (
            <p className="flex gap-2.5">
              <Icon name="info" className="mt-0.5 size-4 shrink-0 text-warn" />
              Die Datei wurde mit {imported.mcVersion} gespeichert, du spielst {myVersion}. Prüfe im Original-Tutorial,
              ob die Farm noch funktioniert.
            </p>
          )}
          {imported.warnings.map((w) => (
            <p key={w} className="flex gap-2.5">
              <Icon name="warn" className="mt-0.5 size-4 shrink-0 text-warn" />
              {w}
            </p>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
        <label className="block">
          <span className="text-sm text-muted">Zu einer Farm aus dem Katalog hinzufügen (optional)</span>
          <select
            value={attachTo}
            onChange={(e) => setAttachTo(e.target.value)}
            className="mt-1 h-12 w-full rounded-lg border border-line bg-bg px-3"
          >
            <option value="">Nein – als eigene Farm speichern</option>
            {stubs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-muted">
            Dann erscheinen Steckbrief, Funktionsprinzip und Quellen dieser Farm zusammen mit deinem Bauplan.
          </span>
        </label>

        {!target && (
          <>
            <label className="block">
              <span className="text-sm text-muted">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="mt-1 h-12 w-full rounded-lg border border-line bg-bg px-3"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted">Kategorie</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="mt-1 h-12 w-full rounded-lg border border-line bg-bg px-3"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </section>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-bg/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur">
        <Button variant="ghost" className="h-13" onClick={() => setStage({ step: 'waehlen' })}>
          Andere Datei
        </Button>
        <Button variant="primary" className="h-13 flex-1 text-base" disabled={saving} onClick={() => void save()}>
          <Icon name="check" />
          {target ? 'Bauplan hinzufügen' : 'Importieren'}
        </Button>
      </div>
    </div>
  );
}
